
/**
 * Rule 4.1: Feature phải thuộc cùng project với milestone
 */
function validateRule41(featureProjectId, milestoneProjectId) {
  if (!featureProjectId || !milestoneProjectId) return { valid: true };
  
  if (String(featureProjectId) !== String(milestoneProjectId)) {
    return {
      valid: false,
      error: 'Feature phải thuộc cùng project với milestone (Rule 4.1)'
    };
  }
  
  return { valid: true };
}



/**
 * Rule 4.5: Feature start_date phải >= milestone start_date
 */
function validateRule45(featureStartDate, milestoneStartDate) {
  if (!featureStartDate || !milestoneStartDate) return { valid: true };
  
  const fStart = new Date(featureStartDate);
  const mStart = new Date(milestoneStartDate);
  
  if (fStart < mStart) {
    return {
      valid: false,
      error: 'Feature start_date phải >= milestone start_date (Rule 4.5)'
    };
  }
  
  return { valid: true };
}


 
/**
 * Validate all milestone-feature rules at once
 */
function validateAllMilestoneFeatureRules(data) {
  const validations = [];
  
  // Rule 4.1: Same project
  if (data.featureProjectId !== undefined && data.milestoneProjectId !== undefined) {
    const rule41 = validateRule41(data.featureProjectId, data.milestoneProjectId);
    if (!rule41.valid) validations.push(rule41);
  }
  
 
  
  // Rule 4.5: Feature start_date >= milestone start_date
  if (data.featureStartDate && data.milestoneStartDate) {
    const rule45 = validateRule45(data.featureStartDate, data.milestoneStartDate);
    if (!rule45.valid) validations.push(rule45);
  }
  
 
  return {
    valid: validations.length === 0,
    errors: validations.map(v => v.error)
  };
}

module.exports = {
  validateRule41,

  validateRule45,
 
  validateAllMilestoneFeatureRules
};
