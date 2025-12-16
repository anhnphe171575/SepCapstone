const Project = require('../models/project');
const Feature = require('../models/feature');
const Milestone = require('../models/milestone');
const Task = require('../models/task');
const Function = require('../models/function');
const Team = require('../models/team');
const FeaturesMilestone = require('../models/feature_milestone');
const { ROLES } = require('../config/role');

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Generate unique team code
function generateTeamCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function: Kiểm tra sinh viên đã tham gia dự án nào trong học kỳ hiện tại chưa
async function checkStudentProjectInSemester(userId, currentSemester) {
  const User = require('../models/user');

  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  // Kiểm tra cho tất cả users (không chỉ STUDENT/STUDENT_LEADER)
  // để đảm bảo mỗi user chỉ có 1 project trong 1 semester

  // 1. Kiểm tra đã tạo project trong semester này chưa
  const createdProject = await Project.findOne({
    created_by: userId,
    semester: currentSemester
  });

  if (createdProject) {
    console.log(`[checkStudentProjectInSemester] User ${userId} đã tạo project ${createdProject._id} trong semester ${currentSemester}`);
    return {
      project: createdProject,
      reason: 'created'
    };
  }

  // 2. Kiểm tra đã tham gia team của project nào trong semester này chưa
  // Tìm tất cả teams mà user là member (cả leader và member)
  const teams = await Team.find({ 'team_member.user_id': userId })
    .populate({
      path: 'project_id',
      select: '_id topic code semester'
    });

  for (const team of teams) {
    if (team && team.project_id) {
      // Lấy project ID (có thể là ObjectId hoặc đã populate)
      const projectId = team.project_id._id || team.project_id;
      
      // Nếu đã populate và có semester, kiểm tra trực tiếp
      if (team.project_id.semester && team.project_id.semester === currentSemester) {
        console.log(`[checkStudentProjectInSemester] User ${userId} đã tham gia team ${team._id} của project ${projectId} trong semester ${currentSemester}`);
        return {
          project: team.project_id,
          reason: 'member'
        };
      }
      
      // Nếu chưa có semester trong populated data, query lại
      const project = await Project.findById(projectId).select('_id topic code semester');
      if (project && project.semester === currentSemester) {
        console.log(`[checkStudentProjectInSemester] User ${userId} đã tham gia team ${team._id} của project ${project._id} trong semester ${currentSemester}`);
        return {
          project: project,
          reason: 'member'
        };
      }
    }
  }

  console.log(`[checkStudentProjectInSemester] User ${userId} chưa tham gia project nào trong semester ${currentSemester}`);
  return null; // Chưa tham gia dự án nào
}


// GET /api/projects/semester/current
async function getCurrentSemesterInfo(req, res) {
  try {
    const { getCurrentSemester, getSemesterInfo } = require('../utils/semester');
    const currentSemester = getCurrentSemester();
    const semesterInfo = getSemesterInfo(currentSemester);

    return res.json({
      currentSemester,
      semesterInfo,
      message: `Học kì hiện tại: ${semesterInfo.displayName}`
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects
async function listProjects(req, res) {
  try {
    // Lấy thông tin semester hiện tại
    const { getCurrentSemester, getSemesterInfo } = require('../utils/semester');
    const currentSemester = getCurrentSemester();
    const semesterInfo = getSemesterInfo(currentSemester);

    // Lấy projects mà user tham gia (có thể là created_by hoặc team member)
    const Team = require('../models/team');
    const userId = req.user._id;

    // 1. Lấy projects mà user tạo
    const createdProjects = await Project.find({ created_by: userId })
      .populate('created_by', 'full_name email')
      .sort({ createdAt: -1 });

    // 2. Lấy projects mà user tham gia trong team
    const teams = await Team.find({ 'team_member.user_id': userId })
      .populate('project_id', 'topic code status created_by semester')
      .populate('project_id.created_by', 'full_name email');

    const teamProjects = teams.map(team => team.project_id).filter(project => project);

    // 3. Kết hợp và loại bỏ trùng lặp
    const allProjects = [...createdProjects];
    teamProjects.forEach(teamProject => {
      const exists = allProjects.some(project => project._id.toString() === teamProject._id.toString());
      if (!exists) {
        allProjects.push(teamProject);
      }
    });

    // 4. Sắp xếp lại theo thời gian tạo
    const projects = allProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Thống kê theo status
    const statusStats = {
      total: projects.length,
      planned: projects.filter(p => p.status === 'planned').length,
      active: projects.filter(p => p.status === 'active').length,
      'on-hold': projects.filter(p => p.status === 'on-hold').length,
      completed: projects.filter(p => p.status === 'completed').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length
    };

    // Phân loại projects theo semester
    const projectsBySemester = projects.reduce((acc, project) => {
      const semester = project.semester || 'Unknown';
      if (!acc[semester]) {
        acc[semester] = [];
      }
      acc[semester].push(project);
      return acc;
    }, {});

    return res.json({
      currentSemester: {
        semester: currentSemester,
        info: semesterInfo,
        displayName: semesterInfo.displayName
      },
      projects: projects,
      statistics: {
        status: statusStats,
        bySemester: Object.keys(projectsBySemester).map(semester => ({
          semester,
          count: projectsBySemester[semester].length,
          projects: projectsBySemester[semester]
        }))
      },
      summary: {
        total_projects: projects.length,
        current_semester_projects: projectsBySemester[currentSemester]?.length || 0,
        active_projects: statusStats.active,
        completed_projects: statusStats.completed
      },
      message: `Lấy danh sách ${projects.length} projects mà user tham gia thành công`
    });
  } catch (error) {
    console.log('Error in listProjects:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}


// GET /api/projects/:id
async function getProject(req, res) {
  try {
    const { id } = req.params;

    // Tìm project trước, không populate
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }

    // Populate từng field một cách an toàn
    let populatedProject = project.toObject();

    try {
      if (project.created_by) {
        const User = require('../models/user');
        const createdByUser = await User.findById(project.created_by).select('full_name email');
        if (createdByUser) {
          populatedProject.created_by = createdByUser;
        }
      }
    } catch (populateError) {
      console.log('Error populating created_by:', populateError.message);
    }

    try {
      if (project.supervisor_id) {
        const User = require('../models/user');
        const supervisorUser = await User.findById(project.supervisor_id).select('full_name email');
        if (supervisorUser) {
          populatedProject.supervisor_id = supervisorUser;
        }
      }
    } catch (populateError) {
      console.log('Error populating supervisor_id:', populateError.message);
    }

    try {
      if (project.approver_id) {
        const User = require('../models/user');
        const approverUser = await User.findById(project.approver_id).select('full_name email');
        if (approverUser) {
          populatedProject.approver_id = approverUser;
        }
      }
    } catch (populateError) {
      console.log('Error populating approver_id:', populateError.message);
    }

    return res.json(populatedProject);
  } catch (error) {
    console.log('Error in getProject:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/projects
async function createProject(req, res) {
  try {
    const { topic, code, type_id, dep_id, lec_id, approver_id, est_effort, start_date, end_date, description, man_days } = req.body || {};
    console.log(req.body);
    if (!topic || !code) {
      return res.status(400).json({ message: 'Thiếu tiêu đề hoặc mã dự án' });
    }

    // Kiểm tra mã dự án trùng lặp
    const exists = await Project.findOne({ code });
    if (exists) {
      return res.status(409).json({ message: 'Mã dự án đã tồn tại' });
    }

    // Lấy semester hiện tại
    const { getCurrentSemester } = require('../utils/semester');
    const currentSemester = getCurrentSemester();
    console.log(`[createProject] Tạo project cho semester: ${currentSemester}, user: ${req.user._id}`);

    // Kiểm tra user đã tham gia dự án nào trong semester này chưa (tạo hoặc tham gia team)
    // Kiểm tra này áp dụng cho TẤT CẢ users, không chỉ STUDENT
    const existingProjectCheck = await checkStudentProjectInSemester(req.user._id, currentSemester);
    if (existingProjectCheck) {
      const reasonText = existingProjectCheck.reason === 'created'
        ? 'đã tạo dự án'
        : 'đã tham gia dự án';

      console.log(`[createProject] User ${req.user._id} đã ${reasonText} "${existingProjectCheck.project.topic}" trong semester ${currentSemester}`);
      
      return res.status(409).json({
        message: `Bạn ${reasonText} "${existingProjectCheck.project.topic}" (${existingProjectCheck.project.code}) trong học kì ${currentSemester}. Mỗi người dùng chỉ được tham gia 1 dự án duy nhất trong 1 học kì.`,
        existingProject: {
          id: existingProjectCheck.project._id,
          topic: existingProjectCheck.project.topic,
          code: existingProjectCheck.project.code,
          semester: existingProjectCheck.project.semester,
          participation: existingProjectCheck.reason
        }
      });
    }

    console.log(`[createProject] User ${req.user._id} chưa có project trong semester ${currentSemester}, cho phép tạo mới`);

    // Gán người tạo project từ token
    const project = await Project.create({
      topic,
      code,
      type_id,
      dep_id,
      lec_id,
      approver_id,
      man_days: typeof man_days === 'number' ? man_days : 0,
      est_effort,
      start_date,
      end_date,
      description,
      semester: currentSemester, // Gán semester hiện tại
      created_by: req.user._id // Lấy từ token đã verify
    });

    // Nếu user là STUDENT, tự động nâng cấp thành STUDENT_LEADER
    const User = require('../models/user');

    if (req.user.role === ROLES.STUDENT && typeof ROLES.STUDENT_LEADER !== 'undefined') {
      await User.findByIdAndUpdate(req.user._id, {
        role: ROLES.STUDENT_LEADER
      });
      console.log(`User ${req.user._id} đã được nâng cấp từ STUDENT thành STUDENT_LEADER`);
    }

    // Tự động tạo team cho project với người tạo là leader
    let teamCode;
    let isUnique = false;

    // Đảm bảo team_code là unique
    while (!isUnique) {
      teamCode = generateTeamCode();
      const existingTeam = await Team.findOne({ team_code: teamCode });
      if (!existingTeam) {
        isUnique = true;
      }
    }

    // Tạo team với người tạo project là leader
    const team = await Team.create({
      name: `${project.topic} Team`,
      project_id: project._id,
      team_code: teamCode,
      team_member: [{
        user_id: req.user._id,
        team_leader: 1 // 1 = trưởng nhóm, 0 = thành viên
      }],
      description: `Team cho dự án ${project.topic}`
    });

    console.log(`Đã tạo team ${team.name} với team_code: ${teamCode} cho project ${project.topic}`);

    // Seed 11 template documents by reading local assets and uploading to project path
    try {
      const { storage, ref, uploadBytes, getDownloadURL } = require('../config/firebase');
      const Document = require('../models/document');
      const Folder = require('../models/folder');
      const templates = require('../config/documentTemplates');
      const fs = require('fs');
      const path = require('path');

      const guessContentType = (fileName, fallback) => {
        const lower = (fileName || '').toLowerCase();
        if (lower.endsWith('.pdf')) return 'application/pdf';
        if (lower.endsWith('.doc')) return 'application/msword';
        if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
        if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (lower.endsWith('.txt')) return 'text/plain';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
        if (lower.endsWith('.png')) return 'image/png';
        return fallback || 'application/octet-stream';
      };

      // Ensure a project root folder named "Template" exists
      let templateFolder = await Folder.findOne({ project_id: project._id, name: 'Template', parent_folder_id: null });
      if (!templateFolder) {
        templateFolder = await Folder.create({
          name: 'Template',
          project_id: project._id,
          milestone_id: null,
          parent_folder_id: null,
          created_by: req.user._id,
          is_public: false
        });
      }

      await Promise.all(templates.map(async (tpl) => {
        try {
          const title = tpl.title || tpl.fileName.replace(/\.[^/.]+$/, '');
          // Read local asset
          const localPath = path.join(process.cwd(), 'assets', 'templates', 'se', tpl.fileName);
          const fileBuffer = await fs.promises.readFile(localPath);
          // Upload to project-specific storage path
          const destPath = `documents/${project._id}/${tpl.fileName}`;
          const destRef = ref(storage, destPath);
          const contentType = guessContentType(tpl.fileName);
          await uploadBytes(destRef, fileBuffer, { contentType });
          const fileUrl = await getDownloadURL(destRef);

          await Document.create({
            project_id: project._id,
            milestone_id: null,
            folder_id: templateFolder._id,
            type: tpl.type || 'report',
            title,
            version: '1.0',
            file_url: fileUrl,
            created_by: req.user._id,
            approve_by: null,
            status: 'pending',
            description: 'Template document'
          });
        } catch (e) {
          console.log('Seed single template (local upload) failed:', tpl.fileName, e.message);
        }
      }));
    } catch (seedErr) {
      console.log('Error seeding project template documents (local upload):', seedErr.message);
    }

    return res.status(201).json({
      project: project,
      team: {
        id: team._id,
        name: team.name,
        team_code: team.team_code,
        leader: req.user._id
      },
      message: `Tạo dự án và team thành công. Team code: ${teamCode}`
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// PUT /api/projects/:id
async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Kiểm tra project có tồn tại không
    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }

    // Kiểm tra quyền sở hữu - chỉ người tạo mới có thể sửa
    const isOwner = existingProject.created_by.toString() === req.user._id;

    if (!isOwner) {
      return res.status(403).json({ message: 'Chỉ người tạo dự án mới có thể cập nhật' });
    }

    // Nếu cập nhật code, kiểm tra trùng lặp
    if (updateData.code && updateData.code !== existingProject.code) {
      const exists = await Project.findOne({ code: updateData.code, _id: { $ne: id } });
      if (exists) {
        return res.status(409).json({ message: 'Mã dự án đã tồn tại' });
      }
    }

    const project = await Project.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('created_by', 'full_name email');

    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/projects/:id
async function deleteProject(req, res) {
  try {
    const { id } = req.params;

    // Kiểm tra project có tồn tại không
    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }

    // Kiểm tra quyền sở hữu - chỉ người tạo mới có thể xóa
    const isOwner = existingProject.created_by.toString() === req.user._id;

    if (!isOwner) {
      return res.status(403).json({ message: 'Chỉ người tạo dự án mới có thể xóa' });
    }

    await Project.findByIdAndDelete(id);
    return res.json({ message: 'Xóa dự án thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ========================================
// PROJECT DASHBOARD & ANALYTICS
// ========================================


// GET /api/projects/:projectId/charts/contributions
async function getProjectContributions(req, res) {
  try {
    const { projectId } = req.params;

    // Get project info
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }

    // Helper function to normalize user ID for comparison (define early)
    const normalizeUserId = (userObj) => {
      if (!userObj) return null;
      // Handle string
      if (typeof userObj === 'string') {
        return userObj.length === 24 ? userObj : null;
      }
      // Handle mongoose ObjectId
      if (userObj._id) {
        return userObj._id.toString();
      }
      // Handle mongoose Document with id
      if (userObj.id) {
        return userObj.id.toString();
      }
      // Handle ObjectId instance
      if (userObj.toString && typeof userObj.toString === 'function') {
        const idStr = userObj.toString();
        return idStr.length === 24 ? idStr : null;
      }
      return null;
    };

    // Get features and functions
    // Thứ tự: Features (project_id) -> Functions (feature_id) -> Tasks (function_id)
    const features = await Feature.find({ project_id: projectId }).select('_id');
    const featureIds = features.map(f => f._id.toString());
    
    const functions = featureIds.length > 0 
      ? await Function.find({ feature_id: { $in: featureIds } }).select('_id feature_id created_by')
      : [];
    const functionIds = functions.map(f => f._id.toString());

    // Get tasks - chỉ lấy qua function_id (theo thứ tự: Features -> Functions -> Tasks)
    const tasks = functionIds.length > 0
      ? await Task.find({ 
          function_id: { $in: functionIds },
          is_deleted: false 
        })
          .populate('assignee_id', 'full_name email avatar')
          .populate('assigner_id', 'full_name email')
          .populate('function_id', 'title feature_id')
      : [];

    // Get team members
    const Team = require('../models/team');
    const team = await Team.findOne({ project_id: projectId })
      .populate('team_member.user_id', 'full_name email avatar');

    // Debug: Log để kiểm tra
    console.log(`[Contributions] Project ${projectId}:`);
    console.log(`  - Features: ${features.length}`);
    if (features.length > 0) {
      console.log(`    Feature IDs: ${featureIds.slice(0, 5).join(', ')}${featureIds.length > 5 ? '...' : ''}`);
    }
    console.log(`  - Functions: ${functions.length}`);
    if (functions.length > 0) {
      console.log(`    Function IDs: ${functionIds.slice(0, 5).join(', ')}${functionIds.length > 5 ? '...' : ''}`);
    }
    console.log(`  - Tasks: ${tasks.length}`);
    if (tasks.length > 0) {
      console.log(`    Task details:`, tasks.map(t => ({
        task_id: t._id.toString(),
        title: t.title?.substring(0, 20),
        assignee_id: normalizeUserId(t.assignee_id),
        assignee_name: t.assignee_id?.full_name || t.assignee_id?.email || 'Unknown',
        status: t.status,
        function_id: t.function_id?._id?.toString() || t.function_id?.toString()
      })));
    } else {
      console.log(`  ⚠️  No tasks found! Check if functions exist for this project.`);
    }
    console.log(`  - Team members: ${team?.team_member?.length || 0}`);
    if (team && team.team_member) {
      console.log(`    Member IDs:`, team.team_member.map(m => ({
        user_id: normalizeUserId(m.user_id?._id || m.user_id),
        name: m.user_id?.full_name || 'Unknown'
      })));
    }

    if (!team || !team.team_member || team.team_member.length === 0) {
      return res.json({
        project: {
          _id: project._id,
          topic: project.topic,
          code: project.code
        },
        charts: {
          pie_chart: [], // Phân bổ tasks theo assignee
          bar_chart: [], // Số lượng tasks hoàn thành theo thời gian
          line_chart: [], // Tiến độ hoàn thành theo thời gian
          contributions: [] // Chi tiết đóng góp từng thành viên
        },
        message: 'Project chưa có team members'
      });
    }

    // 1. PIE CHART - Phân bổ tasks theo assignee (ai làm bao nhiêu)
    const pieChartData = [];
    const taskCountByAssignee = new Map();
    
    tasks.forEach(task => {
      if (task.assignee_id) {
        // Handle both populated and non-populated assignee_id
        const assigneeId = normalizeUserId(task.assignee_id);
        if (!assigneeId) return;
        
        let assigneeName, assigneeAvatar;
        
        if (task.assignee_id._id || typeof task.assignee_id === 'object') {
          // Populated or object
          assigneeName = task.assignee_id.full_name || task.assignee_id.email || 'Unknown';
          assigneeAvatar = task.assignee_id.avatar || null;
        } else {
          // Not populated, just ObjectId
          assigneeName = 'Unknown';
          assigneeAvatar = null;
        }
        
        const current = taskCountByAssignee.get(assigneeId) || {
          user_id: assigneeId,
          user_name: assigneeName,
          avatar: assigneeAvatar,
          total_tasks: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
          planning_tasks: 0
        };
        
        current.total_tasks++;
        if (task.status === 'Completed') current.completed_tasks++;
        else if (task.status === 'In Progress') current.in_progress_tasks++;
        else if (task.status === 'Planning') current.planning_tasks++;
        
        taskCountByAssignee.set(assigneeId, current);
      }
    });

    // Populate missing user info from team members và thêm team members chưa có tasks
    team.team_member.forEach(member => {
      const userId = normalizeUserId(member.user_id?._id || member.user_id);
      if (!userId) return;
      
      if (taskCountByAssignee.has(userId)) {
        // Update existing user info
        const data = taskCountByAssignee.get(userId);
        if (data.user_name === 'Unknown' || !data.avatar) {
          data.user_name = member.user_id?.full_name || member.user_id?.email || data.user_name;
          data.avatar = member.user_id?.avatar || data.avatar;
        }
        taskCountByAssignee.set(userId, data);
      } else {
        // Add team member even if they have no tasks
        taskCountByAssignee.set(userId, {
          user_id: userId,
          user_name: member.user_id?.full_name || member.user_id?.email || 'Unknown',
          avatar: member.user_id?.avatar,
          total_tasks: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
          planning_tasks: 0
        });
      }
    });

    // Convert to array and calculate percentages
    pieChartData.push(...Array.from(taskCountByAssignee.values()).map(item => ({
      ...item,
      percentage: tasks.length > 0 ? Math.round((item.total_tasks / tasks.length) * 100) : 0
    })));

    // 2. BAR CHART - Số lượng tasks hoàn thành theo thời gian (theo tuần)
    const barChartData = [];
    const completionByWeek = new Map();

    tasks.forEach(task => {
      if (task.status === 'Completed' && task.updateAt) {
        const date = new Date(task.updateAt);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const current = completionByWeek.get(weekKey) || {
          week: weekKey,
          week_label: `Tuần ${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
          completed_tasks: 0,
          completed_functions: 0
        };
        current.completed_tasks++;
        completionByWeek.set(weekKey, current);
      }
    });

    // Add functions completion
    functions.forEach(func => {
      if (func.status === 'Completed' && func.updateAt) {
        const date = new Date(func.updateAt);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const current = completionByWeek.get(weekKey) || {
          week: weekKey,
          week_label: `Tuần ${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
          completed_tasks: 0,
          completed_functions: 0
        };
        current.completed_functions++;
        completionByWeek.set(weekKey, current);
      }
    });

    barChartData.push(...Array.from(completionByWeek.values()).sort((a, b) => 
      a.week.localeCompare(b.week)
    ));

    // 3. LINE CHART - Tiến độ hoàn thành theo thời gian (cumulative)
    const lineChartData = [];
    const progressByWeek = new Map();

    // Initialize from project start date
    const startDate = project.start_date || project.createdAt;
    const now = new Date();
    const currentDate = new Date(startDate);

    while (currentDate <= now) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!progressByWeek.has(weekKey)) {
        progressByWeek.set(weekKey, {
          week: weekKey,
          week_label: `Tuần ${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
          completed_tasks: 0,
          completed_functions: 0,
          total_tasks: tasks.length,
          total_functions: functions.length,
          progress_percentage: 0
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 7);
    }

    // Calculate cumulative progress
    let cumulativeTasks = 0;
    let cumulativeFunctions = 0;

    tasks.forEach(task => {
      if (task.status === 'Completed' && task.updateAt) {
        const date = new Date(task.updateAt);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const data = progressByWeek.get(weekKey);
        if (data) {
          data.completed_tasks++;
        }
      }
    });

    functions.forEach(func => {
      if (func.status === 'Completed' && func.updateAt) {
        const date = new Date(func.updateAt);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const data = progressByWeek.get(weekKey);
        if (data) {
          data.completed_functions++;
        }
      }
    });

    // Make cumulative and calculate percentage
    const sortedWeeks = Array.from(progressByWeek.values()).sort((a, b) => 
      a.week.localeCompare(b.week)
    );
    
    sortedWeeks.forEach(data => {
      cumulativeTasks += data.completed_tasks;
      cumulativeFunctions += data.completed_functions;
      const totalWork = data.total_tasks + data.total_functions;
      const completedWork = cumulativeTasks + cumulativeFunctions;
      const progress = totalWork > 0 ? Math.round((completedWork / totalWork) * 100) : 0;
      
      lineChartData.push({
        ...data,
        cumulative_tasks: cumulativeTasks,
        cumulative_functions: cumulativeFunctions,
        progress_percentage: progress
      });
    });

    // 4. CONTRIBUTIONS - Chi tiết đóng góp từng thành viên
    const contributions = [];
    
    team.team_member.forEach(member => {
      const userId = normalizeUserId(member.user_id?._id || member.user_id);
      if (!userId) return;
      
      // Filter tasks by assignee_id - handle both populated and non-populated
      const memberTasks = tasks.filter(t => {
        if (!t.assignee_id) {
          return false;
        }
        
        const taskAssigneeId = normalizeUserId(t.assignee_id);
        if (!taskAssigneeId || !userId) {
          return false;
        }
        
        // Compare as strings
        const isMatch = taskAssigneeId === userId;
        
        return isMatch;
      });
      
      // Debug log for first member
      if (contributions.length === 0) {
        console.log(`[Contributions] Member: ${member.user_id?.full_name || 'Unknown'} (${userId})`);
        console.log(`[Contributions] Found ${memberTasks.length} tasks for this member`);
        if (memberTasks.length > 0) {
          console.log(`[Contributions] Task details:`, memberTasks.map(t => ({
            title: t.title,
            assignee_id: normalizeUserId(t.assignee_id),
            status: t.status
          })));
        }
      }
      
      // Filter functions by created_by
      const memberFunctions = functions.filter(f => {
        if (!f.created_by) return false;
        const funcCreatorId = normalizeUserId(f.created_by);
        return funcCreatorId === userId;
      });

      const completedTasks = memberTasks.filter(t => t.status === 'Completed').length;
      const inProgressTasks = memberTasks.filter(t => t.status === 'In Progress').length;
      const completedFunctions = memberFunctions.filter(f => f.status === 'Completed').length;

      contributions.push({
        user_id: userId,
        user_name: member.user_id?.full_name || member.user_id?.email || 'Unknown',
        avatar: member.user_id?.avatar,
        role: member.team_leader === 1 ? 'Leader' : 'Member',
        tasks: {
          total: memberTasks.length,
          completed: completedTasks,
          in_progress: inProgressTasks,
          planning: memberTasks.length - completedTasks - inProgressTasks
        },
        functions: {
          total: memberFunctions.length,
          completed: completedFunctions
        },
        completion_rate: memberTasks.length > 0 
          ? Math.round((completedTasks / memberTasks.length) * 100) 
          : 0
      });
    });

    return res.json({
      project: {
        _id: project._id,
        topic: project.topic,
        code: project.code
      },
      charts: {
        pie_chart: pieChartData, // Phân bổ tasks theo assignee
        bar_chart: barChartData, // Số lượng hoàn thành theo tuần
        line_chart: lineChartData, // Tiến độ cumulative theo tuần
        contributions: contributions // Chi tiết đóng góp từng thành viên
      }
    });

  } catch (error) {
    console.log('Error getting project contributions:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/team-members
async function getProjectTeamMembers(req, res) {
  try {
    const { projectId } = req.params;
    const id = projectId; // Alias for compatibility

    // Kiểm tra project có tồn tại không
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy project' });
    }

    // Lấy team của project
    const Team = require('../models/team');
    const team = await Team.findOne({ project_id: id })
      .populate('team_member.user_id', 'full_name email student_id role');

    if (!team) {
      return res.json({
        project: {
          _id: project._id,
          topic: project.topic,
          code: project.code,
          status: project.status
        },
        team_members: {
          leaders: [],
          members: [],
          total: 0
        },
        message: 'Project chưa có team'
      });
    }

    // Phân loại leaders và members
    const leaders = team.team_member.filter(member => member.team_leader === 1);
    const members = team.team_member.filter(member => member.team_leader === 0);

    return res.json({
      project: {
        _id: project._id,
        topic: project.topic,
        code: project.code,
        status: project.status
      },
      team_members: {
        team_id: team._id,
        team_name: team.name,
        leaders: leaders,
        members: members,
        total: team.team_member.length
      },
      message: 'Lấy danh sách team members thành công'
    });
  } catch (error) {
    console.log('Error getting project team members:', error);
    return res.status(500).json({ message: 'Lỗi lấy danh sách team members', error: error.message });
  }
}

// POST /api/projects/:id/seed-templates
async function seedProjectTemplates(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }

    const { storage, ref, uploadBytes, getDownloadURL } = require('../config/firebase');
    const Document = require('../models/document');
    const Folder = require('../models/folder');
    const templates = require('../config/documentTemplates');
    const fs = require('fs');
    const path = require('path');

    const guessContentType = (fileName, fallback) => {
      const lower = (fileName || '').toLowerCase();
      if (lower.endsWith('.pdf')) return 'application/pdf';
      if (lower.endsWith('.doc')) return 'application/msword';
      if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
      if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (lower.endsWith('.txt')) return 'text/plain';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
      if (lower.endsWith('.png')) return 'image/png';
      return fallback || 'application/octet-stream';
    };

    const results = { created: 0, skipped: 0, moved: 0, errors: [] };

    // Ensure Template folder exists at root
    let templateFolder = await Folder.findOne({ project_id: project._id, name: 'Template', parent_folder_id: null });
    if (!templateFolder) {
      templateFolder = await Folder.create({
        name: 'Template',
        project_id: project._id,
        milestone_id: null,
        parent_folder_id: null,
        created_by: req.user._id,
        is_public: false
      });
    }

    await Promise.all(templates.map(async (tpl) => {
      try {
        const title = tpl.title || tpl.fileName.replace(/\.[^/.]+$/, '');
        // If document exists anywhere in this project with same title, move it under Template folder
        const existingAny = await Document.findOne({ project_id: project._id, title });
        if (existingAny) {
          if (!existingAny.folder_id || existingAny.folder_id.toString() !== templateFolder._id.toString()) {
            await Document.findByIdAndUpdate(existingAny._id, { folder_id: templateFolder._id });
            results.moved += 1;
          } else {
            results.skipped += 1;
          }
          return;
        }

        // If none exists, upload from local assets and create
        const localPath = path.join(process.cwd(), 'assets', 'templates', 'se', tpl.fileName);
        const fileBuffer = await fs.promises.readFile(localPath);
        const destPath = `documents/${project._id}/${tpl.fileName}`;
        const destRef = ref(storage, destPath);
        const contentType = guessContentType(tpl.fileName);
        await uploadBytes(destRef, fileBuffer, { contentType });
        const fileUrl = await getDownloadURL(destRef);

        await Document.create({
          project_id: project._id,
          milestone_id: null,
          folder_id: templateFolder._id,
          type: tpl.type || 'report',
          title,
          version: '1.0',
          file_url: fileUrl,
          created_by: req.user._id,
          approve_by: null,
          status: 'pending',
          description: 'Template document'
        });
        results.created += 1;
      } catch (e) {
        results.errors.push({ file: tpl.fileName, error: e.message });
      }
    }));

    return res.json({ message: 'Seed templates hoàn tất', results });
  } catch (error) {
    console.log('Error reseeding templates:', error);
    return res.status(500).json({ message: 'Lỗi seed templates', error: error.message });
  }
}


function canViewSupervisorProjects(supervisorId, user = {}) {
  if (!supervisorId || !user) {
    return false;
  }

  const normalizedSupervisorId = supervisorId.toString();
  const requesterId = (user._id || user.id || '').toString();
  const requesterRole = user.role;

  const isSelf = requesterId && requesterId === normalizedSupervisorId;
  const isLecturer = requesterRole === ROLES.LECTURER;
  const isAdmin = requesterRole === ROLES.ADMIN || requesterRole === ROLES.ADMIN_DEVELOPER;

  return isSelf || isLecturer || isAdmin;
}

async function fetchProjectsBySupervisorId(supervisorId) {
  return Project.find({ supervisor_id: supervisorId })
    .populate('created_by', 'full_name email')
    .populate('supervisor_id', 'full_name email')
    .sort({ createdAt: -1 });
}

// GET /api/projects/supervisor/:supervisorId - Lấy projects mà giảng viên hướng dẫn
async function getProjectsBySupervisor(req, res) {
  try {
    const supervisorId = (req.params.supervisorId || req.user?._id || req.user?.id || '').toString();

    if (!supervisorId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu supervisorId'
      });
    }

    if (!canViewSupervisorProjects(supervisorId, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem projects của giảng viên này'
      });
    }

    const projects = await fetchProjectsBySupervisorId(supervisorId);

    return res.json({
      success: true,
      count: projects.length,
      data: projects,
      message: `Lấy danh sách ${projects.length} dự án của giảng viên thành công`
    });
  } catch (error) {
    console.log('Error in getProjectsBySupervisor:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ',
      error: error.message
    });
  }
}



// GET /api/projects/:projectId/members
async function listProjectMembers(req, res) {
  try {
    const { projectId } = req.params;
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực' });
    }

    const team = await Team.findOne({ project_id: projectId })
      .populate('project_id', 'topic code')
      .populate('team_member.user_id', 'full_name email avatar role')
      .select('name project_id team_member');

    // allow owner even if not in team
    const isOwner = await Project.exists({ _id: projectId, created_by: req.user._id });
    const isMember = team && team.team_member.some(m => String(m.user_id?._id) === String(req.user._id));
    if (!isMember && !isOwner) {
      return res.status(403).json({ message: 'Bạn không thuộc team của project này' });
    }

    if (!team) {
      return res.json({ count: 0, members: [] });
    }

    const members = team.team_member.map(m => ({
      _id: m.user_id?._id,
      full_name: m.user_id?.full_name,
      email: m.user_id?.email,
      avatar: m.user_id?.avatar,
      role: m.user_id?.role,
      team_leader: m.team_leader,
    }));

    return res.json({
      project: { _id: team.project_id?._id, topic: team.project_id?.topic, code: team.project_id?.code },
      count: members.length,
      members,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}
// GET /api/projects/all
async function getAllProjects(req, res) {
  try {
    // Lấy tất cả projects và populate thông tin người tạo và supervisor
    const projects = await Project.find()
      .populate('created_by', 'full_name email')
      .populate('supervisor_id', 'full_name email code')
      .sort({ createdAt: -1 });

    // Tính toán thống kê
    const statistics = {
      total: projects.length,
      status: {
        planned: projects.filter(p => p.status === 'planned').length,
        active: projects.filter(p => p.status === 'active').length,
        'on-hold': projects.filter(p => p.status === 'on-hold').length,
        completed: projects.filter(p => p.status === 'completed').length,
        cancelled: projects.filter(p => p.status === 'cancelled').length
      }
    };

    // Nhóm projects theo học kỳ
    const projectsBySemester = projects.reduce((acc, project) => {
      const semester = project.semester || 'Unknown';
      if (!acc[semester]) {
        acc[semester] = [];
      }
      acc[semester].push(project);
      return acc;
    }, {});

    return res.json({
      projects,
      statistics,
      bySemester: Object.keys(projectsBySemester).map(semester => ({
        semester,
        count: projectsBySemester[semester].length,
        projects: projectsBySemester[semester]
      })),
      message: `Lấy danh sách ${projects.length} dự án thành công`
    });

  } catch (error) {
    console.error('Get all projects error:', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ',
      error: error.message
    });
  }
}




// GET /api/projects/:projectId/upcoming-deadlines
async function getProjectUpcomingDeadlines(req, res) {
  try {
    const { projectId } = req.params;
    const { days = 7 } = req.query; // Mặc định 7 ngày tới

    const now = new Date();
    const futureDate = new Date(now.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

    // Lấy features
    const features = await Feature.find({ project_id: projectId });
    const featureIds = features.map(f => f._id);

    // Lấy tasks sắp đến hạn
    const tasks = await Task.find({
      feature_id: { $in: featureIds },
      is_deleted: { $ne: true },
      deadline: {
        $gte: now,
        $lte: futureDate
      }
    })
      .populate('feature_id', 'title')
      .populate('assignee_id', 'full_name email')
      .populate('status', 'name value')
      .sort({ deadline: 1 });

    // Lấy milestones sắp đến hạn
    const milestones = await Milestone.find({
      project_id: projectId,
      deadline: {
        $gte: now,
        $lte: futureDate
      }
    })
      .sort({ deadline: 1 });

    // Lấy functions sắp đến hạn
    const Function = require('../models/function');
    const functions = await Function.find({
      project_id: projectId,
      deadline: {
        $gte: now,
        $lte: futureDate
      }
    })
      .populate('feature_id', 'title')
      .populate('status', 'name value')
      .sort({ deadline: 1 });

    return res.json({
      tasks: tasks.map(t => ({
        _id: t._id,
        title: t.title,
        deadline: t.deadline,
        feature: t.feature_id?.title || 'N/A',
        assignee: t.assignee_id?.full_name || 'Chưa giao',
        status: t.status?.name || 'Unknown',
        days_until: Math.ceil((new Date(t.deadline) - now) / (1000 * 60 * 60 * 24))
      })),
      milestones: milestones.map(m => ({
        _id: m._id,
        title: m.title,
        deadline: m.deadline,
        status: m.status,
        days_until: Math.ceil((new Date(m.deadline) - now) / (1000 * 60 * 60 * 24))
      })),
      functions: functions.map(f => ({
        _id: f._id,
        title: f.title,
        deadline: f.deadline,
        feature: f.feature_id?.title || 'N/A',
        status: f.status?.name || 'Unknown',
        days_until: Math.ceil((new Date(f.deadline) - now) / (1000 * 60 * 60 * 24))
      })),
      summary: {
        total_tasks: tasks.length,
        total_milestones: milestones.length,
        total_functions: functions.length,
        days_range: parseInt(days)
      },
      message: `Lấy deadlines trong ${days} ngày tới thành công`
    });
  } catch (error) {
    console.log('Error getting upcoming deadlines:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}



// PATCH /api/projects/:projectId/supervisor - Add or remove supervisor
async function updateProjectSupervisor(req, res) {
  try {
    const { projectId } = req.params;
    const { supervisor_id } = req.body;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }

    // Check permission - only project creator or admin can update supervisor
    const isOwner = project.created_by.toString() === req.user._id.toString();
    const isAdmin = req.user.role === ROLES.ADMIN || req.user.role === ROLES.ADMIN_DEVELOPER;
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật giám sát viên' });
    }

    // If supervisor_id is provided, validate it's a lecturer
    if (supervisor_id) {
      const User = require('../models/user');
      const supervisor = await User.findById(supervisor_id);
      
      if (!supervisor) {
        return res.status(404).json({ message: 'Không tìm thấy giảng viên' });
      }
      
      if (supervisor.role !== ROLES.LECTURER) {
        return res.status(400).json({ message: 'Chỉ có thể thêm giảng viên làm giám sát viên' });
      }
    }

    // Update supervisor - handle null/undefined/empty string
    if (supervisor_id === null || supervisor_id === undefined || supervisor_id === '' || supervisor_id === 'null') {
      // Remove supervisor_id field using $unset without triggering validation
      await Project.findByIdAndUpdate(
        projectId, 
        { $unset: { supervisor_id: "" } },
        { runValidators: false } // Don't validate other fields when removing supervisor
      );
    } else {
      project.supervisor_id = supervisor_id;
      await project.save();
    }

    // Fetch updated project with safe populate
    let updatedProject = await Project.findById(projectId)
      .populate('created_by', 'full_name email')
      .lean();
    
    // Populate supervisor only if it exists
    if (updatedProject.supervisor_id) {
      const User = require('../models/user');
      const supervisor = await User.findById(updatedProject.supervisor_id)
        .select('full_name email code')
        .lean();
      if (supervisor) {
        updatedProject.supervisor_id = supervisor;
      } else {
        updatedProject.supervisor_id = null;
      }
    } else {
      updatedProject.supervisor_id = null;
    }

    return res.json({
      success: true,
      message: supervisor_id ? 'Đã thêm giám sát viên thành công' : 'Đã xóa giám sát viên thành công',
      data: updatedProject
    });
  } catch (error) {
    console.error('Error updating project supervisor:', error);
    return res.status(500).json({ 
      message: 'Lỗi máy chủ', 
      error: error.message 
    });
  }
}

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getCurrentSemesterInfo,
  getProjectContributions,
  getProjectTeamMembers,
  seedProjectTemplates,
  getProjectsBySupervisor,
  listProjectMembers,
  checkStudentProjectInSemester, 
  getAllProjects,
  updateProjectSupervisor
};
