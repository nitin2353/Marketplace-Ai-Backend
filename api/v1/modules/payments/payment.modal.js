const pool = require("../../../../config/database");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const notificationTriggers = require("../notifications/notification.trigger");
const sellerPaymentModal = require("./seller_payment.modal");

const razorpay = new Razorpay({
    key_id: 'rzp_test_SZiKye10gyvfN1',
    key_secret: 'N3Os6n4j4He7MqC4pTDrJRyU'
});

const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestamp}-${random}`;
};

const calculateCartTotals = async (client, user_id, discount_percentage = 0, items = null) => {
    let cartItems = [];

    if (items && items.length > 0) {
        // BUY NOW FLOW
        for (const item of items) {
            const productRes = await client.query(
                `
                SELECT 
                    p.id AS product_id, p.title, p.description, p.base_price, p.brand, 
                    p.category, p.tag, p.image_url, p.seller_id, p.stock AS product_stock,
                    v.id AS variant_id, v.color AS variant_color, v.size AS variant_size, 
                    v.final_price, v.stock AS variant_stock
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
                c.id AS cart_id,
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
                p.stock AS product_stock,
    
                v.color AS variant_color,
                v.size AS variant_size,
                v.final_price,
                v.stock AS variant_stock
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

    let subtotal = 0;
    let total_quantity = 0;
    const total_items = cartItems.length;

    for (const item of cartItems) {
        const quantity = Number(item.total_quantity || 0);
        const unit_price = item.variant_id
            ? Number(item.final_price || 0)
            : Number(item.base_price || 0);

        const availableStock = item.stock;
        if (availableStock !== null && availableStock !== undefined) {
            if (quantity > Number(availableStock)) {
                throw new Error(`Insufficient stock for product: ${item.title}`);
            }
        }

        subtotal += unit_price * quantity;
        total_quantity += quantity;
    }

    const discount_amount = subtotal * (Number(discount_percentage || 0) / 100);
    const delivery_charge = subtotal < 499 ? 50 : 0;
    const tax_amount = 0;
    const total_amount = subtotal + delivery_charge + tax_amount - discount_amount;

    return {
        cartItems,
        subtotal,
        total_quantity,
        total_items,
        discount_amount,
        delivery_charge,
        tax_amount,
        total_amount
    };
};

exports.createRazorpayOrder = async ({
    user_id,
    address_id,
    payment_method,
    delivery_charge = 0,
    coupon_code = null,
    discount_percentage = 0,
    subtotal_amount = 0,
    discount_amount = 0,
    notes = null
}) => {

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const addressRes = await client.query(
            `
            SELECT id
            FROM public.address
            WHERE id = $1 AND user_id = $2
            `,
            [address_id, user_id]
        );

        if (addressRes.rows.length === 0) {
            throw new Error("Address not found");
        }

        if (payment_method === "cod") {
            throw new Error("Use order create API directly for COD, Razorpay order is not needed");
        }


        const total_amount = Math.round((subtotal_amount - discount_amount) + delivery_charge);


        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(Number(total_amount) * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        });



        await client.query("COMMIT");

        return {
            key: 'rzp_test_SZiKye10gyvfN1',
            razorpay_order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            total_amount: total_amount,
            subtotal: subtotal_amount,
            discount_amount: discount_amount,
            coupon_code,
            notes
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

exports.verifyAndCreateOrder = async ({
    user_id,
    address_id,
    payment_method,
    payment_id,
    payment_order_id,
    payment_signature,
    coupon_code = null,
    discount_percentage = 0,
    discount_amount = 0,
    subtotal_amount = 0,
    total_amount = 0,
    delivery_charge = 0,
    notes = null,
    created_by = null,
    modified_by = null,
    cart_items = null // Buy Now
}) => {

    // ============================================================
    // 1. VERIFY RAZORPAY SIGNATURE
    // ============================================================

    const expectedSignature = crypto
        .createHmac(
            "sha256",
            process.env.RAZORPAY_KEY_SECRET
        )
        .update(
            `${payment_order_id}|${payment_id}`
        )
        .digest("hex");

    if (expectedSignature !== payment_signature) {
        throw new Error("Invalid Razorpay signature");
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // ============================================================
        // 2. CHECK DUPLICATE PAYMENT
        // ============================================================

        const existingOrderRes = await client.query(
            `
            SELECT id
            FROM public.orders
            WHERE razorpay_payment_id = $1
            LIMIT 1
            `,
            [payment_id]
        );

        if (existingOrderRes.rows.length > 0) {
            throw new Error(
                "Order already exists for this payment"
            );
        }

        // ============================================================
        // 3. GET ADDRESS
        // ============================================================

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
            WHERE id = $1
                AND user_id = $2
            `,
            [address_id, user_id]
        );

        if (addressRes.rows.length === 0) {
            throw new Error("Address not found");
        }

        const address = addressRes.rows[0];

        // ============================================================
        // 4. GET USER
        // ============================================================

        const userRes = await client.query(
            `
            SELECT
                id,
                name,
                email,
                phone,
                status
            FROM public.users
            WHERE id = $1
                AND status = 'active'
            `,
            [user_id]
        );

        if (userRes.rows.length === 0) {
            throw new Error(
                "User account is inactive or not found"
            );
        }

        const user = userRes.rows[0];

        // ============================================================
        // 5. GET CART / BUY NOW ITEMS
        // ============================================================

        let cartItems = [];

        if (
            cart_items &&
            cart_items.length > 0
        ) {
            // ========================================================
            // BUY NOW FLOW
            // ========================================================

            for (const item of cart_items) {
                const productRes = await client.query(
                    `
                    SELECT
                        p.id AS product_id,
                        p.title,
                        p.description,
                        p.base_price,
                        p.brand,
                        p.category,
                        p.tag,
                        p.image_url,
                        p.seller_id,
                        p.stock AS product_stock,
                        p.tax_percentage,

                        v.id AS variant_id,
                        v.color AS variant_color,
                        v.size AS variant_size,
                        v.final_price,
                        v.stock AS variant_stock

                    FROM public.products p

                    LEFT JOIN public.product_variants v
                        ON v.id = $2

                    WHERE p.id = $1
                    `,
                    [
                        item.product_id,
                        item.variant_id
                    ]
                );

                if (productRes.rows.length === 0) {
                    throw new Error(
                        `Product not found: ${item.product_id}`
                    );
                }

                const row = productRes.rows[0];

                cartItems.push({
                    ...row,

                    total_quantity: Number(
                        item.quantity || 0
                    ),

                    variant_id:
                        item.variant_id || null,

                    stock: item.variant_id
                        ? row.variant_stock
                        : row.product_stock
                });
            }

        } else {

            // ========================================================
            // NORMAL CART FLOW
            // ========================================================

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
                    p.stock AS product_stock,
                    p.tax_percentage,

                    v.color AS variant_color,
                    v.size AS variant_size,
                    v.final_price,
                    v.stock AS variant_stock

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

            cartItems = cartRes.rows.map(
                (row) => ({
                    ...row,

                    stock: row.variant_id
                        ? row.variant_stock
                        : row.product_stock
                })
            );
        }

        if (cartItems.length === 0) {
            throw new Error(
                "No items available for order"
            );
        }

        // ============================================================
        // 6. VALIDATE STOCK
        // ============================================================

        for (const item of cartItems) {
            const quantity = Number(
                item.total_quantity || 0
            );

            if (quantity <= 0) {
                throw new Error(
                    `Invalid quantity for product: ${item.title}`
                );
            }

            const availableStock = item.stock;

            if (
                availableStock !== null &&
                availableStock !== undefined
            ) {
                if (
                    quantity >
                    Number(availableStock)
                ) {
                    throw new Error(
                        `Insufficient stock for product: ${item.title}`
                    );
                }
            }
        }

        // ============================================================
        // 7. GROUP CART ITEMS BY SELLER
        // ============================================================

        const sellerGroups = {};

        for (const item of cartItems) {
            const sellerId = item.seller_id;

            if (!sellerId) {
                throw new Error(
                    `Seller not found for product: ${item.title}`
                );
            }

            if (!sellerGroups[sellerId]) {
                sellerGroups[sellerId] = [];
            }

            sellerGroups[sellerId].push(item);
        }

        console.log(
            "Razorpay Seller Groups:",
            Object.keys(sellerGroups)
        );

        // ============================================================
        // 8. CALCULATE TOTAL CART SUBTOTAL
        // ============================================================

        let cartSubtotal = 0;

        for (const item of cartItems) {
            const quantity = Number(
                item.total_quantity || 0
            );

            const unitPrice = item.variant_id
                ? Number(
                    item.final_price || 0
                )
                : Number(
                    item.base_price || 0
                );

            cartSubtotal +=
                unitPrice * quantity;
        }

        // ============================================================
        // 9. CREATE SELLER-WISE PAID ORDERS
        // ============================================================

        const createdOrders = [];

        let grandTotalAmount = 0;
        let isDeliveryChargesAdded = false;

        for (
            const sellerId of Object.keys(
                sellerGroups
            )
        ) {
            const sellerItems =
                sellerGroups[sellerId];

            // ========================================================
            // 9.1 SELLER TOTALS
            // ========================================================

            let sellerSubtotal = 0;
            let sellerQuantity = 0;
            let sellerTaxAmount = 0;

            for (const item of sellerItems) {
                const quantity = Number(
                    item.total_quantity || 0
                );

                const unitPrice = item.variant_id
                    ? Number(
                        item.final_price || 0
                    )
                    : Number(
                        item.base_price || 0
                    );

                const lineTotal =
                    unitPrice * quantity;

                const itemTax =
                    lineTotal *
                    (
                        Number(
                            item.tax_percentage || 0
                        ) / 100
                    );

                sellerSubtotal += lineTotal;
                sellerQuantity += quantity;
                sellerTaxAmount += itemTax;
            }

            // ========================================================
            // 9.2 SELLER-WISE DISCOUNT
            // ========================================================

            let sellerDiscount = 0;

            if (
                Number(discount_amount) > 0 &&
                cartSubtotal > 0
            ) {
                sellerDiscount =
                    (
                        sellerSubtotal /
                        cartSubtotal
                    ) *
                    Number(discount_amount);
            }

            sellerDiscount = Number(
                sellerDiscount.toFixed(2)
            );

            // ========================================================
            // 9.3 DELIVERY CHARGE
            // ========================================================

            const sellerDeliveryCharge =
                cartSubtotal <= 499 && !isDeliveryChargesAdded
                    ? 49
                    : 0;

            // ========================================================
            // 9.4 FINAL SELLER ORDER TOTAL
            // ========================================================

            const sellerTotalAmount =
                sellerSubtotal +
                sellerDeliveryCharge +
                sellerTaxAmount -
                sellerDiscount;

            grandTotalAmount +=
                sellerTotalAmount;

            // ========================================================
            // 9.5 GENERATE ORDER NUMBER
            // ========================================================

            const order_number =
                generateOrderNumber();

            // ========================================================
            // 9.6 INSERT SELLER ORDER
            // ========================================================

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
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10,
                    $11,
                    $12,
                    $13,
                    $14,
                    $15,
                    $16,
                    $17,
                    $18,
                    $19,
                    $20,
                    $21,
                    NOW(),
                    NOW()
                )

                RETURNING *
                `,
                [
                    user_id,
                    address_id,
                    order_number,

                    // Seller item count
                    sellerItems.length,

                    // Seller quantity
                    sellerQuantity,

                    sellerSubtotal,
                    sellerDeliveryCharge,
                    sellerDiscount,
                    sellerTaxAmount,
                    sellerTotalAmount,

                    payment_method,

                    // Razorpay payment verified
                    "paid",
                    "razorpay",

                    discount_percentage,

                    payment_order_id,
                    payment_id,
                    payment_signature,

                    "confirmed",
                    notes,

                    created_by,
                    modified_by
                ]
            );
            isDeliveryChargesAdded = true;
            const order =
                orderRes.rows[0];

            
            // ========================================================
            // 10. INSERT ORDER ITEMS
            // ========================================================

            for (const item of sellerItems) {
                const quantity = Number(
                    item.total_quantity || 0
                );

                const unitPrice = item.variant_id
                    ? Number(
                        item.final_price || 0
                    )
                    : Number(
                        item.base_price || 0
                    );

                const lineTotal =
                    unitPrice * quantity;

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
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        $12,
                        $13,
                        $14,
                        $15,
                        $16,
                        NOW(),
                        NOW()
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

                // ====================================================
                // 11. UPDATE STOCK
                // ====================================================

                if (item.variant_id) {
                    const stockUpdate =
                        await client.query(
                            `
                            UPDATE public.product_variants
                            SET
                                stock = stock - $1,
                                modified_time = NOW()
                            WHERE id = $2
                                AND stock >= $1
                            RETURNING id
                            `,
                            [
                                quantity,
                                item.variant_id
                            ]
                        );

                    if (
                        stockUpdate.rows.length === 0
                    ) {
                        throw new Error(
                            `Insufficient stock for variant: ${item.title}`
                        );
                    }

                } else {
                    const stockUpdate =
                        await client.query(
                            `
                            UPDATE public.products
                            SET
                                stock = stock - $1,
                                sold = sold + $1,
                                modified_time = NOW()
                            WHERE id = $2
                                AND stock >= $1
                            RETURNING id
                            `,
                            [
                                quantity,
                                item.product_id
                            ]
                        );

                    if (
                        stockUpdate.rows.length === 0
                    ) {
                        throw new Error(
                            `Insufficient stock for product: ${item.title}`
                        );
                    }
                }
            }

            // ========================================================
            // 12. ADDRESS SNAPSHOT
            // ========================================================

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
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10,
                    $11,
                    $12,
                    $13,
                    $14,
                    NOW()
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

            // ========================================================
            // 13. USER SNAPSHOT
            // ========================================================

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

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    NOW()
                )
                `,
                [
                    order.id,
                    user.id,
                    user.name || "",
                    user.email || "",
                    user.phone || ""
                ]
            );

            // ========================================================
            // 14. SAVE CREATED ORDER
            // ========================================================

            createdOrders.push(order);
        }
        

        // ============================================================
        // 15. DELETE CART
        // ============================================================

        if (
            !cart_items ||
            cart_items.length === 0
        ) {
            await client.query(
                `
                DELETE FROM public.cart
                WHERE user_id = $1
                `,
                [user_id]
            );
        }

        // ============================================================
        // 16. COMMIT
        // ============================================================

        await client.query("COMMIT");

        // ============================================================
        // 17. NOTIFICATIONS / SELLER PAYMENT
        // ============================================================

        for (const order of createdOrders) {
            notificationTriggers
                .onOrderCreated(
                    order.id,
                    user_id
                )
                .catch(console.error);

            notificationTriggers
                .onPaymentSuccessful(
                    order.id
                )
                .catch(console.error);

            sellerPaymentModal
                .recordOrderPayments(
                    order.id
                )
                .catch(console.error);
        }

        // ============================================================
        // 18. LOW STOCK NOTIFICATIONS
        // ============================================================

        for (const item of cartItems) {
            notificationTriggers
                .checkLowStock(
                    item.product_id,
                    item.variant_id
                )
                .catch(console.error);
        }

        // ============================================================
        // 19. RETURN RESPONSE
        // ============================================================

        return {
            // All seller-wise orders
            orders: createdOrders,

            // Backward compatibility
            order: createdOrders[0] || null,

            orders_count:
                createdOrders.length,

            items_count:
                cartItems.length,

            payment_status: "paid",

            order_status: "confirmed",

            razorpay_payment_id:
                payment_id,

            razorpay_order_id:
                payment_order_id,

            total_amount: Number(
                grandTotalAmount.toFixed(2)
            ),

            payment_method,

            coupon_code
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
};

exports.getPaymentByOrderId = async (order_id) => {
    const res = await pool.query(
        `
        SELECT
            id,
            order_number,
            total_amount,
            payment_method,
            payment_status,
            payment_gateway,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            order_status,
            created_time,
            modified_time
        FROM public.orders
        WHERE id = $1
        `,
        [order_id]
    );

    return res.rows[0] || null;
};

exports.handleWebhook = async ({ rawBody, signature }) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
        throw new Error("RAZORPAY_WEBHOOK_SECRET is missing in env");
    }

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

    if (expectedSignature !== signature) {
        throw new Error("Invalid webhook signature");
    }

    const payload = JSON.parse(rawBody.toString());
    const event = payload.event;

    if (event === "payment.captured") {
        const paymentEntity = payload.payload?.payment?.entity;

        if (paymentEntity?.id) {
            await pool.query(
                `
                UPDATE public.orders
                SET payment_status = 'paid',
                    payment_gateway = 'razorpay',
                    razorpay_payment_id = COALESCE(razorpay_payment_id, $1),
                    razorpay_order_id = COALESCE(razorpay_order_id, $2),
                    modified_time = NOW()
                WHERE razorpay_payment_id = $1
                   OR razorpay_order_id = $2
                `,
                [paymentEntity.id, paymentEntity.order_id]
            );
        }
    }

    if (event === "payment.failed") {
        const paymentEntity = payload.payload?.payment?.entity;

        if (paymentEntity?.id) {
            await pool.query(
                `
                UPDATE public.orders
                SET payment_status = 'failed',
                    order_status = 'payment_failed',
                    payment_gateway = 'razorpay',
                    razorpay_payment_id = COALESCE(razorpay_payment_id, $1),
                    razorpay_order_id = COALESCE(razorpay_order_id, $2),
                    modified_time = NOW()
                WHERE razorpay_payment_id = $1
                   OR razorpay_order_id = $2
                `,
                [paymentEntity.id, paymentEntity.order_id]
            );
        }
    }

    if (event === "order.paid") {
        const orderEntity = payload.payload?.order?.entity;

        if (orderEntity?.id) {
            await pool.query(
                `
                UPDATE public.orders
                SET payment_status = 'paid',
                    payment_gateway = 'razorpay',
                    razorpay_order_id = COALESCE(razorpay_order_id, $1),
                    modified_time = NOW()
                WHERE razorpay_order_id = $1
                `,
                [orderEntity.id]
            );
        }
    }

    return {
        event,
        handled: true
    };
};