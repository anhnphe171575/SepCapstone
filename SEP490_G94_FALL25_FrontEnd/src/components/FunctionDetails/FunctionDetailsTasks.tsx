"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axiosInstance from "../../../ultis/axios";
import TaskDetailsModal from "../TaskDetailsModal";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/constants/settings";
import { toast } from "sonner";

interface FunctionDetailsTasksProps {
  functionId: string | null;
  projectId?: string;
  readonly?: boolean;
}

export default function FunctionDetailsTasks({
  functionId,
  projectId,
  readonly = false,
}: FunctionDetailsTasksProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusTypes, setStatusTypes] = useState<any[]>([]);
  const [priorityTypes, setPriorityTypes] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    assignee_id: '',
    start_date: '',
    deadline: '',
    estimate: '',
  });

  useEffect(() => {
    if (functionId) {
      loadTasks();
      // Load constants instead of API call
      setStatusTypes(STATUS_OPTIONS);
      setPriorityTypes(PRIORITY_OPTIONS);
      loadTeamMembers();
    }
  }, [functionId, projectId]);

  const loadTeamMembers = async () => {
    if (!projectId) return;
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/team-members`);
      console.log('Team members response:', response.data);
      
      // API trả về { team_members: { leaders: [], members: [] } }
      const teamData = response.data?.team_members;
      if (teamData) {
        const allMembers = [
          ...(teamData.leaders || []),
          ...(teamData.members || [])
        ];
        setTeamMembers(allMembers);
      } else {
        // Fallback: nếu không có team_members, thử lấy trực tiếp từ response.data
        const allMembers = [
          ...(response.data?.leaders || []),
          ...(response.data?.members || [])
        ];
        setTeamMembers(allMembers);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    }
  };

  const loadTasks = async () => {
    if (!functionId) return;
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/functions/${functionId}/tasks`);
      console.log('Tasks for function:', functionId, response.data);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveStatusName = (status: any) => {
    if (!status) return "-";
    if (typeof status === "object") return status?.name || "-";
    // Handle string enum
    return status;
  };

  const resolvePriorityName = (priority: any) => {
    if (!priority) return "-";
    if (typeof priority === "object") return priority?.name || "-";
    // Handle string enum
    return priority;
  };

  const getStatusColor = (statusName: string) => {
    const statusLower = statusName.toLowerCase();
    if (statusLower.includes('completed') || statusLower.includes('done')) return '#16a34a';
    if (statusLower.includes('progress') || statusLower.includes('doing')) return '#f59e0b';
    if (statusLower.includes('overdue') || statusLower.includes('blocked')) return '#ef4444';
    return '#9ca3af';
  };

  const getPriorityColor = (priorityName: string) => {
    const priorityLower = priorityName.toLowerCase();
    if (priorityLower.includes('critical') || priorityLower.includes('high')) return '#ef4444';
    if (priorityLower.includes('medium')) return '#f59e0b';
    return '#3b82f6';
  };

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setTaskModalOpen(false);
    setSelectedTaskId(null);
  };

  const handleTaskUpdate = () => {
    loadTasks();
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.status) {
      toast.error('Vui lòng điền các trường bắt buộc (Tên và Trạng thái)');
      return;
    }

    try {
      const taskData = {
        ...newTask,
        function_id: functionId,
      };
      // Convert estimate to number if provided
      if (taskData.estimate !== '' && taskData.estimate !== null) {
        taskData.estimate = parseFloat(taskData.estimate) || 0;
      } else {
        taskData.estimate = 0;
      }
      
      await axiosInstance.post(`/api/projects/${projectId}/tasks`, taskData);
      
      setCreateDialogOpen(false);
      setNewTask({ 
        title: '', 
        description: '', 
        status: '', 
        priority: '',
        assignee_id: '',
        start_date: '',
        deadline: '',
        estimate: '',
      });
      loadTasks();
      toast.success('Đã tạo công việc thành công!');
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error?.response?.data?.message || 'Không thể tạo công việc');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography fontSize="13px" fontWeight={700} color="#6b7280" textTransform="uppercase">
          Công việc ({tasks.length})
        </Typography>
        {!readonly && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#7b68ee',
              '&:hover': { bgcolor: '#6952d6' }
            }}
          >
            Thêm công việc
          </Button>
        )}
      </Box>

      {tasks.length === 0 ? (
        <Box sx={{ 
          p: 6, 
          textAlign: 'center',
          bgcolor: '#fafbfc',
          borderRadius: 2,
          border: '1px dashed #e8e9eb'
        }}>
          <Typography fontSize="14px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
            Chưa có công việc nào
          </Typography>
          <Typography fontSize="12px" color="text.secondary" sx={{ mb: 2 }}>
            Tạo công việc đầu tiên để bắt đầu
          </Typography>
          {!readonly && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                textTransform: 'none',
                borderColor: '#7b68ee',
                color: '#7b68ee',
                '&:hover': {
                  borderColor: '#6952d6',
                  bgcolor: '#7b68ee15'
                }
              }}
            >
              Thêm công việc
            </Button>
          )}
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#6b7280', width: '60px' }}>STT</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#6b7280',width:'30' }}>Công việc</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#6b7280', width: '50' }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task, index) => (
              <TableRow 
                key={task._id} 
                hover
                onClick={() => handleOpenTask(task._id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography 
                    sx={{ 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: '#7b68ee',
                      cursor: 'pointer',
                      '&:hover': { 
                        textDecoration: 'underline',
                        color: '#6b5bd6'
                      }
                    }}
                  >
                    {index + 1}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title={task.title || ''} placement="top-start">
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ 
                        color: '#7b68ee',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'block',
                        maxWidth: 260,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {task.title}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={resolveStatusName(task.status)} 
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '12px',
                      fontWeight: 600,
                      bgcolor: `${getStatusColor(resolveStatusName(task.status))}15`,
                      color: getStatusColor(resolveStatusName(task.status)),
                      border: `1px solid ${getStatusColor(resolveStatusName(task.status))}40`,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="medium"
                    startIcon={<VisibilityIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTask(task._id);
                    }}
                    sx={{
                      textTransform: 'none',
                      fontSize: '13px',
                      color: '#7b68ee',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    Chi tiết
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Tạo công việc Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tạo công việc mới</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên công việc *"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Mô tả"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Ưu tiên</InputLabel>
              <Select
                value={newTask.priority}
                label="Ưu tiên"
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              >
                <MenuItem value="">
                  <em>Không có</em>
                </MenuItem>
                {priorityTypes.map((priority) => (
                  <MenuItem key={priority._id} value={priority._id}>
                    {priority.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Trạng thái *</InputLabel>
              <Select
                value={newTask.status}
                label="Trạng thái *"
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
              >
                {statusTypes.map((status) => (
                  <MenuItem key={status._id} value={status._id}>
                    {status.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Người được giao</InputLabel>
              <Select
                value={newTask.assignee_id}
                label="Người được giao"
                onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
              >
                <MenuItem value="">
                  <em>Chưa giao</em>
                </MenuItem>
                {teamMembers.map((member, idx) => {
                  const userId = member.user_id?._id || member._id;
                  const userName = member.user_id?.full_name || member.full_name || member.name || member.email || 'Không xác định';
                  return (
                    <MenuItem key={userId || idx} value={userId}>
                      {userName}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <TextField
              label="Ngày bắt đầu"
              type="date"
              value={newTask.start_date}
              onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hạn chót"
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Số giờ ước tính"
              type="number"
              value={newTask.estimate}
              onChange={(e) => setNewTask({ ...newTask, estimate: e.target.value })}
              fullWidth
              inputProps={{ min: 0, step: 0.5 }}
              helperText="Nhập số giờ ước tính để hoàn thành công việc"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateTask}
            disabled={!newTask.title || !newTask.status}
            sx={{ bgcolor: '#7b68ee', '&:hover': { bgcolor: '#6952d6' } }}
          >
            Tạo công việc
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Details Modal */}
      {taskModalOpen && selectedTaskId && (
        <TaskDetailsModal
          open={taskModalOpen}
          taskId={selectedTaskId}
          projectId={projectId}
          readonly={readonly}
          onClose={handleCloseTaskModal}
          onUpdate={handleTaskUpdate}
        />
      )}
    </Box>
  );
}

