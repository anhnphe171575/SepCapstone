/**
 * Task Date Validation Utility
 * 
 * Validates task dates against project dates and ensures logical consistency
 * between start_date, deadline, and estimate.
 */

const Project = require('../models/project');
const Function = require('../models/function');
const Feature = require('../models/feature');

/**
 * Get project and feature date range for a task
 * @param {ObjectId} functionId - Function ID
 * @returns {Object} { projectStartDate, projectEndDate, projectId, featureStartDate, featureEndDate, featureId }
 */
async function getProjectDateRange(functionId) {
  try {
    // Get function to find feature
    const func = await Function.findById(functionId).populate('feature_id');
    if (!func || !func.feature_id) {
      throw new Error('Function or Feature not found');
    }

    // Get project from feature
    const feature = await Feature.findById(func.feature_id).populate('project_id');
    if (!feature || !feature.project_id) {
      throw new Error('Project not found');
    }

    const project = feature.project_id;
    
    return {
      projectId: project._id,
      projectStartDate: project.start_date,
      projectEndDate: project.end_date,
      projectCode: project.code,
      featureId: feature._id,
      featureStartDate: feature.start_date,
      featureEndDate: feature.end_date || feature.due_date,
      featureTitle: feature.title
    };
  } catch (error) {
    throw new Error(`Failed to get project date range: ${error.message}`);
  }
}

/**
 * Validate task dates against project dates
 * @param {Object} taskData - Task data with start_date, deadline, estimate
 * @param {ObjectId} functionId - Function ID to get project dates
 * @returns {Object} { valid: boolean, errors: string[] }
 */
async function validateTaskDates(taskData, functionId) {
  const errors = [];
  const { start_date, deadline, estimate } = taskData;

  // Get project date range
  let projectInfo;
  try {
    projectInfo = await getProjectDateRange(functionId);
  } catch (error) {
    errors.push(error.message);
    return { valid: false, errors };
  }

  const { projectStartDate, projectEndDate, projectCode, featureStartDate, featureEndDate, featureTitle } = projectInfo;

  // Validation 1: If task has dates but project doesn't, allow it (project dates are optional)
  // Only validate date ranges if both project and task have dates

  // Validation 2: Task start_date must be within project dates (only if project has dates)
  if (start_date && projectStartDate && projectEndDate) {
    const taskStart = new Date(start_date);
    const projStart = new Date(projectStartDate);
    const projEnd = new Date(projectEndDate);

    if (taskStart < projStart) {
      errors.push(
        `Ngày bắt đầu công việc (${taskStart.toISOString().split('T')[0]}) không được trước ngày bắt đầu dự án (${projStart.toISOString().split('T')[0]})`
      );
    }

    if (taskStart > projEnd) {
      errors.push(
        `Ngày bắt đầu công việc (${taskStart.toISOString().split('T')[0]}) không được sau ngày kết thúc dự án (${projEnd.toISOString().split('T')[0]})`
      );
    }

    // Validation 2.1: Task start_date must be within feature dates (if feature has dates)
    if (featureStartDate) {
      const featStart = new Date(featureStartDate);
      if (taskStart < featStart) {
        errors.push(
          `Ngày bắt đầu công việc (${taskStart.toISOString().split('T')[0]}) không được trước ngày bắt đầu feature "${featureTitle}" (${featStart.toISOString().split('T')[0]})`
        );
      }
    }

    if (featureEndDate) {
      const featEnd = new Date(featureEndDate);
      if (taskStart > featEnd) {
        errors.push(
          `Ngày bắt đầu công việc (${taskStart.toISOString().split('T')[0]}) không được sau ngày kết thúc feature "${featureTitle}" (${featEnd.toISOString().split('T')[0]})`
        );
      }
    }
  }

  // Validation 3: Task deadline must be within project dates (only if project has dates)
  if (deadline && projectStartDate && projectEndDate) {
    const taskDeadline = new Date(deadline);
    const projStart = new Date(projectStartDate);
    const projEnd = new Date(projectEndDate);

    if (taskDeadline < projStart) {
      errors.push(
        `Ngày kết thúc công việc (${taskDeadline.toISOString().split('T')[0]}) không được trước ngày bắt đầu dự án (${projStart.toISOString().split('T')[0]})`
      );
    }

    if (taskDeadline > projEnd) {
      errors.push(
        `Ngày kết thúc công việc (${taskDeadline.toISOString().split('T')[0]}) không được sau ngày kết thúc dự án (${projEnd.toISOString().split('T')[0]})`
      );
    }

    // Validation 3.1: Task deadline must be within feature dates (if feature has dates)
    if (featureStartDate) {
      const featStart = new Date(featureStartDate);
      if (taskDeadline < featStart) {
        errors.push(
          `Ngày kết thúc công việc (${taskDeadline.toISOString().split('T')[0]}) không được trước ngày bắt đầu feature "${featureTitle}" (${featStart.toISOString().split('T')[0]})`
        );
      }
    }

    if (featureEndDate) {
      const featEnd = new Date(featureEndDate);
      if (taskDeadline > featEnd) {
        errors.push(
          `Ngày kết thúc công việc (${taskDeadline.toISOString().split('T')[0]}) không được sau ngày kết thúc feature "${featureTitle}" (${featEnd.toISOString().split('T')[0]})`
        );
      }
    }
  }

  // Validation 4: Task start_date must be before or equal to deadline
  if (start_date && deadline) {
    const taskStart = new Date(start_date);
    const taskDeadline = new Date(deadline);

    if (taskStart > taskDeadline) {
      errors.push(
        `Ngày bắt đầu công việc (${taskStart.toISOString().split('T')[0]}) không được sau ngày kết thúc công việc (${taskDeadline.toISOString().split('T')[0]})`
      );
    }
  }

  // Validation 5: Estimate must be reasonable for the date range
  if (estimate && start_date && deadline) {
    const taskStart = new Date(start_date);
    const taskDeadline = new Date(deadline);
    
    // Calculate working days (Monday-Friday only)
    const workingDays = calculateWorkingDays(taskStart, taskDeadline);
    const maxHours = workingDays * 8; // Assuming 8 hours per working day

    if (estimate > maxHours) {
      errors.push(
        `Số giờ ước tính (${estimate}h) vượt quá số giờ làm việc (${maxHours}h) giữa ngày bắt đầu và ngày kết thúc (${workingDays} ngày làm việc)`
      );
    }

    if (estimate <= 0) {
      errors.push('Số giờ ước tính phải lớn hơn 0');
    }
  }

  // Validation 6: If only estimate is provided without dates, just check if positive
  if (estimate && estimate <= 0) {
    errors.push('Số giờ ước tính phải lớn hơn 0');
  }

  return {
    valid: errors.length === 0,
    errors,
    projectInfo
  };
}

/**
 * Calculate working days (Monday-Friday) between two dates
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {number} Number of working days
 */
function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  // Set to start of day for accurate comparison
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Validate task update with existing task data
 * @param {Object} existingTask - Existing task object
 * @param {Object} updates - Update fields
 * @returns {Object} { valid: boolean, errors: string[] }
 */
async function validateTaskUpdate(existingTask, updates) {
  // Merge existing task data with updates
  const mergedData = {
    start_date: updates.start_date !== undefined ? updates.start_date : existingTask.start_date,
    deadline: updates.deadline !== undefined ? updates.deadline : existingTask.deadline,
    estimate: updates.estimate !== undefined ? updates.estimate : existingTask.estimate,
  };

  // Use existing function_id if not being updated
  const functionId = updates.function_id || existingTask.function_id;

  return await validateTaskDates(mergedData, functionId);
}

module.exports = {
  validateTaskDates,
  validateTaskUpdate,
  getProjectDateRange,
  calculateWorkingDays
};

