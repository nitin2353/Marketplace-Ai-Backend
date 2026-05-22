const pool = require('../config/database');

async function inspect() {
    try {
        const sellerId = '9647724d-2142-47d8-b033-71a33b7298d6';
        const res = await pool.query(`
            SELECT DISTINCT o.id, o.order_number, o.subtotal, o.total_amount, o.order_status, o.payment_status, o.created_time
            FROM public.orders o
            INNER JOIN public.order_items oi ON oi.order_id = o.id
            INNER JOIN public.products p ON p.id = oi.product_id
            WHERE p.seller_id = $1
        `, [sellerId]);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
