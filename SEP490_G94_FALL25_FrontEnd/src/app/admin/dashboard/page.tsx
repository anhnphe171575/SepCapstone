"use client";

import { useEffect, useState } from "react";
import LeftSidebarHeader from "../dashboard-admin/herder";
import axiosInstance from "../../../../ultis/axios";
import { Users, UserCheck, FolderCheck, Folder } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Project {
  _id: string;
  topic: string;
  status: string;
  created_by: {
    _id: string;
    full_name: string;
    email: string;
  };
  semester: string;
  createdAt: string;
}

interface DashboardStats {
  users: {
    total: number;
    active: number;
    byRole: {
      admin: number;
      supervisor: number;
      student: number;
    };
    monthlyGrowth: number[];
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    status: {
      planned: number;
      active: number;
      onHold: number;
      completed: number;
      cancelled: number;
    };
  };
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    users: {
      total: 0,
      active: 0,
      byRole: { admin: 0, supervisor: 0, student: 0 },
      monthlyGrowth: Array(12).fill(0)
    },
    projects: {
      total: 0,
      active: 0,
      completed: 0,
      status: {
        planned: 0,
        active: 0,
        onHold: 0,
        completed: 0,
        cancelled: 0
      }
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [usersRes, projectsRes] = await Promise.all([
          axiosInstance.get("/api/users/all"),
          axiosInstance.get("/api/projects/all")
        ]);

        const users = usersRes.data.data.users || [];
        const projects = projectsRes.data.projects || [];

        setStats({
          users: {
            total: users.length,
            active: users.filter((u: any) => u.status !== 'inactive').length,
            byRole: {
              admin: users.filter((u: any) => u.role === 8).length,
              supervisor: users.filter((u: any) => u.role === 4).length,
              student: users.filter((u: any) => u.role === 1).length
            },
            monthlyGrowth: calculateMonthlyGrowth(users)
          },
          projects: {
            total: projects.length,
            active: projects.filter((p: any) => p.status === 'active').length,
            completed: projects.filter((p: any) => p.status === 'completed').length,
            status: {
              planned: projects.filter((p: any) => p.status === 'planned').length,
              active: projects.filter((p: any) => p.status === 'active').length,
              onHold: projects.filter((p: any) => p.status === 'on-hold').length,
              completed: projects.filter((p: any) => p.status === 'completed').length,
              cancelled: projects.filter((p: any) => p.status === 'cancelled').length
            }
          }
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const calculateMonthlyGrowth = (users: any[]) => {
    const months = Array(12).fill(0);
    users.forEach(user => {
      const month = new Date(user.createdAt).getMonth();
      months[month]++;
    });
    return months;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <LeftSidebarHeader />
        <main className="flex-1 ml-64 p-6 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <LeftSidebarHeader />
      <main className="flex-1 ml-64 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan hệ thống</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tổng người dùng</p>
                <p className="text-xl font-bold text-gray-800">{stats.users.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Hoạt động</p>
                <p className="text-xl font-bold text-gray-800">{stats.users.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Folder className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tổng dự án</p>
                <p className="text-xl font-bold text-gray-800">{stats.projects.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FolderCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Dự án hoàn thành</p>
                <p className="text-xl font-bold text-gray-800">{stats.projects.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Role Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Phân bố người dùng</h3>
            <div className="h-[300px]">
              <Doughnut
                data={{
                  labels: ['Admin', 'Giám sát', 'Sinh viên'],
                  datasets: [{
                    data: [
                      stats.users.byRole.admin,
                      stats.users.byRole.supervisor,
                      stats.users.byRole.student
                    ],
                    backgroundColor: [
                      'rgba(147, 51, 234, 0.7)',
                      'rgba(16, 185, 129, 0.7)',
                      'rgba(59, 130, 246, 0.7)'
                    ],
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Project Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Trạng thái dự án</h3>
            <div className="h-[300px]">
              <Doughnut
                data={{
                  labels: ['Đang thực hiện', 'Hoàn thành', 'Tạm dừng', 'Đã hủy', 'Lên kế hoạch'],
                  datasets: [{
                    data: [
                      stats.projects.status.active,
                      stats.projects.status.completed,
                      stats.projects.status.onHold,
                      stats.projects.status.cancelled,
                      stats.projects.status.planned
                    ],
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.7)',
                      'rgba(16, 185, 129, 0.7)',
                      'rgba(234, 179, 8, 0.7)',
                      'rgba(239, 68, 68, 0.7)',
                      'rgba(168, 162, 158, 0.7)'
                    ],
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Monthly Growth Chart */}
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Tăng trưởng người dùng theo tháng</h3>
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
                  datasets: [{
                    label: 'Người dùng mới',
                    data: stats.users.monthlyGrowth,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;