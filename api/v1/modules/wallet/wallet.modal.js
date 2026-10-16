const pool = require('../../../../config/database');

// ✅ Create wallet (auto)
exports.createWalletIfNotExists = async (seller_id) => {

    const res = await pool.query(
        `SELECT * FROM wallets WHERE seller_id = $1`,
        [seller_id]
    );

    if (res.rows.length === 0) {
        await pool.query(
            `INSERT INTO wallets (seller_id) VALUES ($1)`,
            [seller_id]
        );
    }
};


// 💰 Add money to seller wallet
exports.addToWallet = async (seller_id, amount) => {

    await exports.createWalletIfNotExists(seller_id);

    await pool.query(
        `UPDATE wallets 
         SET balance = balance + $1 
         WHERE seller_id = $2`,
        [amount, seller_id]
    );
};


// 👀 Get wallet
exports.getWallet = async (seller_id) => {

    const res = await pool.query(
        `SELECT * FROM wallets WHERE seller_id = $1`,
        [seller_id]
    );

    return res.rows[0];
};


// 💸 Withdraw request
exports.requestWithdraw = async (seller_id, amount) => {

    const wallet = await exports.getWallet(seller_id);

    if (!wallet || wallet.balance < amount) {
        throw new Error("Insufficient balance");
    }

    await pool.query(
        `INSERT INTO withdrawals (seller_id, amount)
         VALUES ($1, $2)`,
        [seller_id, amount]
    );

    return { message: "Withdraw request submitted" };
};


// ✅ Approve withdraw (ADMIN)
exports.approveWithdraw = async (withdraw_id) => {

    const res = await pool.query(
        `SELECT * FROM withdrawals WHERE id = $1`,
        [withdraw_id]
    );

    const withdraw = res.rows[0];

    if (!withdraw) throw new Error("Withdraw not found");

    // 💰 Deduct from wallet
    await pool.query(
        `UPDATE wallets 
         SET balance = balance - $1 
         WHERE seller_id = $2`,
        [withdraw.amount, withdraw.seller_id]
    );

    // 🔄 Update status
    await pool.query(
        `UPDATE withdrawals 
         SET status = 'approved' 
         WHERE id = $1`,
        [withdraw_id]
    );

    return { message: "Withdraw approved" };
};