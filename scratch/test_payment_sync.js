const pool = require('../config/database');
const orderService = require('../api/v1/modules/orders/order.modal');
const sellerPaymentModal = require('../api/v1/modules/payments/seller_payment.modal');

async function test() {
    try {
        // 1. Find a recent order
        const orderRes = await pool.query(`
            SELECT o.id, o.order_number, o.order_status, p.status as payment_rec_status, p.settlement_status
            FROM public.orders o
            JOIN public.payments p ON p.order_id = o.id
            ORDER BY o.created_time DESC
            LIMIT 1
        `);

        if (orderRes.rows.length === 0) {
            console.log("No orders found to test.");
            return;
        }

        const order = orderRes.rows[0];
        console.log("Testing with order:", order.order_number);
        console.log("Current Status - Order:", order.order_status, "| Payment Rec:", order.payment_rec_status, "| Settlement:", order.settlement_status);

        // 2. Update status to 'delivered'
        console.log("Updating order to 'delivered'...");
        await orderService.updateOrderStatus(order.id, 'delivered');

        // 3. Verify payment update
        const updatedRes = await pool.query(`
            SELECT o.order_status, p.status as payment_rec_status, p.settlement_status
            FROM public.orders o
            JOIN public.payments p ON p.order_id = o.id
            WHERE o.id = $1
        `, [order.id]);

        const updated = updatedRes.rows[0];
        console.log("New Status - Order:", updated.order_status, "| Payment Rec:", updated.payment_rec_status, "| Settlement:", updated.settlement_status);

        if (updated.settlement_status === 'eligible') {
            console.log("✅ Auto-update verified: Payment marked as eligible!");
        } else {
            console.log("❌ Auto-update failed: Settlement status still", updated.settlement_status);
        }

        // 4. Test Cancellation
        console.log("\nTesting Cancellation...");
        await orderService.cancelOrder(order.id);
        
        const cancelledRes = await pool.query(`
            SELECT o.order_status, p.status as payment_rec_status, p.settlement_status
            FROM public.orders o
            JOIN public.payments p ON p.order_id = o.id
            WHERE o.id = $1
        `, [order.id]);

        const cancelled = cancelledRes.rows[0];
        console.log("Cancelled Status - Order:", cancelled.order_status, "| Payment Rec:", cancelled.payment_rec_status, "| Settlement:", cancelled.settlement_status);

        if (cancelled.settlement_status === 'cancelled') {
            console.log("✅ Cancellation sync verified!");
        } else {
            console.log("❌ Cancellation sync failed!");
        }

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        process.exit();
    }
}

test();
