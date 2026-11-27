const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/index");
const delhiveryController = require('./delhivery.controller')


router.post("/check-pincode", delhiveryController?.checkPincodeServiceability);
router.post("/calculate/shipping", delhiveryController?.calculateShippingCharges);
router.post('/create-order', authMiddleware, delhiveryController?.createDelhiveryOrder)
router.get('/shipping/tracking', authMiddleware, delhiveryController?.trackDelivery)



// router.post("/addpickup/address", shipmentController?.addPickupAddress);
// router.patch("/update/pickup/address", shipmentController?.updatePickupAddress);
// router.post('/orders/create/adhoc', authMiddleware, shipmentController?.createShiprocketOrder)


module.exports = router;
