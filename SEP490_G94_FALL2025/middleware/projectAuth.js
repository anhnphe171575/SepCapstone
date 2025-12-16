const { ROLES } = require('../config/role');
const Project = require('../models/project');
const Team = require('../models/team');

/**
 * Middleware kiểm tra quyền truy cập project
 * - STUDENT: chỉ có thể xem
 * - STUDENT_LEADER: có thể CRUD project của mình
 * - LECTURER, ADMIN: có thể xem tất cả
 */
function getProjectIdFromReq(req) {
  // Ưu tiên từ URL params
  const params = req.params || {};
  if (params.projectId || params.id) {
    return params.projectId || params.id;
  }
  
  // Sau đó từ body (sau khi multer parse FormData)
  const body = req.body || {};
  if (body.projectId || body.project_id) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[getProjectIdFromReq] Found projectId in body:', body.projectId || body.project_id);
    }
    return body.projectId || body.project_id;
  }
  
  // Cuối cùng từ query params
  const query = req.query || {};
  const projectId = query.projectId || query.project_id;
  
  if (process.env.NODE_ENV === 'development' && !projectId) {
    console.log('[getProjectIdFromReq] No projectId found:', {
      hasParams: !!(params.projectId || params.id),
      hasBody: !!(body.projectId || body.project_id),
      hasQuery: !!(query.projectId || query.project_id),
      bodyKeys: Object.keys(body),
      url: req.url
    });
  }
  
  return projectId;
}

async function isProjectMember(userId, projectId) {
  if (!userId || !projectId) {
    return { member: false, leader: false };
  }

  try {
    const userIdStr = userId.toString();
    const team = await Team.findOne({ project_id: projectId, 'team_member.user_id': userId }, {
      team_member: 1,
    });
    
    if (!team || !team.team_member || !Array.isArray(team.team_member)) {
      return { member: false, leader: false };
    }

    const member = team.team_member.find(m => {
      if (!m || !m.user_id) return false;
      return m.user_id.toString() === userIdStr;
    });

    return { 
      member: !!member, 
      leader: !!member && Number(member.team_leader) === 1 
    };
  } catch (error) {
    console.error('Error in isProjectMember:', error);
    return { member: false, leader: false };
  }
}

function checkProjectPermission(requiredAction = 'read') {
  return async (req, res, next) => {
    try {
      // Kiểm tra user đã được xác thực chưa
      if (!req.user || !req.user._id) {
        return res.status(401).json({ message: 'Chưa đăng nhập' });
      }

      const projectId = getProjectIdFromReq(req);
      if (!projectId) {
        return res.status(400).json({ message: 'Thiếu tham số projectId' });
      }

      const userId = req.user._id;
      const userRole = req.user.role;

      // Admin có toàn quyền
      if (userRole === ROLES.ADMIN_DEVELOPER || userRole === ROLES.ADMIN) {
        return next();
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Không tìm thấy dự án' });
      }

      const userIdStr = userId.toString();
      const isOwner = project.created_by && project.created_by.toString() === userIdStr;
      const { member, leader } = await isProjectMember(userId, projectId);

      switch (requiredAction) {
        case 'read': {
          // Giảng viên có thể xem tất cả
          if (userRole === ROLES.SUPERVISOR) return next();
          // Chủ dự án hoặc thành viên được xem
          if (isOwner || member) return next();
          return res.status(403).json({ message: 'Bạn không có quyền xem dự án này' });
        }
        case 'write':
        case 'update':
        case 'delete': {
          // Chỉ owner hoặc trưởng nhóm mới có quyền ghi/sửa/xoá
          if (isOwner || leader) return next();
          return res.status(403).json({ message: 'Chỉ chủ dự án hoặc trưởng nhóm mới có quyền thực hiện' });
        }
        default:
          return res.status(400).json({ message: 'Hành động không hợp lệ' });
      }
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
  };
}

function requireProjectMember(req, res, next) {
  return checkProjectPermission('read')(req, res, next);
}

function requireProjectLeader(req, res, next) {
  return checkProjectPermission('update')(req, res, next);
}

async function requireMentor(req, res, next) {
  try {
    // Kiểm tra user đã được xác thực chưa
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    const projectId = getProjectIdFromReq(req);
    if (!projectId) {
      return res.status(400).json({ message: 'Thiếu tham số projectId' });
    }

    const userId = req.user._id;
    const userRole = req.user.role;

    // Admins always allowed
    if (userRole === ROLES.ADMIN_DEVELOPER || userRole === ROLES.ADMIN) {
      return next();
    }

    // Only lecturers can be mentors/supervisors
    if (userRole !== ROLES.LECTURER) {
      return res.status(403).json({ message: 'Chỉ giảng viên hoặc admin mới có quyền truy cập' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }

    const userIdStr = userId.toString();
    const isSupervisor = project.supervisor_id && project.supervisor_id.toString() === userIdStr;
    if (!isSupervisor) {
      return res.status(403).json({ message: 'Bạn không phải giảng viên phụ trách dự án này' });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

/**
 * Middleware kiểm tra quyền tạo project
 * STUDENT có thể tạo project
 * STUDENT sẽ tự động trở thành STUDENT_LEADER khi tạo project
 */
function checkCreateProjectPermission(req, res, next) {
  const userRole = req.user.role;
  const { ROLES } = require('../config/role');

  // Admin, Student Leader, hoặc Student có thể tạo project
  if (userRole === ROLES.STUDENT) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Chỉ sinh viên mới có thể tạo dự án' 
  });
}

/**
 * Middleware kiểm tra user có thuộc project không (thông qua team)
 * Chặn những người không tham gia dự án
 */
async function checkProjectMembership(req, res, next) {
  try {
    // Kiểm tra user đã được xác thực chưa
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    // Sử dụng hàm thống nhất để lấy projectId từ nhiều vị trí
    const projectIdParam = getProjectIdFromReq(req);
    const userId = req.user._id;
    const userRole = req.user.role;

    // Admin có toàn quyền
    if (userRole === ROLES.ADMIN_DEVELOPER || userRole === ROLES.ADMIN) {
      return next();
    }

    if (!projectIdParam) {
      return res.status(400).json({ message: 'Thiếu project ID' });
    }

    // Kiểm tra project có tồn tại không
    const project = await Project.findById(projectIdParam);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }

    const userIdStr = userId.toString();

    // Kiểm tra user có phải là người tạo project không
    if (project.created_by) {
      const createdByStr = project.created_by.toString();
      if (createdByStr === userIdStr) {
        return next();
      }
    }

    // Kiểm tra user có phải là supervisor của project không
    if (project.supervisor_id) {
      const supervisorIdStr = project.supervisor_id.toString();
      if (supervisorIdStr === userIdStr) {
        return next();
      }
    }

    // Kiểm tra user có trong team của project không
    const team = await Team.findOne({ project_id: projectIdParam });
    
    if (!team) {
      // Nếu không có team, chỉ cho phép người tạo project hoặc supervisor
      return res.status(403).json({ 
        message: 'Bạn không có quyền truy cập dự án này. Chỉ thành viên dự án hoặc supervisor mới có thể truy cập.' 
      });
    }

    // Kiểm tra user có trong team_member không
    if (!team.team_member || !Array.isArray(team.team_member)) {
      return res.status(403).json({ 
        message: 'Bạn không có quyền truy cập dự án này. Chỉ thành viên dự án mới có thể truy cập.' 
      });
    }

    const isMember = team.team_member.some(
      member => {
        if (!member || !member.user_id) return false;
        return member.user_id.toString() === userIdStr;
      }
    );

    if (!isMember) {
      return res.status(403).json({ 
        message: 'Bạn không có quyền truy cập dự án này. Chỉ thành viên dự án mới có thể truy cập.' 
      });
    }

    // User là thành viên, cho phép tiếp tục
    return next();
  } catch (error) {
    console.error('Error checking project membership:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

module.exports = {
  isProjectMember,
  checkProjectPermission,
  checkCreateProjectPermission,
  checkProjectMembership,
  requireProjectMember,
  requireProjectLeader,
  requireMentor,
};
