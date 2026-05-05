const notificationModel = require("./notification.modal");
const userModel = require("../user/user.modal");

exports.createNotification = async (payload) => {
    if (!payload.receiver_id) throw new Error("receiver_id is required");
    if (!payload.type) throw new Error("type is required");
    if (!payload.title) throw new Error("title is required");
    if (!payload.receiver_type) payload.receiver_type = "user";

    // Check notification preferences
    const user = await userModel.findUserById(payload.receiver_id);
    if (user) {
        const prefs = user.notification_preferences || {};
        const type = payload.type;
        const role = user.role;
        
        // Mapping internal notification types to preference keys
        let prefKey = type;

        if (role === 'seller') {
            const sellerPrefMap = {
                'new_order': 'new_order',
                'order_cancelled': 'order_cancelled',
                'payment_received': 'payment_received',
                'review_received': 'new_review',
                'low_stock': 'low_stock',
                'out_of_stock': 'out_of_stock',
                'chat_message': 'chat_messages',
                'NEW_CHAT_MESSAGE': 'chat_messages'
            };
            prefKey = sellerPrefMap[type] || type;
        } else {
            const customerPrefMap = {
                'order_placed': 'order_updates',
                'order_confirmed': 'order_updates',
                'order_shipped': 'order_updates',
                'order_delivered': 'order_updates',
                'order_cancelled': 'order_updates',
                'order_status_update': 'order_updates',
                'payment_successful': 'payment_updates',
                'review_replied': 'review_replies',
                'chat_message': 'chat_messages',
                'NEW_CHAT_MESSAGE': 'chat_messages'
            };
            prefKey = customerPrefMap[type] || type;
        }
        
        // If preference is explicitly false, skip creation
        if (prefs[prefKey] === false) {
            console.log(`Notification skipped for user ${payload.receiver_id} (${role}) due to preference: ${prefKey}`);
            return null;
        }
    }

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