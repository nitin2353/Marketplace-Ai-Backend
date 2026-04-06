const razorpayService = require('./razorpay.modal');
const crypto = require('crypto');
const paymentService = require('../payments/payment.modal');

exports.createRazorpayOrder = async (req, res) => {
    try {
        const { order_id, amount } = req.body;

        const razorpayOrder = await razorpayService.createOrder({
            order_id,
            amount
        });

        res.json({
            success: true,
            data: razorpayOrder
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};


exports.verifyPayment = async (req, res) => {
    try {
        const isValid = await razorpayService.verifyPayment(req.body);

        if (isValid) {

            // 💰 Save payment in DB
            const { order_id, amount, method } = req.body;

            const payment = await paymentService.createPayment({
                order_id,
                amount,
                method: method || "razorpay"
            });

            res.json({
                success: true,
                data: payment
            });
        }

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};


exports.handleWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        const signature = req.headers['x-razorpay-signature'];

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(req.rawBody)
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.status(400).json({
                success: false,
                message: "Invalid signature"
            });
        }

        const event = req.body;


        // 🎯 ONLY handle successful payments
        if (event.event === "payment.captured") {

            const paymentEntity = event.payload.payment.entity;

            const order_id = paymentEntity.notes.order_id;
            const amount = paymentEntity.amount / 100;

            // 🔥 Duplicate check
            const existing = await db.query(
                `SELECT * FROM payments WHERE order_id = $1`,
                [order_id]
            );

            if (existing.rows.length > 0) {
                console.log("⚠️ Payment already processed");
                return res.json({ status: "already processed" });
            }

            // 💰 Commission logic
            const platform_fee = amount * 0.1;
            const seller_amount = amount - platform_fee;

            // 💾 Save payment
            await db.query(
                `INSERT INTO payments 
                (order_id, amount, payment_method, platform_fee, seller_amount, status)
                VALUES ($1, $2, $3, $4, $5, 'paid')`,
                [order_id, amount, "razorpay", platform_fee, seller_amount]
            );

            // 📦 Update order
            await db.query(
                `UPDATE orders SET status = 'confirmed' WHERE id = $1`,
                [order_id]
            );

        }

        res.json({ status: "ok" });

    } catch (err) {
        console.error("Webhook Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};