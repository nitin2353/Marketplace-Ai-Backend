const express = require('express');
const router = express.Router();
const globalController = require("./global.controller");
const upload = require("../middlewares/multer");
const OrderController = require("../orders/order.controller");

router.post("/upload-images", upload.array("images", 5), globalController.uploadImages);

router.get("/order/invoice-generate/:order_id/:id", OrderController.getOrderById);


module.exports = router;