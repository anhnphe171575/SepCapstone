const Notification = require('../models/notification');
const mongoose = require('mongoose');
const { getIO } = require('../config/socket.io');

// Tạo thông báo mới (helper function để dùng từ các controller khác)
async function createNotification(data) {
  try {
    const notification = await Notification.create({
      user_id: data.user_id,
      type: data.type || 'System',
      action: data.action,
      message: data.message,
      priority: data.priority || 'Medium',
      project_id: data.project_id,
      document_id: data.document_id,
      task_id: data.task_id,
      meeting_id: data.meeting_id,
      created_by: data.created_by,
      action_url: data.action_url,
      metadata: data.metadata || {},
    });

    // Populate và gửi realtime
    await notification.populate([
      { path: 'created_by', select: 'full_name email' },
      { path: 'project_id', select: 'topic code' },
      { path: 'document_id', select: 'title version' },
    ]);

    // Gửi realtime qua socket.io
    try {
      const io = getIO();
      io.to(data.user_id.toString()).emit('notification', notification);
    } catch (socketError) {
      console.log('Socket.io chưa được khởi tạo:', socketError.message);
    }

    return notification;
  } catch (error) {
    console.log('Error creating notification:', error);
    return null;
  }
}

// Tạo thông báo cho nhiều users (ví dụ: khi upload document trong project)
async function createNotificationsForUsers(userIds, notificationData) {
  try {
    const notifications = userIds.map(userId => ({
      ...notificationData,
      user_id: userId,
    }));
    const created = await Notification.insertMany(notifications);

    // Gửi realtime qua socket.io cho từng user
    try {
      const io = getIO();
      created.forEach(notification => {
        io.to(notification.user_id.toString()).emit('notification', notification);
      });
    } catch (socketError) {
      console.log('Socket.io chưa được khởi tạo:', socketError.message);
    }

    return true;
  } catch (error) {
    console.log('Error creating notifications for users:', error);
    return false;
  }
}

// Lấy danh sách thông báo của user
async function getNotifications(req, res) {
  try {
    const userId = req.user?._id || req.query.user_id;
    const { type, status, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'Thiếu user_id' });
    }

    const filter = { user_id: userId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(filter)
      .populate('created_by', 'full_name email')
      .populate('project_id', 'topic code')
      .populate('document_id', 'title version')
      .populate('task_id', 'title')
      .sort({ createAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      user_id: userId, 
      status: 'Unread' 
    });

    return res.json({
      notifications,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_notifications: total,
        limit: parseInt(limit),
        unread_count: unreadCount
      },
      message: 'Lấy danh sách thông báo thành công'
    });
  } catch (error) {
    console.log('Error getting notifications:', error);
    return res.status(500).json({ message: 'Lỗi lấy thông báo', error: error.message });
  }
}

// Lấy số lượng thông báo chưa đọc
async function getUnreadCount(req, res) {
  try {
    const userId = req.user?._id || req.query.user_id;

    if (!userId) {
      return res.status(400).json({ message: 'Thiếu user_id' });
    }

    const unreadCount = await Notification.countDocuments({ 
      user_id: userId, 
      status: 'Unread' 
    });

    return res.json({
      unread_count: unreadCount,
      message: 'Lấy số lượng thông báo chưa đọc thành công'
    });
  } catch (error) {
    console.log('Error getting unread count:', error);
    return res.status(500).json({ message: 'Lỗi lấy số lượng thông báo', error: error.message });
  }
}

// Đánh dấu thông báo là đã đọc
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const notification = await Notification.findOne({ 
      _id: id, 
      user_id: userId 
    });

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    notification.status = 'Read';
    await notification.save();

    // Gửi realtime update để frontend cập nhật số lượng chưa đọc
    try {
      const io = getIO();
      io.to(userId.toString()).emit('notification-read', { 
        notification_id: id,
        unread_count: await Notification.countDocuments({ user_id: userId, status: 'Unread' })
      });
    } catch (socketError) {
      console.log('Socket.io chưa được khởi tạo:', socketError.message);
    }

    return res.json({
      message: 'Đánh dấu đã đọc thành công',
      notification
    });
  } catch (error) {
    console.log('Error marking notification as read:', error);
    return res.status(500).json({ message: 'Lỗi đánh dấu đã đọc', error: error.message });
  }
}

// Đánh dấu tất cả thông báo là đã đọc
async function markAllAsRead(req, res) {
  try {
    const userId = req.user?._id || req.body.user_id;

    if (!userId) {
      return res.status(400).json({ message: 'Thiếu user_id' });
    }

    const result = await Notification.updateMany(
      { user_id: userId, status: 'Unread' },
      { status: 'Read' }
    );

    return res.json({
      message: 'Đánh dấu tất cả đã đọc thành công',
      updated_count: result.modifiedCount
    });
  } catch (error) {
    console.log('Error marking all as read:', error);
    return res.status(500).json({ message: 'Lỗi đánh dấu tất cả đã đọc', error: error.message });
  }
}

// Xóa thông báo
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const notification = await Notification.findOneAndDelete({ 
      _id: id, 
      user_id: userId 
    });

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    return res.json({ message: 'Xóa thông báo thành công' });
  } catch (error) {
    console.log('Error deleting notification:', error);
    return res.status(500).json({ message: 'Lỗi xóa thông báo', error: error.message });
  }
}

// Xóa tất cả thông báo đã đọc
async function deleteAllRead(req, res) {
  try {
    const userId = req.user?._id || req.body.user_id;

    if (!userId) {
      return res.status(400).json({ message: 'Thiếu user_id' });
    }

    const result = await Notification.deleteMany({ 
      user_id: userId, 
      status: 'Read' 
    });

    return res.json({
      message: 'Xóa tất cả thông báo đã đọc thành công',
      deleted_count: result.deletedCount
    });
  } catch (error) {
    console.log('Error deleting all read notifications:', error);
    return res.status(500).json({ message: 'Lỗi xóa thông báo đã đọc', error: error.message });
  }
}

module.exports = {
  createNotification,
  createNotificationsForUsers,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
};
