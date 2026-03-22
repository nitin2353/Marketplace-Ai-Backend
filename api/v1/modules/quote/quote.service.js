const pool = require('../../../../config/database'); // apna DB path check kar lena

// Create Quote
exports.createQuote = async (body) => {
  const { requirement_id, seller_id, price, delivery_time, note } = body;

  const query = `
    INSERT INTO quotes (requirement_id, seller_id, price, delivery_time, note)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [requirement_id, seller_id, price, delivery_time, note];

  const result = await pool.query(query, values);

  return result.rows[0];
};

exports.getQuotesByRequirement = async (requirementId) => {

  const query = `
    SELECT q.*, s.rating, u.name AS seller_name
    FROM quotes q
    JOIN sellers s ON q.seller_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE q.requirement_id = $1
    ORDER BY q.created_at DESC;
  `;

  const result = await pool.query(query, [requirementId]);

  return result.rows;
};