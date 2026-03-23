const pool = require('../../../../config/database');

exports.createOrder = async ({ quote_id, user_id }) => {

    const quoteRes = await pool.query(
        `SELECT * FROM quotes WHERE id = $1`,
        [quote_id]
    );

    if (quoteRes.rows.length === 0) {
        throw new Error("Quote not found");
    }

    const quote = quoteRes.rows[0];

    if (quote.status === 'accepted') {
        throw new Error("Order already created for this quote");
    }

    const orderRes = await pool.query(
        `INSERT INTO orders 
        (user_id, seller_id, requirement_id, quote_id, total_amount)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
            user_id,
            quote.seller_id,
            quote.requirement_id,
            quote.id,
            quote.price
        ]
    );

    // ✅ Accept selected quote
    await pool.query(
        `UPDATE quotes SET status = 'accepted' WHERE id = $1`,
        [quote_id]
    );

    // ❌ Reject others
    await pool.query(
        `UPDATE quotes 
         SET status = 'rejected' 
         WHERE requirement_id = $1 AND id != $2`,
        [quote.requirement_id, quote_id]
    );

    return orderRes.rows[0];
};


exports.getCustomerOrders = async (user_id) => {
    const res = await pool.query(
        `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
        [user_id]
    );
    return res.rows;
};


exports.getSellerOrders = async (seller_id) => {
    const res = await pool.query(
        `SELECT * FROM orders WHERE seller_id = $1 ORDER BY created_at DESC`,
        [seller_id]
    );
    return res.rows;
};


exports.updateStatus = async (order_id, status) => {
    await pool.query(
        `UPDATE orders SET status = $1 WHERE id = $2`,
        [status, order_id]
    );
};