const pool = require('../config/database');

async function test() {
    try {
        const productId = 'eded115a-4c1b-4a82-80cc-e06852db373f';
        console.log("Checking orders for product:", productId);
        
        const ordersQuery = `
            SELECT o.id, o.order_status, oi.quantity, oi.variant_id
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE oi.product_id = $1;
        `;
        const res = await pool.query(ordersQuery, [productId]);
        console.log("All orders for this product:");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
