"use client";

import { useEffect, useRef, useState } from "react";
import axiosInstance from "../../../../ultis/axios";
import LeftSidebarHeader from "../dashboard-admin/herder";
import { ChevronDown, AlertCircle, Edit, Trash2, UploadCloud, Download, FileDown, User as UserIcon } from 'lucide-react';
import EditUserModal from './edit';
import { User, EditUserForm } from './edit';
import UserDetailModal from './detail';

interface ApiResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      total: number;
      page: number;
      totalPages: number;
      limit: number;
    };
  };
}

interface ImportReport {
  inserted: number;
  skipped: number;
  duplicates: number;
  errors: { row: number; message: string }[];
  totalRows: number;
  defaultPasswordHint: string;
}

const roleOptions = [
  { value: "all", label: "Tất cả vai trò" },
  { value: "8", label: "Admin" },
  { value: "4", label: "Giám sát viên" },
  { value: "1", label: "Sinh viên" }
];

const ROLE_VALUES = {
  ADMIN_DEVELOPER: 0,
  ADMIN: 8,
  SUPERVISOR: 4,
  STUDENT: 1,
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get<ApiResponse>("/api/users/all", {
        params: {
          page: currentPage,
          limit: 10,
          search: search || undefined,
          role: roleFilter === "all" ? undefined : Number(roleFilter),
        },
      });
      
      if (response.data.success) {
        setUsers(response.data.data.users);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tải danh sách người dùng");
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, search, roleFilter]);

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;

    try {
      setDeleteLoading(id);
      const response = await axiosInstance.delete(`/api/user/delete/${id}`);
      if (response.data.success) {
        setUsers(users.filter(user => user._id !== id));
        alert("Xóa người dùng thành công!");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Không thể xóa người dùng");
      console.error("Delete error:", err);
    } finally {
      setDeleteLoading(null);
      await fetchUsers();
    }
  };
  
  const handleEditSubmit = async (formData: EditUserForm) => {
    if (!editingUser) return;

    try {
      setEditLoading(true);
      const response = await axiosInstance.put(`/api/users/update/${editingUser._id}`, formData);

      if (response.data.success) {
        await fetchUsers();
        setEditingUser(null);
        alert("Cập nhật thông tin thành công!");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Không thể cập nhật thông tin người dùng");
      console.error("Update error:", err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleTriggerImport = () => {
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setImportError("Vui lòng chọn file Excel (.xls hoặc .xlsx)");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setImporting(true);
      setImportError(null);
      const response = await axiosInstance.post("/api/users/import-lecturers", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchUsers();
      
      // Show message with errors if any
      const message = response.data.message || "Import thành công";
      if (response.data.data?.errors?.length > 0 || response.data.data?.teamErrors?.length > 0) {
        alert(message);
      } else {
        alert(message);
      }
      
      // Clear import report to hide detailed report section
      setImportReport(null);
    } catch (importErr: any) {
      const message = importErr.response?.data?.message || "Không thể import file Excel";
      setImportError(message);
      console.error("Import lecturers error:", importErr);
    } finally {
      setImporting(false);
    }
  };

  const handleExportUsers = async () => {
    try {
      setExporting(true);
      const response = await axiosInstance.get("/api/users/export", {
        params: {
          role: roleFilter === "all" ? undefined : Number(roleFilter),
          search: search || undefined,
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `users-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportErr: any) {
      alert(exportErr.response?.data?.message || "Không thể export danh sách người dùng");
      console.error("Export users error:", exportErr);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const response = await axiosInstance.get("/api/users/import-lecturers/template", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "template-import-giang-vien.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (templateErr: any) {
      alert(templateErr.response?.data?.message || "Không thể tải template");
      console.error("Download template error:", templateErr);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const getRoleName = (role: number) => {
    switch (role) {
      case ROLE_VALUES.ADMIN_DEVELOPER: return "Admin Developer";
      case ROLE_VALUES.ADMIN: return "Admin";
      case ROLE_VALUES.SUPERVISOR: return "Giám sát viên";
      case ROLE_VALUES.STUDENT: return "Sinh viên";
      default: return "Không xác định";
    }
  };

  const getRoleColor = (role: number) => {
    switch (role) {
      case ROLE_VALUES.ADMIN_DEVELOPER:
      case ROLE_VALUES.ADMIN:
        return "bg-purple-100 text-purple-800";
      case ROLE_VALUES.SUPERVISOR:
        return "bg-green-100 text-green-800";
      case ROLE_VALUES.STUDENT:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderUserRow = (user: User) => (
    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold bg-blue-500 w-full h-full flex items-center justify-center">
                {user.full_name?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{user.full_name}</div>
            <div className="text-xs text-gray-500">{user._id}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
          {getRoleName(user.role)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.phone || "N/A"}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
        <button 
          className="inline-flex items-center px-3 py-1 rounded transition bg-green-100 text-green-700 hover:bg-green-200"
          onClick={() => setViewingUserId(user._id)}
        >
          <UserIcon className="w-4 h-4 mr-1" />
          Chi tiết
        </button>
        <button 
          className={`inline-flex items-center px-3 py-1 rounded transition ${
            user.role === ROLE_VALUES.ADMIN_DEVELOPER 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
          onClick={() => setEditingUser(user)}
          disabled={user.role === ROLE_VALUES.ADMIN_DEVELOPER}
        >
          <Edit className="w-4 h-4 mr-1" />
          Sửa
        </button>
        <button
          className={`inline-flex items-center px-3 py-1 rounded transition ${
            user.role === ROLE_VALUES.ADMIN_DEVELOPER 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
          onClick={() => handleDeleteUser(user._id)}
          disabled={user.role === ROLE_VALUES.ADMIN_DEVELOPER || deleteLoading === user._id}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {deleteLoading === user._id ? 'Đang xóa...' : 'Xóa'}
        </button>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      <LeftSidebarHeader />
      
      <main className="flex-1 ml-64 p-6">
        {/* Header and Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
                  downloadingTemplate 
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                    : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                }`}
              >
                <FileDown className="w-4 h-4" />
                {downloadingTemplate ? "Đang tải..." : "Tải template"}
              </button>
              <button
                onClick={handleTriggerImport}
                disabled={importing}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
                  importing ? "bg-gray-200 text-gray-500" : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                {importing ? "Đang import..." : "Import người dùng"}
              </button>
              <button
                onClick={handleExportUsers}
                disabled={exporting}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white ${
                  exporting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <Download className="w-4 h-4" />
                {exporting ? "Đang export..." : "Xuất Excel"}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none w-full md:w-48 px-4 py-2 bg-white border rounded-lg shadow-sm 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 pr-10"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {importError && (
          <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5" />
            <p>{importError}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* User Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người dùng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số điện thoại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tham gia
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(renderUserRow)}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-4 py-2 rounded-lg border ${
                      currentPage === i + 1
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {importReport && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Kết quả import người dùng</h2>
                <p className="text-sm text-gray-500">{importReport.defaultPasswordHint}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">Tạo mới</p>
                  <p className="text-xl font-semibold text-green-600">{importReport.inserted}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">Bỏ qua</p>
                  <p className="text-xl font-semibold text-yellow-600">{importReport.skipped}</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">Trùng email</p>
                  <p className="text-xl font-semibold text-orange-600">{importReport.duplicates}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">Tổng dòng</p>
                  <p className="text-xl font-semibold text-blue-600">{importReport.totalRows}</p>
                </div>
              </div>
            </div>

            {importReport.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Các dòng lỗi</h3>
                <ul className="space-y-1 max-h-48 overflow-y-auto text-sm text-gray-600">
                  {importReport.errors.slice(0, 5).map((errItem, idx) => (
                    <li key={`${errItem.row}-${idx}`} className="flex items-start gap-2">
                      <span className="font-medium text-gray-800">Dòng {errItem.row}:</span>
                      <span>{errItem.message}</span>
                    </li>
                  ))}
                  {importReport.errors.length > 5 && (
                    <li className="text-gray-500 italic">
                      Còn {importReport.errors.length - 5} lỗi khác...
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={handleEditSubmit}
          loading={editLoading}
        />

        {/* User Detail Modal */}
        {viewingUserId && (
          <UserDetailModal
            userId={viewingUserId}
            onClose={() => setViewingUserId(null)}
          />
        )}

        <input
          type="file"
          accept=".xls,.xlsx"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImportFileChange}
        />
      </main>
    </div>
  );
}