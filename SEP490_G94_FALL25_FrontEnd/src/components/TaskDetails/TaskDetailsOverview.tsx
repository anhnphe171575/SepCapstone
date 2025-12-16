"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Paper,
  Grid,
  Slider,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";

interface TaskDetailsOverviewProps {
  task: any;
  onUpdate: (updates: any) => Promise<void>;
  readonly?: boolean;
}

export default function TaskDetailsOverview({ task, onUpdate, readonly = false }: TaskDetailsOverviewProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || '',
    priority: task?.priority || '',
    start_date: task?.start_date ? new Date(task.start_date).toISOString().split('T')[0] : '',
    deadline: task?.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
    estimate: task?.estimate || 0,
  });

  const handleSave = async () => {
    try {
      // Only update description field
      await onUpdate({ description: form.description });
      setEditing(false);
    } catch (error) {
      console.error("Error saving:", error);
      alert('Không thể lưu mô tả. Vui lòng thử lại.');
    }
  };

  const handleCancel = () => {
    setForm({
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || '',
      priority: task?.priority || '',
      start_date: task?.start_date ? new Date(task.start_date).toISOString().split('T')[0] : '',
      deadline: task?.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
      estimate: task?.estimate || 0,
    });
    setEditing(false);
  };

  const formatDate = (date: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const formatTime = (hours: number) => {
    if (!hours) return '0h';
    return `${hours}h`;
  };

  return (
    <Box>
      {/* Description Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography fontSize="13px" fontWeight={700} color="#6b7280" textTransform="uppercase">
            Mô tả
          </Typography>
          {!editing && !readonly && (
            <Button 
              size="small"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              onClick={() => setEditing(true)}
              sx={{ 
                textTransform: 'none', 
                fontSize: '13px',
                fontWeight: 600,
                color: '#6b7280',
                '&:hover': { bgcolor: '#f3f4f6' }
              }}
            >
              Chỉnh sửa
            </Button>
          )}
        </Box>
        
        {editing ? (
          <Box>
            <TextField 
              fullWidth
              multiline
              rows={8}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Thêm mô tả chi tiết hơn..."
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                  fontSize: '14px',
                  '&:hover fieldset': {
                    borderColor: '#7b68ee',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7b68ee',
                  }
                } 
              }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button 
                size="small"
                onClick={handleCancel}
                sx={{ 
                  textTransform: 'none', 
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#6b7280'
                }}
              >
                Hủy
              </Button>
              <Button 
                size="small"
                variant="contained"
                onClick={handleSave}
                sx={{ 
                  textTransform: 'none', 
                  fontSize: '13px',
                  fontWeight: 600,
                  bgcolor: '#7b68ee',
                  '&:hover': { bgcolor: '#6952d6' }
                }}
              >
                Lưu thay đổi
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box 
            sx={{ 
              p: 2.5,
              bgcolor: '#fafbfc',
              borderRadius: 2,
              border: '1px solid #e8e9eb',
              minHeight: 120,
              cursor: readonly ? 'default' : 'text',
              '&:hover': readonly ? {} : {
                borderColor: '#d1d5db',
                bgcolor: '#f9fafb'
              }
            }}
            onClick={readonly ? undefined : () => setEditing(true)}
          >
            {task?.description ? (
              <Typography 
                fontSize="14px" 
                color="text.primary"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
              >
                {task.description}
              </Typography>
            ) : (
              <Typography fontSize="14px" color="text.secondary" fontStyle="italic">
                Nhấp để thêm mô tả...
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Custom Fields Grid */}
      <Box sx={{ mb: 4 }}>
        <Typography fontSize="13px" fontWeight={700} color="#6b7280" textTransform="uppercase" sx={{ mb: 2 }}>
          Trường tùy chỉnh
        </Typography>
        
        <Stack spacing={2}>
          {/* Time Tracking */}
          <Box sx={{ 
            p: 2,
            bgcolor: '#fafbfc',
            borderRadius: 2,
            border: '1px solid #e8e9eb',
          }}>
            <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
              Thời gian ước tính
            </Typography>
            <Typography fontSize="20px" fontWeight={700} color="text.primary">
              {task?.estimate || 0}h
            </Typography>
          </Box>

          {/* Dates */}
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2
          }}>
            <Box sx={{ 
              p: 2,
              bgcolor: '#fafbfc',
              borderRadius: 2,
              border: '1px solid #e8e9eb',
            }}>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Ngày bắt đầu
              </Typography>
              <Typography fontSize="14px" fontWeight={600} color="text.primary">
                {task?.start_date ? new Date(task.start_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }) : '—'}
              </Typography>
            </Box>

            <Box sx={{ 
              p: 2,
              bgcolor: task?.deadline && new Date(task.deadline) < new Date() && task?.status !== 'Done' ? '#fef3c7' : '#fafbfc',
              borderRadius: 2,
              border: `1px solid ${task?.deadline && new Date(task.deadline) < new Date() && task?.status !== 'Done' ? '#fbbf24' : '#e8e9eb'}`,
            }}>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Hạn chót
              </Typography>
              <Typography 
                fontSize="14px" 
                fontWeight={600} 
                color={task?.deadline && new Date(task.deadline) < new Date() && task?.status !== 'Done' ? '#92400e' : 'text.primary'}
              >
                {task?.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }) : '—'}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Box>

      {/* Assignee & Reporter */}
      <Box>
        <Typography fontSize="13px" fontWeight={700} color="#6b7280" textTransform="uppercase" sx={{ mb: 2 }}>
          Người liên quan
        </Typography>
        
        <Stack spacing={2}>
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            bgcolor: '#fafbfc',
            borderRadius: 2,
            border: '1px solid #e8e9eb',
          }}>
            <Typography fontSize="13px" fontWeight={600} color="text.secondary">
              Người thực hiện
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: '#7b68ee', fontSize: '12px', fontWeight: 600 }}>
                {(task?.assignee_id?.full_name || task?.assignee_id?.email || 'U')[0].toUpperCase()}
              </Avatar>
              <Typography fontSize="14px" fontWeight={500}>
                {task?.assignee_id?.full_name || task?.assignee_id?.email || 'Chưa giao'}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

