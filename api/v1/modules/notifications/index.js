const express = require("express");
const router = express.Router();
const notificationController = require("./notification.controller");
const authMiddleware = require("../middlewares/index");

router.post("/", notificationController.createNotification);
router.get("/", authMiddleware, notificationController.getMyNotifications);

router.get("/user/:userId", notificationController.getUserNotifications);
router.get("/seller/:sellerId", notificationController.getSellerNotifications);
router.get("/user/:userId/unread-count", notificationController.getUnreadCount);

router.patch("/:notificationId/user/:userId/read", notificationController.markAsRead);
router.patch("/user/:userId/read-all", notificationController.markAllAsRead);

router.delete("/:notificationId/user/:userId", notificationController.deleteNotification);

module.exports = router;