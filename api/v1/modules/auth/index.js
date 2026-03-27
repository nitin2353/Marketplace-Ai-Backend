const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");

router.post("/customer/register", authController.customerRregister);
router.post("/seller/register", authController.registerSeller);
router.post("/login", authController.login);

module.exports = router;