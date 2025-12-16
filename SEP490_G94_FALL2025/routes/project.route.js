const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/auth');
const { checkProjectPermission, checkCreateProjectPermission, checkProjectMembership } = require('../middleware/projectAuth');

const {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getCurrentSemesterInfo,
  getProjectTeamMembers,
  getAllProjects,
  seedProjectTemplates,
  getProjectsBySupervisor,
  updateProjectSupervisor
} = require('../controllers/project.controller');

const {
  listMilestones,
  createMilestone,
  createMilestoneFromFeatures,
  updateMilestone,
  getMilestone,
  listUpdates,
  createUpdate,
  listActivityLogs,
  listFiles,
  updateComment,
  deleteComment,
  uploadMiddleware,
  uploadFile,
  deleteMilestone,
  getGanttHierarchy
} = require('../controllers/milestone.controller');

// ======================== PROJECT ROUTES ========================

// Get all projects
router.get('/all', verifyToken, getAllProjects);

// List projects - Tất cả user đã đăng nhập đều có thể xem
router.get('/', verifyToken, listProjects);

// Get projects by supervisor (current user from token)
router.get('/supervisor', verifyToken, getProjectsBySupervisor);

// Get projects by supervisor ID
router.get('/supervisor/:supervisorId', verifyToken, getProjectsBySupervisor);

// Get current semester info
router.get('/semester/current', verifyToken, getCurrentSemesterInfo);

// Create new project
router.post('/', verifyToken, checkCreateProjectPermission, createProject);

// Seed project templates
router.post('/:id/seed-templates', verifyToken, seedProjectTemplates);


router.get('/:projectId/team-members', verifyToken, checkProjectMembership, getProjectTeamMembers);

// Update project supervisor
router.patch('/:projectId/supervisor', verifyToken, checkProjectMembership, updateProjectSupervisor);

router.get('/:id', verifyToken, checkProjectPermission('read'), getProject);

// Update project
router.put('/:id', verifyToken, checkProjectPermission('update'), updateProject);

// Delete project
router.delete('/:id', verifyToken, checkProjectPermission('delete'), deleteProject);

router.get('/:projectId/milestones', verifyToken, checkProjectMembership, listMilestones);
router.post('/:projectId/milestones', verifyToken, checkProjectMembership, createMilestone);
router.post('/:projectId/milestones/from-features', verifyToken, checkProjectMembership, createMilestoneFromFeatures);
router.get('/:projectId/milestones/:milestoneId', verifyToken, checkProjectMembership, getMilestone);
router.patch('/:projectId/milestones/:milestoneId', verifyToken, checkProjectMembership, updateMilestone);
router.delete('/:projectId/milestones/:milestoneId', verifyToken, checkProjectMembership, deleteMilestone);

// Gantt chart hierarchy
router.get('/:projectId/gantt/hierarchy', verifyToken, checkProjectMembership, getGanttHierarchy);

// Comments
router.get('/:projectId/milestones/:milestoneId/comments', verifyToken, checkProjectMembership, listUpdates);
router.post('/:projectId/milestones/:milestoneId/comments', verifyToken, checkProjectMembership, createUpdate);
router.patch('/:projectId/milestones/:milestoneId/comments/:commentId', verifyToken, checkProjectMembership, updateComment);
router.delete('/:projectId/milestones/:milestoneId/comments/:commentId', verifyToken, checkProjectMembership, deleteComment);

// Files
router.post('/:projectId/milestones/:milestoneId/files', verifyToken, checkProjectMembership, uploadMiddleware, uploadFile);
router.get('/:projectId/milestones/:milestoneId/files', verifyToken, checkProjectMembership, listFiles);

// Activity logs
router.get('/:projectId/milestones/:milestoneId/activity-logs', verifyToken, checkProjectMembership, listActivityLogs);

// Get projects by supervisor

module.exports = router;
