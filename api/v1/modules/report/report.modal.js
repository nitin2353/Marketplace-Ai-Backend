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

exports.getRecentOrdersByProduct = async (productId, userId) => {
  try {
    let query = `
      SELECT
          o.id,
          o.order_number,
          o.total_amount,
          o.order_status,
          o.created_time,
          oi.quantity,
          p.seller_id AS userId,
          oi.line_total AS amount,
          ous.full_name AS buyer,
          oas.city
      FROM order_items oi
      JOIN orders o 
          ON o.id = oi.order_id
      JOIN products p 
          ON p.id = oi.product_id
      LEFT JOIN order_user_snapshot ous 
          ON ous.order_id = o.id
      LEFT JOIN order_address_snapshot oas 
          ON oas.order_id = o.id
    `;

    const values = [];
    let index = 1;
    const conditions = [];

    // ✅ product filter
    if (productId) {
      conditions.push(`oi.product_id = $${index++}`);
      values.push(productId);
    }

    // ✅ seller filter (correct field)
    if (userId) {
      conditions.push(`p.seller_id = $${index++}`);
      values.push(userId);
    }

    // ✅ apply WHERE only once
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += `
      ORDER BY o.created_time DESC
      LIMIT 12
    `;

    const result = await pool.query(query, values);

    return result.rows.map((row) => ({
      id: row.order_number || row.id,
      buyer: row.buyer || "Unknown Buyer",
      qty: Number(row.quantity || 0),
      amount: Number(row.amount || 0),
      status: row.order_status,
      date: row.created_time,
      city: row.city || "N/A",
    }));

  } catch (error) {
    console.error("getRecentOrdersByProduct model error:", error);
    throw error;
  }
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


exports.getRecentActivities = async (sellerId) => {
  try {
    const query = `
      SELECT *
      FROM (

        -- 1. New Order
        SELECT
          o.id,
          'new_order' AS type,
          'New order received' AS title,
          CONCAT(o.order_number, ' · ', oi.product_title, ' · ₹', COALESCE(oi.line_total, 0)) AS sub,
          o.created_time
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.seller_id = $1

        UNION ALL

        -- 2. New 5-star review
        SELECT
          r.id,
          'review_received' AS type,
          'New 5-star review' AS title,
          CONCAT(
            COALESCE(oi.product_title, 'Product'),
            ' · ''',
            COALESCE(r.comment, 'Excellent quality!'),
            ''''
          ) AS sub,
          r.created_at AS created_time
        FROM reviews r
        JOIN order_items oi ON oi.order_id = r.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.seller_id = $1
          AND r.rating = 5

        UNION ALL

        -- 3. Low stock
        SELECT
          p.id,
          'low_stock' AS type,
          'Low stock alert' AS title,
          CONCAT(p.title, ' · only ', p.stock, ' left') AS sub,
          COALESCE(p.modified_time, p.created_at) AS created_time
        FROM products p
        WHERE p.seller_id = $1
          AND p.stock <= 5
          AND COALESCE(p.status, true) = true

        UNION ALL

        -- 4. Return / Returned order
        SELECT
          o.id,
          'return_request' AS type,
          'Return request' AS title,
          CONCAT(o.order_number, ' · ', oi.product_title) AS sub,
          o.modified_time AS created_time
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.seller_id = $1
          AND o.order_status IN ('return_requested', 'returned')

        UNION ALL

        -- 5. Product published
        SELECT
          p.id,
          'product_published' AS type,
          'Product published' AS title,
          CONCAT(p.title, ' · now live') AS sub,
          p.created_at AS created_time
        FROM products p
        WHERE p.seller_id = $1
          AND COALESCE(p.status, true) = true

        UNION ALL

        -- 6. Payment / payout processed
        SELECT
          pay.id,
          'payout_processed' AS type,
          'Payout processed' AS title,
          CONCAT('₹', COALESCE(pay.seller_amount, pay.amount, 0), ' credited') AS sub,
          pay.created_at AS created_time
        FROM payments pay
        JOIN orders o ON o.id = pay.order_id
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        WHERE p.seller_id = $1
          AND pay.status IN ('released', 'paid')

        UNION ALL

        -- 7. Product trending (derived from sold count)
        SELECT
          p.id,
          'product_trending' AS type,
          'Product trending' AS title,
          CONCAT(
            p.title,
            ' · Top seller in ',
            COALESCE(p.category, 'Category')
          ) AS sub,
          COALESCE(p.modified_time, p.created_at) AS created_time
        FROM products p
        WHERE p.seller_id = $1
          AND COALESCE(p.sold, 0) >= 10

      ) AS activities
      ORDER BY created_time DESC
      LIMIT 10;
    `;

    const result = await pool.query(query, [sellerId]);
    return result.rows;
  } catch (error) {
    console.error("getRecentActivities model error:", error);
    throw error;
  }
};