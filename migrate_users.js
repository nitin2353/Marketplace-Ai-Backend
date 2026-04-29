const pool = require('./config/database');
async function run() {
    const queries = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS business_type VARCHAR(50)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS gstin VARCHAR(15)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS pan VARCHAR(10)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS store_description TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line_1 VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder VARCHAR(100)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number VARCHAR(50)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS ifsc VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'"
    ];

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const q of queries) {
            console.log(`Executing: ${q}`);
            await client.query(q);
        }
        await client.query("COMMIT");
        console.log("Database migration successful!");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Migration failed:", e);
    } finally {
        client.release();
        process.exit(0);
    }
}
run();
