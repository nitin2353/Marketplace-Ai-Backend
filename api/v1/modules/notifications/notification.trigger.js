const pool = require("../../../../config/database");
const notificationService = require("./notification.service");

// Triggered when order is created (COD or Online)
exports.onOrderCreated = async (orderId, userId) => {
    try {
        // Fetch order details
        const orderRes = await pool.query(`SELECT * FROM public.orders WHERE id = $1`, [orderId]);
        if (orderRes.rows.length === 0) return;
        const order = orderRes.rows[0];

        // Notify customer
        await notificationService.createNotification({
            receiver_id: userId,
            receiver_type: "user",
            type: "order_placed",
            title: "Order Placed Successfully",
            body: `Your order #${order.order_number} has been placed successfully.`,
            ref_type: "order",
            ref_id: orderId
        });

        // Notify sellers
        const sellersRes = await pool.query(`
            SELECT DISTINCT p.seller_id
            FROM public.order_items oi
            INNER JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = $1
        `, [orderId]);

        for (const row of sellersRes.rows) {
            if (row.seller_id) {
                await notificationService.createNotification({
                    receiver_id: row.seller_id,
                    receiver_type: "seller",
                    type: "new_order",
                    title: "New Order Received",
                    body: `You have received a new order #${order.order_number}.`,
                    ref_type: "orders",
                    ref_id: orderId
                });
            }
        }
    } catch (err) {
        console.error("onOrderCreated notification error:", err);
    }
};

// Triggered when order status changes
exports.onOrderStatusUpdated = async (orderId, status) => {
    try {
        const orderRes = await pool.query(`SELECT * FROM public.orders WHERE id = $1`, [orderId]);
        if (orderRes.rows.length === 0) return;
        const order = orderRes.rows[0];

        let title = "Order Status Updated";
        let body = `Your order #${order.order_number} status is now ${status}.`;

        if (status === 'confirmed') title = "Order Confirmed";
        if (status === 'shipped') title = "Order Shipped";
        if (status === 'delivered') title = "Order Delivered";
        if (status === 'cancelled') title = "Order Cancelled";

        // Notify customer
        let notificationType = `order_${status}`;
        if (status === 'shipped' || status === 'delivered') {
            notificationType = 'order_status_update';
        }

        await notificationService.createNotification({
            receiver_id: order.user_id,
            receiver_type: "user",
            type: notificationType,
            title,
            body,
            ref_type: "orders",
            ref_id: orderId
        });

        // If cancelled, notify sellers
        if (status === 'cancelled') {
            const sellersRes = await pool.query(
                "SELECT DISTINCT p.seller_id " +
                "FROM public.order_items oi " +
                "INNER JOIN public.products p ON p.id = oi.product_id " +
                "WHERE oi.order_id = $1",
                [orderId]);

            for (const row of sellersRes.rows) {
                if (row.seller_id) {
                    await notificationService.createNotification({
                        receiver_id: row.seller_id,
                        receiver_type: "seller",
                        type: "order_cancelled",
                        title: "Order Cancelled",
                        body: `Order #${order.order_number} has been cancelled.`,
                        ref_type: "orders",
                        ref_id: orderId
                    });
                }
            }
        }
    } catch (err) {
        console.error("onOrderStatusUpdated notification error:", err);
    }
};

// Triggered on new review
exports.onReviewCreated = async (reviewId) => {
    try {
        const res = await pool.query(`
            SELECT r.*, p.title as product_title, p.seller_id
            FROM public.reviews r
            INNER JOIN public.products p ON p.id = r.product_id
            WHERE r.id = $1
        `, [reviewId]);
        if (res.rows.length === 0) return;
        const review = res.rows[0];

        // Notify customer
        await notificationService.createNotification({
            receiver_id: review.user_id,
            receiver_type: "user",
            type: "review_submitted",
            title: "Review Submitted",
            body: `Your review for ${review.product_title} has been submitted.`,
            ref_type: "reviews",
            ref_id: reviewId
        });

        // Notify seller
        if (review.seller_id) {
            await notificationService.createNotification({
                receiver_id: review.seller_id,
                receiver_type: "seller",
                type: "review_received",
                title: "New Review Received",
                body: `You received a ${review.rating}-star review for ${review.product_title}.`,
                ref_type: "reviews",
                ref_id: reviewId
            });
        }
    } catch (err) {
        console.error("onReviewCreated notification error:", err);
    }
};

// Triggered when payment is successful
exports.onPaymentSuccessful = async (orderId) => {
    try {
        const orderRes = await pool.query(`SELECT * FROM public.orders WHERE id = $1`, [orderId]);
        if (orderRes.rows.length === 0) return;
        const order = orderRes.rows[0];

        // Notify customer
        await notificationService.createNotification({
            receiver_id: order.user_id,
            receiver_type: "user",
            type: "payment_successful",
            title: "Payment Successful",
            body: `Payment for order #${order.order_number} was successful.`,
            ref_type: "orders",
            ref_id: orderId
        });

        // Notify sellers
        const sellersRes = await pool.query(`
            SELECT DISTINCT p.seller_id
            FROM public.order_items oi
            INNER JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = $1
        `, [orderId]);

        for (const row of sellersRes.rows) {
            if (row.seller_id) {
                await notificationService.createNotification({
                    receiver_id: row.seller_id,
                    receiver_type: "seller",
                    type: "payment_received",
                    title: "Payment Received",
                    body: `Payment received for order #${order.order_number}.`,
                    ref_type: "orders",
                    ref_id: orderId
                });
            }
        }
    } catch (err) {
        console.error("onPaymentSuccessful notification error:", err);
    }
};

// Triggered when stock falls below threshold
exports.checkLowStock = async (productId, variantId = null) => {
    try {
        let title = ""; let stock = 0; let sellerId = null;

        if (variantId) {
            const vRes = await pool.query(`
                SELECT v.stock, v.color, v.size, p.title, p.seller_id
                FROM public.product_variants v
                INNER JOIN public.products p ON p.id = v.product_id
                WHERE v.id = $1
            `, [variantId]);
            if (vRes.rows.length === 0) return;
            stock = vRes.rows[0].stock;
            title = `${vRes.rows[0].title} (${vRes.rows[0].color || ''} ${vRes.rows[0].size || ''})`;
            sellerId = vRes.rows[0].seller_id;
        } else {
            const pRes = await pool.query(`SELECT stock, title, seller_id FROM public.products WHERE id = $1`, [productId]);
            if (pRes.rows.length === 0) return;
            stock = pRes.rows[0].stock;
            title = pRes.rows[0].title;
            sellerId = pRes.rows[0].seller_id;
        }

        if (stock <= 5 && sellerId) {
            const type = stock === 0 ? "out_of_stock" : "low_stock";
            const msgTitle = stock === 0 ? "Product Out of Stock" : "Low Stock Alert";
            const body = stock === 0 ? `${title} is out of stock.` : `${title} is running low on stock (${stock} left).`;

            await notificationService.createNotification({
                receiver_id: sellerId,
                receiver_type: "seller",
                type,
                title: msgTitle,
                body,
                ref_type: "product",
                ref_id: productId
            });
        }
    } catch (err) {
        console.error("checkLowStock notification error:", err);
    }
};
// Triggered when seller replies to a review
exports.onReviewReplied = async (reviewId) => {
    try {
        const res = await pool.query(`
            SELECT r.*, p.title as product_title
            FROM public.reviews r
            INNER JOIN public.products p ON p.id = r.product_id
            WHERE r.id = $1
        `, [reviewId]);
        if (res.rows.length === 0) return;
        const review = res.rows[0];

        // Notify customer
        await notificationService.createNotification({
            receiver_id: review.user_id,
            receiver_type: "user",
            type: "review_replied",
            title: "Seller Replied to Your Review",
            body: `The seller has replied to your review for ${review.product_title}.`,
            ref_type: "reviews",
            ref_id: reviewId
        });
    } catch (err) {
        console.error("onReviewReplied notification error:", err);
    }
};

exports.triggerNotification = async (data) => {
    try {
        await notificationService.createNotification({
            receiver_id: data.receiver_id,
            receiver_type: data.receiver_type || "user",
            type: data.type,
            title: data.title,
            body: data.body,
            ref_type: data.ref_type,
            ref_id: data.ref_id
        });
    } catch (err) {
        console.error("triggerNotification error:", err);
    }
};

exports.onReturnRequestCreated = async (requestId) => {
    try {
        const res = await pool.query(`
            SELECT rr.*, p.title as product_title, o.order_number
            FROM public.return_requests rr
            INNER JOIN public.products p ON p.id = rr.product_id
            INNER JOIN public.orders o ON o.id = rr.order_id
            WHERE rr.id = $1
        `, [requestId]);
        if (res.rows.length === 0) return;
        const request = res.rows[0];

        // Notify seller
        await notificationService.createNotification({
            receiver_id: request.seller_id,
            receiver_type: "seller",
            type: "return_requested",
            title: `New ${request.request_type === 'return' ? 'Return' : 'Replacement'} Request`,
            body: `You have a new ${request.request_type} request for product ${request.product_title} from order #${request.order_number}.`,
            ref_type: "returns",
            ref_id: requestId
        });
    } catch (err) {
        console.error("onReturnRequestCreated notification error:", err);
    }
};

exports.onReturnRequestStatusUpdated = async (requestId) => {
    try {
        const res = await pool.query(`
            SELECT rr.*, p.title as product_title, o.order_number
            FROM public.return_requests rr
            INNER JOIN public.products p ON p.id = rr.product_id
            INNER JOIN public.orders o ON o.id = rr.order_id
            WHERE rr.id = $1
        `, [requestId]);
        if (res.rows.length === 0) return;
        const request = res.rows[0];

        // Notify customer
        await notificationService.createNotification({
            receiver_id: request.customer_id,
            receiver_type: "user",
            type: "return_status_updated",
            title: `${request.request_type === 'return' ? 'Return' : 'Replacement'} Request ${request.status}`,
            body: `Your ${request.request_type} request for ${request.product_title} (Order #${request.order_number}) is now ${request.status}.`,
            ref_type: "returns",
            ref_id: requestId
        });
    } catch (err) {
        console.error("onReturnRequestStatusUpdated notification error:", err);
    }
};
