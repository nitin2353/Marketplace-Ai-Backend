const pool = require('../config/database');
async function check() {
    const seller_id = '4472b571-468c-4901-9aef-211b8ab3dcb3';
    
    const productsRes = await pool.query('SELECT id, title FROM public.products WHERE seller_id = $1', [seller_id]);
    console.log(`Seller has ${productsRes.rows.length} products.`);
    
    if (productsRes.rows.length > 0) {
        const productIds = productsRes.rows.map(p => p.id);
        const ordersRes = await pool.query(`
            SELECT DISTINCT o.id, o.order_number, o.total_amount, o.payment_status, o.order_status
            FROM public.orders o
            JOIN public.order_items oi ON oi.order_id = o.id
            WHERE oi.product_id = ANY($1)
        `, [productIds]);
        console.log(`Seller has ${ordersRes.rows.length} orders.`);
        console.table(ordersRes.rows);
    }
    process.exit();
}
check();
