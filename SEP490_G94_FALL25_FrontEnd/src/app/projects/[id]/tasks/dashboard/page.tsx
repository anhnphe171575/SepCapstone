"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "../../../../../../ultis/axios";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Avatar,
  Stack,
  IconButton,
  Chip,
  Paper,
  LinearProgress,
  AvatarGroup,
  Tooltip as MuiTooltip,
  TextField,
} from "@mui/material";
import {
  CheckCircle,
  Schedule,
  Warning,
  Assignment,
  Refresh,
  TrendingUp,
  Block,
  Group,
  BugReport,
  Timeline,
  Speed,
} from "@mui/icons-material";
import DashboardIcon from "@mui/icons-material/Dashboard";

const COLORS = {
  primary: '#7b68ee',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

export default function TaskDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]); // Only parent tasks for display
  const [allTasks, setAllTasks] = useState<any[]>([]); // All tasks including subtasks for calculations
  const [bugs, setBugs] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [timeBasedProgress, setTimeBasedProgress] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      fetchDashboardData();
    }
  }, [projectId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, tasksRes, membersRes, bugsRes, progressRes] = await Promise.all([
        axiosInstance.get(`/api/projects/${projectId}/tasks/stats`),
        axiosInstance.get(`/api/projects/${projectId}/tasks`, { params: { pageSize: 500 } }),
        axiosInstance.get(`/api/projects/${projectId}/members`).catch(() => ({ data: { members: [] } })),
        axiosInstance.get(`/api/defects`, { params: { project_id: projectId } }).catch(() => ({ data: { defects: [] } })),
        axiosInstance.get(`/api/projects/${projectId}/tasks/time-based-progress`).catch(() => ({ data: null }))
      ]);
      
      setStats(statsRes.data);
      // Store all tasks (including subtasks) for calculations
      const allTasksData = tasksRes.data || [];
      setAllTasks(allTasksData);
      // Filter out subtasks - only show parent tasks in dashboard
      const parentTasks = allTasksData.filter((task: any) => !task.parent_task_id);
      setTasks(parentTasks);
      setBugs(bugsRes.data.defects || []);
      
      // Debug time-based progress data
      console.log('=== TIME-BASED PROGRESS DATA ===');
      console.log('Full Response:', progressRes.data);
      if (progressRes.data) {
        console.log('Project Metrics:', progressRes.data.project_metrics);
        console.log('Total Tasks:', progressRes.data.total_tasks);
        console.log('Tasks with Dates:', progressRes.data.tasks_with_dates);
        if (progressRes.data.tasks && progressRes.data.tasks.length > 0) {
          console.log('Sample Task Progress:', progressRes.data.tasks[0]);
          console.log('All Tasks Progress:', progressRes.data.tasks);
        }
      }
      console.log('================================');
      
      setTimeBasedProgress(progressRes.data);
      setTeamMembers(membersRes.data.members || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setTimeout(() => setRefreshing(false), 500);
  };

  // === KEY METRICS ===
  const keyMetrics = useMemo(() => {
    const completed = tasks.filter((t: any) => {
      const statusName = typeof t.status === 'object' ? t.status?.name : t.status;
      return statusName?.toLowerCase().includes('completed') || statusName?.toLowerCase().includes('done');
    }).length;

    const inProgress = tasks.filter((t: any) => {
      const statusName = typeof t.status === 'object' ? t.status?.name : t.status;
      return statusName?.toLowerCase().includes('progress');
    }).length;

    const overdue = tasks.filter((t: any) => {
      const statusName = typeof t.status === 'object' ? t.status?.name : t.status;
      const isCompleted = statusName?.toLowerCase().includes('completed') || statusName?.toLowerCase().includes('done');
      if (isCompleted || !t.deadline) return false;
      return new Date(t.deadline) < new Date();
    }).length;

    const openBugs = bugs.filter((b: any) => 
      b.status && !['Resolved', 'Closed'].includes(b.status)
    ).length;

    const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    return {
      total: tasks.length,
      completed,
      inProgress,
      overdue,
      openBugs,
      completionRate
    };
  }, [tasks, bugs]);

  // === STATUS DISTRIBUTION ===
  const statusData = useMemo(() => {
    const statusMap = new Map<string, number>();
    tasks.forEach((task: any) => {
      const statusName = typeof task.status === 'object' ? task.status?.name : task.status || 'Unknown';
      statusMap.set(statusName, (statusMap.get(statusName) || 0) + 1);
    });
    
    return Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [tasks]);

  // === PRIORITY DISTRIBUTION ===
  const priorityData = useMemo(() => {
    const priorityMap = new Map();
    tasks.forEach((task: any) => {
      const priority = task.priority?.name || task.priority || 'No Priority';
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
    });
    return Array.from(priorityMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const order: any = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
        return (order[a.name] ?? 4) - (order[b.name] ?? 4);
      });
  }, [tasks]);

  // === TEAM WORKLOAD ===
  const teamWorkload = useMemo(() => {
    const teamMap = new Map();
    
    teamMembers.forEach((member: any) => {
      if (member._id) {
        teamMap.set(member._id, {
          name: member.full_name || member.email,
          avatar: member.avatar,
          total: 0,
          completed: 0,
        });
      }
    });
    
    tasks.forEach((task: any) => {
      if (task.assignee_id?._id) {
        const userId = task.assignee_id._id;
        if (!teamMap.has(userId)) {
          teamMap.set(userId, {
            name: task.assignee_id.full_name || task.assignee_id.email,
            avatar: task.assignee_id.avatar,
            total: 0,
            completed: 0,
          });
        }
        const member = teamMap.get(userId);
        member.total++;
        const statusName = typeof task.status === 'object' ? task.status?.name : task.status;
        if (statusName?.toLowerCase().includes('completed') || statusName?.toLowerCase().includes('done')) {
          member.completed++;
        }
      }
    });
    
    return Array.from(teamMap.values())
      .filter(m => m.total > 0)
      .map(m => ({ ...m, rate: Math.round((m.completed / m.total) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [tasks, teamMembers]);

  // === TEAM MEMBER TASK STATISTICS ===
  const teamMemberStatistics = useMemo(() => {
    const memberMap = new Map<string, { name: string; completed: number; notCompleted: number }>();
    
    // Initialize all team members
    teamMembers.forEach((member: any) => {
      if (member._id) {
        memberMap.set(member._id, {
          name: member.full_name || member.email || 'Unknown',
          completed: 0,
          notCompleted: 0
        });
      }
    });
    
    // Filter tasks by date range
    const filteredTasks = tasks.filter((task: any) => {
      if (!dateFrom && !dateTo) return true;
      
      const taskDate = new Date(task.createAt || task.createdAt);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      
      if (from && to) {
        return taskDate >= from && taskDate <= to;
      } else if (from) {
        return taskDate >= from;
      } else if (to) {
        return taskDate <= to;
      }
      return true;
    });
    
    // Count tasks for each member
    filteredTasks.forEach((task: any) => {
      if (task.assignee_id?._id) {
        const userId = task.assignee_id._id;
      const statusName = typeof task.status === 'object' ? task.status?.name : task.status;
        const isCompleted = statusName?.toLowerCase().includes('completed') || statusName?.toLowerCase().includes('done');
        
        if (!memberMap.has(userId)) {
          memberMap.set(userId, {
            name: task.assignee_id.full_name || task.assignee_id.email || 'Unknown',
            completed: 0,
            notCompleted: 0
          });
        }
        
        if (isCompleted) {
          memberMap.get(userId)!.completed++;
        } else {
          memberMap.get(userId)!.notCompleted++;
        }
      }
    });
    
    // Show ALL team members (including those with 0 tasks)
    return Array.from(memberMap.values())
      .map(m => ({
        name: m.name,
        'Đã hoàn thành': m.completed,
        'Chưa hoàn thành': m.notCompleted
      }))
      .sort((a, b) => (b['Đã hoàn thành'] + b['Chưa hoàn thành']) - (a['Đã hoàn thành'] + a['Chưa hoàn thành']));
  }, [tasks, teamMembers, dateFrom, dateTo]);

  // === AT RISK TASKS ===
  const atRiskTasks = useMemo(() => {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    return tasks
      .filter((task: any) => {
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      const statusName = typeof task.status === 'object' ? task.status?.name : task.status;
      const isCompleted = statusName?.toLowerCase().includes('completed') || statusName?.toLowerCase().includes('done');
      return !isCompleted && deadline <= twoDaysFromNow;
      })
      .map((task: any) => {
        // Calculate impact score (higher = more critical)
        let impactScore = 0;
        
        // 1. Priority weight (0-40 points)
        const priorityName = typeof task.priority === 'object' 
          ? task.priority?.name?.toLowerCase() 
          : task.priority?.toLowerCase();
        
        if (priorityName?.includes('critical') || priorityName?.includes('highest')) {
          impactScore += 40;
        } else if (priorityName?.includes('high')) {
          impactScore += 30;
        } else if (priorityName?.includes('medium')) {
          impactScore += 20;
        } else if (priorityName?.includes('low')) {
          impactScore += 10;
        }
        
        // 2. Time urgency (0-30 points)
        const deadline = new Date(task.deadline);
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntilDeadline < 0) {
          impactScore += 30; // Overdue
        } else if (hoursUntilDeadline < 24) {
          impactScore += 25; // Less than 1 day
        } else if (hoursUntilDeadline < 48) {
          impactScore += 20; // 1-2 days
        } else {
          impactScore += 15; // 2+ days
        }
        
        // 3. Dependencies impact (0-20 points)
        const blockingCount = task.dependents?.length || 0; // How many tasks depend on this
        impactScore += Math.min(blockingCount * 5, 20); // Up to 4+ dependencies = 20 points
        
        // 4. Has subtasks impact (0-10 points)
        const subtaskCount = allTasks.filter((t: any) => t.parent_task_id === task._id).length;
        if (subtaskCount > 0) {
          impactScore += 10;
        }
    
    return {
          ...task,
          impactScore,
          hoursUntilDeadline
        };
      })
      .sort((a, b) => {
        // Sort by impact score (higher first), then by deadline (sooner first)
        if (b.impactScore !== a.impactScore) {
          return b.impactScore - a.impactScore;
        }
        return a.hoursUntilDeadline - b.hoursUntilDeadline;
      })
      .slice(0, 5);
  }, [tasks, allTasks]);

  // === BLOCKED TASKS ===
  const blockedTasks = useMemo(() => {
    return tasks.filter((task: any) => {
        const statusName = typeof task.status === 'object' ? task.status?.name : task.status;
      return statusName?.toLowerCase().includes('blocked');
    }).slice(0, 5);
  }, [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ResponsiveSidebar />
        <main className="p-4 md:p-6 md:ml-56">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
            <CircularProgress size={40} />
        </Box>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ResponsiveSidebar />
      <main className="p-4 md:p-6 md:ml-56">
        <div className="mx-auto w-full max-w-7xl">
          {/* Header */}
          <Box sx={{ mb: 3 }}>
           
      
      <Box sx={{ 
              bgcolor: 'white', 
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e8e9eb',
              p: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(123, 104, 238, 0.25)',
                }}>
                  <DashboardIcon sx={{ fontSize: 32, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 0.5 }}>
                     Bảng điều khiển
                </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Tổng quan dự án và các chỉ số chính
                </Typography>
                </Box>
              </Box>

              <IconButton 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  sx={{ 
                  bgcolor: '#f3f4f6',
                  '&:hover': { bgcolor: '#e5e7eb' },
                  transition: 'all 0.2s ease',
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              >
                <Refresh />
              </IconButton>
          </Box>
        </Box>

          {/* Key Metrics Cards */}
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
            gap: 3,
            mb: 4 
          }}>
            {/* Total Tasks */}
            <Box>
              <Card sx={{ 
                  borderRadius: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
                border: 'none',
                height: '100%',
                  '&:hover': {
                  boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
                  transform: 'translateY(-2px)'
                  },
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                  left: 0,
                    right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                  pointerEvents: 'none'
                }
              }}>
                <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <Assignment sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Chip 
                      label={`${keyMetrics.completionRate}%`}
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.25)', 
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '11px',
                        height: 24,
                        border: '1px solid rgba(255,255,255,0.3)'
                      }}
                    />
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'white', fontSize: '28px' }}>
                    {keyMetrics.total}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                    Tổng số công việc
                  </Typography>
                </CardContent>
              </Card>
          </Box>

            {/* Completed */}
            <Box>
              <Card sx={{ 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                boxShadow: '0 4px 12px rgba(17, 153, 142, 0.2)',
                border: 'none',
                height: '100%',
                '&:hover': { 
                  boxShadow: '0 8px 20px rgba(17, 153, 142, 0.3)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                  pointerEvents: 'none'
                }
              }}>
                <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                    <TrendingUp sx={{ color: 'white', fontSize: 18 }} />
                </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'white', fontSize: '28px' }}>
                    {keyMetrics.completed}
                </Typography>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                    Đã hoàn thành
                    </Typography>
              </CardContent>
            </Card>
          </Box>

            {/* In Progress */}
            <Box>
              <Card sx={{ 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                border: 'none',
                height: '100%',
                '&:hover': { 
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                  pointerEvents: 'none'
                }
              }}>
                <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <Schedule sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                    <Speed sx={{ color: 'white', fontSize: 18 }} />
                </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'white', fontSize: '28px' }}>
                    {keyMetrics.inProgress}
                    </Typography>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                    Đang thực hiện
                    </Typography>
              </CardContent>
            </Card>
          </Box>

            {/* Issues */}
            <Box>
              <Card sx={{ 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                boxShadow: '0 4px 12px rgba(245, 87, 108, 0.2)',
                border: 'none',
                height: '100%',
                '&:hover': { 
                  boxShadow: '0 8px 20px rgba(245, 87, 108, 0.3)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                  pointerEvents: 'none'
                }
              }}>
                <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <Warning sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                    {keyMetrics.openBugs > 0 && (
                    <Chip 
                        label={`${keyMetrics.openBugs} bugs`}
                      size="small"
                      sx={{ 
                          bgcolor: 'rgba(255, 255, 255, 0.25)', 
                          backdropFilter: 'blur(10px)',
                        color: 'white',
                          fontWeight: 600,
                          fontSize: '11px',
                          height: 24,
                          border: '1px solid rgba(255,255,255,0.3)'
                        }}
                      />
                    )}
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'white', fontSize: '28px' }}>
                    {keyMetrics.overdue}
                            </Typography>
                  <Typography variant="body2" sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                    Công việc quá hạn
                          </Typography>
              </CardContent>
            </Card>
            </Box>
          </Box>

          {/* Time-Based Progress Bar */}
          {timeBasedProgress && timeBasedProgress.project_metrics && (
            <Box sx={{ mb: 4 }}>
              <Paper sx={{ 
                p: 3, 
                borderRadius: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e8e9eb',
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body1" sx={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Speed sx={{ fontSize: 18, color: COLORS.primary }} />
                    Tiến độ dự án
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#0284c7' }} />
                      <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                        Dự kiến: {timeBasedProgress.project_metrics.avgTargetPercent.toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: timeBasedProgress.project_metrics.avgActualPercent >= timeBasedProgress.project_metrics.avgTargetPercent ? '#16a34a' : '#dc2626' }} />
                      <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                        Thực tế: {timeBasedProgress.project_metrics.avgActualPercent.toFixed(1)}%
                              </Typography>
                    </Box>
                  </Box>
          </Box>

                {/* Single Progress Bar with Both Indicators */}
                <Box sx={{ position: 'relative', height: 32, mb: 1 }}>
                  <Box sx={{ 
                    width: '100%',
                    height: '100%',
                    bgcolor: '#f1f5f9',
                        borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* Actual Progress Fill */}
                    <Box sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min(timeBasedProgress.project_metrics.avgActualPercent, 100)}%`,
                      bgcolor: timeBasedProgress.project_metrics.avgActualPercent >= timeBasedProgress.project_metrics.avgTargetPercent ? '#16a34a' : '#dc2626',
                      transition: 'width 0.5s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      pr: 1.5
                    }}>
                      {timeBasedProgress.project_metrics.avgActualPercent > 5 && (
                        <Typography sx={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>
                          {timeBasedProgress.project_metrics.avgActualPercent.toFixed(1)}%
                            </Typography>
                          )}
                        </Box>
                    
                    {/* Expected Progress Marker */}
                    <Box sx={{
                      position: 'absolute',
                      left: `${Math.min(timeBasedProgress.project_metrics.avgTargetPercent, 100)}%`,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      bgcolor: '#0284c7',
                      boxShadow: '0 0 8px rgba(2, 132, 199, 0.6)',
                      zIndex: 2
                    }} />
                </Box>
          </Box>

                {/* Status Text */}
                <Typography sx={{ 
                  fontSize: '11px', 
                  color: timeBasedProgress.project_metrics.avgActualPercent >= timeBasedProgress.project_metrics.avgTargetPercent ? COLORS.success : COLORS.danger,
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  {timeBasedProgress.project_metrics.avgActualPercent >= timeBasedProgress.project_metrics.avgTargetPercent ? '✓ Đúng tiến độ' : '⚠ Chậm tiến độ'} 
                  ({timeBasedProgress.project_metrics.avgActualPercent >= timeBasedProgress.project_metrics.avgTargetPercent ? '+' : ''}{(timeBasedProgress.project_metrics.avgActualPercent - timeBasedProgress.project_metrics.avgTargetPercent).toFixed(1)}%)
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Charts Row */}
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            mb: 4 
          }}>
            {/* Status Distribution */}
            <Box>
              <Paper sx={{ 
                p: 3, 
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid #e8e9eb',
                height: '100%',
                background: 'white',
                '&:hover': {
                  boxShadow: '0 8px 28px rgba(0,0,0,0.12)'
                },
                transition: 'all 0.3s ease'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: '16px' }}>
                  📊 Phân bổ trạng thái công việc
                  </Typography>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: '1px solid #e8e9eb',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar dataKey="value" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                    <Typography color="text.secondary">Không có dữ liệu</Typography>
          </Box>
                  )}
              </Paper>
          </Box>

            {/* Priority Distribution */}
            <Box>
              <Paper sx={{ 
                p: 3, 
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid #e8e9eb',
                height: '100%',
                background: 'white',
                '&:hover': {
                  boxShadow: '0 8px 28px rgba(0,0,0,0.12)'
                },
                transition: 'all 0.3s ease'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: '16px' }}>
                  🎯 Phân bổ mức độ ưu tiên
                  </Typography>
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                        data={priorityData}
                            cx="50%"
                            cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        fill="#8884d8"
                            dataKey="value"
                          >
                        {priorityData.map((entry, index) => {
                          const colors: any = {
                            'Critical': COLORS.danger,
                            'High': COLORS.warning,
                            'Medium': COLORS.info,
                            'Low': COLORS.success
                          };
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={colors[entry.name] || COLORS.primary} 
                            />
                          );
                        })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: 8, 
                          border: '1px solid #e8e9eb',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                    <Typography color="text.secondary">Không có dữ liệu</Typography>
                    </Box>
                  )}
              </Paper>
                    </Box>
            </Box>

          {/* Team Member Task Statistics */}
          <Paper sx={{ 
            p: 3, 
            borderRadius: 4,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e8e9eb',
            mb: 4,
            background: 'white',
            '&:hover': {
              boxShadow: '0 8px 28px rgba(0,0,0,0.12)'
            },
            transition: 'all 0.3s ease'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Group sx={{ color: COLORS.primary, fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px' }}>
                  Thống kê công việc theo thành viên
                  </Typography>
                {(dateFrom || dateTo) && (
                  <Chip 
                    label={`Đã lọc: ${dateFrom || 'Bắt đầu'} → ${dateTo || 'Hiện tại'}`}
                    size="small"
                    onDelete={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    sx={{ 
                      bgcolor: 'rgba(123, 104, 238, 0.1)',
                      color: COLORS.primary,
                      fontWeight: 600,
                      fontSize: '11px'
                    }}
                  />
                )}
                    </Box>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  type="date"
                  size="small"
                  label="Từ ngày"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    width: 150,
                    '& .MuiOutlinedInput-root': {
                      fontSize: '13px',
                      height: 36
                    }
                  }}
                />
                <TextField
                  type="date"
                  size="small"
                  label="Đến ngày"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    width: 150,
                    '& .MuiOutlinedInput-root': {
                      fontSize: '13px',
                      height: 36
                    }
                  }}
                />
                {(dateFrom || dateTo) && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    sx={{ 
                      bgcolor: '#f3f4f6',
                      '&:hover': { bgcolor: '#e5e7eb' }
                    }}
                  >
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </Stack>
            </Box>
            {teamMemberStatistics.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={teamMemberStatistics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: 8, 
                      border: '1px solid #e8e9eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Đã hoàn thành" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Chưa hoàn thành" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                <Typography color="text.secondary">Không có dữ liệu thành viên</Typography>
            </Box>
            )}
          </Paper>

          {/* Issues & Alerts - Full Width */}
          <Box>
              <Stack spacing={3}>
                {/* At Risk Tasks */}
                {atRiskTasks.length > 0 && (
                  <Paper sx={{ 
                    p: 3, 
                    borderRadius: 4,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid #e8e9eb',
                    background: 'white',
                    '&:hover': {
                      boxShadow: '0 8px 28px rgba(0,0,0,0.12)'
                    },
                    transition: 'all 0.3s ease'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Warning sx={{ color: COLORS.warning, fontSize: 20 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '14px' }}>
                         Có rủi ro ({atRiskTasks.length})
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
                      {atRiskTasks.map((task: any, idx: number) => {
                        // Determine impact level and color
                        const impactLevel = 
                          task.impactScore >= 70 ? { label: '🔴 CRITICAL', color: '#dc2626', bgcolor: 'rgba(220, 38, 38, 0.1)' } :
                          task.impactScore >= 50 ? { label: '🟠 HIGH', color: '#ea580c', bgcolor: 'rgba(234, 88, 12, 0.1)' } :
                          task.impactScore >= 30 ? { label: '🟡 MEDIUM', color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' } :
                          { label: '🟢 LOW', color: '#16a34a', bgcolor: 'rgba(22, 163, 74, 0.1)' };
                        
                        const isOverdue = task.hoursUntilDeadline < 0;
                        
                        return (
                          <Box 
                          key={idx}
                          sx={{ 
                              p: 2, 
                              bgcolor: 'white',
                              borderRadius: 2,
                              border: `2px solid ${impactLevel.color}`,
                              borderLeft: `6px solid ${impactLevel.color}`,
                              cursor: 'pointer',
                              position: 'relative',
                              overflow: 'hidden',
                              '&:hover': { 
                                bgcolor: impactLevel.bgcolor,
                                transform: 'translateX(4px)',
                                boxShadow: `0 4px 12px ${impactLevel.color}40`
                              },
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => router.push(`/projects/${projectId}/tasks?taskId=${task._id}`)}
                          >
                            {/* Rank Badge */}
                            <Box sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              bgcolor: impactLevel.color,
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>
                              {idx + 1}
                            </Box>
                            
                            <Stack spacing={1}>
                              {/* Impact Level Badge */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Chip 
                                  label={impactLevel.label}
                                size="small"
                                sx={{ 
                                    bgcolor: impactLevel.color,
                                  color: 'white',
                                    fontWeight: 700,
                                    fontSize: '10px',
                                    height: 20,
                                    '& .MuiChip-label': { px: 1 }
                                  }}
                                />
                                <Chip 
                                  label={`Tác động: ${task.impactScore}/100`}
                                  size="small"
                                  sx={{ 
                                    bgcolor: 'rgba(0,0,0,0.05)',
                                    color: 'text.secondary',
                                    fontWeight: 600,
                                    fontSize: '10px',
                                    height: 20,
                                    '& .MuiChip-label': { px: 1 }
                                  }}
                                />
                              </Box>
                              
                              {/* Task Title */}
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '13px', pr: 4 }}>
                                {task.title}
                              </Typography>
                              
                              {/* Task Details */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                {/* Deadline Status */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Schedule sx={{ fontSize: 14, color: isOverdue ? '#dc2626' : '#f59e0b' }} />
                                  <Typography variant="caption" sx={{ 
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: isOverdue ? '#dc2626' : 'text.secondary'
                                  }}>
                                    {isOverdue 
                                      ? `Quá hạn ${Math.abs(Math.round(task.hoursUntilDeadline / 24))} ngày`
                                      : task.hoursUntilDeadline < 24
                                        ? `Còn ${Math.round(task.hoursUntilDeadline)} giờ`
                                        : `Còn ${Math.round(task.hoursUntilDeadline / 24)} ngày`
                                    }
                            </Typography>
          </Box>

                                {/* Priority */}
                                {task.priority && (
              <Chip 
                                    label={typeof task.priority === 'object' ? task.priority.name : task.priority}
                size="small"
                                    sx={{ 
                                      fontSize: '10px',
                                      height: 18,
                                      bgcolor: 'rgba(0,0,0,0.05)',
                                      fontWeight: 600
                                    }}
                                  />
                                )}
                                
                                {/* Blocking Tasks */}
                                {task.dependents && task.dependents.length > 0 && (
              <Chip 
                                    label={`🔒 Chặn ${task.dependents.length} công việc`}
                size="small"
                                    sx={{ 
                                      fontSize: '10px',
                                      height: 18,
                                      bgcolor: 'rgba(220, 38, 38, 0.1)',
                                      color: '#dc2626',
                                      fontWeight: 600
                                    }}
                                  />
                                )}
                              </Box>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Paper>
                )}

                {/* Blocked Tasks */}
                {blockedTasks.length > 0 && (
                  <Paper sx={{ 
                    p: 3, 
                    borderRadius: 4,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid #e8e9eb',
                    background: 'white',
                    '&:hover': {
                      boxShadow: '0 8px 28px rgba(0,0,0,0.12)'
                    },
                    transition: 'all 0.3s ease'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Block sx={{ color: COLORS.danger, fontSize: 20 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '14px' }}>
                        🚫 Bị chặn ({blockedTasks.length})
                      </Typography>
                    </Box>
                    <Stack spacing={1}>
                      {blockedTasks.map((task: any, idx: number) => (
                        <Box 
                          key={idx}
                          sx={{ 
                            p: 1.5, 
                            bgcolor: 'rgba(239, 68, 68, 0.05)',
                            borderRadius: 2,
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' }
                          }}
                          onClick={() => router.push(`/projects/${projectId}/tasks?taskId=${task._id}`)}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '12px', mb: 0.5 }}>
                            {task.title}
                          </Typography>
              <Chip 
                            label={typeof task.status === 'object' ? task.status?.name : task.status}
                size="small"
                sx={{ 
                                  height: 18, 
                                  fontSize: '10px', 
                              bgcolor: 'rgba(239, 68, 68, 0.1)',
                              color: COLORS.danger
                            }}
                          />
                        </Box>
                      ))}
            </Stack>
                  </Paper>
                )}

                {/* No Issues */}
                {atRiskTasks.length === 0 && blockedTasks.length === 0 && (
                  <Paper sx={{ 
                    p: 4, 
                    borderRadius: 4,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid #e8e9eb',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(56, 239, 125, 0.05) 100%)',
                    '&:hover': {
                      boxShadow: '0 8px 28px rgba(16, 185, 129, 0.15)'
                    },
                    transition: 'all 0.3s ease'
                  }}>
                    <CheckCircle sx={{ fontSize: 48, color: COLORS.success, mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Tất cả đều ổn! 🎉
            </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Không có công việc bị chặn hoặc có rủi ro
                    </Typography>
                  </Paper>
                )}
              </Stack>
          </Box>
        </div>
      </main>
    </div>
  );
}
