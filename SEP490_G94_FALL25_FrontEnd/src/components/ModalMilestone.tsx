"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/../ultis/axios";
import {
  Drawer,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Box,
  Chip,
  Typography,
  Divider,
  CircularProgress,
  IconButton,
  Stack,
  Breadcrumbs,
  Link,
  Tooltip,
  Autocomplete,
  LinearProgress,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FlagIcon from "@mui/icons-material/Flag";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShareIcon from "@mui/icons-material/Share";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SendIcon from "@mui/icons-material/Send";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AssignmentIcon from "@mui/icons-material/Assignment";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import { toast } from "sonner";
import FeatureDetailsModal from "./FeatureDetailsModal";

type Update = { _id: string; content: string; createdAt: string; updatedAt?: string; user_id?: { _id?: string; full_name?: string; email?: string; avatar?: string } | string };
type ActivityLog = { _id: string; action: string; createdAt: string; metadata?: any; created_by?: { full_name?: string; email?: string; avatar?: string } };
type FileDoc = { _id: string; title: string; file_url: string; createdAt: string };

export default function ModalMilestone({ open, onClose, projectId, milestoneId, onUpdate, readonly = false }: { open: boolean; onClose: () => void; projectId: string; milestoneId: string; onUpdate?: () => void; readonly?: boolean; }) {
  const [tab, setTab] = useState<"updates"|"activity"|"features">("updates");
  const [updates, setUpdates] = useState<Update[]>([]);
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [fileTitle, setFileTitle] = useState("");
  const [fileType, setFileType] = useState("Document");
  const [fileVersion, setFileVersion] = useState("1.0");
  const [fileStatus, setFileStatus] = useState("Pending");
  const [fileDescription, setFileDescription] = useState("");
  const [features, setFeatures] = useState<any[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [featureModal, setFeatureModal] = useState<{ open: boolean; featureId?: string | null }>({ open: false, featureId: null });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const toInputDate = (d: Date | null) => {
    if (!d) return "";
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };


  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        await loadCurrentUser();
        const [m, u, a] = await Promise.all([
          axiosInstance.get(`/api/projects/${projectId}/milestones/${milestoneId}`),
          axiosInstance.get(`/api/projects/${projectId}/milestones/${milestoneId}/comments`),
          axiosInstance.get(`/api/projects/${projectId}/milestones/${milestoneId}/activity-logs`)
        ]);
        const md = m.data || {};
        setTitle(md.title || "");
        setDescription(md.description || "");
        setStartDate(md.start_date ? md.start_date.substring(0,10) : "");
        setDeadline(md.deadline ? md.deadline.substring(0,10) : "");
        setTags(Array.isArray(md.tags) ? md.tags : []);
        setUpdates(Array.isArray(u.data) ? u.data : []);
        setActivity(Array.isArray(a.data) ? a.data : []);
        
        // Load available tags from all milestones
        await loadProjectTags();
        // Load features linked to this milestone
        await loadMilestoneFeatures();
      } finally {
        setLoading(false);
      }
    })();
  }, [open, projectId, milestoneId]);

  const loadCurrentUser = async () => {
    try {
      const res = await axiosInstance.get('/api/users/me');
      const id = res?.data?._id;
      setCurrentUserId(id ? String(id) : null);
    } catch (error) {
      console.error('Error loading current user:', error);
      setCurrentUserId(null);
    }
  };

  const loadProjectTags = async () => {
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/milestones`);
      const milestones = response.data || [];
      
      // Extract all unique tags from all milestones
      const tagsSet = new Set<string>();
      milestones.forEach((m: any) => {
        if (m.tags && Array.isArray(m.tags)) {
          m.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              tagsSet.add(tag.trim());
            }
          });
        }
      });
      
      setAvailableTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error('Error loading project tags:', error);
    }
  };

  const loadMilestoneFeatures = async () => {
    try {
      setLoadingFeatures(true);
      // Get all features of the project
      const allFeaturesRes = await axiosInstance.get(`/api/projects/${projectId}/features`);
      const allFeatures = allFeaturesRes.data || [];
      
      // Get feature-milestone links for this milestone
      // We need to check which features are linked to this milestone via FeaturesMilestone table
      // Since there's no direct endpoint, we'll get features and check their milestone links
      const linkedFeatures: any[] = [];
      
      for (const feature of allFeatures) {
        try {
          // Get milestones linked to this feature
          const milestonesRes = await axiosInstance.get(`/api/features/${feature._id}/milestones`);
          const linkedMilestoneIds = milestonesRes.data || [];
          
          // Check if this milestone is in the list
          if (linkedMilestoneIds.includes(milestoneId)) {
            linkedFeatures.push(feature);
          }
        } catch (err) {
          // Skip features that can't be checked
          console.warn(`Could not check milestones for feature ${feature._id}:`, err);
        }
      }
      
      setFeatures(linkedFeatures.map((f: any) => ({
        _id: f._id,
        title: f.title,
        status: f.status,
        priority: f.priority
      })));
    } catch (error: any) {
      console.error('Error loading milestone features:', error);
      toast.error('Không thể tải danh sách features', {
        description: error?.response?.data?.message || error?.message
      });
      setFeatures([]);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const isOwner = (comment: Update | null) => {
    if (!comment) return false;
    const raw = typeof comment.user_id === 'string'
      ? comment.user_id
      : (comment.user_id?._id || (comment.user_id as any)?.id || comment.user_id);
    if (!raw || !currentUserId) return false;
    return String(raw) === String(currentUserId);
  };

  const submitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await axiosInstance.post(`/api/projects/${projectId}/milestones/${milestoneId}/comments`, { content });
      setUpdates(prev => [res.data, ...prev]);
      if (!currentUserId) {
        const newUserId = typeof res.data?.user_id === 'string'
          ? res.data.user_id
          : res.data?.user_id?._id || res.data?.user_id?.id;
        if (newUserId) setCurrentUserId(String(newUserId));
      }
      setContent("");
      toast.success('Đã thêm bình luận mới');
    } catch (error: any) {
      toast.error('Không thể thêm bình luận', {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (id: string, initial: string) => {
    setEditingId(id);
    setEditingContent(initial);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const body = { content: editingContent };
      const res = await axiosInstance.patch(`/api/projects/${projectId}/milestones/${milestoneId}/comments/${editingId}`, body);
      setUpdates(prev => prev.map(u => (u._id === editingId ? res.data : u)));
      cancelEdit();
      toast.success('Đã cập nhật bình luận');
    } catch (error: any) {
      toast.error('Không thể cập nhật bình luận', {
        description: error?.response?.data?.message || error?.message,
      });
    }
  };

  const deleteComment = async (id: string) => {
    if (!confirm('Xóa bình luận này?')) return;
    try {
      await axiosInstance.delete(`/api/projects/${projectId}/milestones/${milestoneId}/comments/${id}`);
      setUpdates(prev => prev.filter(u => u._id !== id));
      toast.success('Đã xóa bình luận');
    } catch (error: any) {
      toast.error('Không thể xóa bình luận', {
        description: error?.response?.data?.message || 'Bạn không có quyền xóa bình luận này',
      });
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return commentDate.toLocaleDateString('vi-VN');
  };

  const getPriorityColor = (priorityName: string) => {
    const key = (priorityName || '').toLowerCase();
    if (key.includes('critical') || key.includes('high')) return '#ef4444';
    if (key.includes('medium')) return '#f59e0b';
    return '#3b82f6';
  };

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
      {/* Header - Clean ClickUp style */}
      <Box sx={{ 
        bgcolor: 'white',
        borderBottom: '1px solid #e8e9eb',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Top Bar with Breadcrumb */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
          borderBottom: '1px solid #f3f4f6'
        }}>
          {/* Breadcrumb */}
          <Breadcrumbs separator={<ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />}>
            <Link 
              href="#" 
              underline="hover" 
              color="text.secondary"
              fontSize="13px"
              sx={{ '&:hover': { color: '#7b68ee' } }}
            >
              Cột mốc
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
              {title || 'Chi tiết cột mốc'}
            </Typography>
          </Breadcrumbs>

        
        </Box>

        {/* Milestone Title & Quick Info */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            {/* Title - Editable */}
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h5" 
                fontWeight={700}
                sx={{ 
                  mb: 1.5,
                  color: '#1f2937',
                  lineHeight: 1.3,
                }}
              >
                {title || 'Đang tải...'}
            </Typography>

              {/* Meta Info Row */}
              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                {/* Date Range */}
                {(startDate || deadline) && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <CalendarMonthIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                    <Typography fontSize="13px" color="text.secondary">
                      {startDate ? new Date(startDate).toLocaleDateString() : '—'} → {deadline ? new Date(deadline).toLocaleDateString() : '—'}
            </Typography>
                  </Stack>
                )}

                {/* Tags */}
                {tags && tags.length > 0 && tags.map((tag, idx) => (
                  <Chip 
                    key={idx}
                    label={tag} 
              size="small"
                    sx={{ 
                      height: 22,
                      fontSize: '11px',
                      bgcolor: '#f3f4f6',
                      color: '#6b7280',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* Tabs Navigation */}
        <Box sx={{ px: 2 }}>
          <Tabs 
            value={tab} 
            onChange={(_, v) => setTab(v)}
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
            <Tab value="updates" label={`Bình luận`}  />
            <Tab value="features" label={`Tính năng`} />
            <Tab value="activity" label={`Hoạt động`} />
          </Tabs>
        </Box>
      </Box>

      {/* Content Area - 2 Column Layout */}
      <Box sx={{ 
        display: 'flex', 
        height: 'calc(100vh - 220px)',
        overflow: 'hidden'
      }}>
        {/* Main Content - Left Column (scrollable) */}
        <Box sx={{ 
          flex: 1,
          overflow: 'auto',
          bgcolor: 'white',
          p: 3,
        }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {tab === 'updates' && (
                <Box>
                  {/* Header */}
                  <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Bình luận
            </Typography>
                     
            </Box>
                  </Box>

                  {/* Add Comment Form */}
                  <Paper
                    elevation={0}
                    sx={{ 
                      mb: 4,
                      p: 2.5,
                      bgcolor: '#fafbfc',
                      border: '1px solid #e8e9eb',
                      borderRadius: 2
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#7b68ee', fontSize: '14px', fontWeight: 600 }}>
                        U
                      </Avatar>
                      <Box sx={{ flex: 1 }} component="form" onSubmit={submitUpdate}>
                      <TextField
                        fullWidth
                          multiline
                          rows={3}
                          placeholder="Thêm bình luận..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          sx={{
                            mb: 1.5,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'white',
                              fontSize: '14px',
                              borderRadius: 2,
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
                            onClick={() => setContent("")}
                            sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280' }}
                          >
                            Xóa
                          </Button>
                      <Button
                        size="small"
                            variant="contained"
                            disabled={!content.trim() || posting}
                            startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                            type="submit"
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              bgcolor: '#7b68ee',
                              '&:hover': { bgcolor: '#6952d6' }
                            }}
                          >
                            Bình luận
                      </Button>
                        </Stack>
                    </Box>
                    </Stack>
                  </Paper>

                  {/* Comments List */}
                  {updates.length === 0 ? (
                    <Box sx={{ 
                      p: 6, 
                      textAlign: 'center',
                      bgcolor: '#fafbfc',
                      borderRadius: 2,
                      border: '1px dashed #e8e9eb'
                    }}>
                      <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
                      <Typography fontSize="14px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                        Chưa có bình luận nào
                      </Typography>
                      <Typography fontSize="12px" color="text.secondary">
                        Bắt đầu cuộc trò chuyện bằng cách thêm bình luận đầu tiên
                      </Typography>
                  </Box>
                  ) : (
                    <Stack spacing={3}>
                      {updates.map((comment) => (
                        <Paper
                          key={comment._id}
                          elevation={0}
                          sx={{
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
                          <Stack direction="row" spacing={2}>
                            {/* Avatar */}
                            <Avatar 
                              sx={{ 
                                width: 40, 
                                height: 40, 
                                bgcolor: '#7b68ee',
                                fontSize: '16px',
                                fontWeight: 600
                              }}
                            >
                              {(comment.user_id?.full_name || comment.user_id?.email || 'U')[0].toUpperCase()}
                            </Avatar>

                            <Box sx={{ flex: 1 }}>
                              {/* Header */}
                              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Typography fontSize="14px" fontWeight={700} color="text.primary">
                                    {comment.user_id?.full_name || comment.user_id?.email || 'Người dùng không xác định'}
            </Typography>
                                  <Typography fontSize="12px" color="text.secondary">
                                    {formatTimeAgo(comment.createdAt)}
                                  </Typography>
                                  {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                                    <Typography fontSize="11px" color="text.secondary" fontStyle="italic">
                                      (đã chỉnh sửa)
                                    </Typography> 
                                  )}
                                </Stack>

                                {/* Actions Menu */}
                                {isOwner(comment) && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      setAnchorEl(e.currentTarget);
                                      setSelectedComment(comment);
                                    }}
                                    sx={{ color: '#9ca3af' }}
                                  >
                                    <MoreVertIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                                )}
                              </Stack>

                              {/* Comment Content */}
                              {editingId === comment._id ? (
                                <Box>
            <TextField 
              fullWidth 
                                    multiline
                                    rows={3}
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    autoFocus
                                    sx={{
                                      mb: 1.5,
                                      '& .MuiOutlinedInput-root': {
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
                                      onClick={cancelEdit}
                                      sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280' }}
                                    >
                                      Hủy
                                    </Button>
                                    <Button
                                      size="small"
                variant="contained" 
                                      onClick={saveEdit}
                                      disabled={!editingContent.trim()}
                                      sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        bgcolor: '#7b68ee',
                                        '&:hover': { bgcolor: '#6952d6' }
                                      }}
                                    >
                                      Lưu
              </Button>
                                  </Stack>
            </Box>
                              ) : (
                                <Typography
                                  fontSize="14px"
                                  color="text.primary"
                                  sx={{
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap'
                                  }}
                                >
                                  {comment.content}
                                </Typography>
                                )}
                              </Box>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}

                  {/* Actions Menu */}
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => {
                      setAnchorEl(null);
                      setSelectedComment(null);
                    }}
                    PaperProps={{
                      sx: { borderRadius: 2, minWidth: 160 }
                    }}
                  >
                    {isOwner(selectedComment) && (
                      <>
                        <MenuItem
                          onClick={() => {
                            setEditingId(selectedComment?._id);
                            setEditingContent(selectedComment?.content);
                            setAnchorEl(null);
                          }}
                          sx={{ fontSize: '13px', gap: 1.5 }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                          Chỉnh sửa
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            deleteComment(selectedComment?._id);
                            setAnchorEl(null);
                            setSelectedComment(null);
                          }}
                          sx={{ fontSize: '13px', gap: 1.5, color: '#ef4444' }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                          Xóa
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                    </Box>
                  )}
                  {tab === 'features' && (
                    <Box>
                      {/* Header */}
                      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ 
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: '#eff6ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <AssignmentIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            Tính năng
                          </Typography>
                          <Typography fontSize="12px" color="text.secondary">
                            {features.length} {features.length === 1 ? 'tính năng' : 'tính năng'} được liên kết với cột mốc này
                          </Typography>
                        </Box>
                      </Box>

                      {loadingFeatures ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : features.length === 0 ? (
                        <Box sx={{ 
                          p: 4, 
                          textAlign: 'center',
                          borderRadius: 2,
                          bgcolor: '#f9fafb',
                          border: '1px dashed #e5e7eb'
                        }}>
                          <Typography variant="body2" color="text.secondary">
                            Chưa có tính năng nào được liên kết với cột mốc này
                          </Typography>
                        </Box>
                      ) : (
                        <Stack spacing={1.5}>
                          {features.map((feature: any) => (
                            <Paper
                              key={feature._id}
                              elevation={0}
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                border: '1px solid #e8e9eb',
                                '&:hover': {
                                  borderColor: '#7b68ee',
                                  bgcolor: '#fafbff',
                                  cursor: 'pointer'
                                },
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => {
                                setFeatureModal({ open: true, featureId: feature._id });
                              }}
                            >
                              <Stack direction="row" spacing={2} alignItems="flex-start">
                                <Box sx={{ flex: 1 }}>
                                  <Typography 
                                    variant="body1" 
                                    fontWeight={600}
                                    sx={{ 
                                      mb: 0.5,
                                      color: '#1f2937',
                                      '&:hover': {
                                        color: '#7b68ee'
                                      }
                                    }}
                                  >
                                    {feature.title}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  )}
                  {tab === 'activity' && (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      {activity.length === 0 && <Typography variant="body2" color="text.secondary">Chưa có hoạt động nào</Typography>}
                      {activity.map(a => (
                        <Box key={a._id} sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{new Date(a.createdAt).toLocaleString()} {a.created_by?.full_name ? `• ${a.created_by.full_name}` : ''}</Typography>
                          <Typography variant="body2" fontWeight={600} mt={0.5} sx={{ display: 'block' }}>{a.action}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </>
              )}
            </Box>

        {/* Sidebar - Right Column (fixed properties) */}
        <Box sx={{ 
          width: 280,
          borderLeft: '1px solid #e8e9eb',
          bgcolor: 'white',
          p: 2.5,
          overflow: 'auto',
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1f2937' }}>
            Thuộc tính
          </Typography>

          <Stack spacing={2.5}>
            {/* Title */}
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, mb: 0.5, display: 'block' }}>
                TIÊU ĐỀ
              </Typography>
              <TextField 
                value={title} 
                onChange={(e)=>setTitle(e.target.value)} 
                fullWidth 
                size="small" 
                required
                error={!title.trim()}
                placeholder="Nhập tiêu đề cột mốc"
                disabled={readonly}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '14px',
                  }
                }}
              />
          </Box>

            <Divider />

            {/* Start Date */}
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, mb: 0.5, display: 'block' }}>
                NGÀY BẮT ĐẦU
              </Typography>
              <TextField 
                type="date" 
                value={startDate} 
                onChange={(e)=>setStartDate(e.target.value)} 
                fullWidth 
                size="small" 
                InputLabelProps={{ shrink: true }}
                disabled={readonly}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '14px',
                  }
                }}
              />
            </Box>

            {/* Deadline */}
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, mb: 0.5, display: 'block' }}>
                HẠN CHÓT
              </Typography>
              <TextField 
                type="date" 
                value={deadline} 
                onChange={(e)=>setDeadline(e.target.value)} 
                fullWidth 
                size="small" 
                InputLabelProps={{ shrink: true }}
                disabled={readonly}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '14px',
                  }
                }}
              />
            </Box>

            <Divider />

            {/* Description */}
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, mb: 0.5, display: 'block' }}>
                MÔ TẢ
              </Typography>
              <TextField 
                value={description} 
                onChange={(e)=>setDescription(e.target.value)} 
                multiline 
                minRows={3} 
                fullWidth 
                size="small"
                placeholder="Thêm mô tả..."
                disabled={readonly}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '14px',
                  }
                }}
              />
            </Box>

            {/* Tags */}
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, mb: 0.5, display: 'block' }}>
                NHÃN
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                size="small"
                options={availableTags}
                value={tags}
                disabled={readonly}
                onChange={async (_, newValue) => {
                  try {
                    // Remove duplicates and trim
                    const uniqueTags = Array.from(new Set(newValue.map(tag => tag.trim()).filter(Boolean)));
                    setTags(uniqueTags);
                    
                    // Auto-save tags
                    await axiosInstance.patch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
                      tags: uniqueTags
                    });
                    
                    // Reload available tags
                    await loadProjectTags();
                    
                    // Refresh activity logs
                    const a = await axiosInstance.get(`/api/projects/${projectId}/milestones/${milestoneId}/activity-logs`);
                    setActivity(Array.isArray(a.data) ? a.data : []);
                    
                    toast.success('Đã cập nhật nhãn');
                  } catch (error: any) {
                    toast.error('Không thể cập nhật nhãn', {
                      description: error?.response?.data?.message || error?.message,
                    });
                  }
                }}
                filterOptions={(options, params) => {
                  const filtered = options.filter(option => {
                    // Filter out already selected tags
                    const isAlreadySelected = tags.includes(option);
                    // Filter by input value
                    const matchesInput = option.toLowerCase().includes(params.inputValue.toLowerCase());
                    return !isAlreadySelected && matchesInput;
                  });
                  
                  // Add "Create new" option if input doesn't match any existing tag
                  const inputValue = params.inputValue.trim();
                  if (inputValue !== '' && !options.includes(inputValue) && !tags.includes(inputValue)) {
                    filtered.push(inputValue);
                  }
                  
                  return filtered;
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      size="small"
                      sx={{
                        bgcolor: '#f3f4f6',
                        color: '#374151',
                        fontSize: '12px',
                        height: 24,
                        '& .MuiChip-deleteIcon': {
                          fontSize: 16,
                          color: '#6b7280',
                          '&:hover': {
                            color: '#374151',
                          }
                        }
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={tags.length === 0 ? "Thêm nhãn..." : ""}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '14px',
                      }
                    }}
                  />
                )}
                sx={{
                  '& .MuiAutocomplete-tag': {
                    margin: '2px',
                  }
                }}
              />
            </Box>

            <Divider />

            {/* Last Updated */}
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, mb: 0.5, display: 'block' }}>
                CẬP NHẬT LẦN CUỐI
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '13px', color: '#6b7280' }}>
                {activity[0]?.createdAt ? new Date(activity[0].createdAt).toLocaleString() : '—'}
              </Typography>
            </Box>

            {!readonly && (
              <>
                <Divider />

                {/* Save Button */}
                <Button 
                  variant="contained" 
                  fullWidth
                  disabled={saving || !title.trim()} 
                  onClick={async ()=>{ 
                    setSaving(true); 
                    try { 
                      await axiosInstance.patch(`/api/projects/${projectId}/milestones/${milestoneId}`, { 
                        title, 
                        description, 
                        start_date: startDate ? new Date(startDate).toISOString() : undefined, 
                        deadline: deadline ? new Date(deadline).toISOString() : undefined,
                        tags: tags
                      });
                      // Refresh activity logs to show the update
                      const a = await axiosInstance.get(`/api/projects/${projectId}/milestones/${milestoneId}/activity-logs`);
                      setActivity(Array.isArray(a.data) ? a.data : []);
                      toast.success('Đã cập nhật cột mốc thành công!', {
                        description: title,
                      });
                      // Notify parent to refresh data/charts
                      if (onUpdate) onUpdate();
                    } catch (error: any) {
                      const errorMessage = error?.response?.data?.message || error?.message || 'Lỗi không xác định';
                      toast.error('Không thể cập nhật cột mốc', {
                        description: errorMessage,
                      });
                    } finally { 
                      setSaving(false); 
                    } 
                  }}
                  sx={{
                    bgcolor: '#7b68ee',
                    '&:hover': {
                      bgcolor: '#6952d6',
                    }
                  }}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Feature Details Modal */}
      {featureModal.open && featureModal.featureId && projectId && (
        <FeatureDetailsModal
          open={featureModal.open}
          featureId={featureModal.featureId}
          projectId={projectId}
          readonly={readonly}
          onClose={() => setFeatureModal({ open: false, featureId: null })}
          onUpdate={async () => {
            // Reload features when feature is updated
            await loadMilestoneFeatures();
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </Drawer>
  );
}


