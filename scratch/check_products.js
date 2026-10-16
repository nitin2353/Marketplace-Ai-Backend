
const pool = require('../config/database');

async function check() {
    try {
        const res = await pool.query(`SELECT id, title, status FROM public.products ORDER BY created_at DESC LIMIT 5`);
        console.log('PRODUCTS:', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
