const express = require("express");
const router = express.Router();
const notificationController = require("./notification.controller");
const authMiddleware = require("../middlewares/index");

// Internal/Admin use or authenticated user
router.post("/", authMiddleware, notificationController.createNotification);

router.get("/", authMiddleware, notificationController.getMyNotifications);
router.get("/unread-count", authMiddleware, notificationController.getUnreadCount);

router.patch("/mark-all-read", authMiddleware, notificationController.markAllAsRead);
router.patch("/:notificationId/read", authMiddleware, notificationController.markAsRead);

router.delete("/:notificationId", authMiddleware, notificationController.deleteNotification);

module.exports = router;