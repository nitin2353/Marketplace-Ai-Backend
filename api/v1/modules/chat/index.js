const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const verifyToken = require('../middlewares');

router.post('/conversation', verifyToken, chatController.getOrCreateConversation);
router.get('/conversations', verifyToken, chatController.getConversations);
router.get('/conversation/:id/messages', verifyToken, chatController.getMessages);
router.post('/conversation/:id/message', verifyToken, chatController.sendMessage);
router.patch('/conversation/:id/read', verifyToken, chatController.markAsRead);

module.exports = router;
