const pool = require('./config/database');
async function run() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'notifications';
        `);
        console.table(res.rows);
    } catch(e) { console.error(e); } finally { process.exit(); }
}
run();
