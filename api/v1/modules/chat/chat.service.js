const pool = require("../../../../config/database");
const chatModel = require("./chat.model");
const notificationTrigger = require("../notifications/notification.trigger");
const { uploadFromBuffer, removeMultiple } = require("../../../../utils/global");
const cloudinary = require("../../../../config/cloudinary");

exports.getOrCreateConversation = async (customerId, sellerId, productId) => {
    let conversation = await chatModel.findConversation(customerId, sellerId, productId);
    if (!conversation) {
        conversation = await chatModel.createConversation(customerId, sellerId, productId);
        
        
        // Trigger notification for new customization request

        

        await notificationTrigger.triggerNotification({
            receiver_id: sellerId,
            receiver_type: 'seller',
            type: 'NEW_CUSTOMIZATION_REQUEST',
            title: 'New Customization Request',
            body: 'A customer has started a conversation regarding a product customization.',
            ref_type: 'conversation',
            ref_id: conversation.id
        });
    }
    return conversation;
};

exports.getConversations = async (userId) => {
    return await chatModel.getConversationsByUser(userId);
};

exports.getMessages = async (conversationId, userId) => {
    const conversation = await chatModel.getConversationById(conversationId);
    if (!conversation) {
        throw new Error("Conversation not found");
    }
    if (conversation.customer_id !== userId && conversation.seller_id !== userId) {
        throw new Error("Access denied");
    }

    await chatModel.markAsRead(conversationId, userId);
    return await chatModel.getMessagesByConversation(conversationId);
};

exports.sendMessage = async (conversationId, senderId, message, file) => {
    const conversation = await chatModel.getConversationById(conversationId);
    if (!conversation) {
        throw new Error("Conversation not found");
    }
    if (conversation.customer_id !== senderId && conversation.seller_id !== senderId) {
        throw new Error("Access denied");
    }

    // Get sender name for notification
    const senderRes = await pool.query('SELECT name FROM public.users WHERE id = $1', [senderId]);
    const senderName = senderRes.rows[0]?.name || 'Someone';

    let attachmentData = {};
    if (file) {
        const uploadRes = await uploadFromBuffer(file.buffer, "chat_attachments");
        attachmentData = {
            url: uploadRes.url,
            type: file.mimetype,
            name: file.originalname,
            size: file.size
        };
    }

    const newMessage = await chatModel.createMessage(conversationId, senderId, message, attachmentData);
    
    const receiverId = conversation.customer_id === senderId ? conversation.seller_id : conversation.customer_id;
    const receiverType = conversation.customer_id === senderId ? 'seller' : 'customer';

    // Trigger notification for new message
    await notificationTrigger.triggerNotification({
        receiver_id: receiverId,
        receiver_type: receiverType,
        type: 'chat_message',
        title: 'New Message',
        body: `${senderName}: ${message ? (message.length > 50 ? message.substring(0, 47) + '...' : message) : 'Shared a file'}`,
        ref_type: 'conversation',
        ref_id: conversationId
    });

    return { ...newMessage, sender_name: senderName };
};

exports.markConversationRead = async (conversationId, userId) => {
    const conversation = await chatModel.getConversationById(conversationId);
    if (!conversation) {
        throw new Error("Conversation not found");
    }
    if (conversation.customer_id !== userId && conversation.seller_id !== userId) {
        throw new Error("Access denied");
    }
    return await chatModel.markAsRead(conversationId, userId);
};

exports.deleteMessage = async (messageId, userId) => {
    const message = await chatModel.getMessageById(messageId);
    if (!message) {
        throw new Error("Message not found");
    }
    if (message.sender_id !== userId) {
        throw new Error("You can only delete your own messages");
    }

    // Optional: Delete from Cloudinary
    if (message.attachment_url) {
        try {
            // Extract public_id safely
            const url = message.attachment_url;
            const parts = url.split("/");
            const fileName = parts.pop().split(".")[0];
            const publicId = `chat_attachments/${fileName}`;
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error("Error deleting from Cloudinary:", error);
        }
    }

    return await chatModel.deleteMessage(messageId);
};
