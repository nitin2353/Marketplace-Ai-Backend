const pool = require('../../../../config/database');
const walletService = require('../wallet/wallet.modal');


exports.createPayment = async ({ order_id, amount, method }) => {

    const orderRes = await pool.query(
        `SELECT * FROM orders WHERE id = $1`,
        [order_id]
    );

    if (orderRes.rows.length === 0) {
        throw new Error("Order not found");
    }

    // 💰 Commission logic
    const platform_fee = amount * 0.1; // 10%
    const seller_amount = amount - platform_fee;

    const paymentRes = await pool.query(
        `INSERT INTO payments 
        (order_id, amount, payment_method, platform_fee, seller_amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [order_id, amount, method, platform_fee, seller_amount]
    );

    await pool.query(
        `UPDATE orders SET status = 'confirmed' WHERE id = $1`,
        [order_id]
    );

    return paymentRes.rows[0];
};


exports.releasePayment = async (order_id) => {

    const paymentRes = await db.query(
        `SELECT * FROM payments WHERE order_id = $1`,
        [order_id]
    );

    const payment = paymentRes.rows[0];

    // 💰 Add to seller wallet
    await walletService.addToWallet(payment.seller_id, payment.seller_amount);

    await db.query(
        `UPDATE payments SET status = 'released' WHERE order_id = $1`,
        [order_id]
    );

    await db.query(
        `UPDATE orders SET status = 'completed' WHERE id = $1`,
        [order_id]
    );

    return {
        seller_gets: payment.seller_amount
    };
};


exports.getPayments = async (order_id) => {
    const res = await pool.query(
        `SELECT * FROM payments WHERE order_id = $1`,
        [order_id]
    );
    return res.rows;
};