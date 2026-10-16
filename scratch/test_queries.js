require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const sellerId = '4472b571-468c-4901-9aef-211b8ab3dcb3';

  const financialQuery = `
    WITH ValidItems AS (
      SELECT
        oi.id AS item_id,
        o.id AS order_id,
        oi.line_total,
        oi.quantity,
        o.payment_method,
        o.payment_status,
        o.order_status,
        pay.seller_earning,
        pay.seller_amount,
        pay.platform_fee,
        pay.refund_amount,
        pay.settlement_status,
        -- check if valid for revenue/sold
        CASE 
          WHEN o.order_status NOT IN ('cancelled', 'failed', 'returned', 'refunded')
               AND (
                 (o.payment_method != 'cod' AND o.payment_status = 'paid') 
                 OR 
                 (o.payment_method = 'cod' AND o.order_status IN ('confirmed', 'shipped', 'delivered', 'completed'))
               )
          THEN 1 ELSE 0 END AS is_valid_revenue,
          
        -- pending logic
        CASE
          WHEN o.order_status NOT IN ('cancelled', 'failed', 'returned', 'refunded')
               AND (
                 (o.payment_method = 'cod' AND o.order_status NOT IN ('delivered', 'completed'))
                 OR (o.payment_method != 'cod' AND o.payment_status != 'paid')
                 OR (pay.settlement_status = 'pending')
               )
          THEN 1 ELSE 0 END AS is_pending
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN public.products p ON p.id = oi.product_id
      LEFT JOIN public.payments pay ON pay.order_id = o.id AND pay.seller_id = p.seller_id
      WHERE p.seller_id = $1
    )
    SELECT
      SUM(CASE WHEN is_valid_revenue = 1 THEN line_total ELSE 0 END) AS total_revenue,
      SUM(CASE WHEN is_valid_revenue = 1 THEN quantity ELSE 0 END) AS total_units_sold,
      COUNT(DISTINCT CASE WHEN order_status NOT IN ('cancelled', 'failed') THEN order_id END) AS total_orders,
      
      -- seller earnings
      SUM(CASE 
        WHEN is_valid_revenue = 1 THEN 
          COALESCE(seller_earning, seller_amount, line_total - COALESCE(platform_fee, line_total * 0.1))
        ELSE 0 END
      ) AS seller_earnings,
      
      -- available balance
      SUM(CASE 
        WHEN is_valid_revenue = 1 AND is_pending = 0 THEN 
          COALESCE(seller_earning, seller_amount, line_total - COALESCE(platform_fee, line_total * 0.1))
        ELSE 0 END
      ) AS available_balance,
      
      -- pending balance
      SUM(CASE 
        WHEN is_pending = 1 AND order_status NOT IN ('cancelled', 'failed', 'returned', 'refunded') THEN 
          COALESCE(seller_earning, seller_amount, line_total - COALESCE(platform_fee, line_total * 0.1))
        ELSE 0 END
      ) AS pending_balance,
      
      -- refunded amount
      SUM(COALESCE(refund_amount, CASE WHEN order_status IN ('cancelled', 'returned', 'refunded') THEN line_total ELSE 0 END)) AS refunded_amount

    FROM ValidItems;
  `;

  const res = await pool.query(financialQuery, [sellerId]);
  console.log("Financials:", res.rows[0]);

  process.exit(0);
}
run().catch(console.error);
