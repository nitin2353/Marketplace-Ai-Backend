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
        const { message, attachment_url } = req.body;
        const senderId = req.user.id;

        if (!message && !attachment_url) {
            return res.status(400).json({ status: false, message: "Message or attachment is required" });
        }

        const newMessage = await chatService.sendMessage(id, senderId, message, attachment_url);
        res.status(201).json({ status: true, data: newMessage });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
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
