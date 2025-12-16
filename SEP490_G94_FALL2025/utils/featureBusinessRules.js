


function validateRule21(startDate, dueDate) {
  if (!startDate || !dueDate) return { valid: true };

  const start = new Date(startDate);
  const due = new Date(dueDate);

  if (start >= due) {
    return {
      valid: false,
      error: 'start_date phải nhỏ hơn due_date'
    };
  }

  return { valid: true };
}

/**
 * Rule 2.2: start_date không được < project.start_date
 */
function validateRule22(featureStartDate, projectStartDate) {
  if (!featureStartDate || !projectStartDate) return { valid: true };

  const fStart = new Date(featureStartDate);
  const pStart = new Date(projectStartDate);

  if (fStart < pStart) {
    return {
      valid: false,
      error: 'start_date feature không được trước project.start_date'
    };
  }

  return { valid: true };
}

/**
 * Rule 2.3: due_date không được > project.end_date
 */
function validateRule23(featureDueDate, projectEndDate) {
  if (!featureDueDate || !projectEndDate) return { valid: true };

  const fDue = new Date(featureDueDate);
  const pEnd = new Date(projectEndDate);

  if (fDue > pEnd) {
    return {
      valid: false,
      error: 'due_date feature không được sau project.end_date (Rule 2.3)'
    };
  }

  return { valid: true };
}








function validateAllFeatureRules(data) {
  const validations = [];
  if (data.start_date && data.due_date) {
    const rule21 = validateRule21(data.start_date, data.due_date);
    if (!rule21.valid) validations.push(rule21);
  }
  if (data.start_date && data.projectStartDate) {
    const rule22 = validateRule22(data.start_date, data.projectStartDate);
    if (!rule22.valid) validations.push(rule22);
  }
  if (data.due_date && data.projectEndDate) {
    const rule23 = validateRule23(data.due_date, data.projectEndDate);
    if (!rule23.valid) validations.push(rule23);
  }

 



  return {
    valid: validations.length === 0,
    errors: validations.map(v => v.error)
  };
}

module.exports = {
  validateRule22,
  validateRule23,
validateRule21,
  validateAllFeatureRules
};

