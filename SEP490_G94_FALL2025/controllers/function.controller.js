const Function = require('../models/function');
const ActivityLog = require('../models/activity_log');
const Attachment = require('../models/attachment');
const mongoose = require('mongoose');

// GET /api/projects/:projectId/functions
async function listFunctions(req, res) {
  try {
    const { projectId } = req.params;
    const { feature_id, status } = req.query;
    
    // Note: project_id removed from Function model, filter by feature's project instead
    let filter = {};
    
    if (feature_id) {
      filter.feature_id = feature_id;
    } else {
      // Get all features from this project, then filter functions
      const Feature = require('../models/feature');
      const features = await Feature.find({ project_id: projectId }).select('_id');
      const featureIds = features.map(f => f._id);
      
      // If project has no features, return empty array
      if (featureIds.length === 0) {
        return res.json([]);
      }
      
      filter.feature_id = { $in: featureIds };
    }
    
    if (status) filter.status = status;

    const functions = await Function.find(filter)
      .populate('feature_id', 'title')
      .sort({ createdAt: -1 });

    return res.json(functions);
  } catch (error) {
    console.log('Error listing functions:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/features/:featureId/functions
async function listFunctionsByFeature(req, res) {
  try {
    const { featureId } = req.params;
    
    const functions = await Function.find({ feature_id: featureId })
      .sort({ createdAt: -1 });

    return res.json({ message: 'Lấy danh sách function thành công', functions });
  } catch (error) {
    console.log('Error listing functions by feature:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/projects/:projectId/functions
async function createFunction(req, res) {
  try {
    const { projectId } = req.params;
    const { 
      title, 
      priority,
      feature_id, 
      description 
    } = req.body;

    if (!title) {
      return res.status(400).json({ 
        message: 'Thiếu thông tin bắt buộc: title' 
      });
    }

    
    // Kiểm tra feature có thuộc project không (nếu có feature_id)
    if (feature_id) {
      const Feature = require('../models/feature');
      const feature = await Feature.findOne({ _id: feature_id, project_id: projectId });
      if (!feature) {
        return res.status(404).json({ message: 'Không tìm thấy feature trong project này' });
      }
    }

    // Status không cho phép chỉnh sửa thủ công, sẽ tự động cập nhật từ tasks
    // Sử dụng default "To Do" từ model nếu không có
    const func = await Function.create({
      title,
      priority: priority || null,
      // status sẽ được set mặc định "To Do" từ model
      feature_id: feature_id || null,
      description
    });

    // Log activity (get project_id from feature if available)
    let logProjectId = projectId;
    if (feature_id) {
      const Feature = require('../models/feature');
      const feature = await Feature.findById(feature_id).select('project_id');
      logProjectId = feature?.project_id || projectId;
    }
    
    await ActivityLog.create({
      project_id: logProjectId,
      feature_id: feature_id || null,
      action: 'CREATE_FUNCTION',
      metadata: { function_id: func._id, function_title: func.title, feature_id: feature_id },
      created_by: req.user?._id,
    });

    return res.status(201).json({ message: 'Tạo chức năng thành công', func });
  } catch (error) {
    console.log('Error creating function:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// PATCH /api/functions/:functionId
async function updateFunction(req, res) {
  try {
    const { functionId } = req.params;
    const { 
      title, 
      priority,
      description,
      feature_id
    } = req.body;

   
    const update = {};
    if (title !== undefined) update.title = title;
    if (priority !== undefined) update.priority = priority === null || priority == '' ? null : priority;
    // Status không cho phép chỉnh sửa thủ công, chỉ tự động cập nhật từ tasks
    // if (status !== undefined) update.status = status;
    if (description !== undefined) update.description = description;
    if (feature_id !== undefined) update.feature_id = feature_id;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
    }

    // Get old function to compare changes
    const oldFunc = await Function.findById(functionId);

    if (!oldFunc) {
      return res.status(404).json({ message: 'Không tìm thấy function' });
    }

    const func = await Function.findByIdAndUpdate(functionId, { $set: update }, { new: true })
      .populate('feature_id', 'title project_id');

    if (!func) {
      return res.status(404).json({ message: 'Không tìm thấy function' });
    }

    // Log activity (get project_id from feature)
    try {
      if (func.feature_id) {
        // Get featureId - handle both populated (object) and non-populated (string) cases
        const featureId = typeof func.feature_id === 'object' && func.feature_id !== null
          ? (func.feature_id._id || func.feature_id)
          : func.feature_id;
        
        // Try to get project_id from populated feature first, otherwise query
        let projectId = null;
        if (typeof func.feature_id === 'object' && func.feature_id !== null && func.feature_id.project_id) {
          projectId = typeof func.feature_id.project_id === 'object' 
            ? (func.feature_id.project_id._id || func.feature_id.project_id)
            : func.feature_id.project_id;
        } else {
          // Query feature to get project_id
          const Feature = require('../models/feature');
          const feature = await Feature.findById(featureId).select('project_id');
          if (feature && feature.project_id) {
            projectId = typeof feature.project_id === 'object' 
              ? (feature.project_id._id || feature.project_id)
              : feature.project_id;
          }
        }
        
        if (projectId) {
          // Check if status changed
          const statusChanged = update.status !== undefined && String(oldFunc.status || '') !== String(func.status || '');
          
          if (statusChanged) {
            // Create specific activity log for status change
            const statusLog = await ActivityLog.create({
              project_id: projectId,
              feature_id: featureId,
              function_id: func._id,
              action: 'FUNCTION_STATUS_CHANGED',
              metadata: { 
                function_id: func._id, 
                function_title: func.title,
                feature_id: featureId,
                field: 'status',
                old_value: oldFunc.status || 'Chưa có',
                new_value: func.status || 'Chưa có'
              },
              created_by: req.user?._id,
            });
            console.log('Created FUNCTION_STATUS_CHANGED log:', statusLog.action, statusLog.metadata);
          } else if (Object.keys(update).length > 0) {
            // General update log (only if status didn't change)
            const updateLog = await ActivityLog.create({
              project_id: projectId,
              feature_id: featureId,
              function_id: func._id,
              action: 'UPDATE_FUNCTION',
              metadata: { 
                function_id: func._id, 
                function_title: func.title,
                feature_id: featureId,
                changed: Object.keys(update) 
              },
              created_by: req.user?._id,
            });
            console.log('Created UPDATE_FUNCTION log:', updateLog.action, updateLog.metadata);
          }
        } else {
          console.warn('Cannot create activity log: no project_id found for function', {
            functionId: func._id,
            featureId: featureId
          });
        }
      } else {
        console.warn('Cannot create activity log: function has no feature_id', {
          functionId: func._id
        });
      }
    } catch (logError) {
      // Don't fail the update if logging fails, but log the error
      console.error('Error creating activity log for function update:', logError);
    }

    // Auto-update feature status based on function status change (only if status was manually changed)
    if (update.status !== undefined && String(oldFunc.status || '') !== String(func.status || '')) {
      try {
        const { cascadeUpdateStatusFromFunction } = require('../utils/statusCascade');
        await cascadeUpdateStatusFromFunction(functionId, req.user?._id);
      } catch (cascadeError) {
        console.error('Error cascading feature status update:', cascadeError);
        // Don't fail the request if cascade fails
      }
    }

    return res.json({ message: 'Cập nhật function thành công', function: func });
  } catch (error) {
    console.log('Error updating function:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/functions/:functionId
async function getFunction(req, res) {
  try {
    const { functionId } = req.params;
    
    const func = await Function.findById(functionId)
      .populate('feature_id', 'title');

    if (!func) {
      return res.status(404).json({ message: 'Không tìm thấy function' });
    }

    return res.json({ message: 'Lấy function thành công', func });
  } catch (error) {
    console.log('Error getting function:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/functions/:functionId
async function deleteFunction(req, res) {
  try {
    const { functionId } = req.params;
    
    const func = await Function.findById(functionId);
    if (!func) {
      return res.status(404).json({ message: 'Không tìm thấy function' });
    }

    // Get project_id and feature_id before deleting
    const Feature = require('../models/feature');
    const feature = func.feature_id ? await Feature.findById(func.feature_id).select('project_id') : null;
    const featureId = typeof func.feature_id === 'object' ? func.feature_id?._id : func.feature_id;
    const projectId = feature?.project_id || null;

    // Delete related data - Cascade delete
    const Task = require('../models/task');
    const TaskDependency = require('../models/task_dependency');
    const Comment = require('../models/comment');
    const Attachment = require('../models/attachment');
    const ActivityLog = require('../models/activity_log');

    // Get all task IDs related to this function
    const tasks = await Task.find({ function_id: functionId }).select('_id');
    const taskIds = tasks.map(t => t._id);

    // Delete task dependencies related to these tasks
    if (taskIds.length > 0) {
      // Delete dependencies where these tasks are the dependent task (task_id)
      await TaskDependency.deleteMany({ task_id: { $in: taskIds } });
      
      // Delete dependencies where these tasks are the dependency (depends_on_task_id)
      await TaskDependency.deleteMany({ depends_on_task_id: { $in: taskIds } });
    }

    // Delete tasks related to this function
    await Task.deleteMany({ function_id: functionId });

    // Delete comments related to this function
    await Comment.deleteMany({ function_id: functionId });

    // Delete attachments related to this function (including Firebase Storage files)
    const attachments = await Attachment.find({ function_id: functionId });
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
            console.log(`[Function Delete] Đã xóa file từ Firebase Storage: ${filePath}`);
          }
        } catch (storageError) {
          console.log('Error deleting file from Firebase Storage:', storageError);
          // Continue even if file deletion fails
        }
      }
    }
    await Attachment.deleteMany({ function_id: functionId });

    // Delete activity logs related to this function
    await ActivityLog.deleteMany({ function_id: functionId });

    // Delete function
    await Function.findByIdAndDelete(functionId);

    // Log deletion (create new activity log after deleting old ones)
    if (projectId) {
      await ActivityLog.create({
        project_id: projectId,
        feature_id: featureId || null,
        action: 'DELETE_FUNCTION',
        metadata: { 
          function_id: functionId, 
          function_title: func.title, 
          feature_id: featureId 
        },
        created_by: req.user?._id,
      });
    }

    return res.json({ message: 'Xóa function thành công' });
  } catch (error) {
    console.log('Error deleting function:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/functions/stats
async function getFunctionStats(req, res) {
  try {
    const { projectId } = req.params;

    // Get all features from project, then get their functions
    const Feature = require('../models/feature');
    const features = await Feature.find({ project_id: projectId }).select('_id');
    const featureIds = features.map(f => f._id);

    // Get all functions - status is a string enum: "To Do", "Doing", "Done"
    const functions = await Function.find({ feature_id: { $in: featureIds } });

    const totalFunctions = functions.length;
    const now = new Date();
    
    // Count by status (status is a string enum, not an object)
    let completedFunctions = 0;
    let inProgressFunctions = 0;
    let pendingFunctions = 0;
    let overdueFunctions = 0;
    
    functions.forEach(func => {
      const status = func.status || 'To Do';
      
      // Map Function model enum values to stats
      if (status === 'Done') {
        completedFunctions++;
      } else if (status === 'Doing') {
        inProgressFunctions++;
      } else if (status === 'To Do') {
        pendingFunctions++;
      }
      
      // Check if function is overdue (not done and past deadline)
      if (status !== 'Done' && func.deadline && new Date(func.deadline) < now) {
        overdueFunctions++;
      }
    });

    return res.json({
      total: totalFunctions,
      completed: completedFunctions,
      in_progress: inProgressFunctions,
      pending: pendingFunctions,
      overdue: overdueFunctions,
      completion_rate: totalFunctions > 0 ? Math.round((completedFunctions / totalFunctions) * 100) : 0
    });
  } catch (error) {
    console.log('Error getting function stats:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ============== COMMENTS ==============

const Comment = require('../models/comment');

// GET /api/functions/:functionId/comments
async function getComments(req, res) {
  try {
    const { functionId } = req.params;
    
    const func = await Function.findById(functionId).select('feature_id');
    if (!func) {
      return res.status(404).json({ message: 'Không tìm thấy function' });
    }
    
    const comments = await Comment.find({ function_id: functionId })
      .populate('user_id', 'full_name email avatar')
      .sort({ createdAt: -1 });
    
    return res.json({ message: 'Lấy comment thành công', comments: comments });
  } catch (error) {
    console.log('Error getting comments:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/functions/:functionId/comments
async function addComment(req, res) {
  try {
    const { functionId } = req.params;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung comment không được rỗng' });
    }
    
    // Get function to get project_id
    const func = await Function.findById(functionId).populate('feature_id', 'project_id');
    if (!func) {
      return res.status(404).json({ message: 'Không tìm thấy function' });
    }
    
    const Feature = require('../models/feature');
    const feature = await Feature.findById(func.feature_id).select('project_id');
    
    const comment = await Comment.create({
      function_id: functionId,
      project_id: feature?.project_id,
      // Do not set feature_id here to avoid showing function comments in feature comments list
      user_id: req.user?._id,
      content: content.trim(),
    });
    
    await comment.populate('user_id', 'full_name email avatar');
    
    // Log activity
    if (feature?.project_id) {
      await ActivityLog.create({
        project_id: feature.project_id,
        feature_id: func.feature_id,
        action: 'ADD_COMMENT',
        metadata: { function_id: functionId, comment_id: comment._id },
        created_by: req.user?._id,
      });
    }
    
    return res.status(201).json({message: 'Thêm comment thành công', comment});
  } catch (error) {
    console.log('Error adding comment:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// PATCH /api/functions/:functionId/comments/:commentId
async function updateComment(req, res) {
  try {
    const { functionId, commentId } = req.params;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung comment không được rỗng' });
    }
    
    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, function_id: functionId },
      { content: content.trim() },
      { new: true }
    ).populate('user_id', 'full_name email avatar');
    
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy comment' });
    }
    
    return res.json({message: 'Chỉnh sửa comment thành công', comment: comment});
  } catch (error) {
    console.log('Error updating comment:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/functions/:functionId/comments/:commentId
async function deleteComment(req, res) {
  try {
    const { functionId, commentId } = req.params;
    
    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      function_id: functionId
    });
    
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy comment' });
    }
    
    return res.json({ message: "Xóa comment thành công" });
  } catch (error) {
    console.log('Error deleting comment:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ============== ACTIVITY LOGS ==============

// GET /api/functions/:functionId/activity-logs
async function getActivityLogs(req, res) {
  try {
    const { functionId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    const func = await Function.findById(functionId).populate('feature_id', 'project_id');
    if (!func) {
      return res.status(404).json({ message: 'Không tìm thấy function' });
    }
    
    const Feature = require('../models/feature');
    const feature = await Feature.findById(func.feature_id).select('project_id');
    
    // Get activity logs related to this function
    // Search in both function_id field and metadata.function_id
    const activityLogs = await ActivityLog.find({ 
      $or: [
        { function_id: functionId },
        { 'metadata.function_id': functionId }
      ]
    })
      .populate('created_by', 'full_name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await ActivityLog.countDocuments({ 
      $or: [
        { function_id: functionId },
        { 'metadata.function_id': functionId }
      ]
    });
    
    return res.json({
      activity_logs: activityLogs,
      total: total,
      has_more: (parseInt(skip) + activityLogs.length) < total
    });
  } catch (error) {
    console.log('Error getting activity logs:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ============== TASKS ==============

// GET /api/functions/:functionId/tasks
async function listTasks(req, res) {
  try {
    const { functionId } = req.params;
    
    const func = await Function.findById(functionId);
    if (!func) {
      return res.status(404).json({ message: 'Không tìm thấy function' });
    }
    
    const Task = require('../models/task');
    const tasks = await Task.find({ function_id: functionId })
      .populate('assignee_id', 'full_name email')
      .populate('assigner_id', 'full_name email')
      .populate('status', 'name')
      .populate('priority', 'name')
      .sort({ createdAt: -1 });
    
    return res.json(tasks);
  } catch (error) {
    console.log('Error listing tasks:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ============== ATTACHMENTS ==============

// GET /api/functions/:functionId/attachments
async function getAttachments(req, res) {
  try {
    const { functionId } = req.params;
    
    const attachments = await Attachment.find({ function_id: functionId })
      .populate('uploaded_by', 'full_name email')
      .sort({ createdAt: -1 });
    
    return res.json(attachments);
  } catch (error) {
    console.log('Error getting attachments:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/functions/:functionId/attachments
// Hỗ trợ 2 cách: upload file thực sự (multipart/form-data) hoặc link attachment (JSON)
async function addAttachment(req, res) {
  try {
    const { functionId } = req.params;
    
    // Lấy function để lấy project_id thông qua feature
    const func = await Function.findById(functionId).populate('feature_id', 'project_id title');
    if (!func) {
      return res.status(404).json({ message: 'Không tìm thấy function' });
    }
    
    const Feature = require('../models/feature');
    const feature = await Feature.findById(func.feature_id).select('project_id');
    if (!feature) {
      return res.status(404).json({ message: 'Không tìm thấy feature liên quan' });
    }
    
    const projectId = feature.project_id;
    if (!projectId) {
      return res.status(400).json({ message: 'Không thể xác định project_id từ function' });
    }
    
    let file_name, file_url, file_type, file_size, description, is_link;
    
    // Nếu có file upload (multipart/form-data)
    if (req.file && req.file.buffer) {
      // Upload file lên Firebase Storage
      const { storage, ref, uploadBytes, getDownloadURL } = require('../config/firebase');
      
      const originalName = req.file.originalname;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${originalName}`;
      const filePath = `function_attachments/${projectId}/${functionId}/${fileName}`;
      
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
      function_id: functionId,
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
        feature_id: func.feature_id?._id || func.feature_id,
        function_id: functionId,
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

// DELETE /api/functions/:functionId/attachments/:attachmentId
async function deleteAttachment(req, res) {
  try {
    const { functionId, attachmentId } = req.params;
    
    const attachment = await Attachment.findOne({
      _id: attachmentId,
      function_id: functionId,
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
          console.log(`[Function Attachment] Đã xóa file từ Firebase Storage: ${filePath}`);
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
      const func = await Function.findById(functionId).populate('feature_id', 'project_id');
      if (func && func.feature_id) {
        const Feature = require('../models/feature');
        const feature = await Feature.findById(func.feature_id).select('project_id');
        if (feature && feature.project_id) {
          await ActivityLog.create({
            project_id: feature.project_id,
            feature_id: func.feature_id?._id || func.feature_id,
            function_id: functionId,
            action: 'DELETE_ATTACHMENT',
            metadata: { 
              attachment_id: attachmentId, 
              file_name: attachment.file_name,
              is_link: attachment.is_link 
            },
            created_by: req.user?._id,
          });
        }
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
  listFunctions,
  listFunctionsByFeature,
  createFunction,
  updateFunction,
  getFunction,
  deleteFunction,
  getFunctionStats,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getActivityLogs,
  listTasks,
  getAttachments,
  addAttachment,
  deleteAttachment
};
