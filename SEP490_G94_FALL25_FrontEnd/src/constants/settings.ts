// Status options for tasks, features, functions, and milestones
export const STATUS_OPTIONS = [
  { _id: "To Do", name: "To Do", value: "to-do", description: "Cần thực hiện" },
  { _id: "Doing", name: "Doing", value: "doing", description: "Đang thực hiện" },
  { _id: "Done", name: "Done", value: "done", description: "Đã hoàn thành" },
];

const STATUS_NORMALIZE_MAP: Record<string, "To Do" | "Doing" | "Done"> = {
  "To Do": "To Do",
  "Doing": "Doing",
  "Done": "Done",
  "Planning": "To Do",
  "Planned": "To Do",
  "Pending": "To Do",
  "Backlog": "To Do",
  "In Progress": "Doing",
  "Review": "Doing",
  "Testing": "Doing",
  "On Hold": "Doing",
  "In Review": "Doing",
  "Blocked": "Doing",
  "Completed": "Done",
  "Resolved": "Done",
  "Closed": "Done",
  "Cancelled": "Done",
};

export const normalizeStatusValue = (status?: string | null) => {
  if (!status) return "To Do";
  const trimmed = status.trim();
  return STATUS_NORMALIZE_MAP[trimmed] || "To Do";
};

// Priority options for tasks, features, functions, and milestones
export const PRIORITY_OPTIONS = [
  { _id: "Low", name: "Low", value: "low", description: "Ưu tiên thấp - Có thể làm sau" },
  { _id: "Medium", name: "Medium", value: "medium", description: "Ưu tiên trung bình - Làm theo kế hoạch" },
  { _id: "High", name: "High", value: "high", description: "Ưu tiên cao - Cần làm sớm" },
  { _id: "Critical", name: "Critical", value: "critical", description: "Ưu tiên khẩn cấp - Làm ngay" },
];

// Task complexity/type options
export const TASK_TYPE_OPTIONS = [
  { _id: "Simple", name: "Simple", value: "simple", description: "Đơn giản - Dễ thực hiện" },
  { _id: "Medium", name: "Medium", value: "medium", description: "Trung bình - Cần kỹ năng cơ bản" },
  { _id: "Complex", name: "Complex", value: "complex", description: "Phức tạp - Cần kỹ năng cao" },
  { _id: "Very Complex", name: "Very Complex", value: "very-complex", description: "Rất phức tạp - Cần chuyên gia" },
];

// Function type options
export const FUNCTION_TYPE_OPTIONS = [
  { _id: "Backend API", name: "Backend API", value: "backend-api", description: "Chức năng API phía backend" },
  { _id: "Frontend UI", name: "Frontend UI", value: "frontend-ui", description: "Giao diện người dùng frontend" },
  { _id: "Database", name: "Database", value: "database", description: "Thiết kế và quản lý cơ sở dữ liệu" },
  { _id: "Integration", name: "Integration", value: "integration", description: "Tích hợp với hệ thống bên ngoài" },
  { _id: "Business Logic", name: "Business Logic", value: "business-logic", description: "Logic nghiệp vụ" },
  { _id: "Testing", name: "Testing", value: "testing", description: "Kiểm thử và đảm bảo chất lượng" },
  { _id: "DevOps", name: "DevOps", value: "devops", description: "Triển khai và vận hành" },
  { _id: "Documentation", name: "Documentation", value: "documentation", description: "Tài liệu hướng dẫn" },
];

// Helper function to get status by ID
export const getStatusById = (id: string) => {
  return STATUS_OPTIONS.find(s => s._id === id || s.name === id);
};

// Helper function to get priority by ID
export const getPriorityById = (id: string) => {
  return PRIORITY_OPTIONS.find(p => p._id === id || p.name === id);
};

// Helper function to get task type by ID
export const getTaskTypeById = (id: string) => {
  return TASK_TYPE_OPTIONS.find(t => t._id === id || t.name === id);
};

// Helper function to get function type by ID
export const getFunctionTypeById = (id: string) => {
  return FUNCTION_TYPE_OPTIONS.find(f => f._id === id || f.name === id);
};

