"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
  Button,
} from "@mui/material";
import { getStatusById } from "@/constants/settings";
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

interface FunctionDetailsActivityProps {
  functionId: string | null;
}

export default function FunctionDetailsActivity({ functionId }: FunctionDetailsActivityProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    if (functionId) {
      loadActivityLogs(true);
    }
  }, [functionId]);

  const loadActivityLogs = async (reset = false) => {
    if (!functionId) return;
    
    try {
      setLoading(true);
      const currentSkip = reset ? 0 : skip;
      const response = await axiosInstance.get(`/api/functions/${functionId}/activity-logs`, {
        params: { limit: LIMIT, skip: currentSkip }
      });
      
      const newLogs = response.data.activity_logs || [];
      
      // Debug: log received activity logs
      if (process.env.NODE_ENV === 'development' && newLogs.length > 0) {
        console.log('Received activity logs:', newLogs.map((log: ActivityLog) => ({ action: log.action, metadata: log.metadata })));
      }
      
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
      case 'CREATE_FUNCTION':
        return <AddCircleOutline sx={{ fontSize: 20, color: '#10b981' }} />;
      case 'UPDATE_FUNCTION':
        return <Edit sx={{ fontSize: 20, color: '#3b82f6' }} />;
      case 'FUNCTION_STATUS_CHANGED':
        return <CheckCircle sx={{ fontSize: 20, color: '#10b981' }} />;
      case 'DELETE_FUNCTION':
        return <Delete sx={{ fontSize: 20, color: '#ef4444' }} />;
      case 'ADD_COMMENT':
        return <Comment sx={{ fontSize: 20, color: '#6366f1' }} />;
      default:
        return <SwapHoriz sx={{ fontSize: 20, color: '#6b7280' }} />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'CREATE_FUNCTION':
        return '#10b981';
      case 'FUNCTION_STATUS_CHANGED':
        return '#10b981';
      case 'DELETE_FUNCTION':
        return '#ef4444';
      case 'ADD_COMMENT':
        return '#6366f1';
      default:
        return '#3b82f6';
    }
  };

  const formatActivityMessage = (log: ActivityLog) => {
    const { action, metadata } = log;
    const userName = log.created_by?.full_name || log.created_by?.email || 'Ai đó';

    // Debug: log action to see what we're getting
    if (process.env.NODE_ENV === 'development') {
      console.log('Activity log action:', action, 'metadata:', metadata);
    }

    switch (action) {
      case 'CREATE_FUNCTION':
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã tạo chức năng này
          </Typography>
        );
      
      case 'DELETE_FUNCTION':
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã xóa chức năng này
          </Typography>
        );
      
      case 'ADD_COMMENT':
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã thêm bình luận
          </Typography>
        );
      
      case 'FUNCTION_STATUS_CHANGED':
        const oldStatus = metadata?.old_value ? getStatusById(metadata.old_value)?.name || metadata.old_value : null;
        const newStatus = metadata?.new_value ? getStatusById(metadata.new_value)?.name || metadata.new_value : null;
        return (
          <Box>
            <Typography fontSize="14px" color="text.primary">
              <strong>{userName}</strong> đã thay đổi trạng thái
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {oldStatus && (
                <Chip 
                  label={oldStatus} 
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
              {newStatus && (
                <Chip 
                  label={newStatus} 
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
      
      case 'UPDATE_FUNCTION':
        const changes = metadata?.changed ? metadata.changed.join(', ') : 'các trường';
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã cập nhật {changes}
          </Typography>
        );
      
      default:
        // Log unknown action for debugging
        console.warn('Unknown activity log action:', action, 'Full log:', log);
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã {action ? `thực hiện ${action}` : 'thực hiện một hành động'}
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
          Tất cả các thay đổi và cập nhật cho chức năng này sẽ hiển thị ở đây
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

