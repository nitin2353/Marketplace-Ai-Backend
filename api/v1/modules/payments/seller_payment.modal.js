const pool = require("../../../../config/database");

/**
 * Get seller payment summary
 */
exports.getSellerSummary = async (sellerId) => {
    const query = `
        WITH seller_stats AS (
            SELECT 
                COALESCE(SUM(CASE WHEN settlement_status NOT IN ('cancelled', 'refunded') THEN amount ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN (settlement_status = 'pending' OR settlement_status = 'eligible') AND (o.payment_status = 'paid' OR o.order_status = 'delivered') THEN seller_earning ELSE 0 END), 0) as available_balance,
                COALESCE(SUM(CASE WHEN settlement_status = 'pending' AND o.payment_status = 'pending' AND o.order_status != 'delivered' AND o.order_status != 'cancelled' THEN seller_earning ELSE 0 END), 0) as pending_balance,
                COALESCE(SUM(CASE WHEN settlement_status IN ('cancelled', 'refunded') THEN COALESCE(NULLIF(refund_amount, 0), amount, 0) ELSE refund_amount END), 0) as refunded_amount,
                COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_TIMESTAMP) AND settlement_status NOT IN ('cancelled', 'refunded') THEN seller_earning ELSE 0 END), 0) as monthly_earning,
                COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', CURRENT_TIMESTAMP) AND settlement_status NOT IN ('cancelled', 'refunded') THEN seller_earning ELSE 0 END), 0) as today_earning,
                COUNT(DISTINCT order_id) as total_orders
            FROM public.payments p
            JOIN public.orders o ON o.id = p.order_id
            WHERE p.seller_id = $1
        ),
        order_stats AS (
            SELECT 
                COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status = 'paid') as paid_orders,
                COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status = 'pending') as pending_orders
            FROM public.orders o
            JOIN public.order_items oi ON oi.order_id = o.id
            JOIN public.products pr ON pr.id = oi.product_id
            WHERE pr.seller_id = $1
        )
        SELECT * FROM seller_stats, order_stats
    `;
    
    const res = await pool.query(query, [sellerId]);
    return res.rows[0];
};

/**
 * Get seller transactions with filters
 */
exports.getSellerTransactions = async (sellerId, filters = {}) => {
    let query = `
        SELECT 
            p.id,
            o.order_number,
            ous.full_name as customer_name,
            p.payment_method,
            o.payment_gateway,
            p.amount,
            p.platform_fee,
            CASE WHEN p.settlement_status IN ('cancelled', 'refunded') THEN 0 ELSE p.seller_earning END as seller_earning,
            CASE WHEN p.settlement_status IN ('cancelled', 'refunded') THEN COALESCE(NULLIF(p.refund_amount, 0), p.amount, 0) ELSE p.refund_amount END as refund_amount,
            p.settlement_status,
            o.payment_status,
            p.created_at as created_time
        FROM public.payments p
        JOIN public.orders o ON o.id = p.order_id
        LEFT JOIN public.order_user_snapshot ous ON ous.order_id = o.id
        WHERE p.seller_id = $1
    `;
    
    const values = [sellerId];
    let index = 2;
    
    if (filters.status) {
        query += ` AND o.payment_status = $${index++}`;
        values.push(filters.status);
    }
    
    if (filters.settlement_status) {
        query += ` AND p.settlement_status = $${index++}`;
        values.push(filters.settlement_status);
    }
    
    if (filters.payment_method) {
        query += ` AND p.payment_method = $${index++}`;
        values.push(filters.payment_method);
    }
    
    if (filters.start_date && filters.end_date) {
        query += ` AND p.created_at BETWEEN $${index++} AND $${index++}`;
        values.push(filters.start_date);
        values.push(filters.end_date);
    }
    
    query += ` ORDER BY p.created_at DESC`;
    
    const res = await pool.query(query, values);
    return res.rows;
};

/**
 * Get transaction by ID
 */
exports.getTransactionById = async (sellerId, transactionId) => {
    const query = `
        SELECT 
            p.*,
            CASE WHEN p.settlement_status IN ('cancelled', 'refunded') THEN 0 ELSE p.seller_earning END as seller_earning,
            CASE WHEN p.settlement_status IN ('cancelled', 'refunded') THEN COALESCE(NULLIF(p.refund_amount, 0), p.amount, 0) ELSE p.refund_amount END as refund_amount,
            o.order_number,
            o.order_status,
            o.payment_status,
            o.payment_gateway,
            ous.full_name as customer_name,
            ous.email as customer_email,
            oas.address_line_1,
            oas.city,
            oas.state,
            oas.pincode
        FROM public.payments p
        JOIN public.orders o ON o.id = p.order_id
        LEFT JOIN public.order_user_snapshot ous ON ous.order_id = o.id
        LEFT JOIN public.order_address_snapshot oas ON oas.order_id = o.id
        WHERE p.seller_id = $1 AND p.id = $2
    `;
    
    const res = await pool.query(query, [sellerId, transactionId]);
    return res.rows[0];
};

/**
 * Get chart data for seller earnings
 */
exports.getSellerChartData = async (sellerId) => {
    // Monthly Revenue (Last 6 months)
    const monthlyQuery = `
        SELECT 
            TO_CHAR(created_at, 'Mon YYYY') as label,
            SUM(CASE WHEN settlement_status NOT IN ('cancelled', 'refunded') THEN seller_earning ELSE 0 END) as value
        FROM public.payments
        WHERE seller_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY label, date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
    `;
    
    // COD vs Online
    const methodQuery = `
        SELECT 
            payment_method as name,
            SUM(CASE WHEN settlement_status NOT IN ('cancelled', 'refunded') THEN seller_earning ELSE 0 END) as value
        FROM public.payments
        WHERE seller_id = $1
        GROUP BY payment_method
    `;
    
    // Refunds summary
    const refundQuery = `
        SELECT 
            'Refunded' as name,
            SUM(CASE WHEN settlement_status IN ('cancelled', 'refunded') THEN COALESCE(NULLIF(refund_amount, 0), amount, 0) ELSE refund_amount END) as value
        FROM public.payments
        WHERE seller_id = $1
        UNION ALL
        SELECT 
            'Earned' as name,
            SUM(CASE WHEN settlement_status NOT IN ('cancelled', 'refunded') THEN seller_earning ELSE 0 END) as value
        FROM public.payments
        WHERE seller_id = $1
    `;
    
    const [monthly, method, refund] = await Promise.all([
        pool.query(monthlyQuery, [sellerId]),
        pool.query(methodQuery, [sellerId]),
        pool.query(refundQuery, [sellerId])
    ]);
    
    return {
        monthly_revenue: monthly.rows,
        payment_methods: method.rows,
        refund_stats: refund.rows
    };
};

/**
 * Helper to record payment for an order and its sellers
 */
exports.recordOrderPayments = async (orderId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Get order details and items
        const orderRes = await client.query('SELECT * FROM public.orders WHERE id = $1', [orderId]);
        if (orderRes.rows.length === 0) throw new Error("Order not found");
        const order = orderRes.rows[0];
        
        const itemsRes = await client.query(`
            SELECT oi.line_total, p.seller_id
            FROM public.order_items oi
            JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = $1
        `, [orderId]);
        
        // 2. Group by seller
        const sellerEarnings = {};
        itemsRes.rows.forEach(item => {
            if (!sellerEarnings[item.seller_id]) {
                sellerEarnings[item.seller_id] = 0;
            }
            sellerEarnings[item.seller_id] += Number(item.line_total);
        });
        
        // 3. Create payment records for each seller
        for (const [sellerId, revenue] of Object.entries(sellerEarnings)) {
            const platformFee = revenue * 0.1; // 10% platform fee
            const sellerEarning = revenue - platformFee;
            
            // Check if already exists
            const existing = await client.query(
                'SELECT id FROM public.payments WHERE order_id = $1 AND seller_id = $2',
                [orderId, sellerId]
            );
            
            if (existing.rows.length > 0) {
                await client.query(`
                    UPDATE public.payments 
                    SET amount = $3, platform_fee = $4, seller_earning = $5, 
                        payment_method = $6, status = $7
                    WHERE id = $1
                `, [existing.rows[0].id, revenue, platformFee, sellerEarning, order.payment_method, order.payment_status === 'paid' ? 'paid' : 'pending']);
            } else {
                await client.query(`
                    INSERT INTO public.payments (
                        order_id, seller_id, amount, platform_fee, seller_earning, 
                        payment_method, status, settlement_status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    orderId, 
                    sellerId, 
                    revenue, 
                    platformFee, 
                    sellerEarning, 
                    order.payment_method, 
                    order.payment_status === 'paid' ? 'paid' : 'pending',
                    'pending'
                ]);
            }
        }
        
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Update payment status when order status changes
 */
exports.updatePaymentStatusByOrder = async (orderId, orderStatus, paymentStatus) => {
    let query = `UPDATE public.payments SET created_at = created_at`; // No-op to start the query
    const values = [orderId];
    let index = 2;
    
    if (paymentStatus) {
        query += `, status = $${index++}`;
        values.push(paymentStatus);
    }
    
    if (orderStatus) {
        if (orderStatus === 'cancelled') {
            query += `, status = 'cancelled', settlement_status = 'cancelled', seller_earning = 0, platform_fee = 0, refund_amount = CASE WHEN payment_method != 'cod' THEN amount ELSE 0 END`;
        } else if (orderStatus === 'delivered') {
            // When delivered, online payments are eligible for settlement
            // COD payments are also marked paid and eligible for settlement
            query += `, settlement_status = 'eligible', status = 'paid'`;
        } else if (orderStatus === 'returned') {
            query += `, settlement_status = 'refunded', seller_earning = 0, platform_fee = 0, refund_amount = amount`;
        }
    }
    
    query += ` WHERE order_id = $1`;
    await pool.query(query, values);
};
