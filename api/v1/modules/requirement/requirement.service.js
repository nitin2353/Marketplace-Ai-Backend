const pool = require('../../../../config/database'); // apne hisaab se path adjust kar

exports.createRequirement = async (body) => {
  const { user_id, product_type, budget, description } = body;

  const query = `
    INSERT INTO requirements (user_id, product_type, budget, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const values = [user_id, product_type, budget, description];

  const result = await pool.query(query, values);

  return result.rows[0];
};