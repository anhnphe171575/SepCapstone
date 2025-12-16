const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} = require('../controllers/notification.controller');

// Lấy danh sách thông báo của user hiện tại
router.get('/', verifyToken, getNotifications);

// Lấy số lượng thông báo chưa đọc
router.get('/unread-count', verifyToken, getUnreadCount);

// Đánh dấu thông báo là đã đọc
router.patch('/:id/read', verifyToken, markAsRead);

// Đánh dấu tất cả thông báo là đã đọc
router.patch('/mark-all-read', verifyToken, markAllAsRead);

// Xóa thông báo
router.delete('/:id', verifyToken, deleteNotification);

// Xóa tất cả thông báo đã đọc
router.delete('/read/all', verifyToken, deleteAllRead);

module.exports = router;
