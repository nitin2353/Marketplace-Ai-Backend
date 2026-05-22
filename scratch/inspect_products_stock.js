const pool = require('../config/database');

async function test() {
    try {
        const query = `
            SELECT 
                p.id, 
                p.title, 
                p.stock AS main_stock,
                (SELECT COALESCE(SUM(stock), 0) FROM public.product_variants WHERE product_id = p.id) AS variant_stock_sum,
                p.sold AS main_sold,
                (
                    SELECT COALESCE(SUM(oi.quantity), 0)
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = p.id AND o.order_status NOT IN ('cancelled', 'payment_failed')
                ) AS actual_sold
            FROM public.products p
            ORDER BY p.title;
        `;
        const res = await pool.query(query);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
