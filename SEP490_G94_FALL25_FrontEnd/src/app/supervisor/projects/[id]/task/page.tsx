"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams, useParams } from "next/navigation"
import axiosInstance from "../../../../../../ultis/axios"

import SupervisorSidebar from "@/components/SupervisorSidebar"
import QuickNav from "@/components/QuickNav"
import { GanttFilter } from "@/components/gantt-filter"
import type { GanttProject } from "@/components/gantt-chart"
import DHtmlxGanttChart from "@/components/DHtmlxGanttChart"
import TaskDetailsModal from "@/components/TaskDetailsModal"

type FlattenedTask = {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  progress?: number
  dependsOn?: string[]
  milestoneId: string
  featureId: string
  functionId: string
}

type ChartDependency = {
  _id: string
  task_id: string
  depends_on_task_id: { _id: string }
  dependency_type: "FS" | "FF" | "SS" | "SF"
}

type DependencyBucket = {
  dependencies: ChartDependency[]
  dependents: ChartDependency[]
}

type ApiMilestone = {
  id: string
  name: string
  features: Array<{
    id: string
    name: string
    functions: Array<{
      id: string
      name: string
    }>
  }>
}

export default function SupervisorTaskGanttPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  // Lấy projectId từ route parameter [id] hoặc từ query string (fallback)
  const projectId = (params?.id as string) || searchParams.get("project_id") || searchParams.get("projectId") || ""

  const [hierarchy, setHierarchy] = useState<ApiMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>("")

  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(new Set())
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set())
  const [selectedFunctions, setSelectedFunctions] = useState<Set<string>>(new Set())

  // Fetch hierarchy data
  useEffect(() => {
    if (!projectId) {
      setError("Không tìm thấy project ID")
      setLoading(false)
      return
    }

    const fetchHierarchy = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await axiosInstance.get(`/api/projects/${projectId}/gantt/hierarchy`)
        setHierarchy(response.data)
        
        // Fetch project name
        const projectResponse = await axiosInstance.get(`/api/projects/${projectId}`)
        setProjectName(projectResponse.data.topic || projectResponse.data.code || "Dự án")
      } catch (err: any) {
        console.error("Error fetching hierarchy:", err)
        setError(err.response?.data?.message || "Không thể tải dữ liệu")
      } finally {
        setLoading(false)
      }
    }

    fetchHierarchy()
  }, [projectId])

  const handleFilterChange = (filters: {
    milestones: Set<string>
    features: Set<string>
    functions: Set<string>
  }) => {
    setSelectedMilestones(filters.milestones)
    setSelectedFeatures(filters.features)
    setSelectedFunctions(filters.functions)
  }

  // Convert hierarchy to GanttProject format for filter
  const ganttProject: GanttProject | null = useMemo(() => {
    if (!hierarchy.length) return null
    
    return {
      id: projectId,
      name: projectName,
      milestones: hierarchy.map(m => ({
        id: m.id,
        name: m.name,
        features: m.features.map(f => ({
          id: f.id,
          name: f.name,
          functions: f.functions.map(fn => ({
            id: fn.id,
            name: fn.name,
            tasks: [] // Tasks will be fetched separately
          }))
        }))
      }))
    }
  }, [hierarchy, projectId, projectName])

  // Fetch tasks based on filters
  const [chartTasks, setChartTasks] = useState<any[]>([])
  const [dependencyMap, setDependencyMap] = useState<Record<string, DependencyBucket>>({})
  const [tasksLoading, setTasksLoading] = useState(false)

  // Task details modal state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [openTaskDetails, setOpenTaskDetails] = useState(false)

  const openTaskDetailsModal = (taskId: string) => {
    setSelectedTaskId(taskId)
    setOpenTaskDetails(true)
  }

  useEffect(() => {
    if (!projectId) return

    const fetchTasks = async () => {
      try {
        setTasksLoading(true)
        const params = new URLSearchParams()
        
        if (selectedMilestones.size > 0) {
          params.append("milestone_ids", Array.from(selectedMilestones).join(","))
        }
        if (selectedFeatures.size > 0) {
          params.append("feature_ids", Array.from(selectedFeatures).join(","))
        }
        if (selectedFunctions.size > 0) {
          params.append("function_ids", Array.from(selectedFunctions).join(","))
        }

        const response = await axiosInstance.get(
          `/api/projects/${projectId}/tasks/gantt?${params.toString()}`
        )
        
        setChartTasks(response.data.tasks || [])
        setDependencyMap(response.data.dependencies || {})
      } catch (err: any) {
        console.error("Error fetching tasks:", err)
        setChartTasks([])
        setDependencyMap({})
      } finally {
        setTasksLoading(false)
      }
    }

    fetchTasks()
  }, [projectId, selectedMilestones, selectedFeatures, selectedFunctions])

  // Export to Excel function
  const handleExportExcel = async () => {
    if (chartTasks.length === 0) {
      alert("Không có dữ liệu để xuất Excel")
      return
    }

    try {
      // Dynamic import xlsx to avoid SSR issues
      const XLSX = await import("xlsx")

      // Prepare data for Excel
      const excelData = chartTasks.map((task) => {
        const deps = dependencyMap[task._id]
        const dependencies = deps?.dependencies || []
        const dependents = deps?.dependents || []
        
        const dependencyNames = dependencies
          .map((dep: any) => {
            const depTask = chartTasks.find((t: any) => t._id === dep.depends_on_task_id?._id)
            return depTask?.title || dep.depends_on_task_id?._id
          })
          .join(", ")
        
        const dependentNames = dependents
          .map((dep: any) => {
            const depTask = chartTasks.find((t: any) => t._id === dep.depends_on_task_id?._id)
            return depTask?.title || dep.depends_on_task_id?._id
          })
          .join(", ")

        return {
          "Tên Công việc": task.title || "",
          "Ngày Bắt đầu": task.start_date || "",
          "Ngày Kết thúc": task.deadline || "",
          "Trạng thái": task.status_name || task.status || "",
          "Tiến độ (%)": task.progress || 0,
          "Người được giao": task.assignee_id?.full_name || task.assignee_id?.email || "Chưa phân công",
          "Phụ thuộc": dependencyNames || "Không có",
          "Phụ thuộc vào": dependentNames || "Không có",
        }
      })

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Công việc Gantt")

      // Set column widths
      const colWidths = [
        { wch: 40 }, // Task Name
        { wch: 12 }, // Start Date
        { wch: 12 }, // End Date
        { wch: 15 }, // Status
        { wch: 12 }, // Progress
        { wch: 25 }, // Assignee
        { wch: 40 }, // Dependencies
        { wch: 40 }, // Dependents
      ]
      ws["!cols"] = colWidths

      // Generate filename with project name and date
      const dateStr = new Date().toISOString().split("T")[0]
      const sanitizedProjectName = (projectName || "Dự án").replace(/[^a-zA-Z0-9]/g, "_")
      const filename = `Gantt_Chart_${sanitizedProjectName}_${dateStr}.xlsx`

      // Export file
      XLSX.writeFile(wb, filename)
    } catch (error) {
      console.error("Error exporting Excel:", error)
      alert("Có lỗi xảy ra khi xuất Excel. Vui lòng thử lại.")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SupervisorSidebar />
      <main className="min-h-screen px-6 py-8 md:ml-64 md:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          {/* QuickNav - Always at the top */}
          <QuickNav selectedProject={projectId || undefined} />

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Supervisor Dashboard</p>
              <h1 className="text-3xl font-bold text-slate-900">Biểu đồ Gantt Dự án</h1>
              <p className="mt-2 text-sm text-slate-500">
                Quan sát các công việc theo mốc thời gian. Lọc nhanh theo milestone, feature và function để kiểm soát tiến độ nhóm.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {chartTasks.length > 0 && (
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  title="Xuất Excel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Xuất Excel
                </button>
              )}
             
            </div>
          </div>

          <section className="space-y-6">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-400">
                Đang tải dữ liệu...
              </div>
            ) : error ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-red-600">
                {error}
              </div>
            ) : !ganttProject ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-400">
                Không có dữ liệu milestone, feature, function.
              </div>
            ) : (
              <>
                <GanttFilter milestones={ganttProject.milestones} onFilterChange={handleFilterChange} />

                {tasksLoading ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-400">
                    Đang tải công việc...
                  </div>
                ) : chartTasks.length > 0 ? (
                  <DHtmlxGanttChart 
                    tasks={chartTasks} 
                    dependencies={dependencyMap}
                    onTaskClick={openTaskDetailsModal}
                  />
                ) : (
                  <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-400">
                    Không có task phù hợp bộ lọc hiện tại.
                  </div>
                )}
              </>
            )}
          </section>

          {/* Task Details Modal */}
          {selectedTaskId && (
            <TaskDetailsModal
              open={openTaskDetails}
              onClose={() => {
                setOpenTaskDetails(false)
                setSelectedTaskId(null)
              }}
              taskId={selectedTaskId}
              projectId={projectId || undefined}
              onUpdate={() => {
                // Reload tasks if needed
                const fetchTasks = async () => {
                  try {
                    setTasksLoading(true)
                    const params = new URLSearchParams()
                    
                    if (selectedMilestones.size > 0) {
                      params.append("milestone_ids", Array.from(selectedMilestones).join(","))
                    }
                    if (selectedFeatures.size > 0) {
                      params.append("feature_ids", Array.from(selectedFeatures).join(","))
                    }
                    if (selectedFunctions.size > 0) {
                      params.append("function_ids", Array.from(selectedFunctions).join(","))
                    }

                    const response = await axiosInstance.get(
                      `/api/projects/${projectId}/tasks/gantt?${params.toString()}`
                    )
                    
                    setChartTasks(response.data.tasks || [])
                    setDependencyMap(response.data.dependencies || {})
                  } catch (err: any) {
                    console.error("Error fetching tasks:", err)
                    setChartTasks([])
                    setDependencyMap({})
                  } finally {
                    setTasksLoading(false)
                  }
                }
                fetchTasks()
              }}
              readonly={true}
            />
          )}
        </div>
      </main>
    </div>
  )
}
