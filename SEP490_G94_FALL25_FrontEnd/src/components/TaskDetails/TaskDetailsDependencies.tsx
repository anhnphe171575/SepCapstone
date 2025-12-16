"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Alert,
  Avatar,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import BlockIcon from "@mui/icons-material/Block";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import axiosInstance from "../../../ultis/axios";
import { normalizeStatusValue } from "@/constants/settings";
import DependencyDateConflictDialog from "../DependencyDateConflictDialog";
import { toast } from "sonner";

interface TaskDetailsDependenciesProps {
  taskId: string | null;
  projectId?: string;
  onTaskUpdate?: () => void | Promise<void>;
  readonly?: boolean;
}

export default function TaskDetailsDependencies({ taskId, projectId, onTaskUpdate, readonly = false }: TaskDetailsDependenciesProps) {
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [dependents, setDependents] = useState<any[]>([]);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDependency, setNewDependency] = useState({
    depends_on_task_id: '',
    dependency_type: 'FS',
    lag_days: 0,
    is_mandatory: true,
    notes: ''
  });

  // State for date conflict dialog
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictViolation, setConflictViolation] = useState<any>(null);
  const [currentTask, setCurrentTask] = useState<any>(null);

  useEffect(() => {
    if (taskId) {
      loadCurrentTask();
      loadDependencies();
      if (projectId) {
        loadAvailableTasks();
      }
    }
  }, [taskId, projectId]);

  // Reset selected task if it already has a dependency
  useEffect(() => {
    if (newDependency.depends_on_task_id && dependencies.length > 0) {
      const existingDependencyIds = dependencies.map((dep: any) => {
        const taskId = typeof dep.depends_on_task_id === 'object' 
          ? dep.depends_on_task_id?._id 
          : dep.depends_on_task_id;
        return taskId;
      });
      
      if (existingDependencyIds.includes(newDependency.depends_on_task_id)) {
        setNewDependency((prev) => ({ ...prev, depends_on_task_id: '' }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies]);

  const loadCurrentTask = async () => {
    if (!taskId) return;
    
    try {
      const response = await axiosInstance.get(`/api/tasks/${taskId}`);
      setCurrentTask(response.data);
    } catch (error: any) {
      console.error("Error loading current task:", error);
    }
  };

  const loadDependencies = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/tasks/${taskId}/dependencies`);
      setDependencies(response.data.dependencies || []);
      setDependents(response.data.dependents || []);
      setError(null);
    } catch (error: any) {
      console.error("Error loading dependencies:", error);
      setError("Không thể tải phụ thuộc");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTasks = async () => {
    // Load all tasks from current project to allow selection
    if (!projectId) {
      console.warn('No projectId provided - cannot load available tasks');
      return;
    }
    
    try {
      // Get project tasks
      const response = await axiosInstance.get(`/api/projects/${projectId}/tasks`);
      const tasks = response.data?.tasks || response.data || [];
      setAvailableTasks(tasks.filter((t: any) => t._id !== taskId));
    } catch (error) {
      console.error("Error loading tasks:", error);
      setError("Không thể tải danh sách công việc");
    }
  };

  const addDependency = async () => {
    if (!taskId || !newDependency.depends_on_task_id) return;
    
    try {
      const response = await axiosInstance.post(`/api/tasks/${taskId}/dependencies`, {
        depends_on_task_id: newDependency.depends_on_task_id,
        dependency_type: newDependency.dependency_type,
        lag_days: newDependency.lag_days,
        is_mandatory: newDependency.is_mandatory,
        notes: newDependency.notes,
        strict_validation: newDependency.is_mandatory // Enable strict validation for mandatory dependencies
      });
      
      // Check for warnings (non-blocking)
      const warnings = response.data.warnings || [];
      const statusWarning = response.data.status_warning;
      const dateWarning = response.data.warning;
      
      if (warnings.length > 0) {
        let warningMessage = '⚠️ Dependency created with warnings:\n\n';
        warnings.forEach((w: any, index: number) => {
          warningMessage += `${index + 1}. ${w.message}\n${w.suggestion || ''}\n\n`;
        });
        
        toast.warning('Dependency được tạo với cảnh báo', {
          description: warnings.map((w: any) => w.message).join('\n'),
          duration: 5000
        });
      } else if (statusWarning) {
        // Legacy: show status warning
        toast.warning('Cảnh báo trạng thái', {
          description: `${statusWarning.message}\n\n${statusWarning.suggestion}\n\n✅ Dependency được tạo thành công, nhưng bạn nên kiểm tra trạng thái task.`,
          duration: 5000
        });
      } else if (dateWarning) {
        // Legacy: show date warning - especially for SS dependency
        const isSS = newDependency.dependency_type === 'SS';
        const warningTitle = isSS 
          ? '⚠️ Cảnh báo: Ngày bắt đầu không khớp (SS Dependency)'
          : '⚠️ Cảnh báo: Ngày tháng không khớp';
        
        toast.warning(warningTitle, {
          description: `${dateWarning.message}\n\n${dateWarning.suggestion}\n\n✅ Dependency được tạo thành công.`,
          duration: 6000
        });
      } else {
        // Success without warnings
        toast.success('Đã thêm phụ thuộc thành công');
      }
      
      setNewDependency({ depends_on_task_id: '', dependency_type: 'FS', lag_days: 0, is_mandatory: true, notes: '' });
      setShowAddForm(false);
      setError(null);
      await loadDependencies();
      if (onTaskUpdate) {
        await onTaskUpdate();
      }
    } catch (error: any) {
      console.error('Error adding dependency:', error);
      console.error('Error response:', error?.response);
      console.error('Error data:', error?.response?.data);
      
      const errorData = error?.response?.data;
      if (error?.response?.status === 400 && errorData?.violation) {
        // Date violation - show detailed error
        const violation = errorData.violation;
        const errorMessage = `${errorData.message}\n\n${violation.suggestion || ''}`;
        const isSS = newDependency.dependency_type === 'SS';
        
        // For SS dependency, check if we can auto-fix based on required_start_date or predecessor_start_date
        const canAutoFixSS = violation.required_start_date || violation.predecessor_start_date;
        const hasRequiredDate = violation.required_start_date || violation.predecessor_start_date;
        
        // Only offer auto-fix for MANDATORY dependencies
        if (newDependency.is_mandatory && (errorData.can_auto_fix || (isSS && canAutoFixSS)) && hasRequiredDate) {
          // Show new conflict dialog instead of window.confirm
          setConflictViolation(violation);
          setShowConflictDialog(true);
        } else if (!newDependency.is_mandatory) {
          // For OPTIONAL dependencies, show warning and ask if user wants to proceed anyway
          const proceed = window.confirm(
            `⚠️ Cảnh báo:\n\n${errorMessage}\n\nĐây là optional dependency nên không tự động điều chỉnh ngày.\n\nBạn có muốn tiếp tục thêm dependency này không?`
          );
          if (proceed) {
            // Force add the optional dependency by disabling strict validation
            try {
              await axiosInstance.post(`/api/tasks/${taskId}/dependencies`, {
                depends_on_task_id: newDependency.depends_on_task_id,
                dependency_type: newDependency.dependency_type,
                lag_days: newDependency.lag_days,
                is_mandatory: newDependency.is_mandatory,
                notes: newDependency.notes,
                strict_validation: false
              });
              setNewDependency({ depends_on_task_id: '', dependency_type: 'FS', lag_days: 0, is_mandatory: true, notes: '' });
              setShowAddForm(false);
              await loadDependencies();
              if (onTaskUpdate) {
                await onTaskUpdate();
              }
              toast.success('Đã thêm phụ thuộc tùy chọn thành công');
            } catch (forceError: any) {
              const forceErrorMsg = forceError?.response?.data?.message || 'Không thể thêm dependency';
              setError(forceErrorMsg);
              toast.error('Không thể thêm phụ thuộc', {
                description: forceErrorMsg
              });
            }
          }
        } else {
          // Mandatory dependency but cannot auto-fix - show error message
          const errorMsg = errorData?.message || violation?.message || 'Không thể thêm phụ thuộc vì vi phạm quy tắc ngày tháng';
          const suggestion = violation?.suggestion || '';
          setError(errorMsg);
          toast.error('Không thể thêm phụ thuộc', {
            description: suggestion ? `${errorMsg}\n\n${suggestion}` : errorMsg,
            duration: 6000
          });
        }
      } else {
        // Other 400 errors or non-400 errors
        const errorMsg = errorData?.message || error?.message || 'Failed to add dependency';
        setError(errorMsg);
        toast.error('Không thể thêm phụ thuộc', {
          description: errorMsg,
          duration: 5000
        });
      }
    }
  };

  const handleAutoFix = async () => {
    try {
      setShowConflictDialog(false);
      setError(null);
      
      // STEP 1: Create dependency first (without strict validation)
      console.log('➕ Step 1: Creating dependency...');
      const retryResponse = await axiosInstance.post(`/api/tasks/${taskId}/dependencies`, {
        depends_on_task_id: newDependency.depends_on_task_id,
        dependency_type: newDependency.dependency_type,
        lag_days: newDependency.lag_days,
        is_mandatory: newDependency.is_mandatory,
        notes: newDependency.notes,
        strict_validation: false
      });
      console.log('✅ Dependency created:', retryResponse.data);
      
      // STEP 2: Auto-adjust dates based on the newly created dependency
      console.log('🔧 Step 2: Auto-adjusting dates for task:', taskId);
      const adjustResponse = await axiosInstance.post(`/api/tasks/${taskId}/auto-adjust-dates`, {
        preserve_duration: true
      });
      console.log('✅ Auto-adjust response:', adjustResponse.data);
      
      if (adjustResponse.data.success) {
        console.log('✅ Dates adjusted successfully!');
        console.log('Old dates:', adjustResponse.data.task?.old_dates);
        console.log('New dates:', adjustResponse.data.task?.new_dates);
      } else {
        console.warn('⚠️ No adjustments made:', adjustResponse.data.message);
      }
      
      setNewDependency({ depends_on_task_id: '', dependency_type: 'FS', lag_days: 0, is_mandatory: true, notes: '' });
      setShowAddForm(false);
      
      // STEP 3: Reload everything to show changes
      console.log('🔄 Step 3: Reloading data...');
      await loadDependencies();
      await loadCurrentTask();
      
      // Reload task details in parent component
      if (onTaskUpdate) {
        await onTaskUpdate();
      }
      console.log('✅ All done!');
      toast.success('Đã thêm phụ thuộc và tự động điều chỉnh ngày thành công');
    } catch (fixError: any) {
      console.error('❌ Auto-fix error:', fixError);
      console.error('Error details:', fixError?.response?.data);
      setError(fixError?.response?.data?.message || 'Không thể tự động điều chỉnh');
      setShowConflictDialog(true); // Show dialog again on error
    }
  };

  const handleManualEdit = () => {
    // Close conflict dialog but keep add form open so user can edit dates
    setShowConflictDialog(false);
    setError('⚠️ Vui lòng chỉnh sửa ngày tháng của task trong tab Overview trước khi thêm dependency này. Sau đó thử lại.');
    // Keep form open so they can try again after editing dates
  };

  const removeDependency = async (depId: string) => {
    if (!taskId) return;
    
    try {
      await axiosInstance.delete(`/api/tasks/${taskId}/dependencies/${depId}`);
      await loadDependencies();
      if (onTaskUpdate) {
        await onTaskUpdate();
      }
      toast.success('Đã xóa phụ thuộc thành công');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Không thể xóa phụ thuộc';
      setError(errorMsg);
      toast.error('Không thể xóa phụ thuộc', {
        description: errorMsg
      });
    }
  };

  const getDependencyTypeInfo = (type: string) => {
    const types: Record<string, { label: string; color: string; desc: string; icon: string }> = {
      'FS': { 
        label: 'Hoàn thành - Bắt đầu', 
        color: '#3b82f6', 
        desc: 'Phải hoàn thành trước khi công việc tiếp theo bắt đầu',
        icon: '→'
      },
      'FF': { 
        label: 'Hoàn thành - Hoàn thành', 
        color: '#8b5cf6', 
        desc: 'Phải hoàn thành cùng lúc',
        icon: '⟹'
      },
      'SS': { 
        label: 'Bắt đầu - Bắt đầu', 
        color: '#10b981', 
        desc: 'Phải bắt đầu cùng lúc',
        icon: '⇉'
      },
      'SF': { 
        label: 'Bắt đầu - Hoàn thành', 
        color: '#f59e0b', 
        desc: 'Phải bắt đầu trước khi công việc tiếp theo hoàn thành',
        icon: '↷'
      },
      'relates_to': { 
        label: 'Liên quan đến', 
        color: '#6b7280', 
        desc: 'Chỉ liên kết tham chiếu',
        icon: '⟷'
      }
    };
    return types[type] || types['FS'];
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Đang tải phụ thuộc...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Info Banner */}
      <Box sx={{ 
        mb: 4, 
        p: 2.5, 
        bgcolor: '#eff6ff', 
        borderRadius: 2,
        border: '1px solid #bfdbfe'
      }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <InfoOutlinedIcon sx={{ fontSize: 20, color: '#3b82f6', mt: 0.25 }} />
          <Box>
            <Typography fontSize="13px" fontWeight={600} color="#1e40af" sx={{ mb: 0.5 }}>
              Về Phụ thuộc
            </Typography>
            <Typography fontSize="12px" color="#3b82f6">
              Phụ thuộc xác định mối quan hệ giữa các công việc. Hệ thống sẽ thực thi các ràng buộc này khi bạn thay đổi trạng thái công việc.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Dependencies (Tasks this task depends on) */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 2.5
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ 
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BlockIcon sx={{ fontSize: 18, color: '#ef4444' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Đang chờ (Bị chặn bởi)
              </Typography>
              <Typography fontSize="12px" color="text.secondary">
                Các công việc phải hoàn thành trước khi công việc này có thể tiếp tục
              </Typography>
            </Box>
          </Stack>
          <Chip 
            label={dependencies.length} 
            size="small"
            sx={{ 
              height: 24,
              minWidth: 32,
              fontWeight: 700,
              bgcolor: '#fee2e2',
              color: '#dc2626'
            }}
          />
        </Box>

        {dependencies.length > 0 ? (
          <Stack spacing={1.5}>
            {dependencies.map((dep) => {
              const depInfo = getDependencyTypeInfo(dep.dependency_type);
              return (
                <Paper
                  key={dep._id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: '1px solid #e8e9eb',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#7b68ee',
                      boxShadow: '0 2px 8px rgba(123,104,238,0.12)'
                    }
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {/* Dependency Type Badge */}
                    <Tooltip title={depInfo.desc}>
                      <Chip
                        label={dep.dependency_type}
                        size="small"
                        sx={{
                          height: 26,
                          minWidth: 50,
                          fontSize: '12px',
                          fontWeight: 700,
                          bgcolor: `${depInfo.color}15`,
                          color: depInfo.color,
                          border: `2px solid ${depInfo.color}`,
                        }}
                      />
                    </Tooltip>

                    {/* Arrow */}
                    <ArrowForwardIcon sx={{ fontSize: 16, color: '#d1d5db' }} />

                    {/* Task Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        fontSize="14px" 
                        fontWeight={600} 
                        color="text.primary" 
                        sx={{ 
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={dep.depends_on_task_id?.title}
                      >
                        {dep.depends_on_task_id?.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip 
                          label={dep.depends_on_task_id?.status} 
                          size="small"
                          sx={{ 
                            height: 20,
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        />
                        {dep.depends_on_task_id?.assignee_id && (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Avatar sx={{ width: 18, height: 18, fontSize: '9px', bgcolor: '#7b68ee' }}>
                              {(dep.depends_on_task_id.assignee_id?.full_name || 'U')[0]}
                            </Avatar>
                            <Typography fontSize="11px" color="text.secondary">
                              {dep.depends_on_task_id.assignee_id?.full_name || dep.depends_on_task_id.assignee_id?.email}
                            </Typography>
                          </Stack>
                        )}
                        {dep.lag_days !== 0 && (
                          <Tooltip title={dep.lag_days > 0 ? `Độ trễ: ${dep.lag_days} ngày` : `Độ sớm: ${Math.abs(dep.lag_days)} ngày`}>
                            <Chip
                              label={dep.lag_days > 0 ? `+${dep.lag_days} ngày trễ` : `${Math.abs(dep.lag_days)} ngày sớm`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '10px',
                                fontWeight: 600,
                                bgcolor: dep.lag_days > 0 ? '#fef3c7' : '#dbeafe',
                                color: dep.lag_days > 0 ? '#92400e' : '#1e40af'
                              }}
                            />
                          </Tooltip>
                        )}
                        {!dep.is_mandatory && (
                          <Tooltip title="Tùy chọn - Ràng buộc mềm">
                            <Chip
                              label="✏️ Tùy chọn"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '10px',
                                fontWeight: 600,
                                bgcolor: '#e0e7ff',
                                color: '#4338ca'
                              }}
                            />
                          </Tooltip>
                        )}
                      </Stack>
                      {dep.notes && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f3ff', borderRadius: 1, border: '1px dashed #c4b5fd' }}>
                          <Typography fontSize="11px" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            💡 {dep.notes}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Delete Button */}
                    {!readonly && (
                      <IconButton
                        size="small"
                        onClick={() => removeDependency(dep._id)}
                        sx={{
                          color: '#9ca3af',
                          '&:hover': {
                            color: '#ef4444',
                            bgcolor: '#fee2e2'
                          }
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                  </Stack>

                  {/* Dependency Type Description */}
                  <Box sx={{ 
                    mt: 1.5, 
                    pt: 1.5, 
                    borderTop: '1px dashed #e8e9eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Typography fontSize="11px" color="text.secondary" fontStyle="italic">
                      {depInfo.icon} {depInfo.desc}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: '#fafbfc',
            borderRadius: 2,
            border: '1px dashed #e8e9eb'
          }}>
            <Typography fontSize="14px" color="text.secondary">
              Không có phụ thuộc
            </Typography>
            <Typography fontSize="12px" color="text.secondary" sx={{ mt: 0.5 }}>
              Công việc này không phụ thuộc vào công việc nào khác
            </Typography>
          </Box>
        )}

        {/* Add Dependency Form */}
        {showAddForm && !readonly ? (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 3,
              bgcolor: '#f8f9fb',
              borderRadius: 2,
              border: '2px dashed #7b68ee'
            }}
          >
            <Typography fontSize="14px" fontWeight={700} sx={{ mb: 2, color: '#7b68ee' }}>
              Thêm Phụ thuộc (Công việc này phụ thuộc vào)
            </Typography>
            
            <Stack spacing={2}>
              {/* Task Selection */}
              <FormControl fullWidth size="small">
                <InputLabel>Công việc phụ thuộc</InputLabel>
                <Select
                  value={newDependency.depends_on_task_id}
                  label="Công việc phụ thuộc"
                  onChange={(e) => setNewDependency({ ...newDependency, depends_on_task_id: e.target.value })}
                >
                  {(() => {
                    // Get list of task IDs that already have dependencies
                    const existingDependencyIds = dependencies.map((dep: any) => {
                      const taskId = typeof dep.depends_on_task_id === 'object' 
                        ? dep.depends_on_task_id?._id 
                        : dep.depends_on_task_id;
                      return taskId;
                    });
                    
                    // Filter out tasks that already have a dependency
                    return availableTasks
                      .filter((task) => !existingDependencyIds.includes(task._id))
                      .map((task) => (
                        <MenuItem key={task._id} value={task._id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                            <Typography 
                              fontSize="13px"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}
                              title={task.title}
                            >
                              {task.title}
                            </Typography>
                            <Chip 
                              label={typeof task.status === 'object' ? task.status?.name : task.status} 
                              size="small"
                              sx={{ height: 18, fontSize: '10px', flexShrink: 0 }}
                            />
                          </Box>
                        </MenuItem>
                      ));
                  })()}
                </Select>
              </FormControl>

              {/* Dependency Type & Lag */}
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Loại</InputLabel>
                  <Select
                    value={newDependency.dependency_type}
                    label="Loại"
                    onChange={(e) => setNewDependency({ ...newDependency, dependency_type: e.target.value })}
                  >
                    <MenuItem value="FS">
                      <Box>
                        <Typography fontSize="13px" fontWeight={600}>FS - Hoàn thành - Bắt đầu</Typography>
                        <Typography fontSize="10px" color="text.secondary">
                          Công việc trước phải hoàn thành trước
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="FF">
                      <Box>
                        <Typography fontSize="13px" fontWeight={600}>FF - Hoàn thành - Hoàn thành</Typography>
                        <Typography fontSize="10px" color="text.secondary">
                          Cả hai phải hoàn thành cùng lúc
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="SS">
                      <Box>
                        <Typography fontSize="13px" fontWeight={600}>SS - Bắt đầu - Bắt đầu</Typography>
                        <Typography fontSize="10px" color="text.secondary">
                          Cả hai phải bắt đầu cùng lúc
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="SF">
                      <Box>
                        <Typography fontSize="13px" fontWeight={600}>SF - Bắt đầu - Hoàn thành</Typography>
                        <Typography fontSize="10px" color="text.secondary">
                          Công việc trước phải bắt đầu trước
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="relates_to">
                      <Box>
                        <Typography fontSize="13px" fontWeight={600}>Liên quan đến</Typography>
                        <Typography fontSize="10px" color="text.secondary">
                          Chỉ tham chiếu (không ràng buộc)
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Độ trễ (ngày)"
                  type="number"
                  size="small"
                  value={newDependency.lag_days}
                  onChange={(e) => setNewDependency({ ...newDependency, lag_days: parseInt(e.target.value) || 0 })}
                  sx={{ width: 150 }}
                  inputProps={{ min: -30, max: 30 }}
                  helperText={
                    newDependency.lag_days > 0 
                      ? `+${newDependency.lag_days} ngày trễ` 
                      : newDependency.lag_days < 0 
                        ? `${Math.abs(newDependency.lag_days)} ngày sớm` 
                        : 'Không có độ trễ'
                  }
                />
              </Stack>
              <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1, border: '1px solid #bae6fd' }}>
                            <Typography fontSize="10px" fontWeight={600} color="#0284c7" sx={{ mb: 0.5 }}>
                              💡 Giải thích:
                            </Typography>
                            <Typography fontSize="10px" color="#0369a1" component="div">
                              <Box component="span" sx={{ display: 'block', mb: 0.5 }}>
                                • <strong>Lag (số dương):</strong> Độ trễ - công việc sau phải đợi thêm X ngày sau khi điều kiện đáp ứng
                              </Box>
                              <Box component="span" sx={{ display: 'block' }}>
                                • <b>Lead (số âm):</b> Độ sớm - công việc sau có thể bắt đầu sớm X ngày trước khi điều kiện đáp ứng
                              </Box>
                            </Typography>
                          </Box>
              {/* Is Mandatory Checkbox */}
              <FormControl fullWidth size="small">
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, bgcolor: '#f8f9fb', borderRadius: 1.5, border: '1px solid #e8e9eb' }}>
                  <Box
                    onClick={() => setNewDependency({ ...newDependency, is_mandatory: !newDependency.is_mandatory })}
                    sx={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      bgcolor: newDependency.is_mandatory ? '#7b68ee' : '#d1d5db',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { opacity: 0.8 }
                    }}
                  >
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        bgcolor: 'white',
                        position: 'absolute',
                        top: 2,
                        left: newDependency.is_mandatory ? 20 : 2,
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontSize="13px" fontWeight={600} color={newDependency.is_mandatory ? '#7b68ee' : '#6b7280'}>
                      {newDependency.is_mandatory ? '🔒 Bắt buộc' : '✏️ Tùy chọn'}
                    </Typography>
                    <Typography fontSize="10px" color="text.secondary">
                      {newDependency.is_mandatory 
                        ? 'Ràng buộc cứng - phải được thực thi'
                        : 'Ràng buộc mềm - có thể thay đổi nếu cần'}
                    </Typography>
                  </Box>
                </Stack>
              </FormControl>

              {/* Notes */}
              <TextField
                label="Ghi chú (Tùy chọn)"
                size="small"
                multiline
                rows={2}
                value={newDependency.notes}
                onChange={(e) => setNewDependency({ ...newDependency, notes: e.target.value })}
                placeholder="Giải thích lý do phụ thuộc này tồn tại..."
                helperText="Cung cấp ngữ cảnh cho các thành viên trong nhóm"
              />

              {/* Action Buttons */}
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  size="small"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewDependency({ depends_on_task_id: '', dependency_type: 'FS', lag_days: 0, is_mandatory: true, notes: '' });
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280' }}
                >
                  Hủy
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!newDependency.depends_on_task_id}
                  onClick={addDependency}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    bgcolor: '#7b68ee',
                    '&:hover': { bgcolor: '#6952d6' }
                  }}
                >
                  Thêm Phụ thuộc
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ) : (
          !readonly && (
            <Button
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => setShowAddForm(true)}
              sx={{
                mt: 2,
                py: 1.5,
                borderRadius: 2,
                border: '2px dashed #e8e9eb',
                bgcolor: 'transparent',
                color: '#9ca3af',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#7b68ee',
                  bgcolor: '#f5f3ff',
                  color: '#7b68ee'
                }
              }}
            >
              Thêm Phụ thuộc Chặn
            </Button>
          )
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Blocking (Tasks that depend on this task) */}
      <Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 2.5
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ 
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LinkIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Đang chặn
              </Typography>
              <Typography fontSize="12px" color="text.secondary">
                Các công việc đang chờ công việc này hoàn thành
              </Typography>
            </Box>
          </Stack>
          <Chip 
            label={dependents.length} 
            size="small"
            sx={{ 
              height: 24,
              minWidth: 32,
              fontWeight: 700,
              bgcolor: '#fef3c7',
              color: '#d97706'
            }}
          />
        </Box>

        {dependents.length > 0 ? (
          <Stack spacing={1.5}>
            {dependents.map((dep) => {
              const depInfo = getDependencyTypeInfo(dep.dependency_type);
              const dependentStatus = normalizeStatusValue(dep.task_id?.status);
              const isBlocking = dependentStatus === 'Doing' || dependentStatus === 'Done';
              
              return (
                <Paper
                  key={dep._id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    bgcolor: '#fffbeb',
                    border: '1px solid #fed7aa',
                    borderRadius: 2,
                    borderLeft: `4px solid ${depInfo.color}`
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {/* Dependency Type Badge */}
                    <Tooltip title={depInfo.desc}>
                      <Chip
                        label={dep.dependency_type}
                        size="small"
                        sx={{
                          height: 26,
                          minWidth: 50,
                          fontSize: '12px',
                          fontWeight: 700,
                          bgcolor: `${depInfo.color}15`,
                          color: depInfo.color,
                          border: `2px solid ${depInfo.color}`,
                        }}
                      />
                    </Tooltip>

                    {/* Block Icon */}
                    <BlockIcon sx={{ fontSize: 16, color: '#f59e0b' }} />

                    {/* Task Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        fontSize="14px" 
                        fontWeight={600} 
                        color="text.primary" 
                        sx={{ 
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={dep.task_id?.title}
                      >
                        {dep.task_id?.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip 
                          label={dependentStatus} 
                          size="small"
                          sx={{ 
                            height: 20,
                            fontSize: '11px',
                            fontWeight: 600,
                            bgcolor: isBlocking ? '#dcfce7' : '#fee2e2',
                            color: isBlocking ? '#16a34a' : '#dc2626'
                          }}
                        />
                        {dep.task_id?.assignee_id && (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Avatar sx={{ width: 18, height: 18, fontSize: '9px', bgcolor: '#f59e0b' }}>
                              {(dep.task_id.assignee_id?.full_name || 'U')[0]}
                            </Avatar>
                            <Typography fontSize="11px" color="text.secondary">
                              {dep.task_id.assignee_id?.full_name || dep.task_id.assignee_id?.email}
                            </Typography>
                          </Stack>
                        )}
                        {dep.lag_days !== 0 && (
                          <Tooltip title={dep.lag_days > 0 ? `Độ trễ: ${dep.lag_days} ngày` : `Độ sớm: ${Math.abs(dep.lag_days)} ngày`}>
                            <Chip
                              label={dep.lag_days > 0 ? `+${dep.lag_days} ngày trễ` : `${Math.abs(dep.lag_days)} ngày sớm`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '10px',
                                fontWeight: 600,
                                bgcolor: dep.lag_days > 0 ? '#fef3c7' : '#dbeafe',
                                color: dep.lag_days > 0 ? '#92400e' : '#1e40af'
                              }}
                            />
                          </Tooltip>
                        )}
                        {!dep.is_mandatory && (
                          <Tooltip title="Tùy chọn - Ràng buộc mềm">
                            <Chip
                              label="✏️ Tùy chọn"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '10px',
                                fontWeight: 600,
                                bgcolor: '#e0e7ff',
                                color: '#4338ca'
                              }}
                            />
                          </Tooltip>
                        )}
                      </Stack>
                      {dep.notes && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: '#fff7ed', borderRadius: 1, border: '1px dashed #fed7aa' }}>
                          <Typography fontSize="11px" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            💡 {dep.notes}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Delete Button */}
                    {!readonly && (
                      <IconButton
                        size="small"
                        onClick={() => removeDependency(dep._id)}
                        sx={{
                          color: '#9ca3af',
                          '&:hover': {
                            color: '#ef4444',
                            bgcolor: '#fee2e2'
                          }
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                  </Stack>

                  {/* Dependency Type Description */}
                  <Box sx={{ 
                    mt: 1.5, 
                    pt: 1.5, 
                    borderTop: '1px dashed #fed7aa',
                  }}>
                    <Typography fontSize="11px" color="#92400e" fontStyle="italic">
                      {depInfo.icon} {depInfo.desc}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: '#fafbfc',
            borderRadius: 2,
            border: '1px dashed #e8e9eb'
          }}>
            <Typography fontSize="14px" color="text.secondary">
              Không chặn công việc nào
            </Typography>
            <Typography fontSize="12px" color="text.secondary" sx={{ mt: 0.5 }}>
              Không có công việc nào khác đang chờ công việc này hoàn thành
            </Typography>
          </Box>
        )}
      </Box>

      {/* Legend */}
      <Box sx={{ 
        mt: 4,
        p: 2.5,
        bgcolor: '#f8f9fb',
        borderRadius: 2,
        border: '1px solid #e8e9eb'
      }}>
        <Typography fontSize="12px" fontWeight={700} color="#6b7280" sx={{ mb: 1.5 }}>
          CÁC LOẠI PHỤ THUỘC
        </Typography>
        <Stack spacing={1}>
          {['FS', 'FF', 'SS', 'SF', 'relates_to'].map((type) => {
            const info = getDependencyTypeInfo(type);
            return (
              <Stack key={type} direction="row" alignItems="center" spacing={1.5}>
                <Chip
                  label={type}
                  size="small"
                  sx={{
                    height: 22,
                    minWidth: 60,
                    fontSize: '11px',
                    fontWeight: 700,
                    bgcolor: `${info.color}15`,
                    color: info.color,
                    border: `1px solid ${info.color}40`
                  }}
                />
                <Typography fontSize="12px" color="text.secondary">
                  {info.label}: {info.desc}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      {/* Date Conflict Dialog */}
      {showConflictDialog && conflictViolation && (
        <DependencyDateConflictDialog
          open={showConflictDialog}
          onClose={() => {
            setShowConflictDialog(false);
            setConflictViolation(null);
          }}
          onAutoFix={handleAutoFix}
          onManualEdit={handleManualEdit}
          violation={conflictViolation}
          taskTitle={currentTask?.title}
          predecessorTitle={availableTasks.find(t => t._id === newDependency.depends_on_task_id)?.title}
        />
      )}
    </Box>
  );
}

