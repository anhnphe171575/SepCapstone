const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { 
  getFoldersByProject,
  getFolder,
  createFolder,
  createRootFolder,
  updateFolder,
  deleteFolder,
  getFolderTree,
  searchFolders,
  getCurrentUser
} = require('../controllers/folder.controller');

// Get current user
router.get('/user/current', verifyToken, getCurrentUser);

// Get folders by project
router.get('/project/:projectId', verifyToken, getFoldersByProject);

// Search folders
router.get('/search', verifyToken, searchFolders);

// Get folder tree
router.get('/:id/tree', verifyToken, getFolderTree);

// Get single folder
router.get('/:id', verifyToken, getFolder);

// Create root folder (dễ dàng hơn)
router.post('/root', verifyToken, createRootFolder);

// Create folder (có thể có parent)
router.post('/', verifyToken, createFolder);

// Update folder
router.put('/:id', verifyToken, updateFolder);

// Delete folder
router.delete('/:id', verifyToken, deleteFolder);

module.exports = router;