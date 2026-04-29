const notificationModel = require("./notification.modal");

exports.createNotification = async (payload) => {
    if (!payload.user_id) throw new Error("user_id is required");
    if (!payload.type) throw new Error("type is required");
    if (!payload.title) throw new Error("title is required");

    return await notificationModel.createNotification(payload);
};

exports.getNotificationsByUser = async (userId, query) => {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const offset = (page - 1) * limit;

    return await notificationModel.getNotificationsByUser(userId, limit, offset);
};

exports.getNotificationsBySeller = async (sellerId, query) => {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const offset = (page - 1) * limit;

    return await notificationModel.getNotificationsBySeller(sellerId, limit, offset);
};

exports.getUnreadCountByUser = async (userId) => {
    return await notificationModel.getUnreadCountByUser(userId);
};

exports.markAsRead = async (notificationId, userId) => {
    const result = await notificationModel.markAsRead(notificationId, userId);
    console.log("result", result)
    if (!result) throw new Error("Notification not found");
    return result;
};

exports.markAllAsRead = async (userId) => {
    return await notificationModel.markAllAsRead(userId);
};

exports.getMyNotifications = async (req) => {
    const userId = req.user.id;
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;

    return await notificationModel.getNotificationsByReceiver(userId, limit, offset);
};

exports.deleteNotification = async (notificationId, userId) => {
    const result = await notificationModel.deleteNotification(notificationId, userId);
    if (!result) throw new Error("Notification not found");
    return result;
};