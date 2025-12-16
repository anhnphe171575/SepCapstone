const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('../middleware/auth');
const { checkProjectMembership, requireProjectLeader,isProjectMember } = require('../middleware/projectAuth');
const { 
  uploadDocument, 
  getDocumentsByProject, 
  getDocumentsByFolder,
  getDocument,
  updateDocument,
  updateDocumentStatus,
  updateFinalRelease,
  deleteDocument,
  searchDocuments,
  getDocumentActivityLogs
} = require('../controllers/document.controller');

// Cấu hình multer cho memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Chỉ cho phép các file types nhất định
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép file PDF, Word, Excel, TXT, JPG, PNG'), false);
    }
  }
});

// Upload document - Multer phải chạy trước để parse FormData, sau đó mới check membership
router.post('/upload', verifyToken, upload.single('file'), uploadDocument);

// Get documents by project - Chỉ thành viên dự án
router.get('/project/:projectId', verifyToken, checkProjectMembership,getDocumentsByProject);

// Get documents by folder
router.get('/folder/:folderId', verifyToken, getDocumentsByFolder);

// Search documents
router.get('/search', verifyToken,searchDocuments);


// Get document activity logs (must be before /:id route)
router.get('/:id/activity-logs', verifyToken, getDocumentActivityLogs);

// Get single document (phải đặt cuối cùng)
router.get('/:id', verifyToken, getDocument);

// Update document
router.put('/:id', verifyToken, updateDocument);

// Update document status
router.patch('/:id/status', verifyToken, updateDocumentStatus);

// Mark/Unmark final release
router.patch('/:id/final-release', verifyToken,updateFinalRelease);

// Delete document
router.delete('/:id', verifyToken, deleteDocument);

module.exports = router;