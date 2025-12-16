/**
 * Milestone Date Business Rules Validation
 * 
 * Rule 2.1: start_date phải < deadline
 * Rule 2.2: start_date không được < project.start_date
 * Rule 2.3: deadline không được > project.end_date
 * Rule 2.5: actual_date chỉ được set khi status = completed
 * Rule 2.6: Không thể thay đổi start_date khi milestone đã active
 * Rule 2.7: estimated_completion phải nằm giữa start_date và deadline
 */

/**
 * Rule 2.1: start_date phải < deadline
 */
function validateRule21(startDate, deadline) {
  if (!startDate || !deadline) return { valid: true };
  
  const start = new Date(startDate);
  const end = new Date(deadline);
  
  if (start >= end) {
    return {
      valid: false,
      error: 'start_date phải nhỏ hơn deadline'
    };
  }
  
  return { valid: true };
}

/**
 * Rule 2.2: start_date không được < project.start_date
 */
function validateRule22(milestoneStartDate, projectStartDate) {
  if (!milestoneStartDate || !projectStartDate) return { valid: true };
  
  const mStart = new Date(milestoneStartDate);
  const pStart = new Date(projectStartDate);
  
  if (mStart < pStart) {
    return {
      valid: false,
      error: 'start_date milestone không được trước project.start_date'
    };
  }
  
  return { valid: true };
}

/**
 * Rule 2.3: deadline không được > project.end_date
 */
function validateRule23(milestoneDeadline, projectEndDate) {
  if (!milestoneDeadline || !projectEndDate) return { valid: true };
  
  const mDeadline = new Date(milestoneDeadline);
  const pEnd = new Date(projectEndDate);
  
  if (mDeadline > pEnd) {
    return {
      valid: false,
      error: 'deadline milestone không được sau project.end_date'
    };
  }
  
  return { valid: true };
}


/**
 * Validate all date rules tại một lần
 */
function validateAllDateRules(milestoneData, projectData, originalMilestone = null) {
  const validations = [];
  
  // Rule 2.1
  const rule21 = validateRule21(milestoneData.start_date, milestoneData.deadline);
  if (!rule21.valid) validations.push(rule21);
  
  // Rule 2.2
  if (projectData?.start_date) {
    const rule22 = validateRule22(milestoneData.start_date, projectData.start_date);
    if (!rule22.valid) validations.push(rule22);
  }
  
  // Rule 2.3
  if (projectData?.end_date) {
    const rule23 = validateRule23(milestoneData.deadline, projectData.end_date);
    if (!rule23.valid) validations.push(rule23);
  }

  
  return {
    valid: validations.length === 0,
    errors: validations.map(v => v.error)
  };
}

module.exports = {
  validateRule21,
  validateRule22,
  validateRule23,
  validateAllDateRules
};
