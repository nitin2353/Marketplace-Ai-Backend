const pool = require("../../../../config/database");
const crypto = require("crypto");
const notificationTriggers = require("../notifications/notification.trigger");
const sellerPaymentModal = require("../payments/seller_payment.modal");


const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestamp}-${random}`;
};


exports.buyNow = async ({ product_id, variant_id, quantity }) => {
    try {
        const productRes = await pool.query(
            `
            SELECT 
                p.id, p.title, p.base_price, p.image_url, p.seller_id, p.stock, p.status,
                u.status as seller_status
            FROM public.products p
            LEFT JOIN public.users u ON u.id = p.seller_id
            WHERE p.id = $1
            `,
            [product_id]
        );

        if (productRes.rows.length === 0) {
            throw new Error("Product not found");
        }

        const product = productRes.rows[0];

        const isValidProduct = product.status === 'active' || product.status === 'true' || product.status === true;

        if (!isValidProduct) {
            throw new Error("Product is not available for purchase");
        }

        if (product.seller_status !== 'active') {
            throw new Error("Seller is currently inactive");
        }

        let price = Number(product.base_price);
        let stock = Number(product.stock);
        let title = product.title;

        if (variant_id) {
            const variantRes = await pool.query(
                `SELECT * FROM public.product_variants WHERE id = $1 AND product_id = $2`,
                [variant_id, product_id]
            );

            if (variantRes.rows.length === 0) {
                throw new Error("Product variant not found");
            }

            const variant = variantRes.rows[0];
            price = Number(variant.final_price || variant.price);
            stock = Number(variant.stock);
        }

        if (stock < quantity) {
            throw new Error("Insufficient stock");
        }

        const subtotal = price * quantity;
        const delivery = subtotal >= 499 ? 0 : 49;
        const total = subtotal + delivery;

        return {
            items: [
                {
                    product_id,
                    variant_id: variant_id || null,
                    title,
                    price,
                    quantity,
                    total: subtotal
                }
            ],
            subtotal,
            delivery,
            total
        };
    } catch (error) {
        throw error;
    }
};


exports.createOrderFromCart = async ({
    user_id,
    address_id,
    payment_method,
    notes = null,
    created_by = null,
    modified_by = null,
    payment_order_id,
    discount_percentage = 0,
    discount_amount = 0,
    payment_id,
    payment_signature,
    items = null // Added for Buy Now
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        let cartItems = [];

        if (items && items.length > 0) {
            // BUY NOW FLOW: items are passed directly
            for (const item of items) {
                const productRes = await client.query(
                    `
                    SELECT 
                        p.id as product_id, p.title, p.description, p.base_price, p.brand, 
                        p.category, p.tag, p.image_url, p.seller_id, p.stock as product_stock, p.tax_percentage,
                        v.id as variant_id, v.color as variant_color, v.size as variant_size, 
                        v.final_price, v.stock as variant_stock
                    FROM public.products p
                    LEFT JOIN public.product_variants v ON v.id = $2
                    WHERE p.id = $1
                    `,
                    [item.product_id, item.variant_id]
                );

                if (productRes.rows.length === 0) {
                    throw new Error(`Product not found: ${item.product_id}`);
                }

                const row = productRes.rows[0];
                cartItems.push({
                    ...row,
                    total_quantity: item.quantity,
                    variant_id: item.variant_id || null,
                    stock: item.variant_id ? row.variant_stock : row.product_stock
                });
            }
        } else {
            // NORMAL CART FLOW
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
                    p.stock as product_stock,
                    p.tax_percentage,
    
                    v.color AS variant_color,
                    v.size AS variant_size,
                    v.final_price,
                    v.stock as variant_stock
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
            cartItems = cartRes.rows.map(row => ({
                ...row,
                stock: row.variant_id ? row.variant_stock : row.product_stock
            }));
        }

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
                phone,
                status
            FROM public.users
            WHERE id = $1 AND status = 'active'
            `,
            [user_id]
        );

        if (userRes.rows.length === 0) {
            throw new Error("User account is inactive or not found");
        }

        const user = userRes.rows[0];

        // 4. CALCULATE TOTALS
        let subtotal = 0;
        let total_quantity = 0;
        let total_items = cartItems.length;
        let total_tax_amount = 0;

        for (const item of cartItems) {
            const quantity = Number(item.total_quantity || 0);
            const unitPrice = item.variant_id
                ? Number(item.final_price || 0)
                : Number(item.base_price || 0);

            const lineTotal = unitPrice * quantity;

            subtotal += lineTotal;
            total_quantity += quantity;
            
            const itemTax = lineTotal * (Number(item.tax_percentage || 0) / 100);
            total_tax_amount += itemTax;

            // stock validation
            const availableStock = item.stock;
            if (availableStock !== null && availableStock !== undefined) {
                if (quantity > Number(availableStock)) {
                    throw new Error(`Insufficient stock for product: ${item.title}`);
                }
            }
        }

        const delivery_charge = 0;
        const tax_amount = total_tax_amount;
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
                discount_percentage,
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
                $16, $17, $18, $19, $20, $21, NOW(), NOW()
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
                discount_percentage,
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

        console.log("Order created. Stock validation passed. Deduction deferred to payment/confirmation.");


        if (!items || items.length === 0) {
            await client.query(
                `DELETE FROM public.cart WHERE user_id = $1`,
                [user_id]
            );
        }

        await client.query("COMMIT");

        // TRIGGER NOTIFICATIONS
        notificationTriggers.onOrderCreated(order.id, user_id).catch(console.error);
        sellerPaymentModal.recordOrderPayments(order.id).catch(console.error);

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
        SELECT o.*
        FROM public.orders o
        INNER JOIN public.users u ON u.id = o.user_id
        WHERE o.user_id = $1 AND u.status = 'active'
        ORDER BY o.created_time DESC
        `,
        [user_id]
    );

    const orders = res.rows;
    for (const order of orders) {
        const itemsRes = await pool.query(
            `
            SELECT oi.*, p.is_return, p.is_replace, p.return_replace_duration, p.seller_id
            FROM public.order_items oi
            LEFT JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = $1 
            ORDER BY oi.created_time ASC
            `,
            [order.id]
        );
        order.items = itemsRes.rows;

        const addressRes = await pool.query(
            `SELECT * FROM public.order_address_snapshot WHERE order_id = $1`,
            [order.id]
        );
        order.address_snapshot = addressRes.rows[0] || null;

        const userRes = await pool.query(
            `SELECT * FROM public.order_user_snapshot WHERE order_id = $1`,
            [order.id]
        );
        order.user_snapshot = userRes.rows[0] || null;
    }

    return orders;
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
        SELECT oi.*, p.is_return, p.is_replace, p.return_replace_duration, p.seller_id
        FROM public.order_items oi
        LEFT JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = $1
        ORDER BY oi.created_time ASC
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
        INNER JOIN public.order_items oi ON oi.order_id = o.id
        INNER JOIN public.products p ON p.id = oi.product_id
        INNER JOIN public.users u ON u.id = p.seller_id
        WHERE p.seller_id = $1 
          AND u.status = 'active'
        ORDER BY o.created_time DESC
        `,
        [seller_id]
    );

    const orders = res.rows;

    for (const order of orders) {
        const itemsRes = await pool.query(
            `
            SELECT 
                oi.*,
                p.seller_id,
                u.name AS seller_name,
                u.email AS seller_email,
                u.phone AS seller_phone,
                u.business_name AS seller_business_name
            FROM public.order_items oi
            INNER JOIN public.products p ON p.id = oi.product_id
            INNER JOIN public.users u ON u.id = p.seller_id
            WHERE oi.order_id = $1 
              AND p.seller_id = $2
              AND u.status = 'active'
            ORDER BY oi.created_time ASC
            `,
            [order.id, seller_id]
        );

        order.items = itemsRes.rows;

        const sellerInfo = await pool.query(
            `
            SELECT 
                *
            FROM public.users u
            WHERE id = $1
            `,
            [seller_id]
        );

        order.seller_info = sellerInfo.rows[0] || null;

        const addressRes = await pool.query(
            `SELECT * FROM public.order_address_snapshot WHERE order_id = $1`,
            [order.id]
        );
        order.address_snapshot = addressRes.rows[0] || null;

        const userRes = await pool.query(
            `SELECT * FROM public.order_user_snapshot WHERE order_id = $1`,
            [order.id]
        );
        order.user_snapshot = userRes.rows[0] || null;
    }

    return orders;
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

exports.getOrderById = async (order_id) => {

    const orderRes = await pool.query(
        `
        SELECT *
        FROM public.orders
        WHERE id = $1`,
        [order_id]
    );

    if (orderRes.rows.length === 0) {
        return null;
    }

    const order = orderRes.rows[0];

    const itemsRes = await pool.query(
        `
    SELECT 
        oi.*,
        p.weight, p.length, p.width, p.height,
        p.is_return, p.is_replace, p.return_replace_duration, p.seller_id,
        json_build_object(
            'single', json_build_object(
                'length', COALESCE(p.length, 0),
                'width', COALESCE(p.width, 0),
                'height', COALESCE(p.height, 0),
                'weight', COALESCE(p.weight, 0)
            ),
            'quantity', oi.quantity,
            'final_pack', json_build_object(
                'length', COALESCE(p.length, 0),
                'width', COALESCE(p.width, 0),
                'height', COALESCE(p.height, 0),
                'weight', COALESCE(p.weight, 0) * oi.quantity
            )
        ) as dimension_snapshot
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = $1
    ORDER BY oi.created_time ASC`,
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

    const sellerDetails = await pool.query(
        `
        SELECT id, name, email, phone, business_name, store_description, avatar, status
        FROM public.users
        WHERE id = (
            SELECT created_by FROM public.products WHERE id = (
                SELECT product_id FROM public.order_items WHERE order_id = $1 LIMIT 1
            )
        )
        `,
        [order_id]
    );

    const sellerAddress = sellerDetails.rows[0]?.id ? await pool.query(
        `SELECT * from public.address where user_id = $1`,
        [sellerDetails.rows[0].id]
    ) : { rows: [] };
    console.log("sellerDetails fetched for order details")

    return {
        ...order,
        items: itemsRes.rows,
        address_snapshot: addressRes.rows[0] || null,
        user_snapshot: userRes.rows[0] || null,
        seller_info: { info: sellerDetails.rows[0] || null, address: sellerAddress?.rows[0] || null }
    };
};

// =====================================
// GET ORDER ITEMS
// =====================================
exports.getOrderItems = async (order_id) => {
    const res = await pool.query(
        `
        SELECT 
            oi.*,
            p.weight,
            p.length,
            p.width,
            p.height,
            p.seller_id,
            p.is_return,
            p.is_replace,
            p.return_replace_duration,
            EXISTS(SELECT 1 FROM public.reviews r WHERE r.order_id = oi.order_id AND r.product_id = oi.product_id) as is_reviewed,
            json_build_object(
                'single', json_build_object(
                    'length', COALESCE(p.length, 0),
                    'width', COALESCE(p.width, 0),
                    'height', COALESCE(p.height, 0),
                    'weight', COALESCE(p.weight, 0)
                ),
                'quantity', oi.quantity,
                'final_pack', json_build_object(
                    'length', COALESCE(p.length, 0),
                    'width', COALESCE(p.width, 0),
                    'height', COALESCE(p.height, 0) * COALESCE(oi.quantity, 1),
                    'weight', COALESCE(p.weight, 0) * COALESCE(oi.quantity, 1)
                )
            ) AS dimension
        FROM public.order_items oi
        LEFT JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = $1
        ORDER BY oi.created_time ASC
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
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const orderCheck = await client.query("SELECT * FROM public.orders WHERE id = $1", [order_id]);
        if (orderCheck.rows.length === 0) throw new Error("Order not found");
        const order = orderCheck.rows[0];

        // If status changing to confirmed and it's COD/Unpaid, deduct stock now
        if (order_status === "confirmed" && order.order_status !== "confirmed") {
            const itemsRes = await client.query("SELECT * FROM public.order_items WHERE order_id = $1", [order_id]);

            for (const item of itemsRes.rows) {
                const quantity = Number(item.quantity || 0);
                if (item.variant_id) {
                    const vRes = await client.query(
                        `UPDATE public.product_variants SET stock = stock - $1, modified_time = NOW() WHERE id = $2 AND stock >= $1 RETURNING id`,
                        [quantity, item.variant_id]
                    );
                    if (vRes.rows.length === 0) throw new Error(`Insufficient stock for variant: ${item.product_title}`);
                    await client.query(
                        `UPDATE public.products SET stock = (SELECT COALESCE(SUM(stock), 0) FROM public.product_variants WHERE product_id = $1), modified_time = NOW() WHERE id = $1`,
                        [item.product_id]
                    );
                } else {
                    const pRes = await client.query(
                        `UPDATE public.products SET stock = stock - $1, modified_time = NOW() WHERE id = $2 AND stock >= $1 RETURNING id`,
                        [quantity, item.product_id]
                    );
                    if (pRes.rows.length === 0) throw new Error(`Insufficient stock for product: ${item.product_title}`);
                }

                // Increment sold quantity
                await client.query(
                    `UPDATE public.products SET sold = COALESCE(sold, 0) + $1, modified_time = NOW() WHERE id = $2`,
                    [quantity, item.product_id]
                );
            }
        }

        // If status changing to cancelled and it was previously confirmed/processing/shipped/delivered, restore stock
        const stockDeductedStatuses = ["confirmed", "processing", "shipped", "delivered"];
        if (order_status === "cancelled" && stockDeductedStatuses.includes(order.order_status)) {
            const itemsRes = await client.query("SELECT * FROM public.order_items WHERE order_id = $1", [order_id]);

            for (const item of itemsRes.rows) {
                const quantity = Number(item.quantity || 0);
                if (item.variant_id) {
                    await client.query(
                        `UPDATE public.product_variants SET stock = stock + $1, modified_time = NOW() WHERE id = $2`,
                        [quantity, item.variant_id]
                    );
                    await client.query(
                        `UPDATE public.products SET stock = (SELECT COALESCE(SUM(stock), 0) FROM public.product_variants WHERE product_id = $1), modified_time = NOW() WHERE id = $1`,
                        [item.product_id]
                    );
                } else {
                    await client.query(
                        `UPDATE public.products SET stock = stock + $1, modified_time = NOW() WHERE id = $2`,
                        [quantity, item.product_id]
                    );
                }

                // Decrement sold quantity
                await client.query(
                    `UPDATE public.products SET sold = GREATEST(0, COALESCE(sold, 0) - $1), modified_time = NOW() WHERE id = $2`,
                    [quantity, item.product_id]
                );
            }
        }

        const res = await client.query(
            `UPDATE public.orders SET order_status = $1, modified_by = $2, modified_time = NOW() WHERE id = $3 RETURNING *`,
            [order_status, modified_by, order_id]
        );

        await client.query("COMMIT");

        // TRIGGER NOTIFICATION
        notificationTriggers.onOrderStatusUpdated(order_id, order_status).catch(console.error);
        sellerPaymentModal.updatePaymentStatusByOrder(order_id, order_status).catch(console.error);

        // TRIGGER LOW STOCK CHECK IF DEDUCTED
        if (order_status === "confirmed" && order.order_status !== "confirmed") {
            const itemsRes = await pool.query("SELECT product_id, variant_id FROM public.order_items WHERE order_id = $1", [order_id]);
            for (const item of itemsRes.rows) {
                notificationTriggers.checkLowStock(item.product_id, item.variant_id).catch(console.error);
            }
        }

        return res.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
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
    
    if (res.rows.length > 0) {
        sellerPaymentModal.updatePaymentStatusByOrder(order_id, null, payment_status).catch(console.error);
    }

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

        if (order.payment_status === 'paid') {
            await client.query("COMMIT");
            return {
                success: true,
                message: "Payment already verified",
                data: {
                    order_id: order.id,
                    payment_status: order.payment_status,
                    order_status: order.order_status,
                    razorpay_payment_id: order.razorpay_payment_id
                }
            };
        }

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
            const quantity = Number(item.quantity || 0);
            if (item.variant_id) {
                const vRes = await client.query(
                    `UPDATE public.product_variants
                     SET stock = stock - $1, modified_time = NOW()
                     WHERE id = $2 AND stock >= $1
                     RETURNING id`,
                    [quantity, item.variant_id]
                );
                if (vRes.rows.length === 0) throw new Error(`Insufficient stock for variant: ${item.product_title}`);

                await client.query(
                    `UPDATE public.products
                     SET stock = (SELECT COALESCE(SUM(stock), 0) FROM public.product_variants WHERE product_id = $1),
                         modified_time = NOW()
                     WHERE id = $1`,
                    [item.product_id]
                );
            } else {
                const pRes = await client.query(
                    `UPDATE public.products
                     SET stock = stock - $1, modified_time = NOW()
                     WHERE id = $2 AND stock >= $1
                     RETURNING id`,
                    [quantity, item.product_id]
                );
                if (pRes.rows.length === 0) throw new Error(`Insufficient stock for product: ${item.product_title}`);
            }
            console.log("quantity, item.product_id", quantity, item.product_id)
            await client.query(
                `UPDATE public.products SET sold = COALESCE(sold, 0) + $1, modified_time = NOW() WHERE id = $2`,
                [quantity, item.product_id]
            );
        }

        await client.query("COMMIT");

        // SYNC PAYMENTS
        sellerPaymentModal.updatePaymentStatusByOrder(order_id, 'confirmed', 'paid').catch(console.error);

        // TRIGGER NOTIFICATIONS
        notificationTriggers.onPaymentSuccessful(order.id).catch(console.error);
        for (const item of itemsRes.rows) {
            notificationTriggers.checkLowStock(item.product_id, item.variant_id).catch(console.error);
        }

        return {
            success: true,
            message: "Payment verified and order confirmed",
            data: {
                order_id: order.id,
                payment_status: "paid",
                order_status: "confirmed",
                razorpay_payment_id
            }
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

    // TRIGGER NOTIFICATION
    notificationTriggers.onOrderStatusUpdated(order_id, 'cancelled').catch(console.error);
    sellerPaymentModal.updatePaymentStatusByOrder(order_id, 'cancelled').catch(console.error);

    return res.rows[0];
};