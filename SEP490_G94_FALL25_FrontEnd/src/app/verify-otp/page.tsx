"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "../../../ultis/axios";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const queryEmail = searchParams.get("email") || "";
    setEmail(queryEmail);
    
    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Chỉ cho phép 1 ký tự
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    const newOtp = [...otp];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      if (/^\d$/.test(pastedData[i])) {
        newOtp[i] = pastedData[i];
      }
    }
    
    setOtp(newOtp);
    
    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Vui lòng nhập đầy đủ 6 số OTP");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.post("api/auth/verify-otp", { email, otp: otpString });
      const resetToken = response.data?.resetToken;
      if (resetToken) {
        router.push(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(resetToken)}`);
      } else {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Xác thực OTP thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 py-4 px-4 sm:py-6 sm:px-6 lg:py-8">
      <div className="w-full max-w-md bg-white/80 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-white/30 p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">Xác thực OTP</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Nhập mã OTP đã được gửi đến email của bạn
          </p>
        </div>

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
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4 text-center">
              Mã OTP <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 sm:gap-3 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    handleOtpChange(index, value);
                  }}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-13.5 h-13.5 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-all duration-200"
                  placeholder=""
                />
              ))}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
              Nhập 6 chữ số từ email của bạn
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading || otp.join("").length !== 6}
            className="w-full bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-semibold py-2.5 sm:py-3 md:py-3.5 text-sm sm:text-base rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xác thực..." : "Xác thực"}
          </button>
        </form>

        <div className="mt-6 text-center">
          {canResend ? (
            <button 
              className="text-xs sm:text-sm text-green-600 hover:text-green-700 font-semibold transition-colors duration-200 hover:underline"
              onClick={() => router.push("/forgotpassword")}
            >
              Gửi lại OTP
            </button>
          ) : (
            <div className="text-xs sm:text-sm text-gray-600">
              Gửi lại OTP sau <span className="font-semibold text-green-600">{countdown}</span> giây
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
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


