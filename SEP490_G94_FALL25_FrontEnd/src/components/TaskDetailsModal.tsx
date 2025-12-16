"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Chip,
  Stack,
  Avatar,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Breadcrumbs,
  Link,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FlagIcon from "@mui/icons-material/Flag";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import ClearIcon from "@mui/icons-material/Clear";
import axiosInstance from "../../ultis/axios";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/constants/settings";
import { toast } from "sonner";

import TaskDetailsOverview from "./TaskDetails/TaskDetailsOverview";
import TaskDetailsDependencies from "./TaskDetails/TaskDetailsDependencies";
import TaskDetailsComments from "./TaskDetails/TaskDetailsComments";
import TaskDetailsAttachments from "./TaskDetails/TaskDetailsAttachments";
import TaskDetailsActivity from "./TaskDetails/TaskDetailsActivity";
import DependencyViolationDialog from "./DependencyViolationDialog";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: any;
  assigner_id?: any;
  feature_id?: any;
  function_id?: any;
  milestone_id?: any;
  start_date?: string;
  deadline?: string;
  estimate?: number;
  actual?: number;
  parent_task_id?: string;
  tags?: string[];
  time_tracking?: {
    is_active: boolean;
    total_time: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

interface TaskDetailsModalProps {
  open: boolean;
  taskId: string | null;
  projectId?: string;
  onClose: () => void;
  onUpdate?: () => void;
  readonly?: boolean; // If true, disable edit, add dependency, etc. Only allow view and add comment
}

export default function TaskDetailsModal({ open, taskId, projectId, onClose, onUpdate, readonly = false }: TaskDetailsModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [allStatuses, setAllStatuses] = useState<any[]>([]);
  const [allPriorities, setAllPriorities] = useState<any[]>([]);
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [allFunctions, setAllFunctions] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Dependency violation dialog
  const [dependencyViolationOpen, setDependencyViolationOpen] = useState(false);
  const [dependencyViolations, setDependencyViolations] = useState<any[]>([]);
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);
  const [canForceUpdate, setCanForceUpdate] = useState(false);
  
  // Dependencies state
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [hasMandatoryDependencies, setHasMandatoryDependencies] = useState(false);
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  
  // Date editing state
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [tempDeadline, setTempDeadline] = useState('');

  // Get tab name from index
  const getTabContent = (index: number) => {
    const tabMap = ['overview', 'dependencies', 'comments', 'files', 'activity'];
    return tabMap[index];
  };

  useEffect(() => {
    if (open && taskId) {
      setCurrentTab(0); // Reset to Overview tab when task changes
      setIsEditingTitle(false); // Reset title editing state
      setEditingTitle(''); // Reset editing title
      setEditingStartDate(false); // Reset date editing states
      setEditingDeadline(false);
      setTempStartDate('');
      setTempDeadline('');
      loadTaskDetails();
      loadDependencies();
      // Load constants instead of API call
      setAllStatuses(STATUS_OPTIONS);
      setAllPriorities(PRIORITY_OPTIONS);
      if (projectId) {
        loadFeatures();
        loadTeamMembers();
      }
    }
  }, [open, taskId, projectId]);

  const loadFeatures = async () => {
    if (!projectId) return;
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/features`);
      setAllFeatures(response.data || []);
    } catch (error) {
      console.error('Error loading features:', error);
    }
  };

  const loadFunctions = async () => {
    if (!projectId) {
      console.error('Error loading functions: projectId is required');
      setAllFunctions([]);
      return;
    }
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/functions`);
      setAllFunctions(response.data || []);
    } catch (error) {
      console.error('Error loading functions:', error);
      setAllFunctions([]);
    }
  };

  const loadTeamMembers = async () => {
    if (!projectId) return;
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/team-members`);
      // API returns { team_members: { leaders: [], members: [] } }
      const teamData = response.data?.team_members || {};
      const allMembers = [...(teamData.leaders || []), ...(teamData.members || [])];
      setTeamMembers(allMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    }
  };

  const loadDependencies = async () => {
    if (!taskId) return;
    try {
      const response = await axiosInstance.get(`/api/tasks/${taskId}/dependencies`);
      const deps = response.data?.dependencies || [];
      setDependencies(deps);
      // Check if there are mandatory dependencies
      const hasMandatory = deps.some((dep: any) => dep.is_mandatory === true);
      setHasMandatoryDependencies(hasMandatory);
    } catch (error) {
      console.error('Error loading dependencies:', error);
      setDependencies([]);
      setHasMandatoryDependencies(false);
    }
  };

  const loadTaskDetails = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/tasks/${taskId}`);
      setTask(response.data);
      
      // Load all functions for the project
      if (projectId) {
        await loadFunctions();
      }
    } catch (error: any) {
      console.error("Error loading task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (updates: any, forceUpdate = false, skipParentRefresh = false) => {
    try {
      // Send request to server
      await axiosInstance.patch(`/api/tasks/${taskId}`, {
        ...updates,
        force_update: forceUpdate
      });
      
      // Silently reload task data in background without showing loading state
      const response = await axiosInstance.get(`/api/tasks/${taskId}`);
      setTask(response.data);
      
      // Temporarily disable parent refresh to prevent page reload
      // TODO: Re-enable selectively for status/priority changes only
      // if (!skipParentRefresh && onUpdate) {
      //   onUpdate();
      // }
      return { success: true };
    } catch (error: any) {
      console.error("Error updating task:", error);
      
      // Check if error is due to validation failure (dependency or date validation)
      if (error?.response?.status === 400) {
        const responseData = error.response.data;
        
        // Handle dependency violations
        if (responseData.violations) {
          const violations = responseData.violations;
          const canForce = responseData.can_force || false;
          
          // Show dependency violation dialog
          setDependencyViolations(violations);
          setCanForceUpdate(canForce);
          setPendingUpdate(updates);
          setDependencyViolationOpen(true);
          
          // Reload to restore correct state
          await loadTaskDetails();
          return { success: false, hasValidationError: true }; // Don't throw error, let user decide
        }
        
        // Handle date validation errors - show toast instead of dependency dialog
        if (responseData.type === 'date_validation' || (responseData.errors && responseData.message && responseData.message.includes('validation'))) {
          const errorMessages = responseData.errors || [];
          if (errorMessages.length > 0) {
            const errorText = errorMessages.length === 1 
              ? errorMessages[0]
              : errorMessages.join('. ');
            toast.error(`Lỗi xác thực ngày: ${errorText}`, {
              duration: 5000
            });
          } else {
            toast.error(responseData.message || "Lỗi xác thực ngày tháng", {
              duration: 5000
            });
          }
          
          // Reload to restore correct state
          await loadTaskDetails();
          return { success: false, hasValidationError: true };
        }
      }
      
      // Reload on other errors to restore correct state
      await loadTaskDetails();
      throw error;
    }
  };
  
  const handleForceUpdate = async () => {
    if (pendingUpdate) {
      try {
        await handleTaskUpdate(pendingUpdate, true);
        setDependencyViolationOpen(false);
        setPendingUpdate(null);
      } catch (error: any) {
        console.error("Force update failed:", error);
        toast.error("Không thể force update", {
          description: error?.response?.data?.message || 'Vui lòng thử lại'
        });
      }
    }
  };

  const handleStartEditTitle = () => {
    setEditingTitle(task?.title || '');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!editingTitle.trim()) {
      toast.error('Tiêu đề không được để trống');
      return;
    }
    try {
      const result = await handleTaskUpdate({ title: editingTitle.trim() });
      setIsEditingTitle(false);
      if (result?.success) {
        toast.success('Đã cập nhật tiêu đề thành công');
      }
    } catch (error: any) {
      console.error('Error updating title:', error);
      toast.error('Không thể cập nhật tiêu đề', {
        description: error?.response?.data?.message || 'Vui lòng thử lại'
      });
    }
  };

  const handleCancelEditTitle = () => {
    setEditingTitle('');
    setIsEditingTitle(false);
  };

  const handleStartEditStartDate = () => {
    setTempStartDate(task?.start_date ? new Date(task.start_date).toISOString().split('T')[0] : '');
    setEditingStartDate(true);
  };

  const handleSaveStartDate = async () => {
    if (hasMandatoryDependencies) {
      const confirm = window.confirm(
        '⚠️ Công việc này có phụ thuộc bắt buộc!\n\n' +
        'Thay đổi ngày bắt đầu có thể vi phạm ràng buộc phụ thuộc.\n\n' +
        'Hãy cân nhắc sử dụng "Tự động điều chỉnh ngày" trong tab Phụ thuộc thay vào đó.\n\n' +
        'Bạn có muốn tiếp tục không?'
      );
      if (!confirm) {
        setEditingStartDate(false);
        return;
      }
    }
    try {
      const result = await handleTaskUpdate({ start_date: tempStartDate || null });
      await loadDependencies(); // Reload to check new state
      setEditingStartDate(false);
      if (result?.success) {
        toast.success('Đã cập nhật ngày bắt đầu thành công');
      }
    } catch (error: any) {
      console.error('Error updating start date:', error);
      toast.error('Không thể cập nhật ngày bắt đầu', {
        description: error?.response?.data?.message || 'Vui lòng thử lại'
      });
    }
  };

  const handleCancelEditStartDate = () => {
    setTempStartDate('');
    setEditingStartDate(false);
  };

  const handleClearStartDate = async () => {
    if (hasMandatoryDependencies) {
      const confirm = window.confirm(
        '⚠️ Công việc này có phụ thuộc bắt buộc!\n\n' +
        'Xóa ngày bắt đầu có thể vi phạm ràng buộc phụ thuộc.\n\n' +
        'Bạn có muốn tiếp tục không?'
      );
      if (!confirm) return;
    }
    try {
      const result = await handleTaskUpdate({ start_date: null });
      await loadDependencies();
      if (result?.success) {
        toast.success('Đã xóa ngày bắt đầu');
      }
    } catch (error: any) {
      console.error('Error clearing start date:', error);
      toast.error('Không thể xóa ngày bắt đầu', {
        description: error?.response?.data?.message || 'Vui lòng thử lại'
      });
    }
  };

  const handleStartEditDeadline = () => {
    setTempDeadline(task?.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '');
    setEditingDeadline(true);
  };

  const handleSaveDeadline = async () => {
    if (hasMandatoryDependencies) {
      const confirm = window.confirm(
        '⚠️ Công việc này có phụ thuộc bắt buộc!\n\n' +
        'Thay đổi hạn chót có thể vi phạm ràng buộc phụ thuộc.\n\n' +
        'Hãy cân nhắc sử dụng "Tự động điều chỉnh ngày" trong tab Phụ thuộc thay vào đó.\n\n' +
        'Bạn có muốn tiếp tục không?'
      );
      if (!confirm) {
        setEditingDeadline(false);
        return;
      }
    }
    try {
      const result = await handleTaskUpdate({ deadline: tempDeadline || null });
      await loadDependencies(); // Reload to check new state
      setEditingDeadline(false);
      if (result?.success) {
        toast.success('Đã cập nhật hạn chót thành công');
      }
    } catch (error: any) {
      console.error('Error updating deadline:', error);
      toast.error('Không thể cập nhật hạn chót', {
        description: error?.response?.data?.message || 'Vui lòng thử lại'
      });
    }
  };

  const handleCancelEditDeadline = () => {
    setTempDeadline('');
    setEditingDeadline(false);
  };

  const handleClearDeadline = async () => {
    if (hasMandatoryDependencies) {
      const confirm = window.confirm(
        '⚠️ Công việc này có phụ thuộc bắt buộc!\n\n' +
        'Xóa hạn chót có thể vi phạm ràng buộc phụ thuộc.\n\n' +
        'Bạn có muốn tiếp tục không?'
      );
      if (!confirm) return;
    }
    try {
      const result = await handleTaskUpdate({ deadline: null });
      await loadDependencies();
      if (result?.success) {
        toast.success('Đã xóa hạn chót');
      }
    } catch (error: any) {
      console.error('Error clearing deadline:', error);
      toast.error('Không thể xóa hạn chót', {
        description: error?.response?.data?.message || 'Vui lòng thử lại'
      });
    }
  };

  const formatDateDisplay = (dateString: string | undefined) => {
    if (!dateString) return 'Chưa đặt';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const key = (status || '').toLowerCase();
    if (key.includes('completed') || key.includes('done')) return '#16a34a';
    if (key.includes('progress') || key.includes('doing')) return '#f59e0b';
    if (key.includes('overdue') || key.includes('blocked')) return '#ef4444';
    return '#9ca3af';
  };

  const getPriorityColor = (priority: string) => {
    const key = (priority || '').toLowerCase();
    if (key.includes('critical') || key.includes('high')) return '#ef4444';
    if (key.includes('medium')) return '#f59e0b';
    return '#3b82f6';
  };

  if (!task && !loading) return null;

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
              {task?.function_id && typeof task.function_id === 'object' ? task.function_id.title : 'Công việc'}
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
              {task?.title || 'Chi tiết công việc'}
            </Typography>
          </Breadcrumbs>

          {/* Action Buttons */}
          <IconButton size="small" onClick={onClose} sx={{ color: '#6b7280' }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Task Title & Quick Actions */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            {/* Title - Editable */}
            <Box sx={{ flex: 1 }}>
              {isEditingTitle ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <TextField
                    fullWidth
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveTitle();
                      } else if (e.key === 'Escape') {
                        handleCancelEditTitle();
                      }
                    }}
                    autoFocus
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '24px',
                        fontWeight: 700,
                        '& fieldset': {
                          borderColor: '#7b68ee',
                          borderWidth: 2,
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
                  <IconButton
                    size="small"
                    onClick={handleSaveTitle}
                    sx={{
                      color: '#7b68ee',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    <SaveIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={handleCancelEditTitle}
                    sx={{
                      color: '#6b7280',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    <CancelIcon />
                  </IconButton>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography 
                    variant="h5" 
                    fontWeight={700}
                    onClick={readonly ? undefined : handleStartEditTitle}
                    sx={{ 
                      color: '#1f2937',
                      lineHeight: 1.3,
                      cursor: readonly ? 'default' : 'text',
                      flex: 1,
                      '&:hover': readonly ? {} : {
                        bgcolor: '#f9fafb',
                        px: 1,
                        mx: -1,
                        borderRadius: 1,
                      }
                    }}
                  >
                    {task?.title || 'Đang tải...'}
                  </Typography>
                </Stack>
              )}

              {/* Meta Info Row */}
              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
              {task?._id && (
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
                    ID: {task._id}
                  </Typography>
                )}
                {/* Status */}
                {task?.status && (
                  <Chip 
                    label={typeof task.status === 'object' ? (task.status as any)?.name : task.status} 
                    size="small"
                    sx={{ 
                      height: 24,
                      fontSize: '12px',
                      fontWeight: 600,
                      bgcolor: `${getStatusColor(typeof task.status === 'object' ? (task.status as any)?.name : task.status)}15`,
                      color: getStatusColor(typeof task.status === 'object' ? (task.status as any)?.name : task.status),
                      border: `1px solid ${getStatusColor(typeof task.status === 'object' ? (task.status as any)?.name : task.status)}40`,
                    }}
                  />
                )}

                {/* Priority */}
                {task?.priority && (
                  <Chip 
                    icon={<FlagIcon sx={{ fontSize: 14 }} />}
                    label={typeof task.priority === 'object' ? (task.priority as any)?.name : task.priority} 
                    size="small"
                    sx={{ 
                      height: 24,
                      fontSize: '12px',
                      fontWeight: 600,
                      bgcolor: `${getPriorityColor(typeof task.priority === 'object' ? (task.priority as any)?.name : task.priority)}15`,
                      color: getPriorityColor(typeof task.priority === 'object' ? (task.priority as any)?.name : task.priority),
                      border: `1px solid ${getPriorityColor(typeof task.priority === 'object' ? (task.priority as any)?.name : task.priority)}40`,
                    }}
                  />
                )}

                {/* Assignee */}
                {task?.assignee_id && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Avatar 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        fontSize: '11px',
                        bgcolor: '#7b68ee',
                        fontWeight: 600
                      }}
                    >
                      {(task.assignee_id?.full_name || task.assignee_id?.email || 'U')[0].toUpperCase()}
                    </Avatar>
                    <Typography fontSize="13px" color="text.secondary">
                      {task.assignee_id?.full_name || task.assignee_id?.email}
                    </Typography>
                  </Stack>
                )}
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
            <Tab label="Phụ thuộc" />
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
              {getTabContent(currentTab) === 'overview' && <TaskDetailsOverview key={task?.updatedAt || task?._id} task={task} onUpdate={async (updates: any) => {
                await handleTaskUpdate(updates);
              }} readonly={readonly} />}
              {getTabContent(currentTab) === 'dependencies' && <TaskDetailsDependencies key={task?.updatedAt || task?._id} taskId={taskId} projectId={projectId} onTaskUpdate={loadTaskDetails} readonly={readonly} />}
              {getTabContent(currentTab) === 'comments' && <TaskDetailsComments key={task?.updatedAt || task?._id} taskId={taskId} readonly={readonly} />}
              {getTabContent(currentTab) === 'files' && <TaskDetailsAttachments key={task?.updatedAt || task?._id} taskId={taskId} />}
              {getTabContent(currentTab) === 'activity' && <TaskDetailsActivity key={task?.updatedAt || task?._id} taskId={taskId} />}
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
            {/* Status */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Trạng thái
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  disabled={readonly}
                  value={typeof task?.status === 'object' ? (task.status as any)?._id : task?.status || ''}
                  onChange={async (e) => {
                    try {
                      const result = await handleTaskUpdate({ status: e.target.value });
                      if (result?.success) {
                        toast.success('Đã cập nhật trạng thái thành công');
                      }
                    } catch (error: any) {
                      console.error('Error updating status:', error);
                      toast.error('Không thể cập nhật trạng thái', {
                        description: error?.response?.data?.message || 'Vui lòng thử lại'
                      });
                    }
                  }}
                  displayEmpty
                  renderValue={(value) => {
                    const statusObj = allStatuses.find(s => s._id === value);
                    return statusObj?.name || 'Chọn trạng thái';
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
                  {allStatuses.map((s) => (
                    <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Priority */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Ưu tiên
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  disabled={readonly}
                  value={typeof task?.priority === 'object' ? (task.priority as any)?._id : task?.priority || ''}
                  onChange={async (e) => {
                    try {
                      const result = await handleTaskUpdate({ priority: e.target.value || null });
                      if (result?.success) {
                        toast.success('Đã cập nhật ưu tiên thành công');
                      }
                    } catch (error: any) {
                      console.error('Error updating priority:', error);
                      toast.error('Không thể cập nhật ưu tiên', {
                        description: error?.response?.data?.message || 'Vui lòng thử lại'
                      });
                    }
                  }}
                  displayEmpty
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

            {/* Feature (Read-only) & Function */}
            <>
            <Divider />

                {/* Feature (Read-only, derived from Function) */}
                <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Tính năng
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: '#f9fafb',
                  border: '1px solid #e8e9eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6', flexShrink: 0 }} />
                <Typography 
                  fontSize="13px" 
                  fontWeight={500}
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task?.function_id?.feature_id?.title || 'Không có tính năng'}
                </Typography>
              </Box>
              <Typography fontSize="11px" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                Tính năng được xác định bởi chức năng đã chọn
              </Typography>
            </Box>

            <Divider />

                {/* Function */}
                <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Chức năng
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  disabled={readonly}
                  value={typeof task?.function_id === 'object' ? task.function_id?._id || '' : task?.function_id || ''}
                  onChange={async (e) => {
                    const newFunctionId = e.target.value;
                    try {
                      const result = await handleTaskUpdate({ 
                        function_id: newFunctionId || null
                      });
                      // Only show success if there's no validation error
                      if (result?.success) {
                        toast.success('Đã cập nhật chức năng thành công');
                      }
                    } catch (error: any) {
                      console.error('Error updating function:', error);
                      toast.error('Không thể cập nhật function', {
                        description: error?.response?.data?.message || 'Vui lòng thử lại'
                      });
                    }
                  }}
                  displayEmpty
                  renderValue={(value) => {
                    if (!value) return <em style={{ color: '#9ca3af' }}>Chọn chức năng</em>;
                    const selected = allFunctions.find((f: any) => f._id === value);
                    const title = selected?.title || 'Không rõ';
                    return (
                      <Tooltip title={title} arrow placement="top">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#8b5cf6', flexShrink: 0 }} />
                          <Typography 
                            fontSize="13px" 
                            fontWeight={500}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {title}
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  }}
                  sx={{ 
                    fontSize: '13px',
                    fontWeight: 500,
                    bgcolor: '#faf5ff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e9d5ff',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#8b5cf6',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#8b5cf6',
                    }
                  }}
                >
                  <MenuItem value=""><em>Không chọn</em></MenuItem>
                  {allFunctions.map((f: any) => (
                    <MenuItem key={f._id} value={f._id}>
                      <Tooltip title={f.title} arrow placement="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden', width: '100%' }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#8b5cf6', flexShrink: 0 }} />
                          <Typography 
                            fontSize="13px" 
                            fontWeight={500}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {f.title}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

                <Divider />
              </>

            {/* Assignee */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Người thực hiện
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  disabled={readonly}
                  value={typeof task?.assignee_id === 'object' ? task.assignee_id?._id || '' : task?.assignee_id || ''}
                  onChange={async (e) => {
                    try {
                      const result = await handleTaskUpdate({ assignee_id: e.target.value || null });
                      if (result?.success) {
                        toast.success('Đã cập nhật người thực hiện thành công');
                      }
                    } catch (error: any) {
                      console.error('Error updating assignee:', error);
                      toast.error('Không thể cập nhật người thực hiện', {
                        description: error?.response?.data?.message || 'Vui lòng thử lại'
                      });
                    }
                  }}
                  displayEmpty
                  renderValue={(value) => {
                    if (!value) return <em style={{ color: '#9ca3af' }}>Chưa giao</em>;
                    
                    // Try to get from current task data first
                    let name = 'Không rõ';
                    if (typeof task?.assignee_id === 'object' && task?.assignee_id) {
                      name = task.assignee_id.full_name || task.assignee_id.email || 'Không rõ';
                    } else {
                      // Fallback to team members
                      const selected = teamMembers.find((m: any) => m.user_id?._id === value);
                      name = selected?.user_id?.full_name || selected?.user_id?.email || 'Không rõ';
                    }
                    
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                        <Avatar sx={{ width: 20, height: 20, fontSize: '10px', bgcolor: '#7b68ee', flexShrink: 0 }}>
                          {name[0].toUpperCase()}
                        </Avatar>
                        <Typography 
                          fontSize="13px" 
                          sx={{ 
                            flex: 1,
                            minWidth: 0
                          }}
                          title={name}
                        >
                          {name}
                        </Typography>
                      </Box>
                    );
                  }}
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
                  <MenuItem value="">
                    <em>Chưa giao</em>
                  </MenuItem>
                  {teamMembers.map((member: any) => (
                    <MenuItem key={member.user_id?._id} value={member.user_id?._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '11px', bgcolor: '#7b68ee' }}>
                          {(member.user_id?.full_name || member.user_id?.email || 'U')[0].toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography fontSize="13px" fontWeight={500}>
                            {member.user_id?.full_name || member.user_id?.email}
                          </Typography>
                          <Typography fontSize="11px" color="text.secondary">
                            {member.role}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Divider />

            {/* Dates */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography fontSize="12px" fontWeight={600} color="text.secondary">
                  Ngày bắt đầu
                  {hasMandatoryDependencies && (
                    <Chip 
                      label="⚠️ Bị ràng buộc" 
                      size="small" 
                      sx={{ 
                        ml: 1,
                        height: 18,
                        fontSize: '10px',
                        bgcolor: '#fff3cd',
                        color: '#856404',
                        fontWeight: 600
                      }} 
                    />
                  )}
                </Typography>
                {!readonly && !editingStartDate && task?.start_date && (
                  <IconButton
                    size="small"
                    onClick={handleClearStartDate}
                    sx={{ 
                      width: 20, 
                      height: 20,
                      color: '#9ca3af',
                      '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' }
                    }}
                  >
                    <ClearIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Box>
              {editingStartDate ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TextField
                    type="date"
                    fullWidth
                    size="small"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveStartDate();
                      } else if (e.key === 'Escape') {
                        handleCancelEditStartDate();
                      }
                    }}
                    autoFocus
                    InputProps={{
                      sx: { 
                        fontSize: '13px',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: hasMandatoryDependencies ? '#ffc107' : '#7b68ee',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: hasMandatoryDependencies ? '#ff9800' : '#7b68ee',
                        }
                      }
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleSaveStartDate}
                    sx={{
                      color: '#7b68ee',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    <SaveIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={handleCancelEditStartDate}
                    sx={{
                      color: '#6b7280',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    <CancelIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              ) : (
                <Box
                  onClick={readonly ? undefined : handleStartEditStartDate}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: '#f9fafb',
                    border: '1px solid #e8e9eb',
                    cursor: readonly ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': readonly ? {} : {
                      borderColor: '#7b68ee',
                      bgcolor: '#faf5ff'
                    }
                  }}
                >
                  <Typography 
                    fontSize="13px" 
                    fontWeight={500}
                    color={task?.start_date ? 'text.primary' : 'text.secondary'}
                    sx={{ fontStyle: task?.start_date ? 'normal' : 'italic' }}
                  >
                    {formatDateDisplay(task?.start_date)}
                  </Typography>
                  {!readonly && (
                    <EditIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                  )}
                </Box>
              )}
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography fontSize="12px" fontWeight={600} color="text.secondary">
                  Hạn chót
                  {hasMandatoryDependencies && (
                    <Chip 
                      label="⚠️ Bị ràng buộc" 
                      size="small" 
                      sx={{ 
                        ml: 1,
                        height: 18,
                        fontSize: '10px',
                        bgcolor: '#fff3cd',
                        color: '#856404',
                        fontWeight: 600
                      }} 
                    />
                  )}
                </Typography>
                {!readonly && !editingDeadline && task?.deadline && (
                  <IconButton
                    size="small"
                    onClick={handleClearDeadline}
                    sx={{ 
                      width: 20, 
                      height: 20,
                      color: '#9ca3af',
                      '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' }
                    }}
                  >
                    <ClearIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Box>
              {editingDeadline ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TextField
                    type="date"
                    fullWidth
                    size="small"
                    value={tempDeadline}
                    onChange={(e) => setTempDeadline(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveDeadline();
                      } else if (e.key === 'Escape') {
                        handleCancelEditDeadline();
                      }
                    }}
                    autoFocus
                    InputProps={{
                      sx: { 
                        fontSize: '13px',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: hasMandatoryDependencies ? '#ffc107' : '#7b68ee',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: hasMandatoryDependencies ? '#ff9800' : '#7b68ee',
                        }
                      }
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleSaveDeadline}
                    sx={{
                      color: '#7b68ee',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    <SaveIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={handleCancelEditDeadline}
                    sx={{
                      color: '#6b7280',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    <CancelIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              ) : (
                <Box
                  onClick={readonly ? undefined : handleStartEditDeadline}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: task?.deadline && new Date(task.deadline) < new Date() && task?.status !== 'Done' ? '#fef3c7' : '#f9fafb',
                    border: `1px solid ${task?.deadline && new Date(task.deadline) < new Date() && task?.status !== 'Done' ? '#fbbf24' : '#e8e9eb'}`,
                    cursor: readonly ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': readonly ? {} : {
                      borderColor: task?.deadline && new Date(task.deadline) < new Date() && task?.status !== 'Done' ? '#f59e0b' : '#7b68ee',
                      bgcolor: task?.deadline && new Date(task.deadline) < new Date() && task?.status !== 'Done' ? '#fef3c7' : '#faf5ff'
                    }
                  }}
                >
                  <Typography 
                    fontSize="13px" 
                    fontWeight={500}
                    color={task?.deadline 
                      ? (new Date(task.deadline) < new Date() && task?.status !== 'Done' ? '#92400e' : 'text.primary')
                      : 'text.secondary'
                    }
                    sx={{ fontStyle: task?.deadline ? 'normal' : 'italic' }}
                  >
                    {formatDateDisplay(task?.deadline)}
                  </Typography>
                  {!readonly && (
                    <EditIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                  )}
                </Box>
              )}
            </Box>

            <Divider />

            {/* Estimate */}
            <Box>
              <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                Thời gian ước tính (giờ)
              </Typography>
              <TextField
                type="number"
                fullWidth
                size="small"
                value={task?.estimate || ''}
                onChange={async (e) => {
                  try {
                    const result = await handleTaskUpdate({ estimate: Number(e.target.value) });
                    if (result?.success) {
                      toast.success('Đã cập nhật thời gian ước tính thành công');
                    }
                  } catch (error: any) {
                    console.error('Error updating estimate:', error);
                    toast.error('Không thể cập nhật thời gian ước tính', {
                      description: error?.response?.data?.message || 'Vui lòng thử lại'
                    });
                  }
                }}
                placeholder="0"
                InputProps={{
                  sx: { 
                    fontSize: '13px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e8e9eb',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#7b68ee',
                    }
                  }
                }}
              />
            </Box>

            <Divider />

            {/* Tags */}
            {task?.tags && task.tags.length > 0 && (
              <Box>
                <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                  Nhãn
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                  {task.tags.map((tag, i) => (
                    <Chip 
                      key={i}
                      label={tag} 
                      size="small"
                      sx={{ 
                        height: 20,
                        fontSize: '11px',
                        bgcolor: '#f3f4f6',
                        color: '#6b7280'
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      </Box>
      
      {/* Dependency Violation Dialog */}
      <DependencyViolationDialog
        open={dependencyViolationOpen}
        onClose={() => {
          setDependencyViolationOpen(false);
          setPendingUpdate(null);
        }}
        onForceUpdate={handleForceUpdate}
        violations={dependencyViolations}
        canForce={canForceUpdate}
      />
    </Drawer>
  );
}

