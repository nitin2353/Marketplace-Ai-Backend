const pool = require('../config/database');

async function checkSchema() {
    const tables = ['payments', 'orders'];
    for (const table of tables) {
        console.log(`\n--- Schema for table: ${table} ---`);
        try {
            const res = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table]);
            res.rows.forEach(row => {
                console.log(`${row.column_name.padEnd(25)} | ${row.data_type.padEnd(20)} | ${row.is_nullable.padEnd(5)} | ${row.column_default}`);
            });
        } catch (e) {
            console.error(`Error checking schema for ${table}:`, e.message);
        }
    }
    process.exit();
}

checkSchema();
