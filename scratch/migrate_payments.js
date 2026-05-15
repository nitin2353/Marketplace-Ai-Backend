const pool = require('../config/database');
const sellerPaymentModal = require('../api/v1/modules/payments/seller_payment.modal');

async function migrate() {
    console.log("Starting payment migration...");
    try {
        const ordersRes = await pool.query('SELECT id FROM public.orders');
        console.log(`Found ${ordersRes.rows.length} orders.`);
        
        for (const order of ordersRes.rows) {
            process.stdout.write(`Processing order ${order.id}... `);
            await sellerPaymentModal.recordOrderPayments(order.id);
            process.stdout.write(`Done\n`);
        }
        
        console.log("Migration completed successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}

migrate();
