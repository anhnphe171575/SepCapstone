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
  Autocomplete,
  Checkbox,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FlagIcon from "@mui/icons-material/Flag";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import axiosInstance from "@/../ultis/axios";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/constants/settings";

import FeatureDetailsOverview from "./FeatureDetails/FeatureDetailsOverview";
import FeatureDetailsFunctions from "./FeatureDetails/FeatureDetailsFunctions";
import FeatureDetailsComments from "./FeatureDetails/FeatureDetailsComments";
import FeatureDetailsActivity from "./FeatureDetails/FeatureDetailsActivity";
import FeatureDetailsAttachments from "./FeatureDetails/FeatureDetailsAttachments";
import { toast } from "sonner";

type Feature = {
  _id: string;
  title: string;
  description?: string;
  status?: any;
  priority?: any;
  project_id?: any;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  created_by?: any;
  last_updated_by?: any;
  createAt?: string;
  updateAt?: string;
};

interface FeatureDetailsModalProps {
  open: boolean;
  featureId: string | null;
  projectId?: string;
  onClose: () => void;
  onUpdate?: () => void;
  readonly?: boolean; // If true, disable edit, add dependency, etc. Only allow view and add comment
}

export default function FeatureDetailsModal({ open, featureId, projectId, onClose, onUpdate, readonly = false }: FeatureDetailsModalProps) {
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [allStatuses, setAllStatuses] = useState<any[]>([]);
  const [allPriorities, setAllPriorities] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [featureMilestoneIds, setFeatureMilestoneIds] = useState<string[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');

  const tabMap = ['overview', 'functions', 'comments', 'files', 'activity'];

  const getTabContent = (index: number) => {
    return tabMap[index];
  };

  useEffect(() => {
    if (open && featureId) {
      setCurrentTab(0);
      loadFeatureDetails();
      // Feature model uses enum: ["To Do", "Doing", "Done"]
      setAllStatuses([
        { _id: "To Do", name: "To Do", value: "to-do" },
        { _id: "Doing", name: "Doing", value: "doing" },
        { _id: "Done", name: "Done", value: "done" },
      ]);
      setAllPriorities(PRIORITY_OPTIONS);
      if (projectId) {
        loadProjectTags();
        loadMilestones();
        loadFeatureMilestones();
      }
    }
  }, [open, featureId, projectId]);

  const loadProjectTags = async () => {
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/features`);
      const features = response.data || [];
      
      // Extract all unique tags from all features
      const tagsSet = new Set<string>();
      features.forEach((f: any) => {
        if (f.tags && Array.isArray(f.tags)) {
          f.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              tagsSet.add(tag.trim());
            }
          });
        }
      });
      
      setAvailableTags(Array.from(tagsSet).sort());
    } catch (error: any) {
      console.error('Error loading project tags:', error);
      toast.error("Không thể tải nhãn", {
        description: error?.response?.data?.message || 'Vui lòng thử lại'
      });
    }
  };

  const loadMilestones = async () => {
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/milestones`);
      setMilestones(response.data || []);
    } catch (error: any) {
      console.error('Error loading milestones:', error);
      toast.error("Không thể tải cột mốc", {
        description: error?.response?.data?.message || 'Vui lòng thử lại'
      });
    }
  };

  const loadFeatureMilestones = async () => {
    try {
      const response = await axiosInstance.get(`/api/features/${featureId}/milestones`);
      const uniqueIds = Array.isArray(response.data) ? [...new Set(response.data)] : [];
      setFeatureMilestoneIds(uniqueIds);
    } catch (error: any) {
      console.error('Error loading feature milestones:', error);
      setFeatureMilestoneIds([]);
      // Don't show error toast for this as it's not critical
    }
  };

  const loadFeatureDetails = async () => {
    if (!featureId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/features/${featureId}`);
      setFeature(response.data);
      setTitle(response.data?.title || '');
    } catch (error: any) {
      console.error("Error loading feature:", error);
      toast.error("Không thể tải thông tin feature", {
        description: error?.response?.data?.message || 'Vui lòng thử lại'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureUpdate = async (updates: any) => {
    try {
      // Optimistic update - update local state immediately
      setFeature(prev => prev ? { ...prev, ...updates } : prev);
      
      // Send request to server
      await axiosInstance.patch(`/api/features/${featureId}`, updates);
      
      // Reload to get populated data from server
      const response = await axiosInstance.get(`/api/features/${featureId}`);
      setFeature(response.data);
      
      if (onUpdate) onUpdate();
      toast.success("Đã cập nhật thành công");
    } catch (error: any) {
      console.error("Error updating feature:", error);
      const errorMessage = error?.response?.data?.message || "Không thể cập nhật feature";
      toast.error(errorMessage);
      // Reload on error to restore correct state
      await loadFeatureDetails();
      throw error;
    }
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

  if (!feature && !loading) return null;

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
              Tính năng
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
              {feature?.title || 'Chi tiết tính năng'}
            </Typography>
          </Breadcrumbs>

          {/* Action Buttons */}
          <IconButton size="small" onClick={onClose} sx={{ color: '#6b7280' }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Feature Title & Quick Actions */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            {/* Title */}
            <Box sx={{ flex: 1 }}>
              {editingTitle ? (
                <TextField
                  fullWidth
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={async () => {
                    if (title.trim() && title !== feature?.title) {
                      try {
                        await handleFeatureUpdate({ title: title.trim() });
                      } catch (error) {
                        console.error('Error updating title:', error);
                        // Error already shown in handleFeatureUpdate
                      }
                    }
                    setEditingTitle(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      setTitle(feature?.title || '');
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
                    setTitle(feature?.title || '');
                    setEditingTitle(true);
                  }}
                  sx={{ 
                    mb: 1.5,
                    color: '#1f2937',
                    lineHeight: 1.3,
                    cursor: 'text',
                    '&:hover': {
                      bgcolor: '#f9fafb',
                      borderRadius: 1,
                      px: 1,
                      mx: -1,
                    }
                  }}
                >
                  {feature?.title || 'Loading...'}
                </Typography>
              )}

              {/* Meta Info Row */}
              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                {/* ID */}
                {feature?._id && (
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
                    ID: {feature._id}
                  </Typography>
                )}
                {/* Status */}
                {feature?.status && (
                  <Chip 
                    label={typeof feature.status === 'object' ? feature.status.name : feature.status} 
                    size="small"
                    sx={{ 
                      height: 24,
                      fontSize: '12px',
                      fontWeight: 600,
                      bgcolor: `${getStatusColor(feature.status)}15`,
                      color: getStatusColor(feature.status),
                      border: `1px solid ${getStatusColor(feature.status)}40`,
                    }}
                  />
                )}

                {/* Priority */}
                {feature?.priority && (
                  <Chip 
                    icon={<FlagIcon sx={{ fontSize: 14 }} />}
                    label={typeof feature.priority === 'object' ? feature.priority.name : feature.priority} 
                    size="small"
                    sx={{ 
                      height: 24,
                      fontSize: '12px',
                      fontWeight: 600,
                      bgcolor: `${getPriorityColor(feature.priority)}15`,
                      color: getPriorityColor(feature.priority),
                      border: `1px solid ${getPriorityColor(feature.priority)}40`,
                    }}
                  />
                )}

                {/* Date Range */}
                {(feature?.start_date || feature?.end_date) && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <CalendarMonthIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                    <Typography fontSize="13px" color="text.secondary">
                      {feature?.start_date ? new Date(feature.start_date).toLocaleDateString() : '—'} → {feature?.end_date ? new Date(feature.end_date).toLocaleDateString() : '—'}
                    </Typography>
                  </Stack>
                )}

                {/* Tags */}
                {feature?.tags && feature.tags.length > 0 && feature.tags.map((tag, idx) => (
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
            <Tab label="Chức năng" />
            <Tab label="Bình luận" />
            <Tab label="Tệp đính kèm" />
            <Tab label="Hoạt động" />
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
              <Typography>Đang tải...</Typography>
            </Box>
          ) : (
            <>
              {getTabContent(currentTab) === 'overview' && feature && <FeatureDetailsOverview feature={feature} onUpdate={handleFeatureUpdate} projectId={projectId} readonly={readonly} />}
              {getTabContent(currentTab) === 'functions' && featureId && projectId && <FeatureDetailsFunctions featureId={featureId} projectId={projectId} readonly={readonly} />}
              {getTabContent(currentTab) === 'comments' && featureId && <FeatureDetailsComments featureId={featureId} />}
              {getTabContent(currentTab) === 'files' && featureId && <FeatureDetailsAttachments key={feature?.updateAt || featureId} featureId={featureId} />}
              {getTabContent(currentTab) === 'activity' && featureId && <FeatureDetailsActivity featureId={featureId} />}
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
          <Typography 
            variant="subtitle2" 
            fontWeight={700} 
            sx={{ mb: 2, color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' }}
          >
            Thuộc tính
          </Typography>

          <Stack spacing={2.5}>
            {/* Status - Chỉ hiển thị, không cho chỉnh sửa (tự động cập nhật từ functions) */}
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
                {feature?.status ? (typeof feature.status === 'object' ? feature.status.name : feature.status) : 'Chưa có trạng thái'}
                <Typography fontSize="11px" color="text.secondary" sx={{ mt: 0.5 }}>
                  (Tự động cập nhật từ chức năng)
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
                  value={typeof feature?.priority === 'object' ? (feature.priority as any)?._id : feature?.priority || ''}
                  onChange={async (e) => {
                    if (!readonly) {
                      try {
                        await handleFeatureUpdate({ priority: e.target.value || null });
                      } catch (error) {
                        console.error('Error updating priority:', error);
                        // Error already shown in handleFeatureUpdate
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
                  sx={{ 
                    fontSize: '13px', 
                    fontWeight: 500,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e8e9eb',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#7b68ee',
                    }
                  }}
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

            {/* Start Date */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Start Date
              </Typography>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={feature?.start_date ? new Date(feature.start_date).toISOString().split('T')[0] : ''}
                onChange={async (e) => {
                  if (!readonly) {
                    try {
                      await handleFeatureUpdate({ start_date: e.target.value ? new Date(e.target.value).toISOString() : null });
                    } catch (error) {
                      console.error('Error updating start date:', error);
                      // Error already shown in handleFeatureUpdate
                    }
                  }
                }}
                InputLabelProps={{ shrink: true }}
                disabled={readonly}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '13px',
                    '& fieldset': {
                      borderColor: '#e8e9eb',
                    },
                    '&:hover fieldset': {
                      borderColor: '#7b68ee',
                    }
                  }
                }}
              />
            </Box>

            {/* End Date */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                End Date
              </Typography>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={feature?.end_date ? new Date(feature.end_date).toISOString().split('T')[0] : ''}
                onChange={async (e) => {
                  if (!readonly) {
                    try {
                      await handleFeatureUpdate({ end_date: e.target.value ? new Date(e.target.value).toISOString() : null });
                    } catch (error) {
                      console.error('Error updating end date:', error);
                      // Error already shown in handleFeatureUpdate
                    }
                  }
                }}
                InputLabelProps={{ shrink: true }}
                disabled={readonly}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '13px',
                    '& fieldset': {
                      borderColor: '#e8e9eb',
                    },
                    '&:hover fieldset': {
                      borderColor: '#7b68ee',
                    }
                  }
                }}
              />
            </Box>

            <Divider />

            {/* Milestones */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Cột mốc
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  multiple
                  value={featureMilestoneIds}
                  onChange={async (e) => {
                    if (!readonly) {
                      const newMilestoneIds = e.target.value as string[];
                      try {
                        // Remove all old links
                        await axiosInstance.delete(`/api/features/${featureId}/milestones`).catch(() => null);
                        
                        // Add new links
                        if (newMilestoneIds.length > 0) {
                          await axiosInstance.post(`/api/features/${featureId}/milestones`, {
                            milestone_ids: newMilestoneIds
                          });
                        }
                        
                        setFeatureMilestoneIds(newMilestoneIds);
                        
                        // Notify parent to refresh
                        if (onUpdate) {
                          await onUpdate();
                        }
                        toast.success("Đã cập nhật cột mốc thành công");
                      } catch (error: any) {
                        console.error('Error updating milestones:', error);
                        toast.error(error?.response?.data?.message || "Không thể cập nhật cột mốc");
                      }
                    }
                  }}
                  disabled={readonly}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((id) => {
                        const m = milestones.find(m => m._id === id);
                        return (
                          <Chip 
                            key={id} 
                            label={m?.title || id} 
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '11px',
                              bgcolor: '#e0e7ff',
                              color: '#4f46e5',
                              fontWeight: 600,
                            }}
                          />
                        );
                      })}
                      {(selected as string[]).length === 0 && (
                        <Typography fontSize="13px" color="text.secondary">
                          Chưa có cột mốc
                        </Typography>
                      )}
                    </Box>
                  )}
                  displayEmpty
                  sx={{
                    fontSize: '13px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e8e9eb',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#7b68ee',
                    }
                  }}
                >
                  {milestones.length === 0 ? (
                    <MenuItem disabled>Chưa có cột mốc nào</MenuItem>
                  ) : (
                    milestones.map((m) => (
                      <MenuItem key={m._id} value={m._id}>
                        <Checkbox 
                          checked={featureMilestoneIds.includes(m._id)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography fontSize="13px" fontWeight={600}>
                            {m.title}
                          </Typography>
                          {(m.start_date || m.deadline) && (
                            <Typography fontSize="11px" color="text.secondary">
                              {m.start_date ? new Date(m.start_date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }) : '—'} → {m.deadline ? new Date(m.deadline).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }) : '—'}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              {featureMilestoneIds.length > 0 && (
                <Typography fontSize="11px" color="text.secondary" sx={{ mt: 0.5 }}>
                  💡 Tính năng được liên kết với {featureMilestoneIds.length} cột mốc
                </Typography>
              )}
            </Box>

            <Divider />

            {/* Tags */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Nhãn
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                size="small"
                options={availableTags}
                value={feature?.tags || []}
                disabled={readonly}
                onChange={async (_, newValue) => {
                  if (!readonly) {
                    try {
                      // Remove duplicates and trim
                      const uniqueTags = Array.from(new Set(newValue.map(tag => tag.trim()).filter(Boolean)));
                      await handleFeatureUpdate({ tags: uniqueTags });
                      
                      // Reload tags to include the new one
                      if (projectId) {
                        await loadProjectTags();
                      }
                    } catch (error) {
                      console.error('Error updating tags:', error);
                      // Error already shown in handleFeatureUpdate
                    }
                  }
                }}
                filterOptions={(options, params) => {
                  const filtered = options.filter(option => {
                    // Filter out already selected tags
                    const isAlreadySelected = feature?.tags?.includes(option);
                    // Filter by input value
                    const matchesInput = option.toLowerCase().includes(params.inputValue.toLowerCase());
                    return !isAlreadySelected && matchesInput;
                  });
                  
                  // Add "Create new" option if input doesn't match any existing tag
                  const inputValue = params.inputValue.trim();
                  if (inputValue !== '' && !options.includes(inputValue) && !feature?.tags?.includes(inputValue)) {
                    filtered.push(inputValue);
                  }
                  
                  return filtered;
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={index}
                      label={option}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '12px',
                        bgcolor: '#f3f4f6',
                        color: '#374151',
                        '& .MuiChip-deleteIcon': {
                          fontSize: '16px',
                          color: '#6b7280',
                          '&:hover': {
                            color: '#374151'
                          }
                        }
                      }}
                    />
                  ))
                }
                renderOption={(props, option) => (
                  <li {...props} key={option}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={option} 
                        size="small" 
                        sx={{ 
                          height: 22,
                          fontSize: '11px',
                          bgcolor: '#f3f4f6',
                          color: '#374151'
                        }}
                      />
                      {!availableTags.includes(option) && (
                        <Typography fontSize="11px" color="text.secondary">
                          (Tạo mới)
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Thêm nhãn..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '13px',
                        '& fieldset': {
                          borderColor: '#e8e9eb',
                        },
                        '&:hover fieldset': {
                          borderColor: '#7b68ee',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#7b68ee',
                        }
                      }
                    }}
                  />
                )}
              />
            </Box>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
}

