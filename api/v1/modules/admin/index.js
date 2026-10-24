const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/index");
const adminController = require('./admin.controller')


router.get("/sellers",adminController.getSellers);

router.patch("/sellers/:id/status",adminController.updateSellerStatus);

module.exports = router;
