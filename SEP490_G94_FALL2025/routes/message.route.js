const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const {
  getTeamMessages,
  sendTeamMessage,
  getDirectMessages,
  sendDirectMessage,
  markMessageAsRead,
  getUnreadCount,
  getConversations
} = require('../controllers/message.controller');

// Team chat routes
router.get('/team/:teamId', verifyToken, getTeamMessages);
router.post('/team/:teamId', verifyToken, sendTeamMessage);

// Direct chat routes
router.get('/conversations', verifyToken, getConversations); // Lấy danh sách conversations
router.get('/direct/:userId', verifyToken, getDirectMessages); // Lấy tin nhắn với 1 user
router.post('/direct/:userId', verifyToken, sendDirectMessage); // Gửi tin nhắn cho 1 user

// Message actions
router.patch('/:messageId/read', verifyToken, markMessageAsRead);
router.get('/unread-count', verifyToken, getUnreadCount);

module.exports = router;

