const pool = require("../config/database");

async function checkPayments() {
    try {
        const res = await pool.query("SELECT payment_method, payment_status FROM public.payments LIMIT 10");
        console.log("Payments Sample:", res.rows);
        
        const resOrders = await pool.query("SELECT payment_method, payment_status, payment_gateway FROM public.orders LIMIT 10");
        console.log("Orders Sample:", resOrders.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkPayments();
