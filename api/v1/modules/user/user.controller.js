const userModel = require("./user.modal");
const Response = require("../response");

exports.getProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userModel.findUserById(userId);
        if (!user) return Response.notFound(res, "User not found");

        return Response.success(res, "Profile fetched successfully", user);
    } catch (err) {
        return Response.serverError(res, err.message);
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = { ...req.body };

        if (req.file) {
            // If running on local, usually we return the relative path or full URL
            // Assuming environment provides a base URL or we just store filename
            data.avatar = req.file.filename;
        }

        const user = await userModel.updateProfile(userId, data);
        return Response.success(res, "Profile updated successfully", user);
    } catch (err) {
        return Response.serverError(res, err.message);
    }
};

exports.updateStore = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userModel.updateStore(userId, req.body);
        return Response.success(res, "Store info updated successfully", user);
    } catch (err) {
        return Response.serverError(res, err.message);
    }
};

exports.updatePayment = async (req, res) => {
    try {
        const { userId } = req.params;
        // Basic validation for payment details
        const { ifsc, account_number } = req.body;
        if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
            return Response.badRequest(res, "Invalid IFSC code format");
        }

        const user = await userModel.updatePayment(userId, req.body);
        return Response.success(res, "Payment details updated successfully", user);
    } catch (err) {
        return Response.serverError(res, err.message);
    }
};

exports.getNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userModel.findUserById(userId);
        if (!user) return Response.notFound(res, "User not found");

        const role = user.role;
        const defaultPrefs = role === 'seller' ? {
            new_order: true,
            order_cancelled: true,
            payment_received: true,
            low_stock: true,
            out_of_stock: true,
            new_review: true,
            chat_messages: true,
            weekly_summary: false,
            email_notifications: true,
            sms_notifications: false
        } : {
            email_notifications: true,
            sms_notifications: false,
            order_updates: true,
            promotional_emails: false,
            weekly_digest: false,
            chat_messages: true,
            review_replies: true,
            payment_updates: true
        };

        const prefs = { ...defaultPrefs, ...(user.notification_preferences || {}) };
        return Response.success(res, "Notification preferences fetched successfully", prefs);
    } catch (err) {
        return Response.serverError(res, err.message);
    }
};

exports.updateNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userModel.updateNotificationPrefs(userId, req.body);
        return Response.success(res, "Notification preferences updated successfully", user.notification_preferences);
    } catch (err) {
        return Response.serverError(res, err.message);
    }
};
