const chatService = require("./chat.service");

exports.getOrCreateConversation = async (req, res) => {
    try {
        const { seller_id, product_id } = req.body;
        const customer_id = req.user.id;

        if (!seller_id) {
            return res.status(400).json({ status: false, message: "Seller ID is required" });
        }

        const conversation = await chatService.getOrCreateConversation(customer_id, seller_id, product_id);
        res.status(200).json({ status: true, data: conversation });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await chatService.getConversations(userId);
        res.status(200).json({ status: true, data: conversations });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const messages = await chatService.getMessages(id, userId);
        res.status(200).json({ status: true, data: messages });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, aiConfirmed } = req.body;
        const senderId = req.user.id;
        const file = req.file;

        if (!message && !file) {
            return res.status(400).json({
                status: false,
                message: "Message or attachment is required",
            });
        }

        if (file) {
            const allowedTypes = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
            ];

            if (!allowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid file type. Allowed: images, pdf, doc/docx, txt",
                });
            }

            if (file.size > 10 * 1024 * 1024) {
                return res.status(400).json({
                    status: false,
                    message: "File size exceeds 10MB limit",
                });
            }
        }

        const newMessage = await chatService.sendMessage(
            id,
            senderId,
            message,
            file,
            aiConfirmed === "true" || aiConfirmed === true
        );

        res.status(201).json({
            status: true,
            data: newMessage,
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            status: false,
            message: error.message,
            moderation: error.moderation || null,
        });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await chatService.markConversationRead(id, userId);
        res.status(200).json({ status: true, message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;
        await chatService.deleteMessage(messageId, userId);
        res.status(200).json({ status: true, message: "Message deleted successfully" });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

exports.moderateMessage = async (req, res) => {
    try {
        const { message, conversationId } = req.body;
        const senderId = req.user.id;

        const result = await chatService.moderateMessageBeforeSend(
            conversationId,
            senderId,
            message
        );

        return res.status(200).json({
            status: true,
            data: result,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};
