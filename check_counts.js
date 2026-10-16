const pool = require('./config/database');
require('dotenv').config();

async function checkCounts() {
    try {
        const pCount = await pool.query(`SELECT count(*) FROM products`);
        const pActiveCount = await pool.query(`SELECT count(*) FROM products WHERE status = 'active'`);
        const uActiveCount = await pool.query(`SELECT count(*) FROM users WHERE status = 'active'`);
        const joinCount = await pool.query(`
            SELECT count(*) 
            FROM products p 
            INNER JOIN users u ON u.id = p.seller_id 
            WHERE p.status = 'active' AND u.status = 'active'
        `);

        console.log("Total Products:", pCount.rows[0].count);
        console.log("Active Products (status='active'):", pActiveCount.rows[0].count);
        console.log("Active Users (status='active'):", uActiveCount.rows[0].count);
        console.log("Joined Active Count:", joinCount.rows[0].count);

        const sample = await pool.query(`SELECT status FROM products LIMIT 5`);
        console.log("Sample product statuses:", sample.rows.map(r => r.status));
        
        const userSample = await pool.query(`SELECT status FROM users LIMIT 5`);
        console.log("Sample user statuses:", userSample.rows.map(r => r.status));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkCounts();
