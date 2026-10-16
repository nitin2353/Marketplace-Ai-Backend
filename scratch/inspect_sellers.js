const pool = require('../config/database');

async function inspect() {
    try {
        // Query active sellers
        const sellersRes = await pool.query(`
            SELECT id, name, email, business_name, status
            FROM public.users
            WHERE status = 'active'
        `);
        const sellers = sellersRes.rows;
        console.log(`Active Sellers: ${sellers.length}`);

        for (const seller of sellers) {
            console.log(`\n--------------------------------------------`);
            console.log(`Seller: ${seller.name} (${seller.business_name || 'N/A'}) - ID: ${seller.id}`);

            // 1. Total Products
            const prodRes = await pool.query('SELECT COUNT(*) as count, SUM(sold) as total_sold_col FROM public.products WHERE seller_id = $1', [seller.id]);
            console.log(`Total Products in Catalog: ${prodRes.rows[0].count}`);
            console.log(`Sum of 'sold' column in products table: ${prodRes.rows[0].total_sold_col}`);

            // 2. Orders from getSellerOrders query logic
            const ordersRes = await pool.query(`
                SELECT DISTINCT o.id, o.order_number, o.subtotal, o.total_amount, o.order_status, o.payment_status, o.created_time
                FROM public.orders o
                INNER JOIN public.order_items oi ON oi.order_id = o.id
                INNER JOIN public.products p ON p.id = oi.product_id
                WHERE p.seller_id = $1
            `, [seller.id]);

            console.log(`Orders matching seller's products: ${ordersRes.rows.length}`);
            let actualRevenue = 0;
            let actualQuantitySold = 0;
            
            // Loop through each order to get specific items and sum them
            for (const order of ordersRes.rows) {
                const itemsRes = await pool.query(`
                    SELECT oi.quantity, oi.unit_price, oi.line_total, oi.product_title
                    FROM public.order_items oi
                    INNER JOIN public.products p ON p.id = oi.product_id
                    WHERE oi.order_id = $1 AND p.seller_id = $2
                `, [order.id, seller.id]);
                
                for (const item of itemsRes.rows) {
                    actualRevenue += Number(item.line_total || 0);
                    actualQuantitySold += Number(item.quantity || 0);
                }
            }

            console.log(`Revenue calculated from seller's order items: ₹${actualRevenue}`);
            console.log(`Total quantity sold from seller's order items: ${actualQuantitySold}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
