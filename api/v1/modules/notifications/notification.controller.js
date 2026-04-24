const notificationService = require("./notification.service");

exports.createNotification = async (req, res) => {
    try {
        const data = await notificationService.createNotification(req.body);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("createNotification error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Internal Server Error"
        });
    }
};

exports.getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await notificationService.getNotificationsByUser(userId, req.query);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getUserNotifications error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Internal Server Error"
        });
    }
};

exports.getSellerNotifications = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const data = await notificationService.getNotificationsBySeller(sellerId, req.query);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getSellerNotifications error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Internal Server Error"
        });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await notificationService.getUnreadCountByUser(userId);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getUnreadCount error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Internal Server Error"
        });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { notificationId, userId } = req.params;
        const data = await notificationService.markAsRead(notificationId, userId);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("markAsRead error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Internal Server Error"
        });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await notificationService.markAllAsRead(userId);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("markAllAsRead error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Internal Server Error"
        });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { notificationId, userId } = req.params;
        const data = await notificationService.deleteNotification(notificationId, userId);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("deleteNotification error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Internal Server Error"
        });
    }
};