const pool = require('../config/database');

async function inspect() {
    try {
        const orderId = 'd098537f-b25d-488a-a94d-8cb7d02499db';
        const res = await pool.query(`
            SELECT * FROM public.orders WHERE id = $1
        `, [orderId]);
        console.log(res.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
