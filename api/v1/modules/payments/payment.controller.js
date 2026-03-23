const paymentService = require('./payment.service');

exports.createPayment = async (req, res) => {
    try {
        const { order_id, amount, method } = req.body;

        const data = await paymentService.createPayment({
            order_id,
            amount,
            method
        });

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};


exports.releasePayment = async (req, res) => {
    try {
        const { order_id } = req.body;

        const result = await paymentService.releasePayment(order_id);

        res.json({ success: true, data: result });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};


exports.getPayments = async (req, res) => {
    try {
        const data = await paymentService.getPayments(req.params.order_id);

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};