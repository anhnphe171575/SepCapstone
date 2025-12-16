/**
 * Task Validation Rules
 * Comprehensive validation for task creation and updates
 */

const {
  resolveStatusMeta,
  normalizeStatus,
  isStartedStatusCode,
  isCompletedStatusCode,
} = require('./taskStatusUtils');

/**
 * Validate task title
 */
function validateTitle(title) {
  const errors = [];
  
  if (!title || typeof title !== 'string') {
    errors.push('Tiêu đề là bắt buộc và phải là một chuỗi');  
    return { valid: false, errors };
  }
  
  const trimmed = title.trim();
  
  if (trimmed.length === 0) {
    errors.push('Tiêu đề không được để trống');
  }
  
  if (trimmed.length < 3) {
    errors.push('Tiêu đề phải có ít nhất 3 ký tự');
  }
  
  if (trimmed.length > 255) {
    errors.push('Tiêu đề không được vượt quá 255 ký tự');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    value: trimmed
  };
}

/**
 * Validate task dates
 */
function validateDates(start_date, deadline) {
  const errors = [];
  
  if (!deadline) {
    errors.push('Ngày kết thúc là bắt buộc');
    return { valid: false, errors };
  }
  
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    errors.push('Ngày kết thúc không hợp lệ');
    return { valid: false, errors };
  }
  
  if (start_date) {
    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      errors.push('Ngày bắt đầu không hợp lệ');
    } else if (startDate > deadlineDate) {
      errors.push('Ngày bắt đầu không được sau ngày kết thúc');
    }
    
    // Validate reasonable date range (not too far in past or future)
    const now = new Date();
    const maxPast = new Date();
    maxPast.setFullYear(now.getFullYear() - 2); // 2 years ago
    
    const maxFuture = new Date();
    maxFuture.setFullYear(now.getFullYear() + 5); // 5 years ahead
    
    if (startDate < maxPast) {
      errors.push('Ngày bắt đầu không được lớn hơn 2 năm trong quá khứ');
    }
    
    if (deadlineDate > maxFuture) {
      errors.push('Ngày kết thúc không được lớn hơn 5 năm trong tương lai');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate task effort estimates
 */
function validateEffort(estimate, actual) {
  const errors = [];
  
  if (estimate !== undefined && estimate !== null) {
    const estimateNum = Number(estimate);
    if (isNaN(estimateNum)) {
      errors.push('Số giờ ước tính phải là một số');
    } else if (estimateNum < 0) {
      errors.push('Số giờ ước tính không được âm');
    } else if (estimateNum > 1000) {
      errors.push('Số giờ ước tính không được vượt quá 1000 giờ');
    }
  }
  
  if (actual !== undefined && actual !== null) {
    const actualNum = Number(actual);
    if (isNaN(actualNum)) {
      errors.push('Số giờ thực tế phải là một số');
    } else if (actualNum < 0) {
      errors.push('Số giờ thực tế không được âm');
    } else if (actualNum > 1000) {
      errors.push('Số giờ thực tế không được vượt quá 1000 giờ');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate task progress
 */
function validateProgress(progress) {
  const errors = [];
  
  if (progress !== undefined && progress !== null) {
    const progressNum = Number(progress);
    if (isNaN(progressNum)) {
      errors.push('Progress must be a number');
    } else if (progressNum < 0) {
      errors.push('Progress cannot be negative');
    } else if (progressNum > 100) {
      errors.push('Progress cannot exceed 100%');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate task description
 */
function validateDescription(description) {
  const errors = [];
  
  if (description && typeof description !== 'string') {
    errors.push('Mô tả phải là một chuỗi');
  }
  
  if (description && description.length > 5000) {
    errors.push('Mô tả không được vượt quá 5000 ký tự');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate task priority
 */
function validatePriority(priority) {
  const errors = [];
  
  // Priority is now a String enum: "Low", "Medium", "High", "Critical"
  // Accept both String enum and ObjectId (for backward compatibility during migration)
  if (priority !== null && priority !== undefined && priority !== '') {
    const mongoose = require('mongoose');
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    
    // Check if it's a valid enum string OR a valid ObjectId (old data)
    const isValidEnum = validPriorities.includes(priority);
    const isValidObjectId = mongoose.Types.ObjectId.isValid(priority) && String(priority).length === 24;
    
    if (!isValidEnum && !isValidObjectId) {
      errors.push('Độ ưu tiên phải là một trong các giá trị: Low, Medium, High, Critical');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate task status with dependencies
 * Status is a string enum: "To Do", "Doing", "Done"
 */
async function validateStatusChange(taskId, newStatus, currentStatus, TaskDependency, statusCache = new Map()) {
  const errors = [];

  // Status is a string enum, not a reference
  // Model: enum: ["To Do", "Doing", "Done"]
  const newStatusStr = typeof newStatus === 'string' ? newStatus : (newStatus?.name || newStatus?.value || '');
  const currentStatusStr = typeof currentStatus === 'string' ? currentStatus : (currentStatus?.name || currentStatus?.value || '');

  if (!newStatusStr) {
    return { valid: true, errors: [] };
  }

  // Normalize status strings to codes
  const newStatusCode = normalizeStatus(newStatusStr);
  const currentStatusCode = normalizeStatus(currentStatusStr);

  if (!newStatusCode) {
    return { valid: true, errors: [] };
  }

  // Valid status transitions based on model enum: ["To Do", "Doing", "Done"]
  const validTransitions = {
    'to do': ['to do', 'doing', 'done'],
    'todo': ['todo', 'doing', 'done'],
    'doing': ['to do', 'doing', 'done'],
    'done': ['to do', 'doing'],
  };

  if (currentStatusCode && validTransitions[currentStatusCode]) {
    const allowedTargets = validTransitions[currentStatusCode];
    if (!allowedTargets.includes(newStatusCode)) {
      errors.push(
        `Chuyển trạng thái không hợp lệ từ "${currentStatusStr}" sang "${newStatusStr}"`
      );
    }
  }

  // Check dependencies when moving to started or completed state
  if (TaskDependency && (isStartedStatusCode(newStatusCode) || isCompletedStatusCode(newStatusCode))) {
    const dependencies = await TaskDependency.find({ task_id: taskId })
      .populate({
        path: 'depends_on_task_id',
        select: 'status title',
      });

    for (const dep of dependencies) {
      const predecessor = dep.depends_on_task_id;
      if (!predecessor) continue;

      // Status is a string enum, not a reference
      const predecessorStatusStr = typeof predecessor.status === 'string' 
        ? predecessor.status 
        : (predecessor.status?.name || predecessor.status?.value || '');
      const predecessorStatusCode = normalizeStatus(predecessorStatusStr);

      switch (dep.dependency_type) {
        case 'FS':
          // Finish-to-Start: Cannot start this task until predecessor is done
          if (isStartedStatusCode(newStatusCode) && !isCompletedStatusCode(predecessorStatusCode)) {
            errors.push(
              `Không thể bắt đầu task: dependency "${predecessor.title}" phải được hoàn thành trước (Finish-to-Start)`
            );
          }
          // Also check when completing
          if (isCompletedStatusCode(newStatusCode) && !isCompletedStatusCode(predecessorStatusCode)) {
            errors.push(
              `Không thể hoàn thành task: dependency "${predecessor.title}" phải được hoàn thành trước (Finish-to-Start)`
            );
          }
          break;
        case 'FF':
          // Finish-to-Finish: Cannot finish this task until predecessor is done
          if (isCompletedStatusCode(newStatusCode) && !isCompletedStatusCode(predecessorStatusCode)) {
            errors.push(
              `Không thể hoàn thành task: dependency "${predecessor.title}" phải được hoàn thành trước (Finish-to-Finish)`
            );
          }
          break;
        case 'SS':
          // Start-to-Start: Cannot start this task until predecessor is started
          if (isStartedStatusCode(newStatusCode) && !isStartedStatusCode(predecessorStatusCode)) {
            errors.push(
              `Không thể bắt đầu task: dependency "${predecessor.title}" phải được bắt đầu trước (Start-to-Start)`
            );
          }
          break;
        case 'SF':
          // Start-to-Finish: Cannot finish this task until predecessor is started
          if (isCompletedStatusCode(newStatusCode) && !isStartedStatusCode(predecessorStatusCode)) {
            errors.push(
              `Không thể hoàn thành task: dependency "${predecessor.title}" phải được bắt đầu trước (Start-to-Finish)`
            );
          }
          break;
        default:
          break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all task fields for creation
 */
async function validateTaskCreation(taskData, TaskDependency = null) {
  const allErrors = [];
  
  // Required fields
  if (!taskData.title) {
    allErrors.push('Tiêu đề là bắt buộc');
  }

  if (!taskData.assignee_id) {
    allErrors.push('Người được giao là bắt buộc');
  }
  if (!taskData.deadline) {
    allErrors.push('Ngày kết thúc công việc là bắt buộc');
  }
  if (taskData.estimate === undefined || taskData.estimate === null || taskData.estimate === '') {
    allErrors.push('Số giờ ước tính là bắt buộc');
  }
  
  // Validate each field
  const titleValidation = validateTitle(taskData.title);
  if (!titleValidation.valid) {
    allErrors.push(...titleValidation.errors);
  }
  
  const datesValidation = validateDates(taskData.start_date, taskData.deadline);
  if (!datesValidation.valid) {
    allErrors.push(...datesValidation.errors);
  }
  
  const effortValidation = validateEffort(taskData.estimate, taskData.actual);
  if (!effortValidation.valid) {
    allErrors.push(...effortValidation.errors);
  }
  
  const progressValidation = validateProgress(taskData.progress);
  if (!progressValidation.valid) {
    allErrors.push(...progressValidation.errors);
  }
  
  const descValidation = validateDescription(taskData.description);
  if (!descValidation.valid) {
    allErrors.push(...descValidation.errors);
  }
  
  const priorityValidation = validatePriority(taskData.priority);
  if (!priorityValidation.valid) {
    allErrors.push(...priorityValidation.errors);
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validate task update
 */
async function validateTaskUpdate(taskId, updateData, currentTask, TaskDependency = null, statusCache = new Map()) {
  const allErrors = [];
  
  // Validate only fields that are being updated
  if (updateData.title !== undefined) {
    const titleValidation = validateTitle(updateData.title);
    if (!titleValidation.valid) {
      allErrors.push(...titleValidation.errors);
    }
  }
  
  if (updateData.deadline !== undefined || updateData.start_date !== undefined) {
    const datesValidation = validateDates(
      updateData.start_date !== undefined ? updateData.start_date : currentTask.start_date,
      updateData.deadline !== undefined ? updateData.deadline : currentTask.deadline
    );
    if (!datesValidation.valid) {
      allErrors.push(...datesValidation.errors);
    }
  }
  
  if (updateData.estimate !== undefined || updateData.actual !== undefined) {
    const effortValidation = validateEffort(updateData.estimate, updateData.actual);
    if (!effortValidation.valid) {
      allErrors.push(...effortValidation.errors);
    }
  }
  
  if (updateData.progress !== undefined) {
    const progressValidation = validateProgress(updateData.progress);
    if (!progressValidation.valid) {
      allErrors.push(...progressValidation.errors);
    }
  }
  
  if (updateData.description !== undefined) {
    const descValidation = validateDescription(updateData.description);
    if (!descValidation.valid) {
      allErrors.push(...descValidation.errors);
    }
  }
  
  if (updateData.priority !== undefined) {
    const priorityValidation = validatePriority(updateData.priority);
    if (!priorityValidation.valid) {
      allErrors.push(...priorityValidation.errors);
    }
  }
  
  if (updateData.status !== undefined) {
    const statusValidation = await validateStatusChange(
      taskId,
      updateData.status,
      currentTask.status,
      TaskDependency,
      statusCache
    );
    if (!statusValidation.valid) {
      allErrors.push(...statusValidation.errors);
    }
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

module.exports = {
  validateDates,
  validateStatusChange,
  validateTaskCreation,
  validateTaskUpdate
};
