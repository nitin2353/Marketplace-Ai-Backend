const pool = require('./config/database');
async function run() {
    try {
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
        console.log('Status column added');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
