"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "../../../ultis/axios";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await axiosInstance.post("api/auth/forgot-password", { email });
      setMessage("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.");
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Yêu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 py-4 px-4 sm:py-6 sm:px-6 lg:py-8">
      <div className="w-full max-w-md bg-white/80 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-white/30 p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">Quên mật khẩu</h1>
          <p className="text-xs sm:text-sm text-gray-600">Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu</p>
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
            <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Địa chỉ Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
              placeholder="your.email@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-semibold py-2.5 sm:py-3 md:py-3.5 text-sm sm:text-base rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang gửi..." : "Gửi yêu cầu đặt lại mật khẩu"}
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


