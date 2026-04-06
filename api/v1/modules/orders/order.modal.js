const pool = require("../../../../config/database");
const crypto = require("crypto");


const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestamp}-${random}`;
};


exports.createOrderFromCart = async ({
    user_id,
    address_id,
    payment_method,
    notes = null,
    created_by = null,
    modified_by = null,
    payment_order_id,
    payment_id,
    payment_signature,
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. GET CART ITEMS
        const cartRes = await client.query(
            `
            SELECT 
                c.id,
                c.user_id,
                c.product_id,
                c.variant_id,
                c.total_quantity,
                c.amount,

                p.title,
                p.description,
                p.base_price,
                p.brand,
                p.category,
                p.tag,
                p.image_url,
                p.seller_id,

                v.color AS variant_color,
                v.size AS variant_size,
                v.final_price,
                v.stock
            FROM public.cart c
            INNER JOIN public.products p 
                ON p.id = c.product_id
            LEFT JOIN public.product_variants v
                ON v.id = c.variant_id
            WHERE c.user_id = $1
            ORDER BY c.created_time ASC
            `,
            [user_id]
        );

        if (cartRes.rows.length === 0) {
            throw new Error("Cart is empty");
        }

        const cartItems = cartRes.rows;

        const addressRes = await client.query(
            `
            SELECT 
                id,
                country_code,
                address_line_1,
                name,
                user_id,
                mobile,
                address_line_2,
                country,
                state,
                city,
                pincode,
                label,
                instructions,
                phone
            FROM public.address
            WHERE id = $1 AND user_id = $2
            `,
            [address_id, user_id]
        );

        if (addressRes.rows.length === 0) {
            throw new Error("Address not found");
        }

        const address = addressRes.rows[0];

        // 3. GET USER
        const userRes = await client.query(
            `
            SELECT 
                id,
                name,
                email,
                phone
            FROM public.users
            WHERE id = $1
            `,
            [user_id]
        );

        if (userRes.rows.length === 0) {
            throw new Error("User not found");
        }

        const user = userRes.rows[0];

        // 4. CALCULATE TOTALS
        let subtotal = 0;
        let total_quantity = 0;
        let total_items = cartItems.length;

        for (const item of cartItems) {
            const quantity = Number(item.total_quantity || 0);
            const unitPrice = item.variant_id
                ? Number(item.final_price || 0)
                : Number(item.base_price || 0);

            const lineTotal = unitPrice * quantity;

            subtotal += lineTotal;
            total_quantity += quantity;

            // stock validation
            if (item.variant_id && item.stock !== null && item.stock !== undefined) {
                if (quantity > Number(item.stock)) {
                    throw new Error(`Insufficient stock for product: ${item.title}`);
                }
            }
        }

        const delivery_charge = 0;
        const discount_amount = 0;
        const tax_amount = 0;
        const total_amount = subtotal + delivery_charge + tax_amount - discount_amount;

        // 5. PAYMENT CONFIG
        let payment_status = "pending";
        let payment_gateway = "razorpay";
        let order_status = "placed";

        if (payment_method === "cod") {
            payment_status = "pending";
            payment_gateway = "cod";
            order_status = "placed";
        }

        const order_number = generateOrderNumber();

        // 6. INSERT INTO ORDERS
        const orderRes = await client.query(
            `
            INSERT INTO public.orders (
                user_id,
                address_id,
                order_number,
                total_items,
                total_quantity,
                subtotal,
                delivery_charge,
                discount_amount,
                tax_amount,
                total_amount,
                payment_method,
                payment_status,
                payment_gateway,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                order_status,
                notes,
                created_by,
                modified_by,
                created_time,
                modified_time
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, NOW(), NOW()
            )
            RETURNING *
            `,
            [
                user_id,
                address_id,
                order_number,
                total_items,
                total_quantity,
                subtotal,
                delivery_charge,
                discount_amount,
                tax_amount,
                total_amount,
                payment_method,
                payment_status,
                payment_gateway,
                payment_order_id,
                payment_id,
                payment_signature,
                order_status,
                notes,
                created_by,
                modified_by
            ]
        );

        const order = orderRes.rows[0];

        // 7. INSERT ORDER ITEMS
        for (const item of cartItems) {
            const quantity = Number(item.total_quantity || 0);
            const unitPrice = item.variant_id
                ? Number(item.final_price || 0)
                : Number(item.base_price || 0);

            const lineTotal = unitPrice * quantity;

            await client.query(
                `
                INSERT INTO public.order_items (
                    order_id,
                    product_id,
                    variant_id,
                    quantity,
                    unit_price,
                    line_total,
                    product_title,
                    product_description,
                    product_brand,
                    product_category,
                    product_tag,
                    product_image_url,
                    variant_color,
                    variant_size,
                    created_by,
                    modified_by,
                    created_time,
                    modified_time
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, NOW(), NOW()
                )
                `,
                [
                    order.id,
                    item.product_id,
                    item.variant_id,
                    quantity,
                    unitPrice,
                    lineTotal,
                    item.title,
                    item.description,
                    item.brand,
                    item.category,
                    item.tag,
                    item.image_url,
                    item.variant_color,
                    item.variant_size,
                    created_by,
                    modified_by
                ]
            );
        }

        // 8. INSERT ADDRESS SNAPSHOT
        await client.query(
            `
            INSERT INTO public.order_address_snapshot (
                order_id,
                address_id,
                name,
                mobile,
                phone,
                country_code,
                address_line_1,
                address_line_2,
                country,
                state,
                city,
                pincode,
                label,
                instructions,
                created_time
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11, $12, $13, $14, NOW()
            )
            `,
            [
                order.id,
                address.id,
                address.name,
                address.mobile,
                address.phone,
                address.country_code,
                address.address_line_1,
                address.address_line_2,
                address.country,
                address.state,
                address.city,
                address.pincode,
                address.label,
                address.instructions
            ]
        );

        // 9. INSERT USER SNAPSHOT
        await client.query(
            `
            INSERT INTO public.order_user_snapshot (
                order_id,
                user_id,
                full_name,
                email,
                mobile,
                created_time
            )
            VALUES ($1, $2, $3, $4, $5, NOW())
            `,
            [
                order.id,
                user.id,
                user.full_name || user.name || "",
                user.email || "",
                user.mobile || user.phone || ""
            ]
        );

        if (payment_method === "cod") {
            for (const item of cartItems) {
                if (item.variant_id) {
                    await client.query(
                        `
                        UPDATE public.product_variants
                        SET stock = stock - $1,
                            modified_time = NOW()
                        WHERE id = $2
                        `,
                        [item.total_quantity, item.variant_id]
                    );
                } else {
                    await client.query(
                        `
                        UPDATE public.products
                        SET stock = stock - $1,
                            modified_time = NOW()
                        WHERE id = $2
                        `,
                        [item.total_quantity, item.product_id]
                    );
                }
            }
        }


        await client.query(
            `DELETE FROM public.cart WHERE user_id = $1`,
            [user_id]
        );

        await client.query("COMMIT");

        return {
            order,
            items_count: cartItems.length,
            total_amount,
            payment_method
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};


exports.getCustomerOrders = async (user_id) => {
    const res = await pool.query(
        `
        SELECT *
        FROM public.orders
        WHERE user_id = $1
        ORDER BY created_time DESC
        `,
        [user_id]
    );

    return res.rows;
};


exports.getCustomerOrderById = async (user_id, order_id) => {
    const orderRes = await pool.query(
        `
        SELECT *
        FROM public.orders
        WHERE id = $1 AND user_id = $2
        `,
        [order_id, user_id]
    );

    if (orderRes.rows.length === 0) {
        return null;
    }

    const order = orderRes.rows[0];

    const itemsRes = await pool.query(
        `
        SELECT *
        FROM public.order_items
        WHERE order_id = $1
        ORDER BY created_time ASC
        `,
        [order_id]
    );

    const addressRes = await pool.query(
        `
        SELECT *
        FROM public.order_address_snapshot
        WHERE order_id = $1
        `,
        [order_id]
    );

    const userRes = await pool.query(
        `
        SELECT *
        FROM public.order_user_snapshot
        WHERE order_id = $1
        `,
        [order_id]
    );

    return {
        ...order,
        items: itemsRes.rows,
        address_snapshot: addressRes.rows[0] || null,
        user_snapshot: userRes.rows[0] || null
    };
};


exports.getSellerOrders = async (seller_id) => {
    const res = await pool.query(
        `
        SELECT DISTINCT 
            o.*
        FROM public.orders o
        INNER JOIN public.order_items oi
            ON oi.order_id = o.id
        INNER JOIN public.products p
            ON p.id = oi.product_id
        WHERE p.seller_id = $1
        ORDER BY o.created_time DESC
        `,
        [seller_id]
    );

    return res.rows;
};

// =====================================
// GET SINGLE SELLER ORDER
// =====================================
exports.getSellerOrderById = async (seller_id, order_id) => {
    const orderCheckRes = await pool.query(
        `
        SELECT DISTINCT 
            o.*
        FROM public.orders o
        INNER JOIN public.order_items oi
            ON oi.order_id = o.id
        INNER JOIN public.products p
            ON p.id = oi.product_id
        WHERE o.id = $1
          AND p.seller_id = $2
        `,
        [order_id, seller_id]
    );

    if (orderCheckRes.rows.length === 0) {
        return null;
    }

    const order = orderCheckRes.rows[0];

    const itemsRes = await pool.query(
        `
        SELECT oi.*
        FROM public.order_items oi
        INNER JOIN public.products p
            ON p.id = oi.product_id
        WHERE oi.order_id = $1
          AND p.seller_id = $2
        ORDER BY oi.created_time ASC
        `,
        [order_id, seller_id]
    );

    const addressRes = await pool.query(
        `
        SELECT *
        FROM public.order_address_snapshot
        WHERE order_id = $1
        `,
        [order_id]
    );

    const userRes = await pool.query(
        `
        SELECT *
        FROM public.order_user_snapshot
        WHERE order_id = $1
        `,
        [order_id]
    );

    return {
        ...order,
        items: itemsRes.rows,
        address_snapshot: addressRes.rows[0] || null,
        user_snapshot: userRes.rows[0] || null
    };
};

// =====================================
// GET FULL ORDER BY ID
// =====================================
exports.getOrderById = async (order_id) => {
    const orderRes = await pool.query(
        `
        SELECT *
        FROM public.orders
        WHERE id = $1
        `,
        [order_id]
    );

    if (orderRes.rows.length === 0) {
        return null;
    }

    const order = orderRes.rows[0];

    const itemsRes = await pool.query(
        `
        SELECT *
        FROM public.order_items
        WHERE order_id = $1
        ORDER BY created_time ASC
        `,
        [order_id]
    );

    const addressRes = await pool.query(
        `
        SELECT *
        FROM public.order_address_snapshot
        WHERE order_id = $1
        `,
        [order_id]
    );

    const userRes = await pool.query(
        `
        SELECT *
        FROM public.order_user_snapshot
        WHERE order_id = $1
        `,
        [order_id]
    );

    return {
        ...order,
        items: itemsRes.rows,
        address_snapshot: addressRes.rows[0] || null,
        user_snapshot: userRes.rows[0] || null
    };
};

// =====================================
// GET ORDER ITEMS
// =====================================
exports.getOrderItems = async (order_id) => {
    const res = await pool.query(
        `
        SELECT *
        FROM public.order_items
        WHERE order_id = $1
        ORDER BY created_time ASC
        `,
        [order_id]
    );

    return res.rows;
};

// =====================================
// GET ORDER ADDRESS SNAPSHOT
// =====================================
exports.getOrderAddressSnapshot = async (order_id) => {
    const res = await pool.query(
        `
        SELECT *
        FROM public.order_address_snapshot
        WHERE order_id = $1
        `,
        [order_id]
    );

    return res.rows[0] || null;
};

// =====================================
// GET ORDER USER SNAPSHOT
// =====================================
exports.getOrderUserSnapshot = async (order_id) => {
    const res = await pool.query(
        `
        SELECT *
        FROM public.order_user_snapshot
        WHERE order_id = $1
        `,
        [order_id]
    );

    return res.rows[0] || null;
};

// =====================================
// UPDATE ORDER STATUS
// =====================================
exports.updateOrderStatus = async (order_id, order_status, modified_by = null) => {
    const res = await pool.query(
        `
        UPDATE public.orders
        SET order_status = $1,
            modified_by = $2,
            modified_time = NOW()
        WHERE id = $3
        RETURNING *
        `,
        [order_status, modified_by, order_id]
    );

    if (res.rows.length === 0) {
        throw new Error("Order not found");
    }

    return res.rows[0];
};

// =====================================
// UPDATE PAYMENT STATUS
// =====================================
exports.updatePaymentStatus = async (order_id, payment_status, modified_by = null) => {
    const res = await pool.query(
        `
        UPDATE public.orders
        SET payment_status = $1,
            modified_by = $2,
            modified_time = NOW()
        WHERE id = $3
        RETURNING *
        `,
        [payment_status, modified_by, order_id]
    );

    if (res.rows.length === 0) {
        throw new Error("Order not found");
    }

    return res.rows[0];
};

// =====================================
// VERIFY RAZORPAY PAYMENT
// =====================================
exports.verifyOrderPayment = async ({
    order_id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    modified_by = null
}) => {
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        throw new Error("Invalid Razorpay signature");
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const orderRes = await client.query(
            `
            SELECT *
            FROM public.orders
            WHERE id = $1
            `,
            [order_id]
        );

        if (orderRes.rows.length === 0) {
            throw new Error("Order not found");
        }

        const order = orderRes.rows[0];

        await client.query(
            `
            UPDATE public.orders
            SET razorpay_order_id = $1,
                razorpay_payment_id = $2,
                razorpay_signature = $3,
                payment_status = 'paid',
                payment_gateway = 'razorpay',
                order_status = 'confirmed',
                modified_by = $4,
                modified_time = NOW()
            WHERE id = $5
            `,
            [
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                modified_by,
                order_id
            ]
        );

        // OPTIONAL: reduce stock after successful online payment
        const itemsRes = await client.query(
            `
            SELECT *
            FROM public.order_items
            WHERE order_id = $1
            `,
            [order_id]
        );

        for (const item of itemsRes.rows) {
            if (item.variant_id) {
                await client.query(
                    `
                    UPDATE public.product_variants
                    SET stock = stock - $1,
                        modified_time = NOW()
                    WHERE id = $2
                    `,
                    [item.quantity, item.variant_id]
                );
            }
        }

        await client.query("COMMIT");

        return {
            order_id: order.id,
            payment_status: "paid",
            order_status: "confirmed",
            razorpay_payment_id
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

// =====================================
// CANCEL ORDER
// =====================================
exports.cancelOrder = async (order_id, modified_by = null) => {
    const res = await pool.query(
        `
        UPDATE public.orders
        SET order_status = 'cancelled',
            modified_by = $1,
            modified_time = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [modified_by, order_id]
    );

    if (res.rows.length === 0) {
        throw new Error("Order not found");
    }

    return res.rows[0];
};