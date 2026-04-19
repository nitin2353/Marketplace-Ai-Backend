const express = require('express');
const router = express.Router();
const authMiddleware = require("../middlewares/index");
const reportController = require('./report.controller');

// Seller dashboard summary
router.get('/seller-summary/:sellerId', authMiddleware, reportController.getSellerSummary);

// Weekly units sold for a product
router.get('/weekly-units/:productId', authMiddleware, reportController.getWeeklyUnitsSold);

// Monthly sales + revenue for a product
router.get('/monthly-sales/:productId', authMiddleware, reportController.getMonthlySales);

// Order status mix for a seller/product
router.get('/order-status-mix/:sellerId', authMiddleware, reportController.getOrderStatusMix);

// Recent orders for a product
router.get('/recent-orders/:productId', authMiddleware, reportController.getRecentOrdersByProduct);

// Rating breakdown for a product
router.get('/rating-breakdown/:productId', authMiddleware, reportController.getRatingBreakdown);

module.exports = router;