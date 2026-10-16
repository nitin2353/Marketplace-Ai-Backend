const pool = require('../config/database');

async function test() {
    try {
        const query = `
            SELECT id, order_status, payment_status, payment_method, modified_time
            FROM orders
            WHERE id IN ('098bb34f-a438-46e0-91a4-0994839dba6a', 'bcb09480-1bb9-4b19-a828-4f0f42c91f55');
        `;
        const res = await pool.query(query);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
