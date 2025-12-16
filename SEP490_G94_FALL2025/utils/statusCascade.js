/**
 * Utility functions để tự động cập nhật status của function và feature
 * dựa trên status của tasks và functions
 */

const Task = require('../models/task');
const Function = require('../models/function');
const Feature = require('../models/feature');
const Milestone = require('../models/milestone');
const FeaturesMilestone = require('../models/feature_milestone');
const ActivityLog = require('../models/activity_log');

/**
 * Tính toán status của function dựa trên tất cả tasks của nó
 * Logic:
 * - Nếu tất cả tasks đều "Done" → function = "Done"
 * - Nếu có ít nhất 1 task "Doing" → function = "Doing"
 * - Nếu tất cả tasks đều "To Do" → function = "To Do"
 */
async function calculateFunctionStatus(functionId) {
  const tasks = await Task.find({ function_id: functionId }).select('status');
  
  if (!tasks || tasks.length === 0) {
    return null; // Không có task nào, giữ nguyên status hiện tại
  }

  const statusCounts = {
    'Done': 0,
    'Doing': 0,
    'To Do': 0
  };

  tasks.forEach(task => {
    const status = task.status || 'To Do';
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    } else {
      statusCounts['To Do']++;
    }
  });

  // Chỉ khi TẤT CẢ tasks đều Done thì function mới là Done
  if (statusCounts['Done'] === tasks.length) {
    return 'Done';
  }
  
  // Nếu có ít nhất 1 task đang Doing → function = Doing
  if (statusCounts['Doing'] > 0) {
    return 'Doing';
  }
  
  // Nếu tất cả đều To Do → function = To Do
  if (statusCounts['To Do'] === tasks.length) {
    return 'To Do';
  }
  
  // Trường hợp hỗn hợp: có cả Done và To Do (nhưng không có Doing)
  // Nếu có bất kỳ task nào chưa Done (To Do) → function = Doing (đang trong quá trình)
  if (statusCounts['To Do'] > 0) {
    return 'Doing';
  }
  
  // Fallback: nếu chỉ có Done (nhưng không phải tất cả) → Doing
  if (statusCounts['Done'] > 0) {
    return 'Doing';
  }
  
  return 'To Do';
}

/**
 * Tính toán status của feature dựa trên tất cả functions của nó
 * Logic tương tự như function
 */
async function calculateFeatureStatus(featureId) {
  const functions = await Function.find({ feature_id: featureId }).select('status');
  
  if (!functions || functions.length === 0) {
    return null; // Không có function nào, giữ nguyên status hiện tại
  }

  const statusCounts = {
    'Done': 0,
    'Doing': 0,
    'To Do': 0
  };

  functions.forEach(func => {
    const status = func.status || 'To Do';
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    } else {
      statusCounts['To Do']++;
    }
  });

  // Chỉ khi TẤT CẢ functions đều Done thì feature mới là Done
  if (statusCounts['Done'] === functions.length) {
    return 'Done';
  }
  
  // Nếu có ít nhất 1 function đang Doing → feature = Doing
  if (statusCounts['Doing'] > 0) {
    return 'Doing';
  }
  
  // Nếu tất cả đều To Do → feature = To Do
  if (statusCounts['To Do'] === functions.length) {
    return 'To Do';
  }
  
  // Trường hợp hỗn hợp: có cả Done và To Do (nhưng không có Doing)
  // Nếu có bất kỳ function nào chưa Done (To Do) → feature = Doing (đang trong quá trình)
  if (statusCounts['To Do'] > 0) {
    return 'Doing';
  }
  
  // Fallback: nếu chỉ có Done (nhưng không phải tất cả) → Doing
  if (statusCounts['Done'] > 0) {
    return 'Doing';
  }
  
  return 'To Do';
}

/**
 * Cập nhật status của function dựa trên tasks
 * @param {string} functionId - ID của function cần cập nhật
 * @param {string} userId - ID của user thực hiện (cho activity log)
 * @returns {Promise<Object|null>} - Function đã được cập nhật hoặc null nếu không cần cập nhật
 */
async function updateFunctionStatusFromTasks(functionId, userId = null) {
  try {
    const func = await Function.findById(functionId).populate('feature_id', 'project_id');
    if (!func) {
      return null;
    }

    const newStatus = await calculateFunctionStatus(functionId);
    if (!newStatus || newStatus === func.status) {
      return null; // Không cần cập nhật
    }

    const oldStatus = func.status;
    await Function.findByIdAndUpdate(functionId, { status: newStatus });

    // Log activity
    try {
      const featureId = typeof func.feature_id === 'object' && func.feature_id !== null
        ? (func.feature_id._id || func.feature_id)
        : func.feature_id;
      
      let projectId = null;
      if (func.feature_id && typeof func.feature_id === 'object' && func.feature_id.project_id) {
        projectId = typeof func.feature_id.project_id === 'object'
          ? (func.feature_id.project_id._id || func.feature_id.project_id)
          : func.feature_id.project_id;
      }

      if (projectId) {
        await ActivityLog.create({
          project_id: projectId,
          feature_id: featureId,
          function_id: functionId,
          action: 'Chức năng đã được tự động cập nhật trạng thái',
          metadata: {
            function_id: functionId,
            function_title: func.title,
            old_status: oldStatus,
            new_status: newStatus,
            reason: 'Tự động cập nhật dựa trên trạng thái công việc'
          },
          created_by: userId,
        });
      }
    } catch (logError) {
      console.error('Lỗi ghi log tự động cập nhật trạng thái chức năng:', logError);
    }

    return await Function.findById(functionId);
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái chức năng từ công việc:', error);
    return null;
  }
}

/**
 * Cập nhật status của feature dựa trên functions
 * @param {string} featureId - ID của featureId của feature cần cập nhật
 * @param {string} userId - ID của user thực hiện (cho activity log)
 * @returns {Promise<Object|null>} - Feature đã được cập nhật hoặc null nếu không cần cập nhật
 */
async function updateFeatureStatusFromFunctions(featureId, userId = null) {
  try {
    const feature = await Feature.findById(featureId).select('project_id title status');
    if (!feature) {
      return null;
    }

    const newStatus = await calculateFeatureStatus(featureId);
    if (!newStatus || newStatus === feature.status) {
      return null; // Không cần cập nhật
    }

    const oldStatus = feature.status;
    await Feature.findByIdAndUpdate(featureId, { status: newStatus });

    // Log activity
    try {
      const projectId = feature.project_id;
      if (projectId) {
        await ActivityLog.create({
          project_id: projectId,
          feature_id: featureId,
          action: 'Tính năng đã được tự động cập nhật trạng thái',
          metadata: {
            feature_id: featureId,
            feature_title: feature.title,
            old_status: oldStatus,
            new_status: newStatus,
            reason: 'Tự động cập nhật dựa trên trạng thái chức năng'
          },
          created_by: userId,
        });
      }
    } catch (logError) {
      console.error('Lỗi ghi log tự động cập nhật trạng thái tính năng:', logError);
    }

    const updatedFeature = await Feature.findById(featureId);
    
    // Sau khi cập nhật feature status, cập nhật milestone status
    if (updatedFeature) {
      await cascadeUpdateStatusFromFeature(featureId, userId);
    }
    
    return updatedFeature;
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái tính năng từ chức năng:', error);
    return null;
  }
}

/**
 * Cập nhật cascade: task → function → feature
 * @param {string} taskId - ID của task vừa được cập nhật
 * @param {string} userId - ID của user thực hiện
 */
async function cascadeUpdateStatusFromTask(taskId, userId = null) {
  try {
    const task = await Task.findById(taskId).select('function_id');
    if (!task || !task.function_id) {
      return;
    }

    const functionId = task.function_id.toString();
    
    // Cập nhật function status
    const updatedFunction = await updateFunctionStatusFromTasks(functionId, userId);
    
    if (updatedFunction && updatedFunction.feature_id) {
      const featureId = typeof updatedFunction.feature_id === 'object'
        ? (updatedFunction.feature_id._id || updatedFunction.feature_id)
        : updatedFunction.feature_id;
      
      // Cập nhật feature status
      await updateFeatureStatusFromFunctions(featureId, userId);
    }
  } catch (error) {
    console.error('Lỗi trong cập nhật cascade trạng thái từ công việc:', error);
  }
}

/**
 * Cập nhật cascade: function → feature
 * @param {string} functionId - ID của function vừa được cập nhật
 * @param {string} userId - ID của user thực hiện
 */
async function cascadeUpdateStatusFromFunction(functionId, userId = null) {
  try {
    const func = await Function.findById(functionId).select('feature_id');
    if (!func || !func.feature_id) {
      return;
    }

    const featureId = typeof func.feature_id === 'object'
      ? (func.feature_id._id || func.feature_id)
      : func.feature_id;
    
    // Cập nhật feature status
    const updatedFeature = await updateFeatureStatusFromFunctions(featureId, userId);
    
    // Nếu feature được cập nhật, cập nhật milestone status
    if (updatedFeature) {
      await cascadeUpdateStatusFromFeature(featureId, userId);
    }
  } catch (error) {
    console.error('Lỗi trong cập nhật cascade trạng thái từ chức năng:', error);
  }
}

/**
 * Tính toán status của milestone dựa trên tất cả features liên kết
 * Logic tương tự như feature và function
 */
async function calculateMilestoneStatus(milestoneId) {
  // Lấy tất cả features liên kết với milestone này
  const featureLinks = await FeaturesMilestone.find({ milestone_id: milestoneId }).select('feature_id');
  if (!featureLinks || featureLinks.length === 0) {
    return null; // Không có feature nào, giữ nguyên status hiện tại
  }

  const featureIds = featureLinks.map(link => link.feature_id);
  const features = await Feature.find({ _id: { $in: featureIds } }).select('status');

  if (!features || features.length === 0) {
    return null;
  }

  const statusCounts = {
    'Done': 0,
    'Doing': 0,
    'To Do': 0
  };

  features.forEach(feature => {
    const status = feature.status || 'To Do';
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    } else {
      statusCounts['To Do']++;
    }
  });

  // Chỉ khi TẤT CẢ features đều Done thì milestone mới là Done
  if (statusCounts['Done'] === features.length) {
    return 'Done';
  }
  
  // Nếu có ít nhất 1 feature đang Doing → milestone = Doing
  if (statusCounts['Doing'] > 0) {
    return 'Doing';
  }
  
  // Nếu tất cả đều To Do → milestone = To Do
  if (statusCounts['To Do'] === features.length) {
    return 'To Do';
  }
  
  // Trường hợp hỗn hợp: có cả Done và To Do (nhưng không có Doing)
  // Nếu có bất kỳ feature nào chưa Done (To Do) → milestone = Doing (đang trong quá trình)
  if (statusCounts['To Do'] > 0) {
    return 'Doing';
  }
  
  // Fallback: nếu chỉ có Done (nhưng không phải tất cả) → Doing
  if (statusCounts['Done'] > 0) {
    return 'Doing';
  }
  
  return 'To Do';
}

/**
 * Cập nhật status của milestone dựa trên features liên kết
 * @param {string} milestoneId - ID của milestone cần cập nhật
 * @param {string} userId - ID của user thực hiện (cho activity log)
 * @returns {Promise<Object|null>} - Milestone đã được cập nhật hoặc null nếu không cần cập nhật
 */
async function updateMilestoneStatusFromFeatures(milestoneId, userId = null) {
  try {
    const milestone = await Milestone.findById(milestoneId).select('project_id title status');
    if (!milestone) {
      return null;
    }

    const newStatus = await calculateMilestoneStatus(milestoneId);
    if (!newStatus || newStatus === milestone.status) {
      return null; // Không cần cập nhật
    }

    const oldStatus = milestone.status;
    await Milestone.findByIdAndUpdate(milestoneId, { status: newStatus });

    // Log activity
    try {
      const projectId = milestone.project_id;
      if (projectId) {
        await ActivityLog.create({
          project_id: projectId,
          milestone_id: milestoneId,
          action: 'MILESTONE_STATUS_AUTO_UPDATED',
          metadata: {
            milestone_id: milestoneId,
            milestone_title: milestone.title,
            old_status: oldStatus,
            new_status: newStatus,
            reason: 'Tự động cập nhật dựa trên trạng thái tính năng liên kết'
          },
          created_by: userId,
        });
      }
    } catch (logError) {
      console.error('Lỗi ghi log tự động cập nhật trạng thái cột mốc:', logError);
    }

    return await Milestone.findById(milestoneId);
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái cột mốc từ tính năng:', error);
    return null;
  }
}

/**
 * Cập nhật cascade: feature → milestone
 * @param {string} featureId - ID của feature vừa được cập nhật
 * @param {string} userId - ID của user thực hiện
 */
async function cascadeUpdateStatusFromFeature(featureId, userId = null) {
  try {
    // Tìm tất cả milestones liên kết với feature này
    const featureLinks = await FeaturesMilestone.find({ feature_id: featureId }).select('milestone_id');
    if (!featureLinks || featureLinks.length === 0) {
      return; // Không có milestone nào liên kết
    }

    // Cập nhật status cho từng milestone
    for (const link of featureLinks) {
      const milestoneId = link.milestone_id;
      await updateMilestoneStatusFromFeatures(milestoneId, userId);
    }
  } catch (error) {
    console.error('Lỗi trong cập nhật cascade trạng thái từ tính năng:', error);
  }
}

module.exports = {
  calculateFunctionStatus,
  calculateFeatureStatus,
  calculateMilestoneStatus,
  updateFunctionStatusFromTasks,
  updateFeatureStatusFromFunctions,
  updateMilestoneStatusFromFeatures,
  cascadeUpdateStatusFromTask,
  cascadeUpdateStatusFromFunction,
  cascadeUpdateStatusFromFeature
};

