const paymentService = require("./payment.modal");

exports.createRazorpayOrder = async (req, res) => {
    try {

        const {
            address_id,
            payment_method,
            coupon_code = null,
            discount_percentage = 0,
            delivery_charge = 0,
            subtotal_amount = 0,
            notes = null
        } = req.body;


        const user_id = req.user?.id || req.body.user_id;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }

        if (!address_id) {
            return res.status(400).json({
                success: false,
                message: "address_id is required"
            });
        }

        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: "payment_method is required"
            });
        }

        const allowedPaymentMethods = ["upi", "card", "netbanking", "wallet", "cod"];
        if (!allowedPaymentMethods.includes(payment_method)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method"
            });
        }

        const data = await paymentService.createRazorpayOrder({
            user_id,
            address_id,
            payment_method,
            coupon_code,
            delivery_charge,
            subtotal_amount,
            discount_percentage,
            discount_amount: subtotal_amount * discount_percentage / 100,
            notes
        });

        return res.status(200).json({
            success: true,
            message: "Razorpay order created successfully",
            data
        });
    } catch (error) {
        console.error("CREATE RAZORPAY ORDER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

exports.verifyAndCreateOrder = async (req, res) => {
    try {
        const {
            address_id,
            payment_method,
            payment_id,
            payment_order_id,
            payment_signature,
            coupon_code = null,
            discount_percentage = 0,
            discount_amount = 0,
            subtotal_amount = 0,
            total_amount = 0,
            delivery_charge = 0,
            notes = null
        } = req.body;

        const user_id = req.user?.id || req.body.user_id;
        const created_by = req.user?.id || req.body.created_by || null;
        const modified_by = req.user?.id || req.body.modified_by || null;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }

        if (!address_id) {
            return res.status(400).json({
                success: false,
                message: "address_id is required"
            });
        }

        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: "payment_method is required"
            });
        }

        if (!payment_id || !payment_order_id || !payment_signature) {
            return res.status(400).json({
                success: false,
                message: "payment_id, payment_order_id and payment_signature are required"
            });
        }

        const data = await paymentService.verifyAndCreateOrder({
            user_id,
            address_id,
            payment_method,
            payment_id,
            payment_order_id,
            payment_signature,
            coupon_code,
            discount_percentage,
            discount_amount,
            subtotal_amount,
            total_amount,
            delivery_charge,
            notes,
            created_by,
            modified_by
        });

        return res.status(201).json({
            success: true,
            message: "Payment verified and order created successfully",
            data
        });
    } catch (error) {
        console.error("VERIFY AND CREATE ORDER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

exports.getPaymentByOrderId = async (req, res) => {
    try {
        const { order_id } = req.params;

        const data = await paymentService.getPaymentByOrderId(order_id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Payment details not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment details fetched successfully",
            data
        });
    } catch (error) {
        console.error("GET PAYMENT BY ORDER ID ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

exports.handleWebhook = async (req, res) => {
    try {
        const signature = req.headers["x-razorpay-signature"];

        const data = await paymentService.handleWebhook({
            rawBody: req.body,
            signature
        });

        return res.status(200).json({
            success: true,
            message: "Webhook handled successfully",
            data
        });
    } catch (error) {
        console.error("WEBHOOK ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};