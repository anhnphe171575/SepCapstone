const Task = require('../models/task');
const { notifyDeadlineApproaching, notifyDeadlinePassed } = require('../utils/taskNotificationHelper');
const Notification = require('../models/notification');

/**
 * Scheduled job để kiểm tra và gửi notification cho deadline approaching và deadline passed
 * Nên chạy mỗi ngày một lần (ví dụ: 8:00 AM)
 */
async function checkTaskDeadlines() {
  try {
    console.log('[Task Deadline Checker] Bắt đầu kiểm tra deadline...');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // Lấy tất cả tasks có deadline trong khoảng từ hôm nay đến 7 ngày tới
    // và chưa completed
    const tasks = await Task.find({
      deadline: {
        $gte: today,
        $lte: sevenDaysLater
      },
      status: { $nin: ['Completed', 'Done', 'Cancelled'] }
    })
      .populate({
        path: 'function_id',
        select: 'feature_id',
        populate: {
          path: 'feature_id',
          select: 'project_id'
        }
      })
      .populate('assignee_id', '_id')
      .populate('assigner_id', '_id');

    console.log(`[Task Deadline Checker] Tìm thấy ${tasks.length} tasks cần kiểm tra`);

    let approachingCount = 0;
    let passedCount = 0;

    for (const task of tasks) {
      if (!task.assignee_id) continue; // Skip tasks without assignee

      const projectId = task.function_id?.feature_id?.project_id;
      if (!projectId) continue;

      const deadline = new Date(task.deadline);
      const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

      // Kiểm tra xem đã gửi notification cho deadline này chưa (tránh spam)
      const existingNotification = await Notification.findOne({
        task_id: task._id,
        action: daysUntilDeadline < 0 ? 'deadline_passed' : 'deadline_approaching',
        status: 'Unread',
        createdAt: {
          $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Trong 24h qua
        }
      });

      if (existingNotification) {
        continue; // Đã gửi notification gần đây, skip
      }

      if (daysUntilDeadline < 0) {
        // Deadline đã qua
        try {
          await notifyDeadlinePassed(task, projectId);
          passedCount++;
        } catch (error) {
          console.error(`[Task Deadline Checker] Lỗi gửi notification deadline passed cho task ${task._id}:`, error);
        }
      } else if (daysUntilDeadline <= 7) {
        // Deadline sắp đến (0-7 ngày)
        try {
          await notifyDeadlineApproaching(task, projectId);
          approachingCount++;
        } catch (error) {
          console.error(`[Task Deadline Checker] Lỗi gửi notification deadline approaching cho task ${task._id}:`, error);
        }
      }
    }

    console.log(`[Task Deadline Checker] Hoàn thành: ${approachingCount} deadline approaching, ${passedCount} deadline passed`);
    return {
      success: true,
      approaching_count: approachingCount,
      passed_count: passedCount,
      total_checked: tasks.length
    };
  } catch (error) {
    console.error('[Task Deadline Checker] Lỗi:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Kiểm tra deadline đã qua (chạy riêng để đảm bảo không bỏ sót)
 */
async function checkPassedDeadlines() {
  try {
    console.log('[Task Deadline Checker] Kiểm tra deadline đã qua...');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Lấy tất cả tasks có deadline đã qua và chưa completed
    const tasks = await Task.find({
      deadline: {
        $lt: today
      },
      status: { $nin: ['Completed', 'Done', 'Cancelled'] }
    })
      .populate({
        path: 'function_id',
        select: 'feature_id',
        populate: {
          path: 'feature_id',
          select: 'project_id'
        }
      })
      .populate('assignee_id', '_id')
      .populate('assigner_id', '_id');

    console.log(`[Task Deadline Checker] Tìm thấy ${tasks.length} tasks đã quá hạn`);

    let notifiedCount = 0;

    for (const task of tasks) {
      if (!task.assignee_id) continue;

      const projectId = task.function_id?.feature_id?.project_id;
      if (!projectId) continue;

      // Kiểm tra xem đã gửi notification trong 24h qua chưa
      const existingNotification = await Notification.findOne({
        task_id: task._id,
        action: 'deadline_passed',
        status: 'Unread',
        createdAt: {
          $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      });

      if (existingNotification) {
        continue;
      }

      try {
        await notifyDeadlinePassed(task, projectId);
        notifiedCount++;
      } catch (error) {
        console.error(`[Task Deadline Checker] Lỗi gửi notification deadline passed cho task ${task._id}:`, error);
      }
    }

    console.log(`[Task Deadline Checker] Đã gửi ${notifiedCount} notifications cho deadline đã qua`);
    return {
      success: true,
      notified_count: notifiedCount,
      total_checked: tasks.length
    };
  } catch (error) {
    console.error('[Task Deadline Checker] Lỗi kiểm tra deadline đã qua:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  checkTaskDeadlines,
  checkPassedDeadlines,
};

