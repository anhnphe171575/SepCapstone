"use client";

import { useEffect, useState } from "react";
import axiosInstance from "../../../../ultis/axios";
import Image from "next/image";

import AddressForm from "@/app/myprofile/AddressForm";
import { User, FolderKanban, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import LeftSidebarHeader from "../dashboard-admin/herder";
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
  const [activeTab, setActiveTab] = useState<"profile" | "project" | "address">("profile");
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
    <div className="flex min-h-screen">     
      <LeftSidebarHeader />
      <main className="flex-1 p-6 ml-64">
        <div className="mx-auto w-full max-w-5xl">
          {/* Header actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              {/* Nút Thông tin cá nhân */}
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 text-sm font-medium px-2 py-1 rounded border-b-2 ${
                  activeTab === "profile"
                    ? "text-[var(--primary)] border-[var(--primary)]"
                    : "opacity-80 hover:text-[var(--primary)] border-transparent"
                }`}
              >
                <User className="w-4 h-4" />
                Thông tin cá nhân
              </button>


              {/* Nút Cài đặt - hiện form cập nhật thông tin cá nhân */}
              <button
                onClick={() => setActiveTab("address")}
                className={`flex items-center gap-2 text-sm px-2 py-1 rounded border-b-2 ${
                  activeTab === "address"
                    ? "text-[var(--primary)] border-[var(--primary)]"
                    : "opacity-80 hover:text-[var(--primary)] border-transparent"
                }`}
              >
                <Settings className="w-4 h-4" />
                Cài đặt
              </button>
            </div>
          </div>

       {activeTab === "profile" && (
  <div className="mx-auto w-full max-w-5xl">
    {/* Hiệu ứng ánh sáng xanh nền */}
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-300 via-blue-100 to-transparent rounded-full opacity-30 blur-2xl pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tr from-blue-400 via-blue-100 to-transparent rounded-full opacity-20 blur-2xl pointer-events-none animate-pulse"></div>
      {/* Top section */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-6 mb-8 z-10 relative">
        {/* Avatar card */}
        <div className="card rounded-xl p-6 flex items-center gap-5 bg-white/90 border border-blue-200 shadow-xl">
          <div
            className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center text-3xl font-semibold border bg-blue-50"
            style={{ borderColor: "#90caf9" }}
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
              <span className="text-blue-400">
                {me.full_name?.[0]?.toUpperCase() ||
                  me.email?.[0]?.toUpperCase() ||
                  "N"}
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="text-lg font-bold text-blue-700">
              {me.full_name || "Chưa cập nhật tên"}
            </div>
            <div className="text-sm opacity-80 text-blue-600">{me.email}</div>
            {me.major && (
              <div className="text-xs opacity-60 mt-1 text-blue-500">{me.major}</div>
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
          <div className="card rounded-xl p-6 flex items-center justify-between bg-blue-50 border border-blue-200 shadow">
            <div>
              <div className="font-medium mb-1 text-blue-800">
                Thông báo
              </div>
              <div className="text-sm opacity-75 text-blue-900">
                Cập nhật hồ sơ để tăng mức độ hoàn thiện tài khoản của bạn.
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-lg border border-blue-300 text-blue-800 hover:bg-blue-100 transition"
              onClick={() => setActiveTab("address")}
            >
              Hoàn thiện
            </button>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="w-full flex justify-center">
       <h2
  className="text-2xl font-extrabold mb-6 text-center pt-8 pb-2 tracking-wide animate-bounce-title"
>
  <span
    className="bg-gradient-to-r from-green-400 via-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 z-10 relative">
        {[
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
            className="card rounded-xl p-4 bg-white/80 border border-blue-100 shadow hover:shadow-blue-200 transition-all duration-200"
          >
            <div className="text-xs opacity-70 mb-2 text-blue-700">{item.label}</div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{item.icon}</span>
              <div className="font-semibold text-blue-900">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  <style jsx>{`
  .animate-bounce-title {
    animation: bounceTitle 4s infinite alternate cubic-bezier(.68,-0.55,.27,1.55);
    display: inline-block;
  }
  @keyframes bounceTitle {
    0% { transform: translateY(0);}
    50% { transform: translateY(-12px);}
    100% { transform: translateY(0);}
  }
`}</style>
  </div>
)}

          {activeTab === "project" && (
            <div className="mx-auto w-full max-w-5xl">
              {/* <Project userId={me._id} /> */}
            </div>
          )}

{activeTab === "address" && (
  <div className="mx-auto w-full max-w-xl">
    <div
   className="relative bg-white/90 rounded-2xl p-5 overflow-hidden"
 style={{
    boxShadow:
      "0 0 24px 6px #2196f388, 0 2px 12px 0 #2196f355", // tăng alpha (88, 55)
    backdropFilter: "blur(1.5px)",
  }}
>
  {/* Hiệu ứng ánh sáng xanh động */}
  <div className="absolute -top-8 -left-8 w-40 h-40 bg-gradient-to-br from-blue-400 via-blue-200 to-transparent rounded-full opacity-50 blur-2xl pointer-events-none animate-pulse"></div>
  <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gradient-to-tr from-blue-500 via-blue-200 to-transparent rounded-full opacity-40 blur-2xl pointer-events-none animate-pulse"></div>
 <div className="w-full flex justify-center">
  <h2
    className="w-max text-2xl font-extrabold mb-4 pt-8 pb-2 tracking-wide animate-bounce-title"
  >
    <span
      className="bg-gradient-to-r from-green-400 via-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg"
      style={{
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      Cập nhật thông tin cá nhân
    </span>
  </h2>
</div>
      <form onSubmit={handleEditSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Họ và Tên
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
              className="w-full border border-blue-200 rounded-lg px-3 py-1.5 bg-white/80 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              placeholder="Nhập họ và tên"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Số Điện Thoại
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
              className="w-full border border-blue-200 rounded-lg px-3 py-1.5 bg-white/80 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              placeholder="Nhập số điện thoại"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ngày Sinh
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
              className={`w-full border rounded-lg px-3 py-1.5 bg-white/80 shadow focus:outline-none focus:ring-2 transition ${
                dobError 
                  ? 'border-red-500 focus:ring-red-400 focus:border-transparent' 
                  : 'border-blue-200 focus:ring-blue-400 focus:border-transparent'
              }`}
            />
            {dobError && (
              <p className="mt-1 text-xs text-red-600">{dobError}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
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
              className="w-full border border-blue-200 rounded-lg px-3 py-1.5 bg-white/80 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              placeholder="Nhập chuyên ngành"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="border-t border-blue-100 pt-4">
          <h3 className="text-base font-semibold text-blue-700 mb-2 flex items-center gap-2">
            <span role="img" aria-label="address">📍</span> Địa chỉ
          </h3>
          <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-3 shadow-inner">
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
        <div className="flex justify-end gap-3 pt-4 border-t border-blue-100">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold shadow-lg hover:scale-105 hover:shadow-blue-300 transition-all duration-200 disabled:opacity-60 border-2 border-transparent hover:border-blue-400"
          >
            {submitting ? (
              <span className="animate-pulse">Đang cập nhật...</span>
            ) : (
              <>
                <span className="drop-shadow">💾</span> Cập nhật
              </>
            )}
          </button>
        </div>
      </form>
    </div>
<style jsx>{`
  .animate-bounce-title {
    animation: bounceTitle 4s infinite alternate cubic-bezier(.68,-0.55,.27,1.55);
    display: inline-block;
  }
  @keyframes bounceTitle {
    0% { transform: translateY(0);}
    50% { transform: translateY(-12px);}
    100% { transform: translateY(0);}
  }
`}</style>
  </div>
)}
        </div>
      </main>
    </div>
  );
}