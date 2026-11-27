
const chatService = require("./chat.service");

exports.getOrCreateConversation = async (req, res) => {
    try {
        const { seller_id, product_id } = req.body;
        const customer_id = req.user.id;

        if (!seller_id) {
            return res.status(400).json({
                status: false,
                message: "Seller ID is required",
            });
        }

        const conversation = await chatService.getOrCreateConversation(
            customer_id,
            seller_id,
            product_id
        );

        return res.status(200).json({
            status: true,
            data: conversation,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await chatService.getConversations(userId);

        return res.status(200).json({
            status: true,
            data: conversations,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const messages = await chatService.getMessages(id, userId);

        return res.status(200).json({
            status: true,
            data: messages,
        });
    } catch (error) {
        const statusCode =
            error.message === "Access denied" ? 403 :
                error.message === "Conversation not found" ? 404 : 500;

        return res.status(statusCode).json({
            status: false,
            message: error.message,
        });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, aiConfirmed } = req.body;
        const senderId = req.user.id;
        const file = req.file;

        if ((!message || !message.trim()) && !file) {
            return res.status(400).json({
                status: false,
                message: "Message or attachment is required",
            });
        }

        if (file) {
            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/plain",
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

        // Save the message and complete existing moderation/upload logic first.
        const newMessage = await chatService.sendMessage(
            id,
            senderId,
            message,
            file,
            aiConfirmed === "true" || aiConfirmed === true
        );

        // Notify connected users only after the message is saved successfully.
        const io = req.app.io;

        if (io) {
            const payload = {
                conversationId: String(id),
                message: newMessage,
            };

            io.to(`conversation:${id}`).emit("chat:new_message", payload);
        } else {
            console.error("[Chat] Socket.IO instance not found on req.app.io");
        }

        return res.status(201).json({
            status: true,
            data: newMessage,
        });
    } catch (error) {
        const statusCode = error.statusCode || (
            error.message === "Access denied" ? 403 :
                error.message === "Conversation not found" ? 404 : 500
        );

        return res.status(statusCode).json({
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

        const io = req.app.io;

        if (io) {
            io.to(`conversation:${id}`).emit("chat:read", {
                conversationId: id,
                userId,
            });
        }

        return res.status(200).json({
            status: true,
            message: "Marked as read",
        });
    } catch (error) {
        const statusCode =
            error.message === "Access denied" ? 403 :
                error.message === "Conversation not found" ? 404 : 500;

        return res.status(statusCode).json({
            status: false,
            message: error.message,
        });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        // Service validates ownership before deleting.
        const deletedMessage = await chatService.deleteMessage(
            messageId,
            userId
        );

        const io = req.app.io;

        if (io && deletedMessage) {
            io.to(`conversation:${deletedMessage.conversation_id}`).emit(
                "chat:message_deleted",
                {
                    messageId: deletedMessage.id,
                    conversationId: deletedMessage.conversation_id,
                }
            );
        }

        return res.status(200).json({
            status: true,
            message: "Message deleted successfully",
        });
    } catch (error) {
        const statusCode =
            error.message === "You can only delete your own messages" ? 403 :
                error.message === "Message not found" ? 404 : 500;

        return res.status(statusCode).json({
            status: false,
            message: error.message,
        });
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
        const statusCode =
            error.message === "Access denied" ? 403 :
                error.message === "Conversation not found" ? 404 : 500;

        return res.status(statusCode).json({
            status: false,
            message: error.message,
        });
    }
};
