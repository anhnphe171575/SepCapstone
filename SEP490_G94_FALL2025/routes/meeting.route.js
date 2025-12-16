const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { requireProjectMember, requireProjectLeader } = require('../middleware/projectAuth');
const {
  getMeetingsByProject,
  createMeeting,
  updateMeeting,
  updateMeetingStatus,
  deleteMeeting,
  getMeetingById,
  getAllMeetingsByUser
} = require('../controllers/meeting.controller');

// Routes
// GET /api/meetings/user/all - Lấy tất cả lịch họp của user
router.get('/user/all', verifyToken, getAllMeetingsByUser);

// GET /api/meetings/project/:projectId - Lấy danh sách lịch họp theo project
router.get('/project/:projectId', verifyToken, requireProjectMember, getMeetingsByProject);

// GET /api/meetings/:meetingId - Lấy thông tin chi tiết lịch họp
router.get('/:meetingId', verifyToken, getMeetingById);

// POST /api/meetings/project/:projectId - Tạo lịch họp mới
router.post('/project/:projectId', verifyToken, requireProjectMember, createMeeting);

// PUT /api/meetings/:meetingId - Cập nhật thông tin lịch họp (chỉ khi pending và chỉ người tạo)
router.put('/:meetingId', verifyToken, updateMeeting);

// PUT /api/meetings/:meetingId/status - Cập nhật trạng thái lịch họp (giảng viên)
router.put('/:meetingId/status', verifyToken, updateMeetingStatus);

// DELETE /api/meetings/:meetingId - Xóa lịch họp (chỉ khi pending và chỉ người tạo)
router.delete('/:meetingId', verifyToken, deleteMeeting);

module.exports = router;

