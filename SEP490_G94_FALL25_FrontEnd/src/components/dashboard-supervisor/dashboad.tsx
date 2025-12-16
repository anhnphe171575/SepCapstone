"use client"

import { useMemo, useState, type ChangeEvent, type MouseEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Circle, ChevronRight, Plus, Search, Filter, X, Users, CalendarDays, Cpu, Layers } from "lucide-react"

function Button({ className = "", variant = "default", size = "md", ...props }: any) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-muted text-foreground hover:bg-muted/70",
  }
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
    lg: "h-10 px-6 text-sm",
    icon: "h-9 w-9",
  }
  return <button className={`${base} ${variants[variant] ?? variants.default} ${sizes[size] ?? sizes.md} ${className}`} {...props} />
}

function Input({ className = "", ...props }: any) {
  return (
    <input
      className={`h-9 w-full bg-background text-foreground border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    />
  )
}

function Select({ className = "", children, ...props }: any) {
  return (
    <select
      className={`h-9 bg-background text-foreground border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

function Badge({ className = "", children, variant = "default" }: any) {
  const variants: Record<string, string> = {
    default: "bg-muted text-foreground",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    purple: "bg-purple-100 text-purple-800",
    amber: "bg-amber-100 text-amber-800",
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>{children}</span>
}

function Progress({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 w-full rounded-full bg-muted overflow-hidden ${className}`}>
      <div className="h-full bg-chart-1 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }}></div>
    </div>
  )
}

export type Project = {
  id: number
  name: string
  description: string
  status: "not-started" | "in-progress" | "completed" | "submitted"
  completion: number
  deadline: string
  members: { name: string; role: string; email: string }[]
  techStack: string[]
  milestones: { id: number; title: string; description: string; dueDate: string; completed: boolean; notes: string }[]
}

export function initializeMockData(): Project[] {
  return [
    {
      id: 1,
      name: "Nền Tảng Chatbot AI",
      description: "Chatbot thông minh dùng NLP và ML",
      status: "in-progress",
      completion: 65,
      deadline: "2025-02-28",
      members: [
        { name: "Nguyễn Văn A", role: "Lead Dev", email: "a@example.com" },
        { name: "Trần Thị B", role: "UI/UX", email: "b@example.com" },
        { name: "Lê Văn C", role: "DBA", email: "c@example.com" },
      ],
      techStack: ["React", "Node.js", "MongoDB", "Python"],
      milestones: [
        { id: 1, title: "Yêu Cầu", description: "Thu thập yêu cầu", dueDate: "2024-12-05", completed: true, notes: "" },
        { id: 2, title: "Phân Tích", description: "Đặc tả nghiệp vụ", dueDate: "2024-12-10", completed: true, notes: "" },
        { id: 3, title: "Thiết Kế", description: "Mockup/UI", dueDate: "2024-12-20", completed: true, notes: "" },
        { id: 4, title: "Kiến Trúc", description: "Modules & dịch vụ", dueDate: "2024-12-25", completed: false, notes: "" },
        { id: 5, title: "Backend API", description: "Auth, CRUD", dueDate: "2025-01-05", completed: false, notes: "" },
        { id: 6, title: "NLP Model", description: "Huấn luyện mô hình", dueDate: "2025-01-12", completed: false, notes: "" },
        { id: 7, title: "Frontend", description: "Trang chính & chat", dueDate: "2025-01-20", completed: false, notes: "" },
        { id: 8, title: "Tích Hợp", description: "Kết nối API + ML", dueDate: "2025-02-01", completed: false, notes: "" },
        { id: 9, title: "Kiểm Thử", description: "Unit/E2E", dueDate: "2025-02-15", completed: false, notes: "" },
        { id: 10, title: "Triển Khai", description: "Prod + tài liệu", dueDate: "2025-02-28", completed: false, notes: "" },
      ],
    },
    {
      id: 2,
      name: "E-Commerce Fullstack",
      description: "Giải pháp thương mại điện tử tích hợp",
      status: "in-progress",
      completion: 45,
      deadline: "2025-03-31",
      members: [
        { name: "Phạm Văn D", role: "Fullstack", email: "d@example.com" },
        { name: "Hoàng Thị E", role: "PM", email: "e@example.com" },
      ],
      techStack: ["Next.js", "TypeScript", "Stripe", "PostgreSQL"],
      milestones: [
        { id: 11, title: "Đặc Tả", description: "Use cases", dueDate: "2024-12-10", completed: true, notes: "" },
        { id: 12, title: "Thiết Kế DB", description: "Sơ đồ ER", dueDate: "2024-12-15", completed: true, notes: "" },
        { id: 13, title: "Auth", description: "Đăng nhập/đăng ký", dueDate: "2025-01-05", completed: true, notes: "" },
        { id: 14, title: "Sản Phẩm", description: "Catalog + chi tiết", dueDate: "2025-01-15", completed: false, notes: "" },
        { id: 15, title: "Giỏ Hàng", description: "Cart state", dueDate: "2025-01-25", completed: false, notes: "" },
        { id: 16, title: "Thanh Toán", description: "Stripe checkout", dueDate: "2025-02-05", completed: false, notes: "" },
        { id: 17, title: "Đơn Hàng", description: "Quản lý đơn hàng", dueDate: "2025-02-15", completed: false, notes: "" },
        { id: 18, title: "Bảng Điều Khiển", description: "Quản trị", dueDate: "2025-02-25", completed: false, notes: "" },
        { id: 19, title: "Kiểm Thử", description: "Coverage", dueDate: "2025-03-10", completed: false, notes: "" },
        { id: 20, title: "Triển Khai", description: "Prod & tài liệu", dueDate: "2025-03-31", completed: false, notes: "" },
      ],
    },
    {
      id: 3,
      name: "Fitness Mobile App",
      description: "Ứng dụng theo dõi luyện tập",
      status: "completed",
      completion: 100,
      deadline: "2025-01-31",
      members: [
        { name: "Đặng Văn F", role: "Mobile Dev", email: "f@example.com" },
        { name: "Ngô Thị G", role: "QA", email: "g@example.com" },
      ],
      techStack: ["React Native", "Firebase"],
      milestones: [
        { id: 21, title: "Khởi Tạo", description: "Init app", dueDate: "2024-11-10", completed: true, notes: "" },
        { id: 22, title: "Thiết Kế UI", description: "Màn hình chính", dueDate: "2024-11-20", completed: true, notes: "" },
        { id: 23, title: "Đăng Nhập", description: "Firebase Auth", dueDate: "2024-11-25", completed: true, notes: "" },
        { id: 24, title: "Theo Dõi Bài Tập", description: "Workout CRUD", dueDate: "2024-12-01", completed: true, notes: "" },
        { id: 25, title: "Theo Dõi Dinh Dưỡng", description: "Nutrition", dueDate: "2024-12-05", completed: true, notes: "" },
        { id: 26, title: "Đồng Bộ Cloud", description: "Sync", dueDate: "2024-12-10", completed: true, notes: "" },
        { id: 27, title: "Thông Báo", description: "Push notif", dueDate: "2024-12-15", completed: true, notes: "" },
        { id: 28, title: "Thống Kê", description: "Charts", dueDate: "2024-12-20", completed: true, notes: "" },
        { id: 29, title: "Kiểm Thử", description: "QA/E2E", dueDate: "2025-01-05", completed: true, notes: "" },
        { id: 30, title: "Phát Hành", description: "Store release", dueDate: "2025-01-31", completed: true, notes: "" },
      ],
    },
  ]
}

function statusChip(status: Project["status"]) {
  if (status === "not-started") return <Badge variant="amber">CHƯA BẮT ĐẦU</Badge>
  if (status === "in-progress") return <Badge variant="blue">ĐANG THỰC HIỆN</Badge>
  if (status === "completed") return <Badge variant="green">HOÀN THÀNH</Badge>
  return <Badge variant="purple">ĐÃ NỘP</Badge>
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: any }) {
  const Icon = icon
  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function Donut({ segments }: { segments: { color: string; value: number }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const bg = `conic-gradient(${segments
    .map((s, i) => {
      const from = (segments.slice(0, i).reduce((a, b) => a + b.value, 0) / total) * 360
      const to = ((segments.slice(0, i + 1).reduce((a, b) => a + b.value, 0) / total) * 360)
      return `${s.color} ${from}deg ${to}deg`
    })
    .join(", ")})`
  return (
    <div className="relative h-40 w-40">
      <div className="h-40 w-40 rounded-full" style={{ backgroundImage: bg }}></div>
      <div className="absolute inset-4 bg-background rounded-full grid place-items-center text-sm font-semibold">
        {Math.round((segments.find((s) => s.value)?.value || 0) / total * 100)}%
      </div>
    </div>
  )
}

export function ProjectsList({ projects: initial, setProjects: setExternal }: { projects?: Project[]; setProjects?: (p: Project[]) => void }) {
  const [projects, setProjects] = useState<Project[]>(initial ?? initializeMockData())
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("deadline")
  const [selected, setSelected] = useState<Project | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const sync = (next: Project[]) => {
    setProjects(next)
    setExternal?.(next)
  }

  const filtered = useMemo(() => {
    let data = [...projects]
    if (query.trim()) {
      const q = query.toLowerCase()
      data = data.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    if (status !== "all") {
      data = data.filter((p) => p.status === status)
    }
    if (sortBy === "deadline") {
      data.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    } else if (sortBy === "completion-desc") {
      data.sort((a, b) => b.completion - a.completion)
    } else if (sortBy === "completion-asc") {
      data.sort((a, b) => a.completion - b.completion)
    }
    return data
  }, [projects, query, status, sortBy])

  const totals = useMemo(() => {
    const total = projects.length
    const inProg = projects.filter((p) => p.status === "in-progress").length
    const completed = projects.filter((p) => p.status === "completed").length
    const submitted = projects.filter((p) => p.status === "submitted").length
    const avg = total ? Math.round(projects.reduce((s, p) => s + p.completion, 0) / total) : 0
    return { total, inProg, completed, submitted, avg }
  }, [projects])

  const segments = useMemo(() => [
    { color: "#3b82f6", value: projects.filter((p) => p.status === "in-progress").length },
    { color: "#10b981", value: projects.filter((p) => p.status === "completed").length },
    { color: "#f59e0b", value: projects.filter((p) => p.status === "submitted").length },
    { color: "#94a3b8", value: projects.filter((p) => p.status === "not-started").length },
  ], [projects])

  const handleAdd = () => {
    const id = Date.now()
    const next: Project = {
      id,
      name: `Dự Án Mới #${projects.length + 1}`,
      description: "Mô tả nhanh về dự án...",
      status: "not-started",
      completion: 0,
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      members: [{ name: "Sinh Viên Mới", role: "Dev", email: "new@example.com" }],
      techStack: ["React", "Node.js"],
      milestones: [],
    }
    const updated = [next, ...projects]
    sync(updated)
    setSelected(next)
    setShowDetail(true)
  }

  const handleToggleMilestone = (proj: Project, idx: number) => {
    const copy = projects.map((p) => {
      if (p.id !== proj.id) return p
      const ms = [...p.milestones]
      ms[idx].completed = !ms[idx].completed
      const completion = ms.length ? Math.round((ms.filter((m) => m.completed).length / ms.length) * 100) : p.completion
      return { ...p, milestones: ms, completion }
    })
    sync(copy)
    setSelected(copy.find((p) => p.id === proj.id) || null)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bảng Điều Khiển Giảng Viên</h2>
          <p className="text-sm text-muted-foreground">Theo dõi nhóm, lọc nhanh và xem chi tiết</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-56">
            <Input placeholder="Tìm theo tên hoặc mô tả..." value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} className="pl-9" />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            <Select value={status} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="not-started">Chưa bắt đầu</option>
              <option value="in-progress">Đang thực hiện</option>
              <option value="completed">Hoàn thành</option>
              <option value="submitted">Đã nộp</option>
            </Select>
            <Select value={sortBy} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}>
              <option value="deadline">Sắp xếp: Hạn chót</option>
              <option value="completion-desc">Sắp xếp: Hoàn thành ↓</option>
              <option value="completion-asc">Sắp xếp: Hoàn thành ↑</option>
            </Select>
            <Button variant="secondary" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" /> Thêm dự án
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard title="Tổng dự án" value={totals.total} icon={Layers} />
        <StatCard title="Đang thực hiện" value={totals.inProg} icon={Filter} />
        <StatCard title="Hoàn thành" value={totals.completed} icon={CheckCircle2} />
        <StatCard title="Đã nộp" value={totals.submitted} icon={Users} />
        <StatCard title="Hoàn thành TB" value={`${totals.avg}%`} icon={Cpu} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tiến độ theo dự án</CardTitle>
            <CardDescription>% hoàn thành hiện tại</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-2 items-end h-48">
              {projects.map((p) => (
                <div key={p.id} className="col-span-3 sm:col-span-2 lg:col-span-2">
                  <div className="h-40 bg-muted rounded flex items-end">
                    <div className="w-full bg-amber-500 rounded-t" style={{ height: `${p.completion}%` }}></div>
                  </div>
                  <p className="mt-1 text-xs truncate text-center" title={p.name}>{p.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Phân bố trạng thái</CardTitle>
            <CardDescription>Tổng số dự án theo trạng thái</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Donut segments={segments} />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#3b82f6" }}></span> Đang thực hiện: {totals.inProg}</div>
                <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#10b981" }}></span> Hoàn thành: {totals.completed}</div>
                <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#f59e0b" }}></span> Đã nộp: {totals.submitted}</div>
                <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#94a3b8" }}></span> Chưa bắt đầu: {projects.filter((p) => p.status === "not-started").length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{project.name}</h3>
                      {statusChip(project.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setSelected(project); setShowDetail(true) }}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> {project.members.length} thành viên
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> {new Date(project.deadline).toLocaleDateString("vi-VN")}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Progress value={project.completion} />
                  <span className="text-sm font-medium w-10 text-right">{project.completion}%</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {project.techStack.slice(0, 3).map((t, i) => (
                    <Badge key={i}>{t}</Badge>
                  ))}
                  {project.techStack.length > 3 && <Badge>+{project.techStack.length - 3}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">Không tìm thấy dự án phù hợp.</CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal detail */}
      {showDetail && selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowDetail(false); }} />
          <div className="absolute inset-0 p-4 grid place-items-center">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{selected.name}</CardTitle>
                  <CardDescription>{selected.description}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowDetail(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">Trạng thái</p>
                      <div className="mt-1">{statusChip(selected.status)}</div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deadline</p>
                      <p className="text-sm font-medium">{new Date(selected.deadline).toLocaleDateString("vi-VN")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tiến độ</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={selected.completion} />
                        <span className="text-sm font-medium">{selected.completion}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Công nghệ</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selected.techStack.map((t, i) => (
                          <Badge key={i}>{t}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Thành viên</p>
                    <div className="space-y-2">
                      {selected.members.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <p className="text-sm font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.role}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Milestone</p>
                  <div className="space-y-2">
                    {selected.milestones.length === 0 && (
                      <p className="text-sm text-muted-foreground">Chưa có milestone.</p>
                    )}
                    {selected.milestones.map((m, idx) => (
                      <div key={m.id} className="flex items-start gap-2 p-3 rounded border">
                        <button onClick={() => handleToggleMilestone(selected, idx)} className="mt-0.5">
                          {m.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-chart-1" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${m.completed ? "line-through text-muted-foreground" : ""}`}>{m.title}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Hạn: {new Date(m.dueDate).toLocaleDateString("vi-VN")}</span>
                            {m.description && <span>{m.description}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsList