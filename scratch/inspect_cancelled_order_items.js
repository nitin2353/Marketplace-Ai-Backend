const pool = require('../config/database');

async function test() {
    try {
        const query = `
            SELECT oi.order_id, oi.product_id, p.title as product_title, oi.variant_id, oi.quantity, p.stock as current_product_stock, pv.stock as current_variant_stock
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            LEFT JOIN product_variants pv ON pv.id = oi.variant_id
            WHERE oi.order_id IN ('098bb34f-a438-46e0-91a4-0994839dba6a', 'bcb09480-1bb9-4b19-a828-4f0f42c91f55');
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
