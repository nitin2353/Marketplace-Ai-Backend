const walletService = require('./wallet.modal');

exports.getWallet = async (req, res) => {
    try {
        const data = await walletService.getWallet(req.params.seller_id);

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.withdraw = async (req, res) => {
    try {
        const { seller_id, amount } = req.body;

        const result = await walletService.requestWithdraw(seller_id, amount);

        res.json({ success: true, data: result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.approveWithdraw = async (req, res) => {
    try {
        const { withdraw_id } = req.body;

        const result = await walletService.approveWithdraw(withdraw_id);

        res.json({ success: true, data: result });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};