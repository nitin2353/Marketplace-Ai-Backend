const pool = require('../config/database');

async function inspect() {
    try {
        const sellerId = '9647724d-2142-47d8-b033-71a33b7298d6';
        const res = await pool.query(`
            SELECT oi.order_id, oi.product_id, oi.quantity, oi.unit_price, oi.line_total, p.title, o.order_number, o.subtotal, o.total_amount, o.order_status, o.payment_status
            FROM public.order_items oi
            JOIN public.products p ON p.id = oi.product_id
            JOIN public.orders o ON o.id = oi.order_id
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
