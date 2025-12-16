"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import axiosInstance from "../../../../../../../ultis/axios";
import SupervisorSidebar from "@/components/SupervisorSidebar";
import QuickNav from "@/components/QuickNav";
import TaskDetailsModal from "@/components/TaskDetailsModal";

export default function ContributorDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId");
  // Ensure userId is a clean string (searchParams.get always returns string | null)
  const userId = userIdParam ? userIdParam.trim() : null;
  // Lấy projectId từ route parameter [id] hoặc từ query string (fallback)
  const projectId = (params?.id as string) || searchParams.get("project_id") || undefined;

  type TaskItem = {
    _id: string;
    title: string;
    feature_id?: { _id: string; title: string; project_id: string };
    assigner_id?: { _id: string; full_name: string; email: string };
    assignee_id?: { _id: string; full_name: string; email: string };
    deadline?: string;
    status?: string | { _id: string; name: string };
    description?: string;
    updateAt?: string;
    priority?: string | { _id: string; name: string };
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [features, setFeatures] = useState<Array<{ _id: string; title: string }>>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [featureFilter, setFeatureFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Task details modal state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [openTaskDetails, setOpenTaskDetails] = useState(false);

  const openTaskDetailsModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setOpenTaskDetails(true);
  };

  useEffect(() => {
    if (!userId) {
      setError("Missing userId");
      setLoading(false);
      return;
    }
    if (!projectId) {
      setError("Missing projectId");
      setLoading(false);
      return;
    }
    
    (async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Fetch tasks using the correct endpoint
        const res = await axiosInstance.get(`/api/users/${userId}/projects/${projectId}/tasks`);
        const data = res.data;
        console.log("data", data)
        setTasks(Array.isArray(data?.tasks) ? data.tasks : []);

        // Fetch features if projectId exists
        if (projectId) {
          try {
            const featuresRes = await axiosInstance.get(`/api/features/project/${projectId}`);
            const featuresData = Array.isArray(featuresRes.data) ? featuresRes.data : [];
            setFeatures(featuresData.map((f: any) => ({ _id: f._id, title: f.title })));
          } catch (e: any) {
            console.error('Error fetching features:', e);
            // Don't set error for features, just continue without feature filter
            setFeatures([]);
          }
        } else {
          setFeatures([]);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, projectId]);

  // Normalize status name to handle various formats (To Do, Doing, Done, etc.)
  const normalizeStatus = (status: string | undefined): string => {
    if (!status) return "";
    // First, trim and normalize whitespace
    const trimmed = String(status).trim();
    const normalized = trimmed.toLowerCase();
    
    // Handle exact matches first
    if (normalized === "to do" || normalized === "todo") return "to-do";
    if (normalized === "doing" || normalized === "in progress" || normalized === "in-progress" || normalized === "inprogress") return "doing";
    if (normalized === "done" || normalized === "completed" || normalized === "complete") return "done";
    
    // Handle common variations
    if (normalized.includes("todo") || normalized.includes("to do") || normalized.includes("pending") || normalized.includes("planning")) return "to-do";
    if (normalized.includes("doing") || normalized.includes("progress")) return "doing";
    if (normalized.includes("done") || normalized.includes("completed") || normalized.includes("complete")) return "done";
    
    return normalized;
  };

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const matchesQ = q
        ? (t.title?.toLowerCase().includes(q.toLowerCase()) || t.description?.toLowerCase().includes(q.toLowerCase()))
        : true;
      
      const taskStatus = typeof t.status === "object" ? t.status?.name : t.status;
      let matchesStatus = true;
      if (status !== "all") {
        const normalizedTaskStatus = normalizeStatus(taskStatus);
        const normalizedFilterStatus = normalizeStatus(status);
        matchesStatus = normalizedTaskStatus === normalizedFilterStatus;
      }
      
      // Handle feature filter - support both object and string formats
      let matchesFeature = true;
      if (featureFilter !== "all") {
        if (typeof t.feature_id === "object" && t.feature_id !== null) {
          matchesFeature = t.feature_id._id === featureFilter;
        } else if (typeof t.feature_id === "string") {
          matchesFeature = t.feature_id === featureFilter;
        } else {
          matchesFeature = false;
        }
      }
      
      return matchesQ && matchesStatus && matchesFeature;
    });
  }, [tasks, q, status, featureFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [q, status, featureFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = filtered.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Calculate statistics
  const totalTasks = tasks.length;
  const todoCount = tasks.filter(t => {
    const taskStatus = typeof t.status === "object" ? t.status?.name : t.status;
    return normalizeStatus(taskStatus) === "to-do";
  }).length;
  const doingCount = tasks.filter(t => {
    const taskStatus = typeof t.status === "object" ? t.status?.name : t.status;
    return normalizeStatus(taskStatus) === "doing";
  }).length;
  const doneCount = tasks.filter(t => {
    const taskStatus = typeof t.status === "object" ? t.status?.name : t.status;
    return normalizeStatus(taskStatus) === "done";
  }).length;
  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  // Get user info from first task
  const contributorName = tasks[0]?.assignee_id?.full_name || "Thành viên";
  const contributorEmail = tasks[0]?.assignee_id?.email || "";
  const avatarText = contributorName ? contributorName.charAt(0).toUpperCase() : "U";

  // Get status color
  const getStatusColor = (status: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "done") return "bg-green-100 text-green-700";
    if (normalized === "doing") return "bg-blue-100 text-blue-700";
    if (normalized === "to-do") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-700";
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const priorityLower = priority.toLowerCase();
    if (priorityLower.includes("high") || priorityLower.includes("urgent")) return "bg-red-100 text-red-700";
    if (priorityLower.includes("medium") || priorityLower.includes("normal")) return "bg-amber-100 text-amber-700";
    if (priorityLower.includes("low")) return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  // Translate status to Vietnamese
  const getStatusLabel = (status: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "to-do") return "To Do";
    if (normalized === "doing") return "Doing";
    if (normalized === "done") return "Done";
    return status || "Chưa xác định";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <SupervisorSidebar />
        <main className="p-4 md:p-6 md:ml-64">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải dữ liệu...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <SupervisorSidebar />
        <main className="p-4 md:p-6 md:ml-64">
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
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Thử lại
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <SupervisorSidebar />
      <main className="p-4 md:p-6 md:ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-6">
              <Link 
                href={`/supervisor/contributor${projectId ? `?project_id=${projectId}` : ''}`} 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Quay lại Dashboard</span>
              </Link>
            </div>

            {/* QuickNav - Always at the top */}
            <div className="mb-6">
              <QuickNav selectedProject={projectId} />
            </div>

            {/* User Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                  {avatarText}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{contributorName}</h1>
                  {contributorEmail && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-lg">{contributorEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-200 text-sm mb-1">Tổng Task</p>
                    <p className="text-4xl font-bold">{totalTasks}</p>
                  </div>
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-slate-200">Tổng số công việc</p>
              </div>

              <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-amber-200 text-sm mb-1">To Do</p>
                    <p className="text-4xl font-bold">{todoCount}</p>
                  </div>
                  <svg className="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <p className="text-sm text-amber-200">Tasks cần làm</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-blue-200 text-sm mb-1">Doing</p>
                    <p className="text-4xl font-bold">{doingCount}</p>
                  </div>
                  <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-blue-200">Tasks đang thực hiện</p>
              </div>

              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-green-200 text-sm mb-1">Done</p>
                    <p className="text-4xl font-bold">{doneCount}</p>
                  </div>
                  <svg className="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-green-200">{completionRate}% tỷ lệ hoàn thành</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm theo tiêu đề hoặc mô tả..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="To Do">To Do</option>
                <option value="Doing">Doing</option>
                <option value="Done">Done</option>
              </select>
              {projectId && features.length > 0 && (
                <select
                  value={featureFilter}
                  onChange={(e) => setFeatureFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="all">Tất cả tính năng</option>
                  {features.map((feature) => (
                    <option key={feature._id} value={feature._id}>
                      {feature.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Tasks List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Danh sách Tasks ({filtered.length})</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Hiển thị:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có task phù hợp</h3>
                <p className="text-gray-600">Thử thay đổi bộ lọc để tìm kiếm task khác</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {paginatedTasks.map((task) => {
                    const taskStatus = typeof task.status === "object" ? task.status?.name : task.status || "Unknown";
                    const taskPriority = typeof task.priority === "object" ? task.priority?.name : task.priority || "";
                    
                    return (
                      <div
                        key={task._id}
                        onClick={() => openTaskDetailsModal(task._id)}
                        className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{task.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                              {task.feature_id?.title && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                  📋 {task.feature_id.title}
                                </span>
                              )}
                              {taskPriority && (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(taskPriority)}`}>
                                  ⚡ {taskPriority}
                                </span>
                              )}
                              {taskStatus && (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(taskStatus)}`}>
                                  {getStatusLabel(taskStatus)}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              {task.assigner_id?.full_name && (
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span>Giao bởi: <span className="font-medium">{task.assigner_id.full_name}</span></span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right text-sm text-gray-600 space-y-2">
                            {task.deadline && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">{new Date(task.deadline).toLocaleDateString("vi-VN")}</span>
                              </div>
                            )}
                            {task.updateAt && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Cập nhật: {new Date(task.updateAt).toLocaleDateString("vi-VN")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-600">
                        Hiển thị {startIndex + 1} - {Math.min(endIndex, filtered.length)} trong tổng số {filtered.length} tasks
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`px-3 py-2 rounded-lg border transition-all ${
                            currentPage === 1
                              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-purple-500"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <div className="flex items-center gap-1 flex-wrap justify-center">
                          {(() => {
                            // Hiển thị tất cả nếu <= 10 trang, nếu nhiều hơn thì hiển thị các trang xung quanh
                            let pagesToShow: number[];
                            if (totalPages <= 10) {
                              pagesToShow = Array.from({ length: totalPages }, (_, i) => i + 1);
                            } else {
                              // Hiển thị trang đầu, trang cuối, và các trang xung quanh trang hiện tại
                              const startPage = Math.max(1, currentPage - 2);
                              const endPage = Math.min(totalPages, currentPage + 2);
                              pagesToShow = [];
                              
                              // Thêm trang 1 nếu không nằm trong khoảng
                              if (startPage > 1) {
                                pagesToShow.push(1);
                                if (startPage > 2) pagesToShow.push(-1); // -1 là dấu hiệu cho ellipsis
                              }
                              
                              // Thêm các trang trong khoảng
                              for (let i = startPage; i <= endPage; i++) {
                                pagesToShow.push(i);
                              }
                              
                              // Thêm trang cuối nếu không nằm trong khoảng
                              if (endPage < totalPages) {
                                if (endPage < totalPages - 1) pagesToShow.push(-1); // -1 là dấu hiệu cho ellipsis
                                pagesToShow.push(totalPages);
                              }
                            }
                            
                            return pagesToShow.map((page, index) => {
                              if (page === -1) {
                                return (
                                  <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                                    ...
                                  </span>
                                );
                              }
                              return (
                                <button
                                  key={page}
                                  onClick={() => handlePageChange(page)}
                                  className={`min-w-[40px] px-3 py-2 rounded-lg border transition-all ${
                                    currentPage === page
                                      ? "bg-purple-500 text-white border-purple-500 font-medium"
                                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-purple-500"
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-2 rounded-lg border transition-all ${
                            currentPage === totalPages
                              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-purple-500"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Task Details Modal */}
          {selectedTaskId && (
            <TaskDetailsModal
              open={openTaskDetails}
              onClose={() => {
                setOpenTaskDetails(false);
                setSelectedTaskId(null);
              }}
              taskId={selectedTaskId}
              projectId={projectId}
              onUpdate={() => {
                // Reload tasks if needed
                if (userId && projectId) {
                  (async () => {
                    try {
                      setError(null);
                      setLoading(true);
                      const res = await axiosInstance.get(`/api/tasks/users/${userId}/projects/${projectId}/tasks`);
                      const data = res.data;
                      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
                    } catch (e: any) {
                      setError(e?.response?.data?.message || "Failed to load tasks");
                    } finally {
                      setLoading(false);
                    }
                  })();
                }
              }}
              readonly={true}
            />
          )}
        </div>
      </main>
    </div>
  );
}
