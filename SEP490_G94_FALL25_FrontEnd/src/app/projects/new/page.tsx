"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "../../../../ultis/axios";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

interface SemesterInfo {
  currentSemester: string;
  semesterInfo: {
    semester: string;
    season: string;
    year: number;
    displayName: string;
    seasonName: string;
  };
  message: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    topic?: string;
    code?: string;
  }>({});
  const [semesterInfo, setSemesterInfo] = useState<SemesterInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Lấy thông tin semester hiện tại
  useEffect(() => {
    const fetchSemesterInfo = async () => {
      try {
        const res = await axiosInstance.get('/api/projects/semester/current');
        setSemesterInfo(res.data);
      } catch (error) {
        console.error('Lỗi khi lấy thông tin semester:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSemesterInfo();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFieldErrors({});
    setError(null);

    // Validation phía client
    const newFieldErrors: { topic?: string; code?: string } = {};

    if (!topic.trim()) {
      newFieldErrors.topic = 'Vui lòng nhập tên dự án';
    }

    if (!code.trim()) {
      newFieldErrors.code = 'Vui lòng nhập mã dự án';
    } else if (code.trim().length < 3) {
      newFieldErrors.code = 'Mã dự án phải có ít nhất 3 ký tự';
    }

    // Nếu có lỗi validation, hiển thị và dừng lại
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const projectData = {
        topic: topic.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        status: 'planned' // Mặc định là planned
      };

      const res = await axiosInstance.post('/api/projects', projectData);

      if (res.status === 201) {
        const projectId = res.data?.project?._id || res.data?._id;
        if (projectId) {
          try {
            await axiosInstance.post(`/api/projects/${projectId}/seed-templates`);
          } catch (seedErr) {
            console.error('Lỗi nạp template mặc định:', seedErr);
          }
          router.replace('/dashboard');
        }
      }

    } catch (e: any) {
      console.error('Lỗi tạo dự án:', e);

      // Xử lý các loại lỗi khác nhau từ backend
      if (e?.response?.status === 409) {
        if (e?.response?.data?.existingProject) {
          setError(`Bạn đã tạo dự án "${e.response.data.existingProject.topic}" trong học kì ${e.response.data.existingProject.semester}. Mỗi sinh viên chỉ có thể tạo 1 dự án trong 1 học kì.`);
        } else {
          setError('Mã dự án đã tồn tại. Vui lòng chọn mã khác.');
        }
      } else if (e?.response?.status === 400) {
        setError(e?.response?.data?.message || 'Thông tin dự án không hợp lệ');
      } else if (e?.response?.status === 403) {
        setError('Bạn không có quyền tạo dự án');
      } else {
        setError(e?.response?.data?.message || 'Tạo dự án thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <main className="p-4 md:p-8">
          <div className="mx-auto w-full max-w-3xl">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 md:p-10">
              <div className="flex items-center justify-center">
                <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="ml-3 text-gray-600">Đang tải thông tin...</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      
      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        <div className="mx-auto w-full max-w-3xl">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Tạo dự án mới
            </h1>
            <p className="text-gray-600 text-lg">Bắt đầu hành trình phát triển dự án của bạn</p>

            {/* Semester Info */}
            {semesterInfo && (
              <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {semesterInfo.semesterInfo.displayName}
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-blue-800">Thông tin quan trọng</h3>
              </div>
              <div className="text-sm text-blue-700 space-y-2">
                <p>• Dự án sẽ được tạo cho học kì hiện tại: <strong>{semesterInfo?.semesterInfo.displayName}</strong></p>
                <p>• Mỗi sinh viên chỉ có thể tạo <strong>1 dự án trong 1 học kì</strong></p>
                <p>• Khi tạo dự án, bạn sẽ tự động được nâng cấp thành <strong>Student Leader</strong></p>
                <p>• Dự án sẽ có các tính năng quản lý milestone và timeline</p>
                <p>• Sau khi tạo, hệ thống sẽ tự động khởi tạo 11 tài liệu mẫu trong Documents</p>
              </div>
            </div>
          </div>
            <br />
          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 md:p-10">
            <form onSubmit={onSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700 text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Project Name Field */}
              <div className="space-y-3">
                <label className="text-base font-semibold text-gray-700 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>Tên dự án</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      if (fieldErrors.topic) {
                        setFieldErrors(prev => ({ ...prev, topic: undefined }));
                      }
                    }}
                    className={`w-full px-5 py-4 text-base text-black border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400 ${
                      fieldErrors.topic 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-200 focus:ring-blue-500'
                    }`}
                    placeholder="Ví dụ: SEP490 G94 - Hệ thống quản lý dự án"
                    maxLength={250}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                {fieldErrors.topic && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.topic}
                  </p>
                )}
                <p className="text-sm text-gray-500">Tên dự án phải rõ ràng và mô tả được nội dung chính</p>
              </div>

              {/* Project Code Field */}
              <div className="space-y-3">
                <label className="text-base font-semibold text-gray-700 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>Mã dự án</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (fieldErrors.code) {
                        setFieldErrors(prev => ({ ...prev, code: undefined }));
                      }
                    }}
                    className={`w-full px-5 py-4 text-base text-black border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400 uppercase tracking-wider font-mono ${
                      fieldErrors.code 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-200 focus:ring-indigo-500'
                    }`}
                    placeholder="VD: SEP490"
                    maxLength={50}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  </div>
                </div>
                {fieldErrors.code && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.code}
                  </p>
                )}
                <p className="text-sm text-gray-500">Mã dự án phải có ít nhất 3 ký tự và không được trùng lặp</p>
              </div>

              {/* Description Field */}
              <div className="space-y-3">
                <label className="text-base font-semibold text-gray-700 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Mô tả dự án</span>
                  <span className="text-gray-400">(Tùy chọn)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-5 py-4 text-base text-black border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-400 resize-none"
                  placeholder="Mô tả ngắn gọn về dự án của bạn..."
                  rows={4}
                  maxLength={2000}
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Mô tả chi tiết về mục tiêu và phạm vi dự án</span>
                  <span>{description.length}/2000</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-8">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-8 py-4 text-base border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Hủy</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-8 py-4 text-base bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
                >
                  {submitting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Đang tạo dự án & khởi tạo tài liệu...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Tạo dự án</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}


