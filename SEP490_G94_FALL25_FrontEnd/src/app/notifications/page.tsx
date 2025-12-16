"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "../../../ultis/axios";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  DeleteOutline as DeleteOutlineIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";

type Notification = {
  _id: string;
  type: string;
  action: string;
  message: string;
  priority: string;
  status: 'Read' | 'Unread';
  project_id?: { topic: string; code: string; _id?: string } | string;
  document_id?: { title: string; version: string };
  task_id?: { title: string };
  created_by?: { full_name: string; email: string };
  action_url?: string;
  metadata?: Record<string, any>;
  createAt: string;
  createdAt?: string; // Fallback nếu có
};

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<number | null>(null);
  const isSupervisor = userRole === 4;

  useEffect(() => {
    // Load user role
    (async () => {
      try {
        const userRes = await axiosInstance.get('/api/users/me');
        setUserRole(userRes.data?.role || null);
      } catch {
        setUserRole(null);
      }
    })();
    
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.get('/api/notifications', {
        params: { page, limit: 20 }
      });
      
      if (res.data?.notifications) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.pagination?.unread_count || 0);
        setTotalPages(res.data.pagination?.total_pages || 1);
      }
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError(err?.response?.data?.message || "Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await axiosInstance.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, status: 'Read' as const } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      handleCloseMenu();
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosInstance.patch('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, status: 'Read' as const })));
      setUnreadCount(0);
      handleCloseMenu();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notifications.find(n => n._id === id)?.status === 'Unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      handleCloseMenu();
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await axiosInstance.delete('/api/notifications/read/all');
      setNotifications(prev => prev.filter(n => n.status === 'Unread'));
      handleCloseMenu();
    } catch (err) {
      console.error("Error deleting all read:", err);
    }
  };

  const handleClickMenu = (event: React.MouseEvent<HTMLElement>, notificationId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notificationId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

 const handleNotificationClick = (notification: Notification) => {
    if (notification.status === 'Unread') {
      handleMarkAsRead(notification._id);
    }
    
    // Nếu type là Document, điều hướng đến trang documents của project
    if (notification.type === 'Document' || notification.type === 'document') {
      if (notification.project_id) {
        let projectId: string;
        if (typeof notification.project_id === 'object') {
          // project_id đã được populate - lấy _id
          projectId = (notification.project_id as any)._id || '';
        } else {
          // project_id là string (chưa populate)
          projectId = notification.project_id;
        }
        if (projectId) {
          router.push(`/projects/${projectId}/documents`);
          return;
        }
      }
    }
    
    // Fallback: dùng action_url nếu có
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const formatTime = (notification: Notification) => {
    const dateString = notification.createAt || notification.createdAt;
    if (!dateString) return 'Không xác định';
    
    const date = new Date(dateString);
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
    return date.toLocaleDateString('vi-VN');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'info';
      default: return 'default';
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-white text-black">
        <ResponsiveSidebar />
        <main className="p-4 md:p-6 md:ml-56">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <ResponsiveSidebar />
      <main className="p-4 md:p-6 md:ml-56">
        <div className="mx-auto w-full max-w-4xl">
          {/* Header */}
          <div className="mb-6 md:mb-8 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[10px] md:text-xs uppercase tracking-wider text-black">
                Thông báo
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-black">
                {isSupervisor ? 'Thông báo của giảng viên' : 'Thông báo của tôi'}
              </h1>
              {unreadCount > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {unreadCount} thông báo chưa đọc
                </Typography>
              )}
            </div>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={fetchNotifications}
                disabled={loading}
              >
                Làm mới
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MarkEmailReadIcon />}
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0 || loading}
              >
                Đánh dấu tất cả đã đọc
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteOutlineIcon />}
                onClick={handleDeleteAllRead}
                disabled={loading}
              >
                Xóa đã đọc
              </Button>
            </Stack>
          </div>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                  Không có thông báo nào
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={2}>
              {notifications.map((notification) => (
                <Card
                  key={notification._id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: notification.status === 'Unread' ? '#fff3e0' : 'white',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Box flex={1}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          {notification.status === 'Unread' && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: '#ff9800',
                              }}
                            />
                          )}
                          <Typography
                            variant="subtitle1"
                            fontWeight={notification.status === 'Unread' ? 600 : 400}
                          >
                            {notification.message}
                          </Typography>
                          <Chip
                            label={notification.priority}
                            size="small"
                            color={getPriorityColor(notification.priority) as any}
                            sx={{ ml: 'auto' }}
                          />
                        </Stack>
                        
                        {notification.project_id && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Dự án: {typeof notification.project_id === 'object' 
                              ? `${notification.project_id.topic} (${notification.project_id.code})`
                              : notification.project_id}
                          </Typography>
                        )}
                        
                        {notification.document_id && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Tài liệu: {notification.document_id.title} (v{notification.document_id.version})
                          </Typography>
                        )}

                        {notification.created_by && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Người gửi: {notification.created_by.full_name}
                          </Typography>
                        )}

                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {formatTime(notification)}
                        </Typography>
                      </Box>

                      <IconButton
                        size="small"
                        onClick={(e) => handleClickMenu(e, notification._id)}
                        sx={{ ml: 'auto' }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                disabled={page === 1}
                onClick={() => setPage(prev => prev - 1)}
              >
                Trước
              </Button>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                Trang {page} / {totalPages}
              </Typography>
              <Button
                variant="outlined"
                disabled={page === totalPages}
                onClick={() => setPage(prev => prev + 1)}
              >
                Sau
              </Button>
            </Box>
          )}
        </div>
      </main>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {selectedNotification && notifications.find(n => n._id === selectedNotification)?.status === 'Unread' && (
          <MenuItem onClick={() => handleMarkAsRead(selectedNotification)}>
            <ListItemIcon>
              <MarkEmailReadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Đánh dấu đã đọc</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => selectedNotification && handleDelete(selectedNotification)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Xóa</ListItemText>
        </MenuItem>
      </Menu>
    </div>
  );
}
