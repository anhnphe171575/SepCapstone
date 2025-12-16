/**
 * Status Change Validation with Dependencies
 * Validates task status transitions based on dependencies (FS, SS, FF, SF)
 */

/**
 * Get status string from status value (can be string or object)
 * @param {string|Object} status - Status value (string or populated object)
 * @returns {string}
 */
function getStatusString(status) {
  if (!status) return '';
  
  // If it's an object (populated from Setting model)
  if (typeof status === 'object') {
    return status.name || status.value || status.toString();
  }
  
  // If it's already a string
  return String(status);
}

/**
 * Check if a status represents "started" state
 * @param {string|Object} status - Status to check
 * @returns {boolean}
 * Model enum: ["To Do", "Doing", "Done"]
 * Started = "Doing" or "Done" (not "To Do")
 */
function isStartedStatus(status) {
  const statusStr = getStatusString(status).toLowerCase();
  const startedStatuses = [
    'doing',        // Model enum value - task is in progress
    'done',         // Model enum value - task is completed (also considered started)
    'in progress',
    'testing',
    'review',
    'completed'
  ];
  return startedStatuses.includes(statusStr);
}

/**
 * Check if a status represents "completed" state
 * @param {string|Object} status - Status to check
 * @returns {boolean}
 * Model enum: ["To Do", "Doing", "Done"]
 */
function isCompletedStatus(status) {
  const statusStr = getStatusString(status).toLowerCase();
  const completedStatuses = [
    'done',         // Model enum value
    'completed'
  ];
  return completedStatuses.includes(statusStr);
}

/**
 * Check if a status represents "todo/not started" state
 * @param {string|Object} status - Status to check
 * @returns {boolean}
 * Model enum: ["To Do", "Doing", "Done"]
 */
function isTodoStatus(status) {
  const statusStr = getStatusString(status).toLowerCase();
  const todoStatuses = [
    'to do',        // Model enum value
    'todo',
    'not started'
  ];
  return todoStatuses.includes(statusStr);
}

/**
 * Determine if status change is moving forward
 * @param {string|Object} oldStatus - Current status
 * @param {string|Object} newStatus - Target status
 * @returns {boolean}
 */
function isProgressingStatus(oldStatus, newStatus) {
  const statusOrder = {
    'todo': 0,
    'to do': 0,
    'not started': 0,
    'in progress': 1,
    'testing': 2,
    'review': 3,
    'done': 4,
    'completed': 4
  };
  
  const oldStr = getStatusString(oldStatus).toLowerCase();
  const newStr = getStatusString(newStatus).toLowerCase();
  
  const oldOrder = statusOrder[oldStr] ?? 0;
  const newOrder = statusOrder[newStr] ?? 0;
  
  return newOrder > oldOrder;
}

/**
 * Check status change against single dependency
 * @param {Object} dependency - Dependency object with populated predecessor
 * @param {string} currentStatus - Current task status
 * @param {string} newStatus - Target status to change to
 * @returns {Object|null} Violation object or null if valid
 */
function checkSingleDependencyViolation(dependency, currentStatus, newStatus) {
  const predecessor = dependency.depends_on_task_id;
  if (!predecessor) return null;

  const depType = dependency.dependency_type;
  const lagDays = dependency.lag_days || 0;
  
  // Skip validation for 'relates_to' type
  if (depType === 'relates_to') return null;

  const violation = {
    dependency_id: dependency._id,
    type: depType,
    predecessor: {
      id: predecessor._id,
      title: predecessor.title,
      status: predecessor.status
    },
    lag_days: lagDays,
    is_mandatory: dependency.is_mandatory !== false
  };

  switch (depType) {
    case 'FS': // Finish-to-Start
      // Task cannot START until predecessor FINISHES
      if (isStartedStatus(newStatus) && !isStartedStatus(currentStatus)) {
        // Trying to start the task
        if (!isCompletedStatus(predecessor.status)) {
          return {
            ...violation,
            message: `Không thể bắt đầu task này. Task "${predecessor.title}" phải được hoàn thành trước.`,
            detailed_message: `Task này có phụ thuộc Finish-to-Start (FS) với "${predecessor.title}". Bạn không thể bắt đầu task này cho đến khi "${predecessor.title}" được hoàn thành.${lagDays !== 0 ? ` Ngoài ra, có ${lagDays > 0 ? lagDays + ' ngày lag (trễ)' : Math.abs(lagDays) + ' ngày lead (sớm)'}.` : ''}`,
            predecessor_current_status: predecessor.status,
            required_predecessor_status: 'Hoàn thành',
            blocking_transition: `Todo → ${newStatus}`,
            can_override: !violation.is_mandatory
          };
        }
      }
      
      // ALSO: Task cannot COMPLETE if it was started before predecessor finished
      // This catches cases where task was started (maybe by mistake) and now trying to complete
      if (isCompletedStatus(newStatus) && !isCompletedStatus(currentStatus)) {
        if (!isCompletedStatus(predecessor.status)) {
          return {
            ...violation,
            message: `Không thể hoàn thành task này. Task "${predecessor.title}" phải được hoàn thành trước.`,
            detailed_message: `Task này có phụ thuộc Finish-to-Start (FS) với "${predecessor.title}". Mặc dù task này đã được bắt đầu, bạn không thể hoàn thành nó cho đến khi "${predecessor.title}" được hoàn thành.${lagDays !== 0 ? ` Ngoài ra, có ${lagDays > 0 ? lagDays + ' ngày lag (trễ)' : Math.abs(lagDays) + ' ngày lead (sớm)'}.` : ''}`,
            predecessor_current_status: predecessor.status,
            required_predecessor_status: 'Hoàn thành',
            blocking_transition: `${currentStatus} → Done`,
            can_override: !violation.is_mandatory
          };
        }
      }
      break;

    case 'SS': // Start-to-Start
      // Task cannot START until predecessor STARTS
      if (isStartedStatus(newStatus) && !isStartedStatus(currentStatus)) {
        if (!isStartedStatus(predecessor.status)) {
          return {
            ...violation,
            message: `Không thể bắt đầu task này. Task "${predecessor.title}" phải được bắt đầu trước.`,
            detailed_message: `Task này có phụ thuộc Start-to-Start (SS) với "${predecessor.title}". Bạn không thể bắt đầu task này cho đến khi "${predecessor.title}" đã được bắt đầu (chuyển sang In Progress hoặc xa hơn).${lagDays !== 0 ? ` Ngoài ra, có ${lagDays > 0 ? lagDays + ' ngày lag' : Math.abs(lagDays) + ' ngày lead'}.` : ''}`,
            predecessor_current_status: predecessor.status,
            required_predecessor_status: 'Đang thực hiện hoặc xa hơn',
            blocking_transition: `Todo → ${newStatus}`,
            can_override: !violation.is_mandatory
          };
        }
      }
      
      // ALSO: Check when trying to complete - predecessor must at least be started
      if (isCompletedStatus(newStatus) && !isCompletedStatus(currentStatus)) {
        if (!isStartedStatus(predecessor.status)) {
          return {
            ...violation,
            message: `Không thể hoàn thành task này. Task "${predecessor.title}" phải được bắt đầu.`,
            detailed_message: `Task này có phụ thuộc Start-to-Start (SS) với "${predecessor.title}". Bạn không thể hoàn thành task này nếu "${predecessor.title}" chưa được bắt đầu.${lagDays !== 0 ? ` Ngoài ra, có ${lagDays > 0 ? lagDays + ' ngày lag' : Math.abs(lagDays) + ' ngày lead'}.` : ''}`,
            predecessor_current_status: predecessor.status,
            required_predecessor_status: 'Đang thực hiện hoặc xa hơn',
            blocking_transition: `${currentStatus} → Done`,
            can_override: !violation.is_mandatory
          };
        }
      }
      break;

    case 'FF': // Finish-to-Finish
      // Task cannot FINISH until predecessor FINISHES
      if (isCompletedStatus(newStatus) && !isCompletedStatus(currentStatus)) {
        if (!isCompletedStatus(predecessor.status)) {
          return {
            ...violation,
            message: `Không thể hoàn thành task này. Task "${predecessor.title}" phải được hoàn thành trước.`,
            detailed_message: `Task này có phụ thuộc Finish-to-Finish (FF) với "${predecessor.title}". Bạn không thể hoàn thành task này cho đến khi "${predecessor.title}" được hoàn thành.${lagDays !== 0 ? ` Ngoài ra, có ${lagDays > 0 ? lagDays + ' ngày lag' : Math.abs(lagDays) + ' ngày lead'}.` : ''}`,
            predecessor_current_status: predecessor.status,
            required_predecessor_status: 'Hoàn thành',
            blocking_transition: `${currentStatus} → Done`,
            can_override: !violation.is_mandatory
          };
        }
      }
      break;

    case 'SF': // Start-to-Finish
      // Task cannot FINISH until predecessor STARTS
      if (isCompletedStatus(newStatus) && !isCompletedStatus(currentStatus)) {
        if (!isStartedStatus(predecessor.status)) {
          return {
            ...violation,
            message: `Không thể hoàn thành task này. Task "${predecessor.title}" phải được bắt đầu trước.`,
            detailed_message: `Task này có phụ thuộc Start-to-Finish (SF) với "${predecessor.title}". Bạn không thể hoàn thành task này cho đến khi "${predecessor.title}" đã được bắt đầu.${lagDays !== 0 ? ` Ngoài ra, có ${lagDays > 0 ? lagDays + ' ngày lag' : Math.abs(lagDays) + ' ngày lead'}.` : ''}`,
            predecessor_current_status: predecessor.status,
            required_predecessor_status: 'Đang thực hiện hoặc xa hơn',
            blocking_transition: `${currentStatus} → Done`,
            can_override: !violation.is_mandatory
          };
        }
      }
      break;
  }

  return null;
}

/**
 * Validate status change against all dependencies
 * @param {string} taskId - Task ID being updated
 * @param {string} currentStatus - Current task status
 * @param {string} newStatus - Target status
 * @param {Array} dependencies - Array of dependency objects with populated predecessors
 * @returns {Object} Validation result
 */
function validateStatusChange(taskId, currentStatus, newStatus, dependencies) {
  const violations = [];

  // Check each dependency
  dependencies.forEach(dep => {
    const violation = checkSingleDependencyViolation(dep, currentStatus, newStatus);
    if (violation) {
      violations.push(violation);
    }
  });

  return {
    valid: violations.length === 0,
    violations,
    summary: {
      total_dependencies: dependencies.length,
      violations_count: violations.length,
      mandatory_violations: violations.filter(v => v.is_mandatory).length,
      can_force_update: violations.length > 0 && violations.every(v => v.can_override),
      status_transition: `${currentStatus} → ${newStatus}`,
      is_progressing: isProgressingStatus(currentStatus, newStatus)
    }
  };
}

/**
 * Check if updating this task's status will affect dependent tasks
 * @param {string} taskId - Task ID being updated
 * @param {string} oldStatus - Current status
 * @param {string} newStatus - New status
 * @param {Array} dependents - Tasks that depend on this task
 * @returns {Object} Impact analysis
 */
function analyzeStatusChangeImpact(taskId, oldStatus, newStatus, dependents) {
  const impacts = [];
  
  const wasCompleted = isCompletedStatus(oldStatus);
  const willBeCompleted = isCompletedStatus(newStatus);
  const wasStarted = isStartedStatus(oldStatus);
  const willBeStarted = isStartedStatus(newStatus);

  dependents.forEach(dep => {
    const successor = dep.task_id;
    if (!successor) return;

    const depType = dep.dependency_type;
    let impact = null;

    switch (depType) {
      case 'FS':
        // If we complete this task, successors can now start
        if (!wasCompleted && willBeCompleted) {
          impact = {
            type: 'FS',
            affected_task: successor.title,
            affected_task_id: successor._id,
            current_status: successor.status,
            change_type: 'unblock',
            message: `"${successor.title}" có thể bắt đầu bây giờ (đã bị chặn bởi phụ thuộc FS)`,
            positive: true
          };
        }
        // If we uncomplete this task, successors become blocked
        if (wasCompleted && !willBeCompleted && isStartedStatus(successor.status)) {
          impact = {
            type: 'FS',
            affected_task: successor.title,
            affected_task_id: successor._id,
            current_status: successor.status,
            change_type: 'block',
            message: `"${successor.title}" sẽ bị chặn (hiện tại ${successor.status})`,
            positive: false,
            warning: true
          };
        }
        break;

      case 'SS':
        // If we start this task, successors can now start
        if (!wasStarted && willBeStarted) {
          impact = {
            type: 'SS',
            affected_task: successor.title,
            affected_task_id: successor._id,
            current_status: successor.status,
            change_type: 'unblock',
            message: `"${successor.title}" có thể bắt đầu bây giờ (đã bị chặn bởi phụ thuộc SS)`,
            positive: true
          };
        }
        // If we move back to todo, successors become blocked
        if (wasStarted && !willBeStarted && isStartedStatus(successor.status)) {
          impact = {
            type: 'SS',
            affected_task: successor.title,
            affected_task_id: successor._id,
            current_status: successor.status,
            change_type: 'block',
            message: `"${successor.title}" sẽ bị chặn (hiện tại ${successor.status})`,
            positive: false,
            warning: true
          };
        }
        break;

      case 'FF':
        // If we complete, successors can complete
        if (!wasCompleted && willBeCompleted) {
          impact = {
            type: 'FF',
            affected_task: successor.title,
            affected_task_id: successor._id,
            current_status: successor.status,
            change_type: 'unblock',
            message: `"${successor.title}" có thể hoàn thành bây giờ (đã bị chặn bởi phụ thuộc FF)`,
            positive: true
          };
        }
        // If we uncomplete, successors cannot complete
        if (wasCompleted && !willBeCompleted && isCompletedStatus(successor.status)) {
          impact = {
            type: 'FF',
            affected_task: successor.title,
            affected_task_id: successor._id,
            current_status: successor.status,
            change_type: 'block',
            message: `"${successor.title}" đã hoàn thành nhưng sẽ vi phạm phụ thuộc FF`,
            positive: false,
            warning: true
          };
        }
        break;

      case 'SF':
        // Similar to SS but affects finish
        if (!wasStarted && willBeStarted) {
          impact = {
            type: 'SF',
            affected_task: successor.title,
            affected_task_id: successor._id,
            current_status: successor.status,
            change_type: 'unblock',
            message: `"${successor.title}" có thể hoàn thành bây giờ (đã bị chặn bởi phụ thuộc SF)`,
            positive: true
          };
        }
        if (wasStarted && !willBeStarted && isCompletedStatus(successor.status)) {
          impact = {
            type: 'SF',
            affected_task: successor.title,
            affected_task_id: successor._id,
            current_status: successor.status,
            change_type: 'block',
            message: `"${successor.title}" đã hoàn thành nhưng sẽ vi phạm phụ thuộc SF`,
            positive: false,
            warning: true
          };
        }
        break;
    }

    if (impact) {
      impacts.push(impact);
    }
  });

  const positiveImpacts = impacts.filter(i => i.positive);
  const negativeImpacts = impacts.filter(i => !i.positive);

  return {
    has_impact: impacts.length > 0,
    total_affected: impacts.length,
    impacts,
    positive_impacts: positiveImpacts,
    negative_impacts: negativeImpacts,
    summary: impacts.length > 0
      ? `${positiveImpacts.length} task(s) sẽ được mở khóa, ${negativeImpacts.length} task(s) có thể gặp vấn đề`
      : 'Không có task phụ thuộc nào bị ảnh hưởng',
    has_warnings: negativeImpacts.length > 0
  };
}

/**
 * Get actionable suggestions for resolving violations
 * @param {Array} violations - Array of violation objects
 * @returns {Array} Array of suggestions
 */
function getSuggestionsForViolations(violations) {
  const suggestions = [];

  violations.forEach(v => {
    const suggestion = {
      violation_id: v.dependency_id,
      type: v.type,
      options: []
    };

    // Option 1: Complete the predecessor
    suggestion.options.push({
      action: 'complete_predecessor',
      description: `Hoàn thành "${v.predecessor.title}" trước`,
      task_id: v.predecessor.id,
      task_title: v.predecessor.title,
      required_status: v.required_predecessor_status,
      priority: 1
    });

    // Option 2: Remove dependency (if not mandatory)
    if (v.can_override) {
      suggestion.options.push({
        action: 'remove_dependency',
        description: `Xóa phụ thuộc với "${v.predecessor.title}"`,
        dependency_id: v.dependency_id,
        warning: 'Điều này sẽ xóa ràng buộc quy trình làm việc',
        priority: 2
      });
    }

    // Option 3: Force update (if allowed)
    if (v.can_override) {
      suggestion.options.push({
        action: 'force_update',
        description: 'Bỏ qua kiểm tra phụ thuộc và cập nhật bất chấp',
        warning: 'Chỉ sử dụng nếu bạn biết bạn đang làm gì',
        priority: 3
      });
    }

    // Option 4: Change dependency type
    suggestion.options.push({
      action: 'change_dependency_type',
      description: 'Thay đổi loại phụ thuộc để ít hạn chế hơn',
      current_type: v.type,
      suggested_type: v.type === 'FS' ? 'relates_to' : 'FS',
      priority: 4
    });

    suggestions.push(suggestion);
  });

  return suggestions;
}

module.exports = {
  getStatusString,
  isStartedStatus,
  isCompletedStatus,
  isTodoStatus,
  isProgressingStatus,
  checkSingleDependencyViolation,
  validateStatusChange,
  analyzeStatusChangeImpact,
  getSuggestionsForViolations
};

