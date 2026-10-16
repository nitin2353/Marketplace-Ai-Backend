const pool = require('../config/database');

async function test() {
    try {
        console.log("Starting stock restoration migration...");
        
        // Find all cancelled orders
        const cancelledOrdersRes = await pool.query(
            `SELECT id FROM orders WHERE order_status = 'cancelled'`
        );
        
        for (const order of cancelledOrdersRes.rows) {
            const order_id = order.id;
            const itemsRes = await pool.query(
                `SELECT * FROM order_items WHERE order_id = $1`,
                [order_id]
            );
            
            for (const item of itemsRes.rows) {
                const quantity = Number(item.quantity || 0);
                if (item.variant_id) {
                    await pool.query(
                        `UPDATE public.product_variants SET stock = stock + $1, modified_time = NOW() WHERE id = $2`,
                        [quantity, item.variant_id]
                    );
                    await pool.query(
                        `UPDATE public.products SET stock = (SELECT COALESCE(SUM(stock), 0) FROM public.product_variants WHERE product_id = $1), modified_time = NOW() WHERE id = $1`,
                        [item.product_id]
                    );
                } else {
                    await pool.query(
                        `UPDATE public.products SET stock = stock + $1, modified_time = NOW() WHERE id = $2`,
                        [quantity, item.product_id]
                    );
                }

                // Decrement sold quantity
                await pool.query(
                    `UPDATE public.products SET sold = GREATEST(0, COALESCE(sold, 0) - $1), modified_time = NOW() WHERE id = $2`,
                    [quantity, item.product_id]
                );
                
                console.log(`Restored stock for order ${order_id}, product ${item.product_id}, variant ${item.variant_id || 'none'}: quantity +${quantity}`);
            }
        }
        
        console.log("Migration complete!");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
