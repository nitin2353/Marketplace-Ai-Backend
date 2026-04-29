const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const authMiddleware = require("../middlewares/index");
const upload = require("../../../../utils/upload");

router.get("/profile/:userId", authMiddleware, userController.getProfile);
router.put("/profile/:userId", authMiddleware, upload.single("avatar"), userController.updateProfile);
router.put("/store/:userId", authMiddleware, userController.updateStore);
router.put("/payment/:userId", authMiddleware, userController.updatePayment);
router.put("/notification-preferences/:userId", authMiddleware, userController.updateNotificationPreferences);

module.exports = router;
