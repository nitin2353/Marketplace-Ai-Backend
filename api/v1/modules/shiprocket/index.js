const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/index");
const shipmentController = require('./shiprocket.controller')


router.post("/delivery/availability", shipmentController?.getCourierServiceability);
router.post("/addpickup/address", shipmentController?.addPickupAddress);
router.patch("/update/pickup/address", shipmentController?.updatePickupAddress);


module.exports = router;
