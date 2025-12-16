const express = require('express');
const router = express.Router();
const multer = require('multer');

const verifyToken = require('../middleware/auth');
const { requireProjectMember, requireProjectLeader,checkProjectMembership } = require('../middleware/projectAuth');
const { 
  listFunctions, 
  listFunctionsByFeature, 
  createFunction, 
  updateFunction, 
  getFunction, 
  deleteFunction, 
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getActivityLogs,
  listTasks,
  getFunctionStats,
  getAttachments,
  addAttachment,
  deleteAttachment
} = require('../controllers/function.controller');


// List all functions in a project
router.get('/projects/:projectId/functions', verifyToken, checkProjectMembership, listFunctions);

// Get function statistics for a project
router.get('/projects/:projectId/functions/stats', verifyToken, checkProjectMembership, getFunctionStats);

// List functions by feature
router.get('/projects/:projectId/features/:featureId/functions', verifyToken, listFunctionsByFeature);

// Create new function
router.post('/projects/:projectId/functions', verifyToken, checkProjectMembership, createFunction);

// Get single function
router.get('/functions/:functionId', verifyToken, getFunction);

// Update function
router.patch('/functions/:functionId', verifyToken, updateFunction);

// Delete function
router.delete('/functions/:functionId', verifyToken, deleteFunction);

// Comments
router.get('/functions/:functionId/comments', verifyToken, getComments);
router.post('/functions/:functionId/comments', verifyToken, addComment);
router.patch('/functions/:functionId/comments/:commentId', verifyToken, updateComment);
router.delete('/functions/:functionId/comments/:commentId', verifyToken, deleteComment);

// Activity logs
router.get('/functions/:functionId/activity-logs', verifyToken, getActivityLogs);

// Tasks
router.get('/functions/:functionId/tasks', verifyToken, listTasks);

// ============== ATTACHMENTS ==============

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

// Get attachments
router.get('/functions/:functionId/attachments', verifyToken, getAttachments);

// Add attachment - hỗ trợ cả upload file (multipart/form-data) và link attachment (JSON)
router.post('/functions/:functionId/attachments', verifyToken, upload.single('file'), addAttachment);

// Delete attachment
router.delete('/functions/:functionId/attachments/:attachmentId', verifyToken, deleteAttachment);

module.exports = router;
