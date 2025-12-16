"use client";

import { useEffect, useState } from "react";
import axiosInstance from "../../../ultis/axios";
import Image from "next/image";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";
import AddressForm from "./AddressForm";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Address = {
  street: string;
  city: string;
  postalCode: string;
  contry: string;
  _id?: string;
};

type Me = {
  _id: string;
  email: string;
  full_name?: string;
  address?: Address[];
  major?: string;
  phone?: string;
  dob?: string;
  avatar?: string;
  role?: number;
};

export default function MyProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleAvatar, setGoogleAvatar] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    dob: "",
    major: "",
    address: {
      street: "",
      city: "",
      postalCode: "",
      contry: "Việt Nam",
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [dobError, setDobError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem("token") || localStorage.getItem("token")
        : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        await fetchProfile();
      } catch (e: any) {
        setError(e?.response?.data?.message || "Không thể tải hồ sơ");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ga =
        sessionStorage.getItem("googleAvatar") ||
        localStorage.getItem("googleAvatar");
      if (ga) setGoogleAvatar(ga);
    }
  }, []);

  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      // Format to YYYY-MM-DD for input[type="date"]
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (e) {
      return "";
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axiosInstance.get("/api/users/profile");
      setMe(res.data);
      if (res.data) {
        setEditForm({
          full_name: res.data.full_name || "",
          phone: res.data.phone || "",
          dob: formatDateForInput(res.data.dob),
          major: res.data.major || "",
          address:
            res.data.address && res.data.address.length > 0
              ? res.data.address[0]
              : {
                  street: "",
                  city: "",
                  postalCode: "",
                  contry: "Việt Nam",
                },
        });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tải hồ sơ");
    }
  };

  const validateAge = (dob: string): boolean => {
    if (!dob) return true; // Allow empty, will be validated by required field
    
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Check if birthday has passed this year
    const hasBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthDate.getDate());
    const actualAge = hasBirthdayPassed ? age : age - 1;
    
    return actualAge >= 18;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate age
    if (editForm.dob && !validateAge(editForm.dob)) {
      setDobError("Bạn phải đủ 18 tuổi mới có thể cập nhật thông tin");
      return;
    }
    
    setDobError(null);
    setSubmitting(true);
    try {
      const updateData = {
        full_name: editForm.full_name,
        phone: editForm.phone,
        dob: editForm.dob,
        major: editForm.major,
        address: [editForm.address],
      };

      await axiosInstance.put("/api/users/profile", updateData);
      await fetchProfile();
      toast.success("Cập nhật thông tin thành công!");
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || "Cập nhật thất bại";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return <main className="p-6 text-red-600">{error}</main>;
  }
  if (!me) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">     
      <ResponsiveSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:ml-64 bg-gradient-to-br from-orange-50 via-white to-orange-100 min-h-screen">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex justify-end mb-4 sm:mb-6">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Chỉnh Sửa</span>
              <span className="sm:hidden">Sửa</span>
            </button>
          </div>

          {/* Trang thông tin cá nhân */}
          {!showEdit && (
            <div className="mx-auto w-full max-w-5xl">
              {/* Hiệu ứng ánh sáng cam nền */}
              <div className="relative">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-orange-300 via-orange-100 to-transparent rounded-full opacity-30 blur-2xl pointer-events-none animate-pulse"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tr from-orange-400 via-orange-100 to-transparent rounded-full opacity-20 blur-2xl pointer-events-none animate-pulse"></div>
                {/* Top section */}
                <div className="grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-4 sm:gap-6 mb-6 sm:mb-8 z-10 relative">
                  {/* Avatar card */}
                  <div className="card rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 bg-white/90 border border-orange-200 shadow-xl">
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex items-center justify-center text-2xl sm:text-3xl font-semibold border bg-orange-50 flex-shrink-0"
                      style={{ borderColor: "#fdba74" }}
                    >
                      {me.avatar ? (
                        <Image
                          src={
                            me.avatar.startsWith("http")
                              ? me.avatar
                              : `${process.env.NEXT_PUBLIC_API_URL}${me.avatar}`
                          }
                          alt="avatar"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : googleAvatar ? (
                        <Image
                          src={googleAvatar}
                          alt="google avatar"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-orange-400">
                          {me.full_name?.[0]?.toUpperCase() ||
                            me.email?.[0]?.toUpperCase() ||
                            "N"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
                      <div className="text-base sm:text-lg font-bold text-gray-900">
                        {me.full_name || "Chưa cập nhật tên"}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 break-words">{me.email}</div>
                      {me.major && (
                        <div className="text-xs text-gray-500 mt-1">{me.major}</div>
                      )}
                    </div>
                  </div>

                  {/* Banner */}
                  {(!me.full_name ||
                    !me.phone ||
                    !me.dob ||
                    !me.major ||
                    !me.address ||
                    !me.address[0]?.street ||
                    !me.address[0]?.city ||
                    !me.address[0]?.postalCode ||
                    !me.address[0]?.contry) && (
                    <div className="card rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-orange-50 border border-orange-200 shadow">
                      <div className="flex-1">
                        <div className="font-medium mb-1 text-sm sm:text-base text-gray-900">
                          Thông báo
                        </div>
                        <div className="text-xs sm:text-sm text-gray-700">
                          Cập nhật hồ sơ để tăng mức độ hoàn thiện tài khoản của bạn.
                        </div>
                      </div>
                      <button
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-orange-300 text-gray-900 hover:bg-orange-100 transition text-xs sm:text-sm whitespace-nowrap font-medium"
                        onClick={() => setShowEdit(true)}
                      >
                        Hoàn thiện
                      </button>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="w-full flex justify-center">
                  <h2
                    className="text-xl sm:text-2xl font-extrabold mb-4 sm:mb-6 text-center pt-6 sm:pt-8 pb-2 tracking-wide"
                  >
                    <span
                      className="bg-gradient-to-r from-orange-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg"
                      style={{
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      Thông Tin Cá Nhân
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 z-10 relative">
                  {[
                    {
                      label: "User ID",
                      icon: "🆔",
                      value: me._id || "—",
                    },
                    {
                      label: "Họ và Tên",
                      icon: "👤",
                      value: me.full_name || "Chưa cập nhật",
                    },
                    {
                      label: "Email",
                      icon: "✉️",
                      value: me.email || "Chưa cập nhật",
                    },
                    {
                      label: "Số Điện Thoại",
                      icon: "📞",
                      value: me.phone || "Chưa cập nhật",
                    },
                    {
                      label: "Ngày Sinh",
                      icon: "🎂",
                      value: me.dob
                        ? new Date(me.dob).toLocaleDateString("vi-VN")
                        : "Chưa cập nhật",
                    },
                    {
                      label: "Chuyên Ngành",
                      icon: "📘",
                      value: me.major || "Chưa cập nhật",
                    },
                    {
                      label: "Địa Chỉ",
                      icon: "📍",
                      value:
                        me.address && me.address.length > 0
                          ? `${me.address[0].street},${me.address[0].postalCode}, ${me.address[0].city}, ${me.address[0].contry}`
                          : "Chưa cập nhật",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="card rounded-xl p-3 sm:p-4 bg-white/80 border border-orange-100 shadow hover:shadow-orange-200 transition-all duration-200"
                    >
                      <div className="text-xs text-gray-600 mb-2">{item.label}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg flex-shrink-0">{item.icon}</span>
                        <div className="font-semibold text-sm sm:text-base text-gray-900 break-words">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
           
            </div>
          )}

          {/* Trang cập nhật thông tin cá nhân */}
          {showEdit && (
            <div className="mx-auto w-full max-w-2xl">
              <div
                className="relative bg-white/95 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 overflow-hidden border border-white/50 shadow-xl"
                style={{
                  boxShadow:
                    "0 4px 20px rgba(251, 146, 60, 0.15), 0 0 0 1px rgba(251, 146, 60, 0.1)",
                }}
              >
                {/* Hiệu ứng ánh sáng cam động */}
                <div className="absolute -top-8 -left-8 w-40 h-40 bg-gradient-to-br from-orange-400 via-orange-200 to-transparent rounded-full opacity-30 blur-2xl pointer-events-none animate-pulse"></div>
                <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gradient-to-tr from-orange-500 via-orange-200 to-transparent rounded-full opacity-25 blur-2xl pointer-events-none animate-pulse"></div>
                
                <div className="w-full flex justify-center mb-6">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-wide">
                    Cập nhật thông tin cá nhân
                  </h2>
                </div>
                
                <form onSubmit={handleEditSubmit} className="space-y-5 sm:space-y-6 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Họ và Tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-200 shadow-sm"
                        placeholder="Nhập họ và tên"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Số Điện Thoại <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-200 shadow-sm"
                        placeholder="Nhập số điện thoại"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ngày Sinh <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={editForm.dob}
                        onChange={(e) => {
                          const newDob = e.target.value;
                          setEditForm((prev) => ({
                            ...prev,
                            dob: newDob,
                          }));
                          // Validate age in real-time
                          if (newDob && !validateAge(newDob)) {
                            setDobError("Bạn phải đủ 18 tuổi mới có thể cập nhật thông tin");
                          } else {
                            setDobError(null);
                          }
                        }}
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm ${
                          dobError 
                            ? 'border-red-500 focus:ring-red-400 focus:border-red-400' 
                            : 'border-gray-300 focus:ring-green-400 focus:border-green-400'
                        }`}
                      />
                      {dobError && (
                        <p className="mt-1 text-sm text-red-600">{dobError}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Chuyên Ngành
                      </label>
                      <input
                        type="text"
                        value={editForm.major}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            major: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-200 shadow-sm"
                        placeholder="Nhập chuyên ngành"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-5 sm:pt-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span role="img" aria-label="address" className="text-lg">📍</span> 
                      Địa chỉ
                    </h3>
                    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 sm:p-5 shadow-inner">
                      <AddressForm
                        address={editForm.address}
                        onChange={(newAddress: any) =>
                          setEditForm((prev) => ({
                            ...prev,
                            address: newAddress,
                          }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sm:pt-5 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowEdit(false)}
                      className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-sm sm:text-base shadow-sm hover:shadow transition-all duration-200"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <span className="animate-pulse">Đang cập nhật...</span>
                      ) : (
                        "Cập nhật"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}