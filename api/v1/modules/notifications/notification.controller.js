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

exports.getMyNotifications = async (req, res) => {
    try {
        const data = await notificationService.getMyNotifications(req);
        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getMyNotifications error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Internal Server Error"
        });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await notificationService.getUnreadCountByReceiver(userId);

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
        const { notificationId } = req.params;
        const userId = req.user.id;
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
        const userId = req.user.id;
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
        const { notificationId } = req.params;
        const userId = req.user.id;
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