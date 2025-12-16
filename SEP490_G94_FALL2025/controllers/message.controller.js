const Message = require('../models/message');
const Team = require('../models/team');
const Project = require('../models/project');
const mongoose = require('mongoose');
const { getIO } = require('../config/socket.io');

// GET /api/messages/team/:teamId - Lấy tin nhắn của team
async function getTeamMessages(req, res) {
  try {
    const { teamId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user._id;

    // Kiểm tra user có thuộc team không hoặc là supervisor của project
    const team = await Team.findById(teamId).populate({
      path: 'project_id',
      select: 'supervisor_id _id',
      model: 'Project'
    });
    if (!team) {
      return res.status(404).json({ message: 'Không tìm thấy team' });
    }

    const isMember = team.team_member.some(
      member => member.user_id.toString() === userId.toString()
    );
    
    // Kiểm tra xem user có phải là supervisor của project không
    const isSupervisor = team.project_id && 
      team.project_id.supervisor_id && 
      team.project_id.supervisor_id.toString() === userId.toString();
    
    if (!isMember && !isSupervisor) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập tin nhắn của team này' });
    }

    // Query messages
    const query = {
      team_id: teamId,
      type: 'team'
    };

    if (before) {
      query.time = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate({
        path: 'sender_id',
        select: 'full_name email avatar _id',
        model: 'User'
      })
      .populate({
        path: 'read_by.user_id',
        select: 'full_name email avatar _id',
        model: 'User'
      })
      .sort({ time: -1 })
      .limit(parseInt(limit))
      .lean();

    // Đảm bảo sender_id và read_by được populate đúng
    const messagesWithSender = messages.map(msg => {
      const formattedMsg = { ...msg };
      
      // Format sender_id
      if (msg.sender_id && typeof msg.sender_id === 'object') {
        formattedMsg.sender_id = {
          _id: msg.sender_id._id,
          full_name: msg.sender_id.full_name || 'Người dùng',
          email: msg.sender_id.email || '',
          avatar: msg.sender_id.avatar || ''
        };
      }
      
      // Format read_by
      if (msg.read_by && Array.isArray(msg.read_by)) {
        formattedMsg.read_by = msg.read_by.map(r => ({
          user_id: r.user_id?._id || r.user_id,
          full_name: r.user_id?.full_name || 'Người dùng',
          email: r.user_id?.email || '',
          avatar: r.user_id?.avatar || '',
          read_at: r.read_at
        }));
      }
      
      return formattedMsg;
    });

    // Đảo ngược để hiển thị từ cũ đến mới
    messagesWithSender.reverse();

    return res.json({
      messages: messagesWithSender,
      team_id: teamId,
      total: messagesWithSender.length,
      hasMore: messagesWithSender.length === parseInt(limit)
    });
  } catch (error) {
    console.log('Error getting team messages:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/messages/team/:teamId - Gửi tin nhắn vào team
async function sendTeamMessage(req, res) {
  try {
    const { teamId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung tin nhắn không được để trống' });
    }

    // Kiểm tra user có thuộc team không hoặc là supervisor của project
    const team = await Team.findById(teamId).populate({
      path: 'project_id',
      select: 'supervisor_id _id',
      model: 'Project'
    });
    if (!team) {
      return res.status(404).json({ message: 'Không tìm thấy team' });
    }

    const isMember = team.team_member.some(
      member => member.user_id.toString() === userId.toString()
    );
    
    // Kiểm tra xem user có phải là supervisor của project không
    const isSupervisor = team.project_id && 
      team.project_id.supervisor_id && 
      team.project_id.supervisor_id.toString() === userId.toString();
    
    if (!isMember && !isSupervisor) {
      return res.status(403).json({ message: 'Bạn không có quyền gửi tin nhắn vào team này' });
    }

    // Tạo message
    const message = await Message.create({
      sender_id: userId,
      team_id: teamId,
      project_id: team.project_id?._id,
      type: 'team',
      content: content.trim(),
      time: new Date()
    });

    // Populate sender
    await message.populate('sender_id', 'full_name email avatar');

    return res.status(201).json({
      message: message,
      team_id: teamId
    });
  } catch (error) {
    console.log('Error sending team message:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/messages/direct/:userId - Lấy tin nhắn 1-1 với user khác
async function getDirectMessages(req, res) {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user._id;
    const { limit = 50, before } = req.query;

    const query = {
      $or: [
        { sender_id: currentUserId, receiver_id: otherUserId, type: 'direct' },
        { sender_id: otherUserId, receiver_id: currentUserId, type: 'direct' }
      ]
    };

    if (before) {
      query.time = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate({
        path: 'sender_id',
        select: 'full_name email avatar _id',
        model: 'User'
      })
      .populate({
        path: 'receiver_id',
        select: 'full_name email avatar _id',
        model: 'User'
      })
      .populate({
        path: 'read_by.user_id',
        select: 'full_name email avatar _id',
        model: 'User'
      })
      .sort({ time: -1 })
      .limit(parseInt(limit))
      .lean();

    // Format messages
    const formattedMessages = messages.map(msg => {
      const formattedMsg = { ...msg };
      
      // Format sender_id
      if (msg.sender_id && typeof msg.sender_id === 'object') {
        formattedMsg.sender_id = {
          _id: msg.sender_id._id,
          full_name: msg.sender_id.full_name || 'Người dùng',
          email: msg.sender_id.email || '',
          avatar: msg.sender_id.avatar || ''
        };
      }
      
      // Format receiver_id
      if (msg.receiver_id && typeof msg.receiver_id === 'object') {
        formattedMsg.receiver_id = {
          _id: msg.receiver_id._id,
          full_name: msg.receiver_id.full_name || 'Người dùng',
          email: msg.receiver_id.email || '',
          avatar: msg.receiver_id.avatar || ''
        };
      }
      
      // Format read_by
      if (msg.read_by && Array.isArray(msg.read_by)) {
        formattedMsg.read_by = msg.read_by.map(r => ({
          user_id: r.user_id?._id || r.user_id,
          full_name: r.user_id?.full_name || 'Người dùng',
          email: r.user_id?.email || '',
          avatar: r.user_id?.avatar || '',
          read_at: r.read_at
        }));
      }
      
      return formattedMsg;
    });

    formattedMessages.reverse();

    return res.json({
      messages: formattedMessages,
      conversation_with: otherUserId,
      total: formattedMessages.length,
      hasMore: formattedMessages.length === parseInt(limit),
      message: 'Lấy tin nhắn thành công'
    });
  } catch (error) {
    console.log('Error getting direct messages:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/messages/direct/:userId - Gửi tin nhắn 1-1
async function sendDirectMessage(req, res) {
  try {
    const { userId: receiverId } = req.params;
    const { content } = req.body;
    const senderId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung tin nhắn không được để trống' });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: 'Không thể gửi tin nhắn cho chính mình' });
    }

    const message = await Message.create({
      sender_id: senderId,
      receiver_id: receiverId,
      type: 'direct',
      content: content.trim(),
      time: new Date()
    });

    await message.populate('sender_id', 'full_name email avatar _id');
    await message.populate('receiver_id', 'full_name email avatar _id');

    // Format message để trả về
    const messageData = message.toObject();
    if (message.sender_id && typeof message.sender_id === 'object') {
      messageData.sender_id = {
        _id: message.sender_id._id,
        full_name: message.sender_id.full_name || 'Người dùng',
        email: message.sender_id.email || '',
        avatar: message.sender_id.avatar || ''
      };
    }
    if (message.receiver_id && typeof message.receiver_id === 'object') {
      messageData.receiver_id = {
        _id: message.receiver_id._id,
        full_name: message.receiver_id.full_name || 'Người dùng',
        email: message.receiver_id.email || '',
        avatar: message.receiver_id.avatar || ''
      };
    }

    // Emit real-time cho người nhận (HTTP đã trả về cho người gửi, tránh trùng lặp UI)
    try {
      const io = getIO();
      const receiverRoom1 = receiverId.toString();
      const receiverRoom2 = `user-${receiverId.toString()}`;

      io.to(receiverRoom1).emit('new-direct-message', { message: messageData });
      io.to(receiverRoom2).emit('new-direct-message', { message: messageData });
    } catch (e) {
      // Nếu socket.io chưa sẵn sàng, vẫn trả về HTTP 201
    }

    return res.status(201).json({ message: messageData });
  } catch (error) {
    console.log('Error sending direct message:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// PATCH /api/messages/:messageId/read - Đánh dấu tin nhắn đã đọc
async function markMessageAsRead(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }

    // Kiểm tra user có quyền đọc tin nhắn không
    let hasPermission = false;
    
    if (message.type === 'team') {
      const team = await Team.findById(message.team_id).populate({
        path: 'project_id',
        select: 'supervisor_id _id',
        model: 'Project'
      });
      const isMember = team?.team_member.some(
        member => member.user_id.toString() === userId.toString()
      );
      const isSupervisor = team?.project_id && 
        team.project_id.supervisor_id && 
        team.project_id.supervisor_id.toString() === userId.toString();
      hasPermission = isMember || isSupervisor;
    } else if (message.type === 'direct') {
      hasPermission = message.receiver_id.toString() === userId.toString();
    }

    if (!hasPermission) {
      return res.status(403).json({ message: 'Bạn không có quyền đọc tin nhắn này' });
    }

    // Thêm vào read_by nếu chưa có
    const alreadyRead = message.read_by.some(
      read => read.user_id.toString() === userId.toString()
    );

    if (!alreadyRead) {
      message.read_by.push({
        user_id: userId,
        read_at: new Date()
      });
      message.isRead = message.read_by.length > 0;
      await message.save();
    }

    // Populate read_by để trả về thông tin đầy đủ
    await message.populate('read_by.user_id', 'full_name email avatar _id');

    // Emit real-time cho direct/team như socket handler (trong trường hợp client gọi HTTP thay vì socket)
    try {
      const io = getIO();
      const readData = {
        messageId: messageId.toString(),
        userId: userId.toString(),
        reader: await (async () => {
          const user = await require('../models/user').findById(userId).select('full_name email avatar _id').lean();
          return user ? { _id: user._id, full_name: user.full_name || 'Người dùng', email: user.email || '', avatar: user.avatar || '' } : null;
        })(),
        read_at: new Date(),
        total_readers: message.read_by.length,
        read_by: message.read_by.map(r => ({
          user_id: r.user_id._id || r.user_id,
          full_name: r.user_id.full_name || 'Người dùng',
          email: r.user_id.email || '',
          avatar: r.user_id.avatar || '',
          read_at: r.read_at
        }))
      };

      if (message.type === 'team') {
        io.to(`team-${message.team_id}`).emit('message-read', readData);
      } else {
        const senderRoom1 = message.sender_id.toString();
        const senderRoom2 = `user-${message.sender_id.toString()}`;
        const receiverRoom1 = message.receiver_id.toString();
        const receiverRoom2 = `user-${message.receiver_id.toString()}`;
        io.to(senderRoom1).emit('message-read', readData);
        io.to(senderRoom2).emit('message-read', readData);
        io.to(receiverRoom1).emit('message-read', readData);
        io.to(receiverRoom2).emit('message-read', readData);
      }
    } catch (e) {
      // Bỏ qua nếu Socket.IO chưa sẵn sàng
    }

    return res.json({
      message: 'Đã đánh dấu tin nhắn là đã đọc',
      message_id: messageId,
      read_by: message.read_by.map(r => ({
        user_id: r.user_id._id || r.user_id,
        full_name: r.user_id.full_name || 'Người dùng',
        email: r.user_id.email || '',
        avatar: r.user_id.avatar || '',
        read_at: r.read_at
      })),
      total_readers: message.read_by.length
    });
  } catch (error) {
    console.log('Error marking message as read:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/messages/unread-count - Lấy số tin nhắn chưa đọc
async function getUnreadCount(req, res) {
  try {
    const userId = req.user._id;

    // Đếm tin nhắn team chưa đọc
    // Lấy các team mà user là member
    const teamsAsMember = await Team.find({ 'team_member.user_id': userId });
    const teamIdsAsMember = teamsAsMember.map(t => t._id);

    // Lấy các team trong projects mà user là supervisor
    const projectsAsSupervisor = await Project.find({ supervisor_id: userId });
    const projectIdsAsSupervisor = projectsAsSupervisor.map(p => p._id);
    const teamsAsSupervisor = await Team.find({ project_id: { $in: projectIdsAsSupervisor } });
    const teamIdsAsSupervisor = teamsAsSupervisor.map(t => t._id);

    // Hợp nhất danh sách team IDs
    const allTeamIds = [...new Set([...teamIdsAsMember, ...teamIdsAsSupervisor])];

    const teamUnreadCount = await Message.countDocuments({
      team_id: { $in: allTeamIds },
      type: 'team',
      sender_id: { $ne: userId },
      // Chưa có bản ghi đã đọc bởi user này
      'read_by.user_id': { $ne: userId }
    });

    // Đếm tin nhắn direct chưa đọc
    const directUnreadCount = await Message.countDocuments({
      receiver_id: userId,
      type: 'direct',
      isRead: false
    });

    return res.json({
      team_unread: teamUnreadCount,
      direct_unread: directUnreadCount,
      total_unread: teamUnreadCount + directUnreadCount
    });
  } catch (error) {
    console.log('Error getting unread count:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/messages/conversations - Lấy danh sách conversations (người đã chat với mình)
async function getConversations(req, res) {
  try {
    const currentUserId = req.user._id;
    const { limit = 50 } = req.query;

    // Lấy tất cả tin nhắn direct mà user này là sender hoặc receiver
    const messages = await Message.find({
      $or: [
        { sender_id: currentUserId, type: 'direct' },
        { receiver_id: currentUserId, type: 'direct' }
      ]
    })
      .populate({
        path: 'sender_id',
        select: 'full_name email avatar _id',
        model: 'User'
      })
      .populate({
        path: 'receiver_id',
        select: 'full_name email avatar _id',
        model: 'User'
      })
      .sort({ time: -1 })
      .lean();

    // Nhóm theo user (người đối thoại) và lấy tin nhắn cuối cùng
    const conversationMap = new Map();

    messages.forEach(msg => {
      // Xác định user đối thoại (không phải currentUserId)
      const otherUser = msg.sender_id._id.toString() === currentUserId.toString()
        ? msg.receiver_id
        : msg.sender_id;

      if (!otherUser || !otherUser._id) return;

      const otherUserId = otherUser._id.toString();
      
      // Nếu chưa có conversation hoặc tin nhắn này mới hơn
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          user: {
            _id: otherUser._id,
            full_name: otherUser.full_name || 'Người dùng',
            email: otherUser.email || '',
            avatar: otherUser.avatar || ''
          },
          lastMessage: {
            _id: msg._id,
            content: msg.content,
            sender_id: msg.sender_id._id.toString() === currentUserId.toString()
              ? {
                  _id: msg.sender_id._id,
                  full_name: msg.sender_id.full_name || 'Người dùng',
                  email: msg.sender_id.email || '',
                  avatar: msg.sender_id.avatar || ''
                }
              : {
                  _id: msg.sender_id._id,
                  full_name: msg.sender_id.full_name || 'Người dùng',
                  email: msg.sender_id.email || '',
                  avatar: msg.sender_id.avatar || ''
                },
            time: msg.time,
            isRead: msg.isRead
          },
          unreadCount: 0
        });
      } else {
        const conversation = conversationMap.get(otherUserId);
        // Cập nhật lastMessage nếu tin nhắn này mới hơn
        if (new Date(msg.time) > new Date(conversation.lastMessage.time)) {
          conversation.lastMessage = {
            _id: msg._id,
            content: msg.content,
            sender_id: msg.sender_id._id.toString() === currentUserId.toString()
              ? {
                  _id: msg.sender_id._id,
                  full_name: msg.sender_id.full_name || 'Người dùng',
                  email: msg.sender_id.email || '',
                  avatar: msg.sender_id.avatar || ''
                }
              : {
                  _id: msg.sender_id._id,
                  full_name: msg.sender_id.full_name || 'Người dùng',
                  email: msg.sender_id.email || '',
                  avatar: msg.sender_id.avatar || ''
                },
            time: msg.time,
            isRead: msg.isRead
          };
        }
      }

      // Đếm tin nhắn chưa đọc (chỉ tin nhắn gửi cho currentUser)
      const conversation = conversationMap.get(otherUserId);
      if (msg.receiver_id && msg.receiver_id._id && 
          msg.receiver_id._id.toString() === currentUserId.toString() && 
          !msg.isRead) {
        if (conversation) {
          conversation.unreadCount++;
        }
      }
    });

    // Chuyển Map thành Array và sắp xếp theo thời gian tin nhắn cuối
    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessage.time) - new Date(a.lastMessage.time))
      .slice(0, parseInt(limit));

    return res.json({
      conversations,
      total: conversations.length
    });
  } catch (error) {
    console.log('Error getting conversations:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

module.exports = {
  getTeamMessages,
  sendTeamMessage,
  getDirectMessages,
  sendDirectMessage,
  markMessageAsRead,
  getUnreadCount,
  getConversations
};


