const orderService = require('./order.modal');

exports.createOrder = async (req, res) => {
    try {
        const { quote_id, user_id } = req.body;

        const data = await orderService.createOrder({ quote_id, user_id });

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};


exports.getCustomerOrders = async (req, res) => {
    try {
        const data = await orderService.getCustomerOrders(req.params.user_id);

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.getSellerOrders = async (req, res) => {
    try {
        const data = await orderService.getSellerOrders(req.params.seller_id);

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.updateOrderStatus = async (req, res) => {
    try {
        const { order_id, status } = req.body;

        await orderService.updateStatus(order_id, status);

        res.json({
            success: true,
            message: "Order status updated"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};