const pool = require('../config/database');

async function test() {
    try {
        const query = `
            SELECT o.id, o.order_status, COUNT(oi.id) as items_count
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.order_status = 'cancelled'
            GROUP BY o.id;
        `;
        const res = await pool.query(query);
        console.log("Cancelled orders with items:");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
