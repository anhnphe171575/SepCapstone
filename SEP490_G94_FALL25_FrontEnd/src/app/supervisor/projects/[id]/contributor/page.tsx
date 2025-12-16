"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import axiosInstance from "../../../../../../ultis/axios";
import SupervisorSidebar from "@/components/SupervisorSidebar";
import QuickNav from "@/components/QuickNav";

type TypeKey = "Simple" | "Medium" | "Complex" | "Very Complex";

type TypeCounts = Record<TypeKey, number>;

type MemberInfo = {
  user_id: string | null;
  full_name: string;
  email: string | null;
  avatar: string | null;
};

type MemberContribution = {
  member: MemberInfo;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  estimate_hours: number;
  actual_hours: number;
  type_counts: TypeCounts;
  completion_rate: number;
  workload_share: number;
  type_complexity_score?: number;
};

type ContributionResponse = {
  project_id: string;
  totals: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    todo_tasks: number;
    total_estimate_hours: number;
    total_actual_hours: number;
    type_counts: TypeCounts;
  };
  members: MemberContribution[];
  unassigned: (MemberContribution & { member: MemberInfo }) | null;
  metadata: {
    feature_count: number;
    function_count: number;
    team_members: number;
  };
};

type ProjectOption = {
  value: string;
  label: string;
  code?: string;
};

type ProjectInfo = {
  _id: string;
  topic?: string;
  code?: string;
  description?: string;
  semester?: string;
  status?: string;
};

const TYPE_DISPLAY_ORDER: TypeKey[] = ["Very Complex", "Complex", "Medium", "Simple"];

const TYPE_BAR_COLOR: Record<TypeKey, string> = {
  Simple: "bg-slate-300",
  Medium: "bg-slate-400",
  Complex: "bg-slate-500",
  "Very Complex": "bg-slate-600",
};

const TYPE_BADGE_COLOR: Record<TypeKey, string> = {
  Simple: "bg-slate-100 text-slate-700",
  Medium: "bg-slate-200 text-slate-700",
  Complex: "bg-slate-300 text-slate-800",
  "Very Complex": "bg-slate-400 text-slate-900",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: "bg-slate-200 text-slate-700",
  completed: "bg-slate-300 text-slate-800",
  "on-hold": "bg-slate-100 text-slate-600",
  planned: "bg-slate-100 text-slate-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const formatNumber = (value: number | undefined) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "0";
  return value.toLocaleString("vi-VN");
};

const formatPercent = (value: number | undefined) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "0%";
  return `${value.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
};

const getInitials = (fullName: string) => {
  if (!fullName) return "U";
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length === 0) return fullName.charAt(0).toUpperCase();
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const ContributionPlaceholder = ({ message }: { message: string }) => (
  <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
    <svg className="mb-4 h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
    </svg>
    <p className="max-w-md text-sm text-slate-500">{message}</p>
  </div>
);

export default function ContributorDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  // Lấy projectId từ route parameter [id] hoặc từ query string (fallback)
  const projectId = (params?.id as string) || searchParams.get("project_id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [contribution, setContribution] = useState<ContributionResponse | null>(null);
  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  const [unassignedTasks, setUnassignedTasks] = useState<any[]>([]);
  const [loadingUnassignedTasks, setLoadingUnassignedTasks] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("token") || localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    let ignore = false;

    const fetchProjects = async () => {
      try {
        setIsFetchingProjects(true);
        const profileResponse = await axiosInstance.get("/api/users/profile");
        const currentUser = profileResponse.data;

        const projectResponse = await axiosInstance.get(`/api/projects/supervisor/${currentUser._id}`);
        const data = projectResponse.data;

        const projectList: ProjectOption[] = Array.isArray(data?.data)
          ? data.data.map((proj: any) => ({
              value: proj._id,
              label: proj.topic || "Dự án không tên",
              code: proj.code,
            }))
          : [];

        if (!ignore) {
          setProjects(projectList);
        }

        // Auto-select first project if none provided and list not empty
        if (!projectId && projectList.length > 0) {
          router.replace(`/supervisor/contributor?project_id=${projectList[0].value}`, { scroll: false });
        }
      } catch (err: any) {
        console.error("Error loading projects:", err);
        if (!ignore) {
          setProjects([]);
        }
      } finally {
        if (!ignore) {
          setIsFetchingProjects(false);
        }
      }
    };

    fetchProjects();
    return () => {
      ignore = true;
    };
  }, [router]);

  useEffect(() => {
    if (!projectId) {
      setContribution(null);
      setProjectInfo(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchContribution = async () => {
      try {
        setLoading(true);
        setError(null);

        const [contributionRes, projectRes] = await Promise.all([
          axiosInstance.get(`/api/tasks/dashboard/contribution`, { params: { project_id: projectId } }),
          axiosInstance
            .get(`/api/projects/${projectId}`)
            .catch(() => ({ data: null })), // project info optional
        ]);

        if (cancelled) return;

        const contributionData = contributionRes.data as ContributionResponse;
        // Debug: Check user_id format in response
        if (contributionData?.members && contributionData.members.length > 0) {
          console.log('Sample member user_id:', contributionData.members[0].member.user_id, typeof contributionData.members[0].member.user_id);
        }
        setContribution(contributionData);
        setProjectInfo(projectRes?.data || null);
      } catch (err: any) {
        if (!cancelled) {
          console.error("Error fetching contribution:", err);
          setError(err?.response?.data?.message || "Không thể tải dữ liệu đóng góp");
          setContribution(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const fetchUnassignedTasks = async () => {
      if (!projectId) {
        setUnassignedTasks([]);
        return;
      }

      try {
        setLoadingUnassignedTasks(true);
        const tasksRes = await axiosInstance.get(`/api/projects/${projectId}/tasks`, { 
          params: { pageSize: 500 } 
        });
        
        const allTasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
        // Filter tasks without assignee_id
        const unassigned = allTasks.filter((task: any) => {
          // Check if assignee_id is null, undefined, empty string, or empty object
          if (!task.assignee_id) return true;
          if (typeof task.assignee_id === 'object' && Object.keys(task.assignee_id).length === 0) return true;
          if (typeof task.assignee_id === 'string' && task.assignee_id.trim() === '') return true;
          return false;
        });
        
        setUnassignedTasks(unassigned);
      } catch (err: any) {
        console.error("Error fetching unassigned tasks:", err);
        setUnassignedTasks([]);
      } finally {
        setLoadingUnassignedTasks(false);
      }
    };

    fetchContribution();
    fetchUnassignedTasks();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const typeDistribution = useMemo(() => {
    if (!contribution) {
      return {
        entries: [] as Array<{ type: TypeKey; count: number }>,
        total: 0,
      };
    }
    const entries = TYPE_DISPLAY_ORDER.map((type) => ({
      type,
      count: contribution.totals.type_counts[type],
    }));
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    return {
      entries,
      total,
    };
  }, [contribution]);

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!value) {
      router.replace(`/supervisor/contributor`, { scroll: false });
    } else {
      router.replace(`/supervisor/contributor?project_id=${value}`, { scroll: false });
    }
  };

  const renderMemberRow = (member: MemberContribution, index: number) => {
    const avatarLetter = getInitials(member.member.full_name);
    // Extract user_id - handle both string and object formats
    let userId: string | null = null;
    const rawUserId = member.member.user_id;
    
    if (rawUserId) {
      if (typeof rawUserId === 'string') {
        // Already a string, use it directly
        userId = rawUserId.trim();
      } else if (typeof rawUserId === 'object' && rawUserId !== null) {
        // It's an object, extract _id
        const obj = rawUserId as any;
        if (obj._id) {
          userId = typeof obj._id === 'string' ? obj._id : obj._id.toString();
        } else if (obj.id) {
          userId = typeof obj.id === 'string' ? obj.id : obj.id.toString();
        } else {
          // Last resort: try toString but validate it's a valid ObjectId format
          const str = obj.toString?.();
          if (str && str.length === 24 && /^[0-9a-fA-F]{24}$/.test(str)) {
            userId = str;
          } else {
            console.warn('Cannot extract valid userId from object:', rawUserId);
            userId = null;
          }
        }
      }
    }
    
    // Final validation: ensure userId is a valid 24-character hex string (MongoDB ObjectId format)
    // But be more lenient - if it's a string and not empty, use it
    if (userId) {
      const trimmed = userId.trim();
      if (trimmed.length === 24 && /^[0-9a-fA-F]{24}$/.test(trimmed)) {
        userId = trimmed;
      } else if (trimmed.length > 0) {
        // If it's not a valid ObjectId but is a non-empty string, still use it (might be a different ID format)
        console.warn('userId is not in standard ObjectId format but using it anyway:', trimmed);
        userId = trimmed;
      } else {
        userId = null;
      }
    }
    
    // Debug logging for first member
    if (index === 0) {
      console.log('First member debug:', {
        rawUserId,
        userId,
        projectId,
        userIdType: typeof userId,
        userIdLength: userId?.length,
        willCreateHref: !!(userId && projectId)
      });
    }
    
    const detailHref =
      userId && projectId && typeof userId === 'string' && userId.length > 0
        ? `/supervisor/contributor/detail?userId=${encodeURIComponent(userId)}&project_id=${encodeURIComponent(projectId)}`
        : null;

    const topTypes = TYPE_DISPLAY_ORDER.filter((type) => member.type_counts[type] > 0).slice(0, 3);

    return (
      <tr key={`${member.member.user_id || "unassigned"}-${index}`} className="border-b last:border-b-0 border-slate-100">
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-semibold">
              {avatarLetter}
            </div>
            <div>
              <p className="font-medium text-slate-900">{member.member.full_name || "Chưa cập nhật"}</p>
              <p className="text-sm text-slate-500">{member.member.email || "Không có email"}</p>
            </div>
          </div>
        </td>

        <td className="px-4 py-4">
          <div className="flex items-end gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">{formatNumber(member.completed_tasks)}</p>
              <p className="text-xs text-slate-500">Hoàn thành</p>
            </div>
            <div className="text-sm text-slate-500">/</div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{formatNumber(member.total_tasks)}</p>
              <p className="text-xs text-slate-500">Tổng task</p>
            </div>
          </div>
        </td>

        <td className="px-4 py-4">
          <p className="text-lg font-semibold text-slate-900">{formatPercent(member.completion_rate)}</p>
          <p className="text-xs text-slate-500">Tỉ lệ hoàn thành</p>
        </td>

        <td className="px-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Chiếm</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {formatPercent(member.workload_share)}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {topTypes.length === 0 ? (
                <span className="text-xs text-slate-400">Chưa có task theo loại</span>
              ) : (
                topTypes.map((type) => (
                  <span key={type} className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_COLOR[type]}`}>
                    {type}: {member.type_counts[type]}
                  </span>
                ))
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Trạng thái</span>
                <span className="text-xs text-slate-500">{formatNumber(member.total_tasks)} task</span>
              </div>
              <div className="flex h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                {[
                  { key: "done", value: member.completed_tasks, bar: "bg-emerald-500" },
                  { key: "doing", value: member.in_progress_tasks, bar: "bg-blue-500" },
                  { key: "todo", value: member.todo_tasks, bar: "bg-amber-500" },
                ].map((segment) => {
                  const total = member.total_tasks || 1;
                  const share = segment.value / total;
                  if (share <= 0) return null;
                  return (
                    <div
                      key={segment.key}
                      className={`${segment.bar} transition-all duration-300`}
                      style={{ width: `${Math.max(share * 100, 4)}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  {
                    key: "completed",
                    label: "Hoàn thành",
                    value: member.completed_tasks,
                    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
                  },
                  {
                    key: "inProgress",
                    label: "Đang làm",
                    value: member.in_progress_tasks,
                    badge: "bg-blue-50 text-blue-700 border border-blue-200",
                  },
                  {
                    key: "todo",
                    label: "Chưa làm",
                    value: member.todo_tasks,
                    badge: "bg-amber-50 text-amber-700 border border-amber-200",
                  },
                ].map((status) => (
                  <span
                    key={status.key}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.badge}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                    {status.label}: <span className="font-semibold">{formatNumber(status.value)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </td>

        <td className="px-4 py-4">
          <div className="space-y-1 text-sm text-slate-500">
            <div>Ước tính: <span className="font-medium text-slate-700">{formatNumber(member.estimate_hours)}h</span></div>
            <div>Thực tế: <span className="font-medium text-slate-700">{formatNumber(member.actual_hours)}h</span></div>
          </div>
        </td>

        
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SupervisorSidebar />
      <main className="min-h-screen px-6 py-8 md:ml-64 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          {/* QuickNav - Always at the top
          <div className="mb-6">
            <QuickNav selectedProject={projectId || undefined} />
          </div> */}
          
          {error && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Không thể tải dữ liệu</h2>
                  <p className="mt-1 text-sm text-slate-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!projectId && !loading && (
            <ContributionPlaceholder message="Hãy chọn một dự án để xem thông tin đóng góp của các thành viên." />
          )}

          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
                <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu đóng góp...</p>
              </div>
            </div>
          ) : contribution ? (
            <div className="space-y-6">
              <section className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-lg border border-slate-200 bg-white p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Tổng quan công việc</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Số lượng task, thời gian ước tính và trạng thái hoàn thành toàn dự án.
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tổng task</p>
                        <p className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(contribution.totals.total_tasks)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Hoàn thành</p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900">
                          {formatNumber(contribution.totals.completed_tasks)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Đang xử lý</p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900">
                          {formatNumber(contribution.totals.in_progress_tasks)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Chưa bắt đầu</p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900">
                          {formatNumber(contribution.totals.todo_tasks)}
                        </p>
                      </div>
                    </div>

                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Đóng góp theo thành viên</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Sắp xếp theo số lượng task hoàn thành, tổng task và độ phức tạp đảm nhiệm.
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatNumber(contribution.members.length)} thành viên có task
                      </span>
                    </div>

                    {contribution.members.length === 0 ? (
                      <ContributionPlaceholder message="Chưa có thành viên nào được giao task trong dự án này." />
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-slate-100">
                        <div className="max-h-[560px] overflow-auto">
                          <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Thành viên</th>
                                <th className="px-4 py-3">Task</th>
                                <th className="px-4 py-3">Hoàn thành</th>
                                <th className="px-4 py-3">Tỉ lệ & loại task</th>
                                <th className="px-4 py-3">Thời gian</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {contribution.members.map((member, idx) => renderMemberRow(member, idx))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                
                
              </section>              
            </div>
          ) : null}
        </div>
      </main>
    </div>  
       
    );
}