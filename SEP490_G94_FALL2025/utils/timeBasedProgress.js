/**
 * Time-Based Progress Calculator
 * 
 * Calculates task progress based on time elapsed vs planned duration
 * and actual hours worked vs estimated hours.
 */

/**
 * Calculate duration in days between two dates
 * @param {Date|String} startDate - Start date
 * @param {Date|String} endDate - End date
 * @returns {Number} Duration in days (minimum 1)
 */
const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set time to midnight to calculate full days
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  
  return Math.max(1, diffDays);
};

/**
 * Calculate expected hours based on elapsed time
 * @param {Object} task - Task object with start_date, deadline, estimate
 * @returns {Number} Expected hours worked by current date
 */
const calculateExpectedHours = (task) => {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  const startDate = new Date(task.start_date);
  startDate.setHours(0, 0, 0, 0);
  
  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);
  
  const plannedDuration = calculateDuration(task.start_date, task.deadline);
  
  // expected duration = current date - planned start date + 1
  let expectedDuration = calculateDuration(task.start_date, currentDate);
  
  // If current date is before start date, expected duration is 0
  if (currentDate < startDate) {
    expectedDuration = 0;
  }
  
  // If current date is after deadline, cap expected duration at planned duration
  if (currentDate > deadline) {
    expectedDuration = plannedDuration;
  }
  
  const plannedEffort = task.estimate || 0;
  
  if (plannedDuration === 0 || plannedEffort === 0) {
    return 0;
  }
  console.log('expectedDuration = ' + expectedDuration);
  console.log('plannedDuration = ' + plannedDuration);
  // expected hours = (expected duration * planned effort in hours) / planned duration
  const expectedHours = (expectedDuration * plannedEffort) / plannedDuration;
  console.log('expectedHours = (expectedDuration * plannedEffort) / plannedDuration' + expectedHours + ' = ' + (expectedDuration * plannedEffort) + ' / ' + plannedDuration + ' = ' + (expectedDuration * plannedEffort) / plannedDuration);
  console.log('===================================\n');
  return Math.max(0, expectedHours);  
};

/**
 * Calculate target percent complete
 * target percent complete = (expected hours / planned effort in hours) * 100
 * @param {Object} task - Task object
 * @returns {Number} Target percent complete (0-100)
 */
const calculateTargetPercentComplete = (task) => {
  const plannedEffort = task.estimate || 0;
  
  if (plannedEffort === 0) {
    return 0;
  }
  
  const expectedHours = calculateExpectedHours(task);
  const targetPercent = (expectedHours / plannedEffort) * 100;
  
  return Math.min(100, Math.max(0, targetPercent));
};

/**
 * Calculate actual percent complete
 * actual percent complete = (actual hours / current effort in hours) * 100
 * @param {Object} task - Task object with actual and estimate
 * @returns {Number} Actual percent complete (0-100)
 */
const calculateActualPercentComplete = (task) => {
  const currentEffort = task.estimate || 0;
  const actualHours = task.actual || 0;
  
  if (currentEffort === 0) {
    return 0;
  }
  
  const actualPercent = (actualHours / currentEffort) * 100;
  
  return Math.min(100, Math.max(0, actualPercent));
};

/**
 * Get complete progress metrics for a task
 * @param {Object} task - Task object
 * @returns {Object} Progress metrics
 */
const getTaskProgressMetrics = (task) => {
  if (!task.start_date || !task.deadline) {
    return {
      targetPercentComplete: 0,
      actualPercentComplete: 0,
      expectedHours: 0,
      plannedEffort: task.estimate || 0,
      currentEffort: task.estimate || 0,
      actualHours: task.actual || 0,
      plannedDuration: 0,
      expectedDuration: 0,
      isOnTrack: true,
      variance: 0,
      status: 'Not Started'
    };
  }
  
  const targetPercentComplete = calculateTargetPercentComplete(task);
  const actualPercentComplete = calculateActualPercentComplete(task);
  const expectedHours = calculateExpectedHours(task);
  
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  const startDate = new Date(task.start_date);
  startDate.setHours(0, 0, 0, 0);
  
  const plannedDuration = calculateDuration(task.start_date, task.deadline);
  const expectedDuration = calculateDuration(task.start_date, currentDate);
  
  // Calculate variance (negative = behind schedule, positive = ahead of schedule)
  const variance = actualPercentComplete - targetPercentComplete;
  
  // Determine if on track (within 10% tolerance)
  const isOnTrack = Math.abs(variance) <= 10;
  
  // Determine status
  let status = 'Not Started';
  if (currentDate < startDate) {
    status = 'Not Started';
  } else if (actualPercentComplete >= 100) {
    status = 'Completed';
  } else if (currentDate > new Date(task.deadline)) {
    status = 'Overdue';
  } else if (variance < -10) {
    status = 'Behind Schedule';
  } else if (variance > 10) {
    status = 'Ahead of Schedule';
  } else {
    status = 'On Track';
  }
  
  return {
    targetPercentComplete: Math.round(targetPercentComplete * 10) / 10,
    actualPercentComplete: Math.round(actualPercentComplete * 10) / 10,
    expectedHours: Math.round(expectedHours * 10) / 10,
    plannedEffort: task.estimate || 0,
    currentEffort: task.estimate || 0,
    actualHours: task.actual || 0,
    plannedDuration,
    expectedDuration: Math.max(0, expectedDuration),
    isOnTrack,
    variance: Math.round(variance * 10) / 10,
    status
  };
};

/**
 * Calculate daily work hours required
 * Daily hours = Estimated time / planned duration
 * @param {Object} task - Task object
 * @returns {Number} Hours per day
 */
const calculateDailyWorkHours = (task) => {
  const plannedDuration = calculateDuration(task.start_date, task.deadline);
  const plannedEffort = task.estimate || 0;
  
  if (plannedDuration === 0) {
    return 0;
  }
  
  return plannedEffort / plannedDuration;
};

module.exports = {
  calculateDuration,
  calculateExpectedHours,
  calculateTargetPercentComplete,
  calculateActualPercentComplete,
  getTaskProgressMetrics,
  calculateDailyWorkHours
};

