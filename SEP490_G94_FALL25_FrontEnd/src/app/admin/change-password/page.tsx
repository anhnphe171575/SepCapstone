"use client";

import LeftSidebarHeader from "../dashboard-admin/herder";
import ChangePasswordPage from "@/app/change-password/page";

export default function AdminChangePasswordPage() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <LeftSidebarHeader />
      <main className="flex-1 ml-64 p-6">
        <ChangePasswordPage />
      </main>
    </div>
  );
}









