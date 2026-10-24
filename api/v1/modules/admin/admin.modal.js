const pool = require("../../../../config/database");

exports.getAllSellers = async () => {

    const query = `
    WITH seller_payments AS (
        SELECT
            p.id AS payment_id,
            p.seller_id,
            p.order_id,
            COALESCE(p.amount, 0) AS amount,
            COALESCE(p.seller_amount, 0) AS seller_amount,
            COALESCE(p.seller_earning, 0) AS seller_earning,
            COALESCE(p.platform_fee, 0) AS platform_fee,
            COALESCE(p.refund_amount, 0) AS refund_amount,
            LOWER(COALESCE(p.settlement_status, 'pending'))
                AS settlement_status,
            LOWER(COALESCE(p.status, 'pending'))
                AS payment_status,
            p.created_at,
            LOWER(COALESCE(o.payment_status, 'pending'))
                AS order_payment_status,
            LOWER(COALESCE(o.order_status, 'pending'))
                AS order_status
        FROM public.payments p
        JOIN public.orders o ON o.id = p.order_id
    ),

    payment_summary AS (
        SELECT
            seller_id,

            COALESCE(SUM(amount) FILTER (
                WHERE settlement_status NOT IN ('cancelled', 'refunded')
            ), 0) AS total_revenue,

            COALESCE(SUM(seller_earning) FILTER (
                WHERE settlement_status IN ('pending', 'eligible')
                  AND (
                      order_payment_status = 'paid'
                      OR order_status = 'delivered'
                  )
            ), 0) AS available_balance,

            COALESCE(SUM(seller_earning) FILTER (
                WHERE settlement_status = 'pending'
                  AND order_payment_status = 'pending'
                  AND order_status NOT IN ('delivered', 'cancelled')
            ), 0) AS pending_balance,

            COALESCE(SUM(
                CASE
                    WHEN settlement_status IN ('cancelled', 'refunded')
                    THEN COALESCE(NULLIF(refund_amount, 0), amount)
                    ELSE refund_amount
                END
            ), 0) AS refunded_amount,

            COALESCE(SUM(seller_earning) FILTER (
                WHERE created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
                  AND settlement_status NOT IN ('cancelled', 'refunded')
            ), 0) AS monthly_earning,

            COALESCE(SUM(seller_earning) FILTER (
                WHERE created_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP)
                  AND settlement_status NOT IN ('cancelled', 'refunded')
            ), 0) AS today_earning,

            COUNT(DISTINCT order_id) AS total_orders,

            COUNT(DISTINCT order_id) FILTER (
                WHERE order_payment_status = 'paid'
            ) AS paid_orders,

            COUNT(DISTINCT order_id) FILTER (
                WHERE order_payment_status = 'pending'
            ) AS pending_orders,

            COALESCE(SUM(seller_amount), 0) AS total_seller_amount,
            COALESCE(SUM(platform_fee), 0) AS total_platform_fee,

            COUNT(*) AS total_payment_records,

            COUNT(*) FILTER (
                WHERE payment_status = 'paid'
            ) AS successful_payment_records,

            COUNT(*) FILTER (
                WHERE payment_status = 'pending'
            ) AS pending_payment_records,

            COUNT(*) FILTER (
                WHERE settlement_status = 'eligible'
            ) AS eligible_settlements,

            COUNT(*) FILTER (
                WHERE settlement_status = 'settled'
            ) AS settled_payment_records,

            COUNT(*) FILTER (
                WHERE settlement_status = 'cancelled'
            ) AS cancelled_payment_records,

            COUNT(*) FILTER (
                WHERE settlement_status = 'refunded'
            ) AS refunded_payment_records

        FROM seller_payments
        GROUP BY seller_id
    ),

    seller_order_discounts AS (
        SELECT
            sp.seller_id,
            COALESCE(SUM(order_discounts.discount_amount), 0)
                AS total_discount_amount
        FROM (
            SELECT DISTINCT seller_id, order_id
            FROM seller_payments
        ) sp
        JOIN (
            SELECT
                id AS order_id,
                COALESCE(discount_amount, 0) AS discount_amount
            FROM public.orders
        ) order_discounts
            ON order_discounts.order_id = sp.order_id
        GROUP BY sp.seller_id
    )

    SELECT
        u.id AS seller_id,
        u.name,
        u.first_name,
        u.last_name,
        u.business_name,
        u.email,
        u.phone,
        LOWER(COALESCE(u.status, 'inactive')) AS status,
        u.created_at AS seller_created_at,

        COALESCE(ps.total_revenue, 0) AS total_revenue,
        COALESCE(ps.available_balance, 0) AS available_balance,
        COALESCE(ps.pending_balance, 0) AS pending_balance,
        COALESCE(ps.refunded_amount, 0) AS refunded_amount,
        COALESCE(ps.monthly_earning, 0) AS monthly_earning,
        COALESCE(ps.today_earning, 0) AS today_earning,
        COALESCE(ps.total_orders, 0) AS total_orders,
        COALESCE(ps.paid_orders, 0) AS paid_orders,
        COALESCE(ps.pending_orders, 0) AS pending_orders,

        COALESCE(ps.total_seller_amount, 0) AS total_seller_amount,
        COALESCE(sd.total_discount_amount, 0) AS total_discount_amount,
        COALESCE(ps.total_platform_fee, 0) AS total_platform_fee,
        COALESCE(ps.total_payment_records, 0) AS total_payment_records,
        COALESCE(ps.successful_payment_records, 0)
            AS successful_payment_records,
        COALESCE(ps.pending_payment_records, 0)
            AS pending_payment_records,
        COALESCE(ps.eligible_settlements, 0) AS eligible_settlements,
        COALESCE(ps.settled_payment_records, 0)
            AS settled_payment_records,
        COALESCE(ps.cancelled_payment_records, 0)
            AS cancelled_payment_records,
        COALESCE(ps.refunded_payment_records, 0)
            AS refunded_payment_records

    FROM public.users u
    LEFT JOIN payment_summary ps
        ON ps.seller_id = u.id
    LEFT JOIN seller_order_discounts sd
        ON sd.seller_id = u.id
    WHERE LOWER(u.role) = 'seller'
    ORDER BY u.created_at DESC NULLS LAST
`;


    const result = await pool.query(query);
    return result.rows;
};

exports.updateSellerStatus = async (sellerId, status) => {
    const query = `
        UPDATE public.users
        SET status = $1
        WHERE id::text = $2
          AND LOWER(role) = 'seller'
        RETURNING
            id AS seller_id,
            name,
            first_name,
            last_name,
            business_name,
            email,
            phone,
            LOWER(status) AS status
    `;

    const result = await pool.query(query, [status, sellerId]);

    return result.rows[0] || null;
};
