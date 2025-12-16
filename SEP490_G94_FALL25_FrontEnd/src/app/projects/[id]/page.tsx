"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axiosInstance from "../../../../ultis/axios";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

type ProjectDetails = {
  _id: string;
  topic: string;
  code: string;
  description?: string;
  status?: string;
  progress?: number;
  semester?: string;
  createAt?: string;
  updateAt?: string;
  created_by?: {
    _id: string;
    full_name: string;
    email: string;
  };
  lec_id?: {
  _id: string;
    full_name: string;
    email: string;
  };
  approver_id?: {
    _id: string;
    full_name: string;
    email: string;
  };
  type_id?: {
    _id: string;
    name: string;
  };
  dep_id?: {
    _id: string;
    name: string;
  };
  est_effort?: number;
  start_date?: string;
  end_date?: string;
};

type TeamUser = {
  _id: string;
  full_name: string;
  email: string;
  student_id?: string;
  role?: string;
};

type TeamMember = {
  user_id: TeamUser;
  team_leader: number;
};

type TeamMembersResponse = {
  project: {
    _id: string;
    topic: string;
    code: string;
    status?: string;
  };
  team_members: {
    team_id?: string;
    team_name?: string;
    leaders: TeamMember[];
    members: TeamMember[];
    total: number;
  };
  message: string;
};

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMembersResponse | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null;
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!projectId) {
      router.replace('/dashboard');
      return;
    }

    const fetchProjectDetails = async () => {
      try {
      setLoading(true);
        const response = await axiosInstance.get(`/api/projects/${projectId}`);
        setProject(response.data);
      } catch (e: any) {
        console.error('Lỗi tải chi tiết dự án:', e);
        if (e?.response?.status === 404) {
          setError('Không tìm thấy dự án');
        } else {
          setError(e?.response?.data?.message || 'Không thể tải chi tiết dự án');
        }
    } finally {
      setLoading(false);
    }
  };

    const fetchTeamMembers = async () => {
      try {
        setTeamLoading(true);
        const res = await axiosInstance.get(`/api/projects/${projectId}/team-members`);
        setTeam(res.data);
      } catch (e: any) {
        console.error('Lỗi tải team members:', e);
    } finally {
        setTeamLoading(false);
      }
    };

    fetchProjectDetails();
    fetchTeamMembers();
  }, [projectId, router]);

  if (loading) {
  return (
      <div className="min-h-screen bg-white">
      <ResponsiveSidebar />
        <main className="p-4 md:p-6 md:ml-64">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải chi tiết dự án...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
      
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
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.back()}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-white">
   
      <main className="p-4 md:p-6 md:ml-64">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Chi tiết dự án
              </h1>
              <p className="text-gray-600">
                Thông tin đầy đủ về dự án {project.topic}
              </p>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Thông tin cơ bản</h2>
                  <p className="text-gray-600">Chi tiết về dự án</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tên dự án</label>
                  <p className="text-lg text-gray-900">{project.topic}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mã dự án</label>
                  <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full">
                    {project.code}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả</label>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">
                    {project.description || 'Chưa có mô tả'}
                  </p>
                </div>

                {project.progress !== undefined && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tiến độ</label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{project.progress}%</span>
                    </div>
                  </div>
                )}
            </div>
            </div>

            {/* Timeline Information */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Thời gian</h2>
                  <p className="text-gray-600">Lịch trình dự án</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày tạo</label>
                  <p className="text-gray-900">
                    {project.createAt ? new Date(project.createAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Không có thông tin'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cập nhật lần cuối</label>
                  <p className="text-gray-900">
                    {project.updateAt ? new Date(project.updateAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Không có thông tin'}
                  </p>
                </div>

                {project.start_date && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày bắt đầu</label>
                    <p className="text-gray-900">
                      {new Date(project.start_date).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {project.end_date && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày kết thúc</label>
                    <p className="text-gray-900">
                      {new Date(project.end_date).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Information */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-5.523-4.477-10-10-10S-3 12.477-3 18v2h20z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Thành viên</h3>
                  <p className="text-gray-600 text-sm">Đội ngũ dự án</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Team from API */}
                {!teamLoading && team && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">{team.team_members.team_name || 'Nhóm'}</p>
                      <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                        {team.team_members.total} thành viên
                      </span>
                    </div>
                    {team.team_members.leaders.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-800 mb-2">Trưởng nhóm</p>
                        <div className="space-y-2">
                          {team.team_members.leaders.map((m, idx) => (
                            <div key={`leader-${idx}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 10-6 0 3 3 0 006 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{m.user_id?.full_name}</p>
                                <p className="text-xs text-gray-600">{m.user_id?.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {team.team_members.members.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-800 mb-2">Thành viên</p>
                        <div className="space-y-2">
                          {team.team_members.members.map((m, idx) => (
                            <div key={`member-${idx}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 10-6 0 3 3 0 006 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{m.user_id?.full_name}</p>
                                <p className="text-xs text-gray-600">{m.user_id?.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {team.team_members.total === 0 && (
                      <p className="text-sm text-gray-600">Project chưa có team</p>
          )}
        </div>
                )}

                {project.created_by && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
        </div>
                    <div>
                      <p className="font-medium text-gray-900">{project.created_by.full_name}</p>
                      <p className="text-sm text-gray-600">Người tạo dự án</p>
      </div>
                  </div>
                )}

                {project.lec_id && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
        <div>
                      <p className="font-medium text-gray-900">{project.lec_id.full_name}</p>
                      <p className="text-sm text-gray-600">Giảng viên hướng dẫn</p>
        </div>
      </div>
                )}

                {project.approver_id && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{project.approver_id.full_name}</p>
                      <p className="text-sm text-gray-600">Người phê duyệt</p>
                    </div>
                  </div>
      )}
    </div>
            </div>

            {/* Project Information */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Thông tin khác</h3>
                  <p className="text-gray-600 text-sm">Chi tiết bổ sung</p>
                </div>
              </div>

              <div className="space-y-4">
                {project.semester && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Học kì</label>
                    <p className="text-gray-900">{project.semester}</p>
                  </div>
                )}

                {project.dep_id && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Khoa</label>
                    <p className="text-gray-900">{project.dep_id.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Hành động</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Quản lý dự án
                </button>
                
                <button
                  onClick={() => router.back()}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
