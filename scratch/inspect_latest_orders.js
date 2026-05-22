const pool = require('../config/database');

async function inspect() {
    try {
        console.log("=== LATEST 10 ORDERS ===");
        const orders = await pool.query(`
            SELECT o.id, o.order_number, o.total_items, o.total_quantity, o.subtotal, o.total_amount, o.order_status, o.payment_status, o.created_time, u.name as customer_name
            FROM public.orders o
            JOIN public.users u ON u.id = o.user_id
            ORDER BY o.created_time DESC
            LIMIT 10
        `);
        console.table(orders.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
