const pool = require('./config/database');
async function run() {
    try {
        const res = await pool.query("SELECT count(*) FROM information_schema.tables WHERE table_name = 'sellers'");
        console.log(res.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
