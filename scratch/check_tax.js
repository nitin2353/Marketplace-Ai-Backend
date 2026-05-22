const pool = require('../config/database');

async function run() {
    try {
        const res = await pool.query('SELECT id, title, tax_percentage FROM products LIMIT 5');
        console.log("Products tax info:", res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
