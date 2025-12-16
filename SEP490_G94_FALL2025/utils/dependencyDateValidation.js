/**
 * Dependency Date Validation Utilities
 * Validates task dates based on dependencies (FS, SS, FF, SF) and lag/lead time
 */

/**
 * Add days to a date
 * @param {Date|string} date - The base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date|null}
 */
function addDays(date, days) {
  if (!date) return null;
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Compare two dates (ignoring time)
 * @param {Date|string} date1 
 * @param {Date|string} date2 
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
function compareDates(date1, date2) {
  if (!date1 || !date2) return 0;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * Calculate earliest possible dates for a task based on its dependencies
 * @param {Object} task - The task to calculate for
 * @param {Array} dependencies - Array of dependency objects with populated predecessor tasks
 * @returns {Object} { earliestStart, earliestEnd, violations }
 */
function calculateEarliestDates(task, dependencies) {
  let earliestStart = null;
  let earliestEnd = null;
  const violations = [];

  dependencies.forEach(dep => {
    const predecessor = dep.depends_on_task_id;
    if (!predecessor) return;

    const lagDays = dep.lag_days || 0;
    const type = dep.dependency_type;

    let calculatedDate = null;
    let violationType = null;

    switch (type) {
      case 'FS': // Finish-to-Start
        // Task can start after predecessor finishes + lag
        calculatedDate = addDays(predecessor.deadline, lagDays);
        if (calculatedDate && (!earliestStart || calculatedDate > earliestStart)) {
          earliestStart = calculatedDate;
        }
        
        // Check if current start_date violates this
        if (task.start_date && calculatedDate && compareDates(task.start_date, calculatedDate) < 0) {
          violations.push({
            type: 'FS',
            dependency_id: dep._id,
            predecessor: predecessor.title,
            predecessor_deadline: predecessor.deadline,
            current_start_date: task.start_date,
            required_start_date: calculatedDate,
            lag_days: lagDays,
            message: `Task cannot start before ${calculatedDate.toLocaleDateString()}. Predecessor "${predecessor.title}" finishes on ${new Date(predecessor.deadline).toLocaleDateString()}${lagDays !== 0 ? ` with ${lagDays > 0 ? '+' : ''}${lagDays} days lag` : ''}.`
          });
        }
        break;

      case 'SS': // Start-to-Start
        // Task can start after predecessor starts + lag
        calculatedDate = addDays(predecessor.start_date, lagDays);
        if (calculatedDate && (!earliestStart || calculatedDate > earliestStart)) {
          earliestStart = calculatedDate;
        }
        
        if (task.start_date && calculatedDate && compareDates(task.start_date, calculatedDate) < 0) {
          violations.push({
            type: 'SS',
            dependency_id: dep._id,
            predecessor: predecessor.title,
            predecessor_start_date: predecessor.start_date,
            current_start_date: task.start_date,
            required_start_date: calculatedDate,
            lag_days: lagDays,
            message: `Task cannot start before ${calculatedDate.toLocaleDateString()}. Predecessor "${predecessor.title}" starts on ${new Date(predecessor.start_date).toLocaleDateString()}${lagDays !== 0 ? ` with ${lagDays > 0 ? '+' : ''}${lagDays} days lag` : ''}.`
          });
        }
        break;

      case 'FF': // Finish-to-Finish
        // Task can finish after predecessor finishes + lag
        calculatedDate = addDays(predecessor.deadline, lagDays);
        if (calculatedDate && (!earliestEnd || calculatedDate > earliestEnd)) {
          earliestEnd = calculatedDate;
        }
        
        if (task.deadline && calculatedDate && compareDates(task.deadline, calculatedDate) < 0) {
          violations.push({
            type: 'FF',
            dependency_id: dep._id,
            predecessor: predecessor.title,
            predecessor_deadline: predecessor.deadline,
            current_deadline: task.deadline,
            required_deadline: calculatedDate,
            lag_days: lagDays,
            message: `Task cannot finish before ${calculatedDate.toLocaleDateString()}. Predecessor "${predecessor.title}" finishes on ${new Date(predecessor.deadline).toLocaleDateString()}${lagDays !== 0 ? ` with ${lagDays > 0 ? '+' : ''}${lagDays} days lag` : ''}.`
          });
        }
        break;

      case 'SF': // Start-to-Finish
        // Task can finish after predecessor starts + lag
        calculatedDate = addDays(predecessor.start_date, lagDays);
        if (calculatedDate && (!earliestEnd || calculatedDate > earliestEnd)) {
          earliestEnd = calculatedDate;
        }
        
        if (task.deadline && calculatedDate && compareDates(task.deadline, calculatedDate) < 0) {
          violations.push({
            type: 'SF',
            dependency_id: dep._id,
            predecessor: predecessor.title,
            predecessor_start_date: predecessor.start_date,
            current_deadline: task.deadline,
            required_deadline: calculatedDate,
            lag_days: lagDays,
            message: `Task cannot finish before ${calculatedDate.toLocaleDateString()}. Predecessor "${predecessor.title}" starts on ${new Date(predecessor.start_date).toLocaleDateString()}${lagDays !== 0 ? ` with ${lagDays > 0 ? '+' : ''}${lagDays} days lag` : ''}.`
          });
        }
        break;
    }
  });

  return {
    earliestStart,
    earliestEnd,
    violations,
    isValid: violations.length === 0
  };
}

/**
 * Validate task dates against dependencies
 * @param {Object} task - Task with start_date and deadline
 * @param {Array} dependencies - Dependencies with populated predecessor tasks
 * @returns {Object} Validation result
 */
function validateTaskDates(task, dependencies) {
  const result = calculateEarliestDates(task, dependencies);

  return {
    valid: result.isValid,
    earliest_start: result.earliestStart,
    earliest_end: result.earliestEnd,
    violations: result.violations,
    current_dates: {
      start_date: task.start_date,
      deadline: task.deadline
    },
    summary: {
      total_dependencies: dependencies.length,
      violations_count: result.violations.length,
      can_start: !result.earliestStart || !task.start_date || compareDates(task.start_date, result.earliestStart) >= 0,
      can_finish: !result.earliestEnd || !task.deadline || compareDates(task.deadline, result.earliestEnd) >= 0
    }
  };
}

/**
 * Auto-adjust task dates to satisfy dependencies
 * @param {Object} task - Task to adjust
 * @param {Array} dependencies - Dependencies
 * @param {Object} options - { adjustStart, adjustEnd, preserveDuration }
 * @returns {Object} Suggested dates
 */
function suggestAdjustedDates(task, dependencies, options = {}) {
  const {
    adjustStart = true,
    adjustEnd = true,
    preserveDuration = true
  } = options;

  const calculation = calculateEarliestDates(task, dependencies);
  const suggestions = {};

  // Calculate current task duration
  let durationDays = 0;
  if (task.start_date && task.deadline) {
    const start = new Date(task.start_date);
    const end = new Date(task.deadline);
    durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }

  // Suggest start date
  if (adjustStart && calculation.earliestStart) {
    if (!task.start_date || compareDates(task.start_date, calculation.earliestStart) < 0) {
      suggestions.start_date = calculation.earliestStart;
      
      // If preserving duration, adjust deadline too
      if (preserveDuration && durationDays > 0) {
        suggestions.deadline = addDays(calculation.earliestStart, durationDays);
      }
    }
  }

  // Suggest deadline
  if (adjustEnd && calculation.earliestEnd) {
    if (!task.deadline || compareDates(task.deadline, calculation.earliestEnd) < 0) {
      suggestions.deadline = calculation.earliestEnd;
      
      // If preserving duration and we haven't adjusted start yet, adjust it
      if (preserveDuration && durationDays > 0 && !suggestions.start_date) {
        suggestions.start_date = addDays(calculation.earliestEnd, -durationDays);
      }
    }
  }

  return {
    current: {
      start_date: task.start_date,
      deadline: task.deadline
    },
    suggested: suggestions,
    has_suggestions: Object.keys(suggestions).length > 0,
    duration_days: durationDays,
    reasons: calculation.violations.map(v => v.message)
  };
}

/**
 * Check if changing task dates would affect dependent tasks
 * @param {Object} task - Task being changed
 * @param {Object} newDates - { start_date, deadline }
 * @param {Array} dependents - Tasks that depend on this task
 * @returns {Object} Impact analysis
 */
function analyzeDateChangeImpact(task, newDates, dependents) {
  const impacts = [];
  
  dependents.forEach(dep => {
    const successorTask = dep.task_id;
    if (!successorTask) return;

    const type = dep.dependency_type;
    const lagDays = dep.lag_days || 0;
    
    let affectedDate = null;
    let newRequiredDate = null;
    let impact = null;

    switch (type) {
      case 'FS':
        // If we change our deadline, it affects successor's start
        if (newDates.deadline) {
          newRequiredDate = addDays(newDates.deadline, lagDays);
          if (successorTask.start_date && compareDates(successorTask.start_date, newRequiredDate) < 0) {
            impact = {
              type: 'FS',
              affected_task: successorTask.title,
              affected_task_id: successorTask._id,
              affected_date_type: 'start_date',
              current_date: successorTask.start_date,
              new_required_date: newRequiredDate,
              will_violate: true,
              message: `"${successorTask.title}" may need to start on ${newRequiredDate.toLocaleDateString()} or later (currently ${new Date(successorTask.start_date).toLocaleDateString()})`
            };
          }
        }
        break;

      case 'SS':
        // If we change our start, it affects successor's start
        if (newDates.start_date) {
          newRequiredDate = addDays(newDates.start_date, lagDays);
          if (successorTask.start_date && compareDates(successorTask.start_date, newRequiredDate) < 0) {
            impact = {
              type: 'SS',
              affected_task: successorTask.title,
              affected_task_id: successorTask._id,
              affected_date_type: 'start_date',
              current_date: successorTask.start_date,
              new_required_date: newRequiredDate,
              will_violate: true,
              message: `"${successorTask.title}" may need to start on ${newRequiredDate.toLocaleDateString()} or later`
            };
          }
        }
        break;

      case 'FF':
        // If we change our deadline, it affects successor's deadline
        if (newDates.deadline) {
          newRequiredDate = addDays(newDates.deadline, lagDays);
          if (successorTask.deadline && compareDates(successorTask.deadline, newRequiredDate) < 0) {
            impact = {
              type: 'FF',
              affected_task: successorTask.title,
              affected_task_id: successorTask._id,
              affected_date_type: 'deadline',
              current_date: successorTask.deadline,
              new_required_date: newRequiredDate,
              will_violate: true,
              message: `"${successorTask.title}" may need to finish on ${newRequiredDate.toLocaleDateString()} or later`
            };
          }
        }
        break;

      case 'SF':
        // If we change our start, it affects successor's deadline
        if (newDates.start_date) {
          newRequiredDate = addDays(newDates.start_date, lagDays);
          if (successorTask.deadline && compareDates(successorTask.deadline, newRequiredDate) < 0) {
            impact = {
              type: 'SF',
              affected_task: successorTask.title,
              affected_task_id: successorTask._id,
              affected_date_type: 'deadline',
              current_date: successorTask.deadline,
              new_required_date: newRequiredDate,
              will_violate: true,
              message: `"${successorTask.title}" may need to finish on ${newRequiredDate.toLocaleDateString()} or later`
            };
          }
        }
        break;
    }

    if (impact) {
      impacts.push(impact);
    }
  });

  return {
    has_impact: impacts.length > 0,
    affected_tasks_count: impacts.length,
    impacts,
    summary: impacts.length > 0 
      ? `Changing dates will affect ${impacts.length} dependent task${impacts.length > 1 ? 's' : ''}`
      : 'No dependent tasks will be affected'
  };
}

module.exports = {
  addDays,
  compareDates,
  calculateEarliestDates,
  validateTaskDates,
  suggestAdjustedDates,
  analyzeDateChangeImpact
};

