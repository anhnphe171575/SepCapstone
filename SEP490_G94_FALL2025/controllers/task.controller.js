const Task = require('../models/task');
const ActivityLog = require('../models/activity_log');
const Feature = require('../models/feature');
const User = require('../models/user');
const Attachment = require('../models/attachment');
const mongoose = require('mongoose');
const { getTaskProgressMetrics, calculateDailyWorkHours } = require('../utils/timeBasedProgress');
const { validateTaskDates, validateTaskUpdate } = require('../utils/taskDateValidation');
const {
  notifyTaskCreated,
  notifyTaskAssigned,
  notifyTaskStatusChanged,
  notifyTaskDeadlineChanged,
  notifyTaskComment,
  notifyTaskAttachment,
  notifyTaskPriorityChanged,
} = require('../utils/taskNotificationHelper');

// Helper: Convert priority/status/type from ObjectId to String (for migration compatibility)
const PRIORITY_MAP = {
  'Low': 'Low',
  'Medium': 'Medium', 
  'High': 'High',
  'Critical': 'Critical'
};

const STATUS_MAP = {
  'To Do': 'To Do',
  'Doing': 'Doing',
  'Done': 'Done',
  'Planning': 'To Do',
  'Planned': 'To Do',
  'Pending': 'To Do',
  'Backlog': 'To Do',
  'In Progress': 'Doing',
  'Testing': 'Doing',
  'Review': 'Doing',
  'In Review': 'Doing',
  'On Hold': 'Doing',
  'Blocked': 'Doing',
  'Completed': 'Done',
  'Resolved': 'Done',
  'Closed': 'Done',
  'Cancelled': 'Done'
};

const TYPE_MAP = {
  'Simple': 'Simple',
  'Medium': 'Medium',
  'Complex': 'Complex',
  'Very Complex': 'Very Complex'
};

function normalizePriority(priority) {
  if (!priority) return null;
  if (PRIORITY_MAP[priority]) return priority;
  if (mongoose.Types.ObjectId.isValid(priority) && String(priority).length === 24) {
    return 'Medium';
  }
  return priority;
}

function normalizeStatus(status) {
  if (!status) return null;
  if (STATUS_MAP[status]) return STATUS_MAP[status];
  if (typeof status === 'string' && STATUS_MAP[status.trim()]) {
    return STATUS_MAP[status.trim()];
  }
  if (mongoose.Types.ObjectId.isValid(status) && String(status).length === 24) {
    return 'To Do';
  }
  return status;
}


function normalizeType(type) {
  if (!type) return null;
  if (TYPE_MAP[type]) return TYPE_MAP[type];
  if (typeof type === 'string' && TYPE_MAP[type.trim()]) {
    return TYPE_MAP[type.trim()];
  }
  if (mongoose.Types.ObjectId.isValid(type) && String(type).length === 24) {
    return 'Medium';
  }
  return type;
}



function isStatusDone(status) {
  return normalizeStatus(status) === 'Done';
}

function isStatusStarted(status) {
  const normalized = normalizeStatus(status);
  return normalized === 'Doing' || normalized === 'Done';
}

function isStatusPending(status) {
  return normalizeStatus(status) === 'To Do';
}

// GET /api/projects/:projectId/tasks
async function getlistTasks(req, res) {
  try {
    const { projectId } = req.params;
    const { function_id, assignee_id, status, priority, milestone_id, q, from, to, sortBy = 'createdAt:desc', page = 1, pageSize = 100 } = req.query;
    
    let filter = {};
    
    // Nếu có projectId, lấy tasks thông qua functions -> features
    if (projectId) {
      const Feature = require('../models/feature');
      const Function = require('../models/function');
      
      const features = await Feature.find({ project_id: projectId }).select('_id');
      const featureIds = features.map(f => f._id);
      
      const functions = await Function.find({ feature_id: { $in: featureIds } }).select('_id');
      const functionIds = functions.map(f => f._id);
      
      if (functionIds.length > 0) {
        filter.function_id = { $in: functionIds };
      } else {
        // No functions found for this project
        return res.json([]);
      }
    }
    
    if (function_id) filter.function_id = function_id;
    if (assignee_id) filter.assignee_id = assignee_id;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (from || to) {
      filter.deadline = {};
      if (from) filter.deadline.$gte = new Date(from);
      if (to) filter.deadline.$lte = new Date(to);
    }
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const [sortField, sortDir] = String(sortBy).split(':');
    const sort = { [sortField]: sortDir === 'asc' ? 1 : -1 };

    const pageNum = Math.max(1, parseInt(page));
    const sizeNum = Math.max(1, Math.min(500, parseInt(pageSize)));

    const tasks = await Task.find(filter)
      .populate({
        path: 'function_id',
        select: 'title feature_id',
        populate: {
          path: 'feature_id',
          select: 'title project_id'
        }
      })
      .populate('status', 'name')
      .populate('priority', 'name')
      .populate('assigner_id', 'full_name email')
      .populate('assignee_id', 'full_name email')
      .sort(sort)
      .skip((pageNum - 1) * sizeNum)
      .limit(sizeNum);

    return res.status(200).json(tasks);   
  } catch (error) {
    console.log('Error listing tasks:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/features/:featureId/tasks
// POST /api/projects/:projectId/tasks
async function createTask(req, res) {
  try {
    const { projectId } = req.params;
    const { 
      title, 
      function_id,
      assignee, 
      assignee_id, 
      start_date,
      deadline, 
      description,
      priority,
      estimate
    } = req.body;

    const creatorId = req.user?._id || req.body.assigner_id;

    // Comprehensive validation
    const { validateTaskCreation } = require('../utils/taskValidation');
    const validation = await validateTaskCreation({
      title,
      function_id,
      assignee_id: assignee_id || assignee,
      deadline,
      start_date,
      description,
      priority,
      estimate
    });

    if (!validation.valid) {
      const errorMessage = validation.errors.length > 0 
        ? validation.errors.join('. ') 
        : 'Validation failed';
      return res.status(400).json({ 
        message: errorMessage,
        errors: validation.errors
      });
    }

    // Kiểm tra function_id là bắt buộc
    if (!function_id) {
      return res.status(400).json({ message: 'Chọn chức năng cho công việc' });
    }

    // Kiểm tra function có tồn tại và thuộc project không
    const Function = require('../models/function');
    const func = await Function.findById(function_id).populate('feature_id', 'project_id');
    if (!func) {
      return res.status(404).json({ message: 'Không tìm thấy chức năng' });
    }
    
    if (func.feature_id?.project_id?.toString() !== projectId) {
      return res.status(404).json({ message: 'Chức năng không thuộc dự án này' });
    }

    // Validate task dates against project and feature dates
    const dateValidation = await validateTaskDates({
      start_date,
      deadline,
      estimate: Number(estimate) || 0
    }, function_id);

    if (!dateValidation.valid) {
      const errorMessage = dateValidation.errors.length > 0 
        ? dateValidation.errors.join('. ') 
        : 'Date validation failed';
      
      // Include feature information in error response if available
      const featureInfo = dateValidation.projectInfo ? {
        feature_id: dateValidation.projectInfo.featureId,
        feature_title: dateValidation.projectInfo.featureTitle,
        feature_start_date: dateValidation.projectInfo.featureStartDate,
        feature_end_date: dateValidation.projectInfo.featureEndDate,
        project_start_date: dateValidation.projectInfo.projectStartDate,
        project_end_date: dateValidation.projectInfo.projectEndDate
      } : null;

      return res.status(400).json({
        message: errorMessage,
        errors: dateValidation.errors,
        type: 'date_validation',
        feature_info: featureInfo
      });
    }

    const task = await Task.create({
      title,
      function_id,
      assigner_id: creatorId,
      assignee_id: assignee_id || assignee,
      start_date: start_date ? new Date(start_date) : undefined,
      deadline: new Date(deadline),
      description,
      priority: normalizePriority(priority),
      estimate: Number(estimate) || 0,
      status: normalizeStatus('Planning')
    });

    // Log activity
    await ActivityLog.create({
      project_id: projectId,
      feature_id: func.feature_id?._id,
      function_id: function_id,
      task_id: task._id,
      action: 'CREATE_TASK',
      metadata: { task_id: task._id, title: task.title },
      created_by: creatorId,
    });

    // Send notification
    try {
      await notifyTaskCreated(task, creatorId, projectId);
    } catch (notifError) {
      console.error('Error sending task created notification:', notifError);
      // Don't fail the request if notification fails
    }

    // Auto-update function and feature status when new task is created
    try {
      const { cascadeUpdateStatusFromTask } = require('../utils/statusCascade');
      await cascadeUpdateStatusFromTask(task._id, creatorId);
    } catch (cascadeError) {
      console.error('Error cascading status update on task creation:', cascadeError);
      // Don't fail the request if cascade fails
    }

    return res.status(201).json(task);
  } catch (error) {
    console.log('Error creating task:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// Helper: Check if status change violates dependencies
async function checkDependencyViolations(taskId, currentStatus, newStatus) {
  const TaskDependency = require('../models/task_dependency');
  const { validateStatusChange, getSuggestionsForViolations } = require('../utils/statusValidation');
  
  // Get all dependencies where this task is dependent (blocked by others)
  // Status is a string enum, not a reference, so no need to populate status
  const dependencies = await TaskDependency.find({ task_id: taskId })
    .populate({
      path: 'depends_on_task_id',
      select: '_id title status', // status is string enum: "To Do", "Doing", "Done"
    });
  
  // Validate status change
  const validation = validateStatusChange(taskId, currentStatus, newStatus, dependencies);
  
  // Get suggestions if there are violations
  let suggestions = [];
  if (!validation.valid) {
    suggestions = getSuggestionsForViolations(validation.violations);
  }
  
  return {
    ...validation,
    suggestions
  };
}

// PATCH /api/tasks/:taskId
async function updateTask(req, res) {
  try {
    const { taskId } = req.params;
    const { title, status, deadline, description, assignee_id, start_date, priority, estimate, actual, function_id, force_update } = req.body;

    // Get old task to track changes
    const oldTask = await Task.findById(taskId)
      .populate({
        path: 'function_id',
        select: 'title feature_id',
        populate: {
          path: 'feature_id',
          select: 'title project_id'
        }
      })
      .populate('assignee_id', 'full_name email');
    if (!oldTask) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    // Validate update data (excluding status - status validation is done separately for dependency violations)
    const { validateTaskUpdate: validateTaskUpdateLogic } = require('../utils/taskValidation');
    const TaskDependency = require('../models/task_dependency');
    
    // Validate all fields except status (status will be validated separately for dependency violations)
    const updateDataWithoutStatus = { title, deadline, description, start_date, priority, estimate, actual };
    const validation = await validateTaskUpdateLogic(
      taskId,
      updateDataWithoutStatus,
      oldTask,
      TaskDependency
    );

    if (!validation.valid && !force_update) {
      const errorMessage = validation.errors.length > 0 
        ? validation.errors.join('. ') 
        : 'Validation failed';
      return res.status(400).json({ 
        message: errorMessage,
        errors: validation.errors,
        can_force: validation.errors.some(e => e.includes('dependency'))
      });
    }

    // Validate dates against project dates (only if dates or estimate are being updated)
    if (start_date !== undefined || deadline !== undefined || estimate !== undefined) {
      const dateValidation = await validateTaskUpdate(oldTask, {
        start_date,
        deadline,
        estimate
      });

      if (!dateValidation.valid && !force_update) {
        const errorMessage = dateValidation.errors.length > 0 
          ? dateValidation.errors.join('. ') 
          : 'Date validation failed';
        return res.status(400).json({
          message: errorMessage,
          errors: dateValidation.errors,
          can_force: true,
          type: 'date_validation'
        });
      }
    }

    const update = {};
    const changes = [];
    
    // Auto-migrate old ObjectId data to String enum
    if (mongoose.Types.ObjectId.isValid(oldTask.status) && String(oldTask.status).length === 24) {
      update.status = 'To Do'; // Default migration
    }
    if (mongoose.Types.ObjectId.isValid(oldTask.priority) && String(oldTask.priority).length === 24) {
      update.priority = 'Medium'; // Default migration
    }
    if (mongoose.Types.ObjectId.isValid(oldTask.type_id) && String(oldTask.type_id).length === 24) {
      update.type_id = 'Medium'; // Default migration
    }
    
    if (title !== undefined && title !== oldTask.title) {
      update.title = title;
      changes.push({ field: 'title', old: oldTask.title, new: title });
    }
    if (status !== undefined && status !== oldTask.status) {
      update.status = normalizeStatus(status);
      changes.push({ field: 'status', old: oldTask.status, new: status });
      
      // Auto-update actual hours based on status change
      const oldStatusNormalized = normalizeStatus(oldTask.status);
      const newStatusNormalized = normalizeStatus(status);
      const completedStatuses = ['Done'];
      
      // When task is completed, set actual hours = estimate
      if (completedStatuses.includes(newStatusNormalized) && !completedStatuses.includes(oldStatusNormalized)) {
        update.actual = oldTask.estimate || 0;
        changes.push({ 
          field: 'actual', 
          old: oldTask.actual, 
          new: oldTask.estimate || 0,
          reason: 'Auto-set actual hours to estimate on completion'
        });
      }
      
      // When task is moved from completed to another status, reset actual hours to 0
      if (!completedStatuses.includes(newStatusNormalized) && completedStatuses.includes(oldStatusNormalized)) {
        update.actual = 0;
        changes.push({ 
          field: 'actual', 
          old: oldTask.actual, 
          new: 0,
          reason: 'Reset actual hours when moving from completed status'
        });
      }
    }
    if (deadline !== undefined) {
      const newDeadline = new Date(deadline);
      if (newDeadline.getTime() !== new Date(oldTask.deadline).getTime()) {
        update.deadline = newDeadline;
        changes.push({ field: 'deadline', old: oldTask.deadline, new: deadline });
      }
    }
    if (description !== undefined && description !== oldTask.description) {
      update.description = description;
      changes.push({ field: 'description', old: oldTask.description, new: description });
    }
    if (assignee_id !== undefined && assignee_id?.toString() !== oldTask.assignee_id?._id?.toString()) {
      update.assignee_id = assignee_id;
      changes.push({ field: 'assignee_id', old: oldTask.assignee_id?._id, new: assignee_id });
    }
    if (start_date !== undefined) {
      const newStartDate = start_date ? new Date(start_date) : undefined;
      update.start_date = newStartDate;
      changes.push({ field: 'start_date', old: oldTask.start_date, new: start_date });
    }
    if (priority !== undefined && priority !== oldTask.priority) {
      update.priority = normalizePriority(priority);
      changes.push({ field: 'priority', old: oldTask.priority, new: priority });
    }
    if (estimate !== undefined && Number(estimate) !== oldTask.estimate) {
      update.estimate = Number(estimate);
      changes.push({ field: 'estimate', old: oldTask.estimate, new: estimate });
    }
    if (actual !== undefined && Number(actual) !== oldTask.actual) {
      update.actual = Number(actual);
      changes.push({ field: 'actual', old: oldTask.actual, new: actual });
    }

    if (function_id !== undefined) {
      const oldFunctionId = oldTask.function_id?._id?.toString() || oldTask.function_id?.toString();
      const newFunctionId = function_id?.toString();
      if (newFunctionId !== oldFunctionId) {
        // Validate function belongs to feature
        if (function_id) {
          const Function = require('../models/function');
         
        update.function_id = function_id || null;
        changes.push({ field: 'function_id', old: oldTask.function_id?._id, new: function_id });
      }
    }
  }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
    }


    // Check dependency violations if status is being changed
    if (status !== undefined && status !== oldTask.status && !force_update) {
      // Normalize status before checking dependencies
      const normalizedNewStatus = normalizeStatus(status);
      const normalizedOldStatus = normalizeStatus(oldTask.status);
      
      const validation = await checkDependencyViolations(taskId, normalizedOldStatus, normalizedNewStatus);
      if (!validation.valid) {
        console.log('Dependency violation detected:', validation.violations);
        return res.status(400).json({ 
          message: 'Thay đổi trạng thái vi phạm phụ thuộc',
          valid: false,
          violations: validation.violations,
          summary: validation.summary,
          suggestions: validation.suggestions,
          can_force: validation.summary.can_force_update
        });
      }
      
      // Check blocking bugs when trying to complete task
      const isCompletingTask = normalizeStatus(status) === 'Done' && normalizeStatus(oldTask.status) !== 'Done';
      
    }

    const task = await Task.findByIdAndUpdate(taskId, { $set: update }, { new: true })
      .populate({
        path: 'function_id',
        select: 'title feature_id',
        populate: {
          path: 'feature_id',
          select: 'title project_id'
        }
      })
      .populate('assigner_id', 'full_name email')
      .populate('assignee_id', 'full_name email')
      .populate('status', 'name')
      .populate('priority', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    // Log detailed activity for each change
    for (const change of changes) {
      let action = 'UPDATE_TASK';
      const metadata = { 
        task_id: task._id, 
        task_title: task.title,
        field: change.field,
        old_value: change.old,
        new_value: change.new,
        forced: !!force_update 
      };

      // Create specific action types for important changes
      if (change.field === 'status') {
        action = 'TASK_STATUS_CHANGED';
      } else if (change.field === 'assignee_id') {
        action = 'TASK_ASSIGNEE_CHANGED';
        // Populate assignee info
        if (change.new) {
          const User = require('../models/user');
          const newAssignee = await User.findById(change.new).select('full_name email');
          metadata.new_assignee = newAssignee;
        }
        if (change.old) {
          const User = require('../models/user');
          const oldAssignee = await User.findById(change.old).select('full_name email');
          metadata.old_assignee = oldAssignee;
        }
      } else if (change.field === 'priority') {
        action = 'TASK_PRIORITY_CHANGED';
      } else if (change.field === 'deadline') {
        action = 'TASK_DEADLINE_CHANGED';
      }

      await ActivityLog.create({
        project_id: task.function_id?.feature_id?.project_id,
        feature_id: task.function_id?.feature_id?._id,
        function_id: task.function_id?._id,
        task_id: task._id,
        action: action,
        metadata: metadata,
        created_by: req.user?._id,
      });
    }

    // Send notifications for important changes
    try {
      const projectId = task.function_id?.feature_id?.project_id;
      const changerId = req.user?._id;

      for (const change of changes) {
        if (change.field === 'assignee_id') {
          await notifyTaskAssigned(
            task,
            oldTask.assignee_id?._id || oldTask.assignee_id,
            task.assignee_id?._id || task.assignee_id,
            changerId,
            projectId
          );
        } else if (change.field === 'status') {
          await notifyTaskStatusChanged(
            task,
            oldTask.status,
            task.status,
            changerId,
            projectId
          );
          
          // Auto-update function and feature status based on task status change
          const { cascadeUpdateStatusFromTask } = require('../utils/statusCascade');
          await cascadeUpdateStatusFromTask(taskId, changerId);
        } else if (change.field === 'deadline') {
          await notifyTaskDeadlineChanged(
            task,
            oldTask.deadline,
            task.deadline,
            changerId,
            projectId
          );
        } else if (change.field === 'priority') {
          await notifyTaskPriorityChanged(
            task,
            oldTask.priority,
            task.priority,
            changerId,
            projectId
          );
        }
      }
    } catch (notifError) {
      console.error('Error sending task update notifications:', notifError);
      // Don't fail the request if notification fTitle cannot be empty'ails
    }

    return res.json(task);
  }
   catch (error) {
    console.log('Error updating task:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}


// GET /api/tasks/:taskId
async function getTask(req, res) {
  try {
    const { taskId } = req.params;
    
    const task = await Task.findById(taskId)
      .populate({
        path: 'function_id',
        select: 'title feature_id',
        populate: {
          path: 'feature_id',
          select: 'title project_id'
        }
      })
      .populate('status', 'name')
      .populate('priority', 'name')
      .populate('assigner_id', 'full_name email')
      .populate('assignee_id', 'full_name email');

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    return res.json(task);
  } catch (error) {
    console.log('Error getting task:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/tasks/:taskId
async function deleteTask(req, res) {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    console.log(task)

    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    // Get function_id before deleting task (for cascade status update)
    const functionId = task.function_id?.toString();

    // Delete all dependencies related to this task
    const TaskDependency = require('../models/task_dependency');
    
    // Delete dependencies where this task is the dependent task (task_id)
    await TaskDependency.deleteMany({ task_id: taskId });
    
    // Delete dependencies where this task is the dependency (depends_on_task_id)
    await TaskDependency.deleteMany({ depends_on_task_id: taskId });

    // Delete the task
    await Task.findByIdAndDelete(taskId);

    // Auto-update function and feature status after task deletion
    if (functionId) {
      try {
        const { updateFunctionStatusFromTasks, cascadeUpdateStatusFromFunction } = require('../utils/statusCascade');
        const updatedFunction = await updateFunctionStatusFromTasks(functionId, req.user?._id);
        if (updatedFunction && updatedFunction.feature_id) {
          const featureId = typeof updatedFunction.feature_id === 'object'
            ? (updatedFunction.feature_id._id || updatedFunction.feature_id)
            : updatedFunction.feature_id;
          await cascadeUpdateStatusFromFunction(functionId, req.user?._id);
        }
      } catch (cascadeError) {
        console.error('Error cascading status update on task deletion:', cascadeError);
        // Don't fail the request if cascade fails
      }
    }

    return res.json({ success: true, message: 'Task và tất cả dependencies đã được xóa' });
  } catch (error) {
    console.log('Error deleting task:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/tasks/stats
async function getTaskStats(req, res) {
  try {
    const { projectId } = req.params;
    
    const Feature = require('../models/feature');
    const features = await Feature.find({ project_id: projectId }).select('_id');
    const featureIds = features.map(f => f._id);

    // Get all tasks with populated status
    const tasks = await Task.find({ feature_id: { $in: featureIds }, is_deleted: { $ne: true } })
      .populate('status', 'name value');

    const totalTasks = tasks.length;
    const now = new Date();
    
    // Count by status name
    const statusCounts = {};
    let overdueTasks = 0;
    
    tasks.forEach(task => {
      const rawStatus = typeof task.status === 'object' ? task.status?.name : task.status;
      const normalizedStatus = normalizeStatus(rawStatus) || 'To Do';
      statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
      
      // Check if task is overdue (has deadline and deadline passed, and not completed/cancelled)
      if (task.deadline && 
          new Date(task.deadline) < now && 
          normalizedStatus !== 'Done') {
        overdueTasks++;
      }
    });

    // Map to actual status names from database
    const completedTasks = statusCounts['Done'] || 0;
    const inProgressTasks = statusCounts['Doing'] || 0;
    const pendingTasks = statusCounts['To Do'] || 0;

    return res.json({
      total: totalTasks,
      completed: completedTasks,
      in_progress: inProgressTasks,
      pending: pendingTasks,
      testing: 0,
      on_hold: 0,
      cancelled: 0,
      overdue: overdueTasks,
      completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      status_breakdown: statusCounts // Include full breakdown for debugging
    });
  } catch (error) {
    console.log('Error getting task stats:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ============== DEPENDENCIES ==============

const TaskDependency = require('../models/task_dependency');
const {
  validateTaskDates: validateTaskDatesForDependency,
  suggestAdjustedDates,
  analyzeDateChangeImpact
} = require('../utils/dependencyDateValidation');

// Helper function to check circular dependencies
async function hasCircularDependency(taskId, targetTaskId, visitedSet = new Set()) {
  if (taskId.toString() === targetTaskId.toString()) {
    return true;
  }
  
  if (visitedSet.has(targetTaskId.toString())) {
    return false;
  }
  
  visitedSet.add(targetTaskId.toString());
  
  const dependencies = await TaskDependency.find({ task_id: targetTaskId });
  
  for (const dep of dependencies) {
    if (await hasCircularDependency(taskId, dep.depends_on_task_id, visitedSet)) {
      return true;
    }
  }
  
  return false;
}

// GET /api/tasks/:taskId/dependencies
async function getDependencies(req, res) {
  try {
    const { taskId } = req.params;
    
    const [dependencies, dependents] = await Promise.all([
      TaskDependency.find({ task_id: taskId })
        .populate('depends_on_task_id', 'title status deadline start_date')
     ,
      TaskDependency.find({ depends_on_task_id: taskId })
        .populate('task_id', 'title status deadline start_date')
      ,
    ]);
    
    // Calculate summary statistics
    let blockedCount = 0;
    let blockingCount = 0;
    
    // Check how many dependencies are blocking this task
    dependencies.forEach(dep => {
      const predecessorTask = dep.depends_on_task_id;
      if (predecessorTask) {
        const isCompleted = isStatusDone(predecessorTask.status);
        const isStarted = isStatusStarted(predecessorTask.status);
        
        if (dep.dependency_type === 'FS' || dep.dependency_type === 'FF') {
          if (!isCompleted) blockedCount++;
        } else if (dep.dependency_type === 'SS' || dep.dependency_type === 'SF') {
          if (!isStarted) blockedCount++;
        }
      }
    });
    
    // Check how many dependent tasks this task is blocking
    dependents.forEach(dep => {
      const successorTask = dep.task_id;
      if (successorTask) {
        const isCompleted = isStatusDone(successorTask.status);
        const isStarted = isStatusStarted(successorTask.status);
        
        if (dep.dependency_type === 'FS' || dep.dependency_type === 'FF') {
          if (!isCompleted) blockingCount++;
        } else if (dep.dependency_type === 'SS' || dep.dependency_type === 'SF') {
          if (!isStarted) blockingCount++;
        }
      }
    });
    
    return res.status(200).json({
      dependencies,  // Tasks this task depends on (predecessors)
      dependents,    // Tasks that depend on this task (successors)
      summary: {
        total_dependencies: dependencies.length,
        total_dependents: dependents.length,
        blocked_count: blockedCount,
        blocking_count: blockingCount,
      }
    });
  } catch (error) {
    console.log('Error getting dependencies:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/tasks/:taskId/dependencies
async function addDependency(req, res) {
  try {
    const { taskId } = req.params;
    const { 
      depends_on_task_id, 
      dependency_type = 'FS', 
      lag_days = 0, 
      notes, 
      is_mandatory = true,
      strict_validation = true 
    } = req.body;
    
    if (!depends_on_task_id) {
      return res.status(400).json({ message: 'Thiếu depends_on_task_id' });
    }
    
    // Validate dependency_type
    const validTypes = ['FS', 'FF', 'SS', 'SF', 'relates_to'];
    if (!validTypes.includes(dependency_type)) {
      return res.status(400).json({ 
        message: `dependency_type phải là một trong: ${validTypes.join(', ')}` 
      });
    }
    
    // Validate lag_days
    if (isNaN(lag_days)) {
      return res.status(400).json({ message: 'lag_days phải là số' });
    }
    
    // Validate is_mandatory
    if (typeof is_mandatory !== 'boolean') {
      return res.status(400).json({ message: 'is_mandatory phải là boolean' });
    }
    
    // Check if both tasks exist
    const [task, dependsOnTask] = await Promise.all([
      Task.findById(taskId),
      Task.findById(depends_on_task_id),
    ]);
    
    if (!task || !dependsOnTask) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }
    
    // Check for circular dependency (only for FS, FF, SS, SF - not for relates_to)
    if (dependency_type !== 'relates_to') {
      const hasCircular = await hasCircularDependency(taskId, depends_on_task_id);
      if (hasCircular) {
        return res.status(400).json({ 
          message: 'Không thể tạo dependency: Phát hiện circular dependency' 
        });
      }
    }
    
    // Create dependency
    const dependencyData = {
      task_id: taskId,
      depends_on_task_id,
      dependency_type,
      lag_days: parseInt(lag_days) || 0,
      is_mandatory,
      created_by: req.user?._id,
    };
    
    if (notes) dependencyData.notes = notes;
    
    const dependency = await TaskDependency.create(dependencyData);
    
    await dependency.populate('depends_on_task_id', 'title status deadline start_date');
    
    // Check if this dependency creates violations
    // Note: task and predecessorTask already fetched above (dependsOnTask)
    const currentTask = task;
    const predecessorTask = dependsOnTask;
    
    let dateWarning = null;
    let statusWarning = null;
    
    if (currentTask && predecessorTask) {
      // Check status consistency
      const successorStatus = currentTask.status;
      const predecessorStatus = predecessorTask.status;
      
      const isSuccessorStarted = isStatusStarted(successorStatus);
      const isSuccessorCompleted = isStatusDone(successorStatus);
      const isPredecessorCompleted = isStatusDone(predecessorStatus);
      const isPredecessorStarted = isStatusStarted(predecessorStatus);
      
      // Check status violations based on dependency type
      if (dependency_type === 'FS') {
        // Finish-to-Start: Successor should not start until predecessor finishes
        if (isSuccessorStarted && !isPredecessorCompleted) {
          statusWarning = {
            type: 'status_violation',
            severity: 'warning',
            message: `⚠️ Xung đột trạng thái: Task "${currentTask.title}" đang ở "${successorStatus}" nhưng phụ thuộc vào "${predecessorTask.title}" vẫn còn "${predecessorStatus}"`,
            suggestion: `Đối với phụ thuộc FS, task trước phải được hoàn thành trước khi task sau bắt đầu. Hãy cân nhắc thay đổi trạng thái hoặc sử dụng phụ thuộc tùy chọn.`,
            current_status: successorStatus,
            predecessor_status: predecessorStatus
          };
        }
      } else if (dependency_type === 'SS') {
        // Start-to-Start: Successor should not start until predecessor starts
        if (isSuccessorStarted && !isPredecessorStarted) {
          statusWarning = {
            type: 'status_violation',
            severity: 'warning',
            message: `⚠️ Xung đột trạng thái: Task "${currentTask.title}" đang ở "${successorStatus}" nhưng phụ thuộc vào "${predecessorTask.title}" đang ở "${predecessorStatus}"`,
            suggestion: `Đối với phụ thuộc SS, task trước phải được bắt đầu trước khi task sau bắt đầu.`,
            current_status: successorStatus,
            predecessor_status: predecessorStatus
          };
        }
      } else if (dependency_type === 'FF') {
        // Finish-to-Finish: Successor should not complete until predecessor completes
        if (isSuccessorCompleted && !isPredecessorCompleted) {
          statusWarning = {
            type: 'status_violation',
            severity: 'warning',
            message: `⚠️ Xung đột trạng thái: Task "${currentTask.title}" đang ở "${successorStatus}" nhưng phụ thuộc vào "${predecessorTask.title}" đang ở "${predecessorStatus}"`,
            suggestion: `Đối với phụ thuộc FF, task trước phải được hoàn thành trước khi task sau hoàn thành.`,
            current_status: successorStatus,
            predecessor_status: predecessorStatus
          };
        }
      } else if (dependency_type === 'SF') {
        // Start-to-Finish: Successor should not complete until predecessor starts
        if (isSuccessorCompleted && !isPredecessorStarted) {
          statusWarning = {
            type: 'status_violation',
            severity: 'warning',
            message: `⚠️ Xung đột trạng thái: Task "${currentTask.title}" đang ở "${successorStatus}" nhưng phụ thuộc vào "${predecessorTask.title}" đang ở "${predecessorStatus}"`,
            suggestion: `Đối với phụ thuộc SF, task trước phải được bắt đầu trước khi task sau hoàn thành.`,
            current_status: successorStatus,
            predecessor_status: predecessorStatus
          };
        }
      }
      
      const lagDaysValue = parseInt(lag_days) || 0;
      
      // Calculate suggested dates based on dependency type
      let suggestedDates = null;
      if (dependency_type === 'FS' && predecessorTask.deadline) {
        const earliestStart = new Date(predecessorTask.deadline);
        earliestStart.setDate(earliestStart.getDate() + lagDaysValue);
        suggestedDates = { earliest_start: earliestStart };
      } else if (dependency_type === 'SS' && predecessorTask.start_date) {
        const earliestStart = new Date(predecessorTask.start_date);
        earliestStart.setDate(earliestStart.getDate() + lagDaysValue);
        suggestedDates = { earliest_start: earliestStart };
      } else if (dependency_type === 'FF' && predecessorTask.deadline) {
        const earliestEnd = new Date(predecessorTask.deadline);
        earliestEnd.setDate(earliestEnd.getDate() + lagDaysValue);
        suggestedDates = { earliest_end: earliestEnd };
      } else if (dependency_type === 'SF' && predecessorTask.start_date) {
        const earliestEnd = new Date(predecessorTask.start_date);
        earliestEnd.setDate(earliestEnd.getDate() + lagDaysValue);
        suggestedDates = { earliest_end: earliestEnd };
      }
      
      // Helper to format lag days message
      const getLagDaysMessage = (lagDays) => {
        if (lagDays === 0) return '';
        if (lagDays > 0) return ` (với ${lagDays} ngày lag/delay)`;
        return ` (với ${Math.abs(lagDays)} ngày lead/advance)`;
      };
      
      // Check for FS violation
      if (dependency_type === 'FS') {
        // Ensure both dates exist
        if (!currentTask.start_date) {
          dateWarning = {
            type: 'date_violation',
            severity: 'error',
            message: `Task "${currentTask.title}" chưa có ngày bắt đầu`,
            suggestion: 'Vui lòng set ngày bắt đầu cho task trước khi tạo dependency'
          };
        } else if (!predecessorTask.deadline) {
          dateWarning = {
            type: 'date_violation',
            severity: 'error',
            message: `Task "${predecessorTask.title}" chưa có ngày kết thúc`,
            suggestion: 'Vui lòng set ngày kết thúc cho task phụ thuộc trước khi tạo dependency'
          };
        } else if (suggestedDates && suggestedDates.earliest_start) {
          const taskStart = new Date(currentTask.start_date);
          const requiredStart = new Date(suggestedDates.earliest_start);
          
          // Normalize dates to compare only date part (ignore time)
          taskStart.setHours(0, 0, 0, 0);
          requiredStart.setHours(0, 0, 0, 0);
          
          if (taskStart < requiredStart) {
            const lagMsg = getLagDaysMessage(lagDaysValue);
            dateWarning = {
              type: 'date_violation',
              severity: 'warning',
              message: `Task "${currentTask.title}" bắt đầu ${taskStart.toLocaleDateString()} nhưng phải đợi task "${predecessorTask.title}" kết thúc ${new Date(predecessorTask.deadline).toLocaleDateString()}${lagMsg}`,
              current_start_date: currentTask.start_date,
              current_deadline: currentTask.deadline,
              required_start_date: suggestedDates.earliest_start,
              predecessor_deadline: predecessorTask.deadline,
              lag_days: lagDaysValue,
              suggestion: `Nên thay đổi ngày bắt đầu thành ${requiredStart.toLocaleDateString()} hoặc muộn hơn${lagMsg}`,
              auto_adjust_available: true
            };
          }
        }
      }
      
      // Check for SS violation
      if (dependency_type === 'SS') {
        if (!currentTask.start_date) {
          dateWarning = {
            type: 'date_violation',
            severity: 'error',
            message: `Task "${currentTask.title}" chưa có ngày bắt đầu`,
            suggestion: 'Vui lòng set ngày bắt đầu cho task trước khi tạo dependency'
          };
        } else if (!predecessorTask.start_date) {
          dateWarning = {
            type: 'date_violation',
            severity: 'error',
            message: `Task "${predecessorTask.title}" chưa có ngày bắt đầu`,
            suggestion: 'Vui lòng set ngày bắt đầu cho task phụ thuộc trước khi tạo dependency'
          };
        } else if (suggestedDates && suggestedDates.earliest_start) {
          const taskStart = new Date(currentTask.start_date);
          const requiredStart = new Date(suggestedDates.earliest_start);
          
          // Normalize dates to compare only date part (ignore time)
          taskStart.setHours(0, 0, 0, 0);
          requiredStart.setHours(0, 0, 0, 0);
          
          if (taskStart < requiredStart) {
            const lagMsg = getLagDaysMessage(lagDaysValue);
            dateWarning = {
              type: 'date_violation',
              severity: 'warning',
              message: `Task "${currentTask.title}" bắt đầu ${taskStart.toLocaleDateString()} nhưng phải đợi task "${predecessorTask.title}" bắt đầu ${new Date(predecessorTask.start_date).toLocaleDateString()}${lagMsg}`,
              current_start_date: currentTask.start_date,
              current_deadline: currentTask.deadline,
              required_start_date: suggestedDates.earliest_start,
              predecessor_start_date: predecessorTask.start_date,
              lag_days: lagDaysValue,
              suggestion: `Nên thay đổi ngày bắt đầu thành ${requiredStart.toLocaleDateString()} hoặc muộn hơn${lagMsg}`
            };
          }
        }
      }
      
      // Check for FF violation
      if (dependency_type === 'FF') {
        if (!currentTask.deadline) {
          dateWarning = {
            type: 'date_violation',
            severity: 'error',
            message: `Task "${currentTask.title}" chưa có ngày kết thúc`,
            suggestion: 'Vui lòng set ngày kết thúc cho task trước khi tạo dependency'
          };
        } else if (!predecessorTask.deadline) {
          dateWarning = {
            type: 'date_violation',
            severity: 'error',
            message: `Task "${predecessorTask.title}" chưa có ngày kết thúc`,
            suggestion: 'Vui lòng set ngày kết thúc cho task phụ thuộc trước khi tạo dependency'
          };
        } else if (suggestedDates && suggestedDates.earliest_end) {
          const taskEnd = new Date(currentTask.deadline);
          const requiredEnd = new Date(suggestedDates.earliest_end);
          
          // Normalize dates to compare only date part (ignore time)
          taskEnd.setHours(0, 0, 0, 0);
          requiredEnd.setHours(0, 0, 0, 0);
          
          if (taskEnd < requiredEnd) {
            const lagMsg = getLagDaysMessage(lagDaysValue);
            dateWarning = {
              type: 'date_violation',
              severity: 'warning',
              message: `Task "${currentTask.title}" kết thúc ${taskEnd.toLocaleDateString()} nhưng phải đợi task "${predecessorTask.title}" kết thúc ${new Date(predecessorTask.deadline).toLocaleDateString()}${lagMsg}`,
              current_start_date: currentTask.start_date,
              current_deadline: currentTask.deadline,
              required_deadline: suggestedDates.earliest_end,
              predecessor_deadline: predecessorTask.deadline,
              lag_days: lagDaysValue,
              suggestion: `Nên thay đổi ngày kết thúc thành ${requiredEnd.toLocaleDateString()} hoặc muộn hơn${lagMsg}`
            };
          }
        }
      }
      
      // Check for SF violation
      if (dependency_type === 'SF') {
        if (!currentTask.deadline) {
          dateWarning = {
            type: 'date_violation',
            severity: 'error',
            message: `Task "${currentTask.title}" chưa có ngày kết thúc`,
            suggestion: 'Vui lòng set ngày kết thúc cho task trước khi tạo dependency'
          };
        } else if (!predecessorTask.start_date) {
          dateWarning = {
            type: 'date_violation',
            severity: 'error',
            message: `Task "${predecessorTask.title}" chưa có ngày bắt đầu`,
            suggestion: 'Vui lòng set ngày bắt đầu cho task phụ thuộc trước khi tạo dependency'
          };
        } else if (suggestedDates && suggestedDates.earliest_end) {
          const taskEnd = new Date(currentTask.deadline);
          const requiredEnd = new Date(suggestedDates.earliest_end);
          
          // Normalize dates to compare only date part (ignore time)
          taskEnd.setHours(0, 0, 0, 0);
          requiredEnd.setHours(0, 0, 0, 0);
          
          if (taskEnd < requiredEnd) {
            const lagMsg = getLagDaysMessage(lagDaysValue);
            dateWarning = {
              type: 'date_violation',
              severity: 'warning',
              message: `Task "${currentTask.title}" kết thúc ${taskEnd.toLocaleDateString()} nhưng phải đợi task "${predecessorTask.title}" bắt đầu ${new Date(predecessorTask.start_date).toLocaleDateString()}${lagMsg}`,
              current_start_date: currentTask.start_date,
              current_deadline: currentTask.deadline,
              required_deadline: suggestedDates.earliest_end,
              predecessor_start_date: predecessorTask.start_date,
              lag_days: lagDaysValue,
              suggestion: `Nên thay đổi ngày kết thúc thành ${requiredEnd.toLocaleDateString()} hoặc muộn hơn${lagMsg}`
            };
          }
        }
      }
    }
    
    // If strict_validation is enabled and there's a violation, reject the dependency
    if (strict_validation && dateWarning) {
      // Delete the just-created dependency
      await TaskDependency.findByIdAndDelete(dependency._id);
      
      return res.status(400).json({
        success: false,
        error: 'Date violation detected',
        violation: dateWarning,
        message: 'Không thể tạo dependency vì vi phạm quy tắc ngày tháng. ' + dateWarning.message,
        suggestion: dateWarning.suggestion,
        can_auto_fix: dateWarning.auto_adjust_available
      });
    }
    
    // Combine warnings
    const warnings = [];
    if (statusWarning) warnings.push(statusWarning);
    if (dateWarning) warnings.push(dateWarning);
    
    return res.status(201).json({
      dependency,
      warning: dateWarning, // Keep for backward compatibility
      status_warning: statusWarning,
      warnings: warnings.length > 0 ? warnings : null,
      message: warnings.length > 0 
        ? `Dependency created with ${warnings.length} warning(s)` 
        : 'Phụ thuộc được tạo thành công'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Dependency đã tồn tại' });
    }
    console.log('Error adding dependency:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/tasks/:taskId/dependencies/validate
async function validateDependency(req, res) {
  try {
    const { taskId } = req.params;
    const { depends_on_task_id, dependency_type = 'FS' } = req.body;
    
    if (!depends_on_task_id) {
      return res.status(400).json({ message: 'Thiếu depends_on_task_id' });
    }
    
    // Check if both tasks exist
    const [task, dependsOnTask] = await Promise.all([
      Task.findById(taskId),
      Task.findById(depends_on_task_id),
    ]);
    
    if (!task || !dependsOnTask) {
      return res.status(404).json({ 
        valid: false,
        error: 'Không tìm thấy task' 
      });
    }
    
    // Check for circular dependency
    if (dependency_type !== 'relates_to') {
      const hasCircular = await hasCircularDependency(taskId, depends_on_task_id);
      if (hasCircular) {
        return res.json({ 
          valid: false,
          error: 'Circular dependency detected - This would create a dependency loop',
          circular_path: [taskId, depends_on_task_id]
        });
      }
    }
    
    // Calculate suggested dates based on dependency
    let suggestedDates = null;
    if (dependsOnTask.deadline || dependsOnTask.start_date) {
      suggestedDates = calculateSuggestedDates(task, dependsOnTask, dependency_type, 0);
    }
    
    return res.json({
      valid: true,
      suggested_dates: suggestedDates,
      predecessor: {
        title: dependsOnTask.title,
        status: dependsOnTask.status,
        start_date: dependsOnTask.start_date,
        deadline: dependsOnTask.deadline
      }
    });
  } catch (error) {
    console.log('Error validating dependency:', error);
    return res.status(500).json({ 
      valid: false,
      error: error.message 
    });
  }
}


// PATCH /api/tasks/:taskId/dependencies/:dependencyId
// DELETE /api/tasks/:taskId/dependencies/:dependencyId
async function removeDependency(req, res) {
  try {
    const { taskId, dependencyId } = req.params;
    
    // First, find the dependency to check if it exists and belongs to this task
    const dependency = await TaskDependency.findById(dependencyId);
    
    if (!dependency) {
      return res.status(404).json({ message: 'Không tìm thấy dependency' });
    }
    
    // Check if the dependency belongs to this task (either as task_id or depends_on_task_id)
    const isTaskSuccessor = dependency.task_id?.toString() === taskId;
    const isTaskPredecessor = dependency.depends_on_task_id?.toString() === taskId;
    
    if (!isTaskSuccessor && !isTaskPredecessor) {
      return res.status(403).json({ message: 'Dependency không thuộc về task này' });
    }
    
    // Delete the dependency
    await TaskDependency.findByIdAndDelete(dependencyId);
    
    return res.json({ success: true, message: 'Đã xóa phụ thuộc thành công' });
  } catch (error) {
    console.log('Error removing dependency:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/tasks/:taskId/validate-dates
// ============== COMMENTS ==============

const Comment = require('../models/comment');
const message = require('../models/message');

// GET /api/tasks/:taskId/comments
async function getComments(req, res) {
  try {
    const { taskId } = req.params;
    
    const comments = await Comment.find({ task_id: taskId })
      .populate('user_id', 'full_name email avatar')
      .sort({ createdAt: -1 });
    
    return res.json(comments);
  } catch (error) {
    console.log('Error getting comments:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/tasks/:taskId/comments
async function addComment(req, res) {
  try {
    const { taskId } = req.params;
    const { content, files } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung comment không được rỗng' });
    }
    
    // Get task to get project_id
    const task = await Task.findById(taskId).populate({
      path: 'function_id',
      select: 'feature_id',
      populate: {
        path: 'feature_id',
        select: 'project_id'
      }
    });
    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }
    

    const comment = await Comment.create({
      task_id: taskId,
      project_id: task.function_id?.feature_id?.project_id,
      user_id: req.user?._id,
      content: content.trim(),
    });
    
    await comment.populate('user_id', 'full_name email avatar');
    
    // Log activity
    await ActivityLog.create({
      project_id: task.function_id?.feature_id?.project_id,
      feature_id: task.function_id?.feature_id?._id,
      function_id: task.function_id?._id,
      task_id: taskId,
      action: 'ADD_COMMENT',
      metadata: { task_id: taskId, comment_id: comment._id },
      created_by: req.user?._id,
    });

    // Send notification
    try {
      const projectId = task.function_id?.feature_id?.project_id;
      await notifyTaskComment(task, req.user?._id, projectId, taskId);
    } catch (notifError) {
      console.error('Error sending task comment notification:', notifError);
      // Don't fail the request if notification fails
    }
    
    return res.status(201).json(comment);
  } catch (error) {
    console.log('Error adding comment:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// PATCH /api/tasks/:taskId/comments/:commentId
async function updateComment(req, res) {
  try {
    const { taskId, commentId } = req.params;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung comment không được rỗng' });
    }
    
    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, task_id: taskId, user_id: req.user?._id },
      { $set: { content: content.trim() } },
      { new: true }
    ).populate('user_id', 'full_name email avatar');
    
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy comment hoặc bạn không có quyền sửa' });
    }
    
    return res.json(comment);
  } catch (error) {
    console.log('Error updating comment:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/tasks/:taskId/comments/:commentId
async function deleteComment(req, res) {
  try {
    const { taskId, commentId } = req.params;
    
    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      task_id: taskId,
      user_id: req.user?._id,
    });
    
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy comment hoặc bạn không có quyền xóa' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.log('Error deleting comment:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// ============== ATTACHMENTS ==============


// GET /api/tasks/:taskId/attachments
async function getAttachments(req, res) {
  try {
    const { taskId } = req.params;
    
    const attachments = await Attachment.find({ task_id: taskId })
      .populate('uploaded_by', 'full_name email')
      .sort({ createdAt: -1 });
    
    return res.json(attachments);
  } catch (error) {
    console.log('Error getting attachments:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// POST /api/tasks/:taskId/attachments
// Hỗ trợ 2 cách: upload file thực sự (multipart/form-data) hoặc link attachment (JSON)
async function addAttachment(req, res) {
  try {
    const { taskId } = req.params;
    
    // Lấy task để lấy project_id thông qua function -> feature
    const task = await Task.findById(taskId)
      .populate({
        path: 'function_id',
        select: 'feature_id',
        populate: {
          path: 'feature_id',
          select: 'project_id'
        }
      });
    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }
    
    const projectId = task.function_id?.feature_id?.project_id;
    
    if (!projectId) {
      return res.status(400).json({ message: 'Không thể xác định project_id từ task' });
    }
    
    let file_name, file_url, file_type, file_size, description, is_link;
    
    // Nếu có file upload (multipart/form-data)
    if (req.file && req.file.buffer) {
      // Upload file lên Firebase Storage (giống document controller)
      const { storage, ref, uploadBytes, getDownloadURL } = require('../config/firebase');
      
      const originalName = req.file.originalname;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${originalName}`;
      const filePath = `task_attachments/${projectId}/${taskId}/${fileName}`;
      
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
      task_id: taskId,
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
        feature_id: task.function_id?.feature_id?._id,
        task_id: taskId,
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

    // Send notification
    try {
      await notifyTaskAttachment(task, req.user?._id, projectId, taskId, file_name);
    } catch (notifError) {
      console.error('Error sending task attachment notification:', notifError);
      // Don't fail the request if notification fails
    }
    
    return res.status(201).json(attachment);
  } catch (error) {
    console.log('Error adding attachment:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// DELETE /api/tasks/:taskId/attachments/:attachmentId
async function deleteAttachment(req, res) {
  try {
    const { taskId, attachmentId } = req.params;
    
    const attachment = await Attachment.findOne({
      _id: attachmentId,
      task_id: taskId,
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
          console.log(`[Task Attachment] Đã xóa file từ Firebase Storage: ${filePath}`);
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
      const task = await Task.findById(taskId)
        .populate({
          path: 'function_id',
          select: 'feature_id',
          populate: {
            path: 'feature_id',
            select: 'project_id _id'
          }
        });
      if (task && task.function_id?.feature_id?.project_id) {
        await ActivityLog.create({
          project_id: task.function_id.feature_id.project_id,
          feature_id: task.function_id.feature_id._id,
          task_id: taskId,
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

// ============== ACTIVITY LOGS ==============

// GET /api/tasks/:taskId/activity-logs
async function getActivityLogs(req, res) {
  try {
    const { taskId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    const activityLogs = await ActivityLog.find({ task_id: taskId })
      .populate('created_by', 'full_name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await ActivityLog.countDocuments({ task_id: taskId });
    
    return res.json({
      activity_logs: activityLogs,
      total: total,
      has_more: (parseInt(skip) + activityLogs.length) < total,
      message: 'Lấy log activity logs thành công'
    });
  } catch (error) {
    console.log('Error getting activity logs:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}




// GET /api/tasks/statistics
// GET /api/tasks/dashboard/contribution
async function getDashboardContribution(req, res) {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ message: 'Thiếu project_id' });
    }

    const features = await Feature.find({ project_id }).select('_id');
    const featureIds = features.map(f => f._id);

    const Function = require('../models/function');
    const functions = featureIds.length > 0
      ? await Function.find({ feature_id: { $in: featureIds } }).select('_id feature_id')
      : [];
    const functionIds = functions.map(f => f._id);

    let tasks = [];
    if (functionIds.length > 0) {
      tasks = await Task.find({
        function_id: { $in: functionIds },
        is_deleted: { $ne: true },
      })
        .populate('assignee_id', 'full_name email avatar')
        .populate('assigner_id', 'full_name email')
        .populate({
          path: 'function_id',
          select: 'title feature_id',
        });
    }

    const Team = require('../models/team');
    const team = await Team.findOne({ project_id })
      .populate('team_member.user_id', 'full_name email avatar');

    const normalizeUserId = (user) => {
      if (!user) return null;
      
      // Handle string
      if (typeof user === 'string') {
        return user.length === 24 ? user : null;
      }
      
      // Handle ObjectId instance
      if (user instanceof mongoose.Types.ObjectId) {
        return user.toString();
      }
      
      // Handle mongoose Document (populated object)
      if (user._id) {
        // _id could be ObjectId or string
        if (typeof user._id === 'string') {
          return user._id.length === 24 ? user._id : null;
        }
        if (user._id instanceof mongoose.Types.ObjectId || typeof user._id.toString === 'function') {
          return user._id.toString();
        }
      }
      
      // Handle id property (alternative to _id)
      if (user.id) {
        if (typeof user.id === 'string') {
          return user.id.length === 24 ? user.id : null;
        }
        if (typeof user.id.toString === 'function') {
          return user.id.toString();
        }
      }
      
      // Handle isValidObjectId check
      if (mongoose.isValidObjectId?.(user)) {
        return user.toString();
      }
      
      // Last resort: try toString
      if (typeof user.toString === 'function') {
        const str = user.toString();
        return str && str.length === 24 ? str : null;
      }
      
      return null;
    };

    const totals = {
      total_tasks: 0,
      completed_tasks: 0,
      in_progress_tasks: 0,
      todo_tasks: 0,
      total_estimate_hours: 0,
      total_actual_hours: 0,
      type_counts: {
        Simple: 0,
        Medium: 0,
        Complex: 0,
        'Very Complex': 0,
      },
    };

    const memberMap = new Map();

    const ensureMemberEntry = (userDoc) => {
      const userId = normalizeUserId(userDoc);
      if (!userId) return null;

      if (!memberMap.has(userId)) {
        let fullName = '';
        let email = '';
        let avatar = null;

        if (userDoc && typeof userDoc === 'object') {
          fullName = userDoc.full_name || '';
          email = userDoc.email || '';
          avatar = userDoc.avatar || null;
        }

        memberMap.set(userId, {
          member: {
            user_id: userId,
            full_name: fullName,
            email,
            avatar,
          },
          total_tasks: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
          todo_tasks: 0,
          estimate_hours: 0,
          actual_hours: 0,
          type_counts: {
            Simple: 0,
            Medium: 0,
            Complex: 0,
            'Very Complex': 0,
          },
        });
      } else if (userDoc && typeof userDoc === 'object') {
        const entry = memberMap.get(userId);
        if (entry) {
          entry.member.full_name = entry.member.full_name || userDoc.full_name || '';
          entry.member.email = entry.member.email || userDoc.email || '';
          entry.member.avatar = entry.member.avatar || userDoc.avatar || null;
          // Ensure user_id is always set (in case it was null)
          if (!entry.member.user_id || entry.member.user_id === null) {
            entry.member.user_id = userId;
          }
        }
      }

      const finalEntry = memberMap.get(userId);
      // Final check: ensure user_id is set
      if (finalEntry && (!finalEntry.member.user_id || finalEntry.member.user_id === null)) {
        finalEntry.member.user_id = userId;
      }
      return finalEntry;
    };

    const unassigned = {
      member: {
        user_id: null,
        full_name: 'Unassigned',
        email: null,
        avatar: null,
      },
      total_tasks: 0,
      completed_tasks: 0,
      in_progress_tasks: 0,
      todo_tasks: 0,
      estimate_hours: 0,
      actual_hours: 0,
      type_counts: {
        Simple: 0,
        Medium: 0,
        Complex: 0,
        'Very Complex': 0,
      },
    };

    tasks.forEach(task => {
      const normalizedStatus ='To Do';
      
      const normalizedType = 'Medium';

      totals.total_tasks += 1;

      const estimate = Number(task.estimate || 0);
      const actual = Number(task.actual || 0);

      totals.total_estimate_hours += estimate;
      totals.total_actual_hours += actual;

      // Đếm type_id trong totals
      if (totals.type_counts[normalizedType] !== undefined) {
        totals.type_counts[normalizedType] += 1;
      }

      let destination = null;
      if (task.assignee_id) {
        destination = ensureMemberEntry(task.assignee_id);
      } else {
        destination = unassigned;
      }

      if (!destination) {
        return;
      }

      destination.total_tasks += 1;
      destination.estimate_hours += estimate;
      destination.actual_hours += actual;

      // Đếm type_id cho member
      if (destination.type_counts && destination.type_counts[normalizedType] !== undefined) {
        destination.type_counts[normalizedType] += 1;
      }

      switch (normalizedStatus) {
        case 'Done':
          destination.completed_tasks += 1;
          totals.completed_tasks += 1;
          break;
        case 'Doing':
          destination.in_progress_tasks += 1;
          totals.in_progress_tasks += 1;
          break;
        default:
          destination.todo_tasks += 1;
          totals.todo_tasks += 1;
          break;
      }
    });

    if (team && Array.isArray(team.team_member)) {
      team.team_member.forEach(member => {
        const user = member.user_id;
        const entry = ensureMemberEntry(user);
        if (entry && user && typeof user === 'object') {
          entry.member.full_name = user.full_name || entry.member.full_name;
          entry.member.email = user.email || entry.member.email;
          entry.member.avatar = user.avatar || entry.member.avatar;
          // Ensure user_id is set correctly even if it was null before
          if (!entry.member.user_id || entry.member.user_id === null) {
            const userId = normalizeUserId(user);
            if (userId) {
              entry.member.user_id = userId;
            }
          }
        }
      });
    }

    // Hàm tính điểm complexity của type (cao hơn = phức tạp hơn)
    const getTypeComplexityScore = (typeCounts) => {
      const weights = {
        'Simple': 1,
        'Medium': 2,
        'Complex': 3,
        'Very Complex': 4,
      };
      let score = 0;
      Object.keys(typeCounts).forEach(type => {
        score += (typeCounts[type] || 0) * (weights[type] || 0);
      });
      return score;
    };

    const members = Array.from(memberMap.values()).map(entry => {
      const completionRate = entry.total_tasks > 0
        ? Number(((entry.completed_tasks / entry.total_tasks) * 100).toFixed(2))
        : 0;
      const workloadShare = totals.total_tasks > 0
        ? Number(((entry.total_tasks / totals.total_tasks) * 100).toFixed(2))
        : 0;

      // Ensure user_id is always a string
      let userIdString = entry.member.user_id;
      
      // If user_id is null or undefined, try to find it from team members
      if (!userIdString && team && Array.isArray(team.team_member)) {
        // Try to find matching team member by email or full_name
        const matchingMember = team.team_member.find(tm => {
          const tmUser = tm.user_id;
          if (typeof tmUser === 'object' && tmUser !== null) {
            return (tmUser.email === entry.member.email) || 
                   (tmUser.full_name === entry.member.full_name);
          }
          return false;
        });
        
        if (matchingMember && matchingMember.user_id) {
          const extractedId = normalizeUserId(matchingMember.user_id);
          if (extractedId) {
            userIdString = extractedId;
          }
        }
      }
      
      // Normalize user_id if it exists but is not a string
      if (userIdString && typeof userIdString !== 'string') {
        if (userIdString._id) {
          userIdString = userIdString._id.toString();
        } else if (userIdString.toString && typeof userIdString.toString === 'function') {
          userIdString = userIdString.toString();
        } else {
          userIdString = String(userIdString);
        }
      }
      
      // Final validation: ensure it's a valid ObjectId format string
      if (userIdString && typeof userIdString === 'string' && userIdString.length === 24 && /^[0-9a-fA-F]{24}$/.test(userIdString)) {
        // Valid ObjectId, use it
      } else if (userIdString && typeof userIdString === 'string' && userIdString.length > 0) {
        // Not a valid ObjectId but is a non-empty string, use it anyway
        console.warn('user_id is not in standard ObjectId format:', userIdString);
      } else {
        // Invalid or null, set to null
        userIdString = null;
      }

      return {
        ...entry,
        member: {
          ...entry.member,
          user_id: userIdString, // Ensure it's always a string or null
        },
        completion_rate: completionRate,
        workload_share: workloadShare,
        type_complexity_score: getTypeComplexityScore(entry.type_counts || {}),
      };
    }).sort((a, b) => {
      // Ưu tiên 1: Số lượng task hoàn thành (completed_tasks)
      if (b.completed_tasks !== a.completed_tasks) {
        return b.completed_tasks - a.completed_tasks;
      }
      // Ưu tiên 2: Tổng số task (total_tasks)
      if (b.total_tasks !== a.total_tasks) {
        return b.total_tasks - a.total_tasks;
      }
      // Ưu tiên 3: Type complexity score (phức tạp hơn = cao hơn)
      return b.type_complexity_score - a.type_complexity_score;
    });

    const unassignedOutput = unassigned.total_tasks > 0
      ? {
          ...unassigned,
          completion_rate: unassigned.total_tasks > 0
            ? Number(((unassigned.completed_tasks / unassigned.total_tasks) * 100).toFixed(2))
            : 0,
          workload_share: totals.total_tasks > 0
            ? Number(((unassigned.total_tasks / totals.total_tasks) * 100).toFixed(2))
            : 0,
          type_complexity_score: getTypeComplexityScore(unassigned.type_counts || {}),
        }
      : null;

    return res.json({
      project_id,
      totals,
      members,
      unassigned: unassignedOutput,
      metadata: {
        feature_count: featureIds.length,
        function_count: functionIds.length,
        team_members: team?.team_member?.length || 0,
      },
    });
  } catch (error) {
    console.log('Error getting dashboard contribution:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/users/:userId/tasks
async function getUserTasks(req, res) {
  try {
    const { userId, projectId } = req.params;

    // Build filter
    let filter = {
      assignee_id: userId,
      is_deleted: { $ne: true },
    };

    const tasks = await Task.find(filter)
      .populate('status', 'name')
      .populate('priority', 'name')
      .populate('assigner_id', 'full_name email')
      .populate('assignee_id', 'full_name email')
      .sort({ updateAt: -1 });

    return res.json({
      total: tasks.length,
      tasks,
    });
  } catch (error) {
    console.log('Error getting user tasks:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/tasks/dependencies/gantt
// Get all dependencies for Gantt chart (supports project_id filter)
async function getDependenciesForGantt(req, res) {
  try {
    const { project_id, task_ids } = req.query;
    const TaskDependency = require('../models/task_dependency');
    const Task = require('../models/task');

    let taskIds = [];
    
    // If task_ids is provided (comma-separated or array), use them
    if (task_ids) {
      if (Array.isArray(task_ids)) {
        taskIds = task_ids;
      } else if (typeof task_ids === 'string') {
        taskIds = task_ids.split(',').map(id => id.trim());
      }
    }
    
    // If project_id is provided, get all tasks in that project
    if (project_id && taskIds.length === 0) {
      const Feature = require('../models/feature');
      const Function = require('../models/function');
      
      const features = await Feature.find({ project_id }).select('_id');
      const featureIds = features.map(f => f._id);
      
      const functions = await Function.find({ feature_id: { $in: featureIds } }).select('_id');
      const functionIds = functions.map(f => f._id);
      
      if (functionIds.length > 0) {
        const tasks = await Task.find({ function_id: { $in: functionIds } }).select('_id');
        taskIds = tasks.map(t => t._id);
      }
    }

    // If no taskIds found, return empty dependencies
    if (taskIds.length === 0) {
      return res.json({
        dependencies: {},
        total_dependencies: 0,
        filters: { project_id, task_ids: task_ids || null }
      });
    }

    // Get all dependencies for these tasks
    const allDependencies = await TaskDependency.find({
      $or: [
        { task_id: { $in: taskIds } },
        { depends_on_task_id: { $in: taskIds } }
      ]
    })
      .populate('task_id', '_id title')
      .populate('depends_on_task_id', '_id title')
      .populate('created_by', 'full_name');

    // Build dependencies map with full dependency information
    const dependenciesMap = {};
    let totalDependencies = 0;

    allDependencies.forEach(dep => {
      const taskId = dep.task_id?._id?.toString() || dep.task_id?.toString();
      const dependsOnId = dep.depends_on_task_id?._id?.toString() || dep.depends_on_task_id?.toString();
      
      if (!taskId || !dependsOnId) return;

      // Initialize task entry if not exists
      if (!dependenciesMap[taskId]) {
        dependenciesMap[taskId] = { dependencies: [], dependents: [] };
      }
      
      // Add dependency (this task depends on dependsOnId)
      dependenciesMap[taskId].dependencies.push({
        _id: dep._id.toString(),
        task_id: taskId,
        depends_on_task_id: { 
          _id: dependsOnId,
          title: dep.depends_on_task_id?.title || ''
        },
        dependency_type: dep.dependency_type,
        lag_days: dep.lag_days || 0,
        is_mandatory: dep.is_mandatory !== undefined ? dep.is_mandatory : true,
        notes: dep.notes || '',
      });
      totalDependencies++;

      // Initialize dependsOnId entry if not exists
      if (!dependenciesMap[dependsOnId]) {
        dependenciesMap[dependsOnId] = { dependencies: [], dependents: [] };
      }
      
      // Add dependent (dependsOnId is depended on by taskId)
      dependenciesMap[dependsOnId].dependents.push({
        _id: dep._id.toString(),
        task_id: taskId,
        depends_on_task_id: { 
          _id: dependsOnId,
          title: dep.depends_on_task_id?.title || ''
        },
        dependency_type: dep.dependency_type,
        lag_days: dep.lag_days || 0,
        is_mandatory: dep.is_mandatory !== undefined ? dep.is_mandatory : true,
        notes: dep.notes || '',
      });
    });

    return res.json({
      dependencies: dependenciesMap,
      total_dependencies: totalDependencies,
      filters: { 
        project_id: project_id || null, 
        task_ids: task_ids || null,
        task_count: taskIds.length
      }
    });
  } catch (error) {
    console.log('Error getting dependencies for Gantt:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}





/**
 * Get time-based progress metrics for all tasks in a project
 * GET /api/projects/:projectId/tasks/time-based-progress
 */
async function getProjectTimeBasedProgress(req, res) {
  try {
    const { projectId } = req.params;
    
    // Get all functions for this project through features
    const Feature = require('../models/feature');
    const Function = require('../models/function');
    
    const features = await Feature.find({ project_id: projectId }).select('_id');
    const featureIds = features.map(f => f._id);
    
    const functions = await Function.find({ feature_id: { $in: featureIds } }).select('_id');
    const functionIds = functions.map(f => f._id);
    
    // Get tasks that belong to these functions
    const tasks = await Task.find({ 
      function_id: { $in: functionIds },
      parent_task_id: null // Only parent tasks
    }).select('title start_date deadline estimate actual status');
    
    console.log('\n=== TIME-BASED PROGRESS CALCULATION ===');
    console.log(`Project ID: ${projectId}`);
    console.log(`Features: ${featureIds.length}, Functions: ${functionIds.length}`);
    console.log(`Total Parent Tasks: ${tasks.length}`);
    
    const taskProgressList = tasks.map((task, index) => {
      console.log(`\n--- Task ${index + 1}: ${task.title} ---`);
      console.log('Input Data:', {
        start_date: task.start_date,
        deadline: task.deadline,
        estimate: task.estimate,
        actual: task.actual,
        status: task.status
      });
      
      const progressMetrics = getTaskProgressMetrics(task);
      const dailyWorkHours = calculateDailyWorkHours(task);
      
      console.log('Calculated Metrics:', {
        targetPercentComplete: progressMetrics.targetPercentComplete,
        actualPercentComplete: progressMetrics.actualPercentComplete,
        expectedHours: progressMetrics.expectedHours,
        plannedEffort: progressMetrics.totalPlannedEffort,
        actualHours: progressMetrics.actualHours,
        plannedEffort: progressMetrics.plannedEffort,
        plannedDuration: progressMetrics.plannedDuration,
        expectedDuration: progressMetrics.expectedDuration,
        progressStatus: progressMetrics.status,
        variance: progressMetrics.variance,
        dailyWorkHours: Math.round(dailyWorkHours * 10) / 10
      });
      
      return {
        task_id: task._id,
        task_title: task.title,
        task_status: task.status, // Original task status
        progress_status: progressMetrics.status, // Progress-based status
        targetPercentComplete: progressMetrics.targetPercentComplete,
        actualPercentComplete: progressMetrics.actualPercentComplete,
        expectedHours: progressMetrics.expectedHours,
        actualHours: progressMetrics.actualHours,
        plannedEffort: progressMetrics.plannedEffort,
        currentEffort: progressMetrics.currentEffort,
        plannedDuration: progressMetrics.plannedDuration,
        expectedDuration: progressMetrics.expectedDuration,
        isOnTrack: progressMetrics.isOnTrack,
        variance: progressMetrics.variance,
        dailyWorkHours: Math.round(dailyWorkHours * 10) / 10
      };
    });
    
    console.log('\n=== TASK PROGRESS LIST COMPLETE ===');
    
    // Calculate project-level metrics
    const tasksWithDates = taskProgressList.filter(t => t.plannedDuration > 0);
    
    let projectMetrics = {
      avgTargetPercent: 0,
      avgActualPercent: 0,
      totalExpectedHours: 0,
      totalActualHours: 0,
      totalPlannedEffort: 0,
      onTrackCount: 0,
      behindScheduleCount: 0,
      aheadScheduleCount: 0,
      notStartedCount: 0,
      completedCount: 0,
      overdueCount: 0
    };
    
    if (tasksWithDates.length > 0) {
      projectMetrics.totalExpectedHours = tasksWithDates.reduce((sum, t) => sum + t.expectedHours, 0);
      projectMetrics.totalActualHours = tasksWithDates.reduce((sum, t) => sum + t.actualHours, 0);
      projectMetrics.totalPlannedEffort = tasksWithDates.reduce((sum, t) => sum + t.plannedEffort, 0);
      
      // Calculate project-level percentages from total hours
      projectMetrics.avgTargetPercent = projectMetrics.totalPlannedEffort > 0 
        ? (projectMetrics.totalExpectedHours / projectMetrics.totalPlannedEffort) * 100 
        : 0;
      projectMetrics.avgActualPercent = projectMetrics.totalPlannedEffort > 0 
        ? (projectMetrics.totalActualHours / projectMetrics.totalPlannedEffort) * 100 
        : 0;
      
      // Count progress statuses
      taskProgressList.forEach(t => {
        if (t.progress_status === 'On Track') projectMetrics.onTrackCount++;
        else if (t.progress_status === 'Behind Schedule') projectMetrics.behindScheduleCount++;
        else if (t.progress_status === 'Ahead of Schedule') projectMetrics.aheadScheduleCount++;
        else if (t.progress_status === 'Not Started') projectMetrics.notStartedCount++;
        else if (t.progress_status === 'Completed') projectMetrics.completedCount++;
        else if (t.progress_status === 'Overdue') projectMetrics.overdueCount++;
      });
      
      // Round averages
      projectMetrics.avgTargetPercent = Math.round(projectMetrics.avgTargetPercent * 10) / 10;
      projectMetrics.avgActualPercent = Math.round(projectMetrics.avgActualPercent * 10) / 10;
      projectMetrics.totalExpectedHours = Math.round(projectMetrics.totalExpectedHours * 10) / 10;
      projectMetrics.totalActualHours = Math.round(projectMetrics.totalActualHours * 10) / 10;
    }
    
    console.log('\n=== PROJECT METRICS SUMMARY ===');
    console.log('Tasks with Dates:', tasksWithDates.length);
    console.log('Project Metrics:', projectMetrics);
    console.log('===================================\n');
    
    return res.json({
      project_id: projectId,
      total_tasks: tasks.length,
      tasks_with_dates: tasksWithDates.length,
      project_metrics: projectMetrics,
      tasks: taskProgressList
    });
  } catch (error) {
    console.error('Error calculating project time-based progress:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/tasks/expired - Get expired/overdue tasks in a project
async function getExpiredTasks(req, res) {
  try {
    const { projectId } = req.params;
    
    const Feature = require('../models/feature');
    const Function = require('../models/function');
    
    // Get all features for the project
    const features = await Feature.find({ project_id: projectId }).select('_id');
    const featureIds = features.map(f => f._id);
    
    if (featureIds.length === 0) {
      return res.json({
        project_id: projectId,
        total: 0,
        tasks: []
      });
    }
    
    // Get all functions for these features
    const functions = await Function.find({ feature_id: { $in: featureIds } }).select('_id');
    const functionIds = functions.map(f => f._id);
    
    if (functionIds.length === 0) {
      return res.json({
        project_id: projectId,
        total: 0,
        tasks: []
      });
    }
    
    // Get current date
    const now = new Date();
    
    // Find expired tasks: deadline < now and status !== 'Done'
    const expiredTasks = await Task.find({
      function_id: { $in: functionIds },
      is_deleted: { $ne: true },
      deadline: { $lt: now }
    })
      .populate({
        path: 'function_id',
        select: 'title feature_id',
        populate: {
          path: 'feature_id',
          select: 'title project_id'
        }
      })
      .populate('status', 'name')
      .populate('priority', 'name')
      .populate('assigner_id', 'full_name email')
      .populate('assignee_id', 'full_name email')
      .sort({ deadline: 1 }); // Sort by deadline (oldest first)
    
    // Filter out tasks with status 'Done' and calculate overdue days
    const filteredTasks = expiredTasks
      .filter(task => {
        const statusName = typeof task.status === 'object' ? task.status?.name : task.status;
        const normalizedStatus = normalizeStatus(statusName);
        return normalizedStatus !== 'Done';
      })
      .map(task => {
        const deadline = new Date(task.deadline);
        const overdueDays = Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...task.toObject(),
          overdueDays,
          deadline: task.deadline
        };
      })
      .sort((a, b) => b.overdueDays - a.overdueDays); // Sort by overdue days (most overdue first)
    
    return res.json({
      project_id: projectId,
      total: filteredTasks.length,
      tasks: filteredTasks
    });
  } catch (error) {
    console.log('Error getting expired tasks:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// GET /api/projects/:projectId/tasks/gantt - Get tasks with dependencies for Gantt chart
async function getGanttTasks(req, res) {
  try {
    const { projectId } = req.params;
    const { milestone_ids, feature_ids, function_ids } = req.query;
    
    const TaskDependency = require('../models/task_dependency');
    const FeaturesMilestone = require('../models/feature_milestone');
    const Function = require('../models/function');
    
    // Get all features for the project
    let featureFilter = { project_id: projectId };
    let featureIds = [];
    
    // Filter by milestone_ids if provided
    if (milestone_ids) {
      const milestoneIdArray = typeof milestone_ids === 'string' 
        ? milestone_ids.split(',').map(id => id.trim())
        : Array.isArray(milestone_ids) ? milestone_ids : [milestone_ids];
      
      // Get features linked to these milestones
      const featureLinks = await FeaturesMilestone.find({
        milestone_id: { $in: milestoneIdArray }
      }).select('feature_id');
      
      featureIds = [...new Set(featureLinks.map(link => String(link.feature_id)))];
      
      if (featureIds.length === 0) {
        return res.json({ tasks: [], dependencies: {} });
      }
      
      featureFilter._id = { $in: featureIds };
    }
    
    const features = await Feature.find(featureFilter).select('_id');
    featureIds = features.map(f => String(f._id));
    
    if (featureIds.length === 0) {
      return res.json({ tasks: [], dependencies: {} });
    }
    
    // Filter by feature_ids if provided
    if (feature_ids) {
      const featureIdArray = typeof feature_ids === 'string'
        ? feature_ids.split(',').map(id => id.trim())
        : Array.isArray(feature_ids) ? feature_ids : [feature_ids];
      
      featureIds = featureIds.filter(id => featureIdArray.includes(id));
      
      if (featureIds.length === 0) {
        return res.json({ tasks: [], dependencies: {} });
      }
    }
    
    // Get all functions for these features
    let functionFilter = { feature_id: { $in: featureIds } };
    if (function_ids) {
      const functionIdArray = typeof function_ids === 'string'
        ? function_ids.split(',').map(id => id.trim())
        : Array.isArray(function_ids) ? function_ids : [function_ids];
      functionFilter._id = { $in: functionIdArray };
    }
    
    const functions = await Function.find(functionFilter).select('_id feature_id');
    const functionIds = functions.map(f => f._id);
    
    if (functionIds.length === 0) {
      return res.json({ tasks: [], dependencies: {} });
    }
    
    // Get all tasks for these functions
    const tasks = await Task.find({ 
      function_id: { $in: functionIds },
      is_deleted: { $ne: true }
    })
      .populate('function_id', 'title feature_id')
      .populate('assignee_id', 'full_name email')
      .populate('status', 'name')
      .sort({ start_date: 1, deadline: 1 });
    
    // Get all dependencies for these tasks
    const taskIds = tasks.map(t => t._id);
    const dependencies = await TaskDependency.find({
      task_id: { $in: taskIds }
    }).populate('depends_on_task_id', '_id');
    
    // Build dependency map
    const dependencyMap = {};
    tasks.forEach(task => {
      dependencyMap[String(task._id)] = {
        dependencies: [],
        dependents: []
      };
    });
    
    dependencies.forEach(dep => {
      const taskId = String(dep.task_id);
      const dependsOnId = dep.depends_on_task_id?._id ? String(dep.depends_on_task_id._id) : null;
      
      if (dependsOnId && dependencyMap[taskId] && dependencyMap[dependsOnId]) {
        dependencyMap[taskId].dependencies.push({
          _id: String(dep._id),
          task_id: taskId,
          depends_on_task_id: { _id: dependsOnId },
          dependency_type: dep.dependency_type || 'FS'
        });
        
        dependencyMap[dependsOnId].dependents.push({
          _id: String(dep._id),
          task_id: dependsOnId,
          depends_on_task_id: { _id: taskId },
          dependency_type: dep.dependency_type || 'FS'
        });
      }
    });
    
    // Format tasks for Gantt chart
    const formattedTasks = tasks.map(task => {
      const statusName = typeof task.status === 'object' ? task.status?.name : task.status;
      const normalizedStatus = STATUS_MAP[statusName] || statusName || 'To Do';
      
      return {
        _id: String(task._id),
        title: task.title,
        start_date: task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : null,
        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : null,
        status: normalizedStatus,
        status_name: statusName || normalizedStatus,
        progress: task.progress || 0,
        assignee_id: task.assignee_id,
        feature_id: task.function_id?.feature_id || null
      };
    });
    
    return res.json({
      tasks: formattedTasks,
      dependencies: dependencyMap
    });
  } catch (error) {
    console.error('Error getting Gantt tasks:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

module.exports = {
  getlistTasks,
  createTask,
  updateTask,
  getTask,
  deleteTask,
  getTaskStats,
  getGanttTasks,
  // Dependencies
  getDependencies,
  addDependency,
  validateDependency,
  removeDependency,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getAttachments,
  addAttachment,
  deleteAttachment,
  getActivityLogs,
  getDashboardContribution,
  getUserTasks,
  getProjectTimeBasedProgress,
  getExpiredTasks,
};
