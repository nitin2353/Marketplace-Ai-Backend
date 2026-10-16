
const pool = require('../config/database');

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'status'
        `);
        console.log('COLUMN INFO:', res.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
