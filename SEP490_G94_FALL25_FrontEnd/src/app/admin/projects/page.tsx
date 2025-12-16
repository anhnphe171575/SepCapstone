"use client";

import { useEffect, useState } from "react";
import axiosInstance from "../../../../ultis/axios";
import LeftSidebarHeader from "../dashboard-admin/herder";
import AddSupervisorModal from "@/components/AddSupervisorModal";
import { Search, UserPlus, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Project {
  _id: string;
  topic: string;
  code: string;
  description?: string;
  semester: string;
  created_by?: {
    _id: string;
    full_name: string;
    email: string;
  };
  supervisor_id?: {
    _id: string;
    full_name: string;
    email: string;
  } | null;
  createAt?: string;
  updateAt?: string;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [openSupervisorModal, setOpenSupervisorModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/projects/all");
      if (response.data.projects) {
        setProjects(response.data.projects);
      }
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast.error("Không thể tải danh sách dự án", {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSupervisorModal = (project: Project) => {
    setSelectedProject(project);
    setOpenSupervisorModal(true);
  };

  const handleCloseSupervisorModal = () => {
    setOpenSupervisorModal(false);
    setSelectedProject(null);
  };

  const handleSupervisorSuccess = async () => {
    // Refresh projects list
    await fetchProjects();
    // Update selected project with new supervisor data
    if (selectedProject) {
      const updatedProjects = await axiosInstance.get("/api/projects/all");
      if (updatedProjects.data.projects) {
        const updatedProject = updatedProjects.data.projects.find(
          (p: Project) => p._id === selectedProject._id
        );
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      }
    }
    // Don't close modal - let user decide when to close
  };

  const filteredProjects = projects.filter((project) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      project.topic?.toLowerCase().includes(searchLower) ||
      project.code?.toLowerCase().includes(searchLower) ||
      project.created_by?.full_name?.toLowerCase().includes(searchLower) ||
      project.supervisor_id?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <LeftSidebarHeader />
        <main className="flex-1 ml-64 p-6 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Đang tải danh sách dự án...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <LeftSidebarHeader />
      <main className="flex-1 ml-64 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý dự án</h1>
          <p className="text-gray-600">Quản lý và thêm giám sát viên cho các dự án</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án theo tên, mã, người tạo hoặc giám sát viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Không tìm thấy dự án nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project._id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{project.topic}</h3>
                        <p className="text-sm text-gray-500">Mã: {project.code}</p>
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {project.created_by && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Người tạo:</span>
                          <span className="text-sm text-gray-900">{project.created_by.full_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Học kỳ:</span>
                        <span className="text-sm text-gray-900">{project.semester}</span>
                      </div>
                    </div>

                    {/* Supervisor Info */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            {project.supervisor_id ? (
                              <>
                                <p className="font-semibold text-gray-900">
                                  {project.supervisor_id.full_name}
                                </p>
                                <p className="text-sm text-gray-600">{project.supervisor_id.email}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-gray-500">Chưa có giám sát viên</p>
                                <p className="text-xs text-gray-400">Nhấn nút bên cạnh để thêm</p>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenSupervisorModal(project)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all duration-200 flex items-center gap-2 hover:shadow-md active:scale-95"
                        >
                          <UserPlus className="w-4 h-4" />
                          {project.supervisor_id ? "Thay đổi" : "Thêm"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Tổng số dự án</p>
            <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Đã có giám sát viên</p>
            <p className="text-2xl font-bold text-green-600">
              {projects.filter((p) => p.supervisor_id).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Chưa có giám sát viên</p>
            <p className="text-2xl font-bold text-orange-600">
              {projects.filter((p) => !p.supervisor_id).length}
            </p>
          </div>
        </div>
      </main>

      {/* Add Supervisor Modal */}
      {selectedProject && (
        <AddSupervisorModal
          open={openSupervisorModal}
          onClose={handleCloseSupervisorModal}
          projectId={selectedProject._id}
          currentSupervisor={
            selectedProject.supervisor_id && 
            typeof selectedProject.supervisor_id === 'object' &&
            selectedProject.supervisor_id._id &&
            selectedProject.supervisor_id.full_name
              ? {
                  _id: String(selectedProject.supervisor_id._id),
                  full_name: String(selectedProject.supervisor_id.full_name),
                  email: String(selectedProject.supervisor_id.email || '')
                }
              : null
          }
          onSuccess={handleSupervisorSuccess}
        />
      )}
    </div>
  );
}

