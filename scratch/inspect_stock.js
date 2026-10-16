const pool = require('./config/db');

async function test() {
    try {
        const { rows: products } = await pool.query('SELECT id, title, stock FROM products LIMIT 5');
        console.log("Products:");
        console.table(products);

        const { rows: orders } = await pool.query('SELECT id, order_status, total_amount FROM orders LIMIT 5');
        console.log("Orders:");
        console.table(orders);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();
