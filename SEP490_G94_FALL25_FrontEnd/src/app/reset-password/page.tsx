"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "../../../ultis/axios";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    const queryEmail = searchParams.get("email") || "";
    const queryToken = searchParams.get("token") || "";
    setEmail(queryEmail);
    setResetToken(queryToken);
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await axiosInstance.post("/api/auth/reset-password", { 
        
        resetToken, newPassword: password
      });
      toast.success("Đặt lại mật khẩu thành công!");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Đặt lại mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 py-4 px-4 sm:py-6 sm:px-6 lg:py-8">
      <div className="w-full max-w-md bg-white/80 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-white/30 p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">Đặt lại mật khẩu</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        {message && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Địa chỉ Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Mật khẩu mới <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
              placeholder="••••••••"
            />
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-semibold py-2.5 sm:py-3 md:py-3.5 text-sm sm:text-base rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
            onClick={() => router.push("/login")}
          >
            ← Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
