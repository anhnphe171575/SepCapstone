"use client";

import { useEffect, useState } from "react";
import axiosInstance from "../../ultis/axios";
import ResponsiveSidebar from "./ResponsiveSidebar";
import SupervisorSidebar from "./SupervisorSidebar";

export default function SidebarWrapper() {
  const [isSupervisor, setIsSupervisor] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? sessionStorage.getItem("token") || localStorage.getItem("token")
            : null;
        if (!token) {
          setIsSupervisor(false);
          return;
        }

        const res = await axiosInstance.get('/api/users/me');
        const userData = res.data || null;
        setIsSupervisor(userData?.role === 4);
      } catch {
        setIsSupervisor(false);
      }
    })();
  }, []);

  // Show nothing while checking
  if (isSupervisor === null) {
    return null;
  }

  // Render appropriate sidebar
  if (isSupervisor) {
    return <SupervisorSidebar />;
  }

  return <ResponsiveSidebar />;
}

