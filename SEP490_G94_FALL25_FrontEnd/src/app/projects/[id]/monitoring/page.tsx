"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "../../../../../ultis/axios";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  Chip,
  IconButton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from "@mui/material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";

type DashboardData = {
  project: {
    _id: string;
    topic: string;
    code: string;
    description?: string;
    status?: string;
    start_date: string;
    end_date: string;
    created_by?: {
      full_name: string;
      email: string;
    };
  };
  statistics: {
    milestones: {
      total: number;
      completed: number;
      in_progress: number;
    };
    features: {
      total: number;
      completed: number;
      in_progress: number;
    };
    tasks: {
      total: number;
      completed: number;
      in_progress: number;
    };
    functions: {
      total: number;
      completed: number;
      in_progress: number;
    };
    overall_progress: number;
  };
};

type ContributionsData = {
  project: {
    _id: string;
    topic: string;
    code: string;
  };
  charts: {
    pie_chart: Array<{
      user_id: string;
      user_name: string;
      avatar: string;
      total_tasks: number;
      completed_tasks: number;
      in_progress_tasks: number;
      planning_tasks: number;
      percentage: number;
    }>;
    bar_chart: Array<{
      week: string;
      week_label: string;
      completed_tasks: number;
      completed_functions: number;
    }>;
    line_chart: Array<{
      week: string;
      week_label: string;
      cumulative_tasks: number;
      cumulative_functions: number;
      progress_percentage: number;
    }>;
    contributions: Array<{
      user_id: string;
      user_name: string;
      avatar: string;
      role: string;
      tasks: {
        total: number;
        completed: number;
        in_progress: number;
        planning: number;
      };
      functions: {
        total: number;
        completed: number;
      };
      completion_rate: number;
    }>;
  };
};

export default function ProjectMonitoringPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [contributionsData, setContributionsData] = useState<ContributionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    loadDashboard();
    loadContributions();
  }, [projectId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/api/projects/${projectId}/dashboard`);
      setDashboardData(response.data);
    } catch (e: any) {
      console.error('Dashboard API failed:', e);
      setError(e?.response?.data?.message || 'Không thể tải dashboard dự án');
    } finally {
      setLoading(false);
    }
  };

  const loadContributions = async () => {
    try {
      setContributionsLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/api/projects/${projectId}/charts/contributions`);
      setContributionsData(response.data);
    } catch (e: any) {
      console.error('Contributions API failed:', e);
      // Không set error vì đây là dữ liệu phụ, không ảnh hưởng đến trang chính
    } finally {
      setContributionsLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <ResponsiveSidebar />
        <main className="p-4 md:p-6 md:ml-64">
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-white">
      <ResponsiveSidebar />
      <main className="p-4 md:p-6 md:ml-64">
        <div className="mx-auto w-full max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <IconButton onClick={() => router.back()}>
                <ArrowBackIcon />
              </IconButton>
              <div>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {dashboardData?.project?.code ? `Project: ${dashboardData.project.code}` : 'Project Monitoring'}
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#000' }}>
                  {dashboardData?.project?.topic || 'Dashboard & Adjustment'}
                </Typography>
                {dashboardData?.project?.description && (
                  <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
                    {dashboardData.project.description}
                  </Typography>
                )}
              </div>
            </div>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadDashboard(); loadContributions(); }}>
                Làm mới
              </Button>
            </Stack>
          </div>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
              action={
                <Button color="inherit" size="small" onClick={loadDashboard}>
                  Thử lại
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* Overview Cards */}
          {dashboardData && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Milestones
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                    {dashboardData.statistics.milestones.total || 0}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Hoàn thành: {dashboardData.statistics.milestones.completed || 0} | Đang thực hiện: {dashboardData.statistics.milestones.in_progress || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Tính năng
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                    {dashboardData.statistics.features.total || 0}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Hoàn thành: {dashboardData.statistics.features.completed || 0} | Đang thực hiện: {dashboardData.statistics.features.in_progress || 0}
                    </Typography>
                        </Box>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Chức năng
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                    {dashboardData.statistics.functions.total || 0}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Hoàn thành: {dashboardData.statistics.functions.completed || 0} | Đang thực hiện: {dashboardData.statistics.functions.in_progress || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Nhiệm vụ
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                    {dashboardData.statistics.tasks.total || 0}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Hoàn thành: {dashboardData.statistics.tasks.completed || 0} | Đang thực hiện: {dashboardData.statistics.tasks.in_progress || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
          </Box>
          )}

          {/* Overall Progress */}
          {dashboardData && (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Tiến độ tổng thể
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={dashboardData.statistics.overall_progress || 0}
                  sx={{ height: 24, borderRadius: 1, mb: 2 }}
                />
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {dashboardData.statistics.overall_progress || 0}%
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Effort Analysis */}
          {/* <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Phân tích Effort
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Effort ước tính
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#000' }}>
                    {stats?.features.total_estimated_effort || 0} giờ
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Effort thực tế
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#000' }}>
                    {stats?.features.total_actual_effort || 0} giờ
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Chênh lệch
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color={isOverBudget ? "error.main" : "success.main"}
                    >
                      {effortVariance > 0 ? "+" : ""}
                      {effortVariance} giờ
                    </Typography>
                    {isOverBudget ? (
                      <TrendingUpIcon color="error" />
                    ) : (
                      <TrendingDownIcon color="success" />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    {isOverBudget
                      ? "Vượt budget - Cần điều chỉnh"
                      : "Trong budget - Tốt"}
                  </Typography>
                </Box>
            </Box>

            {isOverBudget && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Cảnh báo vượt budget
                </Typography>
                <Typography variant="body2">
                  Dự án đang vượt effort estimate {Math.abs(effortVariance)} giờ. Đề xuất:
                </Typography>
                <ul style={{ marginTop: 8, marginLeft: 20 }}>
                  <li>Xem xét lại phạm vi của các tính năng</li>
                  <li>Ước tính lại các chức năng còn lại</li>
                  <li>Thêm tài nguyên hoặc điều chỉnh thời gian</li>
                  <li>Ưu tiên các tính năng quan trọng</li>
                </ul>
              </Alert>
            )}
          </Paper> */}


          {/* Recommendations */}
          {dashboardData && (
          <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Khuyến nghị điều chỉnh
            </Typography>
            <Stack spacing={2}>
                {dashboardData.statistics.tasks.total > 0 && (
                  <Alert severity="info">
                    Tổng số nhiệm vụ: {dashboardData.statistics.tasks.total} | 
                    Hoàn thành: {dashboardData.statistics.tasks.completed} | 
                    Đang thực hiện: {dashboardData.statistics.tasks.in_progress}
                </Alert>
              )}
                {dashboardData.statistics.functions.total > 0 && (
                  <Alert severity="info">
                    Tổng số chức năng: {dashboardData.statistics.functions.total} | 
                    Hoàn thành: {dashboardData.statistics.functions.completed} | 
                    Đang thực hiện: {dashboardData.statistics.functions.in_progress}
                </Alert>
              )}
                {dashboardData.statistics.overall_progress >= 80 && (
                  <Alert severity="success">
                    Dự án đang đi đúng hướng! Tiến độ tổng thể: {dashboardData.statistics.overall_progress}%
                </Alert>
              )}
                {dashboardData.statistics.overall_progress < 50 && dashboardData.statistics.overall_progress > 0 && (
                  <Alert severity="warning">
                    Tiến độ tổng thể còn thấp ({dashboardData.statistics.overall_progress}%) - Cần tăng tốc
                  </Alert>
                )}
            </Stack>
          </Paper>
          )}

          {/* Contributions Charts */}
          {contributionsData && (
            <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Biểu đồ Đóng góp
                </Typography>
                {contributionsLoading && <CircularProgress size={24} />}
              </Box>

              {/* Pie Chart - Task Distribution by User */}
              {contributionsData.charts.pie_chart && contributionsData.charts.pie_chart.length > 0 && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Phân bổ Nhiệm vụ theo Thành viên
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={contributionsData.charts.pie_chart}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ user_name, percentage }) => `${user_name}: ${percentage}%`}
                          outerRadius={100}
                          innerRadius={40}
                          fill="#8884d8"
                          dataKey="total_tasks"
                          animationDuration={1000}
                          animationBegin={0}
                          paddingAngle={2}
                        >
                          {contributionsData.charts.pie_chart.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`hsl(${(index * 360) / contributionsData.charts.pie_chart.length}, 70%, 50%)`}
                              stroke="#fff"
                              strokeWidth={2}
                              style={{
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value: any, name: string, props: any) => [
                            `${value} nhiệm vụ`,
                            props.payload.user_name
                          ]}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          formatter={(value, entry: any) => `${entry.payload.user_name} (${entry.payload.percentage}%)`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Bar Chart - Weekly Completed Tasks and Functions */}
              {contributionsData.charts.bar_chart && contributionsData.charts.bar_chart.length > 0 && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Nhiệm vụ và Chức năng Hoàn thành theo Tuần
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart 
                        data={contributionsData.charts.bar_chart}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.5}/>
                          </linearGradient>
                          <linearGradient id="functionsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.5}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.3} />
                        <XAxis 
                          dataKey="week_label"
                          stroke="#888"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis stroke="#888" style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}
                          labelStyle={{ fontWeight: 'bold', color: '#333' }}
                          cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        <Bar 
                          dataKey="completed_tasks" 
                          fill="url(#tasksGradient)" 
                          name="Nhiệm vụ hoàn thành"
                          radius={[8, 8, 0, 0]}
                          animationDuration={1000}
                          animationBegin={0}
                        />
                        <Bar 
                          dataKey="completed_functions" 
                          fill="url(#functionsGradient)" 
                          name="Chức năng hoàn thành"
                          radius={[8, 8, 0, 0]}
                          animationDuration={1000}
                          animationBegin={200}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Line Chart - Cumulative Progress */}
              {contributionsData.charts.line_chart && contributionsData.charts.line_chart.length > 0 && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Tiến độ Tích lũy
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart 
                        data={contributionsData.charts.line_chart}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.3} />
                        <XAxis 
                          dataKey="week_label"
                          stroke="#888"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          yAxisId="left"
                          stroke="#888" 
                          style={{ fontSize: '12px' }} 
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          stroke="#888" 
                          style={{ fontSize: '12px' }} 
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}
                          labelStyle={{ fontWeight: 'bold', color: '#333' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="line"
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="cumulative_tasks" 
                          stroke="#8884d8" 
                          name="Nhiệm vụ tích lũy"
                          strokeWidth={3}
                          dot={{ fill: '#8884d8', r: 4, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 2 }}
                          animationDuration={1000}
                          animationBegin={0}
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="cumulative_functions" 
                          stroke="#82ca9d" 
                          name="Chức năng tích lũy"
                          strokeWidth={3}
                          dot={{ fill: '#82ca9d', r: 4, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 2 }}
                          animationDuration={1000}
                          animationBegin={200}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="progress_percentage" 
                          stroke="#ff7300" 
                          name="Tiến độ (%)"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{ fill: '#ff7300', r: 4, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 2 }}
                          animationDuration={1000}
                          animationBegin={400}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Contributions Table */}
              {contributionsData.charts.contributions && contributionsData.charts.contributions.length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Chi tiết Đóng góp của Thành viên
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Thành viên</strong></TableCell>
                            <TableCell><strong>Vai trò</strong></TableCell>
                            <TableCell align="center"><strong>Nhiệm vụ</strong></TableCell>
                            <TableCell align="center"><strong>Chức năng</strong></TableCell>
                            <TableCell align="center"><strong>Tỷ lệ hoàn thành</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {contributionsData.charts.contributions.map((contributor) => (
                            <TableRow key={contributor.user_id} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar 
                                    src={contributor.avatar} 
                                    alt={contributor.user_name}
                                    sx={{ width: 40, height: 40 }}
                                  />
                                  <Typography variant="body1">{contributor.user_name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={contributor.role} 
                                  size="small"
                                  color={contributor.role === 'Leader' ? 'primary' : 'default'}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box>
                                  <Typography variant="body2">
                                    Tổng: <strong>{contributor.tasks.total}</strong>
                                  </Typography>
                                  <Typography variant="caption" color="success.main">
                                    Hoàn thành: {contributor.tasks.completed}
                                  </Typography>
                                  {' | '}
                                  <Typography variant="caption" color="warning.main">
                                    Đang làm: {contributor.tasks.in_progress}
                                  </Typography>
                                  {' | '}
                                  <Typography variant="caption" color="info.main">
                                    Kế hoạch: {contributor.tasks.planning}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  Tổng: <strong>{contributor.functions.total}</strong>
                                </Typography>
                                <Typography variant="caption" color="success.main">
                                  Hoàn thành: {contributor.functions.completed}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={contributor.completion_rate}
                                    sx={{ width: '100%', height: 8, borderRadius: 1 }}
                                  />
                                  <Typography variant="body2" fontWeight="bold">
                                    {contributor.completion_rate}%
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
            </Paper>
          )}

          {/* Quick Actions */}
          <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Hành động Nhanh
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
              <Button
                variant="contained"
                onClick={() => router.push(`/projects/${projectId}/features`)}
              >
                Quản lý Tính năng
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push(`/projects/${projectId}/milestones`)}
              >
                Quản lý Milestone
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push(`/projects/${projectId}`)}
              >
                Tổng quan Dự án
              </Button>
            </Stack>
          </Paper>
        </div>
      </main>
    </div>
  );
}

