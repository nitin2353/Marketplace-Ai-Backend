const pool = require("../config/database");

async function checkSchema() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'payments'");
        console.log("Payments columns:", res.rows.map(r => r.column_name));
        
        const resOrders = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'");
        console.log("Orders columns:", resOrders.rows.map(r => r.column_name));

        const sample = await pool.query("SELECT * FROM payments LIMIT 5");
        console.log("Payments sample:", sample.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
