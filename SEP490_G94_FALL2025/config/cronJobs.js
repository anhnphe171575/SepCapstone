const cron = require('node-cron');
const { checkTaskDeadlines, checkPassedDeadlines } = require('../jobs/taskDeadlineChecker');

/**
 * Setup các cron jobs cho task deadline checking
 */
function setupCronJobs() {
  console.log('[Cron Jobs] Đang khởi tạo cron jobs...');

  // Chạy mỗi ngày lúc 8:00 AM để kiểm tra deadline approaching (0-7 ngày)
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron Jobs] Chạy deadline approaching check...');
    try {
      const result = await checkTaskDeadlines();
      console.log('[Cron Jobs] Deadline approaching check hoàn thành:', result);
    } catch (error) {
      console.error('[Cron Jobs] Lỗi khi chạy deadline approaching check:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  // Chạy mỗi ngày lúc 9:00 AM để kiểm tra deadline đã qua
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron Jobs] Chạy deadline passed check...');
    try {
      const result = await checkPassedDeadlines();
      console.log('[Cron Jobs] Deadline passed check hoàn thành:', result);
    } catch (error) {
      console.error('[Cron Jobs] Lỗi khi chạy deadline passed check:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  // Chạy mỗi giờ để kiểm tra deadline đã qua (để đảm bảo không bỏ sót)
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron Jobs] Chạy deadline passed check (hourly)...');
    try {
      const result = await checkPassedDeadlines();
      if (result.notified_count > 0) {
        console.log('[Cron Jobs] Deadline passed check (hourly) hoàn thành:', result);
      }
    } catch (error) {
      console.error('[Cron Jobs] Lỗi khi chạy deadline passed check (hourly):', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  console.log('[Cron Jobs] Đã khởi tạo cron jobs thành công');
  console.log('  - Deadline approaching check: 8:00 AM mỗi ngày');
  console.log('  - Deadline passed check: 9:00 AM mỗi ngày');
  console.log('  - Deadline passed check (hourly): Mỗi giờ');
}

module.exports = { setupCronJobs };

