const express = require('express');
const router = express.Router();

const requirement = require('../api/v1/modules/requirement');
const quote = require('../api/v1/modules/quote');
const orders = require('../api/v1/modules/orders');
const payments = require('../api/v1/modules/payments');
const razorpay = require('../api/v1/modules/razorpay');
const wallet = require('../api/v1/modules/wallet');
const auth = require('../api/v1/modules/auth');
const productRoutes = require('../api/v1/modules/product/index');
const global = require('../api/v1/modules/global')


router.use('/requirement', requirement)
    .use('/quote', quote)
    .use('/order', orders)
    .use('/payment', payments)
    .use('/razorpay', razorpay)
    .use('/wallet', wallet)
    .use('/auth', auth)
    .use("/product", productRoutes)
    .use('/global', global)


module.exports = router;