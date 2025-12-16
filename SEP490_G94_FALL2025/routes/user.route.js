const express = require('express');
const multer = require('multer');

const router = express.Router();

const verifyToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorization');
const { ROLES } = require('../config/role');

// Import functions
const { 
  getMe, 
  getUserProfile, 
  updateProfile,
  getAllUsers, 
  deleteUser,
  getDashboardSupervisor,
  updateUser,
  importLecturersFromExcel,
  exportUsersToExcel,
  downloadImportTemplate,
  getUserDetail,
  getLecturers
} = require('../controllers/user.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});


router.get('/all', getAllUsers);
// Lấy danh sách giảng viên
router.get('/lecturers', verifyToken, getLecturers);
// Lấy thông tin user hiện tại từ token
router.get('/me', verifyToken, getMe);
// Lấy thông tin profile của user theo ID
router.get('/profile', verifyToken, getUserProfile);
// Lấy chi tiết user với đầy đủ thông tin
router.get('/:userId/detail', verifyToken, getUserDetail);

// Cập nhật thông tin profile của user hiện tại
router.put('/profile', verifyToken, updateProfile);
router.delete('/delete/:id', deleteUser); // Changed from /:id to /delete/:id
router.put('/update/:id', updateUser); // Thêm /update vào path

// dashboard statistics supervisor
router.get('/dashboard/supervisor', verifyToken, getDashboardSupervisor);

router.post(
  '/import-lecturers',
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.ADMIN_DEVELOPER),
  upload.single('file'),
  importLecturersFromExcel
);

router.get(
  '/export',
  verifyToken,
  exportUsersToExcel
);

router.get(
  '/import-lecturers/template',
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.ADMIN_DEVELOPER),
  downloadImportTemplate
);

module.exports = router;


