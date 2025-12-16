"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '../../ultis/axios';

const Page = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Kiểm tra token
        const token =
          typeof window !== "undefined"
            ? sessionStorage.getItem("token") || localStorage.getItem("token")
            : null;

        if (!token) {
          router.push('/login');
          return;
        }

        // Lấy thông tin user và role
        const res = await axiosInstance.get('/api/users/me');
        const userData = res.data || null;
        const userRole = userData?.role;

        // Chuyển hướng theo role
        if (userRole === 4) {
          // SUPERVISOR (supervisor)
          router.replace('/supervisor/projects');
        } else if (userRole === 8 || userRole === 0) {
          // ADMIN hoặc ADMIN_DEVELOPER
          router.replace('/admin/dashboard');
        } else {
          // STUDENT hoặc các role khác
          router.replace('/dashboard');
        }
      } catch (error) {
        // Nếu có lỗi (token không hợp lệ), chuyển đến trang login
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // Hiển thị loading trong khi kiểm tra
  if (loading) {
    return null;
  }

  return null;
};

export default Page;