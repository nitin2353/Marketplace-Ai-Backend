const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/index");
const addressController = require("./address.controller");


router.get("/all", authMiddleware, addressController.getAllAddresses);
router.get("/:id", authMiddleware, addressController.getAddressById);
router.get("/", authMiddleware, addressController.getAddressesByUserId);
router.post("/", authMiddleware, addressController.createAddress);
router.put("/:id", authMiddleware, addressController.updateAddress);
router.delete("/:id", authMiddleware, addressController.deleteAddress);

module.exports = router;