const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

const User = require('../models/user');
const Project = require('../models/project');
const Task = require('../models/task');
const Feature = require('../models/feature');
const Team = require('../models/team');
const { ROLES } = require('../config/role');

const ADMIN_ROLE_VALUES = new Set([
  ROLES.ADMIN_DEVELOPER,
  ROLES.ADMIN
]);
const DEFAULT_PASSWORD_SUFFIX = '@Lecturer123';
const DEFAULT_COUNTRY = 'Vietnam';

const columnMappings = {
  'full name': 'full_name',
  'fullname': 'full_name',
  'ho va ten': 'full_name',
  'họ và tên': 'full_name',
  'họ và tên *': 'full_name',
  'name': 'full_name',
  'email': 'email',
  'email *': 'email',
  'gmail': 'email',
  'phone': 'phone',
  'phonenumber': 'phone',
  'số điện thoại': 'phone',
  'số điện thoại *': 'phone',
  'sdt': 'phone',
  'dob': 'dob',
  'date of birth': 'dob',
  'ngày sinh': 'dob',
  'ngày sinh *': 'dob',
  'birthday': 'dob',
  'major': 'major',
  'bộ môn': 'major',
  'bo mon': 'major',
  'bộ môn/khoa': 'major',
  'bo mon/khoa': 'major',
  'department': 'major',
  'khoa': 'major',
  'chuyên ngành': 'major',
  'chuyen nganh': 'major',
  'address': 'street',
  'street': 'street',
  'city': 'city',
  'tỉnh/thành phố': 'city',
  'postal code': 'postalCode',
  'zipcode': 'postalCode',
  'postalcode': 'postalCode',
  'country': 'country',
  'password': 'password',
  'role': 'role',
  'vai trò': 'role',
  'team code': 'team_code',
  'team_code': 'team_code',
  'mã nhóm': 'team_code',
  'ma nhom': 'team_code',
  'teamcode': 'team_code',
  // Password
  'password': 'password',
  'mật khẩu': 'password',
  'mat khau': 'password',
  'mật khẩu *': 'password',
  'mat khau *': 'password'
};

const REQUIRED_USER_FIELDS = ['full_name', 'email', 'phone', 'dob'];

// Helper function to parse role from Excel - ONLY STUDENT or SUPERVISOR allowed
function parseRole(roleValue) {
  if (!roleValue) return null;
  
  const roleStr = roleValue.toString().trim().toUpperCase();
  
  // Check for text values - ONLY STUDENT or SUPERVISOR
  if (roleStr === 'STUDENT' || roleStr === 'SINH VIÊN' || roleStr === 'SINH VIEN' || roleStr === '1') {
    return ROLES.STUDENT;
  }
  if (roleStr === 'SUPERVISOR' || roleStr === 'GIÁM SÁT VIÊN' || roleStr === 'GIAM SAT VIEN' || roleStr === '4') {
    return ROLES.SUPERVISOR;
  }
  
  // Check for numeric values - ONLY 1 (STUDENT) or 4 (SUPERVISOR)
  const roleNum = Number(roleValue);
  if (!isNaN(roleNum)) {
    if (roleNum === ROLES.STUDENT || roleNum === 1) return ROLES.STUDENT;
    if (roleNum === ROLES.SUPERVISOR || roleNum === 4) return ROLES.SUPERVISOR;
  }
  
  // Return null for invalid roles (including ADMIN)
  return null;
}

function normalizeHeader(header) {
  if (!header) return '';
  // Remove special characters like (*), [], etc. and normalize
  // Keep / and - for compound headers like "mã giảng viên/sinh viên"
  return header.toString()
    .trim()
    .toLowerCase()
    .replace(/[(*)\[\]]/g, '') // Remove (*), [] but keep / and -
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

function normalizeExcelRow(row) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    if (!key) return;
    const normalizedKey = normalizeHeader(key);
    const mappedKey = columnMappings[normalizedKey] || normalizedKey;
    // Preserve the value even if it's empty string, but skip null/undefined
    if (value !== null && value !== undefined) {
      normalized[mappedKey] = value;
    }
  });
  return normalized;
}

function parseExcelDate(value) {
  if (!value) return null;
  
  // If already a Date object
  if (value instanceof Date && !isNaN(value)) {
    return value;
  }
  
  // If it's an Excel date number
  if (typeof value === 'number') {
    const parsed = XLSX.SSF?.parse_date_code ? XLSX.SSF.parse_date_code(value) : null;
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
  }
  
  // If it's a string, try to parse various formats
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Try various date formats
    // Format: MM/DD/YYYY or DD/MM/YYYY
    const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) {
      const month = parseInt(mmddyyyy[1]) - 1;
      const day = parseInt(mmddyyyy[2]);
      const year = parseInt(mmddyyyy[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date)) return date;
    }
    
    // Format: YYYY-MM-DD
    const yyyymmdd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1]);
      const month = parseInt(yyyymmdd[2]) - 1;
      const day = parseInt(yyyymmdd[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date)) return date;
    }
  }
  
  // Try standard Date parsing
  const parsedDate = new Date(value);
  return isNaN(parsedDate) ? null : parsedDate;
}

function buildAddress(normalizedRow) {
  const street = normalizedRow.street || normalizedRow.address || 'Chưa cập nhật';
  const city = normalizedRow.city || 'Chưa cập nhật';
  const postalCode = normalizedRow.postalCode
    ? String(normalizedRow.postalCode).trim()
    : '000000';
  const country = normalizedRow.country || DEFAULT_COUNTRY;

  return [{
    street: street.toString(),
    city: city.toString(),
    postalCode,
    contry: country.toString()
  }];
}

function generateDefaultPassword(phone) {
  const numericPhone = (phone || '').toString().replace(/\D/g, '');
  const ending = numericPhone ? numericPhone.slice(-4) : 'GV';
  return `GV${ending}${DEFAULT_PASSWORD_SUFFIX}`;
}

function formatRoleName(role) {
  switch (role) {
    case ROLES.ADMIN_DEVELOPER:
      return 'Admin Developer';
    case ROLES.ADMIN:
      return 'Admin';
    case ROLES.SUPERVISOR:
      return 'Lecturer';
    case ROLES.STUDENT:
      return 'Student';
    default:
      return 'Unknown';
  }
}

// GET /api/users/me
// Trả về thông tin user hiện tại dựa trên token (req.user)
async function getMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực' });
    }

    const userId = req.user.id || req.user._id || req.user.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Token không chứa thông tin người dùng' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/users/profile/:userId
// Lấy thông tin profile của user theo ID
async function getUserProfile(req, res) {
  try {
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(400).json({ message: 'Thiếu ID người dùng' });
    }

    const user = await User.findById(userId).select('-password -otp -otpExpires');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// PUT /api/users/profile
// Cập nhật thông tin profile của user hiện tại
async function updateProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực' });
    }

    const userId = req.user.id || req.user._id || req.user.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Token không chứa thông tin người dùng' });
    }

    const {
      full_name,
      address,
      major,
      phone,
      dob,
      avatar
    } = req.body;

    // Tạo object update chỉ với các field được cung cấp
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (address !== undefined) updateData.address = address;
    if (major !== undefined) updateData.major = major;
    if (phone !== undefined) updateData.phone = phone;
    if (dob !== undefined) updateData.dob = dob;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Kiểm tra email có tồn tại không nếu được cung cấp
    if (req.body.email) {
      const existingUser = await User.findOne({ 
        email: req.body.email, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email đã được sử dụng bởi người dùng khác' });
      }
      updateData.email = req.body.email;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    return res.json({
      message: 'Cập nhật profile thành công',
      user: updatedUser
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}
async function getAllUsers(req, res) {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter và Search
    const filter = {};
    if (req.query.role) {
      filter.role = parseInt(req.query.role);
    }
    if (req.query.search) {
      const search = req.query.search;
      const orFilters = [
        { email: { $regex: search, $options: 'i' } },
        { full_name: { $regex: search, $options: 'i' } }
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        orFilters.push({ _id: search });
      }
      filter.$or = orFilters;
    }

    // Query users - Sửa phần select
    const users = await User.find(filter)
      .select('full_name email role phone avatar createdAt updatedAt') // Chỉ chọn các trường cần thiết
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count  
    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          totalPages: Math.ceil(total / limit),
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi lấy danh sách user',
      error: error.message 
    });
  }
}

async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    
    // Kiểm tra userId hợp lệ
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không được để trống'
      });
    }

    // Kiểm tra user tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra không cho xóa Admin Developer
    if (user.role === ROLES.ADMIN_DEVELOPER) {
      return res.status(403).json({
        success: false,
        message: 'Không thể xóa tài khoản Admin Developer'
      });
    }

    // Kiểm tra user có liên quan đến project không
    const projectCount = await Project.countDocuments({
      $or: [
        { supervisor_id: userId },
        { created_by: userId }
      ]
    });

    if (projectCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa người dùng đang tham gia dự án'
      });
    }

    // Thực hiện xóa user
    const deletedUser = await User.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: 'Xóa người dùng thành công'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa người dùng',
      error: error.message
    });
  }
}

async function updateUser(req, res) {
  try {
    const userId = req.params.id;
    const { full_name, email, role, phone, password } = req.body;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không được để trống'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Prevent updating ADMIN_DEVELOPER role
    if (user.role === ROLES.ADMIN_DEVELOPER) {
      return res.status(403).json({
        success: false,
        message: 'Không thể sửa thông tin tài khoản Admin Developer'
      });
    }

    // Check if email already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng bởi người dùng khác'
        });
      }
    }

    // Create update object
    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email;
    if (role) updateData.role = Number(role);
    if (phone) updateData.phone = phone;
    if (password && password.toString().trim()) {
      updateData.password = await bcrypt.hash(password.toString().trim(), 10);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Cập nhật thông tin thất bại'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật thông tin người dùng',
      error: error.message
    });
  }
}
// GET /api/users/dashboard/supervisor
// Dashboard statistics cho supervisor
async function getDashboardSupervisor(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực' });
    }

    const userId = req.user.id || req.user._id || req.user.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Token không chứa thông tin người dùng' });
    }

    // Kiểm tra role = 4 (supervisor)
    const user = await User.findById(userId);
    if (!user || user.role !== 4) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập dashboard supervisor' });
    }

    // Lấy tất cả projects mà supervisor hướng dẫn
    const projects = await Project.find({
      supervisor_id: userId
    })
      .populate('created_by', 'full_name email')
      .sort({ createdAt: -1 });

    // Tính statistics
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const onHoldProjects = projects.filter(p => p.status === 'on-hold').length;
    const plannedProjects = projects.filter(p => p.status === 'planned').length;

    // Group by semester
    const semesterGroups = projects.reduce((acc, project) => {
      const semester = project.semester || 'Unknown';
      if (!acc[semester]) {
        acc[semester] = [];
      }
      acc[semester].push(project);
      return acc;
    }, {});

    // Tính tổng số tasks trong tất cả projects
    const projectIds = projects.map(p => p._id);
    const features = await Feature.find({ project_id: { $in: projectIds } }).select('_id');
    const featureIds = features.map(f => f._id);
    
    const tasks = await Task.find({
      feature_id: { $in: featureIds },
      is_deleted: { $ne: true }
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => {
      const status = typeof t.status === 'object' ? t.status?.name : t.status;
      return status === 'Completed' || status === 'Done';
    }).length;
    const inProgressTasks = tasks.filter(t => {
      const status = typeof t.status === 'object' ? t.status?.name : t.status;
      return status === 'In Progress';
    }).length;
    const pendingTasks = tasks.filter(t => {
      const status = typeof t.status === 'object' ? t.status?.name : t.status;
      return status === 'Pending' || status === 'To Do';
    }).length;

    return res.json({
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      },
      statistics: {
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          on_hold: onHoldProjects,
          planned: plannedProjects
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          in_progress: inProgressTasks,
          pending: pendingTasks
        },
        semesters: Object.keys(semesterGroups).map(semester => ({
          semester,
          count: semesterGroups[semester].length
        }))
      },
      projects: projects.map(p => ({
        _id: p._id,
        topic: p.topic,
        code: p.code,
        status: p.status,
        progress: p.progress,
        semester: p.semester,
        created_by: p.created_by,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))
    });
  } catch (error) {
    console.log('Error getting supervisor dashboard:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ================= Feature Dashboard (Supervisor) =================
// GET /api/users/dashboard/feature
async function getDashboardFeature(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực' });
    }

    const userId = req.user.id || req.user._id || req.user.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Token không chứa thông tin người dùng' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 4) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập dashboard supervisor' });
    }

    const projects = await Project.find({ supervisor_id: userId }).select('_id');
    const projectIds = projects.map(p => p._id);

    const features = await Feature.find({ project_id: { $in: projectIds } })
      .populate('status', 'name value')
      .sort({ due_date: 1 });

    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const total = features.length;
    const isCompleted = (f) => {
      const status = typeof f.status === 'object' ? (f.status?.name || f.status?.value) : f.status;
      return String(status || '').toLowerCase() === 'completed' || String(status || '').toLowerCase() === 'done';
    };

    const completed = features.filter(isCompleted).length;
    const overallCompletionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byStatus = features.reduce((acc, f) => {
      const status = typeof f.status === 'object' ? (f.status?.name || f.status?.value) : f.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const upcoming = features
      .filter(f => f.due_date && new Date(f.due_date) >= now && new Date(f.due_date) <= in7Days)
      .map(f => ({
        _id: f._id,
        title: f.title,
        due_date: f.due_date,
        start_date: f.start_date,
        status: typeof f.status === 'object' ? (f.status?.name || f.status?.value) : f.status,
        project_id: f.project_id,
      }))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const overdue = features
      .filter(f => f.due_date && new Date(f.due_date) < now && !isCompleted(f))
      .map(f => ({
        _id: f._id,
        title: f.title,
        due_date: f.due_date,
        start_date: f.start_date,
        status: typeof f.status === 'object' ? (f.status?.name || f.status?.value) : f.status,
        project_id: f.project_id,
      }))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    return res.json({
      filters: { project_id: 'all' },
      statistics: {
        total,
        completed,
        overall_completion_percent: overallCompletionPercent,
        by_status: byStatus,
        upcoming_count: upcoming.length,
        overdue_count: overdue.length,
      },
      upcoming,
      overdue,
    });
  } catch (error) {
    console.log('Error getting supervisor feature dashboard:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/users/dashboard/feature/:projectId
async function getDashboardFeatureByProjectId(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực' });
    }

    const userId = req.user.id || req.user._id || req.user.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Token không chứa thông tin người dùng' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 4) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập dashboard supervisor' });
    }

    const { projectId } = req.params;

    // Ensure the project belongs to this supervisor
    const project = await Project.findOne({ _id: projectId, supervisor_id: userId });
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án hoặc không có quyền truy cập' });
    }

    const features = await Feature.find({ project_id: projectId })
      .populate('status', 'name value')
      .sort({ due_date: 1 });

    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const total = features.length;
    const isCompleted = (f) => {
      const status = typeof f.status === 'object' ? (f.status?.name || f.status?.value) : f.status;
      return String(status || '').toLowerCase() === 'completed' || String(status || '').toLowerCase() === 'done';
    };

    const completed = features.filter(isCompleted).length;
    const overallCompletionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byStatus = features.reduce((acc, f) => {
      const status = typeof f.status === 'object' ? (f.status?.name || f.status?.value) : f.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const upcoming = features
      .filter(f => f.due_date && new Date(f.due_date) >= now && new Date(f.due_date) <= in7Days)
      .map(f => ({
        _id: f._id,
        title: f.title,
        due_date: f.due_date,
        start_date: f.start_date,
        status: typeof f.status === 'object' ? (f.status?.name || f.status?.value) : f.status,
        project_id: f.project_id,
      }))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const overdue = features
      .filter(f => f.due_date && new Date(f.due_date) < now && !isCompleted(f))
      .map(f => ({
        _id: f._id,
        title: f.title,
        due_date: f.due_date,
        start_date: f.start_date,
        status: typeof f.status === 'object' ? (f.status?.name || f.status?.value) : f.status,
        project_id: f.project_id,
      }))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    return res.json({
      filters: { project_id: projectId },
      statistics: {
        total,
        completed,
        overall_completion_percent: overallCompletionPercent,
        by_status: byStatus,
        upcoming_count: upcoming.length,
        overdue_count: overdue.length,
      },
      upcoming,
      overdue,
    });
  } catch (error) {
    console.log('Error getting supervisor feature dashboard by project:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

async function importLecturersFromExcel(req, res) {
  try {
    if (!req.user || !ADMIN_ROLE_VALUES.has(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền import tài khoản' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng tải lên file Excel (.xls, .xlsx)' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    if (!workbook.SheetNames?.length) {
      return res.status(400).json({ message: 'File Excel không chứa dữ liệu' });
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ message: 'Không tìm thấy dữ liệu trong file Excel' });
    }

    // Filter out rows that don't have email (these are likely instruction/example rows)
    // Email is required and unique, so rows without email are not valid data
    const validRows = rows.filter(row => {
      const normalizedRow = normalizeExcelRow(row);
      const email = (normalizedRow.email || '').toString().trim();
      return email && email.includes('@'); // Basic email check
    });

    const report = {
      inserted: 0,
      skipped: 0,
      errors: [],
      duplicates: 0,
      addedToTeams: 0,
      teamErrors: []
    };

    for (let index = 0; index < validRows.length; index++) {
      const rawRow = validRows[index];
      const normalizedRow = normalizeExcelRow(rawRow);
      // Find original row number in the full rows array for error reporting
      const originalIndex = rows.findIndex(r => {
        const nr = normalizeExcelRow(r);
        const email = (nr.email || '').toString().trim();
        return email === (normalizedRow.email || '').toString().trim();
      });
      const rowNumber = originalIndex >= 0 ? originalIndex + 2 : index + 2; // giả định dòng đầu là tiêu đề

      try {
        // Debug: Log raw row and normalized row for first few rows
        if (index < 3) {
          console.log(`[Import] Row ${rowNumber} - Raw:`, JSON.stringify(rawRow, null, 2));
          console.log(`[Import] Row ${rowNumber} - Normalized:`, JSON.stringify(normalizedRow, null, 2));
          console.log(`[Import] Row ${rowNumber} - Code from normalizedRow:`, normalizedRow.code);
          console.log(`[Import] Row ${rowNumber} - Major from normalizedRow:`, normalizedRow.major);
        }

        const fullName = (normalizedRow.full_name || '').toString().trim();
        const email = (normalizedRow.email || '').toString().toLowerCase().trim();
        const phone = (normalizedRow.phone || '').toString().trim();
        const dob = parseExcelDate(normalizedRow.dob);
        const teamCode = normalizedRow.team_code ? normalizedRow.team_code.toString().trim().toUpperCase() : null;

        // Validate full_name length
        if (fullName.length > 100) {
          report.skipped += 1;
          report.errors.push({
            row: rowNumber,
            message: 'Họ và tên quá dài (tối đa 100 ký tự)'
          });
          continue;
        }

        // Validate phone format
        if (phone && phone.length > 20) {
          report.skipped += 1;
          report.errors.push({
            row: rowNumber,
            message: 'Số điện thoại quá dài (tối đa 20 ký tự)'
          });
          continue;
        }

        // Check for missing fields with better validation
        const missingFields = REQUIRED_USER_FIELDS.filter((field) => {
          if (field === 'dob') {
            return !dob;
          }
          const value = normalizedRow[field];
          // Check if value exists and is not empty after trimming
          if (!value) return true;
          const strValue = value.toString().trim();
          return !strValue || strValue === '' || strValue === 'undefined' || strValue === 'null';
        });

        if (missingFields.length) {
          report.skipped += 1;
          report.errors.push({
            row: rowNumber,
            message: `Thiếu dữ liệu bắt buộc: ${missingFields.join(', ')}`
          });
          continue;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          report.skipped += 1;
          report.errors.push({
            row: rowNumber,
            message: 'Email không hợp lệ'
          });
          continue;
        }

        // Parse and validate role from Excel - ONLY STUDENT hoặc SUPERVISOR
        const roleValue = normalizedRow.role;
        const role = parseRole(roleValue);
        
        // If role is provided but invalid, reject
        if (roleValue && roleValue.toString().trim() && !role) {
          report.skipped += 1;
          report.errors.push({
            row: rowNumber,
            message: `Vai trò không hợp lệ: "${roleValue}". Chỉ chấp nhận STUDENT (1) hoặc SUPERVISOR (4)`
          });
          continue;
        }
        
        const finalRole = role || ROLES.SUPERVISOR; // Default to SUPERVISOR nếu không có
        
        // Double check - only allow STUDENT or SUPERVISOR
        if (finalRole !== ROLES.STUDENT && finalRole !== ROLES.SUPERVISOR) {
          report.skipped += 1;
          report.errors.push({
            row: rowNumber,
            message: `Vai trò không được phép: ${finalRole}. Chỉ chấp nhận STUDENT hoặc SUPERVISOR`
          });
          continue;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
          report.duplicates += 1;
          report.skipped += 1;
          report.errors.push({
            row: rowNumber,
            message: 'Email đã tồn tại trong hệ thống'
          });
          continue;
        }

        // Derive password (trimmed). Log safe metadata to debug formatting issues.
        const rawPasswordCell = normalizedRow.password;
        const passwordRaw = rawPasswordCell
          ? rawPasswordCell.toString().trim()
          : generateDefaultPassword(phone);

        // Safe debug (no password content) to detect Excel formatting issues
        console.log('[Import][Password]', {
          row: rowNumber,
          hasPasswordCell: rawPasswordCell !== undefined && rawPasswordCell !== null,
          passwordType: typeof rawPasswordCell,
          originalLength: rawPasswordCell ? rawPasswordCell.toString().length : 0,
          trimmedLength: passwordRaw ? passwordRaw.length : 0,
          usedDefault: !rawPasswordCell,
        });
        if (!passwordRaw || passwordRaw.length < 6) {
          report.skipped += 1;
          report.errors.push({
            row: rowNumber,
            message: 'Mật khẩu phải có ít nhất 6 ký tự'
          });
          continue;
        }
        console.log("passwordRaw: ", passwordRaw);
        const hashedPassword = await bcrypt.hash(passwordRaw, 10);

        // Validate and set major - preserve value if provided
        let major = '';
        if (normalizedRow.major !== undefined && normalizedRow.major !== null && normalizedRow.major !== '') {
          const majorStr = normalizedRow.major.toString().trim();
          if (majorStr) {
            major = majorStr;
            // Validate major length
            if (major.length > 100) {
              report.skipped += 1;
              report.errors.push({
                row: rowNumber,
                message: 'Bộ môn/Khoa quá dài (tối đa 100 ký tự)'
              });
              continue;
            }
          }
        }
        
        // Set default major only if not provided
        if (!major) {
          major = finalRole === ROLES.STUDENT ? 'Student' : 'Lecturer';
        }
        
        // Debug log for code and major
        if (index < 3) {
          console.log(`[Import] Row ${rowNumber} - Final major:`, major);
        }

        // Create user
        const newUser = await User.create({
          full_name: fullName,
          email,
          phone,
          dob,
          address: buildAddress(normalizedRow),
          major: major,
          role: finalRole,
          password: hashedPassword,
          verified: true,
          avatar: '',
        });

        report.inserted += 1;

        // If team_code is provided, add user to team
        if (teamCode) {
          try {
            const team = await Team.findOne({ 
              team_code: { $regex: new RegExp(`^${teamCode}$`, 'i') }
            }).populate('project_id');

            if (!team) {
              report.teamErrors.push({
                row: rowNumber,
                email: email,
                message: `Không tìm thấy nhóm với mã: ${teamCode}`
              });
              continue;
            }

            const isLecturer = finalRole === ROLES.SUPERVISOR;
            const isStudent = finalRole === ROLES.STUDENT;

            if (isLecturer) {
              // Add lecturer as supervisor to project
              const projectId = team.project_id?._id || team.project_id;
              if (!projectId) {
                report.teamErrors.push({
                  row: rowNumber,
                  email: email,
                  message: `Nhóm không có dự án liên kết`
                });
                continue;
              }

              // Get project from database
              const project = await Project.findById(projectId);
              if (!project) {
                report.teamErrors.push({
                  row: rowNumber,
                  email: email,
                  message: `Không tìm thấy dự án của nhóm`
                });
                continue;
              }

              // Check if project already has a supervisor
              if (project.supervisor_id) {
                const existingSupervisorId = project.supervisor_id.toString();
                if (existingSupervisorId !== newUser._id.toString()) {
                  report.teamErrors.push({
                    row: rowNumber,
                    email: email,
                    message: `Dự án đã có giảng viên hướng dẫn khác`
                  });
                  continue;
                }
              }

              // Add supervisor to project
              project.supervisor_id = newUser._id;
              await project.save();
              report.addedToTeams += 1;
            } else if (isStudent) {
              // Add student to team_member
              const existingMember = team.team_member.find(member => 
                member.user_id.toString() === newUser._id.toString()
              );

              if (existingMember) {
                report.teamErrors.push({
                  row: rowNumber,
                  email: email,
                  message: `Sinh viên đã có trong nhóm này`
                });
                continue;
              }

              // Check team size limit (max 5 members)
              if (team.team_member.length >= 5) {
                report.teamErrors.push({
                  row: rowNumber,
                  email: email,
                  message: `Nhóm đã đủ 5 thành viên`
                });
                continue;
              }

              team.team_member.push({
                user_id: newUser._id,
                team_leader: 0
              });
              await team.save();
              report.addedToTeams += 1;
            }
          } catch (teamError) {
            report.teamErrors.push({
              row: rowNumber,
              email: email,
              message: `Lỗi khi thêm vào nhóm: ${teamError.message}`
            });
          }
        }
      } catch (rowError) {
        report.skipped += 1;
        report.errors.push({
          row: rowNumber,
          message: rowError.message || 'Không thể xử lý dòng dữ liệu'
        });
      }
    }

    // Build error message if there are errors
    let errorMessage = '';
    if (report.errors.length > 0) {
      const errorDetails = report.errors.slice(0, 10).map(err => `Dòng ${err.row}: ${err.message}`).join('; ');
      errorMessage = ` Các lỗi: ${errorDetails}`;
      if (report.errors.length > 10) {
        errorMessage += ` ... và ${report.errors.length - 10} lỗi khác`;
      }
    }
    if (report.teamErrors.length > 0) {
      const teamErrorDetails = report.teamErrors.slice(0, 5).map(err => `Dòng ${err.row}: ${err.message}`).join('; ');
      errorMessage += ` Lỗi nhóm: ${teamErrorDetails}`;
      if (report.teamErrors.length > 5) {
        errorMessage += ` ... và ${report.teamErrors.length - 5} lỗi khác`;
      }
    }

    const roleName = report.inserted === 1 ? 'tài khoản' : 'tài khoản';
    const successMessage = `Import hoàn tất. Tạo mới ${report.inserted} ${roleName}. ${report.addedToTeams > 0 ? `Đã thêm ${report.addedToTeams} người vào nhóm.` : ''}${errorMessage}`;
    
    return res.status(200).json({
      success: true,
      message: successMessage,
      data: {
        ...report,
        totalRows: validRows.length,
        defaultPasswordHint: `Nếu không cung cấp cột password, hệ thống sẽ tạo mật khẩu theo mẫu GVxxxx${DEFAULT_PASSWORD_SUFFIX}.`
      }
    });
  } catch (error) {
    console.error('Import users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi import Excel',
      error: error.message
    });
  }
}

async function exportUsersToExcel(req, res) {
  try {
    if (!req.user || !ADMIN_ROLE_VALUES.has(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền export dữ liệu' });
    }

    const filter = {};

    if (req.query.role) {
      const roleNumber = Number(req.query.role);
      if (!Number.isNaN(roleNumber)) {
        filter.role = roleNumber;
      }
    }

    if (req.query.search) {
      filter.$or = [
        { email: { $regex: req.query.search, $options: 'i' } },
        { full_name: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('full_name email role phone verified createdAt major')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SEP490 System';
    const worksheet = workbook.addWorksheet('Users');

    worksheet.columns = [
      { header: 'STT', key: 'index', width: 6 },
      { header: 'Họ và tên', key: 'full_name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Vai trò', key: 'role', width: 18 },
      { header: 'Số điện thoại', key: 'phone', width: 18 },
      { header: 'Chuyên môn', key: 'major', width: 20 },
      { header: 'Đã xác thực', key: 'verified', width: 15 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };

    users.forEach((user, idx) => {
      worksheet.addRow({
        index: idx + 1,
        full_name: user.full_name,
        email: user.email,
        role: formatRoleName(user.role),
        phone: user.phone || '',
        major: user.major || '',
        verified: user.verified ? 'Đã xác thực' : 'Chưa xác thực',
        createdAt: new Date(user.createdAt).toLocaleString('vi-VN'),
      });
    });

    worksheet.eachRow((row) => {
      row.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `users-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Export users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi export dữ liệu người dùng',
      error: error.message
    });
  }
}

async function downloadImportTemplate(req, res) {
  try {
    if (!req.user || !ADMIN_ROLE_VALUES.has(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền tải template' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SEP490 System';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Import Người Dùng');

    // Định nghĩa các cột
    worksheet.columns = [
      { header: 'Họ và tên (*)', key: 'full_name', width: 30 },
      { header: 'Email (*)', key: 'email', width: 35 },
      { header: 'Số điện thoại (*)', key: 'phone', width: 18 },
      { header: 'Ngày sinh (*)', key: 'dob', width: 15 },
      { header: 'Vai trò', key: 'role', width: 15 },
      { header: 'Bộ môn/Khoa', key: 'major', width: 25 },
      { header: 'Mã nhóm', key: 'team_code', width: 15 },
      { header: 'Địa chỉ', key: 'address', width: 30 },
      { header: 'Thành phố', key: 'city', width: 20 },
      { header: 'Mã bưu điện', key: 'postalCode', width: 15 },
      { header: 'Quốc gia', key: 'country', width: 15 },
      { header: 'Mật khẩu', key: 'password', width: 20 },
    ];

    // Format header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Thêm 1 dòng ví dụ đơn giản (có thể xóa hoặc chỉnh sửa)
    const exampleRow = worksheet.addRow({
      full_name: 'Nguyễn Văn A',
      email: 'nguyenvana@fpt.edu.vn',
      phone: '0912345678',
      dob: '1980-01-15',
      role: 'SUPERVISOR', // Chỉ chấp nhận: STUDENT hoặc SUPERVISOR
      major: 'Công nghệ thông tin',
      team_code: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Vietnam',
      password: ''
    });
    exampleRow.font = { italic: true, color: { argb: 'FF808080' } };
    exampleRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    });

    // Format tất cả các cột
    worksheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      if (rowNumber > 1 && rowNumber <= 3) {
        // Format các dòng ví dụ
        row.eachCell((cell) => {
          if (cell.col === 4) { // Cột ngày sinh
            cell.numFmt = 'yyyy-mm-dd';
          }
        });
      }
    });

    // Đặt độ rộng cột tự động
    worksheet.columns.forEach(column => {
      column.width = column.width || 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `template-import-giang-vien.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Download template error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tải template',
      error: error.message
    });
  }
}

// GET /api/users/:userId/detail - Get detailed user information
async function getUserDetail(req, res) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'Thiếu ID người dùng' });
    }

    // Get user basic info
    const user = await User.findById(userId).select('-password -otp -otpExpires');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Get user's projects as team member
    const teams = await Team.find({ 
      'team_member.user_id': userId 
    }).populate('project_id', 'topic description semester').lean();
   
    // Get user's projects as supervisor
    const Project = require('../models/project');
    const supervisorProjects = await Project.find({ 
      supervisor_id: userId 
    }).select('topic description semester').lean();

    // Get role name
    const getRoleName = (role) => {
      switch (role) {
        case 0: return 'Admin Developer';
        case 8: return 'Admin';
        case 4: return 'Giám sát viên';
        case 1: return 'Sinh viên';
        default: return 'Không xác định';
      }
    };

    // Combine projects from teams and supervisor projects
    const teamProjects = teams.map(t => {
      const memberInfo = t.team_member?.find(m => String(m.user_id) === String(userId));
      return {
        project_id: t.project_id?._id,
        project_name: t.project_id?.topic,
        project_description: t.project_id?.description,
        project_semester: t.project_id?.semester,
        role: memberInfo?.team_leader === 1 ? 'Trưởng nhóm' : 'Thành viên'
      };
    });

    const supervisorProjectsList = supervisorProjects.map(p => ({
      project_id: p._id,
      project_name: p.topic,
      project_description: p.description,
      project_semester: p.semester,
      role: 'Giám sát viên'
    }));

    // Combine and remove duplicates (in case user is both supervisor and team member)
    const allProjectsMap = new Map();
    
    // Add team projects
    teamProjects.forEach(p => {
      if (p.project_id) {
        allProjectsMap.set(String(p.project_id), p);
      }
    });
    
    // Add supervisor projects (will override if duplicate, keeping supervisor role)
    supervisorProjectsList.forEach(p => {
      if (p.project_id) {
        allProjectsMap.set(String(p.project_id), p);
      }
    });

    const allProjects = Array.from(allProjectsMap.values());

    return res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          role_name: getRoleName(user.role)
        },
        projects: allProjects
      }
    });
  } catch (error) {
    console.error('Error getting user detail:', error);
    return res.status(500).json({ 
      message: 'Lỗi máy chủ', 
      error: error.message 
    });
  }
}

// GET /api/users/lecturers - Get all lecturers (role = 4)
async function getLecturers(req, res) {
  try {
    const { search } = req.query;
    
    const filter = { role: ROLES.SUPERVISOR };
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { full_name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const lecturers = await User.find(filter)
      .select('_id full_name email code phone avatar')
      .sort({ full_name: 1 })
      .limit(100); // Limit to 100 for dropdown

    return res.json({
      success: true,
      data: lecturers
    });
  } catch (error) {
    console.error('Error getting lecturers:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Lỗi máy chủ', 
      error: error.message 
    });
  }
}

module.exports = {
  getMe,
  getUserProfile,
  updateProfile,

  getAllUsers,

  getDashboardSupervisor,
  getDashboardFeature,
  getDashboardFeatureByProjectId,
  deleteUser,
  updateUser,
  importLecturersFromExcel,
  exportUsersToExcel,
  downloadImportTemplate,
  getUserDetail,
  getLecturers

};



