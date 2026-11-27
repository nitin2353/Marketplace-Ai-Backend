const express = require('express');
const router = express.Router();

const controller = require('./wallet.controller');

router.get('/:seller_id', controller.getWallet);
router.post('/withdraw', controller.withdraw);
router.post('/approve', controller.approveWithdraw);

module.exports = router;