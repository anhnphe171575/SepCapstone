const Notification = require('../models/notification');
const mongoose = require('mongoose');
const { getIO } = require('../config/socket.io');

/**
 * Gửi notification cho user (lưu DB + gửi realtime qua socket.io)
 * @param {Object} data
 * @param {String|ObjectId} data.user_id - ID người nhận (required)
 * @param {String} data.message - Nội dung thông báo (required)
 * @param {String} data.type - Loại thông báo: System, Project, Document, Meeting, Task, Defect, Team, Other (required)
 * @param {String} [data.action]  - Hành động: upload, update, delete, create, assign, comment, status_change, deadline_approaching, deadline_passed, invite, remove, approve, reject
 * @param {String} [data.priority] - Độ ưu tiên: Low, Medium, High, Urgent (default: Medium)
 * @param {String|ObjectId} [data.project_id] - ID project liên quan
 * @param {String|ObjectId} [data.document_id] - ID document liên quan
 * @param {String|ObjectId} [data.task_id] - ID task liên quan
 * @param {String|ObjectId} [data.meeting_id] - ID meeting liên quan
 * @param {String|ObjectId} [data.created_by] - ID người thực hiện hành động
 * @param {String} [data.action_url] - URL để điều hướng khi click
 * @param {Object} [data.metadata] - Metadata bổ sung (JSON)
 * @returns {Promise<Object>} notification đã lưu (populated)
 */
async function sendNotification(data) {
  if (!data.user_id || !data.message || !data.type) {
    throw new Error('Thiếu thông tin bắt buộc: user_id, message, type');
  }

  try {
    // Lưu vào DB
    const notification = await Notification.create({
      user_id: data.user_id,
      type: data.type,
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

    // Populate để trả về thông tin đầy đủ
    await notification.populate([
      { path: 'created_by', select: 'full_name email' },
      { path: 'project_id', select: 'topic code' },
      { path: 'document_id', select: 'title version' },
      { path: 'task_id', select: 'title' },
    ]);

    // Gửi realtime qua socket.io (nếu có)
    try {
      const io = getIO();
      const userId = data.user_id.toString();
      // Emit vào cả 2 room để đảm bảo nhận được
      io.to(userId).emit('notification', notification);
      io.to(`user-${userId}`).emit('notification', notification);
      console.log(`[sendNotification] Đã gửi notification cho user ${userId} qua socket`);
    } catch (socketError) {
      // Socket có thể chưa được khởi tạo, không ảnh hưởng đến việc lưu DB
      console.log('Socket.io chưa được khởi tạo hoặc lỗi khi gửi notification qua socket:', socketError.message);
    }

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Gửi notification cho nhiều users cùng lúc
 * @param {Array<String|ObjectId>} userIds - Danh sách ID người nhận
 * @param {Object} notificationData - Dữ liệu notification (tương tự sendNotification, nhưng không có user_id)
 * @returns {Promise<Boolean>} true nếu thành công
 */
async function sendNotificationsToUsers(userIds, notificationData) {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userIds phải là mảng không rỗng');
  }

  if (!notificationData.message || !notificationData.type) {
    throw new Error('Thiếu thông tin bắt buộc: message, type');
  }

  try {
    // Đảm bảo userIds là unique (loại bỏ duplicate một lần nữa)
    const uniqueUserIds = Array.from(new Set(userIds.map(id => id.toString()))).map(id => {
      return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    });

    console.log(`[sendNotificationsToUsers] Gửi ${uniqueUserIds.length} notifications cho ${uniqueUserIds.length} users`);

    // Tạo notifications cho tất cả users
    const notifications = uniqueUserIds.map(userId => ({
      ...notificationData,
      user_id: userId,
    }));

    const created = await Notification.insertMany(notifications);
    console.log(`[sendNotificationsToUsers] Đã tạo ${created.length} notifications trong DB`);

    // Gửi realtime qua socket.io cho từng user
    try {
      const io = getIO();
      created.forEach(notification => {
        const userId = notification.user_id.toString();
        // Emit vào cả 2 room để đảm bảo nhận được
        io.to(userId).emit('notification', notification);
        io.to(`user-${userId}`).emit('notification', notification);
      });
      console.log(`[sendNotificationsToUsers] Đã gửi ${created.length} notifications qua socket`);
    } catch (socketError) {
      console.log('Socket.io chưa được khởi tạo hoặc lỗi khi gửi notifications qua socket:', socketError.message);
    }

    return true;
  } catch (error) {
    console.error('Error sending notifications to users:', error);
    throw error;
  }
}

module.exports = { sendNotification, sendNotificationsToUsers };
