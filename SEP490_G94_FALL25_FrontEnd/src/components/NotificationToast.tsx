"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  Typography,
  IconButton,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { getSocket } from "./ResponsiveSidebar";

type Notification = {
  _id: string;
  type: string;
  action: string;
  message: string;
  priority: string;
  status: 'Read' | 'Unread';
  project_id?: { topic: string; code: string; _id?: string } | string;
  task_id?: { title: string; _id?: string } | string;
  created_by?: { full_name: string; email: string };
  action_url?: string;
  metadata?: Record<string, any>;
  createAt?: string;
  createdAt?: string;
};

export default function NotificationToast() {
  const router = useRouter();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    // Đảm bảo socket đã connect
    if (socket.connected) {
      console.log('[NotificationToast] Socket đã connected, sẵn sàng nhận notification');
    } else {
      console.log('[NotificationToast] Socket chưa connected, đợi connect...');
      socket.on("connect", () => {
        console.log('[NotificationToast] Socket đã connect');
      });
    }

    const handleNotification = (data: Notification) => {
      console.log('[NotificationToast] Nhận notification mới:', data);
      setNotification(data);
      setOpen(true);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
      socket.off("connect");
    };
  }, []);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handleClick = () => {
    if (!notification) return;

    // Đánh dấu đã đọc
    if (notification.status === 'Unread') {
      fetch(`http://localhost:5000/api/notifications/${notification._id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      }).catch(err => console.error('Error marking notification as read:', err));
    }

    // Điều hướng
    if (notification.action_url) {
      router.push(notification.action_url);
    } else if (notification.type === 'Task' && notification.task_id) {
      const taskId = typeof notification.task_id === 'object' 
        ? notification.task_id._id 
        : notification.task_id;
      const projectId = typeof notification.project_id === 'object'
        ? notification.project_id._id
        : notification.project_id;
      if (projectId && taskId) {
        router.push(`/projects/${projectId}/tasks?taskId=${taskId}`);
      }
    } else if (notification.type === 'Document' && notification.project_id) {
      const projectId = typeof notification.project_id === 'object'
        ? notification.project_id._id
        : notification.project_id;
      if (projectId) {
        router.push(`/projects/${projectId}/documents`);
      }
    } else {
      router.push('/notifications');
    }

    setOpen(false);
  };

  if (!notification) return null;

  const getSeverity = () => {
    switch (notification.priority) {
      case 'Urgent':
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'info';
      default:
        return 'info';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'Task':
        return '📋';
      case 'Document':
        return '📄';
      case 'Project':
        return '📁';
      case 'Defect':
        return '🐛';
      case 'Team':
        return '👥';
      default:
        return '🔔';
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ mt: 8 }}
      onClick={handleClick}
    >
      <Alert
        onClose={handleClose}
        severity={getSeverity()}
        variant="filled"
        sx={{
          width: '100%',
          minWidth: 350,
          maxWidth: 500,
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 6,
          },
        }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="h6" component="span" sx={{ fontSize: '18px' }}>
            {getIcon()}
          </Typography>
          <AlertTitle sx={{ mb: 0, fontWeight: 600, fontSize: '14px' }}>
            {notification.type === 'Task' ? 'Công việc' : 
             notification.type === 'Document' ? 'Tài liệu' :
             notification.type === 'Project' ? 'Dự án' :
             notification.type === 'Defect' ? 'Lỗi' :
             'Thông báo'}
          </AlertTitle>
          {notification.status === 'Unread' && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#fff',
                ml: 'auto',
              }}
            />
          )}
        </Box>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {notification.message}
        </Typography>
        {notification.project_id && (
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
            {typeof notification.project_id === 'object'
              ? `Dự án: ${notification.project_id.topic}`
              : `Dự án ID: ${notification.project_id}`}
          </Typography>
        )}
        {notification.created_by && (
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
            Từ: {notification.created_by.full_name}
          </Typography>
        )}
      </Alert>
    </Snackbar>
  );
}

