const pool = require('../config/database');
const { getSellerOrders } = require('../api/v1/modules/orders/order.modal');

async function inspect() {
    try {
        const sellerId = '4472b571-468c-4901-9aef-211b8ab3dcb3';
        const productId = '49526e45-a4cb-43a7-912e-4280966771af';
        console.log("=== getSellerOrders model result ===");
        const orders = await getSellerOrders(sellerId);
        
        let calculatedSold = 0;
        let calculatedRevenue = 0;

        orders.forEach(order => {
            if (order.order_status === 'cancelled' || order.order_status === 'payment_failed') {
                return;
            }
            const items = Array.isArray(order.items) ? order.items : [];
            items.forEach(item => {
                if (String(item.product_id) === String(productId)) {
                    const qty = Number(item.quantity || 0);
                    const itemRev = Number(item.line_total || (qty * Number(item.price || 0)));
                    calculatedSold += qty;
                    calculatedRevenue += itemRev;
                    console.log(`Order ${order.id}: qty=${qty}, line_total=${item.line_total}, price=${item.unit_price || item.price}, status=${order.order_status}`);
                }
            });
        });

        console.log(`Computed Sold: ${calculatedSold}`);
        console.log(`Computed Revenue: ${calculatedRevenue}`);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
