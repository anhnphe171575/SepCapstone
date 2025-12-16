const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');

const verifyToken = require('../middleware/auth');
const { checkProjectMembership } = require('../middleware/projectAuth');
const { 
  getFeature,
  listFeatures, 
  createFeature, 
  updateFeature,
  deleteFeature,
  linkMilestones,
  unlinkAllMilestones,
  listLinkedMilestones,
  listCommentsByFeatureId,
  createCommentByFeatureId,
  updateCommentByFeatureId,
  deleteCommentByFeatureId,
  listActivityLogs,
 
  getAttachments,
  addAttachment,
  deleteAttachment
} = require('../controllers/feature.controller');

// Cấu hình multer cho memory storage (để upload lên Firebase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    // Cho phép các file types
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

// Project-scoped features - Chỉ thành viên dự án
router.get('/projects/:projectId/features', verifyToken, checkProjectMembership, listFeatures);
router.post('/projects/:projectId/features', verifyToken, checkProjectMembership, createFeature);

// Feature-specific routes - Đặt routes cụ thể trước routes generic
// ============== MILESTONES ==============
router.get('/features/:featureId/milestones', verifyToken, listLinkedMilestones);
router.post('/features/:featureId/milestones', verifyToken, linkMilestones);
router.delete('/features/:featureId/milestones', verifyToken, unlinkAllMilestones);
router.get('/features/:featureId/comments', verifyToken, listCommentsByFeatureId);
router.post('/features/:featureId/comments', verifyToken, createCommentByFeatureId);
router.patch('/features/:featureId/comments/:commentId', verifyToken, updateCommentByFeatureId);
router.delete('/features/:featureId/comments/:commentId', verifyToken, deleteCommentByFeatureId);
router.get('/features/:featureId/activity-logs', verifyToken, listActivityLogs);
router.get('/features/:featureId', verifyToken, getFeature);
router.patch('/features/:featureId', verifyToken, updateFeature);
router.delete('/features/:featureId', verifyToken, deleteFeature);

// ============== ATTACHMENTS ==============
router.get('/features/:featureId/attachments', verifyToken, getAttachments);

// Wrapper middleware để xử lý lỗi "Unexpected field" - cho phép các field text
const uploadWithTextFields = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    // Multer chỉ reject file fields không mong đợi, không reject text fields
    // Nếu có lỗi "Unexpected field", có thể là do field file name không đúng
    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
      // Nếu là lỗi unexpected file field, bỏ qua và tiếp tục (có thể là text-only request)
      return next();
    }
    if (err) {
      return next(err);
    }
    next();
  });
};

router.post('/features/:featureId/attachments', verifyToken, uploadWithTextFields, addAttachment);
router.delete('/features/:featureId/attachments/:attachmentId', verifyToken, deleteAttachment);

module.exports = router;


