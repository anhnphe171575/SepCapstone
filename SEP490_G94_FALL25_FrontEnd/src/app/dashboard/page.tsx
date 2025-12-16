"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "../../../ultis/axios";
import {
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton
} from "@mui/material";
import {
  Login as LoginIcon,
  Close as CloseIcon,
  Group as GroupIcon
} from "@mui/icons-material";


type Project = {
  _id: string;
  topic: string;
  code: string;
  description?: string;
  status?: string;
  progress?: number;
  lastUpdated?: string;
  semester?: string;
  createAt?: string;
  updateAt?: string;
};

type SemesterGroup = {
  semester: string;
  count: number;
  projects: Project[];
};

// Helper function to check if project is in progress
const isProjectInProgress = (project: Project): boolean => {
  return project.status === 'on-hold' || project.status === 'planned' || project.status === 'active';
};

// Helper function to get year from semester name for sorting
const getSemesterYear = (semester: string): number => {
  const match = semester.match(/(\d{4})/);
  return match ? parseInt(match[1]) : 0;
};

// Project Card Component
const ProjectCard = ({ project, onEdit, router }: {
  project: Project;
  onEdit: (project: Project) => void;
  router: { push: (path: string) => void };
}) => (
  <div
    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transform hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
    onClick={() => router.push(`/projects/${project._id}`)}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
          {project.code || 'N/A'}
        </span>
        {project.semester && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full text-center">
            {project.semester}
          </span>
        )}
      </div>
    </div>

    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-200">
      {project.topic || 'Dự án không có tên'}
    </h3>

    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
      {project.description || 'Theo dõi tiến độ, quản lý milestone và tài liệu dự án.'}
    </p>

    {project.progress !== undefined && (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Tiến độ</span>
          <span className="font-medium text-gray-900">{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${project.progress}%` }}
          ></div>
        </div>
      </div>
    )}

    <div className="pt-4 border-t border-gray-200">
      {/* Action buttons row */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(project);
          }}
          className="text-blue-500 hover:text-blue-600 font-medium text-sm transition-colors duration-200 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Sửa
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/projects/${project._id}/details`);
          }}
          className="text-green-500 hover:text-green-600 font-medium text-sm transition-colors duration-200 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Chi tiết
        </button>
      </div>

      {/* Open project button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/projects/${project._id}/milestones`);
        }}
        className="w-full text-orange-500 hover:text-orange-600 font-medium text-sm transition-colors duration-200 text-center py-2 border border-orange-200 hover:bg-orange-50 rounded-lg"
      >
        Mở dự án →
      </button>
    </div>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [semesterGroups, setSemesterGroups] = useState<SemesterGroup[]>([]);

  // Edit/Delete states
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({
    topic: '',
    code: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);


  // Join project dialog states
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  // Warning dialog for existing project
  const [openWarningDialog, setOpenWarningDialog] = useState(false);
  const [existingProject, setExistingProject] = useState<Project | null>(null);
  const [currentSemester, setCurrentSemester] = useState<string | null>(null);

  // Check if user has project in current semester (for create project)
  const checkExistingProject = async (): Promise<Project | null> => {
    try {
      const response = await axiosInstance.get('/api/projects');
      const data = response.data;
      
      // Get current semester from API response
      const semester = data.currentSemester?.semester || data.currentSemester;
      if (semester) {
        setCurrentSemester(semester);
      }
      
      // Check if user has any project in current semester
      const allProjects = data.projects || [];
      const currentSemesterProject = allProjects.find((p: Project) => p.semester === semester);
      
      return currentSemesterProject || null;
    } catch (error) {
      console.error('Error checking existing project:', error);
      return null;
    }
  };

  // Check if user has any project (for join project - check all semesters)
  const checkAnyExistingProject = async (): Promise<Project | null> => {
    try {
      const response = await axiosInstance.get('/api/projects');
      const data = response.data;
      
      // Check if user has any project at all
      const allProjects = data.projects || [];
      if (allProjects.length > 0) {
        // Return the most recent project
        return allProjects.sort((a: Project, b: Project) => {
          const dateA = new Date(a.createAt || a.updateAt || 0);
          const dateB = new Date(b.createAt || b.updateAt || 0);
          return dateB.getTime() - dateA.getTime();
        })[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error checking any existing project:', error);
      return null;
    }
  };

  // Handle create project button click
  const handleCreateProjectClick = async () => {
    const existing = await checkExistingProject();
    if (existing) {
      setExistingProject(existing);
      setOpenWarningDialog(true);
    } else {
      router.push('/projects/new');
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null;
    if (!token) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        // Assuming endpoint exists: /api/projects (adjust if different)
        const response = await axiosInstance.get('/api/projects');
        const data = response.data;

        // Get current semester from API response
        const semester = data.currentSemester?.semester || data.currentSemester;
        if (semester) {
          setCurrentSemester(semester);
        }

        // Xử lý dữ liệu từ API
        if (data.statistics?.bySemester) {
          // API mới: sử dụng dữ liệu đã được nhóm sẵn
          const groups = data.statistics.bySemester.map((group: { semester: string; count: number; projects: Project[] }) => ({
            semester: group.semester,
            count: group.count,
            projects: group.projects.sort((a: Project, b: Project) => {
              const dateA = new Date(a.createAt || a.updateAt || 0);
              const dateB = new Date(b.createAt || b.updateAt || 0);
              return dateB.getTime() - dateA.getTime();
            })
          })).sort((a: SemesterGroup, b: SemesterGroup) => {
            return getSemesterYear(b.semester) - getSemesterYear(a.semester);
          });
          setSemesterGroups(groups);
          setProjects(data.projects || []);
        } else {
          // API cũ: tự nhóm dữ liệu
          const list = Array.isArray(data) ? data : (data?.items || []);
          if (!list || list.length === 0) {
            router.replace('/no-project');
            return;
          }
          setProjects(list);

          const groups = list.reduce((acc: { [key: string]: Project[] }, project: Project) => {
            const semester = project.semester || 'Unknown';
            if (!acc[semester]) acc[semester] = [];
            acc[semester].push(project);
            return acc;
          }, {});

          const semesterGroups = Object.keys(groups).map(semester => ({
            semester,
            count: groups[semester].length,
            projects: groups[semester].sort((a: Project, b: Project) => {
              const dateA = new Date(a.createAt || a.updateAt || 0);
              const dateB = new Date(b.createAt || b.updateAt || 0);
              return dateB.getTime() - dateA.getTime();
            })
          })).sort((a: SemesterGroup, b: SemesterGroup) => {
            return getSemesterYear(b.semester) - getSemesterYear(a.semester);
          });
          setSemesterGroups(semesterGroups);
        }
      } catch (e: unknown) {
        const error = e as { response?: { status?: number; data?: { message?: string } } };
        if (error?.response?.status === 404) {
          router.replace('/no-project');
          return;
        }
        setError(error?.response?.data?.message || 'Không thể tải danh sách dự án');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Filter projects based on search term and semester
  const filteredProjects = projects?.filter(project => {
    const matchesSearch = (project.topic?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (project.code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesSemester = selectedSemester === "all" || project.semester === selectedSemester;
    return matchesSearch && matchesSemester;
  }).sort((a, b) => {
    const dateA = new Date(a.createAt || a.updateAt || 0);
    const dateB = new Date(b.createAt || b.updateAt || 0);
    return dateB.getTime() - dateA.getTime();
  }) || [];
  // Handle join project by team code
  const handleJoinProject = async () => {
    if (!teamCode.trim()) {
      setJoinError("Vui lòng nhập mã nhóm");
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      const response = await axiosInstance.post(`/api/team/join/${teamCode.trim()}`);

      setJoinSuccess("Tham gia nhóm thành công!");
      setTeamCode("");

      // Redirect to the project after 2 seconds
      setTimeout(() => {
        const projectId = response.data.data.team.project_id._id;
        router.push(`/projects/${projectId}`);
      }, 2000);

    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      const errorMessage = error?.response?.data?.message || "Không thể tham gia nhóm";
      setJoinError(errorMessage);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCloseJoinDialog = () => {
    setOpenJoinDialog(false);
    setTeamCode("");
    setJoinError(null);
    setJoinSuccess(null);
  };

  // Edit project handlers
  const handleEditProject = async (project: Project) => {
    setEditingProject(project);
    try {
      const res = await axiosInstance.get(`/api/projects/${project._id}`);
      const full = res.data || {};
      setEditForm({
        topic: full.topic || project.topic || '',
        code: full.code || project.code || '',
        description: full.description || project.description || ''
      });
    } catch (e) {
      // Fallback to existing data if detail call fails
      setEditForm({
        topic: project.topic || '',
        code: project.code || '',
        description: project.description || ''
      });
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      setSubmitting(true);
      await axiosInstance.put(`/api/projects/${editingProject._id}`, editForm);

      // Update local state
      setProjects(prev => prev?.map(p => p._id === editingProject._id ? { ...p, ...editForm } : p) || null);
      setEditingProject(null);
      setEditForm({ topic: '', code: '', description: '' });
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      console.error('Lỗi cập nhật dự án:', e);
      alert(error?.response?.data?.message || 'Cập nhật dự án thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete project handlers
  const handleDeleteProject = async () => {
    if (!deletingProject) return;

    try {
      setSubmitting(true);
      await axiosInstance.delete(`/api/projects/${deletingProject._id}`);

      // Update local state
      setProjects(prev => prev?.filter(p => p._id !== deletingProject._id) || null);
      setDeletingProject(null);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      console.error('Lỗi xóa dự án:', e);
      alert(error?.response?.data?.message || 'Xóa dự án thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div id="dashboard" className="min-h-screen bg-white">
        <main className="px-4 py-4 md:px-6 md:py-6 w-full !ml-0">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải dự án...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div id="dashboard" className="min-h-screen bg-white">
        <main className="px-4 py-4 md:px-6 md:py-6 w-full !ml-0">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Có lỗi xảy ra</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Thử lại
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!projects) return null;

  return (
    <div id="dashboard" className="min-h-screen bg-white w-full overflow-x-hidden">
      <main className="px-4 py-4 md:px-6 md:py-6 w-full !ml-0">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Chào mừng trở lại! 👋
              </h1>
              <p className="text-gray-600">
                Quản lý và theo dõi các dự án của bạn một cách dễ dàng
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const existing = await checkAnyExistingProject();
                  if (existing) {
                    setExistingProject(existing);
                    setOpenWarningDialog(true);
                  } else {
                    setOpenJoinDialog(true);
                  }
                }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Tham gia dự án
              </button>
              <button
                onClick={handleCreateProjectClick}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tạo dự án mới
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                  <p className="text-sm text-gray-600">Tổng dự án</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{semesterGroups.length}</p>
                  <p className="text-sm text-gray-600">Kỳ học</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(p => p.status === 'completed' || p.status === 'cancelled').length}
                  </p>
                  <p className="text-sm text-gray-600">Đã hoàn thành</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(isProjectInProgress).length}
                  </p>
                  <p className="text-sm text-gray-600">Đang thực hiện</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search Bar */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm dự án..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
              />
            </div>

            {/* Semester Filter */}
            <div className="md:w-64">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-gray-900 transition-all duration-200"
              >
                <option value="all">Tất cả kỳ học</option>
                {semesterGroups.map((group) => (
                  <option key={group.semester} value={group.semester}>
                    {group.semester} ({group.count} dự án)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Projects by Semester */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || selectedSemester !== "all" ? 'Không tìm thấy dự án' : 'Chưa có dự án nào'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedSemester !== "all" ? 'Thử tìm kiếm với từ khóa khác hoặc chọn kỳ học khác' : 'Hãy tạo dự án đầu tiên của bạn'}
            </p>
            {!searchTerm && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={async () => {
                    const existing = await checkAnyExistingProject();
                    if (existing) {
                      setExistingProject(existing);
                      setOpenWarningDialog(true);
                    } else {
                      setOpenJoinDialog(true);
                    }
                  }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Tham gia dự án
                </button>
                <button
                  onClick={handleCreateProjectClick}
                  className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Tạo dự án đầu tiên
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {selectedSemester === "all" ? (
              // Hiển thị theo từng kỳ học
              semesterGroups.map((group) => (
                <div key={group.semester} className="space-y-4">
                  {/* Semester Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{group.semester}</h2>
                        <p className="text-sm text-gray-600">
                          {group.count} dự án
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Projects Grid for this semester */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.projects
                      .filter(project => {
                        const matchesSearch = (project.topic?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (project.code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
                        return matchesSearch;
                      })
                      .map((project) => (
                        <ProjectCard key={project._id} project={project} onEdit={handleEditProject} router={router} />
                      ))}
                  </div>
                </div>
              ))
            ) : (
              // Hiển thị tất cả projects khi filter
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project._id} project={project} onEdit={handleEditProject} router={router} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[9999] p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative" style={{ zIndex: 10000 }}>
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Chỉnh sửa dự án</h2>
                    <p className="text-gray-600 text-sm">Cập nhật thông tin dự án của bạn</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingProject(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Current Project Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-800">Thông tin hiện tại</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tên dự án:</span>
                    <p className="font-medium text-gray-900">{editingProject.topic}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Mã dự án:</span>
                    <p className="font-medium text-gray-900 font-mono">{editingProject.code}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-600">Mô tả:</span>
                    <p className="font-medium text-gray-900">{editingProject.description || 'Chưa có mô tả'}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateProject} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Tên dự án <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.topic}
                    onChange={(e) => setEditForm(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full px-5 py-4 text-base text-black border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400"
                    placeholder="Nhập tên dự án mới"
                    maxLength={250}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Mã dự án <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-5 py-4 text-base text-black border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400 uppercase tracking-wider font-mono"
                    placeholder="Nhập mã dự án mới"
                    minLength={3}
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Mô tả dự án
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-5 py-4 text-base text-black border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400 resize-none"
                    placeholder="Mô tả dự án mới..."
                    rows={4}
                    maxLength={2000}
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>Mô tả chi tiết về mục tiêu và phạm vi dự án</span>
                    <span>{editForm.description.length}/2000</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="flex-1 px-6 py-4 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    {submitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Đang cập nhật...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Cập nhật dự án</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProject && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[9999] p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative" style={{ zIndex: 10000 }}>
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Xóa dự án</h2>
              <p className="text-gray-600 text-center mb-6">
                Bạn có chắc chắn muốn xóa dự án <strong>&ldquo;{deletingProject.topic}&rdquo;</strong>?
                Hành động này không thể hoàn tác.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingProject(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {submitting ? 'Đang xóa...' : 'Xóa dự án'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Warning Dialog for Existing Project */}
      <Dialog open={openWarningDialog} onClose={() => setOpenWarningDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Không thể {existingProject?.semester === currentSemester ? 'tạo dự án mới' : 'thực hiện thao tác này'}</span>
          </div>
          <IconButton onClick={() => setOpenWarningDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            <Alert severity="warning">
              <Typography variant="body1" className="font-semibold mb-2">
                {existingProject?.semester === currentSemester 
                  ? 'Bạn đã tham gia dự án trong kỳ học hiện tại'
                  : 'Bạn đã tham gia một dự án'}
              </Typography>
              <Typography variant="body2">
                {existingProject?.semester === currentSemester
                  ? 'Mỗi sinh viên chỉ được tham gia 1 dự án duy nhất trong 1 học kỳ.'
                  : 'Mỗi người dùng chỉ được tham gia 1 dự án duy nhất.'}
              </Typography>
            </Alert>

            {existingProject && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Typography variant="subtitle2" className="font-semibold text-blue-900 mb-2">
                  Dự án hiện tại của bạn:
                </Typography>
                <div className="space-y-2">
                  <div>
                    <Typography variant="body2" className="text-gray-600">
                      Tên dự án:
                    </Typography>
                    <Typography variant="body1" className="font-medium text-gray-900">
                      {existingProject.topic}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="body2" className="text-gray-600">
                      Mã dự án:
                    </Typography>
                    <Typography variant="body1" className="font-mono font-medium text-gray-900">
                      {existingProject.code}
                    </Typography>
                  </div>
                  {existingProject.semester && (
                    <div>
                      <Typography variant="body2" className="text-gray-600">
                        Kỳ học:
                      </Typography>
                      <Typography variant="body1" className="font-medium text-gray-900">
                        {existingProject.semester}
                      </Typography>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <Typography variant="body2" color="text.secondary">
                <strong>Lưu ý:</strong> Nếu bạn muốn tạo dự án mới, vui lòng hoàn thành hoặc rời khỏi dự án hiện tại trước.
              </Typography>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWarningDialog(false)}>
            Đóng
          </Button>
          {existingProject && (
            <Button
              onClick={() => {
                setOpenWarningDialog(false);
                router.push(`/projects/${existingProject._id}/details`);
              }}
              variant="contained"
              color="primary"
            >
              Mở dự án hiện tại
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Join Project Dialog */}
      <Dialog open={openJoinDialog} onClose={handleCloseJoinDialog} maxWidth="sm" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GroupIcon className="text-blue-500" />
            <span>Tham gia dự án</span>
          </div>
          <IconButton onClick={handleCloseJoinDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            {/* Success Message */}
            {joinSuccess && (
              <Alert severity="success" onClose={() => setJoinSuccess(null)}>
                {joinSuccess}
                <Typography variant="body2" className="mt-1">
                  Đang chuyển hướng đến dự án...
                </Typography>
              </Alert>
            )}

            {/* Error Message */}
            {joinError && (
              <Alert severity="error" onClose={() => setJoinError(null)}>
                {joinError}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Mã nhóm"
              value={teamCode}
              onChange={(e) => {
                setTeamCode(e.target.value);
                // Clear error when user starts typing
                if (joinError) setJoinError(null);
              }}
              placeholder="Nhập mã nhóm để tham gia dự án"
              required
              disabled={joinLoading}
              helperText="Nhập mã nhóm được chia sẻ bởi trưởng nhóm"
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  letterSpacing: '0.1em'
                }
              }}
            />

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <GroupIcon className="w-4 h-4 mt-0.5 text-blue-500" />
                <div>
                  <Typography variant="body2" color="text.secondary" component="div">
                    <strong>Hướng dẫn:</strong>
                  </Typography>
                  <ul className="mt-1 ml-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <li>• Nhập mã nhóm chính xác để tham gia dự án</li>
                    <li>• Liên hệ trưởng nhóm để lấy mã nhóm</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseJoinDialog} disabled={joinLoading}>
            Hủy
          </Button>
          <Button
            onClick={handleJoinProject}
            variant="contained"
            disabled={!teamCode.trim() || joinLoading}
            startIcon={joinLoading ? <CircularProgress size={16} /> : <LoginIcon />}
          >
            {joinLoading ? "Đang tham gia..." : "Tham gia"}
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
}


