// lib/axios.js
import axios from 'axios';
import { useState } from 'react';

// Debug log để kiểm tra env


const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' 
      ? (sessionStorage.getItem('token') || localStorage.getItem('token')) 
      : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData, let axios handle it automatically
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      
      // Kiểm tra và đảm bảo projectId/project_id được truyền trong FormData
      const hasProjectId = config.data.has('projectId') || config.data.has('project_id');
      
      // Nếu URL chứa projectId và FormData chưa có, thêm vào
      if (!hasProjectId && config.url) {
        const projectIdMatch = config.url.match(/\/projects\/([^\/]+)/);
        if (projectIdMatch && projectIdMatch[1]) {
          const projectId = projectIdMatch[1];
          // Thử lấy project_id trước, nếu không có thì thêm
          if (!config.data.has('project_id')) {
            config.data.append('project_id', projectId);
            if (process.env.NODE_ENV === 'development') {
              console.log('Auto-added project_id to FormData from URL:', projectId);
            }
          }
        }
      }
      
      // Debug: Log FormData contents in development
      if (process.env.NODE_ENV === 'development') {
        const formDataEntries = [];
        for (const [key, value] of config.data.entries()) {
          formDataEntries.push({ key, value: value instanceof File ? value.name : value });
        }
        console.log('FormData request:', {
          url: config.url,
          method: config.method?.toUpperCase(),
          entries: formDataEntries,
          hasProjectId: config.data.has('projectId') || config.data.has('project_id')
        });
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      // Log request details for debugging
      console.log('API Request:', {
        url: config.url,
        method: config.method?.toUpperCase(),
        hasAuth: !!token,
        dataType: config.data instanceof FormData ? 'FormData' : typeof config.data
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Đảm bảo projectId được trả về trong response nếu request có projectId
    if (response.data && response.config?.url) {
      const projectIdMatch = response.config.url.match(/\/projects\/([^\/]+)/);
      if (projectIdMatch && projectIdMatch[1]) {
        const projectId = projectIdMatch[1];
        // Nếu response.data là object và chưa có projectId, thêm vào
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          if (!response.data.projectId && !response.data.project_id) {
            response.data.projectId = projectId;
          }
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        url: response.config?.url,
        method: response.config?.method?.toUpperCase(),
        status: response.status,
        statusText: response.statusText,
        hasProjectId: response.data?.projectId || response.data?.project_id
      });
    }
    return response;
  },
  (error) => {
    // Xử lý lỗi chung
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        const pathname = window.location.pathname || '';
        const requestUrl = error.config?.url || '';

        const isMessagesPage = pathname.includes('/messages');
        const isAuthPage = pathname.includes('/login') || pathname.includes('/register');
        const isAuthApi =
          requestUrl.includes('/api/auth/login') ||
          requestUrl.includes('/api/auth/register') ||
          requestUrl.includes('/api/auth/google');

        const shouldRedirect = !isMessagesPage && !isAuthPage && !isAuthApi;
        if (shouldRedirect) {
          window.location.href = '/login';
        }
      }
    }
    if (error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname || '';
        const requestUrl = error.config?.url || '';

        const isMessagesPage = pathname.includes('/messages');
        const isTeamApi = requestUrl.includes('/api/team/');
        const isMessagesApi = requestUrl.includes('/api/messages/');
        const isAuthPage = pathname.includes('/login') || pathname.includes('/register');
        const isAuthApi = requestUrl.includes('/api/auth/');
        const isProjectApi = requestUrl.includes('/api/projects/');

        const shouldSkipRedirect =
          (isMessagesPage && (isTeamApi || isMessagesApi)) ||
          isAuthPage ||
          isAuthApi ||
          isProjectApi; // Với project (edit/delete) đã có UI alert, tránh redirect not-found

        if (!shouldSkipRedirect) {
          window.location.href = '/not-found';
        }
      }
    }
    
    if (error.response?.status === 400) {
      // Xử lý lỗi 400 - Bad Request
      const errorData = error.response.data;
      const errorMessage = errorData?.message || errorData?.error || 'Bad Request';
      const errorUrl = error.config?.url || 'Unknown URL';
      
      // Log chi tiết cho các lỗi liên quan đến projectId
      if (errorMessage.includes('projectId') || errorMessage.includes('project_id') || errorMessage.includes('Thiếu tham số')) {
        console.error('Bad Request (400) - Missing projectId:', {
          url: errorUrl,
          message: errorMessage,
          data: errorData,
          method: error.config?.method?.toUpperCase(),
          requestData: error.config?.data
        });
      } else {
        console.error('Bad Request (400):', {
          url: errorUrl,
          message: errorMessage,
          data: errorData
        });
      }
    }
    
    if (error.response?.status === 500) {
      // Log error với thông tin chi tiết hơn
      const errorData = error.response.data;
      const errorMessage = errorData?.message || errorData?.error || 'Internal Server Error';
      const errorUrl = error.config?.url || 'Unknown URL';
      
      console.error('Server Error (500):', {
        url: errorUrl,
        message: errorMessage,
        data: errorData,
        status: error.response.status,
        statusText: error.response.statusText
      });
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

// Export các method thường dùng
export const api = {
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  patch: (url, data, config) => axiosInstance.patch(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),
  
 
};

// Utility functions cho các trường hợp đặc biệt
export const apiUtils = {
  // Upload file
  uploadFile: (url, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return axiosInstance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
  
  // Download file
  downloadFile: async (url, filename) => {
    try {
      const response = await axiosInstance.get(url, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },

  // Create review
  createReview: async (reviewData) => {
    try {
      const response = await axiosInstance.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      console.error('Create review failed:', error);
      throw error;
    }
  },
};

// Custom hooks cho React components
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const request = async (apiCall) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      return response.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { request, loading, error };
};