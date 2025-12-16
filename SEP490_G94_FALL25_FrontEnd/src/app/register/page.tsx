"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "../../../ultis/axios";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Step management: 'register' or 'verify'
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpFromServer, setOtpFromServer] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [dobDisplay, setDobDisplay] = useState(""); // For dd/mm/yyyy display
  const [major, setMajor] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Việt Nam");

  useEffect(() => {
    const shouldVerify = searchParams.get("verify");
    const emailFromQuery = searchParams.get("email");
    const messageFromQuery = searchParams.get("msg");

    if (shouldVerify === "1" && emailFromQuery) {
      setRegisteredEmail(emailFromQuery);
      setStep("verify");
      setSuccess(
        messageFromQuery ||
          "Tài khoản của bạn chưa được xác thực. Vui lòng nhập mã OTP đã được gửi đến email."
      );
      setError(null);
    }
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!fullName.trim()) {
      setError("Vui lòng nhập họ và tên");
      return;
    }
    
    if (!email.trim()) {
      setError("Vui lòng nhập email");
      return;
    }
    
    // Chặn đăng ký bằng email FPT
    if (email.endsWith('@fpt.edu.vn')) {
      setError("Email FPT không thể đăng ký. Bạn chỉ cần đăng nhập, không cần đăng ký.");
      return;
    }
    
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }
    
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    
    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại");
      return;
    }
    
    if (!dob || !dobDisplay) {
      setError("Vui lòng nhập ngày sinh");
      return;
    }

    // Validate date format dd/mm/yyyy
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dobDisplay)) {
      setError("Ngày sinh phải có định dạng dd/mm/yyyy");
      return;
    }

    // Validate date is valid
    const [day, month, year] = dobDisplay.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
      setError("Ngày sinh không hợp lệ");
      return;
    }

    // Check if date is not in the future
    if (dateObj > new Date()) {
      setError("Ngày sinh không thể là ngày tương lai");
      return;
    }
    
    if (!street.trim() || !city.trim() || !postalCode.trim() || !country.trim()) {
      setError("Vui lòng điền đầy đủ thông tin địa chỉ");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const registerData: any = {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password,
        phone: phone.trim(),
        dob: dob,
        address: [
          {
            street: street.trim(),
            city: city.trim(),
            postalCode: postalCode.trim(),
            contry: country.trim(), // Note: using 'contry' as per schema (typo in schema)
          }
        ],
        role: 1, // Default STUDENT role
      };

      // Chỉ thêm major nếu có giá trị
      if (major.trim()) {
        registerData.major = major.trim();
      }

      // Log request data in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Register request data:', registerData);
      }

      const res = await axiosInstance.post("/api/auth/register", registerData);
      
      // If registration successful, show OTP verification form
      if (res.data?.message || res.status === 201) {
        setRegisteredEmail(email.trim());
        setOtpFromServer(res.data?.otp || null); // Store OTP if returned (development mode)
        setSuccess(res.data?.message || "Đăng ký thành công!");
        setError(null);
        setStep('verify');
      }

    } catch (e: any) {
      const errorData = e?.response?.data;
      const errorMessage = errorData?.message || "Đăng ký thất bại. Vui lòng thử lại.";
      
      // Log error details in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Register error details:', {
          status: e?.response?.status,
          statusText: e?.response?.statusText,
          data: errorData,
          message: e?.message,
          config: {
            url: e?.config?.url,
            method: e?.config?.method,
            data: e?.config?.data
          }
        });
      }
      
      // Nếu server trả về shouldLogin: true, hiển thị thông báo đặc biệt
      if (errorData?.shouldLogin) {
        setError(errorMessage);
        // Tự động redirect đến login sau 3 giây
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        // Hiển thị thông báo lỗi chi tiết hơn cho lỗi 500
        if (e?.response?.status === 500) {
          setError(errorMessage || "Lỗi máy chủ. Vui lòng kiểm tra lại thông tin và thử lại sau.");
        } else {
          setError(errorMessage);
        }
      }
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      setError("Vui lòng nhập mã OTP");
      return;
    }

    if (otp.length !== 6) {
      setError("Mã OTP phải có 6 chữ số");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await axiosInstance.post("/api/auth/verify-registration-otp", {
        email: registeredEmail,
        otp: otp.trim()
      });

      if (res.data?.message) {
        setSuccess(res.data.message);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login?verified=true");
        }, 2000);
      }

    } catch (e: any) {
      setError(e?.response?.data?.message || "Xác thực thất bại. Vui lòng thử lại.");
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    try {
      setResendLoading(true);
      setError(null);
      setSuccess(null);

      const res = await axiosInstance.post("/api/auth/resend-registration-otp", {
        email: registeredEmail
      });

      if (res.data?.message) {
        setOtpFromServer(res.data?.otp || null); // Store OTP if returned (development mode)
        setSuccess(res.data.message);
      }

    } catch (e: any) {
      setError(e?.response?.data?.message || "Gửi lại OTP thất bại. Vui lòng thử lại.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 py-4 px-4 sm:py-6 sm:px-6 lg:py-8">
      <div className="w-full max-w-6xl bg-white/80 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-white/30">
        {/* Left side: intro */}
        <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-green-100 via-white to-pink-100 px-6 xl:px-8 py-8 xl:py-10 w-1/2">
          <h2 className="text-2xl xl:text-3xl font-bold text-gray-800 mb-2 text-center leading-tight">
            Hệ thống quản lý đồ án ngành
          </h2>
          <h2 className="text-3xl xl:text-4xl font-extrabold text-green-600 mb-2 text-center leading-tight">
            Kỹ thuật phần mềm
          </h2>
          <p className="text-gray-700 text-base xl:text-lg mb-6 text-center px-2">
            Tạo tài khoản mới để bắt đầu quản lý dự án học tập và làm việc nhóm
          </p>
          <img
            src="/illustration.png"
            alt="Register illustration"
            className="w-full max-w-[350px] xl:max-w-[400px] h-auto object-contain mb-2"
          />
      </div>

        {/* Right side: register form or OTP verification */}
        <div className="flex-1 flex flex-col justify-center px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-6 xl:px-8">
          {step === 'register' ? (
            <>
              <div className="mb-4 sm:mb-5 text-center lg:text-left">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 mb-1">SoftCapstone</h3>
                <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 mb-0.5">Tạo tài khoản mới</h4>
                <p className="text-xs sm:text-sm text-gray-600">Điền thông tin để đăng ký tài khoản</p>
          </div>

          {/* Form đăng ký */}
              <div className="bg-white/50 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6">
            {error && (
                  <div className={`mb-4 border px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm ${
                    error.includes('không cần phải đăng ký') || error.includes('đăng nhập')
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-red-100 border-red-400 text-red-700'
                  }`}>
                <div className="flex items-start">
                      {(error.includes('không cần phải đăng ký') || error.includes('đăng nhập')) && (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold mb-1 text-xs sm:text-sm">{error}</p>
                        {(error.includes('không cần phải đăng ký') || error.includes('đăng nhập')) && (
                          <div className="mt-2">
                            <a 
                              href="/login"
                              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors duration-200"
                            >
                              Đi đến trang đăng nhập →
                            </a>
                            <p className="text-xs mt-2 text-blue-600">Tự động chuyển đến trang đăng nhập sau 3 giây...</p>
                          </div>
                        )}
                      </div>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-3 sm:space-y-3.5 md:space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
                    placeholder="Nguyễn Văn A"
                  />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                  Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null); // Clear error when typing
                  }}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 text-gray-900 bg-white transition-colors ${
                    email.endsWith('@fpt.edu.vn') && email.trim()
                      ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                      : 'border-gray-300 focus:ring-green-400 focus:border-green-400'
                  }`}
                  placeholder="your.email@example.com"
                />
                {email.endsWith('@fpt.edu.vn') && email.trim() ? (
                  <div className="mt-1.5 sm:mt-2 p-2 sm:p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-700">
                    <p className="font-semibold mb-0.5">⚠️ Email FPT không thể đăng ký</p>
                    <p>
                      Bạn chỉ cần{" "}
                      <a href="/login" className="font-semibold text-red-600 hover:text-red-700 hover:underline">
                        đăng nhập
                      </a>
                      {" "}thay vì đăng ký.
                    </p>
                </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Email FPT (@fpt.edu.vn) không thể đăng ký. Nếu bạn có email FPT, vui lòng{" "}
                    <a href="/login" className="font-semibold text-green-600 hover:text-green-700 hover:underline">
                      đăng nhập
                    </a>
                    {" "}thay vì đăng ký.
                  </p>
                )}
              </div>

              {/* Password và Confirm Password - Grid trên tablet/desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                    Mật khẩu <span className="text-red-500">*</span>
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
              </div>

              {/* Phone và DOB - Grid trên tablet/desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
                      placeholder="0123456789"
                    />
                </div>

                <div>
                  <label htmlFor="dob" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                    Ngày sinh <span className="text-red-500">*</span>
                  </label>
                    <input
                      id="dob"
                    type="text"
                      required
                    value={dobDisplay}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Remove all non-digit characters
                      value = value.replace(/\D/g, '');
                      
                      // Format as dd/mm/yyyy
                      if (value.length <= 2) {
                        setDobDisplay(value);
                      } else if (value.length <= 4) {
                        setDobDisplay(value.slice(0, 2) + '/' + value.slice(2));
                      } else if (value.length <= 8) {
                        setDobDisplay(value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4));
                      } else {
                        setDobDisplay(value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8));
                      }
                      
                      // Convert to yyyy-mm-dd for backend
                      if (value.length === 8) {
                        const day = value.slice(0, 2);
                        const month = value.slice(2, 4);
                        const year = value.slice(4, 8);
                        setDob(`${year}-${month}-${day}`);
                      } else {
                        setDob('');
                      }
                      
                      setError(null);
                    }}
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
                  />
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Định dạng: dd/mm/yyyy (ví dụ: 25/12/2000)</p>
                </div>
              </div>

              {/* Major */}
              <div>
                <label htmlFor="major" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                  Chuyên ngành
                </label>
                  <input
                    id="major"
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
                    placeholder="Software Engineering"
                  />
              </div>

              {/* Address Section */}
              <div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-3 sm:space-y-3.5 md:space-y-4">
                <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-1">Thông tin địa chỉ</h3>
                
                {/* Street */}
                <div>
                  <label htmlFor="street" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                    Đường/Phố <span className="text-red-500">*</span>
                  </label>
                    <input
                      id="street"
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
                      placeholder="123 Đường ABC"
                    />
                </div>

                {/* City và Postal Code - Grid trên tablet/desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="city" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                      Thành phố <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
                      placeholder="Hà Nội"
                    />
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                      Mã bưu điện <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
                      placeholder="100000"
                    />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label htmlFor="country" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                    Quốc gia <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="country"
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white transition-colors"
                    placeholder="Việt Nam"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-semibold py-2.5 sm:py-3 md:py-3.5 text-sm sm:text-base rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-5"
              >
                {loading ? "Đang xử lý..." : "Đăng ký"}
              </button>
            </form>

            {/* Link to Login */}
                <div className="mt-4 sm:mt-5 text-center">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Đã có tài khoản?{" "}
                    <a href="/login" className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors duration-200">
                      Đăng nhập ngay
                    </a>
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* OTP Verification Form */}
              <div className="mb-4 sm:mb-5 text-center lg:text-left">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 mb-1">Xác thực Email</h3>
                <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 mb-0.5">Nhập mã OTP</h4>
                <p className="text-xs sm:text-sm text-gray-600 break-words">
                  Chúng tôi đã gửi mã OTP đến <span className="font-semibold">{registeredEmail}</span>
                </p>
              </div>

              <div className="bg-white/50 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6">
                {error && (
                  <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                    {success}
                  </div>
                )}

                {/* Development mode: Show OTP if available */}
                {otpFromServer && (
                  <div className="mb-4 bg-blue-50 border border-blue-300 text-blue-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                    <p className="font-semibold mb-1">Development Mode:</p>
                    <p>Mã OTP của bạn: <span className="font-mono text-base sm:text-lg font-bold">{otpFromServer}</span></p>
                  </div>
                )}

                <form onSubmit={handleVerifyOTP} className="space-y-4 sm:space-y-5">
                  <div>
                    <label htmlFor="otp" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                      Mã OTP <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="otp"
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Only numbers
                        setOtp(value);
                        setError(null);
                      }}
                      className="w-full px-3 sm:px-4 py-3 sm:py-4 md:py-5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-900 bg-white text-center text-xl sm:text-2xl md:text-3xl font-mono tracking-widest transition-colors"
                      placeholder="000000"
                    />
                    <p className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-2">Nhập 6 chữ số từ email của bạn</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-semibold py-2.5 sm:py-3 md:py-3.5 text-sm sm:text-base rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang xác thực..." : "Xác thực"}
                  </button>
                </form>

                <div className="mt-4 sm:mt-5 space-y-2.5 sm:space-y-3">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendLoading}
                    className="w-full border-2 border-green-400 text-green-600 hover:bg-green-50 font-semibold py-2 sm:py-2.5 md:py-3 text-sm sm:text-base rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? "Đang gửi..." : "Gửi lại mã OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('register');
                      setOtp('');
                      setError(null);
                      setSuccess(null);
                      setOtpFromServer(null);
                    }}
                    className="w-full text-gray-600 hover:text-gray-800 text-xs sm:text-sm font-medium py-1.5 sm:py-2 transition-colors duration-200"
                  >
                    ← Quay lại đăng ký
                  </button>
                </div>

                <div className="mt-4 sm:mt-5 text-center">
                  <p className="text-xs sm:text-sm text-gray-600">
                Đã có tài khoản?{" "}
                    <a href="/login" className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors duration-200">
                  Đăng nhập ngay
                </a>
              </p>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

