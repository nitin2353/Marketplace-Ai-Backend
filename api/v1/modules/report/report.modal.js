const pool = require('../../../../config/database');


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

exports.getSellerSummary = async (sellerId) => {
  const summaryQuery = `
    SELECT
      COALESCE(COUNT(DISTINCT p.id), 0) AS total_products,
      COALESCE(SUM(p.sold), 0) AS total_units_sold,
      COALESCE(SUM(p.base_price * p.sold), 0) AS estimated_revenue,
      COALESCE(AVG(p.rating), 0) AS avg_rating,
      COALESCE(SUM(p.reviews), 0) AS total_reviews
    FROM products p
    WHERE p.seller_id = $1
      AND COALESCE(p.status, true) = true;
  `;

  const ordersQuery = `
    SELECT
      COALESCE(COUNT(o.id), 0) AS total_orders,
      COALESCE(SUM(o.total_amount), 0) AS total_order_amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE p.seller_id = $1;
  `;

  const paymentQuery = `
    SELECT
      COALESCE(SUM(pay.amount), 0) AS total_payment_received,
      COALESCE(SUM(pay.platform_fee), 0) AS total_platform_fee,
      COALESCE(SUM(pay.seller_amount), 0) AS total_seller_amount
    FROM payments pay
    JOIN orders o ON o.id = pay.order_id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE p.seller_id = $1
      AND pay.status = 'released';
  `;

  const [summaryRes, ordersRes, paymentRes] = await Promise.all([
    pool.query(summaryQuery, [sellerId]),
    pool.query(ordersQuery, [sellerId]),
    pool.query(paymentQuery, [sellerId]),
  ]);

  return {
    ...summaryRes.rows[0],
    ...ordersRes.rows[0],
    ...paymentRes.rows[0],
  };
};

exports.getWeeklyUnitsSold = async (productId) => {
  const query = `
    SELECT
      TO_CHAR(o.created_time, 'Dy') AS day,
      COALESCE(SUM(oi.quantity), 0) AS units
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = $1
      AND o.created_time >= NOW() - INTERVAL '7 days'
      AND o.order_status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed')
    GROUP BY TO_CHAR(o.created_time, 'Dy'), EXTRACT(DOW FROM o.created_time)
    ORDER BY EXTRACT(DOW FROM o.created_time);
  `;

  const result = await pool.query(query, [productId]);

  const map = {};
  result.rows.forEach((row) => {
    const day = row.day.trim();
    map[day] = Number(row.units);
  });

  return DAYS.map((day) => ({
    day,
    units: map[day] || 0,
  }));
};

exports.getMonthlySales = async (productId) => {
  const query = `
    SELECT
      EXTRACT(MONTH FROM o.created_time) AS month_num,
      TO_CHAR(o.created_time, 'Mon') AS month,
      COALESCE(SUM(oi.quantity), 0) AS units,
      COALESCE(SUM(oi.line_total), 0) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = $1
      AND o.created_time >= NOW() - INTERVAL '12 months'
      AND o.order_status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed')
    GROUP BY EXTRACT(MONTH FROM o.created_time), TO_CHAR(o.created_time, 'Mon')
    ORDER BY EXTRACT(MONTH FROM o.created_time);
  `;

  const result = await pool.query(query, [productId]);

  const map = {};
  result.rows.forEach((row) => {
    const month = row.month.trim();
    map[month] = {
      month,
      units: Number(row.units),
      revenue: Number(row.revenue),
    };
  });

  return MONTHS.map((month) => ({
    month,
    units: map[month]?.units || 0,
    revenue: map[month]?.revenue || 0,
  }));
};

exports.getOrderStatusMix = async (sellerId) => {
  const query = `
    SELECT
      o.order_status AS name,
      COUNT(DISTINCT o.id) AS value
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE p.seller_id = $1
    GROUP BY o.order_status
    ORDER BY COUNT(DISTINCT o.id) DESC;
  `;

  const result = await pool.query(query, [sellerId]);

  return result.rows.map((row) => ({
    name: row.name,
    value: Number(row.value),
  }));
};

exports.getRecentOrdersByProduct = async (productId) => {
  const query = `
    SELECT
      o.id,
      o.order_number,
      o.total_amount,
      o.order_status,
      o.created_time,
      oi.quantity,
      oi.line_total AS amount,
      ous.full_name AS buyer,
      oas.city
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN order_user_snapshot ous ON ous.order_id = o.id
    LEFT JOIN order_address_snapshot oas ON oas.order_id = o.id
    WHERE oi.product_id = $1
    ORDER BY o.created_time DESC
    LIMIT 12;
  `;

  const result = await pool.query(query, [productId]);

  return result.rows.map((row) => ({
    id: row.order_number || row.id,
    buyer: row.buyer || 'Unknown Buyer',
    qty: Number(row.quantity),
    amount: Number(row.amount || 0),
    status: row.order_status,
    date: row.created_time,
    city: row.city || 'N/A',
  }));
};

exports.getRatingBreakdown = async (productId) => {
  const query = `
    SELECT
      rating,
      COUNT(*) AS count
    FROM reviews
    WHERE product_id = $1
    GROUP BY rating
    ORDER BY rating DESC;
  `;

  const avgQuery = `
    SELECT
      COALESCE(AVG(rating), 0) AS avg_rating,
      COALESCE(COUNT(*), 0) AS total_reviews
    FROM reviews
    WHERE product_id = $1;
  `;

  const [breakdownRes, avgRes] = await Promise.all([
    pool.query(query, [productId]),
    pool.query(avgQuery, [productId]),
  ]);

  const totalReviews = Number(avgRes.rows[0].total_reviews || 0);
  const avgRating = Number(avgRes.rows[0].avg_rating || 0);

  const countMap = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  breakdownRes.rows.forEach((row) => {
    countMap[row.rating] = Number(row.count);
  });

  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: countMap[star],
    pct: totalReviews > 0 ? Math.round((countMap[star] / totalReviews) * 100) : 0,
  }));

  return {
    avg_rating: avgRating,
    total_reviews: totalReviews,
    breakdown,
  };
};