const pool = require('../config/database');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT id, order_number, subtotal, discount_amount, total_amount, payment_method, payment_status, order_status
            FROM public.orders
            ORDER BY created_time DESC
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
