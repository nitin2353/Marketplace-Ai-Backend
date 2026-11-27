const express = require("express");
const router = express.Router();

const controller = require("./payment.controller");
const sellerController = require("./seller_payment.controller");
const authMiddleware = require("../middlewares/index");

// Create Razorpay order before payment
router.post("/create-order", authMiddleware, controller.createRazorpayOrder);

// Verify payment and create final order
router.post("/verify-and-create-order", authMiddleware, controller.verifyAndCreateOrder);

// Seller Payments
router.get("/seller/summary", authMiddleware, sellerController.getSummary);
router.get("/seller/transactions", authMiddleware, sellerController.getTransactions);
router.get("/seller/chart-data", authMiddleware, sellerController.getChartData);
router.get("/seller/:id", authMiddleware, sellerController.getTransactionDetail);

// Optional: get payment details by order id
router.get("/order/:order_id", authMiddleware, controller.getPaymentByOrderId);

// Razorpay webhook
router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    controller.handleWebhook
);

module.exports = router;