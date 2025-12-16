"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import axiosInstance from "../../ultis/axios";
import Link from "next/link";
import { getSocket } from "./ResponsiveSidebar";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<{ _id?: string; id?: string; full_name?: string; email?: string; avatar?: string; role?: number } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState<{ team_unread: number; direct_unread: number; total_unread: number }>({
    team_unread: 0,
    direct_unread: 0,
    total_unread: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setShowDropdown(false);
  }, [pathname]);

  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right,
          });
        }
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showDropdown]);

  useEffect(() => {
    (async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? sessionStorage.getItem("token") || localStorage.getItem("token")
            : null;
        if (!token) return;

        const res = await axiosInstance.get('/api/users/me');
        const userData = res.data || null;
        // Đảm bảo role được set đúng
        if (userData && userData.role !== undefined) {
          setMe(userData);
        } else {
          setMe(userData);
        }

        if ((userData?._id || userData?.id) && typeof window !== "undefined") {
          const userId = (userData._id || userData.id)?.toString();
          const token = sessionStorage.getItem("token") || localStorage.getItem("token");
          if (userId && token) {
            const sock = getSocket();
            if (sock.connected) {
              sock.emit("join", userId);
            } else {
              sock.once("connect", () => {
                sock.emit("join", userId);
              });
            }
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? sessionStorage.getItem("token") || localStorage.getItem("token")
            : null;
        if (!token) return;

        const res = await axiosInstance.get("/api/notifications/unread-count");
        if (typeof res.data?.unread_count === "number") {
          setUnreadNotifications(res.data.unread_count);
        }
      } catch {
        // ignore silently
      }
    };

    fetchUnreadNotifications();

    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem("token") || localStorage.getItem("token")
        : null;
    if (!token) return;

    const sock = getSocket();
    const handleNotification = () => {
      setUnreadNotifications((prev) => prev + 1);
    };
    const handleNotificationRead = (data: any) => {
      if (typeof data?.unread_count === "number") {
        setUnreadNotifications(data.unread_count);
      } else {
        setUnreadNotifications((prev) => Math.max(0, prev - 1));
      }
    };

    sock.on("notification", handleNotification);
    sock.on("notification-read", handleNotificationRead);

    return () => {
      sock.off("notification", handleNotification);
      sock.off("notification-read", handleNotificationRead);
    };
  }, [me?._id, me?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchUnreadMessages = async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? sessionStorage.getItem("token") || localStorage.getItem("token")
            : null;
        if (!token || !isMounted) return;

        const res = await axiosInstance.get("/api/messages/unread-count", {
          validateStatus: (status) => status < 500,
        });
        if (res.status === 200 && res.data) {
          setUnreadMessages({
            team_unread: res.data.team_unread || 0,
            direct_unread: res.data.direct_unread || 0,
            total_unread: res.data.total_unread || 0,
          });
        }
      } catch {
        if (!isMounted) return;
        setUnreadMessages((prev) =>
          prev.total_unread === undefined
            ? { team_unread: 0, direct_unread: 0, total_unread: 0 }
            : prev
        );
      }
    };

    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 30000);

    const sock = getSocket();
    const refresh = () => fetchUnreadMessages();

    sock.on("new-team-message", refresh);
    sock.on("new-direct-message", refresh);
    sock.on("message-read", refresh);
    sock.on("joined-team", refresh);
    sock.on("connect", refresh);

    return () => {
      isMounted = false;
      clearInterval(interval);
      sock.off("new-team-message", refresh);
      sock.off("new-direct-message", refresh);
      sock.off("message-read", refresh);
      sock.off("joined-team", refresh);
      sock.off("connect", refresh);
    };
  }, []);

  const onLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("token");
      localStorage.removeItem("token");
    }
    router.replace('/login');
  };

  const handleProfileClick = () => {
    router.push("/myprofile");
    setShowDropdown(false);
  };

  const handleChangePasswordClick = () => {
    router.push("/change-password");
    setShowDropdown(false);
  };

  const handleLogoutClick = () => {
    onLogout();
    setShowDropdown(false);
  };

  const handleUserGuideClick = () => {
    const guideUrl = isSupervisor 
      ? '/user-guide?role=supervisor' 
      : '/user-guide?role=student';
    router.push(guideUrl);
    setShowDropdown(false);
  };

  const isSupervisor = me?.role === 4;
  const dashboardHref = isSupervisor ? "/supervisor/projects" : "/dashboard";

  // Màu sắc theo role
  const logoGradient = isSupervisor 
    ? "bg-gradient-to-r from-purple-500 to-indigo-500" 
    : "bg-gradient-to-r from-orange-500 to-pink-500";
  const notificationHover = isSupervisor
    ? "hover:text-purple-600 hover:border-purple-200"
    : "hover:text-orange-600 hover:border-orange-200";
  const messageHover = isSupervisor
    ? "hover:text-indigo-600 hover:border-indigo-200"
    : "hover:text-indigo-600 hover:border-indigo-200";
  const avatarBg = isSupervisor
    ? "bg-gradient-to-r from-purple-500 to-indigo-500"
    : "bg-blue-500";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 md:px-6 h-16">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3">
          <Link href={dashboardHref} className="flex items-center gap-3">
            <div className={`w-8 h-8 ${logoGradient} rounded-lg flex items-center justify-center`}>
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-gray-900">SEP Workspace</h1>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/notifications")}
            className={`relative flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-500 ${notificationHover} transition-colors duration-200`}
            aria-label="Thông báo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-semibold text-white bg-red-500 rounded-full">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </button>

          <button
            onClick={() => router.push("/messages")}
            className={`relative flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-500 ${messageHover} transition-colors duration-200`}
            aria-label="Tin nhắn"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {unreadMessages.total_unread > 0 && (
              <span className={`absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-semibold text-white ${isSupervisor ? 'bg-indigo-500' : 'bg-indigo-500'} rounded-full`}>
                {unreadMessages.total_unread > 99 ? "99+" : unreadMessages.total_unread}
              </span>
            )}
          </button>

          {/* User Profile Dropdown */}
          {me && (
            <div className="relative z-50">
            <button
              ref={buttonRef}
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 relative z-50"
            >
              <div className={`w-8 h-8 ${avatarBg} rounded-lg flex items-center justify-center overflow-hidden`}>
                {me.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={me.avatar}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-white">
                    {(
                      me.full_name?.[0] ||
                      me.email?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                  {me.full_name || "Người dùng"}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-[150px]">
                  {me.email || "Sinh viên FPT"}
                </p>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu - Render via Portal to avoid stacking context issues */}
            {showDropdown && mounted && typeof window !== 'undefined' && createPortal(
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setShowDropdown(false)}
                />
                <div 
                  className="fixed w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[9999]"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    right: `${dropdownPosition.right}px`,
                  }}
                >
                  <div className="px-4 py-3 border-b border-gray-200 md:hidden">
                    <p className="text-sm font-medium text-gray-900">
                      {me.full_name || "Người dùng"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {me.email || "Sinh viên FPT"}
                    </p>
                  </div>
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Hồ sơ của tôi</span>
                  </button>
                  <button
                    onClick={handleChangePasswordClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span>Đổi mật khẩu</span>
                  </button>
                  <button
                    onClick={handleUserGuideClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Hướng dẫn sử dụng</span>
                  </button>
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={handleLogoutClick}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors duration-200"
                  >
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </>,
              document.body
            )}
          </div>
          )}
        </div>
      </div>
    </header>
  );
}

