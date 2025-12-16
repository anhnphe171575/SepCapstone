const Feature = require('../models/feature');
const FeaturesMilestone = require('../models/feature_milestone');
const { validateAllFeatureRules, validateCanDeleteFeature } = require('../utils/featureBusinessRules');
const Task = require('../models/task');
const Comment = require('../models/comment');
const ActivityLog = require('../models/activity_log');
const Attachment = require('../models/attachment');
const mongoose = require('mongoose');






// GET /api/features/:featureId - Get single feature with full populate
async function getFeature(req, res) {
  try {
    const { featureId } = req.params;
    const feature = await Feature.findById(featureId)    
    if (!feature) {
      return res.status(404).json({ message: 'Không tìm thấy feature' });
    }
    
    return res.json(feature);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/features
async function listFeatures(req, res) {
  try {
    const { projectId } = req.params;
    
    // Use project_id from Feature model directly
    const items = await Feature.find({ project_id: projectId })
      .sort({ createdAt: -1 });
      
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/features/project/:projectId - Features with tasks (name, assignee, status, priority)
async function getAllFeaturesByProjectId(req, res) {
  try {
    const { projectId } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: 'projectId không hợp lệ',
        error: 'Invalid ObjectId format'
      });
    }

    const features = await Feature.aggregate([
      { $match: { project_id: new mongoose.Types.ObjectId(projectId) } },
      {
        $lookup: {
          from: 'functions',
          localField: '_id',
          foreignField: 'feature_id',
          as: 'functions'
        }
      },
      {
        $lookup: {
          from: 'tasks',
          let: { functionIds: '$functions._id' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$function_id', '$$functionIds'] },
                is_deleted: { $ne: true }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'assignee_id',
                foreignField: '_id',
                as: 'assignee'
              }
            },
            { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                title: 1,
                status: 1,
                priority: 1,
                assignee: { _id: '$assignee._id', full_name: '$assignee.full_name', email: '$assignee.email' }
              }
            },
            { $sort: { createAt: -1 } }
          ],
          as: 'tasks'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          project_id: 1,
          priority: 1,
          status: 1,
          start_date: 1,
          end_date: 1,
          description: 1,
          tags: 1,
          functions: {
            $map: {
              input: '$functions',
              as: 'f',
              in: { _id: '$$f._id', title: '$$f.title', status: '$$f.status' }
            }
          },
          tasks: 1,
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    // Optionally populate Setting/User refs for feature brief info
    // If you need names for priority/status/complexity, client can call existing listFeatures

    return res.json(features);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/projects/:projectId/features
async function createFeature(req, res) {
  try {
    const { projectId } = req.params;
    const { 
      title, 
      description, 
      milestone_ids, 
      priority,
      start_date,
      end_date,
      tags
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
    
    // Status không cho phép chỉnh sửa thủ công, sẽ tự động cập nhật từ functions
    // Sử dụng default "To Do" từ model nếu không có
    
    // Validate business rules  - simplified
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        message: 'Start date không được sau end date'
      });
    }
    
    if (start_date && project.start_date && new Date(start_date) < new Date(project.start_date)) {
      return res.status(400).json({
        message: 'Feature start date không được trước project start date'
      });
    }
                                                                                                                                                                                                  
    if (end_date && project.end_date && new Date(end_date) > new Date(project.end_date)) {
      return res.status(400).json({
        message: 'Feature end date không được sau project end date'
      });
    }
    
    const created = await Feature.create({
      title,
      description,
      project_id: projectId,
      priority,
      // status sẽ được set mặc định "To Do" từ model
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      tags: Array.isArray(tags) ? tags : [],
    });

    // Optional link milestones
    if (Array.isArray(milestone_ids) && milestone_ids.length > 0) {
      const bulk = milestone_ids.map(milestoneId => ({ feature_id: created._id, milestone_id: milestoneId }));
      await FeaturesMilestone.insertMany(bulk);
    }

    // Populate before returning
    const populated = await Feature.findById(created._id)

    // Log activity
    await ActivityLog.create({
      project_id: projectId,
      feature_id: created._id,
      action: 'CREATE_FEATURE',
      metadata: { feature_id: created._id, title: created.title },
      created_by: req.user?._id 
    });

    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// PATCH /api/features/:featureId
async function updateFeature(req, res) {
  try {
    const { featureId } = req.params;
    const { 
      title,
      description,
      priority,
      start_date,
      end_date,
      tags
    } = req.body || {};
    
    // Get current feature
    const currentFeature = await Feature.findById(featureId);
    if (!currentFeature) {
      return res.status(404).json({ message: 'Không tìm thấy feature' });
    }
    
  
    // Get project for date validation
    const Project = require('../models/project');
    const project = await Project.findById(currentFeature.project_id);
    
    // Validate business rules - simplified
    const finalStartDate = start_date !== undefined ? start_date : currentFeature.start_date;
    const finalEndDate = end_date !== undefined ? end_date : currentFeature.end_date;
    
    if (finalStartDate && finalEndDate && new Date(finalStartDate) > new Date(finalEndDate)) {
      return res.status(400).json({
        message: 'Start date không được sau end date'
      });
    }
    
    if (finalStartDate && project?.start_date && new Date(finalStartDate) < new Date(project.start_date)) {
      return res.status(400).json({
        message: 'Feature start date không được trước project start date'
      });
    }
    
    if (finalEndDate && project?.end_date && new Date(finalEndDate) > new Date(project.end_date)) {
      return res.status(400).json({
        message: 'Feature end date không được sau project end date'
      });
    }

    const update = {};
    
    
  
    
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (priority !== undefined) update.priority = priority === null || priority == '' ? null : priority;
    // Status không cho phép chỉnh sửa thủ công, chỉ tự động cập nhật từ functions
    // if (status !== undefined) update.status = status;
    if (start_date !== undefined) update.start_date = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) update.end_date = end_date ? new Date(end_date) : null;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
    }

    update.last_updated_by = req.user?._id;
    update.updatedAt = new Date();
    
    const updated = await Feature.findByIdAndUpdate(featureId, update, { new: true })
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy feature' });

    // Log activity for updates
    const activityLogs = [];
    
    if (priority !== undefined && String(priority || '') !== String(currentFeature.priority || '')) {
      const oldPriority = typeof currentFeature.priority === 'string' ? currentFeature.priority : (typeof currentFeature.priority === 'object' ? currentFeature.priority.name : null);
      const newPriority = typeof updated.priority === 'string' ? updated.priority : (typeof updated.priority === 'object' ? updated.priority?.name : null);
      
      activityLogs.push({
        project_id: updated.project_id,
        feature_id: featureId,
        action: 'FEATURE_PRIORITY_CHANGED',
        metadata: {
          old_value: oldPriority,
          new_value: newPriority,
        },
        created_by: req.user?._id,
      });
    }
    
    if (title !== undefined && title !== currentFeature.title) {
      activityLogs.push({
        project_id: updated.project_id,
        feature_id: featureId,
        action: 'FEATURE_TITLE_UPDATED',
        metadata: {
          old_value: currentFeature.title,
          new_value: title,
        },
        created_by: req.user?._id,
      });
    }
    
    if (description !== undefined && description !== (currentFeature.description || '')) {
      activityLogs.push({
        project_id: updated.project_id,
        feature_id: featureId,
        action: 'FEATURE_DESCRIPTION_UPDATED',
        metadata: {},
        created_by: req.user?._id,
      });
    }
    
    // Create activity logs in parallel
    if (activityLogs.length > 0) {
      await ActivityLog.insertMany(activityLogs);
    }
    
    // If no specific activity logged but there are updates, log a general update
    if (activityLogs.length === 0 && Object.keys(update).filter(k => !['last_updated_by', 'updatedAt'].includes(k)).length > 0) {
      await ActivityLog.create({
        project_id: updated.project_id,
        feature_id: featureId,
        action: 'UPDATE_FEATURE',
        metadata: {},
        created_by: req.user?._id,
      });
    }
    
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/features/:featureId/milestones
async function linkMilestones(req, res) {
  try {
    const { featureId } = req.params;
    const { milestone_ids } = req.body || {};
    if (!Array.isArray(milestone_ids) || milestone_ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách milestone rỗng' });
    }
    
    // Xóa tất cả liên kết cũ trước
    await FeaturesMilestone.deleteMany({ feature_id: featureId });
    
    // Tạo liên kết mới (loại bỏ duplicate)
    const uniqueMilestoneIds = [...new Set(milestone_ids)];
    const bulk = uniqueMilestoneIds.map(milestoneId => ({ feature_id: featureId, milestone_id: milestoneId }));
    await FeaturesMilestone.insertMany(bulk);
    
    return res.json({ message: 'Liên kết milestone thành công', success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message});
  }
}

// DELETE /api/features/:featureId/milestones
async function unlinkAllMilestones(req, res) {
  try {
    const { featureId } = req.params;
    await FeaturesMilestone.deleteMany({ feature_id: featureId });
    return res.json({ message: 'Gỡ liên kết milestone thành công', success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/features/:featureId/milestones
async function listLinkedMilestones(req, res) {
  try {
    const { featureId } = req.params;
    const links = await FeaturesMilestone.find({ feature_id: featureId }).select('milestone_id');
    return res.json(links.map(l => String(l.milestone_id)));
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}



// DELETE /api/features/:featureId
async function deleteFeature(req, res) {
  try {
    const { featureId } = req.params;
    const { force = false } = req.query;
    
    const feature = await Feature.findById(featureId);
    if (!feature) {
      return res.status(404).json({ message: 'Không tìm thấy feature' });
    }
    
    // Get status value for validation (feature.status is already a string enum)
    const statusValue = typeof feature.status === 'string' ? feature.status : (feature.status?.name || feature.status || 'To Do');
    
    // Business Rule 1.2: Cannot delete in-progress/testing/completed features
    const deleteValidation = validateCanDeleteFeature(statusValue);
    if (!deleteValidation.canDelete && !force) {
      return res.status(400).json({
        message: deleteValidation.reason,
        featureStatus: statusValue,
        suggestion: 'Hãy chuyển sang trạng thái khác (ví dụ: cancelled) trước khi xóa.'
      });
    }
    
    // Rule 3.3: Check if feature has tasks/functions
    if (!force) {
      const Task = require('../models/task');
      const Function = require('../models/function');
      
      const functions = await Function.find({ feature_id: featureId });
      const functionIds = functions.map(f => f._id);
      const tasks = await Task.find({ function_id: { $in: functionIds } });
      
      const { validateRule33 } = require('../utils/featureBusinessRules');
      const rule33 = validateRule33(tasks.length, functions.length);
      
      if (!rule33.valid) {
        return res.status(400).json({
          message: rule33.error,
          dependencies: {
            tasks: tasks.length,
            functions: functions.length
          },
          suggestion: 'Xóa tasks/functions trước hoặc sử dụng force=true'
        });
      }
    }
    
    // Delete related data - Cascade delete
    const Task = require('../models/task');
    const Function = require('../models/function');
    const ActivityLog = require('../models/activity_log');
    const Comment = require('../models/comment');
    const Attachment = require('../models/attachment');
    
    // Get all functions related to this feature
    const functionsToDelete = await Function.find({ feature_id: featureId }).select('_id');
    const functionIds = functionsToDelete.map(f => f._id);
    
    // Get all task IDs related to these functions
    const tasks = await Task.find({ function_id: { $in: functionIds } }).select('_id');
    const taskIds = tasks.map(t => t._id);
    
    // Delete task dependencies related to these tasks
    if (taskIds.length > 0) {
      const TaskDependency = require('../models/task_dependency');
      // Delete dependencies where these tasks are the dependent task (task_id)
      await TaskDependency.deleteMany({ task_id: { $in: taskIds } });
      
      // Delete dependencies where these tasks are the dependency (depends_on_task_id)
      await TaskDependency.deleteMany({ depends_on_task_id: { $in: taskIds } });
    }
    
    // Delete tasks related to functions
    await Task.deleteMany({ function_id: { $in: functionIds } });
    
    // Delete comments related to functions
    await Comment.deleteMany({ function_id: { $in: functionIds } });
    
    // Delete attachments related to functions (including Firebase Storage files)
    const functionAttachments = await Attachment.find({ function_id: { $in: functionIds } });
    for (const attachment of functionAttachments) {
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
            console.log(`[Feature Delete] Đã xóa file từ Firebase Storage: ${filePath}`);
          }
        } catch (storageError) {
          console.log('Error deleting file from Firebase Storage:', storageError);
          // Continue even if file deletion fails
        }
      }
    }
    await Attachment.deleteMany({ function_id: { $in: functionIds } });
    
    // Delete activity logs related to functions
    await ActivityLog.deleteMany({ function_id: { $in: functionIds } });
    
    // Delete all functions
    await Function.deleteMany({ feature_id: featureId });
    
    // Delete feature-milestone links
    await FeaturesMilestone.deleteMany({ feature_id: featureId });
    
    // Delete comments related to feature
    await Comment.deleteMany({ feature_id: featureId });
    
    // Delete attachments related to feature (including Firebase Storage files)
    const featureAttachments = await Attachment.find({ feature_id: featureId });
    for (const attachment of featureAttachments) {
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
            console.log(`[Feature Delete] Đã xóa file từ Firebase Storage: ${filePath}`);
          }
        } catch (storageError) {
          console.log('Error deleting file from Firebase Storage:', storageError);
          // Continue even if file deletion fails
        }
      }
    }
    await Attachment.deleteMany({ feature_id: featureId });
    
    // Delete activity logs related to feature
    await ActivityLog.deleteMany({ feature_id: featureId });
    
    // Delete feature
    await Feature.deleteOne({ _id: featureId });
    
    // Log deletion (create new activity log after deleting old ones)
    await ActivityLog.create({
      project_id: feature.project_id,
      action: 'DELETE_FEATURE',
      metadata: { feature_id: featureId, title: feature.title, deletedStatus: statusValue, force },
      created_by: req.user?._id
    });
    
    return res.json({ success: true, message: 'Feature đã được xóa' });
  } catch (error) {
    console.log('Error deleting feature:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/features/stats - Get feature statistics for project


// GET /api/features/:featureId/comments
async function listCommentsByFeatureId(req, res) {
  try {
    const { featureId } = req.params;
    const feature = await Feature.findById(featureId).select('project_id');
    if (!feature) {
      return res.status(404).json({ message: 'Không tìm thấy feature' });
    }
    
    const comments = await Comment.find({ 
      feature_id: featureId,
      $or: [
        { function_id: { $exists: false } },
        { function_id: null }
      ]
    })
      .populate({ path: 'user_id', select: 'full_name email avatar' })
      .sort({ createdAt: -1 });
    
    return res.json({ message: 'Lấy danh sách comment thành công', success: true, comments: comments });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/features/:featureId/comments
async function createCommentByFeatureId(req, res) {
  try {
    const { featureId } = req.params;
    const { content } = req.body || {};
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung comment bắt buộc' });
    }
    
    const feature = await Feature.findById(featureId).select('project_id');
    if (!feature) {
      return res.status(404).json({ message: 'Không tìm thấy feature' });
    }
    
    const comment = await Comment.create({
      project_id: feature.project_id,
      feature_id: featureId,
      content,
      user_id: req.user?._id,
    });
    
    await comment.populate({ path: 'user_id', select: 'full_name email avatar' });
    
    // Log activity
    await ActivityLog.create({
      project_id: feature.project_id,
      feature_id: featureId,
      action: 'CREATE_COMMENT',
      metadata: { comment_id: comment._id },
      created_by: req.user?._id,
    });
    
    return res.status(201).json({ message: 'Thêm comment thành công', success: true, comment: comment });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/features/:featureId/activity-logs
async function listActivityLogs(req, res) {
  try {
    const { featureId } = req.params;
    const feature = await Feature.findById(featureId).select('project_id');
    if (!feature) {
      return res.status(404).json({ message: 'Không tìm thấy feature' });
    }
    
    const logs = await ActivityLog.find({ 
      project_id: feature.project_id,
      feature_id: featureId 
    })
      .populate({ path: 'created_by', select: 'full_name email avatar' })
      .sort({ createdAt: -1 });
    
    return res.json({message: 'Lấy log activity logs thành công', data: logs});
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// PATCH /api/features/:featureId/comments/:commentId
async function updateCommentByFeatureId(req, res) {
  try {
    const { featureId, commentId } = req.params;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung comment không được rỗng' });
    }
    
    const feature = await Feature.findById(featureId).select('project_id');
    if (!feature) {
      return res.status(404).json({ message: 'Không tìm thấy feature' });
    }
    
    const comment = await Comment.findOneAndUpdate(
      { 
        _id: commentId, 
        feature_id: featureId, 
        user_id: req.user?._id,
        $or: [
          { function_id: { $exists: false } },
          { function_id: null }
        ]
      },
      { $set: { content: content.trim() } },
      { new: true }
    ).populate({ path: 'user_id', select: 'full_name email avatar' });
    
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy comment hoặc bạn không có quyền sửa' });
    }
    
    // Log activity
    await ActivityLog.create({
      project_id: feature.project_id,
      feature_id: featureId,
      action: 'UPDATE_COMMENT',
      metadata: { comment_id: comment._id },
      created_by: req.user?._id,
    });
    
      return res.json({ message: 'Cập nhật comment thành công', success: true, comment: comment });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/features/:featureId/comments/:commentId
async function deleteCommentByFeatureId(req, res) {
  try {
    const { featureId, commentId } = req.params;
    
    const feature = await Feature.findById(featureId).select('project_id');
    if (!feature) {
      return res.status(404).json({ message: 'Không tìm thấy feature' });
    }
    
    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      feature_id: featureId,
      user_id: req.user?._id,
      $or: [
        { function_id: { $exists: false } },
        { function_id: null }
      ],
    });
    
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy comment hoặc bạn không có quyền xóa' });
    }
    
    // Log activity
    await ActivityLog.create({
      project_id: feature.project_id,
      feature_id: featureId,
      action: 'DELETE_COMMENT',
      metadata: { comment_id: commentId },
      created_by: req.user?._id,
    });
    
    return res.json({ message: 'Xóa comment thành công', success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ============== ATTACHMENTS ==============

// GET /api/features/:featureId/attachments
async function getAttachments(req, res) {
  try {
    const { featureId } = req.params;
    
    const attachments = await Attachment.find({ feature_id: featureId })
      .populate('uploaded_by', 'full_name email')
      .sort({ createdAt: -1 });
    
    return res.json(attachments);
  } catch (error) {
    console.log('Error getting attachments:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/features/:featureId/attachments
// Hỗ trợ 2 cách: upload file thực sự (multipart/form-data) hoặc link attachment (JSON)
async function addAttachment(req, res) {
  try {
    const { featureId } = req.params;
    
    // Lấy feature để lấy project_id
    const feature = await Feature.findById(featureId).select('project_id title');
    if (!feature) {
      return res.status(404).json({ message: 'Không tìm thấy feature' });
    }
    
    const projectId = feature.project_id;
    if (!projectId) {
      return res.status(400).json({ message: 'Không thể xác định project_id từ feature' });
    }
    
    let file_name, file_url, file_type, file_size, description, is_link;
    
    // Nếu có file upload (multipart/form-data)
    if (req.file && req.file.buffer) {
      // Upload file lên Firebase Storage
      const { storage, ref, uploadBytes, getDownloadURL } = require('../config/firebase');
      
      const originalName = req.file.originalname;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${originalName}`;
      const filePath = `feature_attachments/${projectId}/${featureId}/${fileName}`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, req.file.buffer, { 
        contentType: req.file.mimetype 
      });
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      file_url = downloadURL; // Firebase Storage download URL
      file_name = req.body.file_name || originalName || 'file';
      file_type = req.file.mimetype || req.body.file_type || '';
      file_size = req.file.size || 0;
      description = req.body.description || '';
      is_link = false;
    } else {
      // Link attachment (JSON)
      const body = req.body || {};
      file_name = body.file_name;
      file_url = body.file_url;
      file_type = body.file_type || '';
      file_size = body.file_size || 0;
      description = body.description || '';
      is_link = body.is_link !== undefined ? body.is_link : true; // Mặc định là link nếu không có file upload
      
      if (!file_name || !file_url) {
        return res.status(400).json({ message: 'Thiếu thông tin file_name hoặc file_url' });
      }
    }
    
    const attachment = await Attachment.create({
      feature_id: featureId,
      project_id: projectId,
      uploaded_by: req.user?._id,
      file_name,
      file_url,
      file_type: file_type || '',
      file_size: file_size || 0,
      description: description || '',
      is_link: is_link || false,
    });
    
    await attachment.populate('uploaded_by', 'full_name email');
    
    // Log activity
    try {
      await ActivityLog.create({
        project_id: projectId,
        feature_id: featureId,
        action: 'UPLOAD_ATTACHMENT',
        metadata: { 
          attachment_id: attachment._id, 
          file_name: file_name,
          file_url: file_url,
          is_link: is_link 
        },
        created_by: req.user?._id,
      });
    } catch (logError) {
      console.log('Error logging attachment activity:', logError);
      // Không fail request nếu log lỗi
    }
    
    return res.status(201).json(attachment);
  } catch (error) {
    console.log('Error adding attachment:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/features/:featureId/attachments/:attachmentId
async function deleteAttachment(req, res) {
  try {
    const { featureId, attachmentId } = req.params;
    
    const attachment = await Attachment.findOne({
      _id: attachmentId,
      feature_id: featureId,
    });
    
    if (!attachment) {
      return res.status(404).json({ message: 'Không tìm thấy attachment' });
    }
    
    // Xóa file từ Firebase Storage nếu không phải link attachment
    if (!attachment.is_link && attachment.file_url) {
      try {
        const { storage, ref, deleteObject } = require('../config/firebase');
        
        // Extract path từ Firebase URL
        const url = new URL(attachment.file_url);
        const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          const fileRef = ref(storage, filePath);
          await deleteObject(fileRef);
          console.log(`[Feature Attachment] Đã xóa file từ Firebase Storage: ${filePath}`);
        }
      } catch (storageError) {
        console.log('Error deleting file from Firebase Storage:', storageError);
        // Tiếp tục xóa attachment ngay cả khi không xóa được file
      }
    }
    
    // Xóa attachment từ database
    await Attachment.findByIdAndDelete(attachmentId);
    
    // Log activity
    try {
      const feature = await Feature.findById(featureId).select('project_id');
      if (feature && feature.project_id) {
        await ActivityLog.create({
          project_id: feature.project_id,
          feature_id: featureId,
          action: 'DELETE_ATTACHMENT',
          metadata: { 
            attachment_id: attachmentId, 
            file_name: attachment.file_name,
            is_link: attachment.is_link 
          },
          created_by: req.user?._id,
        });
      }
    } catch (logError) {
      console.log('Error logging delete attachment activity:', logError);
      // Không fail request nếu log lỗi
    }
    
    return res.json({ success: true, message: 'Xóa attachment thành công' });
  } catch (error) {
    console.log('Error deleting attachment:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

module.exports = { 
  getFeature,
  listFeatures, 
  createFeature, 
  updateFeature,
  deleteFeature,
  linkMilestones,
  unlinkAllMilestones,
  listLinkedMilestones,
  getAllFeaturesByProjectId,
  listCommentsByFeatureId,
  createCommentByFeatureId,
  updateCommentByFeatureId,
  deleteCommentByFeatureId,
  listActivityLogs,
  getAttachments,
  addAttachment,
  deleteAttachment
};


