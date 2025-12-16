const Folder = require('../models/folder');
const Document = require('../models/document');
const Project = require('../models/project');
const Milestone = require('../models/milestone');

// FOLDER CRUD OPERATIONS

// GET /api/folders/project/:projectId
async function getFoldersByProject(req, res) {
  try {
    const { projectId } = req.params;
    const { parentId } = req.query;
    
    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }
    
    const filter = { project_id: projectId };
    if (parentId === 'null' || parentId === null) {
      filter.parent_folder_id = null;
    } else if (parentId) {
      filter.parent_folder_id = parentId;
    }
    
    const folders = await Folder.find(filter)
      .populate([
        { path: 'created_by', select: 'full_name email avatar' },
        { path: 'parent_folder_id', select: 'name path' },
        { path: 'milestone_id', select: 'title' }
      ])
      .sort({ name: 1 });
    
    return res.json({
      folders,
      message: 'Lấy danh sách thư mục thành công'
    });
  } catch (error) {
    console.log('Error getting folders:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/folders/:id
async function getFolder(req, res) {
  try {
    const { id } = req.params;
    
    const folder = await Folder.findById(id)
      .populate([
        { path: 'created_by', select: 'full_name email avatar' },
        { path: 'parent_folder_id', select: 'name path' },
        { path: 'milestone_id', select: 'title' },
        { path: 'project_id', select: 'topic code' }
      ]);
    
    if (!folder) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }
    
    // Get children folders
    const childrenFolders = await Folder.find({ 
      parent_folder_id: id
    }).sort({ name: 1 });
    
    // Get documents in this folder
    const documents = await Document.find({ 
      folder_id: id 
    }).populate('created_by', 'full_name email')
      .sort({ createdAt: -1 });
    
    return res.json({
      folder,
      children: childrenFolders,
      documents,
      message: 'Lấy thông tin thư mục thành công'
    });
  } catch (error) {
    console.log('Error getting folder:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/folders/root - Tạo folder gốc dễ dàng
async function createRootFolder(req, res) {
  try {
    const { 
      name, 
      project_id, 
      milestone_id,
      is_public = false 
    } = req.body;
    
    if (!name || !project_id) {
      return res.status(400).json({ message: 'Thiếu tên thư mục hoặc project_id' });
    }
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }
    
    // Verify project exists
    const project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }
    
    // Verify milestone exists (if provided)
    if (milestone_id) {
      const milestone = await Milestone.findById(milestone_id);
      if (!milestone) {
        return res.status(404).json({ message: 'Không tìm thấy milestone' });
      }
      if (milestone.project_id.toString() !== project_id) {
        return res.status(400).json({ message: 'Milestone không thuộc dự án này' });
      }
    }
    
    // Check if folder name already exists in project root
    const existingFolder = await Folder.findOne({
      name: name,
      parent_folder_id: null, // Root folder
      project_id: project_id
    });
    
    if (existingFolder) {
      return res.status(409).json({ 
        message: 'Tên thư mục đã tồn tại trong dự án',
        suggestion: 'Hãy chọn tên khác cho thư mục gốc'
      });
    }
    
    const folder = await Folder.create({
      name,
      project_id,
      milestone_id: milestone_id || null,
      parent_folder_id: null, // Root folder
      created_by: req.user._id,
      is_public
    });
    
    await folder.populate([
      { path: 'created_by', select: 'full_name email avatar' },
      { path: 'milestone_id', select: 'title' },
      { path: 'project_id', select: 'topic code' }
    ]);
    
    return res.status(201).json({
      folder,
      message: 'Tạo thư mục gốc thành công'
    });
  } catch (error) {
    console.log('Error creating root folder:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/folders
async function createFolder(req, res) {
  try {
    const { 
      name, 
      project_id, 
      milestone_id, 
      parent_folder_id,
      is_public = false 
    } = req.body;
    
    if (!name || !project_id) {
      return res.status(400).json({ message: 'Thiếu tên thư mục hoặc project_id' });
    }
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }
    
    // Verify project exists
    const project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy dự án' });
    }
    
    // Verify parent folder exists (if provided)
    if (parent_folder_id) {
      const parentFolder = await Folder.findById(parent_folder_id);
      if (!parentFolder) {
        return res.status(404).json({ message: 'Không tìm thấy thư mục cha' });
      }
      if (parentFolder.project_id.toString() !== project_id) {
        return res.status(400).json({ message: 'Thư mục cha không thuộc dự án này' });
      }
    }
    
    // Verify milestone exists (if provided)
    if (milestone_id) {
      const milestone = await Milestone.findById(milestone_id);
      if (!milestone) {
        return res.status(404).json({ message: 'Không tìm thấy milestone' });
      }
      if (milestone.project_id.toString() !== project_id) {
        return res.status(400).json({ message: 'Milestone không thuộc dự án này' });
      }
    }
    
    // Check if folder name already exists in same parent
    const existingFolder = await Folder.findOne({
      name: name,
      parent_folder_id: parent_folder_id || null,
      project_id: project_id
    });
    
    if (existingFolder) {
      return res.status(409).json({ 
        message: 'Tên thư mục đã tồn tại trong thư mục cha',
        suggestion: 'Hãy chọn tên khác hoặc tạo trong thư mục khác'
      });
    }
    
    const folder = await Folder.create({
      name,
      project_id,
      milestone_id: milestone_id || null,
      parent_folder_id: parent_folder_id || null,
      created_by: req.user._id,
      is_public
    });
    
    await folder.populate([
      { path: 'created_by', select: 'full_name email avatar' },
      { path: 'parent_folder_id', select: 'name path' },
      { path: 'milestone_id', select: 'title' }
    ]);
    
    return res.status(201).json({
      folder,
      message: 'Tạo thư mục thành công'
    });
  } catch (error) {
    console.log('Error creating folder:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// PUT /api/folders/:id
async function updateFolder(req, res) {
  try {
    const { id } = req.params;
    const { 
      name, 
      milestone_id, 
      parent_folder_id,
      is_public 
    } = req.body;
    
    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }
    
    // Verify parent folder exists (if changing)
    if (parent_folder_id && parent_folder_id !== folder.parent_folder_id?.toString()) {
      const parentFolder = await Folder.findById(parent_folder_id);
      if (!parentFolder) {
        return res.status(404).json({ message: 'Không tìm thấy thư mục cha' });
      }
      if (parentFolder.project_id.toString() !== folder.project_id.toString()) {
        return res.status(400).json({ message: 'Thư mục cha không thuộc dự án này' });
      }
      
      // Prevent circular reference
      if (parent_folder_id === id) {
        return res.status(400).json({ message: 'Không thể đặt thư mục làm cha của chính nó' });
      }
    }
    
    // Verify milestone exists (if provided)
    if (milestone_id && milestone_id !== folder.milestone_id?.toString()) {
      const milestone = await Milestone.findById(milestone_id);
      if (!milestone) {
        return res.status(404).json({ message: 'Không tìm thấy milestone' });
      }
      if (milestone.project_id.toString() !== folder.project_id.toString()) {
        return res.status(400).json({ message: 'Milestone không thuộc dự án này' });
      }
    }
    
    // Check if new name conflicts (if changing name)
    if (name && name !== folder.name) {
      const existingFolder = await Folder.findOne({
        name: name,
        parent_folder_id: parent_folder_id || folder.parent_folder_id,
        project_id: folder.project_id,
        _id: { $ne: id }
      });
      
      if (existingFolder) {
        return res.status(409).json({ message: 'Tên thư mục đã tồn tại trong thư mục cha' });
      }
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (milestone_id !== undefined) updateData.milestone_id = milestone_id;
    if (parent_folder_id !== undefined) updateData.parent_folder_id = parent_folder_id;
    if (is_public !== undefined) updateData.is_public = is_public;
    
    const updatedFolder = await Folder.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate([
        { path: 'created_by', select: 'full_name email avatar' },
        { path: 'parent_folder_id', select: 'name path' },
        { path: 'milestone_id', select: 'title' }
      ]);
    
    return res.json({
      folder: updatedFolder,
      message: 'Cập nhật thư mục thành công'
    });
  } catch (error) {
    console.log('Error updating folder:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/folders/:id
async function deleteFolder(req, res) {
  try {
    const { id } = req.params;
    
    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }
    
    // Delete all children folders first
    await Folder.deleteMany({ parent_folder_id: id });
    
    // Delete all documents in this folder
    await Document.deleteMany({ folder_id: id });
    
    // Delete the folder itself
    await folder.deleteOne();
    
    return res.json({
      message: 'Xóa thư mục và tất cả nội dung thành công'
    });
  } catch (error) {
    console.log('Error deleting folder:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// FOLDER UTILITIES

// GET /api/folders/:id/tree
async function getFolderTree(req, res) {
  try {
    const { id } = req.params;
    
    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: 'Không tìm thấy thư mục' });
    }
    
    // Get all descendants recursively
    async function getDescendants(parentId) {
      const children = await Folder.find({ 
        parent_folder_id: parentId
      }).sort({ name: 1 });
      
      const result = [];
      for (const child of children) {
        const descendants = await getDescendants(child._id);
        result.push({
          ...child.toObject(),
          children: descendants
        });
      }
      return result;
    }
    
    const tree = await getDescendants(id);
    
    return res.json({
      folder: folder,
      tree: tree,
      message: 'Lấy cây thư mục thành công'
    });
  } catch (error) {
    console.log('Error getting folder tree:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/folders/search
async function searchFolders(req, res) {
  try {
    const { q, project_id, milestone_id } = req.query;
    
    const filter = {};
    if (project_id) filter.project_id = project_id;
    if (milestone_id) filter.milestone_id = milestone_id;
    
    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }
    
    const folders = await Folder.find(filter)
      .populate([
        { path: 'created_by', select: 'full_name email avatar' },
        { path: 'parent_folder_id', select: 'name path' },
        { path: 'milestone_id', select: 'title' },
        { path: 'project_id', select: 'topic code' }
      ])
      .sort({ name: 1 });
    
    return res.json({
      folders,
      search_query: q,
      message: 'Tìm kiếm thư mục thành công'
    });
  } catch (error) {
    console.log('Error searching folders:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}


// GET /api/folders/user/current - Lấy thông tin user hiện tại
async function getCurrentUser(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }
    
    return res.json({
      user: {
        _id: req.user._id,
        full_name: req.user.full_name,
        email: req.user.email,
        avatar: req.user.avatar
      },
      message: 'Lấy thông tin user thành công'
    });
  } catch (error) {
    console.log('Error getting current user:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

module.exports = {
  getFoldersByProject,
  getFolder,
  createFolder,
  createRootFolder,
  updateFolder,
  deleteFolder,
  getFolderTree,
  searchFolders,
  getCurrentUser
};