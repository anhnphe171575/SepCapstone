/**
 * Task Status Utilities
 * Helper functions for task status management
 */

/**
 * Resolve status metadata from status object or string
 * @param {Object|String} status - Status object with code/name or status string
 * @returns {Object} { code, name, category }
 */
function resolveStatusMeta(status) {
  if (!status) {
    return { code: 'pending', name: 'Pending', category: 'not_started' };
  }

  // If status is already an object with code
  if (typeof status === 'object' && status.code) {
    return {
      code: status.code || 'pending',
      name: status.name || 'Pending',
      category: getStatusCategory(status.code)
    };
  }

  // If status is a string, normalize it
  const normalizedStatus = normalizeStatus(status);
  return {
    code: normalizedStatus,
    name: capitalizeStatus(normalizedStatus),
    category: getStatusCategory(normalizedStatus)
  };
}

/**
 * Normalize status string to lowercase code
 * @param {String|Object} status 
 * @returns {String} Normalized status code
 */
function normalizeStatus(status) {
  if (typeof status === 'object') {
    return (status.code || status.name || '').toLowerCase().trim();
  }
  return (status || '').toLowerCase().trim();
}

/**
 * Check if status indicates task has started
 * @param {String} statusCode 
 * @returns {Boolean}
 */
function isStartedStatusCode(statusCode) {
  const startedStatuses = [
    'in_progress',
    'in progress',
    'doing',
    'working',
    'started',
    'active',
    'ongoing'
  ];
  
  const normalized = normalizeStatus(statusCode);
  return startedStatuses.some(s => normalized.includes(s));
}

/**
 * Check if status indicates task is completed
 * @param {String} statusCode 
 * @returns {Boolean}
 */
function isCompletedStatusCode(statusCode) {
  const completedStatuses = [
    'completed',
    'done',
    'finished',
    'closed',
    'resolved',
    'complete'
  ];
  
  const normalized = normalizeStatus(statusCode);
  return completedStatuses.some(s => normalized.includes(s));
}

/**
 * Check if status indicates task is pending/not started
 * @param {String} statusCode 
 * @returns {Boolean}
 */
function isPendingStatusCode(statusCode) {
  const pendingStatuses = [
    'pending',
    'to do',
    'todo',
    'not started',
    'backlog',
    'open'
  ];
  
  const normalized = normalizeStatus(statusCode);
  return pendingStatuses.some(s => normalized.includes(s));
}

/**
 * Get status category
 * @param {String} statusCode 
 * @returns {String} 'not_started' | 'in_progress' | 'completed'
 */
function getStatusCategory(statusCode) {
  if (isCompletedStatusCode(statusCode)) return 'completed';
  if (isStartedStatusCode(statusCode)) return 'in_progress';
  return 'not_started';
}

/**
 * Capitalize status name
 * @param {String} status 
 * @returns {String}
 */
function capitalizeStatus(status) {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate status transition
 * @param {String} currentStatus 
 * @param {String} newStatus 
 * @returns {Object} { valid, message }
 */
function validateStatusTransition(currentStatus, newStatus) {
  const currentCategory = getStatusCategory(currentStatus);
  const newCategory = getStatusCategory(newStatus);

  // Allow any transition for now
  // Can add more strict rules later
  return {
    valid: true,
    message: 'Status transition allowed'
  };
}

/**
 * Get all valid next statuses for a given status
 * @param {String} currentStatus 
 * @returns {Array} List of valid next status codes
 */
function getValidNextStatuses(currentStatus) {
  const category = getStatusCategory(currentStatus);

  switch (category) {
    case 'not_started':
      return ['in_progress', 'completed', 'cancelled'];
    case 'in_progress':
      return ['completed', 'pending', 'blocked', 'cancelled'];
    case 'completed':
      return ['in_progress', 'reopened'];
    default:
      return ['pending', 'in_progress', 'completed'];
  }
}

module.exports = {
  resolveStatusMeta,
  normalizeStatus,
  isStartedStatusCode,
  isCompletedStatusCode,
  isPendingStatusCode,
  getStatusCategory,
  capitalizeStatus,
  validateStatusTransition,
  getValidNextStatuses
};

