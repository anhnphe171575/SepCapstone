"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  Button,
} from "@mui/material";
import {
  AddCircleOutline,
  Edit,
  Delete,
  PersonAdd,
  Flag,
  Schedule,
  Comment,
  CheckCircle,
  TrendingUp,
  SwapHoriz,
} from "@mui/icons-material";
import axiosInstance from "../../../ultis/axios";

interface ActivityLog {
  _id: string;
  action: string;
  metadata: any;
  created_by: {
    _id: string;
    full_name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
}

interface TaskDetailsActivityProps {
  taskId: string | null;
}

export default function TaskDetailsActivity({ taskId }: TaskDetailsActivityProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    if (taskId) {
      loadActivityLogs(true);
    }
  }, [taskId]);

  const loadActivityLogs = async (reset = false) => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const currentSkip = reset ? 0 : skip;
      const response = await axiosInstance.get(`/api/tasks/${taskId}/activity-logs`, {
        params: { limit: LIMIT, skip: currentSkip }
      });
      
      const newLogs = response.data.activity_logs || [];
      
      if (reset) {
        setActivityLogs(newLogs);
      } else {
        setActivityLogs([...activityLogs, ...newLogs]);
      }
      
      setHasMore(response.data.has_more || false);
      setSkip(currentSkip + newLogs.length);
    } catch (error: any) {
      console.error("Error loading activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    loadActivityLogs(false);
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'CREATE_TASK':
        return <AddCircleOutline sx={{ fontSize: 20, color: '#10b981' }} />;
      case 'UPDATE_TASK':
        return <Edit sx={{ fontSize: 20, color: '#3b82f6' }} />;
      case 'DELETE_TASK':
        return <Delete sx={{ fontSize: 20, color: '#ef4444' }} />;
      case 'TASK_STATUS_CHANGED':
        return <CheckCircle sx={{ fontSize: 20, color: '#8b5cf6' }} />;
      case 'TASK_ASSIGNEE_CHANGED':
        return <PersonAdd sx={{ fontSize: 20, color: '#ec4899' }} />;
      case 'TASK_PRIORITY_CHANGED':
        return <Flag sx={{ fontSize: 20, color: '#f59e0b' }} />;
      case 'TASK_DEADLINE_CHANGED':
        return <Schedule sx={{ fontSize: 20, color: '#14b8a6' }} />;
      case 'TASK_PROGRESS_UPDATED':
        return <TrendingUp sx={{ fontSize: 20, color: '#06b6d4' }} />;
      case 'ADD_COMMENT':
        return <Comment sx={{ fontSize: 20, color: '#6366f1' }} />;
      default:
        return <SwapHoriz sx={{ fontSize: 20, color: '#6b7280' }} />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'CREATE_TASK':
        return '#10b981';
      case 'DELETE_TASK':
        return '#ef4444';
      case 'TASK_STATUS_CHANGED':
        return '#8b5cf6';
      case 'TASK_ASSIGNEE_CHANGED':
        return '#ec4899';
      case 'TASK_PRIORITY_CHANGED':
        return '#f59e0b';
      case 'TASK_DEADLINE_CHANGED':
        return '#14b8a6';
      case 'TASK_PROGRESS_UPDATED':
        return '#06b6d4';
      case 'ADD_COMMENT':
        return '#6366f1';
      default:
        return '#3b82f6';
    }
  };

  const formatActivityMessage = (log: ActivityLog) => {
    const { action, metadata } = log;
    const userName = log.created_by?.full_name || log.created_by?.email || 'Ai đó';

    switch (action) {
      case 'CREATE_TASK':
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã tạo công việc này
          </Typography>
        );
      
      case 'DELETE_TASK':
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã xóa công việc này
          </Typography>
        );
      
      case 'TASK_STATUS_CHANGED':
        return (
          <Box>
            <Typography fontSize="14px" color="text.primary">
              <strong>{userName}</strong> đã thay đổi trạng thái
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {metadata?.old_value && (
                <Chip 
                  label={metadata.old_value} 
                  size="small" 
                  sx={{ 
                    height: 22,
                    fontSize: '11px',
                    bgcolor: '#f3f4f6',
                    textDecoration: 'line-through',
                    opacity: 0.7
                  }} 
                />
              )}
              <Typography fontSize="12px" color="text.secondary">→</Typography>
              {metadata?.new_value && (
                <Chip 
                  label={metadata.new_value} 
                  size="small" 
                  sx={{ 
                    height: 22,
                    fontSize: '11px',
                    bgcolor: '#10b98115',
                    color: '#10b981',
                    fontWeight: 600
                  }} 
                />
              )}
            </Stack>
          </Box>
        );
      
      case 'TASK_ASSIGNEE_CHANGED':
        return (
          <Box>
            <Typography fontSize="14px" color="text.primary">
              <strong>{userName}</strong> đã thay đổi người thực hiện
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {metadata?.old_assignee && (
                <Chip 
                  label={metadata.old_assignee.full_name || metadata.old_assignee.email} 
                  size="small" 
                  sx={{ 
                    height: 22,
                    fontSize: '11px',
                    bgcolor: '#f3f4f6',
                    textDecoration: 'line-through',
                    opacity: 0.7
                  }} 
                />
              )}
              <Typography fontSize="12px" color="text.secondary">→</Typography>
              {metadata?.new_assignee && (
                <Chip 
                  label={metadata.new_assignee.full_name || metadata.new_assignee.email} 
                  size="small" 
                  sx={{ 
                    height: 22,
                    fontSize: '11px',
                    bgcolor: '#ec489915',
                    color: '#ec4899',
                    fontWeight: 600
                  }} 
                />
              )}
            </Stack>
          </Box>
        );
      
      case 'TASK_PRIORITY_CHANGED':
        return (
          <Box>
            <Typography fontSize="14px" color="text.primary">
              <strong>{userName}</strong> đã thay đổi ưu tiên
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {metadata?.old_value && (
                <Chip 
                  label={metadata.old_value} 
                  size="small" 
                  sx={{ 
                    height: 22,
                    fontSize: '11px',
                    bgcolor: '#f3f4f6',
                    textDecoration: 'line-through',
                    opacity: 0.7
                  }} 
                />
              )}
              <Typography fontSize="12px" color="text.secondary">→</Typography>
              {metadata?.new_value && (
                <Chip 
                  label={metadata.new_value} 
                  size="small" 
                  sx={{ 
                    height: 22,
                    fontSize: '11px',
                    bgcolor: '#f59e0b15',
                    color: '#f59e0b',
                    fontWeight: 600
                  }} 
                />
              )}
            </Stack>
          </Box>
        );
      
      case 'TASK_DEADLINE_CHANGED':
        return (
          <Box>
            <Typography fontSize="14px" color="text.primary">
              <strong>{userName}</strong> đã thay đổi hạn chót
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {metadata?.old_value && (
                <Typography fontSize="12px" color="text.secondary" sx={{ textDecoration: 'line-through', opacity: 0.7 }}>
                  {new Date(metadata.old_value).toLocaleDateString()}
                </Typography>
              )}
              <Typography fontSize="12px" color="text.secondary">→</Typography>
              {metadata?.new_value && (
                <Typography fontSize="12px" color="#14b8a6" fontWeight={600}>
                  {new Date(metadata.new_value).toLocaleDateString()}
                </Typography>
              )}
            </Stack>
          </Box>
        );
      
      case 'TASK_PROGRESS_UPDATED':
        return (
          <Box>
            <Typography fontSize="14px" color="text.primary">
              <strong>{userName}</strong> đã cập nhật tiến độ
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography fontSize="12px" color="text.secondary" sx={{ textDecoration: 'line-through', opacity: 0.7 }}>
                {metadata?.old_value || 0}%
              </Typography>
              <Typography fontSize="12px" color="text.secondary">→</Typography>
              <Typography fontSize="12px" color="#06b6d4" fontWeight={600}>
                {metadata?.new_value || 0}%
              </Typography>
            </Stack>
          </Box>
        );
      
      case 'ADD_COMMENT':
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã thêm bình luận
          </Typography>
        );
      
      case 'UPDATE_TASK':
        const fieldName = metadata?.field ? metadata.field.replace(/_/g, ' ') : 'field';
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã cập nhật {fieldName}
          </Typography>
        );
      
      default:
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã thực hiện một hành động
          </Typography>
        );
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  if (loading && activityLogs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (activityLogs.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Chưa có hoạt động nào
        </Typography>
        <Typography variant="body2" color="text.secondary" fontSize="13px">
          Tất cả thay đổi và cập nhật cho công việc này sẽ hiển thị ở đây
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
          Nhật ký hoạt động
        </Typography>
        <Typography variant="body2" color="text.secondary" fontSize="13px">
          {activityLogs.length} {activityLogs.length === 1 ? 'hoạt động' : 'hoạt động'}
        </Typography>
      </Box>

      {/* Timeline */}
      <Box sx={{ position: 'relative', pl: 1 }}>
        {/* Timeline Line */}
        <Box 
          sx={{ 
            position: 'absolute',
            left: '20px',
            top: '20px',
            bottom: '20px',
            width: '2px',
            bgcolor: '#e8e9eb',
            zIndex: 0
          }} 
        />

        {/* Activity Items */}
        <Stack spacing={3}>
          {activityLogs.map((log, index) => (
            <Box 
              key={log._id} 
              sx={{ 
                position: 'relative',
                display: 'flex',
                gap: 2,
              }}
            >
              {/* Timeline Dot */}
              <Box 
                sx={{ 
                  position: 'relative',
                  zIndex: 1,
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${getActivityColor(log.action)}15`,
                  borderRadius: '50%',
                  border: `2px solid ${getActivityColor(log.action)}`,
                }}
              >
                {getActivityIcon(log.action)}
              </Box>

              {/* Activity Content */}
              <Box sx={{ flex: 1, pt: 0.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 0.5 }}>
                  <Avatar 
                    src={log.created_by?.avatar}
                    sx={{ 
                      width: 24, 
                      height: 24,
                      fontSize: '11px',
                      bgcolor: '#7b68ee',
                      fontWeight: 600
                    }}
                  >
                    {(log.created_by?.full_name || log.created_by?.email || 'U')[0].toUpperCase()}
                  </Avatar>
                  
                  <Box sx={{ flex: 1 }}>
                    {formatActivityMessage(log)}
                    
                    <Typography 
                      fontSize="12px" 
                      color="text.secondary" 
                      sx={{ mt: 0.5 }}
                    >
                      {getRelativeTime(log.createdAt)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Load More Button */}
      {hasMore && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={loadMore}
            disabled={loading}
            sx={{
              fontSize: '13px',
              textTransform: 'none',
              borderColor: '#e8e9eb',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#7b68ee',
                bgcolor: '#7b68ee05'
              }
            }}
          >
            {loading ? 'Đang tải...' : 'Tải thêm'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
