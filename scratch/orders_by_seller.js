const pool = require('../config/database');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT p.seller_id, u.name, u.email, COUNT(DISTINCT o.id) as order_count
            FROM public.orders o
            JOIN public.order_items oi ON oi.order_id = o.id
            JOIN public.products p ON p.id = oi.product_id
            JOIN public.users u ON u.id = p.seller_id
            GROUP BY p.seller_id, u.name, u.email
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
