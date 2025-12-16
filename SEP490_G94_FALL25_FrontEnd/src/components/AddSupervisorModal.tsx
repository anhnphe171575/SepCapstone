"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import axiosInstance from "../../ultis/axios";
import { X, Search, User, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Lecturer {
  _id: string;
  full_name: string;
  email: string;
  code?: string;
  phone?: string;
  avatar?: string;
}

interface AddSupervisorModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  currentSupervisor?: {
    _id: string;
    full_name: string;
    email: string;
  } | null;
  onSuccess?: () => void;
}

export default function AddSupervisorModal({
  open,
  onClose,
  projectId,
  currentSupervisor,
  onSuccess,
}: AddSupervisorModalProps) {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLecturer, setSelectedLecturer] = useState<Lecturer | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingLecturers, setFetchingLecturers] = useState(false);

  const fetchLecturers = useCallback(async (search: string = "") => {
    try {
      setFetchingLecturers(true);
      const response = await axiosInstance.get("/api/users/lecturers", {
        params: search ? { search } : {},
      });
      
      let fetchedLecturers = [];
      if (response.data && response.data.success) {
        fetchedLecturers = response.data.data || [];
      } else {
        // Fallback if response structure is different
        fetchedLecturers = response.data?.data || response.data || [];
      }
      
      // Filter out current supervisor from the list
      if (currentSupervisor && currentSupervisor._id) {
        const currentSupervisorId = String(currentSupervisor._id);
        fetchedLecturers = fetchedLecturers.filter(
          (lecturer: Lecturer) => String(lecturer._id) !== currentSupervisorId
        );
      }
      
      setLecturers(fetchedLecturers);
    } catch (error: any) {
      console.error("Error fetching lecturers:", error);
      toast.error("Không thể tải danh sách giảng viên", {
        description: error?.response?.data?.message || error?.message || "Vui lòng thử lại sau",
      });
      setLecturers([]); // Set empty array on error
    } finally {
      setFetchingLecturers(false);
    }
  }, [currentSupervisor]);

  useEffect(() => {
    if (open) {
      // Small delay on initial open to prevent flickering
      const timeoutId = setTimeout(() => {
        fetchLecturers("");
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      // Reset when modal closes
      setLecturers([]);
      setSearchTerm("");
      setSelectedLecturer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounce search - only when searchTerm changes
  useEffect(() => {
    if (!open) return;
    
    // Don't show loading for initial load or when search is empty
    if (searchTerm === "") {
      fetchLecturers("");
      return;
    }
    
    const timeoutId = setTimeout(() => {
      fetchLecturers(searchTerm);
    }, 800); // Debounce 800ms to reduce flickering when typing

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, open]);

  const handleSave = async () => {
    if (!selectedLecturer) {
      toast.error("Vui lòng chọn giảng viên");
      return;
    }

    try {
      setSaving(true);
      const response = await axiosInstance.patch(
        `/api/projects/${projectId}/supervisor`,
        { supervisor_id: selectedLecturer._id }
      );

      if (response.data && response.data.success) {
        toast.success(response.data.message || "Đã thêm giám sát viên thành công");
        
        // Reset selection first to avoid flickering
        setSelectedLecturer(null);
        setSearchTerm("");
        
        // Wait before refreshing to avoid flickering
        setTimeout(() => {
          // Refresh projects list in parent component
          if (onSuccess) {
            onSuccess();
          }
          
          // Wait more before refreshing lecturers list to ensure parent has updated
          setTimeout(() => {
            fetchLecturers("");
          }, 400);
        }, 200);
      } else {
        throw new Error(response.data?.message || "Không thể thêm giám sát viên");
      }
    } catch (error: any) {
      toast.error("Không thể thêm giám sát viên", {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Bạn có chắc muốn xóa giám sát viên khỏi dự án này?")) {
      return;
    }

    try {
      setSaving(true);
      const response = await axiosInstance.patch(
        `/api/projects/${projectId}/supervisor`,
        { supervisor_id: null },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        toast.success(response.data.message || "Đã xóa giám sát viên thành công");
        
        // Reset first to avoid flickering
        setSelectedLecturer(null);
        setSearchTerm("");
        
        // Wait before refreshing to avoid flickering
        setTimeout(() => {
          // Refresh projects list in parent component
          if (onSuccess) {
            onSuccess();
          }
          
          // Wait more before refreshing lecturers list to ensure parent has updated
          setTimeout(() => {
            fetchLecturers("");
          }, 400);
        }, 200);
      } else {
        throw new Error(response.data?.message || "Không thể xóa giám sát viên");
      }
    } catch (error: any) {
      console.error("Error removing supervisor:", error);
      toast.error("Không thể xóa giám sát viên", {
        description: error?.response?.data?.message || error?.message || "Vui lòng thử lại sau",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ willChange: 'auto' }}>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-6 py-5 flex items-center justify-between border-b border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Thêm giám sát viên</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Current Supervisor */}
          {currentSupervisor && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {currentSupervisor.full_name?.[0]?.toUpperCase() || "G"}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{currentSupervisor.full_name}</p>
                    <p className="text-sm text-gray-600">{currentSupervisor.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleRemove}
                  disabled={saving}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition disabled:opacity-50"
                >
                  {saving ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm giảng viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Lecturers List */}
          {fetchingLecturers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : lecturers.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Không tìm thấy giảng viên nào</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {lecturers.map((lecturer) => (
                <div
                  key={lecturer._id}
                  onClick={() => setSelectedLecturer(lecturer)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedLecturer?._id === lecturer._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                        {lecturer.avatar ? (
                          <img
                            src={lecturer.avatar}
                            alt={lecturer.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          lecturer.full_name?.[0]?.toUpperCase() || "G"
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{lecturer.full_name}</p>
                        <p className="text-sm text-gray-600">{lecturer.email}</p>
                        {lecturer.code && (
                          <p className="text-xs text-gray-500">Mã: {lecturer.code}</p>
                        )}
                      </div>
                    </div>
                    {selectedLecturer?._id === lecturer._id && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-all duration-200"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedLecturer || saving || !!currentSupervisor}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-95"
          >
            {saving ? "Đang lưu..." : currentSupervisor ? "Đã có giám sát viên" : "Thêm"}
          </button>
        </div>
      </div>
    </div>
  );
}

