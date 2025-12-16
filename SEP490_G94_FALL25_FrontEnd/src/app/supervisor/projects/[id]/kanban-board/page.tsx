"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import axiosInstance from "../../../../../../ultis/axios";
import SupervisorSidebar from "@/components/SupervisorSidebar";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import QuickNav from "@/components/QuickNav";
import { normalizeStatusValue } from "@/constants/settings";
import { toast } from "sonner";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Avatar,
  IconButton,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FlagIcon from "@mui/icons-material/Flag";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import LinkIcon from "@mui/icons-material/Link";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

type Task = {
  _id: string;
  title: string;
  description?: string;
  project_id: string;
  status?: string | { _id: string; name: string };
  priority?: string | { _id: string; name: string };
  assignee_id?: string | { _id: string; full_name?: string; name?: string; email?: string };
  start_date?: string;
  deadline?: string;
  estimate?: number;
  function_id?: any;
  [key: string]: any;
};

export default function SupervisorKanbanBoardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  // Lấy projectId từ route parameter [id] hoặc từ query string (fallback)
  const projectId = (params?.id as string) || searchParams.get('project_id') || "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [taskDependencies, setTaskDependencies] = useState<Record<string, any>>({});
  
  // Task details modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [openTaskDetails, setOpenTaskDetails] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadTasks();
    } else {
      setLoading(false);
      setError("Vui lòng chọn dự án");
    }
  }, [projectId]);

  useEffect(() => {
    if (tasks.length > 0) {
      tasks.forEach(task => {
        if (!taskDependencies[task._id]) {
          loadTaskDependencies(task._id);
        }
      });
    }
  }, [tasks]);

  const loadTasks = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/projects/${projectId}/tasks`);
      
      const raw = response?.data;
      const normalized: Task[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.tasks)
            ? raw.tasks
            : [];

      setTasks(normalized);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tải danh sách tasks");
      toast.error("Không thể tải danh sách công việc");
    } finally {
      setLoading(false);
    }
  };

  const loadTaskDependencies = async (taskId: string) => {
    try {
      const response = await axiosInstance.get(`/api/tasks/${taskId}/dependencies`);
      setTaskDependencies(prev => ({
        ...prev,
        [taskId]: response.data || { dependencies: [], dependents: [] }
      }));
    } catch (e: any) {
      // Silently fail - task might not have dependencies
      setTaskDependencies(prev => ({
        ...prev,
        [taskId]: { dependencies: [], dependents: [] }
      }));
    }
  };

  const resolveStatusName = (value: any) => normalizeStatusValue(
    typeof value === "object" ? value?.name : value
  );

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    
    const searchLower = search.toLowerCase();
    return tasks.filter(task => 
      task.title?.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower)
    );
  }, [tasks, search]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    filteredTasks.forEach((t) => {
      const key = resolveStatusName(t.status);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    
    // Chỉ hiển thị các cột có task thực sự
    return groups;
  }, [filteredTasks]);

  const getStatusColor = (name: string) => {
    const normalized = resolveStatusName(name);
    const normalizedLower = normalized.toLowerCase();
    if (normalizedLower.includes('done') || normalizedLower.includes('hoàn thành') || normalizedLower.includes('completed')) return '#00c875'; // Green
    if (normalizedLower.includes('doing') || normalizedLower.includes('đang làm') || normalizedLower.includes('progress')) return '#579bfc'; // Blue
    if (normalizedLower.includes('todo') || normalizedLower.includes('chưa làm') || normalizedLower.includes('to do')) return '#f59e0b'; // Orange
    return '#9ca3af';
  };

  const getPriorityColor = (name: string) => {
    const key = (name || '').toLowerCase();
    if (key.includes('critical')) return '#ef4444';
    if (key.includes('high')) return '#f59e0b';
    if (key.includes('medium')) return '#579bfc';
    return '#6b7280';
  };

  const openTaskDetailsModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setOpenTaskDetails(true);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SupervisorSidebar />
        <main className="min-h-screen px-6 py-8 md:ml-64 md:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <Box sx={{ 
              display: "flex", 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: "center", 
              py: 12 
            }}>
              <CircularProgress 
                size={60} 
                thickness={4}
                sx={{ 
                  color: '#667eea',
                  mb: 3
                }}
              />
              <Typography variant="h6" fontWeight={600} color="text.secondary">
                Đang tải dữ liệu công việc...
              </Typography>
            </Box>
          </div>
        </main>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SupervisorSidebar />
        <main className="min-h-screen px-6 py-8 md:ml-64 md:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <Box sx={{ 
              display: "flex", 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: "center", 
              py: 12 
            }}>
              <Typography variant="h6" fontWeight={600} color="error" sx={{ mb: 2 }}>
                Vui lòng chọn dự án
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => router.push('/supervisor/projects')}
                sx={{ bgcolor: '#7b68ee', '&:hover': { bgcolor: '#6952d6' } }}
              >
                Quay lại danh sách dự án
              </Button>
            </Box>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SupervisorSidebar />
      <main className="min-h-screen px-6 py-8 md:ml-64 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
        {/* QuickNav - Always at the top */}
        <div className="mb-6">
          <QuickNav selectedProject={projectId || undefined} />
        </div>
        
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Bảng Kanban
            </Typography>
            
            {/* Search */}
            <TextField
              placeholder="Tìm kiếm công việc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: '#9ca3af', mr: 1 }} />
                ),
              }}
              sx={{
                minWidth: 300,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  borderRadius: 2,
                }
              }}
            />
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Kanban Board View */}
        <Box sx={{ 
          p: 3,
          bgcolor: '#f8f9fb',
          minHeight: 'calc(100vh - 300px)',
          overflow: 'auto'
        }}>
          {/* Kanban Columns Container */}
          <Box sx={{ 
            display: 'flex',
            gap: 2,
            pb: 3,
            minWidth: 'fit-content',
            justifyContent: 'center',
            width: '100%'
          }}>
            {Object.entries(groupedByStatus).map(([statusName, tasks]) => (
              <Box 
                key={statusName}
                sx={{ 
                  minWidth: 400,
                  maxWidth: 400,
                  bgcolor: '#ffffff',
                  borderRadius: 3,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 340px)'
                }}
              >
                {/* Column Header */}
                <Box sx={{ 
                  p: 2,
                  borderBottom: '2px solid',
                  borderColor: getStatusColor(statusName),
                }}>
                  <Stack direction="row" alignItems="center" justifyContent="center">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={700} fontSize="14px" color="text.primary">
                        {statusName}
                      </Typography>
                      <Chip 
                        label={tasks.length} 
                        size="small" 
                        sx={{ 
                          height: 20,
                          minWidth: 28,
                          fontSize: '11px',
                          fontWeight: 700,
                          bgcolor: `${getStatusColor(statusName)}15`,
                          color: getStatusColor(statusName),
                        }} 
                      />
                    </Stack>
                  </Stack>
                </Box>

                {/* Cards Container - Scrollable */}
                <Box sx={{ 
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  '&::-webkit-scrollbar': {
                    width: '6px'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: '#d1d5db',
                    borderRadius: '3px'
                  }
                }}>
                  <Stack spacing={1.5}>
                    {tasks.map((task) => {
                      const assigneeName = typeof task.assignee_id === 'object' 
                        ? task.assignee_id?.full_name || task.assignee_id?.email 
                        : '';
                      const assigneeInitials = assigneeName 
                        ? assigneeName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() 
                        : '';
                      const priorityName = typeof task.priority === 'object' ? (task.priority as any)?.name : task.priority;
                      const statusName = resolveStatusName(task.status).toLowerCase();
                      const isOverdue = task.deadline 
                        ? new Date(task.deadline).getTime() < Date.now() && !statusName.includes('done') && !statusName.includes('hoàn thành') && !statusName.includes('completed')
                        : false;

                      return (
                        <Box
                          key={task._id}
                          onClick={() => openTaskDetailsModal(task._id)}
                          sx={{
                            bgcolor: 'white',
                            border: '1px solid #e8e9eb',
                            borderRadius: 2,
                            p: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(123,104,238,0.15)',
                              borderColor: '#7b68ee',
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          {/* Task Title */}
                          <Typography 
                            fontSize="14px" 
                            fontWeight={600} 
                            sx={{ 
                              mb: 1.5,
                              color: '#1f2937',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {task.title}
                          </Typography>

                          {/* Meta Info Row 1 - Priority & Due Date */}
                          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" gap={0.5}>
                            {priorityName && (
                              <Chip
                                icon={<FlagIcon sx={{ fontSize: 12 }} />}
                                label={priorityName}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  bgcolor: `${getPriorityColor(priorityName)}15`,
                                  color: getPriorityColor(priorityName),
                                  border: `1px solid ${getPriorityColor(priorityName)}40`,
                                  '& .MuiChip-icon': {
                                    color: 'inherit'
                                  }
                                }}
                              />
                            )}
                            {task.deadline && (
                              <Chip
                                icon={<CalendarMonthIcon sx={{ fontSize: 12 }} />}
                                label={new Date(task.deadline).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  bgcolor: isOverdue ? '#fef3c7' : '#f3f4f6',
                                  color: isOverdue ? '#92400e' : '#6b7280',
                                  border: isOverdue ? '1px solid #fbbf24' : '1px solid #e8e9eb',
                                  '& .MuiChip-icon': {
                                    color: 'inherit'
                                  }
                                }}
                              />
                            )}
                          </Stack>

                          {/* Bottom Row - Assignee & Indicators */}
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            {/* Assignee Avatar */}
                            {assigneeName ? (
                              <Tooltip title={assigneeName}>
                                <Avatar 
                                  sx={{ 
                                    width: 28, 
                                    height: 28, 
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    bgcolor: '#7b68ee',
                                  }}
                                >
                                  {assigneeInitials}
                                </Avatar>
                              </Tooltip>
                            ) : (
                              <Avatar 
                                sx={{ 
                                  width: 28, 
                                  height: 28, 
                                  bgcolor: '#e5e7eb',
                                  color: '#9ca3af'
                                }}
                              >
                                <PersonIcon sx={{ fontSize: 16 }} />
                              </Avatar>
                            )}

                            {/* Indicators */}
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {/* Dependencies indicator */}
                              {(taskDependencies[task._id]?.dependencies?.length > 0 || 
                                taskDependencies[task._id]?.dependents?.length > 0) && (
                                <Tooltip title="Có ràng buộc phụ thuộc">
                                  <IconButton size="small" sx={{ color: '#3b82f6', p: 0.25 }}>
                                    <LinkIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}

                              {/* Time estimate */}
                              {task.estimate && (
                                <Tooltip title={`${task.estimate}h ước tính`}>
                                  <IconButton size="small" sx={{ color: '#6b7280', p: 0.25 }}>
                                    <AccessTimeIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </Box>
            ))}

            {Object.keys(groupedByStatus).length === 0 && (
              <Box sx={{ 
                width: '100%', 
                py: 16, 
                textAlign: 'center',
                bgcolor: 'white',
                borderRadius: 3
              }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#6b7280' }}>
                  Chưa có công việc nào
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chưa có công việc nào trong dự án này
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Task Details Modal */}
        {selectedTaskId && (
          <TaskDetailsModal
            open={openTaskDetails}
            onClose={() => {
              setOpenTaskDetails(false);
              setSelectedTaskId(null);
            }}
            taskId={selectedTaskId}
            projectId={projectId || undefined}
            onUpdate={loadTasks}
            readonly={true}
          />
        )}
        </div>
      </main>
    </div>
  );
}
