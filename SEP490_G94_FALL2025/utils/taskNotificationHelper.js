const { sendNotification, sendNotificationsToUsers } = require('../services/sendNotifications');
const Task = require('../models/task');
const User = require('../models/user');
const Project = require('../models/project');
const Team = require('../models/team');

/**
 * Gửi notification khi task được tạo
 */
async function notifyTaskCreated(task, creatorId, projectId) {
  try {
    // Ensure task is populated
    if (typeof task.assignee_id === 'object' && task.assignee_id?._id) {
      task.assignee_id = task.assignee_id._id;
    }
    if (typeof task.assigner_id === 'object' && task.assigner_id?._id) {
      task.assigner_id = task.assigner_id._id;
    }

    const assigneeId = task.assignee_id;
    const assignerId = task.assigner_id || creatorId;

    // Notification cho người được assign
    if (assigneeId && assigneeId.toString() !== creatorId.toString()) {
      await sendNotification({
        user_id: assigneeId,
        type: 'Task',
        action: 'create',
        message: `Bạn đã được giao công việc mới: "${task.title}"`,
        priority: task.priority === 'Critical' || task.priority === 'High' ? 'High' : 'Medium',
        project_id: projectId,
        task_id: task._id,
        created_by: creatorId,
        action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
        metadata: {
          task_title: task.title,
          task_priority: task.priority,
          deadline: task.deadline
        }
      });
    }

    // Notification cho project members (nếu cần thông báo rộng rãi)
    // Có thể bật/tắt tùy theo yêu cầu
  } catch (error) {
    console.error('Error sending task created notification:', error);
  }
}

/**
 * Gửi notification khi task được assign
 */
async function notifyTaskAssigned(task, oldAssigneeId, newAssigneeId, assignerId, projectId) {
  try {
    // Normalize IDs
    const oldAssignee = oldAssigneeId?._id || oldAssigneeId;
    const newAssignee = newAssigneeId?._id || newAssigneeId;
    const assigner = assignerId?._id || assignerId;

    // Notification cho người được assign mới
    if (newAssignee && newAssignee.toString() !== assigner?.toString()) {
      await sendNotification({
        user_id: newAssignee,
        type: 'Task',
        action: 'assign',
        message: `Bạn đã được giao công việc: "${task.title}"`,
        priority: task.priority === 'Critical' || task.priority === 'High' ? 'High' : 'Medium',
        project_id: projectId,
        task_id: task._id,
        created_by: assigner,
        action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
        metadata: {
          task_title: task.title,
          task_priority: task.priority,
          deadline: task.deadline
        }
      });
    }

    // Notification cho người được unassign (nếu có)
    if (oldAssignee && oldAssignee.toString() !== newAssignee?.toString() && oldAssignee.toString() !== assigner?.toString()) {
      await sendNotification({
        user_id: oldAssignee,
        type: 'Task',
        action: 'update',
        message: `Bạn đã được gỡ khỏi công việc: "${task.title}"`,
        priority: 'Low',
        project_id: projectId,
        task_id: task._id,
        created_by: assigner,
        action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
        metadata: {
          task_title: task.title
        }
      });
    }
  } catch (error) {
    console.error('Error sending task assigned notification:', error);
  }
}

/**
 * Gửi notification khi status task thay đổi
 */
async function notifyTaskStatusChanged(task, oldStatus, newStatus, changerId, projectId) {
  try {
    // Normalize IDs
    const assigneeId = task.assignee_id?._id || task.assignee_id;
    const assignerId = task.assigner_id?._id || task.assigner_id;
    const changer = changerId?._id || changerId;

    // Notification cho assignee
    if (assigneeId && assigneeId.toString() !== changer?.toString()) {
      await sendNotification({
        user_id: assigneeId,
        type: 'Task',
        action: 'status_change',
        message: `Trạng thái công việc "${task.title}" đã thay đổi từ "${oldStatus}" sang "${newStatus}"`,
        priority: newStatus === 'Completed' ? 'Medium' : 'Low',
        project_id: projectId,
        task_id: task._id,
        created_by: changer,
        action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
        metadata: {
          task_title: task.title,
          old_status: oldStatus,
          new_status: newStatus
        }
      });
    }

    // Notification cho assigner (nếu khác với assignee và changer)
    if (assignerId && 
        assignerId.toString() !== assigneeId?.toString() && 
        assignerId.toString() !== changer?.toString()) {
      await sendNotification({
        user_id: assignerId,
        type: 'Task',
        action: 'status_change',
        message: `Trạng thái công việc "${task.title}" đã thay đổi từ "${oldStatus}" sang "${newStatus}"`,
        priority: 'Low',
        project_id: projectId,
        task_id: task._id,
        created_by: changer,
        action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
        metadata: {
          task_title: task.title,
          old_status: oldStatus,
          new_status: newStatus
        }
      });
    }
  } catch (error) {
    console.error('Error sending task status changed notification:', error);
  }
}

/**
 * Gửi notification khi deadline task thay đổi
 */
async function notifyTaskDeadlineChanged(task, oldDeadline, newDeadline, changerId, projectId) {
  try {
    const assigneeId = task.assignee_id?._id || task.assignee_id;
    const changer = changerId?._id || changerId;

    if (assigneeId && assigneeId.toString() !== changer?.toString()) {
      const oldDate = oldDeadline ? new Date(oldDeadline).toLocaleDateString('vi-VN') : 'Chưa có';
      const newDate = new Date(newDeadline).toLocaleDateString('vi-VN');
      
      await sendNotification({
        user_id: assigneeId,
        type: 'Task',
        action: 'update',
        message: `Hạn chót của công việc "${task.title}" đã thay đổi từ ${oldDate} sang ${newDate}`,
        priority: 'Medium',
        project_id: projectId,
        task_id: task._id,
        created_by: changer,
        action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
        metadata: {
          task_title: task.title,
          old_deadline: oldDeadline,
          new_deadline: newDeadline
        }
      });
    }
  } catch (error) {
    console.error('Error sending task deadline changed notification:', error);
  }
}

/**
 * Gửi notification khi có comment trên task
 */
async function notifyTaskComment(task, commenterId, projectId, taskId) {
  try {
    const assigneeId = task.assignee_id?._id || task.assignee_id;
    const assignerId = task.assigner_id?._id || task.assigner_id;
    const commenter = commenterId?._id || commenterId;
    const userIdsToNotify = [];

    // Thêm assignee (nếu khác với người comment)
    if (assigneeId && assigneeId.toString() !== commenter?.toString()) {
      userIdsToNotify.push(assigneeId);
    }

    // Thêm assigner (nếu khác với người comment và assignee)
    if (assignerId && 
        assignerId.toString() !== commenter?.toString() &&
        assignerId.toString() !== assigneeId?.toString()) {
      userIdsToNotify.push(assignerId);
    }

    if (userIdsToNotify.length > 0) {
      await sendNotificationsToUsers(userIdsToNotify, {
        type: 'Task',
        action: 'comment',
        message: `Có bình luận mới trên công việc "${task.title}"`,
        priority: 'Low',
        project_id: projectId,
        task_id: taskId,
        created_by: commenter,
        action_url: `/projects/${projectId}/tasks?taskId=${taskId}`,
        metadata: {
          task_title: task.title
        }
      });
    }
  } catch (error) {
    console.error('Error sending task comment notification:', error);
  }
}

/**
 * Gửi notification khi có attachment được thêm vào task
 */
async function notifyTaskAttachment(task, uploaderId, projectId, taskId, fileName) {
  try {
    const assigneeId = task.assignee_id?._id || task.assignee_id;
    const assignerId = task.assigner_id?._id || task.assigner_id;
    const uploader = uploaderId?._id || uploaderId;
    const userIdsToNotify = [];

    // Thêm assignee (nếu khác với người upload)
    if (assigneeId && assigneeId.toString() !== uploader?.toString()) {
      userIdsToNotify.push(assigneeId);
    }

    // Thêm assigner (nếu khác với người upload và assignee)
    if (assignerId && 
        assignerId.toString() !== uploader?.toString() &&
        assignerId.toString() !== assigneeId?.toString()) {
      userIdsToNotify.push(assignerId);
    }

    if (userIdsToNotify.length > 0) {
      await sendNotificationsToUsers(userIdsToNotify, {
        type: 'Task',
        action: 'update',
        message: `Tệp đính kèm mới đã được thêm vào công việc "${task.title}": ${fileName}`,
        priority: 'Low',
        project_id: projectId,
        task_id: taskId,
        created_by: uploader,
        action_url: `/projects/${projectId}/tasks?taskId=${taskId}`,
        metadata: {
          task_title: task.title,
          file_name: fileName
        }
      });
    }
  } catch (error) {
    console.error('Error sending task attachment notification:', error);
  }
}

/**
 * Gửi notification khi deadline sắp đến (scheduled job)
 */
async function notifyDeadlineApproaching(task, projectId) {
  try {
    const assigneeId = task.assignee_id?._id || task.assignee_id;
    if (!assigneeId) return;

    const deadline = new Date(task.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    let message = '';
    let priority = 'Medium';

    if (daysUntilDeadline === 0) {
      message = `⚠️ Công việc "${task.title}" hết hạn hôm nay!`;
      priority = 'Urgent';
    } else if (daysUntilDeadline === 1) {
      message = `⚠️ Công việc "${task.title}" hết hạn vào ngày mai!`;
      priority = 'High';
    } else if (daysUntilDeadline <= 3) {
      message = `⚠️ Công việc "${task.title}" sắp hết hạn trong ${daysUntilDeadline} ngày`;
      priority = 'High';
    } else if (daysUntilDeadline <= 7) {
      message = `Công việc "${task.title}" sắp hết hạn trong ${daysUntilDeadline} ngày`;
      priority = 'Medium';
    }

    if (message) {
      await sendNotification({
        user_id: assigneeId,
        type: 'Task',
        action: 'deadline_approaching',
        message: message,
        priority: priority,
        project_id: projectId,
        task_id: task._id,
        action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
        metadata: {
          task_title: task.title,
          deadline: task.deadline,
          days_until_deadline: daysUntilDeadline
        }
      });
    }
  } catch (error) {
    console.error('Error sending deadline approaching notification:', error);
  }
}

/**
 * Gửi notification khi deadline đã qua
 */
async function notifyDeadlinePassed(task, projectId) {
  try {
    const assigneeId = task.assignee_id?._id || task.assignee_id;
    if (!assigneeId) return;

    // Chỉ gửi nếu task chưa completed
    if (task.status === 'Completed' || task.status === 'Done') return;

    await sendNotification({
      user_id: assigneeId,
      type: 'Task',
      action: 'deadline_passed',
      message: `🔴 Công việc "${task.title}" đã quá hạn!`,
      priority: 'Urgent',
      project_id: projectId,
      task_id: task._id,
      action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
      metadata: {
        task_title: task.title,
        deadline: task.deadline
      }
    });

    // Cũng gửi cho assigner nếu có
    const assignerId = task.assigner_id?._id || task.assigner_id;
    if (assignerId && assignerId.toString() !== assigneeId.toString()) {
      await sendNotification({
        user_id: assignerId,
        type: 'Task',
        action: 'deadline_passed',
        message: `🔴 Công việc "${task.title}" đã quá hạn!`,
        priority: 'High',
        project_id: projectId,
        task_id: task._id,
        action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
        metadata: {
          task_title: task.title,
          deadline: task.deadline
        }
      });
    }
  } catch (error) {
    console.error('Error sending deadline passed notification:', error);
  }
}

/**
 * Gửi notification khi priority task thay đổi
 */
async function notifyTaskPriorityChanged(task, oldPriority, newPriority, changerId, projectId) {
  try {
    const assigneeId = task.assignee_id?._id || task.assignee_id;
    const changer = changerId?._id || changerId;

    if (assigneeId && assigneeId.toString() !== changer?.toString()) {
      await sendNotification({
        user_id: assigneeId,
        type: 'Task',
        action: 'update',
        message: `Ưu tiên của công việc "${task.title}" đã thay đổi từ "${oldPriority}" sang "${newPriority}"`,
        priority: newPriority === 'Critical' || newPriority === 'High' ? 'High' : 'Medium',
        project_id: projectId,
        task_id: task._id,
        created_by: changer,
        action_url: `/projects/${projectId}/tasks?taskId=${task._id}`,
        metadata: {
          task_title: task.title,
          old_priority: oldPriority,
          new_priority: newPriority
        }
      });
    }
  } catch (error) {
    console.error('Error sending task priority changed notification:', error);
  }
}

module.exports = {
  notifyTaskCreated,
  notifyTaskAssigned,
  notifyTaskStatusChanged,
  notifyTaskDeadlineChanged,
  notifyTaskComment,
  notifyTaskAttachment,
  notifyDeadlineApproaching,
  notifyDeadlinePassed,
  notifyTaskPriorityChanged,
};

