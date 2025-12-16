"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "../../../ultis/axios";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleButtonRendered = useRef<boolean>(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !googleBtnRef.current || googleButtonRendered.current) return;

    const loadScript = () => {
      if (document.getElementById("google-identity")) {
        // Script already loaded, just initialize
        setTimeout(initGoogle, 100);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = "google-identity";
      script.onload = initGoogle;
      document.body.appendChild(script);
    };

    const initGoogle = () => {
      // @ts-expect-error
      if (!window.google || !google.accounts || !google.accounts.id) return;
      
      // Prevent multiple renders
      if (googleButtonRendered.current) return;
      
      // Clear any existing button first
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
      }
      
      // @ts-expect-error
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        ux_mode: "popup",
      });
      
      if (googleBtnRef.current && !googleButtonRendered.current) {
        // @ts-expect-error
        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "medium",
          shape: "pill",
          text: "signin_with",
        });
        googleButtonRendered.current = true;
      }
    };

    loadScript();
    
    // Cleanup function
    return () => {
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
      }
      googleButtonRendered.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearError = () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setError(null);
  };

  const showError = (message: string, durationMs = 10000) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setError(message);
    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
      errorTimeoutRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const handleGoogleResponse = async (response: { credential: string }) => {
    try {
      clearError();
      setLoading(true);
      const idToken = response?.credential;
      if (!idToken) throw new Error("Không nhận được phản hồi từ Google");

      const payload = JSON.parse(atob(idToken.split('.')[1]));
      const email = payload.email;

      // Chỉ chấp nhận email có đuôi @fpt.edu.vn
      if (!email || !email.endsWith('@fpt.edu.vn')) {
        throw new Error("Chỉ chấp nhận đăng nhập bằng email FPT (@fpt.edu.vn). Vui lòng sử dụng tài khoản email có đuôi @fpt.edu.vn.");
      }

      const res = await axiosInstance.post("/api/auth/google", { idToken });
      const token = res.data?.token;
      const userRole = res.data?.user?.role;
      if (token) {
        sessionStorage.setItem("token", token);
        localStorage.setItem("token", token);
      }

      // Ưu tiên redirect URL từ query params (nếu có)
      if (redirectUrl) {
        router.replace(redirectUrl);
      } else if (userRole === 4) {
        router.replace("/supervisor/projects");
      } else {
        router.replace("/dashboard");
      }
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      showError(error?.response?.data?.message || error?.message || "Đăng nhập Google thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleUnverifiedAccount = async (targetEmail: string, message?: string) => {
    const finalMessage =
      message ||
      "Tài khoản chưa xác thực. Mã OTP mới đã được gửi đến email của bạn.";

    showError(finalMessage);

    try {
      await axiosInstance.post("/api/auth/resend-registration-otp", {
        email: targetEmail,
      });
    } catch (resendError) {
      console.error("Resend OTP error:", resendError);
    }

    const query = new URLSearchParams({
      verify: "1",
      email: targetEmail,
      msg: finalMessage,
    });
    router.push(`/register?${query.toString()}`);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      clearError();

      const res = await axiosInstance.post("/api/auth/login", { email, password });
      const token = res.data?.token;
      const user = res.data?.user;

       const userEmail = user?.email || email.trim();

      if (user && user.verified === false) {
        await handleUnverifiedAccount(userEmail, "Tài khoản chưa xác thực. Vui lòng nhập mã OTP đã được gửi.");
        return;
      }

      if (token) {
        sessionStorage.setItem("token", token);
        localStorage.setItem("token", token);
      }

      // Ưu tiên redirect URL từ query params (nếu có)
      if (redirectUrl) {
        router.replace(redirectUrl);
      } else if (user?.redirectUrl) {
        router.replace(user.redirectUrl);
      } else if (user?.role === 4) {
        router.replace("/supervisor/projects");
      } else {
        router.replace("/dashboard");
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data?.message || "Đăng nhập thất bại";
      const targetEmail = e?.response?.data?.email || email.trim();

      if (
        status === 403 &&
        message.toLowerCase().includes("chưa") &&
        message.toLowerCase().includes("xác thực")
      ) {
        await handleUnverifiedAccount(targetEmail, message);
      } else {
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <div className="w-full max-w-4xl bg-white/80 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/30">
        {/* Left side: intro */}
<div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-green-100 via-white to-pink-100 px-8 py-10 w-1/2">
  <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center leading-tight">
    Hệ thống quản lý đồ án ngành
  </h2>
  <h2 className="text-4xl font-extrabold text-green-600 mb-2 text-center leading-tight">
    Kỹ thuật phần mềm
  </h2>
  <p className="text-gray-700 text-lg mb-6 text-center">
    Nền tảng giúp bạn quản lý các dự án học tập và làm việc nhóm một cách thông minh
  </p>
  <img
    src="/illustration.png"
    alt="Login illustration"
    className="w-[400px] h-[220px] object-contain mb-2"
    style={{ maxWidth: "100%" }}
  />
</div>
        {/* Right side: login form */}
        <div className="flex-1 flex flex-col justify-center px-6 py-10 md:px-10">
          <h3 className="text-2xl font-bold text-green-600 mb-2 text-center">SoftCapstone</h3>
          <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">Welcome to SoftCapstone</h4>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Địa chỉ Email *
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 text-gray-900 bg-white"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu *
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 text-gray-900 bg-white"
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-center justify-end">
              <a href="/forgotpassword" className="text-sm text-green-600 hover:underline font-medium">
                Quên mật khẩu?
              </a>
            </div>
            {error && (
              <div
                id="error-message"
                className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm"
              >
                {error}
              </div>
            )}
            <button
              id="loginButton"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-semibold py-2 rounded-lg shadow-md transition-all duration-200 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </button>
          </form>
          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="px-3 text-gray-500 text-sm font-medium">HOẶC</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>
          {/* Google Sign In Notice */}
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-xs md:text-sm text-blue-800 font-semibold mb-1">
                  Đăng nhập bằng Google
                </p>
                <p className="text-xs text-blue-700">
                  Chỉ chấp nhận email có đuôi <span className="font-semibold">@fpt.edu.vn</span>. Vui lòng sử dụng tài khoản Google được liên kết với email FPT của bạn.
                </p>
              </div>
            </div>
          </div>
          {/* Google Sign In */}
          <div className="mb-2 flex justify-center">
            <div ref={googleBtnRef} />
          </div>
          {/* Register */}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="w-full border-2 border-green-400 text-green-600 hover:bg-green-50 font-semibold py-2 rounded-lg shadow-sm transition-all duration-200 mt-2"
          >
            Đăng ký tài khoản mới
          </button>
        </div>
      </div>
    </div>
  );
}