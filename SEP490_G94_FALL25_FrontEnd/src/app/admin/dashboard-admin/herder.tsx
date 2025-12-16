"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axiosInstance from "../../../../ultis/axios";
import { io, Socket } from "socket.io-client";
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  ChevronRight, 
  Menu,
  UserRound,
  LockOpen,
  FolderOpen
} from 'lucide-react';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

const navItems = [
  { 
    href: "/admin/dashboard", 
    label: "Dashboard", 
    icon: <LayoutDashboard className="w-5 h-5" /> 
  },
  { 
    href: "/admin/user", 
    label: "Quản lý người dùng", 
    icon: <Users className="w-5 h-5" /> 
  },
  { 
    href: "/admin/projects", 
    label: "Quản lý dự án", 
    icon: <FolderOpen className="w-5 h-5" /> 
  },
  { 
    href: "/admin/profile", 
    label: "Thông tin cá nhân", 
    icon: <UserRound className="w-5 h-5" /> 
  },
  { 
    href: "/admin/change-password", 
    label: "Đổi mật khẩu", 
    icon: <LockOpen className="w-5 h-5" /> 
  },
];

export default function LeftSidebarHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = typeof window !== "undefined" ? 
          sessionStorage.getItem("token") || localStorage.getItem("token") : null;
        if (!token) return;

        const res = await axiosInstance.get("/api/users/me");
        setMe(res.data);

        const userId = res.data._id || res.data.id;
        if (userId) {
          const sock = getSocket();
          if (!sock.connected) {
            sock.once("connect", () => sock.emit("join", userId.toString()));
          } else {
            sock.emit("join", userId.toString());
          }
        }
      } catch (err) {
        console.warn("Fetch user failed", err);
      }
    })();
  }, []);

  const onLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("token");
      localStorage.removeItem("token");
    }
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    router.replace("/login");
  };

  return (
    <aside className={`fixed top-0 left-0 h-full bg-white shadow-lg flex flex-col transition-all duration-300
      ${isCollapsed ? 'w-20' : 'w-64'}`}>
      
      {/* Header with Logo */}
      <div className="px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 
            rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
            <span className="text-xl font-bold text-white">A</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-800">AdminPanel</span>
              <span className="text-xs text-gray-500">Management System</span>
            </div>
          )}
        </Link>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6">
        <div className="mb-4 px-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {isCollapsed ? 'Menu' : 'Main Menu'}
          </h2>
        </div>
        <ul className="space-y-1.5">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                    ${active ? 
                      'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md' : 
                      'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Actions */}
      <div className="px-3 py-4 border-t border-gray-100">
      

        {/* User Profile & Logout */}
        {me && (
          <div className={`p-3 rounded-xl bg-gray-50 ${isCollapsed ? 'text-center' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 
                p-0.5 transform hover:scale-105 transition-transform mx-auto">
                <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center overflow-hidden">
                  {me.avatar ? (
                    <img src={me.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-500 
                      text-transparent bg-clip-text">
                      {(me.full_name?.[0] || "U").toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              {!isCollapsed && (
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 truncate">{me.full_name || "Người dùng"}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg
                text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors
                text-sm font-medium ${isCollapsed ? 'justify-center' : ''}`}
            >
              <LogOut className="w-4 h-4" />
              {!isCollapsed && <span>Đăng xuất</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}