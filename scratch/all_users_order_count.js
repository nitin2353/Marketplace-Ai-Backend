const pool = require('../config/database');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT u.id, u.name, u.email, u.status, u.role, COUNT(DISTINCT o.id) as order_count
            FROM public.users u
            LEFT JOIN public.products p ON p.seller_id = u.id
            LEFT JOIN public.order_items oi ON oi.product_id = p.id
            LEFT JOIN public.orders o ON o.id = oi.order_id
            GROUP BY u.id, u.name, u.email, u.status, u.role
            ORDER BY order_count DESC
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
