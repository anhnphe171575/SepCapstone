"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "../../../ultis/axios";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại");
      return false;
    }
    if (!formData.newPassword) {
      setError("Vui lòng nhập mật khẩu mới");
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return false;
    }
    if (formData.currentPassword === formData.newPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      await axiosInstance.put("/api/auth/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setSuccess(true);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => {
        router.push("/myprofile");
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Thay đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 py-4 px-4 sm:py-6 sm:px-6 lg:py-8">
        <div className="w-full max-w-md bg-white/80 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-white/30 p-6 sm:p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900 text-center">
            Thay đổi mật khẩu thành công!
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4 text-center">
            Mật khẩu của bạn đã được cập nhật thành công.
          </p>
          <p className="text-xs sm:text-sm text-gray-500 text-center">
            Đang chuyển hướng về trang hồ sơ...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 py-4 px-4 sm:py-6 sm:px-6 lg:py-8">
      <div className="w-full max-w-md bg-white/80 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-white/30 p-6 sm:p-8 relative overflow-hidden">
        {/* Hiệu ứng ánh sáng cam */}
        <div className="absolute -top-8 -left-8 w-40 h-40 bg-gradient-to-br from-orange-300 via-orange-100 to-transparent rounded-full opacity-20 blur-2xl pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gradient-to-tr from-orange-400 via-orange-200 to-transparent rounded-full opacity-15 blur-2xl pointer-events-none animate-pulse"></div>
        
        <div className="w-full flex justify-center mb-6 relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Thay đổi mật khẩu
          </h1>
        </div>
        
        <div className="relative z-10">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="currentPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                Mật khẩu hiện tại <span className="text-red-500">*</span>
              </label>
              <input
                id="currentPassword"
                type="password"
                required
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors text-gray-900"
                placeholder="Nhập mật khẩu hiện tại"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                Mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors text-gray-900"
                placeholder="Nhập mật khẩu mới"
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Mật khẩu phải có ít nhất 6 ký tự
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                Xác nhận mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors text-gray-900"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-sm sm:text-base shadow-sm hover:shadow transition-all duration-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xử lý..." : "Thay đổi mật khẩu"}
              </button>
            </div>
          </form>

          <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Lưu ý:</h3>
            <ul className="text-xs sm:text-sm text-gray-700 space-y-1">
              <li>• Mật khẩu mới phải có ít nhất 6 ký tự</li>
              <li>• Mật khẩu mới phải khác mật khẩu hiện tại</li>
              <li>• Sau khi thay đổi, bạn sẽ cần đăng nhập lại</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}