const Milestone = require('../models/milestone');
const Comment = require('../models/comment');
const ActivityLog = require('../models/activity_log');
const Document = require('../models/document');
const Feature = require('../models/feature');
const Function = require('../models/function');
const FeaturesMilestone = require('../models/feature_milestone');
const { upload } = require('../config/cloudinary');
const XLSX = require('xlsx');
// Removed business rules imports as milestone model no longer has status

// GET /api/projects/:projectId/milestones
async function listMilestones(req, res) {
  try {
    const { projectId } = req.params;
    const items = await Milestone.find({ project_id: projectId })
      .sort({ deadline: 1, start_date: 1, createdAt: -1 });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/projects/:projectId/milestones
async function createMilestone(req, res) {
  try {
    const { projectId } = req.params;
    let { 
      title, 
      start_date, 
      deadline,
      description, 
      tags,
      feature_ids
    } = req.body || {};
    
    if (!title) {
      return res.status(400).json({ message: 'Thiếu tiêu đề' });
    }
    
    // Get project for validation
    const Project = require('../models/project');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy project' });
    }
    
    // Validate dates
    if (start_date && deadline) {
      const start = new Date(start_date);
      const end = new Date(deadline);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Ngày không hợp lệ' });
      }
      if (start > end) {
        return res.status(400).json({ message: 'Ngày bắt đầu phải trước deadline' });
      }
    }
    
    // Validate milestone dates against project dates
    if (start_date && project.start_date) {
      const milestoneStart = new Date(start_date);
      const projectStart = new Date(project.start_date);
      if (milestoneStart < projectStart) {
        return res.status(400).json({ 
          message: 'Ngày bắt đầu milestone không được trước ngày bắt đầu project' 
        });
      }
    }
    
    if (deadline && project.end_date) {
      const milestoneDeadline = new Date(deadline);
      const projectEnd = new Date(project.end_date);
      if (milestoneDeadline > projectEnd) {
        return res.status(400).json({ 
          message: 'Deadline milestone không được sau ngày kết thúc project' 
        });
      }
    }
    
    if (start_date && project.end_date) {
      const milestoneStart = new Date(start_date);
      const projectEnd = new Date(project.end_date);
      if (milestoneStart > projectEnd) {
        return res.status(400).json({ 
          message: 'Ngày bắt đầu milestone không được sau ngày kết thúc project' 
        });
      }
    }
    
    if (deadline && project.start_date) {
      const milestoneDeadline = new Date(deadline);
      const projectStart = new Date(project.start_date);
      if (milestoneDeadline < projectStart) {
        return res.status(400).json({ 
          message: 'Deadline milestone không được trước ngày bắt đầu project' 
        });
      }
    }
    
    // Generate unique code for milestone
    let code = req.body?.code;
    let attempts = 0;
    const maxAttempts = 10;
    while (!code) {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const candidate = `MS-${timestamp}-${random}`;
      const existing = await Milestone.findOne({ code: candidate });
      attempts++;
      if (!existing) {
        code = candidate;
        break;
      }
      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: 'Không thể tạo mã milestone duy nhất' });
      }
    }
    
    const milestoneData = {
      title,
      project_id: projectId,
      description: description || '',
      code: code,
    };
    
    // Add optional fields
    if (start_date) milestoneData.start_date = new Date(start_date);
    if (deadline) milestoneData.deadline = new Date(deadline);
    if (Array.isArray(tags)) milestoneData.tags = tags;
    
    const milestone = await Milestone.create(milestoneData);
    
    // Link features if provided
    if (Array.isArray(feature_ids) && feature_ids.length > 0) {
      const bulk = feature_ids.map(featureId => ({ 
        feature_id: featureId, 
        milestone_id: milestone._id 
      }));
      await FeaturesMilestone.insertMany(bulk);
    }
    
    // Log activity
    await ActivityLog.create({
      project_id: projectId,
      milestone_id: milestone._id,
      action: 'CREATE_MILESTONE',
      metadata: { title: milestone.title },
      created_by: req.user?._id,
    });
    
    return res.status(201).json(milestone);
  } catch (error) {
    console.log('Error creating milestone:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/projects/:projectId/milestones/from-features - Create milestone by grouping features
async function createMilestoneFromFeatures(req, res) {
  try {
    const { projectId } = req.params;
    const { title, feature_ids, description } = req.body || {};
    
    if (!title || !Array.isArray(feature_ids) || feature_ids.length === 0) {
      return res.status(400).json({ message: 'Thiếu tiêu đề hoặc danh sách features' });
    }
    
    // Get features to calculate dates
    const features = await Feature.find({ 
      _id: { $in: feature_ids },
      project_id: projectId 
    });
    
    if (features.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy features' });
    }
    
    // Calculate start date (earliest feature start)
    const start_date = features.reduce((earliest, f) => {
      if (!f.start_date) return earliest;
      if (!earliest) return f.start_date;
      return new Date(f.start_date) < new Date(earliest) ? f.start_date : earliest;
    }, null);
    
    // Calculate deadline (latest feature deadline)
    const deadline = features.reduce((latest, f) => {
      if (!f.deadline) return latest;
      if (!latest) return f.deadline;
      return new Date(f.deadline) > new Date(latest) ? f.deadline : latest;
    }, null);
    
    // Get project for validation
    const Project = require('../models/project');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy project' });
    }
    
    // Validate milestone dates against project dates
    if (start_date && project.start_date) {
      const milestoneStart = new Date(start_date);
      const projectStart = new Date(project.start_date);
      if (milestoneStart < projectStart) {
        return res.status(400).json({ 
          message: 'Ngày bắt đầu milestone không được trước ngày bắt đầu project' 
        });
      }
    }
    
    if (deadline && project.end_date) {
      const milestoneDeadline = new Date(deadline);
      const projectEnd = new Date(project.end_date);
      if (milestoneDeadline > projectEnd) {
        return res.status(400).json({ 
          message: 'Deadline milestone không được sau ngày kết thúc project' 
        });
      }
    }
    
    if (start_date && project.end_date) {
      const milestoneStart = new Date(start_date);
      const projectEnd = new Date(project.end_date);
      if (milestoneStart > projectEnd) {
        return res.status(400).json({ 
          message: 'Ngày bắt đầu milestone không được sau ngày kết thúc project' 
        });
      }
    }
    
    if (deadline && project.start_date) {
      const milestoneDeadline = new Date(deadline);
      const projectStart = new Date(project.start_date);
      if (milestoneDeadline < projectStart) {
        return res.status(400).json({ 
          message: 'Deadline milestone không được trước ngày bắt đầu project' 
        });
      }
    }
    
    // Generate unique code for milestone (fallback if request did not send one)
    let code = req.body?.code;
    let attempts = 0;
    const maxAttempts = 10;
    while (!code) {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const candidate = `MS-${timestamp}-${random}`;
      const existing = await Milestone.findOne({ code: candidate });
      attempts++;
      if (!existing) {
        code = candidate;
        break;
      }
      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: 'Không thể tạo mã milestone duy nhất' });
      }
    }
    
    const milestone = await Milestone.create({
      title,
      project_id: projectId,
      start_date: start_date || new Date(),
      deadline: deadline,
      description: description || `Milestone tạo từ ${features.length} features`,
      code: code,
    });
    
    // Link all features to this milestone
    const bulk = feature_ids.map(featureId => ({ 
      feature_id: featureId, 
      milestone_id: milestone._id
    }));
    await FeaturesMilestone.insertMany(bulk);
    
    // Log activity
    await ActivityLog.create({
      project_id: projectId,
      milestone_id: milestone._id,
      action: 'CREATE_MILESTONE_FROM_FEATURES',
      metadata: { feature_count: features.length, feature_ids },
    });
    
    return res.status(201).json(milestone);
  } catch (error) {
    console.log('Error creating milestone from features:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}


// PATCH /api/projects/:projectId/milestones/:milestoneId
async function updateMilestone(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    const { 
      start_date, 
      deadline,
      title, 
      description, 
      tags
    } = req.body || {};
    
    // Get current milestone first
    const currentMilestone = await Milestone.findOne({ _id: milestoneId, project_id: projectId });
    if (!currentMilestone) {
      return res.status(404).json({ message: 'Không tìm thấy milestone' });
    }
    
    // Get project for validation
    const Project = require('../models/project');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Không tìm thấy project' });
    }
    
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
    // Status is no longer updatable via API input
    
    // Validate and update dates
    if (start_date !== undefined) {
      const start = new Date(start_date);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ message: 'Ngày bắt đầu không hợp lệ' });
      }
      update.start_date = start;
    }
    if (deadline !== undefined) {
      const end = new Date(deadline);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Deadline không hợp lệ' });
      }
      update.deadline = end;
    }
    
    // Validate start_date < deadline if both are being updated
    const finalStart = update.start_date || currentMilestone.start_date;
    const finalDeadline = update.deadline || currentMilestone.deadline;
    if (finalStart && finalDeadline && new Date(finalStart) > new Date(finalDeadline)) {
      return res.status(400).json({ message: 'Ngày bắt đầu phải trước deadline' });
    }
    
    // Validate milestone dates against project dates
    if (finalStart && project.start_date) {
      const milestoneStart = new Date(finalStart);
      const projectStart = new Date(project.start_date);
      if (milestoneStart < projectStart) {
        return res.status(400).json({ 
          message: 'Ngày bắt đầu milestone không được trước ngày bắt đầu project' 
        });
      }
    }
    
    if (finalDeadline && project.end_date) {
      const milestoneDeadline = new Date(finalDeadline);
      const projectEnd = new Date(project.end_date);
      if (milestoneDeadline > projectEnd) {
        return res.status(400).json({ 
          message: 'Deadline milestone không được sau ngày kết thúc project' 
        });
      }
    }
    
    if (finalStart && project.end_date) {
      const milestoneStart = new Date(finalStart);
      const projectEnd = new Date(project.end_date);
      if (milestoneStart > projectEnd) {
        return res.status(400).json({ 
          message: 'Ngày bắt đầu milestone không được sau ngày kết thúc project' 
        });
      }
    }
    
    if (finalDeadline && project.start_date) {
      const milestoneDeadline = new Date(finalDeadline);
      const projectStart = new Date(project.start_date);
      if (milestoneDeadline < projectStart) {
        return res.status(400).json({ 
          message: 'Deadline milestone không được trước ngày bắt đầu project' 
        });
      }
    }
    
    // Add last_updated_by
    update.last_updated_by = req.user?._id;

    const doc = await Milestone.findOneAndUpdate(
      { _id: milestoneId, project_id: projectId },
      { $set: update },
      { new: true }
    )
    
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy milestone' });
    
    const activityMetadata = { changed: Object.keys(update) };
    
    await ActivityLog.create({ 
      project_id: projectId, 
      milestone_id: milestoneId, 
      action: 'UPDATE_MILESTONE', 
      metadata: activityMetadata, 
      created_by: req.user?._id,
    });
    
    return res.json(doc);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}


// GET /api/projects/:projectId/milestones/:milestoneId
async function getMilestone(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    const doc = await Milestone.findOne({ _id: milestoneId, project_id: projectId })
 
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy milestone' });
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/milestones/:milestoneId/comments
async function listUpdates(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    const items = await Comment.find({
      milestone_id: milestoneId,
      $or: [{ project_id: projectId }, { project_id: { $exists: false } }],
    })
      .populate({ path: 'user_id', select: 'full_name email avatar' })
      .sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/projects/:projectId/milestones/:milestoneId/comments
async function createUpdate(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    const { content, files } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung cập nhật bắt buộc' });
    }
    const created = await Comment.create({
      project_id: projectId,
      milestone_id: milestoneId,
      content: content.trim(),
      files: Array.isArray(files) ? files : [],
      user_id: req.user?._id,
    });
    await created.populate({ path: 'user_id', select: 'full_name email avatar' });
    // Log activity
    await ActivityLog.create({
      project_id: projectId,
      milestone_id: milestoneId,
      action: 'CREATE_COMMENT',
      metadata: { comment_id: created._id },
      created_by: req.user?._id,
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/milestones/:milestoneId/activity-logs
async function listActivityLogs(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    const items = await ActivityLog.find({ project_id: projectId, milestone_id: milestoneId })
      .sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}


// PATCH /api/projects/:projectId/milestones/:milestoneId/comments/:commentId
async function updateComment(req, res) {
  try {
    const { projectId, milestoneId, commentId } = req.params;
    const { content, files } = req.body || {};
    const update = {};
    if (content !== undefined) update.content = String(content).trim();
    if (files !== undefined) update.files = Array.isArray(files) ? files : [];

    const existing = await Comment.findOne({
      _id: commentId,
      milestone_id: milestoneId,
      $or: [{ project_id: projectId }, { project_id: { $exists: false } }],
    });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    if (!existing.project_id && projectId) {
      existing.project_id = projectId;
      await existing.save();
    }
    if (String(existing.user_id) !== String(req.user?._id)) {
      return res.status(403).json({ message: 'Không có quyền sửa bình luận này' });
    }

    const updated = await Comment.findByIdAndUpdate(commentId, { $set: update }, { new: true })
      .populate({ path: 'user_id', select: 'full_name email avatar' });

    await ActivityLog.create({
      project_id: projectId,
      milestone_id: milestoneId,
      action: 'UPDATE_COMMENT',
      metadata: { comment_id: commentId, changed: Object.keys(update) },
      created_by: req.user?._id,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/projects/:projectId/milestones/:milestoneId/comments/:commentId
async function deleteComment(req, res) {
  try {
    const { projectId, milestoneId, commentId } = req.params;
    const existing = await Comment.findOne({
      _id: commentId,
      milestone_id: milestoneId,
      $or: [{ project_id: projectId }, { project_id: { $exists: false } }],
    });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    if (String(existing.user_id) !== String(req.user?._id)) {
      return res.status(403).json({ message: 'Không có quyền xóa bình luận này' });
    }

    await Comment.deleteOne({ _id: commentId });

    await ActivityLog.create({
      project_id: projectId,
      milestone_id: milestoneId,
      action: 'DELETE_COMMENT',
      metadata: { comment_id: commentId },
      created_by: req.user?._id,
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ==========================================
// MILESTONE FILES & ACTIVITY
// ==========================================

// GET /api/projects/:projectId/milestones/:milestoneId/files
async function listFiles(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    // Note: Document model không có milestone_id field, chỉ query theo project_id
    const items = await Document.find({ project_id: projectId })
      .sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/projects/:projectId/milestones/:milestoneId/files (multipart/form-data, field: file)
async function uploadFile(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'Thiếu file' });
    }

    const fileUrl = req.file.path; // cloudinary secure_url
    const body = req.body || {};
    const type = body.type || req.file.mimetype || 'application/octet-stream';
    const title = body.title || req.file.originalname || 'file';
    const version = body.version || '1.0';
    const status = body.status || 'Pending';
    const description = body.description || '';
    // Note: Document model không có milestone_id, approve_by, status, description fields
    const created = await Document.create({
      project_id: projectId,
      // milestone_id: milestoneId, // Document model không có field này
      type,
      title,
      version,
      file_url: fileUrl,
      created_by: req.user?._id,
     
    });

    await ActivityLog.create({
      project_id: projectId,
      milestone_id: milestoneId,
      action: 'UPLOAD_FILE',
      metadata: { document_id: created._id, file_url: fileUrl },
      created_by: req.user?._id,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/milestones/:milestoneId/activity-logs
async function listActivityLogs(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    const items = await ActivityLog.find({ project_id: projectId, milestone_id: milestoneId })
      .populate({ path: 'created_by', select: 'full_name email avatar' })
      .sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}



// DELETE /api/projects/:projectId/milestones/:milestoneId
async function deleteMilestone(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    const { force = false } = req.query;

    // Check if milestone exists
    const milestone = await Milestone.findOne({ _id: milestoneId, project_id: projectId });
    if (!milestone) {
      return res.status(404).json({ message: 'Không tìm thấy milestone' });
    }

    // Check if milestone has dependencies (comments, attachments)
    // Note: Features are NOT deleted, only the links are removed
    const Attachment = require('../models/attachment');
    
    if (!force) {
      const comments = await Comment.find({ milestone_id: milestoneId });
      const attachments = await Attachment.find({ milestone_id: milestoneId });

      // Only block deletion if there are comments or attachments (features links will be removed automatically)
      if (comments.length > 0 || attachments.length > 0) {
        return res.status(400).json({ 
          message: 'Không thể xóa milestone có dữ liệu liên quan',
          dependencies: {
            comments: comments.length,
            attachments: attachments.length
          },
          suggestion: 'Sử dụng force=true để xóa tất cả dữ liệu liên quan.'
        });
      }
    }

    // Delete related data - Cascade delete
    // Delete feature-milestone links
    await FeaturesMilestone.deleteMany({ milestone_id: milestoneId });
    
    // Delete comments
    await Comment.deleteMany({ milestone_id: milestoneId });
    
    // Delete attachments (including Firebase Storage files)
    const attachments = await Attachment.find({ milestone_id: milestoneId });
    for (const attachment of attachments) {
      // Delete file from Firebase Storage if not a link attachment
      if (!attachment.is_link && attachment.file_url) {
        try {
          const { storage, ref, deleteObject } = require('../config/firebase');
          const url = new URL(attachment.file_url);
          const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
          if (pathMatch) {
            const filePath = decodeURIComponent(pathMatch[1]);
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);
            console.log(`[Milestone Delete] Đã xóa file từ Firebase Storage: ${filePath}`);
          }
        } catch (storageError) {
          console.log('Error deleting file from Firebase Storage:', storageError);
          // Continue even if file deletion fails
        }
      }
    }
    await Attachment.deleteMany({ milestone_id: milestoneId });
    
    // Delete activity logs
    await ActivityLog.deleteMany({ milestone_id: milestoneId });

    // Delete milestone
    await Milestone.deleteOne({ _id: milestoneId });

    // Log the deletion (create new activity log after deleting old ones)
    await ActivityLog.create({
      project_id: projectId,
      action: 'DELETE_MILESTONE',
      metadata: { milestone_id: milestoneId, title: milestone.title, force: force },
      created_by: req.user?._id,
    });

    return res.json({ success: true, message: 'Milestone đã được xóa' });
  } catch (error) {
    console.log('Error deleting milestone:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}


// POST /api/projects/:projectId/milestones/:milestoneId/files (multipart/form-data, field: file)
async function uploadFile(req, res) {
  try {
    const { projectId, milestoneId } = req.params;
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'Thiếu file' });
    }

    const fileUrl = req.file.path; // cloudinary secure_url
    const body = req.body || {};
    const type = body.type || req.file.mimetype || 'application/octet-stream';
    const title = body.title || req.file.originalname || 'file';
    const version = body.version || '1.0';
    const status = body.status || 'Pending';
    const description = body.description || '';
    const created = await Document.create({
      project_id: projectId,
      milestone_id: milestoneId,
      type,
      title,
      version,
      file_url: fileUrl,
      created_by: req.user?._id,
      approve_by: req.user?._id, // placeholder; adjust workflow later
      status,
      description,
    });

    await ActivityLog.create({
      project_id: projectId,
      milestone_id: milestoneId,
      action: 'UPLOAD_FILE',
      metadata: { document_id: created._id, file_url: fileUrl },
      created_by: req.user?._id,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}


// GET /api/milestones/rules - Get milestone business rules
async function getMilestoneRules(req, res) {
  try {
    const { getStatusTransitionRules } = require('../utils/milestoneBusinessRules');
    const rules = getStatusTransitionRules();
    
    return res.json({
      success: true,
      data: rules,
      description: 'Các quy tắc kinh doanh cho Milestone (Milestone Business Rules)'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}


// GET /api/projects/:projectId/gantt/hierarchy - Get milestones with features and functions for Gantt filter
async function getGanttHierarchy(req, res) {
  try {
    const { projectId } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'projectId không hợp lệ' });
    }

    // Get all milestones for the project
    const milestones = await Milestone.find({ project_id: projectId })
      .sort({ start_date: 1, deadline: 1, createdAt: -1 });

    // Get all feature-milestone links
    const featureLinks = await FeaturesMilestone.find({
      milestone_id: { $in: milestones.map(m => m._id) }
    });

    // Group features by milestone
    const milestoneFeatureMap = new Map();
    featureLinks.forEach(link => {
      const milestoneId = String(link.milestone_id);
      if (!milestoneFeatureMap.has(milestoneId)) {
        milestoneFeatureMap.set(milestoneId, []);
      }
      milestoneFeatureMap.get(milestoneId).push(String(link.feature_id));
    });

    // Get all features
    const allFeatureIds = [...new Set(featureLinks.map(link => String(link.feature_id)))];
    const features = await Feature.find({ _id: { $in: allFeatureIds } })
      .select('_id title project_id');

    // Get all functions for these features
    const functions = await Function.find({ feature_id: { $in: allFeatureIds } })
      .select('_id title feature_id');

    // Group functions by feature
    const featureFunctionMap = new Map();
    functions.forEach(func => {
      const featureId = String(func.feature_id);
      if (!featureFunctionMap.has(featureId)) {
        featureFunctionMap.set(featureId, []);
      }
      featureFunctionMap.get(featureId).push({
        id: String(func._id),
        name: func.title
      });
    });

    // Build the hierarchy
    const result = milestones.map(milestone => {
      const milestoneId = String(milestone._id);
      const featureIds = milestoneFeatureMap.get(milestoneId) || [];
      
      const milestoneFeatures = features
        .filter(f => featureIds.includes(String(f._id)))
        .map(feature => {
          const featureId = String(feature._id);
          const functionList = featureFunctionMap.get(featureId) || [];
          
          return {
            id: featureId,
            name: feature.title,
            functions: functionList
          };
        });

      return {
        id: milestoneId,
        name: milestone.title,
        features: milestoneFeatures
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('Error getting Gantt hierarchy:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

module.exports = {
  // CRUD Operations
  listMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  
  // Features & Progress
  createMilestoneFromFeatures,
  getGanttHierarchy,
  
  // Comments & Updates
  listUpdates,
  createUpdate,
  updateComment,
  deleteComment,
  
  // Files & Activity
  listFiles,
  uploadFile,
  listActivityLogs,
  
  // Utilities & Rules
  getMilestoneRules,
  deleteMilestone,
  
  // Middleware
  uploadMiddleware: upload.single('file')
};
