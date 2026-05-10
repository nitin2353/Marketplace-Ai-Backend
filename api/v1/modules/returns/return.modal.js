const pool = require("../../../../config/database");
const notificationTriggers = require("../notifications/notification.trigger");

exports.createReturnRequest = async ({
    order_id,
    order_item_id,
    customer_id,
    request_type,
    reason,
    description,
    images = []
}) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Validate Eligibility
        // Get order item and order details
        const itemRes = await client.query(
            `
            SELECT 
                oi.*, 
                o.user_id as order_customer_id, 
                o.order_status,
                o.modified_time as delivered_date,
                p.is_return,
                p.is_replace,
                p.return_replace_duration,
                p.seller_id
            FROM public.order_items oi
            INNER JOIN public.orders o ON o.id = oi.order_id
            INNER JOIN public.products p ON p.id = oi.product_id
            WHERE oi.id = $1 AND oi.order_id = $2
            `,
            [order_item_id, order_id]
        );

        if (itemRes.rows.length === 0) {
            throw new Error("Order item not found");
        }

        const item = itemRes.rows[0];

        // - order belongs to logged-in customer
        if (item.order_customer_id !== customer_id) {
            throw new Error("Unauthorized: Order does not belong to you");
        }

        // - order_status = delivered/completed
        if (!['delivered', 'completed'].includes(item.order_status.toLowerCase())) {
            throw new Error(`Order status must be delivered or completed. Current status: ${item.order_status}`);
        }

        // - product.is_return = true for return
        if (request_type === 'return' && !item.is_return) {
            throw new Error("This product is not eligible for return");
        }

        // - product.is_replace = true for replacement
        if (request_type === 'replacement' && !item.is_replace) {
            throw new Error("This product is not eligible for replacement");
        }

        // - request is within return_replace_duration days from delivered date
        const deliveredDate = new Date(item.delivered_date);
        const now = new Date();
        const diffTime = Math.abs(now - deliveredDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > (item.return_replace_duration || 0)) {
            throw new Error(`Return/Replacement window of ${item.return_replace_duration} days has expired`);
        }

        // - duplicate request for same order_item_id not already active
        const existingRes = await client.query(
            `SELECT id FROM public.return_requests WHERE order_item_id = $1 AND status != 'cancelled' AND status != 'rejected'`,
            [order_item_id]
        );

        if (existingRes.rows.length > 0) {
            throw new Error("A return/replacement request is already active for this item");
        }

        // 2. Insert Request
        const returnRes = await client.query(
            `
            INSERT INTO public.return_requests (
                order_id, order_item_id, product_id, variant_id, 
                customer_id, seller_id, request_type, reason, 
                description, images, status, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'requested', NOW(), NOW())
            RETURNING *
            `,
            [
                order_id, order_item_id, item.product_id, item.variant_id,
                customer_id, item.seller_id, request_type, reason,
                description, images
            ]
        );

        const returnRequest = returnRes.rows[0];

        await client.query("COMMIT");

        // Trigger notification to seller
        notificationTriggers.onReturnRequestCreated(returnRequest.id).catch(console.error);

        return returnRequest;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

exports.getCustomerReturnRequests = async (customer_id) => {
    const res = await pool.query(
        `
        SELECT rr.*, 
               COALESCE(p.title, oi.product_title) as product_title, 
               COALESCE(p.image_url, oi.product_image_url) as product_image
        FROM public.return_requests rr
        LEFT JOIN public.products p ON p.id = rr.product_id
        LEFT JOIN public.order_items oi ON oi.id = rr.order_item_id
        WHERE rr.customer_id = $1
        ORDER BY rr.created_at DESC
        `,
        [customer_id]
    );
    return res.rows;
};

exports.getSellerReturnRequests = async (seller_id) => {
    const res = await pool.query(
        `
        SELECT rr.*, 
               COALESCE(p.title, oi.product_title) as product_title, 
               COALESCE(p.image_url, oi.product_image_url) as product_image, 
               u.name as customer_name
        FROM public.return_requests rr
        LEFT JOIN public.products p ON p.id = rr.product_id
        LEFT JOIN public.order_items oi ON oi.id = rr.order_item_id
        LEFT JOIN public.users u ON u.id = rr.customer_id
        WHERE rr.seller_id = $1
        ORDER BY rr.created_at DESC
        `,
        [seller_id]
    );
    return res.rows;
};

exports.getReturnRequestById = async (id) => {
    const res = await pool.query(
        `
        SELECT rr.*, 
               COALESCE(p.title, oi.product_title) as product_title, 
               COALESCE(p.image_url, oi.product_image_url) as product_image,
               u.name as customer_name, u.email as customer_email,
               oi.unit_price, oi.quantity, oi.variant_color, oi.variant_size
        FROM public.return_requests rr
        LEFT JOIN public.products p ON p.id = rr.product_id
        LEFT JOIN public.users u ON u.id = rr.customer_id
        LEFT JOIN public.order_items oi ON oi.id = rr.order_item_id
        WHERE rr.id = $1
        `,
        [id]
    );
    return res.rows[0];
};

exports.updateReturnStatus = async (id, seller_id, { status, seller_response, refund_amount }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Check if request exists and belongs to seller
        const checkRes = await client.query(
            `SELECT * FROM public.return_requests WHERE id = $1 AND seller_id = $2`,
            [id, seller_id]
        );

        if (checkRes.rows.length === 0) {
            throw new Error("Return request not found or unauthorized");
        }

        const currentRequest = checkRes.rows[0];

        // Update request
        const updateRes = await client.query(
            `
            UPDATE public.return_requests
            SET status = $1, 
                seller_response = COALESCE($2, seller_response), 
                refund_amount = COALESCE($3, refund_amount),
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
            `,
            [status, seller_response, refund_amount, id]
        );

        const updatedRequest = updateRes.rows[0];

        await client.query("COMMIT");

        // Trigger notification to customer
        notificationTriggers.onReturnRequestStatusUpdated(updatedRequest.id).catch(console.error);

        return updatedRequest;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

exports.cancelReturnRequest = async (id, customer_id) => {
    const checkRes = await pool.query(
        `SELECT status FROM public.return_requests WHERE id = $1 AND customer_id = $2`,
        [id, customer_id]
    );

    if (checkRes.rows.length === 0) {
        throw new Error("Return request not found or unauthorized");
    }

    if (checkRes.rows[0].status !== 'requested') {
        throw new Error("Cannot cancel request that is already being processed");
    }

    const res = await pool.query(
        `UPDATE public.return_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
    );

    return res.rows[0];
};
