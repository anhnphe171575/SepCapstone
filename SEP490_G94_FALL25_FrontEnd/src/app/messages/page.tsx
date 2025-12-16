"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "../../../ultis/axios";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";
import { getSocket } from "@/components/ResponsiveSidebar";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  IconButton,
  InputAdornment,
  Fade,
  Slide,
  Skeleton,
  Badge,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Message as MessageIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  People as PeopleIcon,
} from "@mui/icons-material";

type Project = {
  _id: string;
  topic: string;
  code: string;
  description?: string;
};

type Team = {
  _id: string;
  name: string;
  project_id: string | {
    _id: string;
    supervisor_id?: string | {
      _id: string;
      full_name: string;
      email: string;
      avatar?: string;
    };
  };
  team_member: Array<{
    user_id: {
      _id: string;
      full_name: string;
      email: string;
      avatar?: string;
    };
    team_leader: number;
  }>;
};

type Message = {
  _id: string;
  sender_id: {
    _id: string;
    full_name: string;
    email: string;
    avatar?: string;
  };
  receiver_id?: {
    _id: string;
    full_name: string;
    email: string;
    avatar?: string;
  };
  team_id?: string;
  content: string;
  time: string;
  createAt: string;
  type: 'direct' | 'team';
  read_by?: Array<{
    user_id: string | {
      _id: string;
      full_name: string;
      email: string;
      avatar?: string;
    };
    full_name?: string;
    email?: string;
    avatar?: string;
    read_at: string;
  }>;
};

type Conversation = {
  user: {
    _id: string;
    full_name: string;
    email: string;
    avatar?: string;
  };
  lastMessage: {
    _id: string;
    content: string;
    sender_id: {
      _id: string;
      full_name: string;
      email: string;
      avatar?: string;
    };
    time: string;
    isRead: boolean;
  };
  unreadCount: number;
};

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = team, 1 = direct
  const [chatType, setChatType] = useState<'team' | 'direct'>('team');
  const [directChatUserId, setDirectChatUserId] = useState<string | null>(null);
  const [directChatUser, setDirectChatUser] = useState<{
    _id: string;
    full_name: string;
    email: string;
    avatar?: string;
  } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [supervisor, setSupervisor] = useState<{
    _id: string;
    full_name: string;
    email: string;
    avatar?: string;
  } | null>(null);
  const [userRole, setUserRole] = useState<number | null>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    _id: string;
    full_name: string;
    email: string;
    avatar?: string;
  } | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const readMessages = useRef<Set<string>>(new Set()); // Track tin nhắn đã đánh dấu đọc
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  // Đọc query params khi component mount hoặc URL thay đổi
  useEffect(() => {
    const type = searchParams?.get('type');
    const userId = searchParams?.get('userId');
    
    if (type === 'direct' && userId) {
      setActiveTab(1);
      setChatType('direct');
      setDirectChatUserId(userId);
      // Chỉ fetch messages, user info sẽ được lấy từ messages
      fetchDirectMessages(userId);
    } else {
      setActiveTab(0);
      setChatType('team');
      setDirectChatUserId(null);
      setDirectChatUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch conversations khi chuyển sang tab direct
  useEffect(() => {
    if (activeTab === 1 && conversations.length === 0) {
      fetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    fetchUserInfo();
    
    // Setup socket listener cho current-user-info ngay từ đầu
    const socket = getSocket();
    const handleCurrentUserInfo = (data: { user: { _id: string; full_name: string; email: string; avatar?: string } }) => {
      if (data.user) {
        setCurrentUser(data.user);
        console.log('Current user info received:', data.user);
      }
    };
    
    socket.on('current-user-info', handleCurrentUserInfo);
    
    return () => {
      // Cleanup socket listeners
      socket.off('current-user-info', handleCurrentUserInfo);
      if (socketRef.current) {
        socketRef.current.off('new-team-message');
        socketRef.current.off('user-joined-team');
        socketRef.current.off('user-typing-team');
        socketRef.current.off('message-read');
        socketRef.current.off('error');
      }
    };
  }, []);

  // Fetch projects sau khi đã có user info và role
  useEffect(() => {
    if (userRole !== null) {
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, isSupervisor]);

  useEffect(() => {
    // Chỉ fetch khi đang ở tab team chat
    if (selectedProjectId && activeTab === 0) {
      fetchTeamAndMessages(selectedProjectId);
      const cleanup = setupSocketListeners();
      return () => {
        // Cleanup socket listeners
        if (socketRef.current) {
          socketRef.current.off('joined-team');
          socketRef.current.off('new-team-message');
          socketRef.current.off('user-joined-team');
          socketRef.current.off('user-typing-team');
          socketRef.current.off('message-read');
          socketRef.current.off('error');
          
          // Leave team room nếu có
          if (selectedTeamId) {
            socketRef.current.emit('leave-team', selectedTeamId);
          }
        }
        if (cleanup && typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  }, [selectedProjectId, selectedTeamId, activeTab]);

  // Hàm đánh dấu tin nhắn đã đọc qua HTTP API (áp dụng cho team + direct)
  const markMessageAsRead = async (messageId: string) => {
    try {
      if (!messageId) return;
      await axiosInstance.patch(`/api/messages/${messageId}/read`);
      console.log('[Chat] Marked message as read (HTTP):', messageId);
    } catch (e) {
      // Fallback: thử qua socket nếu HTTP fail
      const socket = getSocket();
      socket.emit('mark-message-read', { messageId });
    }
  };

  // Hàm đánh dấu tin nhắn chưa đọc là đã đọc (team + direct)
  const markUnreadMessagesAsRead = () => {
    if (!currentUserId) return;

    messages.forEach((msg) => {
      const isOwn = isOwnMessage(msg);
      if (isOwn) return;

      // Với team: dựa vào read_by
      // Với direct: dựa vào read_by và chỉ đánh dấu nếu mình là receiver
      const alreadyRead = msg.read_by?.some(
        (read: any) => read.user_id?.toString() === currentUserId.toString() || read.user_id === currentUserId
      );

      let canRead = true;
      if (msg.type === 'direct') {
        const receiverId = typeof msg.receiver_id === 'object' ? msg.receiver_id?._id : (msg as any).receiver_id;
        canRead = receiverId?.toString() === currentUserId?.toString();
      }

      if (canRead && !alreadyRead && !readMessages.current.has(msg._id)) {
        markMessageAsRead(msg._id);
        readMessages.current.add(msg._id);
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
    // Đánh dấu tin nhắn đã đọc khi messages được load (team + direct)
    markUnreadMessagesAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUserId, selectedTeamId, directChatUserId, activeTab]);

  // Tự động chọn dự án đầu tiên khi load xong và đang ở tab team
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId && !loading && activeTab === 0) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projects, loading, selectedProjectId, activeTab]);

  // Join user room ngay khi có currentUserId và khi reconnect
  useEffect(() => {
    const socket = getSocket();
    if (!currentUserId) return;

    // Join ngay khi có userId
    socket.emit('join', currentUserId);

    // Join lại khi reconnect
    const handleConnect = () => {
      socket.emit('join', currentUserId);
    };
    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [currentUserId]);

  // Lắng nghe direct messages real-time
  useEffect(() => {
    const socket = getSocket();

    const handleNewDirectMessage = (data: { message: Message }) => {
      const msg = data.message;
      const senderId = typeof msg.sender_id === 'object' ? msg.sender_id._id : (msg as any).sender_id;
      const receiverId = typeof msg.receiver_id === 'object' ? msg.receiver_id._id : (msg as any).receiver_id;

      // Cập nhật danh sách conversations khi có tin nhắn mới
      if (activeTab === 1) {
        fetchConversations();
      }

      // Nếu đang mở cuộc trò chuyện với user này thì append tin nhắn
      const involvesCurrentChat = directChatUserId && (
        senderId?.toString() === directChatUserId?.toString() || receiverId?.toString() === directChatUserId?.toString()
      );
      const involvesCurrentUser = currentUserId && (senderId?.toString() === currentUserId?.toString() || receiverId?.toString() === currentUserId?.toString());

      if (activeTab === 1 && involvesCurrentChat && involvesCurrentUser) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
        scrollToBottom();

        // Nếu mình là người nhận, đánh dấu đã đọc ngay
        if (receiverId?.toString() === currentUserId?.toString()) {
          if (!readMessages.current.has(msg._id)) {
            markMessageAsRead(msg._id);
            readMessages.current.add(msg._id);
          }
        }
      }
    };

    const handleMessageSent = (data: { message: Message }) => {
      // Người gửi nhận lại xác nhận; nếu đang mở đúng chat thì append nếu chưa có
      const msg = data.message;
      const receiverId = typeof msg.receiver_id === 'object' ? msg.receiver_id._id : (msg as any).receiver_id;
      if (activeTab === 1 && directChatUserId && receiverId?.toString() === directChatUserId?.toString()) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      }
    };

    // Xử lý message-read event cho direct chat (real-time update read_by)
    const handleDirectMessageRead = (data: { 
      messageId: string; 
      userId: string;
      reader?: {
        _id: string;
        full_name: string;
        email: string;
        avatar?: string;
      } | null;
      read_at?: string | Date;
      read_by?: Array<{
        user_id: string;
        full_name: string;
        email: string;
        avatar?: string;
        read_at: string | Date;
      }>;
    }) => {
      // Chỉ xử lý nếu đang ở tab direct và đang mở cuộc trò chuyện này
      if (activeTab === 1 && chatType === 'direct' && directChatUserId) {
        setMessages(prev => prev.map(msg => {
          // Chỉ update tin nhắn direct (type === 'direct')
          if (msg._id === data.messageId && msg.type === 'direct') {
            // Kiểm tra xem đã được đánh dấu đọc chưa
            const alreadyRead = msg.read_by?.some(
              (read: any) => {
                const readUserId = typeof read.user_id === 'object' ? read.user_id._id : read.user_id;
                return readUserId?.toString() === data.userId.toString() || read.user_id === data.userId;
              }
            );
            
            if (!alreadyRead) {
              // Nếu backend gửi kèm read_by đầy đủ, dùng nó
              if (data.read_by && Array.isArray(data.read_by)) {
                return {
                  ...msg,
                  read_by: data.read_by.map(r => ({
                    user_id: r.user_id,
                    full_name: r.full_name || 'Người dùng',
                    email: r.email || '',
                    avatar: r.avatar || '',
                    read_at: typeof r.read_at === 'string' ? r.read_at : (r.read_at as Date).toISOString()
                  }))
                };
              } else {
                // Nếu không, tự tạo entry mới
                return {
                  ...msg,
                  read_by: [...(msg.read_by || []), {
                    user_id: data.userId,
                    full_name: data.reader?.full_name || 'Người dùng',
                    email: data.reader?.email || '',
                    avatar: data.reader?.avatar || '',
                    read_at: data.read_at ? (typeof data.read_at === 'string' ? data.read_at : data.read_at.toISOString()) : new Date().toISOString()
                  }]
                };
              }
            } else {
              // Nếu đã có, cập nhật lại read_by từ backend nếu có
              if (data.read_by && Array.isArray(data.read_by)) {
                return {
                  ...msg,
                  read_by: data.read_by.map(r => ({
                    user_id: r.user_id,
                    full_name: r.full_name || 'Người dùng',
                    email: r.email || '',
                    avatar: r.avatar || '',
                    read_at: typeof r.read_at === 'string' ? r.read_at : (r.read_at as Date).toISOString()
                  }))
                };
              }
            }
          }
          return msg;
        }));
      }
    };

    socket.on('new-direct-message', handleNewDirectMessage);
    socket.on('message-sent', handleMessageSent);
    socket.on('message-read', handleDirectMessageRead);

    return () => {
      socket.off('new-direct-message', handleNewDirectMessage);
      socket.off('message-sent', handleMessageSent);
      socket.off('message-read', handleDirectMessageRead);
    };
  }, [activeTab, directChatUserId, currentUserId, chatType]);

  const fetchUserInfo = async () => {
    try {
      const res = await axiosInstance.get('/api/users/me');
      if (res.data?._id || res.data?.id) {
        setCurrentUserId(res.data._id || res.data.id);
      }
      // Lấy role để xác định có phải supervisor không
      if (res.data?.role !== undefined) {
        setUserRole(res.data.role);
        // Role 4 = LECTURER (supervisor)
        setIsSupervisor(res.data.role === 4);
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  const fetchProjects = async () => {
    try {
      let res;
      // Nếu là supervisor, gọi API riêng
      if (isSupervisor) {
        res = await axiosInstance.get('/api/projects/supervisor');
        const data = res.data;
        const projectsList = Array.isArray(data?.data) ? data.data : (data?.data || []);
        setProjects(projectsList);
      } else {
        // Nếu không phải supervisor, gọi API thông thường
        res = await axiosInstance.get('/api/projects');
        const data = res.data;
        const projectsList = Array.isArray(data) ? data : (data?.projects || []);
        setProjects(projectsList);
      }
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      setError(err?.response?.data?.message || "Không thể tải danh sách dự án");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAndMessages = async (projectId: string) => {
    try {
      setLoadingMessages(true);
      setError(null); // Reset error trước khi fetch
      
      // Lấy team từ project - bỏ qua interceptor redirect cho trường hợp này
      const teamRes = await axiosInstance.get(`/api/team/${projectId}`, {
        validateStatus: (status) => {
          // Không ném lỗi cho 403/404, để xử lý trong catch
          return status < 500;
        }
      });
      
      if (teamRes.status === 200 && teamRes.data?.success && teamRes.data?.data) {
        const teamData = teamRes.data.data;
        setTeam(teamData);
        setSelectedTeamId(teamData._id);

        // Lấy thông tin supervisor từ teamData.supervisor (backend đã trả về riêng)
        if (teamData.supervisor && typeof teamData.supervisor === 'object' && teamData.supervisor._id) {
          setSupervisor({
            _id: teamData.supervisor._id,
            full_name: teamData.supervisor.full_name || 'Giảng viên',
            email: teamData.supervisor.email || '',
            avatar: teamData.supervisor.avatar || ''
          });
        } else {
          setSupervisor(null);
        }

        // Join team room qua socket
        const socket = getSocket();
        socketRef.current = socket;
        socket.emit('join-team', teamData._id);

        // Lấy tin nhắn của team
        await fetchTeamMessages(teamData._id);
      } else {
        // Xử lý trường hợp không có team hoặc không có quyền
        if (teamRes.status === 403) {
          setError('Bạn không có quyền truy cập team này hoặc dự án này chưa có team.');
        } else if (teamRes.status === 404) {
          setError('Dự án này chưa có team. Vui lòng tạo team trước.');
        } else {
          setError('Không tìm thấy team cho dự án này');
        }
        setTeam(null);
        setSelectedTeamId(null);
        setSupervisor(null);
      }
    } catch (err: any) {
      console.error("Error fetching team:", err);
      // Xử lý lỗi mà không redirect
      if (err.response?.status === 404) {
        setError('Dự án này chưa có team. Vui lòng tạo team trước.');
      } else if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập team này hoặc dự án này chưa có team.');
      } else if (err.response?.status === 401) {
        setError('Vui lòng đăng nhập lại.');
      } else {
        setError(err?.response?.data?.message || "Không thể tải thông tin team");
      }
      setTeam(null);
      setSelectedTeamId(null);
      setSupervisor(null);
      // Không redirect, chỉ hiển thị lỗi
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchTeamMessages = async (teamId: string) => {
    try {
      const res = await axiosInstance.get(`/api/messages/team/${teamId}`, {
        params: {
          limit: 50 // Số lượng tin nhắn muốn lấy
        },
        validateStatus: (status) => {
          // Không ném lỗi cho 403/404, để xử lý trong component
          return status < 500;
        }
      });
      
      // Kiểm tra status code
      if (res.status === 200 && res.data?.messages) {
        const msgs = Array.isArray(res.data.messages) ? res.data.messages : [];
        // Backend đã đảo ngược rồi, chỉ cần set trực tiếp
        setMessages(msgs);
      } else if (res.status === 403) {
        setError('Bạn không có quyền truy cập tin nhắn của team này.');
        setMessages([]);
      } else if (res.status === 404) {
        setError('Không tìm thấy tin nhắn.');
        setMessages([]);
      } else {
        setError('Không thể tải tin nhắn.');
        setMessages([]);
      }
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      // Xử lý lỗi mà không redirect
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập tin nhắn của team này.');
      } else if (err.response?.status === 404) {
        setError('Không tìm thấy tin nhắn.');
      } else {
        setError(err?.response?.data?.message || "Không thể tải tin nhắn");
      }
      setMessages([]);
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket();
    socketRef.current = socket;

    // Lắng nghe thông tin user hiện tại từ socket
    const handleCurrentUserInfo = (data: { user: { _id: string; full_name: string; email: string; avatar?: string } }) => {
      if (data.user) {
        setCurrentUser(data.user);
        console.log('Current user info received:', data.user);
      }
    };

    // Lắng nghe confirmation khi join team thành công
    const handleJoinedTeam = (data: { teamId: string; success: boolean; currentUser?: { _id: string; full_name: string; email: string; avatar?: string } }) => {
      if (data.teamId === selectedTeamId && data.success) {
        console.log(`Successfully joined team ${data.teamId}`);
        // Nhận thông tin user từ backend nếu có
        if (data.currentUser) {
          setCurrentUser(data.currentUser);
        }
      }
    };

    // Lắng nghe tin nhắn mới từ team
    const handleNewTeamMessage = (data: { message: Message; teamId: string }) => {
      if (data.teamId === selectedTeamId) {
        setMessages(prev => {
          // Kiểm tra xem tin nhắn đã tồn tại chưa (tránh duplicate)
          const exists = prev.some(msg => msg._id === data.message._id);
          if (exists) return prev;
          // Thêm tin nhắn mới vào cuối danh sách
          return [...prev, data.message];
        });
        scrollToBottom();
      }
    };

    // Lắng nghe user join team
    const handleUserJoinedTeam = (data: { teamId: string; userId: string }) => {
      if (data.teamId === selectedTeamId) {
        console.log(`User ${data.userId} joined team`);
      }
    };

    // Lắng nghe typing indicator
    const handleUserTyping = (data: { userId: string; teamId: string; isTyping: boolean }) => {
      if (data.teamId === selectedTeamId && data.userId !== currentUserId) {
        // Có thể hiển thị typing indicator ở đây
        console.log(`User ${data.userId} is ${data.isTyping ? 'typing' : 'not typing'}`);
      }
    };

    // Lắng nghe message read (chỉ cho team messages)
    const handleMessageRead = (data: { 
      messageId: string; 
      userId: string;
      reader?: {
        _id: string;
        full_name: string;
        email: string;
        avatar?: string;
      } | null;
      read_at?: string | Date;
      read_by?: Array<{
        user_id: string;
        full_name: string;
        email: string;
        avatar?: string;
        read_at: string | Date;
      }>;
    }) => {
      // Chỉ xử lý tin nhắn team (type === 'team' hoặc không có type, không phải 'direct')
      // Sử dụng functional update để truy cập state mới nhất
      setMessages(prev => {
        // Kiểm tra xem có tin nhắn team nào trong danh sách không
        const hasTeamMessages = prev.some(msg => msg.type === 'team' || !msg.type);
        // Nếu không có tin nhắn team, bỏ qua (có thể đang ở tab direct)
        if (!hasTeamMessages) return prev;
        
        return prev.map(msg => {
          // Chỉ update tin nhắn team (type === 'team' hoặc không có type, không phải 'direct')
          if (msg._id === data.messageId && msg.type !== 'direct') {
            // Kiểm tra xem đã được đánh dấu đọc chưa
            const alreadyRead = msg.read_by?.some(
              (read: any) => {
                const readUserId = typeof read.user_id === 'object' ? read.user_id._id : read.user_id;
                return readUserId?.toString() === data.userId.toString() || read.user_id === data.userId;
              }
            );
            if (!alreadyRead) {
              // Nếu backend gửi kèm read_by đầy đủ, dùng nó
              if (data.read_by && Array.isArray(data.read_by)) {
                return {
                  ...msg,
                  read_by: data.read_by.map(r => ({
                    user_id: r.user_id,
                    full_name: r.full_name || 'Người dùng',
                    email: r.email || '',
                    avatar: r.avatar || '',
                    read_at: typeof r.read_at === 'string' ? r.read_at : (r.read_at as Date).toISOString()
                  }))
                };
              } else {
                // Nếu không, tự tạo entry mới
                return {
                  ...msg,
                  read_by: [...(msg.read_by || []), {
                    user_id: data.userId,
                    full_name: data.reader?.full_name || 'Người dùng',
                    email: data.reader?.email || '',
                    avatar: data.reader?.avatar || '',
                    read_at: data.read_at ? (typeof data.read_at === 'string' ? data.read_at : data.read_at.toISOString()) : new Date().toISOString()
                  }]
                };
              }
            } else {
              // Nếu đã có, cập nhật lại read_by từ backend nếu có
              if (data.read_by && Array.isArray(data.read_by)) {
                return {
                  ...msg,
                  read_by: data.read_by.map(r => ({
                    user_id: r.user_id,
                    full_name: r.full_name || 'Người dùng',
                    email: r.email || '',
                    avatar: r.avatar || '',
                    read_at: typeof r.read_at === 'string' ? r.read_at : (r.read_at as Date).toISOString()
                  }))
                };
              }
            }
          }
          return msg;
        });
      });
    };

    // Lắng nghe lỗi từ socket
    const handleError = (data: { message: string }) => {
      setError(data.message);
    };

    // Đăng ký các listeners
    socket.on('current-user-info', handleCurrentUserInfo);
    socket.on('joined-team', handleJoinedTeam);
    socket.on('new-team-message', handleNewTeamMessage);
    socket.on('user-joined-team', handleUserJoinedTeam);
    socket.on('user-typing-team', handleUserTyping);
    socket.on('message-read', handleMessageRead);
    socket.on('error', handleError);

    // Return cleanup function
    return () => {
      socket.off('current-user-info', handleCurrentUserInfo);
      socket.off('joined-team', handleJoinedTeam);
      socket.off('new-team-message', handleNewTeamMessage);
      socket.off('user-joined-team', handleUserJoinedTeam);
      socket.off('user-typing-team', handleUserTyping);
      socket.off('message-read', handleMessageRead);
      socket.off('error', handleError);
    };
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || sending) return;

    try {
      setSending(true);

      if (chatType === 'direct' && directChatUserId) {
        // Gửi tin nhắn riêng qua API
        const res = await axiosInstance.post(`/api/messages/direct/${directChatUserId}`, {
          content: messageContent.trim()
        });
        
        if (res.status === 201 && res.data?.message) {
          // Thêm tin nhắn mới vào danh sách
          setMessages(prev => [...prev, res.data.message]);
          setMessageContent("");
          scrollToBottom();
        }
      } else if (selectedTeamId) {
        // Gửi tin nhắn team qua socket
        const socket = getSocket();
        socket.emit('send-team-message', {
          teamId: selectedTeamId,
          content: messageContent.trim()
        });
        setMessageContent("");
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err?.response?.data?.message || "Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const formatTime = (dateString: string | Date) => {
    if (!dateString) return 'Không xác định';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Không hợp lệ';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarColor = (str: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#6C5CE7'
    ];
    const index = str.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getSenderName = (message: Message) => {
    if (typeof message.sender_id === 'object' && message.sender_id?.full_name) {
      return message.sender_id.full_name;
    }
    return 'Người dùng';
  };

  const getSenderAvatar = (message: Message) => {
    if (typeof message.sender_id === 'object') {
      if (message.sender_id.avatar) return message.sender_id.avatar;
      const name = message.sender_id.full_name || message.sender_id.email || 'U';
      return name[0]?.toUpperCase() || 'U';
    }
    return 'U';
  };

  const isOwnMessage = (message: Message) => {
    const senderId = typeof message.sender_id === 'object' 
      ? message.sender_id._id 
      : message.sender_id;
    return senderId === currentUserId;
  };

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>, userId: string, userName: string) => {
    // Chỉ hiển thị menu nếu không phải tin nhắn của chính mình
    if (userId !== currentUserId) {
      setAvatarMenuAnchor(event.currentTarget);
      setSelectedUserId(userId);
      setSelectedUserName(userName);
    }
  };

  const handleCloseAvatarMenu = () => {
    setAvatarMenuAnchor(null);
    setSelectedUserId(null);
    setSelectedUserName(null);
  };

  const handleSendDirectMessage = () => {
    if (selectedUserId && selectedUserName) {
      // Lưu thông tin user từ menu (đã có từ avatar click)
      // Tìm thông tin đầy đủ từ messages hiện tại
      const userInfo = findUserInfoFromMessages(selectedUserId);
      
      if (userInfo) {
        setDirectChatUser(userInfo);
      } else {
        // Fallback: tạo từ thông tin đã có
        setDirectChatUser({
          _id: selectedUserId,
          full_name: selectedUserName,
          email: '',
          avatar: ''
        });
      }
      
      // Chuyển đến trang tin nhắn riêng với userId
      router.push(`/messages?type=direct&userId=${selectedUserId}`);
      handleCloseAvatarMenu();
    }
  };

  // Hàm chuyển thẳng sang tin nhắn riêng tư từ dialog thành viên
  const handleDirectMessageFromMember = (userId: string, userInfo: { _id: string; full_name: string; email: string; avatar?: string }) => {
    // Set thông tin user
    setDirectChatUser(userInfo);
    setDirectChatUserId(userId);
    
    // Chuyển sang tab direct
    setActiveTab(1);
    setChatType('direct');
    
    // Fetch messages và chuyển router
    fetchDirectMessages(userId);
    router.push(`/messages?type=direct&userId=${userId}`);
    
    // Đóng dialog
    setMembersDialogOpen(false);
  };

  const findUserInfoFromMessages = (userId: string) => {
    // Tìm thông tin user từ messages hiện tại
    for (const msg of messages) {
      const senderId = typeof msg.sender_id === 'object' 
        ? msg.sender_id._id 
        : msg.sender_id;
      
      if (senderId === userId && typeof msg.sender_id === 'object') {
        return {
          _id: msg.sender_id._id,
          full_name: msg.sender_id.full_name || 'Người dùng',
          email: msg.sender_id.email || '',
          avatar: msg.sender_id.avatar || ''
        };
      }
    }
    return null;
  };

  const fetchDirectMessages = async (userId: string) => {
    try {
      setLoadingMessages(true);
      const res = await axiosInstance.get(`/api/messages/direct/${userId}`, {
        params: {
          limit: 50
        }
      });
      
      if (res.status === 200 && res.data?.messages) {
        const msgs = Array.isArray(res.data.messages) ? res.data.messages : [];
        setMessages(msgs);
        
        // Lấy thông tin user từ messages (sender hoặc receiver)
        if (msgs.length > 0 && !directChatUser) {
          const firstMsg = msgs[0];
          // Xác định user đối thoại (không phải currentUserId)
          const otherUserId = typeof firstMsg.sender_id === 'object' 
            ? firstMsg.sender_id._id 
            : firstMsg.sender_id;
          
          if (otherUserId === currentUserId) {
            // Nếu sender là mình, lấy receiver
            if (firstMsg.receiver_id && typeof firstMsg.receiver_id === 'object') {
              setDirectChatUser({
                _id: firstMsg.receiver_id._id,
                full_name: firstMsg.receiver_id.full_name || 'Người dùng',
                email: firstMsg.receiver_id.email || '',
                avatar: firstMsg.receiver_id.avatar || ''
              });
            }
          } else {
            // Nếu sender là người khác, lấy sender
            if (typeof firstMsg.sender_id === 'object') {
              setDirectChatUser({
                _id: firstMsg.sender_id._id,
                full_name: firstMsg.sender_id.full_name || 'Người dùng',
                email: firstMsg.sender_id.email || '',
                avatar: firstMsg.sender_id.avatar || ''
              });
            }
          }
        }
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.error("Error fetching direct messages:", err);
      setError(err?.response?.data?.message || "Không thể tải tin nhắn");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await axiosInstance.get('/api/messages/conversations', {
        params: {
          limit: 50
        }
      });
      
      if (res.status === 200 && res.data?.conversations) {
        const convs = Array.isArray(res.data.conversations) ? res.data.conversations : [];
        setConversations(convs);
      } else {
        setConversations([]);
      }
    } catch (err: any) {
      console.error("Error fetching conversations:", err);
      setError(err?.response?.data?.message || "Không thể tải danh sách cuộc trò chuyện");
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: 0 | 1) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      // Chuyển về team chat
      setChatType('team');
      setDirectChatUserId(null);
      setDirectChatUser(null);
      setMessages([]);
      router.push('/messages');
      
      // Nếu đã có selectedProjectId, fetch lại messages
      if (selectedProjectId) {
        fetchTeamAndMessages(selectedProjectId);
      } else if (projects.length > 0) {
        // Nếu chưa có project được chọn, chọn project đầu tiên
        const firstProjectId = projects[0]._id;
        setSelectedProjectId(firstProjectId);
        fetchTeamAndMessages(firstProjectId);
      }
    } else {
      // Chuyển sang direct chat
      setChatType('direct');
      setDirectChatUserId(null);
      setDirectChatUser(null);
      setMessages([]);
      setSupervisor(null);
      fetchConversations();
    }
  };

  const handleConversationClick = (userId: string, userInfo: Conversation['user']) => {
    setDirectChatUserId(userId);
    setDirectChatUser(userInfo);
    setChatType('direct');
    fetchDirectMessages(userId);
    router.push(`/messages?type=direct&userId=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ResponsiveSidebar />
        <main className="p-4 md:p-6 md:ml-56">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Stack spacing={2} alignItems="center">
              <CircularProgress size={40} sx={{ color: '#FF6B6B' }} />
              <Typography variant="body2" color="text.secondary">
                Đang tải...
              </Typography>
            </Stack>
          </Box>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 via-purple-50 to-pink-50">
      <ResponsiveSidebar />
      <main className="p-4 md:p-6 md:ml-56 transition-all duration-300">
        <div className="mx-auto w-full max-w-7xl">
          {/* Header */}
          <Fade in timeout={600}>
            <div className="mb-6 md:mb-8">
              <div className="text-[10px] md:text-xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">
                Tin nhắn
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">
                {isSupervisor 
                  ? (activeTab === 0 ? 'Tin nhắn nhóm - Giảng viên' : 'Tin nhắn cá nhân - Giảng viên')
                  : (activeTab === 0 ? 'Tin nhắn nhóm' : 'Tin nhắn cá nhân')
                }
              </h1>
              <div className="mt-2 w-24 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"></div>
              
              {/* Tabs */}
              <div className="mt-6">
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      minHeight: 48,
                    },
                    '& .Mui-selected': {
                      color: '#6366f1 !important',
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#6366f1',
                      height: 3,
                    },
                  }}
                >
                  <Tab
                    icon={<GroupIcon />}
                    iconPosition="start"
                    label="Tin nhắn nhóm"
                    value={0}
                  />
                  <Tab
                    icon={<PersonIcon />}
                    iconPosition="start"
                    label="Tin nhắn cá nhân"
                    value={1}
                  />
                </Tabs>
              </div>
            </div>
          </Fade>

          {error && (
            <Fade in timeout={300}>
              <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl shadow-lg backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <p className="text-sm font-semibold text-red-700">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-500 hover:text-red-700 transition-colors duration-200 hover:scale-110"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </Fade>
          )}

          <div className={`grid ${(selectedProjectId || (activeTab === 1 && directChatUserId)) ? 'md:grid-cols-[380px_1fr]' : 'md:grid-cols-1'} grid-cols-1 gap-4 md:gap-6 h-[calc(100vh-180px)] transition-all duration-300 ease-in-out`}>
            {/* Sidebar - Projects List hoặc Conversations List */}
            <Slide direction="right" in={!(selectedProjectId || (activeTab === 1 && directChatUserId)) || (typeof window !== 'undefined' && window.innerWidth >= 900)} timeout={400}>
              <div className={`${(selectedProjectId || (activeTab === 1 && directChatUserId)) ? 'hidden md:flex' : 'flex'} flex-col h-full overflow-hidden bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20`}>
                {activeTab === 0 ? (
                  // Projects List cho team chat
                  <>
                    <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 border-b border-purple-300/30 shadow-lg">
                      <h2 className="text-xl font-bold text-white drop-shadow-md">Dự án</h2>
                      <p className="text-sm text-white/90 font-medium mt-1">{projects.length} dự án</p>
                    </div>
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent">
                  {projects.map((project, index) => {
                    const isSelected = selectedProjectId === project._id;
                    return (
                      <Fade in timeout={300} key={project._id} style={{ transitionDelay: `${index * 50}ms` }}>
                        <button
                          onClick={() => setSelectedProjectId(project._id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left group ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 shadow-md'
                              : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50/30 border-l-4 border-transparent'
                          }`}
                        >
                          <div 
                            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                            style={{ backgroundColor: getAvatarColor(project.code || project.topic) }}
                          >
                            {project.code?.[0]?.toUpperCase() || project.topic?.[0]?.toUpperCase() || 'P'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                              {project.topic || project.code}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{project.code}</p>
                          </div>
                          {isSelected && (
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                          )}
                        </button>
                      </Fade>
                    );
                  })}
                  {projects.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-sm text-gray-500">Chưa có dự án nào</p>
                    </div>
                  )}
                </div>
                  </>
                ) : (
                  // Conversations List cho direct chat
                  <>
                    <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 border-b border-purple-300/30 shadow-lg">
                      <h2 className="text-xl font-bold text-white drop-shadow-md">Cuộc trò chuyện</h2>
                      <p className="text-sm text-white/90 font-medium mt-1">{conversations.length} cuộc trò chuyện</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent">
                      {loadingConversations ? (
                        <Stack spacing={2} sx={{ p: 2 }}>
                          {[1, 2, 3].map((i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                              <Skeleton variant="circular" width={40} height={40} />
                              <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 2 }} />
                            </Box>
                          ))}
                        </Stack>
                      ) : conversations.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                            <PersonIcon className="text-white text-2xl" />
                          </div>
                          <p className="text-sm text-gray-500 font-medium">Chưa có cuộc trò chuyện nào</p>
                          <p className="text-xs text-gray-400 mt-1">Bắt đầu trò chuyện với ai đó!</p>
                        </div>
                      ) : (
                        conversations.map((conv, index) => {
                          const isSelected = directChatUserId === conv.user._id;
                          return (
                            <Fade in timeout={300} key={conv.user._id} style={{ transitionDelay: `${index * 50}ms` }}>
                              <button
                                onClick={() => handleConversationClick(conv.user._id, conv.user)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left group ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 shadow-md'
                                    : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50/30 border-l-4 border-transparent'
                                }`}
                              >
                                <div className="relative flex-shrink-0">
                                  {conv.user.avatar ? (
                                    <Avatar
                                      src={conv.user.avatar}
                                      alt={conv.user.full_name}
                                      className="w-11 h-11 shadow-lg"
                                    />
                                  ) : (
                                    <div 
                                      className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
                                      style={{ backgroundColor: getAvatarColor(conv.user.full_name || conv.user.email || '') }}
                                    >
                                      {conv.user.full_name?.[0]?.toUpperCase() || conv.user.email?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                  )}
                                  {conv.unreadCount > 0 && (
                                    <Badge
                                      badgeContent={conv.unreadCount}
                                      color="error"
                                      sx={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -4,
                                        '& .MuiBadge-badge': {
                                          fontSize: '0.7rem',
                                          minWidth: '18px',
                                          height: '18px',
                                        },
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                                      {conv.user.full_name || conv.user.email || 'Người dùng'}
                                    </p>
                                    {conv.lastMessage && (
                                      <p className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                        {formatTime(conv.lastMessage.time)}
                                      </p>
                                    )}
                                  </div>
                                  {conv.lastMessage && (
                                    <p className={`text-xs truncate ${isSelected ? 'text-gray-600' : 'text-gray-500'} ${conv.unreadCount > 0 ? 'font-semibold' : ''}`}>
                                      {conv.lastMessage.sender_id._id === currentUserId ? 'Bạn: ' : ''}
                                      {conv.lastMessage.content}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                )}
                              </button>
                            </Fade>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </Slide>

            {/* Chat Interface */}
            {(selectedProjectId || (activeTab === 1 && directChatUserId)) ? (
              <Slide direction="left" in timeout={400}>
                <div className="flex flex-col h-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                  {/* Chat Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 border-b border-purple-300/30 shadow-lg">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          if (chatType === 'direct') {
                            router.push('/messages');
                            setChatType('team');
                            setDirectChatUserId(null);
                            setDirectChatUser(null);
                          } else {
                            setSelectedProjectId(null);
                            setSelectedTeamId(null);
                            setTeam(null);
                            setSupervisor(null);
                          }
                        }}
                        className="md:hidden p-2 rounded-xl hover:bg-white/20 transition-all duration-200 active:scale-95"
                      >
                        <ArrowBackIcon className="text-white" />
                      </button>
                      {chatType === 'direct' ? (
                        // Direct chat header
                        directChatUser ? (
                          <>
                            {directChatUser.avatar ? (
                              <Avatar
                                src={directChatUser.avatar}
                                alt={directChatUser.full_name}
                                className="w-12 h-12 shadow-lg"
                              />
                            ) : (
                              <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
                                style={{ backgroundColor: getAvatarColor(directChatUser.full_name || directChatUser.email || '') }}
                              >
                                {directChatUser.full_name?.[0]?.toUpperCase() || directChatUser.email?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-white drop-shadow-md">
                                {directChatUser.full_name || directChatUser.email || 'Người dùng'}
                              </h3>
                              <p className="text-sm text-white/90 font-medium">
                                Tin nhắn riêng tư
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white drop-shadow-md">
                              Đang tải...
                            </h3>
                          </div>
                        )
                      ) : (
                        // Team chat header
                        (() => {
                          const project = projects.find(p => p._id === selectedProjectId);
                          return (
                            <>
                              <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
                                style={{ backgroundColor: getAvatarColor(project?.code || project?.topic || '') }}
                              >
                                {project?.code?.[0]?.toUpperCase() || project?.topic?.[0]?.toUpperCase() || 'P'}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white drop-shadow-md">
                                  {project?.topic || project?.code || 'Dự án'}
                                </h3>
                                <p className="text-sm text-white/90 font-medium">
                                  {team ? `${team.team_member.length + (supervisor ? 1 : 0)} thành viên` : 'Đang tải...'}
                                </p>
                              </div>
                              {team && (
                                <IconButton
                                  onClick={() => setMembersDialogOpen(true)}
                                  className="text-white hover:bg-white/20 transition-all duration-200"
                                  sx={{
                                    color: 'white',
                                    '&:hover': {
                                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    },
                                  }}
                                >
                                  <PeopleIcon />
                                </IconButton>
                              )}
                            </>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div
                    ref={messagesContainerRef}
                    onScroll={() => {
                      // Khi scroll, đánh dấu tin nhắn đã đọc
                      const container = messagesContainerRef.current;
                      if (!container) return;
                      
                      // Kiểm tra nếu scroll gần cuối (trong 200px)
                      const isNearBottom = 
                        container.scrollHeight - container.scrollTop - container.clientHeight < 200;
                      
                      if (isNearBottom) {
                        markUnreadMessagesAsRead();
                      }
                    }}
                    className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-slate-50 via-purple-50/30 to-pink-50/30 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent"
                  >
                    {loadingMessages ? (
                      <Stack spacing={2}>
                        {[1, 2, 3].map((i) => (
                          <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                            <Skeleton variant="circular" width={40} height={40} />
                            <Skeleton variant="rectangular" width="60%" height={60} sx={{ borderRadius: 2 }} />
                          </Box>
                        ))}
                      </Stack>
                    ) : (activeTab === 0 && !team) ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8 bg-white/50 rounded-2xl backdrop-blur-sm border border-purple-200/50">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <p className="text-base font-semibold text-gray-700">Dự án này chưa có team</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8">
                          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                            <SendIcon className="text-white text-4xl" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-700 mb-2">Chưa có tin nhắn nào</h3>
                          <p className="text-sm text-gray-500">Hãy bắt đầu cuộc trò chuyện!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg, index) => {
                          const isOwn = isOwnMessage(msg);
                          return (
                            <Fade in timeout={400} key={`${msg._id}-${index}`} style={{ transitionDelay: `${index * 50}ms` }}>
                              <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar - hiển thị cho cả tin nhắn của mình và người khác */}
                                <div className="flex-shrink-0">
                                  {isOwn ? (
                                    // Avatar cho tin nhắn của chính mình - ưu tiên currentUser từ socket
                                    currentUser?.avatar ? (
                                      <Avatar
                                        src={currentUser.avatar}
                                        alt={currentUser.full_name}
                                        className="w-8 h-8 shadow-md"
                                      />
                                    ) : (
                                      <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
                                        style={{ backgroundColor: getAvatarColor(currentUser?.full_name || currentUser?.email || 'User') }}
                                      >
                                        {currentUser?.full_name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                                      </div>
                                    )
                                  ) : (
                                    // Avatar cho tin nhắn của người khác - có thể click để gửi tin nhắn riêng
                                    (() => {
                                      const senderId = typeof msg.sender_id === 'object' 
                                        ? msg.sender_id._id 
                                        : msg.sender_id;
                                      const senderName = getSenderName(msg);
                                      
                                      return msg.sender_id?.avatar ? (
                                        <Avatar
                                          src={msg.sender_id.avatar}
                                          alt={senderName}
                                          className="w-8 h-8 shadow-md cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all duration-200"
                                          onClick={(e) => handleAvatarClick(e, senderId, senderName)}
                                        />
                                      ) : (
                                        <div 
                                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all duration-200"
                                          style={{ backgroundColor: getAvatarColor(senderName) }}
                                          onClick={(e) => handleAvatarClick(e, senderId, senderName)}
                                        >
                                          {getSenderAvatar(msg)}
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                                <div className={`max-w-[75%] md:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                  {!isOwn && (
                                    <p className="text-xs font-semibold text-gray-600 px-2">
                                      {getSenderName(msg)}
                                    </p>
                                  )}
                                  <div
                                    className={`px-4 py-2.5 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg ${
                                      isOwn
                                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-br-sm'
                                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                                    }`}
                                  >
                                    <p className={`text-sm ${isOwn ? 'text-white' : 'text-gray-800'} break-words`}>
                                      {msg.content}
                                    </p>
                                    <div className={`flex flex-col gap-1 mt-1.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                                      <div className={`flex items-center gap-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                        <p className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                                          {formatTime(msg.time || msg.createAt)}
                                        </p>
                                        {/* Hiển thị read receipt cho tin nhắn của chính mình */}
                                        {isOwn && (
                                          <div className="flex items-center">
                                            {msg.read_by && msg.read_by.length > 0 ? (
                                              <CheckCircleIcon 
                                                sx={{ 
                                                  fontSize: 14, 
                                                  color: 'white',
                                                  opacity: 0.9
                                                }} 
                                              />
                                            ) : (
                                              <CheckCircleOutlineIcon 
                                                sx={{ 
                                                  fontSize: 14, 
                                                  color: 'white',
                                                  opacity: 0.6
                                                }} 
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {/* Hiển thị avatars của người đã đọc (chỉ cho tin nhắn của chính mình) */}
                                      {isOwn && msg.read_by && msg.read_by.length > 0 && (
                                        <div className="flex items-center gap-1 -ml-1">
                                          {msg.read_by.slice(0, 4).map((reader, index) => {
                                            // Lấy thông tin user từ reader
                                            const userId = typeof reader.user_id === 'object' 
                                              ? reader.user_id._id 
                                              : reader.user_id;
                                            const userAvatar = typeof reader.user_id === 'object' 
                                              ? reader.user_id.avatar 
                                              : reader.avatar;
                                            const userName = typeof reader.user_id === 'object' 
                                              ? reader.user_id.full_name 
                                              : reader.full_name;
                                            const userEmail = typeof reader.user_id === 'object' 
                                              ? reader.user_id.email 
                                              : reader.email;
                                            
                                            return (
                                              <div
                                                key={`reader-${userId || `index-${index}`}-${index}`}
                                                className="relative"
                                                title={userName || userEmail || 'Người dùng'}
                                              >
                                                {userAvatar ? (
                                                  <Avatar
                                                    src={userAvatar}
                                                    alt={userName || 'User'}
                                                    sx={{
                                                      width: 16,
                                                      height: 16,
                                                      border: '1.5px solid white',
                                                      marginLeft: index > 0 ? '-4px' : 0,
                                                      zIndex: 4 - index,
                                                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                  />
                                                ) : (
                                                  <div
                                                    className="rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                                                    style={{
                                                      width: 16,
                                                      height: 16,
                                                      backgroundColor: getAvatarColor(userName || userEmail || 'User'),
                                                      border: '1.5px solid white',
                                                      marginLeft: index > 0 ? '-4px' : 0,
                                                      zIndex: 4 - index,
                                                    }}
                                                  >
                                                    {(userName?.[0] || userEmail?.[0] || 'U').toUpperCase()}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                          {/* Hiển thị số lượng người đọc còn lại nếu > 4 */}
                                          {msg.read_by.length > 4 && (
                                            <div
                                              className="rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-gray-600 border border-white shadow-sm"
                                              style={{
                                                width: 16,
                                                height: 16,
                                                marginLeft: '-4px',
                                                zIndex: 0,
                                              }}
                                              title={`${msg.read_by.length - 4} người khác đã đọc`}
                                            >
                                              +{msg.read_by.length - 4}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Fade>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="px-4 py-4 bg-white border-t border-gray-200 shadow-lg">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all duration-200">
                      <input
                        type="text"
                        placeholder="Nhập tin nhắn..."
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sending || (chatType === 'team' && !team) || (chatType === 'direct' && !directChatUserId)}
                        className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageContent.trim() || sending || (chatType === 'team' && !team) || (chatType === 'direct' && !directChatUserId)}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${
                          messageContent.trim() && !sending && ((chatType === 'team' && team) || (chatType === 'direct' && directChatUserId))
                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-110 active:scale-95'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {sending ? (
                          <CircularProgress size={20} sx={{ color: 'white' }} />
                        ) : (
                          <SendIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </Slide>
            ) : (
              <Fade in timeout={600}>
                <div className="flex items-center justify-center h-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20">
                  <div className="text-center p-12">
                    <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                      {activeTab === 0 ? (
                        <GroupIcon className="text-white text-6xl" />
                      ) : (
                        <PersonIcon className="text-white text-6xl" />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                      {activeTab === 0 
                        ? 'Chọn một dự án để bắt đầu trò chuyện'
                        : 'Chọn một cuộc trò chuyện để xem tin nhắn'}
                    </h3>
                    <p className="text-gray-500 font-medium">
                      {activeTab === 0
                        ? 'Chọn từ danh sách bên trái để xem và gửi tin nhắn'
                        : 'Chọn từ danh sách bên trái để xem và gửi tin nhắn riêng tư'}
                    </p>
                  </div>
                </div>
              </Fade>
            )}
          </div>
        </div>
      </main>

      {/* Menu dropdown khi click avatar */}
      <Menu
        anchorEl={avatarMenuAnchor}
        open={Boolean(avatarMenuAnchor)}
        onClose={handleCloseAvatarMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: 2,
          }
        }}
      >
        <MenuItem onClick={handleSendDirectMessage}>
          <ListItemIcon>
            <MessageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Gửi tin nhắn riêng tư</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialog hiển thị danh sách thành viên */}
      <Dialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 700,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <PeopleIcon />
          <span>Thành viên nhóm</span>
          {team && (
            <Chip
              label={`${team.team_member.length + (supervisor ? 1 : 0)} thành viên`}
              size="small"
              sx={{
                ml: 'auto',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {(team && team.team_member.length > 0) || supervisor ? (
            <List sx={{ py: 1 }}>
              {/* Hiển thị supervisor đầu tiên nếu có */}
              {supervisor && (
                <div key={`supervisor-${supervisor._id}`}>
                  <ListItem
                    sx={{
                      py: 2,
                      px: 3,
                      '&:hover': {
                        backgroundColor: '#f5f3ff',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      {supervisor.avatar ? (
                        <Avatar
                          src={supervisor.avatar}
                          alt={supervisor.full_name}
                          sx={{
                            width: 48,
                            height: 48,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        />
                      ) : (
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            bgcolor: getAvatarColor(supervisor.full_name),
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            fontWeight: 700,
                          }}
                        >
                          {supervisor.full_name[0]?.toUpperCase() || 'G'}
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {supervisor.full_name}
                          </Typography>
                          <Chip
                            label="Giảng viên hướng dẫn"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {supervisor.email}
                        </Typography>
                      }
                    />
                    {supervisor._id !== currentUserId && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          handleDirectMessageFromMember(supervisor._id, {
                            _id: supervisor._id,
                            full_name: supervisor.full_name,
                            email: supervisor.email,
                            avatar: supervisor.avatar
                          });
                        }}
                        sx={{
                          color: '#6366f1',
                          '&:hover': {
                            backgroundColor: '#eef2ff',
                          },
                        }}
                      >
                        <MessageIcon fontSize="small" />
                      </IconButton>
                    )}
                  </ListItem>
                  {(team && team.team_member.length > 0) && <Divider />}
                </div>
              )}
              {/* Hiển thị team members */}
              {team && team.team_member
                .filter((member) => {
                  // Lọc bỏ các member không có user_id
                  if (!member || !member.user_id) return false;
                  // Lọc bỏ team member nếu họ cũng là supervisor (đã hiển thị ở trên)
                  if (!supervisor) return true;
                  const userId = typeof member.user_id === 'object' && member.user_id !== null
                    ? member.user_id._id 
                    : member.user_id;
                  return userId && userId !== supervisor._id;
                })
                .map((member, index) => {
                const user = member.user_id;
                const isLeader = member.team_leader === 1;
                const userName = typeof user === 'object' && user !== null ? (user.full_name || user.email || 'Người dùng') : 'Người dùng';
                const userEmail = typeof user === 'object' && user !== null ? user.email : '';
                const userAvatar = typeof user === 'object' && user !== null ? user.avatar : '';
                const userId = typeof user === 'object' && user !== null ? user._id : user;
                
                return (
                  <div key={`team-member-${userId || 'unknown'}-${index}`}>
                    <ListItem
                      sx={{
                        py: 2,
                        px: 3,
                        '&:hover': {
                          backgroundColor: '#f5f3ff',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        {userAvatar ? (
                          <Avatar
                            src={userAvatar}
                            alt={userName}
                            sx={{
                              width: 48,
                              height: 48,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                          />
                        ) : (
                          <Avatar
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: getAvatarColor(userName),
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              fontWeight: 700,
                            }}
                          >
                            {userName[0]?.toUpperCase() || 'U'}
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {userName}
                            </Typography>
                            {isLeader && (
                              <Chip
                                label="Trưởng nhóm"
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {userEmail}
                          </Typography>
                        }
                      />
                      {typeof user === 'object' && user._id !== currentUserId && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            handleDirectMessageFromMember(user._id, {
                              _id: user._id,
                              full_name: userName,
                              email: userEmail,
                              avatar: userAvatar
                            });
                          }}
                          sx={{
                            color: '#6366f1',
                            '&:hover': {
                              backgroundColor: '#eef2ff',
                            },
                          }}
                        >
                          <MessageIcon fontSize="small" />
                        </IconButton>
                      )}
                    </ListItem>
                    {index < team.team_member.length - 1 && <Divider />}
                  </div>
                );
              })}
            </List>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {supervisor ? 'Chưa có thành viên team nào' : 'Chưa có thành viên nào'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button
            onClick={() => setMembersDialogOpen(false)}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

