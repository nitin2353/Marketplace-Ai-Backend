const pool = require('../config/database');

async function inspect() {
    try {
        const orderId = 'd098537f-b25d-488a-a94d-8cb7d02499db';
        const res = await pool.query(`
            SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.line_total, p.title, p.seller_id
            FROM public.order_items oi
            JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = $1
        `, [orderId]);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
