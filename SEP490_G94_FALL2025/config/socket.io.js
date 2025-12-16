const { Server } = require('socket.io');
const Message = require('../models/message');
const Team = require('../models/team');
const Project = require('../models/project');
const User = require('../models/user');

let io;
const userSockets = new Map(); // Map userId -> socketId
const userInfoCache = new Map(); // Map userId -> userInfo (full_name, email, avatar) 

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // hoặc chỉ định domain frontend
                  // ❗️ BẠN CẦN THÊM DÒNG NÀY

    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room và cập nhật trạng thái online
    socket.on('join', async (userId) => {
      if (!userId) return;
      
      try {
        socket.userId = userId;
        userSockets.set(userId, socket.id);
        // Join vào cả hai room để tương thích (theo id thuần và tiền tố user-)
        socket.join(userId);
        socket.join(`user-${userId}`);
        
        // Lấy thông tin user và lưu vào cache
        const user = await User.findById(userId).select('full_name email avatar _id');
        if (user) {
          userInfoCache.set(userId.toString(), {
            _id: user._id,
            full_name: user.full_name || 'Người dùng',
            email: user.email || '',
            avatar: user.avatar || ''
          });
          
          // Gửi thông tin user hiện tại cho client
          socket.emit('current-user-info', {
            user: {
              _id: user._id,
              full_name: user.full_name || 'Người dùng',
              email: user.email || '',
              avatar: user.avatar || ''
            }
          });
          
          console.log(`[Socket] User ${userId} joined - Info cached`);
        }
        
        // Thông báo cho tất cả biết user này online
        io.emit('userOnline', userId);
        
        // Gửi danh sách user đang online cho client mới
        const onlineUsers = Array.from(userSockets.keys());
        socket.emit('onlineUsers', onlineUsers);
      } catch (error) {
        console.error('[Socket] Error in join:', error);
      }
    });

    // Join team room để nhận tin nhắn team
    socket.on('join-team', async (teamId) => {
      if (!teamId || !socket.userId) {
        console.log('[Socket] join-team: Missing teamId or userId');
        return;
      }
      
      try {
        const team = await Team.findById(teamId).populate({
          path: 'project_id',
          select: 'supervisor_id _id',
          model: 'Project'
        });
        if (!team) {
          socket.emit('error', { message: 'Team không tồn tại' });
          console.log(`[Socket] join-team: Team ${teamId} not found`);
          return;
        }

        // Kiểm tra user có thuộc team không
        const isMember = team.team_member.some(
          member => member.user_id.toString() === socket.userId.toString()
        );
        
        // Kiểm tra xem user có phải là supervisor của project không
        const isSupervisor = team.project_id && 
          team.project_id.supervisor_id && 
          team.project_id.supervisor_id.toString() === socket.userId.toString();
        
        if (!isMember && !isSupervisor) {
          socket.emit('error', { message: 'Bạn không thuộc team này' });
          console.log(`[Socket] join-team: User ${socket.userId} is not a member or supervisor of team ${teamId}`);
          return;
        }

        const roomName = `team-${teamId.toString()}`;
        socket.join(roomName);
        console.log(`[Socket] User ${socket.userId} joined team room: ${roomName}`);
        
        // Thông báo cho team biết có member mới join (trừ chính người đó)
        socket.to(roomName).emit('user-joined-team', {
          teamId: teamId.toString(),
          userId: socket.userId.toString()
        });

        // Lấy thông tin user hiện tại từ cache hoặc DB
        let currentUserInfo = userInfoCache.get(socket.userId.toString());
        if (!currentUserInfo) {
          const user = await User.findById(socket.userId).select('full_name email avatar _id');
          if (user) {
            currentUserInfo = {
              _id: user._id,
              full_name: user.full_name || 'Người dùng',
              email: user.email || '',
              avatar: user.avatar || ''
            };
            userInfoCache.set(socket.userId.toString(), currentUserInfo);
          }
        }

        // Gửi confirmation cho người join kèm thông tin user
        socket.emit('joined-team', {
          teamId: teamId.toString(),
          success: true,
          currentUser: currentUserInfo || null
        });
      } catch (error) {
        console.error('[Socket] Lỗi khi join team:', error);
        socket.emit('error', { message: 'Có lỗi xảy ra khi tham gia team' });
      }
    });

    // Leave team room
    socket.on('leave-team', (teamId) => {
      if (!teamId) return;
      socket.leave(`team-${teamId}`);
      console.log(`User ${socket.userId} left team ${teamId}`);
    });

    // Xử lý gửi tin nhắn team
    socket.on('send-team-message', async (data) => {
      try {
        const { teamId, content } = data;
        
        if (!teamId || !content?.trim() || !socket.userId) {
          socket.emit('error', { message: 'Dữ liệu tin nhắn không hợp lệ' });
          return;
        }

        // Kiểm tra user có thuộc team không hoặc là supervisor của project
        const team = await Team.findById(teamId).populate({
          path: 'project_id',
          select: 'supervisor_id _id',
          model: 'Project'
        });
        if (!team) {
          socket.emit('error', { message: 'Team không tồn tại' });
          return;
        }

        const isMember = team.team_member.some(
          member => member.user_id.toString() === socket.userId.toString()
        );
        
        // Kiểm tra xem user có phải là supervisor của project không
        const isSupervisor = team.project_id && 
          team.project_id.supervisor_id && 
          team.project_id.supervisor_id.toString() === socket.userId.toString();
        
        if (!isMember && !isSupervisor) {
          socket.emit('error', { message: 'Bạn không thuộc team này' });
          return;
        }

        // Lưu tin nhắn vào DB
        const newMessage = await Message.create({
          sender_id: socket.userId,
          team_id: teamId,
          project_id: team.project_id,
          type: 'team',
          content: content.trim(),
          time: new Date()
        });

        // Populate sender và convert sang object
        await newMessage.populate('sender_id', 'full_name email avatar');
        
        // Convert message sang object để gửi qua socket
        const messageData = newMessage.toObject();
        
        // Đảm bảo sender_id là object với đầy đủ thông tin
        if (newMessage.sender_id && typeof newMessage.sender_id === 'object') {
          messageData.sender_id = {
            _id: newMessage.sender_id._id,
            full_name: newMessage.sender_id.full_name,
            email: newMessage.sender_id.email,
            avatar: newMessage.sender_id.avatar
          };
        }

        // Gửi tin nhắn cho tất cả thành viên trong team (bao gồm cả người gửi)
        io.to(`team-${teamId}`).emit('new-team-message', {
          message: messageData,
          teamId: teamId.toString()
        });

        console.log(`[Socket] Team message sent to team ${teamId} by user ${socket.userId}`);
      } catch (error) {
        console.error('Lỗi khi xử lý tin nhắn team:', error);
        socket.emit('error', { message: 'Có lỗi xảy ra khi gửi tin nhắn' });
      }
    });

    // Xử lý gửi tin nhắn direct (1-1)
    socket.on('send-direct-message', async (data) => {
      try {
        const { receiverId, content } = data;
        
        if (!receiverId || !content?.trim() || !socket.userId) {
          socket.emit('error', { message: 'Dữ liệu tin nhắn không hợp lệ' });
          return;
        }

        if (socket.userId.toString() === receiverId.toString()) {
          socket.emit('error', { message: 'Không thể gửi tin nhắn cho chính mình' });
          return;
        }

        // Lưu tin nhắn vào DB
        const newMessage = await Message.create({
          sender_id: socket.userId,
          receiver_id: receiverId,
          type: 'direct',
          content: content.trim(),
          time: new Date()
        });

        await newMessage.populate('sender_id', 'full_name email avatar _id');
        await newMessage.populate('receiver_id', 'full_name email avatar _id');

        // Format message để gửi qua socket
        const messageData = newMessage.toObject();
        if (newMessage.sender_id && typeof newMessage.sender_id === 'object') {
          messageData.sender_id = {
            _id: newMessage.sender_id._id,
            full_name: newMessage.sender_id.full_name || 'Người dùng',
            email: newMessage.sender_id.email || '',
            avatar: newMessage.sender_id.avatar || ''
          };
        }
        if (newMessage.receiver_id && typeof newMessage.receiver_id === 'object') {
          messageData.receiver_id = {
            _id: newMessage.receiver_id._id,
            full_name: newMessage.receiver_id.full_name || 'Người dùng',
            email: newMessage.receiver_id.email || '',
            avatar: newMessage.receiver_id.avatar || ''
          };
        }

        // Gửi tin nhắn cho người nhận qua cả 2 room (tương thích mọi client)
        const receiverRoom1 = receiverId.toString();
        const receiverRoom2 = `user-${receiverId.toString()}`;
        io.to(receiverRoom1).emit('new-direct-message', { message: messageData });
        io.to(receiverRoom2).emit('new-direct-message', { message: messageData });

        // Gửi lại cho người gửi để xác nhận (cũng qua room của họ để đảm bảo)
        socket.emit('message-sent', { message: messageData });

        console.log(`[Socket] Direct message sent from ${socket.userId} to ${receiverId} (rooms: ${receiverRoom1}, ${receiverRoom2})`);

        console.log(`Direct message sent from ${socket.userId} to ${receiverId}`);
      } catch (error) {
        console.error('Lỗi khi xử lý tin nhắn direct:', error);
        socket.emit('error', { message: 'Có lỗi xảy ra khi gửi tin nhắn' });
      }
    });

    // Xử lý typing indicator cho team
    socket.on('typing-team', ({ teamId, isTyping }) => {
      if (!teamId || !socket.userId) return;
      
      socket.to(`team-${teamId}`).emit('user-typing-team', {
        userId: socket.userId,
        teamId,
        isTyping
      });
    });

    // Xử lý typing indicator cho direct
    socket.on('typing-direct', ({ receiverId, isTyping }) => {
      if (!receiverId || !socket.userId) return;

      const room1 = receiverId.toString();
      const room2 = `user-${receiverId.toString()}`;
      io.to(room1).emit('user-typing-direct', { userId: socket.userId, isTyping });
      io.to(room2).emit('user-typing-direct', { userId: socket.userId, isTyping });
    });

    // Xử lý đánh dấu đã đọc
    socket.on('mark-message-read', async ({ messageId }) => {
      if (!messageId || !socket.userId) return;
      
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // Kiểm tra quyền
        let hasPermission = false;
        
        if (message.type === 'team') {
          const team = await Team.findById(message.team_id).populate({
            path: 'project_id',
            select: 'supervisor_id _id',
            model: 'Project'
          });
          const isMember = team?.team_member.some(
            member => member.user_id.toString() === socket.userId.toString()
          );
          const isSupervisor = team?.project_id && 
            team.project_id.supervisor_id && 
            team.project_id.supervisor_id.toString() === socket.userId.toString();
          hasPermission = isMember || isSupervisor;
        } else if (message.type === 'direct') {
          hasPermission = message.receiver_id.toString() === socket.userId.toString();
        }

        if (!hasPermission) return;

        // Thêm vào read_by
        const alreadyRead = message.read_by.some(
          read => read.user_id.toString() === socket.userId.toString()
        );

        if (!alreadyRead) {
          message.read_by.push({
            user_id: socket.userId,
            read_at: new Date()
          });
          message.isRead = message.read_by.length > 0;
          await message.save();

          // Populate read_by để lấy thông tin user đã đọc
          await message.populate('read_by.user_id', 'full_name email avatar _id');
          
          // Lấy thông tin user đã đọc từ cache hoặc DB
          const readerInfo = userInfoCache.get(socket.userId.toString()) || 
            await User.findById(socket.userId).select('full_name email avatar _id').lean();

          // Thông báo cho team hoặc người gửi với thông tin đầy đủ
          const readData = {
            messageId: messageId.toString(),
            userId: socket.userId.toString(),
            reader: readerInfo ? {
              _id: readerInfo._id || readerInfo._id,
              full_name: readerInfo.full_name || 'Người dùng',
              email: readerInfo.email || '',
              avatar: readerInfo.avatar || ''
            } : null,
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
            console.log(`[Socket] Message ${messageId} marked as read by user ${socket.userId} in team ${message.team_id}`);
          } else {
            // Direct: emit cho cả người gửi và người nhận (để cập nhật UI hai phía)
            const senderRoom1 = message.sender_id.toString();
            const senderRoom2 = `user-${message.sender_id.toString()}`;
            const receiverRoom1 = message.receiver_id.toString();
            const receiverRoom2 = `user-${message.receiver_id.toString()}`;

            io.to(senderRoom1).emit('message-read', readData);
            io.to(senderRoom2).emit('message-read', readData);
            io.to(receiverRoom1).emit('message-read', readData);
            io.to(receiverRoom2).emit('message-read', readData);
            console.log(`[Socket] Direct message ${messageId} read by ${socket.userId} → notified sender ${message.sender_id}`);
          }
        }
      } catch (error) {
        console.error('Lỗi khi đánh dấu đã đọc:', error);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        // Không xóa cache vì có thể user reconnect nhanh
        // userInfoCache.delete(socket.userId.toString());
        io.emit('userOffline', socket.userId);
      }
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io chưa được khởi tạo. Gọi setupSocket(server) trước.');
  }
  return io;
}

// Hàm lấy danh sách user đang online
function getOnlineUsers() {
  return Array.from(userSockets.keys());
}

// Hàm kiểm tra user có online không
function isUserOnline(userId) {
  return userSockets.has(userId.toString());
}

// Hàm lấy thông tin user từ cache
function getUserInfo(userId) {
  return userInfoCache.get(userId.toString()) || null;
}

module.exports = {
  setupSocket,
  getIO,
  getOnlineUsers,
  isUserOnline,
  getUserInfo
};
