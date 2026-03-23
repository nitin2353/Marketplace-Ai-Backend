const express = require('express');
const router = express.Router();

const controller = require('./order.controller');

router.post('/', controller.createOrder);
router.get('/customer/:user_id', controller.getCustomerOrders);
router.get('/seller/:seller_id', controller.getSellerOrders);
router.put('/status', controller.updateOrderStatus);

module.exports = router;