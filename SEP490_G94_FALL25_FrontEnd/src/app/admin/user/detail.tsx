"use client";

import { useEffect, useState } from "react";
import axiosInstance from "../../../../ultis/axios";
import { X, User as UserIcon, Mail, Phone, Calendar, MapPin, Briefcase, Code, Award, CheckCircle, AlertCircle, Users, FolderOpen } from "lucide-react";

interface UserDetailData {
  user: {
    _id: string;
    full_name: string;
    email: string;
    phone: string;
    dob: string;
    major?: string;
    code?: string;
    role: number;
    role_name: string;
    avatar?: string;
    address?: Array<{
      street: string;
      city: string;
      postalCode: string;
      contry: string;
    }>;
    verified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  projects: Array<{
    project_id: string;
    project_name: string;
    project_description?: string;
    project_semester?: string;
    role: string;
  }>;
}

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
}

export default function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get(`/api/users/${userId}/detail`);
        if (response.data.success) {
          setData(response.data.data);
        } else {
          setError("Không thể tải thông tin người dùng");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Không thể tải thông tin người dùng");
        console.error("Fetch user detail error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserDetail();
    }
  }, [userId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };


  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center text-red-500 mb-4">
            <AlertCircle className="w-12 h-12" />
          </div>
          <p className="text-center text-gray-600 mb-4">{error || "Không tìm thấy thông tin"}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  const { user, projects = [] } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay - transparent with backdrop blur only */}
      <div 
        className="fixed inset-0 bg-transparent backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Popup Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-6 py-5 flex items-center justify-between border-b border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Chi tiết người dùng</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="bg-gradient-to-b from-gray-50 to-white p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {/* User Info Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.full_name?.[0]?.toUpperCase() || "U"
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">{user.full_name}</h3>
                    {user.verified && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Đã xác thực
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{user.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(user.dob)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Award className="w-4 h-4" />
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                        {user.role_name}
                      </span>
                    </div>
                    {user.code && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Code className="w-4 h-4" />
                        <span>{user.code}</span>
                      </div>
                    )}
                    {user.major && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Briefcase className="w-4 h-4" />
                        <span>{user.major}</span>
                      </div>
                    )}
                  </div>
                  {user.address && user.address.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-start gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 mt-1" />
                        <div>
                          {user.address.map((addr, idx) => (
                            <div key={idx} className="mb-1">
                              {addr.street}, {addr.city}, {addr.postalCode}, {addr.contry}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Projects List */}
            {projects && projects.length > 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Dự án tham gia ({projects.length})
                </h4>
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div key={project.project_id || `project-${project.project_name}`} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 text-lg mb-1">{project.project_name || "N/A"}</h5>
                          {project.project_description && (
                            <p className="text-sm text-gray-600 mb-2">{project.project_description}</p>
                          )}
                          {project.project_semester && (
                            <div className="flex items-center gap-3 flex-wrap mt-2">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                                Học kỳ: {project.project_semester}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded whitespace-nowrap ml-4">
                          Vai trò: {project.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Người dùng chưa tham gia dự án nào</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-all duration-200 hover:shadow-md active:scale-95"
            >
              Đóng
            </button>
          </div>
        </div>
    </div>
  );
}

