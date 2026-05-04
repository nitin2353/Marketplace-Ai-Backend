const chatModel = require("./chat.model");
const notificationTrigger = require("../notifications/notification.trigger");

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

exports.sendMessage = async (conversationId, senderId, message, attachmentUrl) => {
    const conversation = await chatModel.getConversationById(conversationId);
    if (!conversation) {
        throw new Error("Conversation not found");
    }
    if (conversation.customer_id !== senderId && conversation.seller_id !== senderId) {
        throw new Error("Access denied");
    }

    const newMessage = await chatModel.createMessage(conversationId, senderId, message, attachmentUrl);
    
    const receiverId = conversation.customer_id === senderId ? conversation.seller_id : conversation.customer_id;
    const receiverType = conversation.customer_id === senderId ? 'seller' : 'customer';

    // Trigger notification for new message
    await notificationTrigger.triggerNotification({
        receiver_id: receiverId,
        receiver_type: receiverType,
        type: 'NEW_CHAT_MESSAGE',
        title: 'New Message',
        body: message ? (message.length > 50 ? message.substring(0, 47) + '...' : message) : 'You received an attachment',
        ref_type: 'conversation',
        ref_id: conversationId
    });

    return newMessage;
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
