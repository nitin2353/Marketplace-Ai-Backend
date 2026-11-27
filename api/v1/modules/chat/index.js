const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const verifyToken = require('../middlewares');
const upload = require('../../../../utils/memoryUpload');

router.post('/conversation', verifyToken, chatController.getOrCreateConversation);
router.get('/conversations', verifyToken, chatController.getConversations);
router.get('/conversation/:id/messages', verifyToken, chatController.getMessages);

router.post('/message/moderate', verifyToken, chatController.moderateMessage);

router.post('/conversation/:id/message', verifyToken, upload.single('attachment'), chatController.sendMessage);
router.patch('/conversation/:id/read', verifyToken, chatController.markAsRead);
router.delete('/message/:messageId', verifyToken, chatController.deleteMessage);

module.exports = router;