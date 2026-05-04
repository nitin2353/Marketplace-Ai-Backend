const notificationModel = require("./notification.modal");

exports.createNotification = async (payload) => {
    if (!payload.receiver_id) throw new Error("receiver_id is required");
    if (!payload.type) throw new Error("type is required");
    if (!payload.title) throw new Error("title is required");
    if (!payload.receiver_type) payload.receiver_type = "user";

    return await notificationModel.createNotification(payload);
};

exports.getNotificationsByReceiver = async (receiverId, query) => {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const offset = (page - 1) * limit;

    return await notificationModel.getNotificationsByReceiver(receiverId, limit, offset);
};

exports.getUnreadCountByReceiver = async (receiverId) => {
    return await notificationModel.getUnreadCountByReceiver(receiverId);
};

exports.markAsRead = async (notificationId, receiverId) => {
    const result = await notificationModel.markAsRead(notificationId, receiverId);
    if (!result) throw new Error("Notification not found");
    return result;
};

exports.markAllAsRead = async (receiverId) => {
    return await notificationModel.markAllAsRead(receiverId);
};

exports.getMyNotifications = async (req) => {
    const userId = req.user.id;
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;

    return await notificationModel.getNotificationsByReceiver(userId, limit, offset);
};

exports.deleteNotification = async (notificationId, receiverId) => {
    const result = await notificationModel.deleteNotification(notificationId, receiverId);
    if (!result) throw new Error("Notification not found");
    return result;
};