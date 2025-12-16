"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axiosInstance from "../../ultis/axios";
import { io, Socket } from "socket.io-client";
import NotificationToast from "./NotificationToast";

let socket: Socket | null = null;

export function getSupervisorSocket() {
  if (!socket) {
    socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"]
    });
  }
  return socket;
}

export default function SupervisorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  
  const [me, setMe] = useState<{ _id?: string; id?: string; full_name?: string; email?: string; avatar?: string; role?: number; current_project?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetchedProjectId, setFetchedProjectId] = useState<string | null>(null);
  
  // Extract projectId from pathname if we're in a project
  const projectMatch = pathname?.match(/\/projects\/([^\/]+)/) || pathname?.match(/\/supervisor\/projects\/([^\/]+)/);
  const urlProjectId = projectMatch ? projectMatch[1] : null;
  
  // Use projectId from URL if available, otherwise use fetched projectId
  const projectId = urlProjectId || fetchedProjectId;
  
  useEffect(() => {
    setOpen(false);
    setShowDropdown(false);
  }, [pathname]);

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
        setMe(userData);
        
        const userId = userData?._id || userData?.id;

        // Get current project from supervisor's projects list
        try {
          if (userId) {
            const projectsRes = await axiosInstance.get(`/api/projects/supervisor/${userId}`);
            const supervisorData = projectsRes.data;
            const projects = Array.isArray(supervisorData?.data) ? supervisorData.data : [];

            if (Array.isArray(projects) && projects.length > 0) {
              const firstProject = projects[0];
              const newProjectId = firstProject?._id || firstProject?.id;
              if (newProjectId) {
                setFetchedProjectId(newProjectId);
              }
            } else if (userData?.current_project) {
              setFetchedProjectId(userData.current_project);
            }
          }
        } catch (err) {
          console.error('Error fetching projects:', err);
          if (userData?.current_project) {
            setFetchedProjectId(userData.current_project);
          }
        }
        
        if (userData?._id || userData?.id) {
          const userId = userData._id || userData.id;
          const sock = getSupervisorSocket();
          if (sock.connected) {
            sock.emit("join", userId.toString());
          } else {
            sock.once("connect", () => {
              sock.emit("join", userId.toString());
            });
          }
        }

      } catch {
        // ignore
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
    router.replace('/login');
  };

  const supervisorProjectBasePath = projectId ? `/supervisor/projects/${projectId}` : null;
  const supervisorProjectQuery = supervisorProjectBasePath ? `?project_id=${projectId}` : "";

  // Supervisor-specific navigation items
  const supervisorProjectNavItems = projectId ? [
    {
      href: `${supervisorProjectBasePath}/contributor${supervisorProjectQuery}`,
      label: "Thống kê",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      href: `/projects/${projectId}/tasks`,
      label: "Công việc",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      href: `/projects/${projectId}/features`,
      label: "Tính năng",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
      href: `/projects/${projectId}/functions`,
      label: "Chức năng",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      href: `/projects/${projectId}/milestones`,
      label: "Cột mốc",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    
    {
      href: `/projects/${projectId}/documents`,
      label: "Tài liệu",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      href: `/projects/${projectId}/team`,
      label: "Đội nhóm",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      href: `/calendar`,
      label: "Lịch họp",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
  ] : [];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        aria-controls="mobile-sidebar"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
      >
        <span className="sr-only">Mở sidebar</span>
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        id="mobile-sidebar"
        className={`fixed top-0 left-0 z-50 w-56 h-screen transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:hidden`}
        aria-label="Sidebar"
      >
        <div className="h-full bg-white border-r border-gray-200 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
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
              <Link href="/supervisor/projects" className="flex items-center gap-3">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    SEP Workspace
                  </h1>
                  <p className="text-xs text-gray-500">Supervisor</p>
                </div>
              </Link>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <div className="px-4 py-4">
            <div className="space-y-1">
              {/* Project-specific navigation */}
              {supervisorProjectNavItems.length > 0 ? (
                <>
                  <div className="px-2 py-1">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Dự án
                    </h3>
                  </div>
                  {supervisorProjectNavItems.map((item) => {
                    const itemHrefWithoutQuery = item.href.split("?")[0];
                    const projectRootPath = projectId ? `/projects/${projectId}` : null;
                    const supervisorRootPath = projectId ? `/supervisor/projects/${projectId}` : null;
                    
                    let active = false;
                    if (projectRootPath && itemHrefWithoutQuery === projectRootPath) {
                      active =
                        pathname === itemHrefWithoutQuery ||
                        (pathname?.startsWith(itemHrefWithoutQuery) &&
                          !pathname?.match(/\/projects\/[^\/]+\/(tasks|features|functions|documents|team|details|monitoring|notifications|messages|calendar)/));
                    } else if (supervisorRootPath && itemHrefWithoutQuery === supervisorRootPath) {
                      active =
                        pathname === itemHrefWithoutQuery ||
                        (pathname?.startsWith(itemHrefWithoutQuery) &&
                          !pathname?.match(/\/supervisor\/projects\/[^\/]+\/(contributor|task|kanban-board|progress-task|documents|team)/));
                    } else {
                      active = pathname === itemHrefWithoutQuery || pathname?.startsWith(itemHrefWithoutQuery + '/');
                    }
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                          active
                            ? "bg-purple-50 text-purple-700 border-l-4 border-purple-500"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <div className={`mr-3 flex-shrink-0 relative ${active ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                          {item.icon}
                        </div>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </>
              ) : projectId ? (
                // Show loading state if projectId exists but items are still loading
                <div className="px-2 py-1">
                  <p className="text-xs text-gray-400">Đang tải...</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 z-50">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
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
              <Link href="/supervisor/projects" className="flex items-center gap-3">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    SEP Workspace
                  </h1>
                  <p className="text-xs text-gray-500">Supervisor</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col px-4 py-4">
            <nav className="flex-1 space-y-2">
              {/* Project-specific navigation */}
              {supervisorProjectNavItems.length > 0 ? (
                <>
                  <div className="px-2 py-1">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Dự án
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {supervisorProjectNavItems.map((item) => {
                      const itemHrefWithoutQuery = item.href.split("?")[0];
                      const projectRootPath = projectId ? `/projects/${projectId}` : null;
                      const supervisorRootPath = projectId ? `/supervisor/projects/${projectId}` : null;
                      
                      let active = false;
                      if (projectRootPath && itemHrefWithoutQuery === projectRootPath) {
                        active =
                          pathname === itemHrefWithoutQuery ||
                          (pathname?.startsWith(itemHrefWithoutQuery) &&
                            !pathname?.match(/\/projects\/[^\/]+\/(tasks|features|functions|documents|team|details|monitoring|notifications|messages|calendar)/));
                      } else if (supervisorRootPath && itemHrefWithoutQuery === supervisorRootPath) {
                        active =
                          pathname === itemHrefWithoutQuery ||
                          (pathname?.startsWith(itemHrefWithoutQuery) &&
                            !pathname?.match(/\/supervisor\/projects\/[^\/]+\/(contributor|task|kanban-board|progress-task|documents|team)/));
                      } else {
                        active = pathname === itemHrefWithoutQuery || pathname?.startsWith(itemHrefWithoutQuery + '/');
                      }
                      
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                            active
                              ? "bg-purple-50 text-purple-700 border-l-4 border-purple-500"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <div className={`mr-3 flex-shrink-0 relative ${active ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                            {item.icon}
                          </div>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              ) : projectId ? (
                // Show loading state if projectId exists but items are still loading
                <div className="px-2 py-1">
                  <p className="text-xs text-gray-400">Đang tải...</p>
                </div>
              ) : null}
            </nav>
          </div>
        </div>
      </aside>
      <NotificationToast />
    </>
  );
}

