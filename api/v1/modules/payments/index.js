const express = require("express");
const router = express.Router();

const controller = require("./payment.controller");
const authMiddleware = require("../middlewares/index");

// Create Razorpay order before payment
router.post("/create-order", authMiddleware, controller.createRazorpayOrder);

// Verify payment and create final order
router.post("/verify-and-create-order", authMiddleware, controller.verifyAndCreateOrder);

// Optional: get payment details by order id
router.get("/order/:order_id", authMiddleware, controller.getPaymentByOrderId);

// Razorpay webhook
router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    controller.handleWebhook
);

module.exports = router;