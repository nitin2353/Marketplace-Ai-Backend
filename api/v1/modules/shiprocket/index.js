const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/index");
const shipmentController = require('./shiprocket.controller')


router.post("/delivery/availability", shipmentController?.getCourierServiceability);


module.exports = router;
