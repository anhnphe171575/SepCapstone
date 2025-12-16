"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

export default function NoProjectPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null;
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      <ResponsiveSidebar />
      <main className="p-4 md:p-6 md:ml-64 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 md:p-10 max-w-md text-center shadow-sm border border-gray-200">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2 tracking-tight text-gray-900">Chưa có dự án nào</h1>
          <p className="text-gray-600 mb-6">Hãy tạo dự án đầu tiên để bắt đầu quản lý công việc.</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => router.replace('/projects/new')} 
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              + Tạo dự án
            </button>
            <button
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200"
              onClick={() => router.replace('/dashboard')}
            >
              Quay lại
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}


