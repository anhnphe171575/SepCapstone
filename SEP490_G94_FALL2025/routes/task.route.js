const express = require('express');
const router = express.Router();
const multer = require('multer');

const verifyToken = require('../middleware/auth');
const { checkProjectMembership } = require('../middleware/projectAuth');
const { 
  // Basic CRUD
  getlistTasks, 
  createTask, 
  updateTask, 
  getTask, 
  deleteTask, 
  // Dependencies
  getDependencies,
  addDependency,
  validateDependency,
  removeDependency,
  // Status validation
  getComments,
  addComment,
  updateComment,
  deleteComment,
  // Attachments
  getAttachments,
  addAttachment,
  deleteAttachment,
  // Activity logs
  getActivityLogs,
  // Bulk operations
  // User tasks   
  getUserTasks,
  // Dashboard
  getDashboardContribution,
  // Milestone summary
  getTaskStats,
  // Time-based progress
  getProjectTimeBasedProgress,
  // Gantt chart
  getGanttTasks,
  // Expired tasks
  getExpiredTasks,
} = require('../controllers/task.controller');

// ============== PROJECT LEVEL ==============

// List all tasks in a project - Chỉ thành viên dự án
router.get('/projects/:projectId/tasks', verifyToken, checkProjectMembership, getlistTasks);

// Get tasks with dependencies for Gantt chart
router.get('/projects/:projectId/tasks/gantt', verifyToken, checkProjectMembership, getGanttTasks);

// List tasks by feature - Chỉ thành viên dự án

// Create new task - Chỉ thành viên dự án
router.post('/projects/:projectId/tasks', verifyToken, checkProjectMembership, createTask);

// Get task stats for project

// Time-based progress calculation - Chỉ thành viên dự án
router.get('/projects/:projectId/tasks/time-based-progress', verifyToken, checkProjectMembership, getProjectTimeBasedProgress);


router.get('/projects/:projectId/tasks/stats', verifyToken, checkProjectMembership, getTaskStats);
router.get('/tasks/dashboard/contribution', verifyToken, getDashboardContribution);


// api dashboard contribution
router.get('/tasks/:taskId', verifyToken, getTask);

// Update task
router.patch('/tasks/:taskId', verifyToken, updateTask);

// Delete task
router.delete('/tasks/:taskId', verifyToken, deleteTask);

// ============== DEPENDENCIES ==============

// Get dependencies
router.get('/tasks/:taskId/dependencies', verifyToken, getDependencies);

// Validate dependency (check for circular deps)
router.post('/tasks/:taskId/dependencies/validate', verifyToken, validateDependency);

// Add dependency
router.post('/tasks/:taskId/dependencies', verifyToken, addDependency);


// Remove dependency
router.delete('/tasks/:taskId/dependencies/:dependencyId', verifyToken, removeDependency);

// ============== COMMENTS ==============

// Get comments
router.get('/tasks/:taskId/comments', verifyToken, getComments);

// Add comment
router.post('/tasks/:taskId/comments', verifyToken, addComment);

// Update comment
router.patch('/tasks/:taskId/comments/:commentId', verifyToken, updateComment);

// Delete comment
router.delete('/tasks/:taskId/comments/:commentId', verifyToken, deleteComment);

// ============== ATTACHMENTS ==============

// Get attachments
router.get('/tasks/:taskId/attachments', verifyToken, getAttachments);

// Cấu hình multer cho memory storage (để upload lên Firebase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit (giống Cloudinary config)
  },
  fileFilter: (req, file, cb) => {
    // Cho phép các file types giống Cloudinary config
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and office/pdf documents are allowed.'), false);
    }
  }
});

// Add attachment - hỗ trợ cả upload file (multipart/form-data) và link attachment (JSON)
// Multer middleware là optional - nếu có file thì dùng, không có thì dùng JSON
router.post('/tasks/:taskId/attachments', verifyToken, upload.single('file'), addAttachment);

// Delete attachment
router.delete('/tasks/:taskId/attachments/:attachmentId', verifyToken, deleteAttachment);

// ============== ACTIVITY LOGS ==============

// Get activity logs
router.get('/tasks/:taskId/activity-logs', verifyToken, getActivityLogs);

// Get all tasks of a user in a project
router.get('/users/:userId/projects/:projectId/tasks', verifyToken, checkProjectMembership, getUserTasks);

// Get all expired tasks in project
router.get('/projects/:projectId/tasks/expired', verifyToken, checkProjectMembership, getExpiredTasks);

// Milestone Summary
module.exports = router;
