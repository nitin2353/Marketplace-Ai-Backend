const express = require('express');
const router = express.Router();

const controller = require('./payment.controller');

router.post('/', controller.createPayment);
router.post('/release', controller.releasePayment);
router.get('/:order_id', controller.getPayments);

module.exports = router;