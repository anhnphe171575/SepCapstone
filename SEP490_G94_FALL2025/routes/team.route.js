const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { requireProjectMember, requireProjectLeader } = require('../middleware/projectAuth');
const {
  getTeamByProject,
  updateMemberRole,
  inviteMemberByEmail,
  autoJoinTeamByCode,
  joinTeamByCode,
  getTeamByCode,
  getMemberDetail,
  getSupervisorDetail,
  removeMember
} = require('../controllers/team.controller');


// Public routes for team joining
// GET /api/team/code/:teamCode - Lấy thông tin team bằng code (public)
router.get('/code/:teamCode', getTeamByCode);

// POST /api/team/auto-join/:teamCode - Tự động tham gia nhóm bằng team code (không cần auth)
router.post('/auto-join/:teamCode', autoJoinTeamByCode);

// POST /api/team/join/:teamCode - Tham gia nhóm bằng team code
router.post('/join/:teamCode', verifyToken, joinTeamByCode);

// Protected routes (cần auth)
// GET /api/team/:projectId - Lấy thông tin team của project
router.get('/:projectId', verifyToken, requireProjectMember, getTeamByProject);

// GET /api/team/:projectId/members/:userId - Lấy thông tin chi tiết thành viên
router.get('/:projectId/members/:userId', verifyToken, requireProjectMember, getMemberDetail);

// GET /api/team/:projectId/supervisor - Lấy thông tin chi tiết giảng viên hướng dẫn
router.get('/:projectId/supervisor', verifyToken, requireProjectMember, getSupervisorDetail);

// DELETE /api/team/:projectId/members/:userId - Rời khỏi nhóm
router.delete('/:projectId/members/:userId', verifyToken, requireProjectMember, removeMember);

// PUT /api/team/:projectId/members/:userId/role - Cập nhật vai trò thành viên
router.put('/:projectId/members/:userId/role', verifyToken, requireProjectLeader, updateMemberRole);

// POST /api/team/:projectId/invite - Mời thành viên bằng email
router.post('/:projectId/invite', verifyToken, requireProjectLeader, inviteMemberByEmail);

module.exports = router;

