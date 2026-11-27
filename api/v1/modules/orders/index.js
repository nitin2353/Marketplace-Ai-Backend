const express = require("express");
const router = express.Router();

const controller = require("./order.controller");
const authMiddleware = require("../middlewares/index");

// Create order
router.post("/", authMiddleware, controller.createOrder);
router.post("/buy-now", authMiddleware, controller.buyNow);

// Customer routes
router.get("/customer/:user_id", authMiddleware, controller.getCustomerOrders);
router.get("/customer/:user_id/:order_id", authMiddleware, controller.getCustomerOrderById);

// Seller routes
router.get("/seller/:seller_id",  controller.getSellerOrders);
router.get("/seller/:seller_id/:order_id", authMiddleware, controller.getSellerOrderById);

// Single order details
router.get("/:order_id", authMiddleware, controller.getOrderById);

// Order related data
router.get("/:order_id/items", authMiddleware, controller.getOrderItems);
router.get("/:order_id/address-snapshot", authMiddleware, controller.getOrderAddressSnapshot);
router.get("/:order_id/user-snapshot", authMiddleware, controller.getOrderUserSnapshot);

// Status / payment
router.patch("/:order_id/status", authMiddleware, controller.updateOrderStatus);
router.patch("/:order_id/payment-status", authMiddleware, controller.updatePaymentStatus);
router.patch("/:order_id/verify-payment", authMiddleware, controller.verifyOrderPayment);
router.patch("/:order_id/cancel", authMiddleware, controller.cancelOrder);

module.exports = router;