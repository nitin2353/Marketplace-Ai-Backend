const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/index");
const adminController = require('./admin.controller')

router.get("/sellers", authMiddleware, adminController.getSellers);

router.get("/sellers/:id/details", authMiddleware, adminController.getSellerDetails);

router.patch("/sellers/:id/status", adminController.updateSellerStatus);

router.patch("/payments/:paymentId/status", authMiddleware, adminController.updatePaymentStatus);

module.exports = router;