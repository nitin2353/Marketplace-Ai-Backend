const sellerPaymentModal = require("./seller_payment.modal");

/**
 * GET /api/v1/payments/seller/summary
 */
exports.getSummary = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const data = await sellerPaymentModal.getSellerSummary(sellerId);
        res.json({
            success: true,
            data
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * GET /api/v1/payments/seller/transactions
 */
exports.getTransactions = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const filters = {
            status: req.query.status,
            settlement_status: req.query.settlement_status,
            payment_method: req.query.payment_method,
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };
        const data = await sellerPaymentModal.getSellerTransactions(sellerId, filters);
        res.json({
            success: true,
            data
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * GET /api/v1/payments/seller/:id
 */
exports.getTransactionDetail = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const transactionId = req.params.id;
        const data = await sellerPaymentModal.getTransactionById(sellerId, transactionId);
        
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }
        
        res.json({
            success: true,
            data
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * GET /api/v1/payments/seller/chart-data
 */
exports.getChartData = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const data = await sellerPaymentModal.getSellerChartData(sellerId);
        res.json({
            success: true,
            data
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
