"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Stack,
  Tooltip,
  Breadcrumbs,
  Link,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FlagIcon from "@mui/icons-material/Flag";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import TimelineIcon from "@mui/icons-material/Timeline";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import axiosInstance from "@/../ultis/axios";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/constants/settings";
import FunctionDetailsComments from "./FunctionDetails/FunctionDetailsComments";
import FunctionDetailsActivity from "./FunctionDetails/FunctionDetailsActivity";
import FunctionDetailsTasks from "./FunctionDetails/FunctionDetailsTasks";
import FunctionDetailsAttachments from "./FunctionDetails/FunctionDetailsAttachments";
import { toast } from "sonner";

type FunctionType = {
  _id: string;
  title: string;
  description?: string;
  status?: any;
  priority?: any;
  feature_id?: any;
  start_date?: string;
  deadline?: string;
  created_by?: any;
  createAt?: string;
  updateAt?: string;
};

interface FunctionDetailsModalProps {
  open: boolean;
  functionId: string | null;
  projectId?: string;
  onClose: () => void;
  onUpdate?: () => void;
  readonly?: boolean; // If true, disable edit, add dependency, etc. Only allow view and add comment
}

export default function FunctionDetailsModal({ open, functionId, projectId, onClose, onUpdate, readonly = false }: FunctionDetailsModalProps) {
  const [func, setFunc] = useState<FunctionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [allStatuses, setAllStatuses] = useState<any[]>([]);
  const [allPriorities, setAllPriorities] = useState<any[]>([]);
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');

  const tabMap = ['overview', 'tasks', 'comments', 'files', 'activity'];

  const getTabContent = (index: number) => {
    return tabMap[index];
  };

  useEffect(() => {
    if (open && functionId) {
      setCurrentTab(0);
      loadFunctionDetails();
      // Load constants instead of API call
      setAllStatuses(STATUS_OPTIONS);
      setAllPriorities(PRIORITY_OPTIONS);
      if (projectId) {
        loadFeatures();
      }
    }
  }, [open, functionId, projectId]);

  const loadFeatures = async () => {
    if (!projectId) return;
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/features`);
      setAllFeatures(response.data || []);
    } catch (error) {
      console.error('Error loading features:', error);
    }
  };

  const loadFunctionDetails = async () => {
    if (!functionId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/functions/${functionId}`);
      const functionData = response.data?.func || response.data;
      setFunc(functionData);
      setDescription(functionData?.description || '');
    } catch (error: any) {
      console.error("Error loading function:", error);
      toast.error("Không thể tải thông tin function", {
        description: error?.response?.data?.message || 'Vui lòng thử lại'
      });
      setFunc(null); 
    } finally {
      setLoading(false);
    }
  };

  const handleFunctionUpdate = async (updates: any) => {
    try {
      await axiosInstance.patch(`/api/functions/${functionId}`, updates);
      await loadFunctionDetails();
      if (onUpdate) onUpdate();
      toast.success("Đã cập nhật thành công");
    } catch (error: any) {
      console.error("Error updating function:", error);
      const errorMessage = error?.response?.data?.message || "Không thể cập nhật function";
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleSaveDescription = async () => {
    try {
      await handleFunctionUpdate({ description });
      setEditing(false);
    } catch (error) {
      console.error("Error saving description:", error);
      // Error already shown in handleFunctionUpdate
    }
  };

  const handleCancelEdit = () => {
    setDescription(func?.description || '');
    setEditing(false);
  };

  const getStatusColor = (status: any) => {
    const statusName = typeof status === 'object' ? status?.name : status;
    const key = (statusName || '').toLowerCase();
    if (key.includes('completed') || key.includes('done')) return '#16a34a';
    if (key.includes('progress') || key.includes('doing')) return '#f59e0b';
    if (key.includes('overdue') || key.includes('blocked')) return '#ef4444';
    return '#9ca3af';
  };

  const getPriorityColor = (priority: any) => {
    const priorityName = typeof priority === 'object' ? priority?.name : priority;
    const key = (priorityName || '').toLowerCase();
    if (key.includes('critical') || key.includes('high')) return '#ef4444';
    if (key.includes('medium')) return '#f59e0b';
    return '#3b82f6';
  };

  if (!func && !loading) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '90%', md: '75%', lg: '60%' },
          maxWidth: '1200px',
          bgcolor: '#fafbfc',
        }
      }}
    >
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white',
        borderBottom: '1px solid #e8e9eb',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Top Bar */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
          borderBottom: '1px solid #f3f4f6'
        }}>
          <Breadcrumbs separator={<ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />}>
            <Link 
              component="button"
              onClick={onClose}
              underline="hover" 
              color="text.secondary"
              fontSize="13px"
              sx={{ 
                '&:hover': { color: '#7b68ee' },
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0
              }}
            >
              {func?.feature_id && typeof func.feature_id === 'object' ? func.feature_id.title : 'Chức năng'}
            </Link>
            <Typography 
              fontSize="13px" 
              color="text.primary" 
              fontWeight={600}
              sx={{
                maxWidth: '400px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {func?.title || 'Chi tiết chức năng'}
            </Typography>
          </Breadcrumbs>

          <IconButton size="small" onClick={onClose} sx={{ color: '#6b7280' }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Title Section */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1 }}>
              {editingTitle ? (
                <TextField
                  fullWidth
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={async () => {
                    if (title.trim() && title !== func?.title) {
                      try {
                        await handleFunctionUpdate({ title: title.trim() });
                      } catch (error) {
                        console.error('Error updating title:', error);
                        // Error already shown in handleFunctionUpdate
                      }
                    }
                    setEditingTitle(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      setTitle(func?.title || '');
                      setEditingTitle(false);
                    }
                  }}
                  autoFocus
                  sx={{
                    mb: 1.5,
                    '& .MuiOutlinedInput-root': {
                      fontSize: '24px',
                      fontWeight: 700,
                      '&:hover fieldset': {
                        borderColor: '#7b68ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#7b68ee',
                      }
                    }
                  }}
                />
              ) : (
                <Typography 
                  variant="h5" 
                  fontWeight={700}
                  onClick={() => {
                    if (!readonly) {
                      setTitle(func?.title || '');
                      setEditingTitle(true);
                    }
                  }}
                  sx={{ 
                    mb: 1.5,
                    color: '#1f2937',
                    cursor: readonly ? 'default' : 'pointer',
                    lineHeight: 1.3,
                    '&:hover': {
                      bgcolor: '#f9fafb',
                      borderRadius: 1,
                      px: 1,
                      mx: -1,
                    }
                  }}
                >
                  {func?.title || 'Loading...'}
                </Typography>
              )}

              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                {/* ID */}
                {func?._id && (
                  <Typography 
                    fontSize="12px" 
                    color="text.secondary"
                    sx={{ 
                      fontFamily: 'monospace',
                      bgcolor: '#f3f4f6',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 500
                    }}
                  >
                    ID: {func._id}
                  </Typography>
                )}
                {func?.status && (
                  <Chip 
                    label={typeof func.status === 'object' ? func.status.name : func.status} 
                    size="small"
                    sx={{ 
                      height: 24,
                      fontSize: '12px',
                      fontWeight: 600,
                      bgcolor: `${getStatusColor(func.status)}15`,
                      color: getStatusColor(func.status),
                      border: `1px solid ${getStatusColor(func.status)}40`,
                    }}
                  />
                )}

                {func?.priority && (
                  <Chip 
                    icon={<FlagIcon sx={{ fontSize: 14 }} />}
                    label={typeof func.priority === 'object' ? func.priority.name : func.priority} 
                    size="small"
                    sx={{ 
                      height: 24,
                      fontSize: '12px',
                      fontWeight: 600,
                      bgcolor: `${getPriorityColor(func.priority)}15`,
                      color: getPriorityColor(func.priority),
                      border: `1px solid ${getPriorityColor(func.priority)}40`,
                    }}
                  />
                )}

              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* Tabs */}
        <Box sx={{ px: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={(_, v) => setCurrentTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                bgcolor: '#7b68ee',
              },
              '& .MuiTab-root': {
                minHeight: 44,
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                color: '#6b7280',
                px: 2,
                '&.Mui-selected': {
                  color: '#7b68ee',
                }
              }
            }}
          >
            <Tab label="Tổng quan" />
            <Tab label="Công việc" icon={<AssignmentIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Bình luận" icon={<ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Tệp đính kèm" icon={<AttachFileIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Hoạt động" icon={<TimelineIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          </Tabs>
        </Box>
      </Box>

      {/* Content Area - 2 Column Layout */}
      <Box sx={{ 
        display: 'flex', 
        height: 'calc(100vh - 220px)',
        overflow: 'hidden'
      }}>
        {/* Main Content */}
        <Box sx={{ 
          flex: 1,
          overflow: 'auto',
          bgcolor: 'white',
          p: 3,
        }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography>Loading...</Typography>
            </Box>
          ) : (
            <>
              {getTabContent(currentTab) === 'overview' && (
                <Box>
                  <Typography fontSize="13px" fontWeight={700} color="#6b7280" textTransform="uppercase" sx={{ mb: 2 }}>
                    Mô tả
                  </Typography>
                  
                  {editing ? (
                    <Box>
                      <TextField 
                        fullWidth
                        multiline
                        rows={8}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Thêm mô tả..."
                        sx={{ 
                          mb: 2,
                          '& .MuiOutlinedInput-root': { 
                            borderRadius: 2,
                            fontSize: '14px',
                          }
                        }}
                      />
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Typography
                          component="button"
                          onClick={handleCancelEdit}
                          sx={{ 
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#6b7280',
                            padding: '6px 12px',
                            '&:hover': { color: '#374151' }
                          }}
                        >
                          Hủy
                        </Typography>
                        <Typography
                          component="button"
                          onClick={handleSaveDescription}
                          sx={{
                            border: 'none',
                            background: '#7b68ee',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'white',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            '&:hover': { background: '#6952d6' }
                          }}
                        >
                          Lưu
                        </Typography>
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
                        '&:hover': {
                          borderColor: readonly ? '#e8e9eb' : '#d1d5db',
                          bgcolor: readonly ? '#fafbfc' : '#f9fafb'
                        }
                      }}
                      onClick={() => {
                        if (!readonly) {
                          setEditing(true);
                        }
                      }}
                    >
                      {func?.description ? (
                        <Typography 
                          fontSize="14px" 
                          color="text.primary"
                          sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                        >
                          {func.description}
                        </Typography>
                      ) : (
                        <Typography fontSize="14px" color="text.secondary" fontStyle="italic">
                          Nhấp để thêm mô tả...
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}
              
              {getTabContent(currentTab) === 'tasks' && (
                <FunctionDetailsTasks 
                  functionId={functionId} 
                  projectId={projectId}
                  readonly={readonly}
                />
              )}
              
              {getTabContent(currentTab) === 'comments' && (
                <FunctionDetailsComments functionId={functionId} />
              )}
              
              {getTabContent(currentTab) === 'files' && functionId && (
                <FunctionDetailsAttachments key={func?.updateAt || functionId} functionId={functionId} />
              )}
              
              {getTabContent(currentTab) === 'activity' && (
                <FunctionDetailsActivity functionId={functionId} />
              )}
            </>
          )}
        </Box>

        {/* Sidebar */}
        <Box sx={{ 
          width: 280,
          borderLeft: '1px solid #e8e9eb',
          bgcolor: 'white',
          p: 2.5,
          overflow: 'auto',
        }}>
          <Typography 
            variant="subtitle2" 
            fontWeight={700} 
            sx={{ mb: 2, color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' }}
          >
            Thuộc tính
          </Typography>

          <Stack spacing={2.5}>
            {/* Status - Chỉ hiển thị, không cho chỉnh sửa (tự động cập nhật từ tasks) */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Trạng thái
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: '#f9fafb',
                  border: '1px solid #e8e9eb',
                  fontSize: '13px',
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}
              >
                {func?.status ? (typeof func.status === 'object' ? func.status.name : func.status) : 'Chưa có trạng thái'}
                <Typography fontSize="11px" color="text.secondary" sx={{ mt: 0.5 }}>
                  (Tự động cập nhật từ công việc)
                </Typography>
              </Box>
            </Box>

            {/* Priority */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Ưu tiên
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={typeof func?.priority === 'object' ? (func.priority as any)?._id : func?.priority || ''}
                  onChange={async (e) => {
                    if (!readonly) {
                      try {
                        await handleFunctionUpdate({ priority: e.target.value || null });
                      } catch (error) {
                        console.error('Error updating priority:', error);
                        // Error already shown in handleFunctionUpdate
                      }
                    }
                  }}
                  displayEmpty
                  disabled={readonly}
                  renderValue={(value) => {
                    if (!value) return 'Không có ưu tiên';
                    const priorityObj = allPriorities.find(p => p._id === value);
                    const name = priorityObj?.name || '';
                    const emoji = name.toLowerCase().includes('critical') ? '🔥'
                      : name.toLowerCase().includes('high') ? '🔴'
                      : name.toLowerCase().includes('medium') ? '🟡'
                      : '🟢';
                    return `${emoji} ${name}`;
                  }}
                  sx={{ fontSize: '13px', fontWeight: 500 }}
                >
                  <MenuItem value="">Không có ưu tiên</MenuItem>
                  {allPriorities.map((p) => {
                    const emoji = p.name.toLowerCase().includes('critical') ? '🔥'
                      : p.name.toLowerCase().includes('high') ? '🔴'
                      : p.name.toLowerCase().includes('medium') ? '🟡'
                      : '🟢';
                    return (
                      <MenuItem key={p._id} value={p._id}>
                        {emoji} {p.name}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>

            <Divider />

            {/* Feature */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Tính năng
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={typeof func?.feature_id === 'object' ? func.feature_id?._id || '' : func?.feature_id || ''}
                  onChange={async (e) => {
                    if (!readonly) {
                      try {
                        await handleFunctionUpdate({ feature_id: e.target.value || null });
                      } catch (error) {
                        console.error('Error updating feature:', error);
                        // Error already shown in handleFunctionUpdate
                      }
                    }
                  }}
                  displayEmpty
                  disabled={readonly}
                  renderValue={(value) => {
                    if (!value) return <em style={{ color: '#9ca3af' }}>Chọn tính năng</em>;
                    const selected = allFeatures.find((f: any) => f._id === value);
                    return selected?.title || 'Không xác định';
                  }}
                  sx={{ fontSize: '13px', fontWeight: 500 }}
                >
                  <MenuItem value="">
                    <em>Không có tính năng</em>
                  </MenuItem>
                  {allFeatures.map((f: any) => (
                    <MenuItem key={f._id} value={f._id}>{f.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
}

