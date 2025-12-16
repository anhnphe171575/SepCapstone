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
import {
  AddCircleOutline,
  Edit,
  Delete,
  Flag,
  Comment,
  CheckCircle,
  TrendingUp,
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

interface FeatureDetailsActivityProps {
  featureId: string | null;
  onUpdate?: () => void;
}

export default function FeatureDetailsActivity({ featureId, onUpdate }: FeatureDetailsActivityProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (featureId) {
      loadActivityLogs();
    }
  }, [featureId]);

  const loadActivityLogs = async () => {
    if (!featureId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/features/${featureId}/activity-logs`);
      setActivityLogs(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error: any) {
      console.error("Error loading activity logs:", error);
      setActivityLogs([]); 
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'CREATE_FEATURE':
        return <AddCircleOutline sx={{ fontSize: 20, color: '#10b981' }} />;
      case 'UPDATE_FEATURE':
      case 'FEATURE_TITLE_UPDATED':
      case 'FEATURE_DESCRIPTION_UPDATED':
        return <Edit sx={{ fontSize: 20, color: '#3b82f6' }} />;
      case 'FEATURE_STATUS_CHANGED':
        return <CheckCircle sx={{ fontSize: 20, color: '#8b5cf6' }} />;
      case 'FEATURE_PRIORITY_CHANGED':
        return <Flag sx={{ fontSize: 20, color: '#f59e0b' }} />;
      case 'CREATE_COMMENT':
      case 'UPDATE_COMMENT':
      case 'DELETE_COMMENT':
        return <Comment sx={{ fontSize: 20, color: '#6366f1' }} />;
      case 'CREATE_FUNCTION':
        return <AddCircleOutline sx={{ fontSize: 20, color: '#10b981' }} />;
      case 'UPDATE_FUNCTION':
        return <Edit sx={{ fontSize: 20, color: '#3b82f6' }} />;
      case 'DELETE_FUNCTION':
        return <Delete sx={{ fontSize: 20, color: '#ef4444' }} />;
      default:
        return <TrendingUp sx={{ fontSize: 20, color: '#6b7280' }} />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'CREATE_FEATURE':
      case 'CREATE_FUNCTION':
        return '#10b981';
      case 'DELETE_FUNCTION':
        return '#ef4444';
      case 'FEATURE_STATUS_CHANGED':
        return '#8b5cf6';
      case 'FEATURE_PRIORITY_CHANGED':
        return '#f59e0b';
      case 'CREATE_COMMENT':
      case 'UPDATE_COMMENT':
      case 'DELETE_COMMENT':
        return '#6366f1';
      default:
        return '#3b82f6';
    }
  };

  const formatActivityMessage = (log: ActivityLog) => {
    const { action, metadata } = log;
    const userName = log.created_by?.full_name || log.created_by?.email || 'Someone';

    if (action === 'CREATE_FEATURE') {
      return (
        <Typography fontSize="14px" color="text.primary">
          <strong>{userName}</strong> đã tạo tính năng này
        </Typography>
      );
    }
    
    if (action === 'UPDATE_FEATURE') {
      return (
        <Typography fontSize="14px" color="text.primary">
          <strong>{userName}</strong> đã cập nhật tính năng này
        </Typography>
      );
    }
    
    if (action === 'FEATURE_STATUS_CHANGED') {
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
    }
    
    if (action === 'FEATURE_PRIORITY_CHANGED') {
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
    }
    
    if (action === 'FEATURE_TITLE_UPDATED') {
      return (
        <Typography fontSize="14px" color="text.primary">
          <strong>{userName}</strong> đã cập nhật tiêu đề
        </Typography>
      );
    }
    
    if (action === 'FEATURE_DESCRIPTION_UPDATED') {
      return (
        <Typography fontSize="14px" color="text.primary">
          <strong>{userName}</strong> đã cập nhật mô tả
        </Typography>
      );
    }
    
    if (action === 'CREATE_COMMENT') {
      return (
        <Typography fontSize="14px" color="text.primary">
          <strong>{userName}</strong> đã thêm bình luận
        </Typography>
      );
    }
    
    if (action === 'UPDATE_COMMENT') {
      return (
        <Typography fontSize="14px" color="text.primary">
          <strong>{userName}</strong> đã cập nhật bình luận
        </Typography>
      );
    }
    
    if (action === 'DELETE_COMMENT') {
      return (
        <Typography fontSize="14px" color="text.primary">
          <strong>{userName}</strong> đã xóa bình luận
        </Typography>
      );
    }
    
    if (action.includes('FUNCTION')) {
      const functionTitle = metadata?.function_title || '';
      if (action === 'CREATE_FUNCTION') {
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã tạo chức năng: <strong>{functionTitle}</strong>
          </Typography>
        );
      }
      if (action === 'UPDATE_FUNCTION') {
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã cập nhật chức năng: <strong>{functionTitle}</strong>
          </Typography>
        );
      }
      if (action === 'DELETE_FUNCTION') {
        return (
          <Typography fontSize="14px" color="text.primary">
            <strong>{userName}</strong> đã xóa chức năng: <strong>{functionTitle}</strong>
          </Typography>
        );
      }
    }

    return (
      <Typography fontSize="14px" color="text.primary">
        <strong>{userName}</strong> đã thực hiện hành động: {action}
      </Typography>
    );
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const logDate = new Date(date);
    const diffMs = now.getTime() - logDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return logDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (activityLogs.length === 0) {
    return (
      <Box sx={{ 
        p: 6, 
        textAlign: 'center',
        bgcolor: '#fafbfc',
        borderRadius: 2,
        border: '1px dashed #e8e9eb'
      }}>
        <Typography fontSize="14px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
          Chưa có hoạt động nào
        </Typography>
        <Typography fontSize="12px" color="text.secondary">
          Nhật ký hoạt động sẽ xuất hiện ở đây khi bạn làm việc với tính năng này
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={2}>
        {activityLogs.map((log) => (
          <Box
            key={log._id}
            sx={{
              display: 'flex',
              gap: 2,
              p: 2.5,
              bgcolor: 'white',
              border: '1px solid #e8e9eb',
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#d1d5db',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
              }
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: `${getActivityColor(log.action)}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {getActivityIcon(log.action)}
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ mb: 1 }}>
                {formatActivityMessage(log)}
              </Box>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 20,
                    height: 20,
                    fontSize: '10px',
                    bgcolor: '#7b68ee',
                    fontWeight: 600
                  }}
                >
                  {(log.created_by?.full_name || log.created_by?.email || 'U')[0].toUpperCase()}
                </Avatar>
                <Typography fontSize="12px" color="text.secondary">
                  {formatTimeAgo(log.createdAt)}
                </Typography>
              </Stack>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

