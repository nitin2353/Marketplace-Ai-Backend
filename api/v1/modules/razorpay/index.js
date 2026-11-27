const express = require('express');
const router = express.Router();

const controller = require('./razorpay.controller');

// 👇 RAW BODY middleware (IMPORTANT)
router.post(
  '/webhook',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }),
  controller.handleWebhook
);


router.post('/create-order', controller.createRazorpayOrder);
router.post('/verify', controller.verifyPayment);

module.exports = router;