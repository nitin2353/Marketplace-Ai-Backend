
const pool = require('../config/database');

async function check() {
    try {
        const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items'`);
        console.log('ORDER ITEMS COLUMNS:', res.rows.map(r => r.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
