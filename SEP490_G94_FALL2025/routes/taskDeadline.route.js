const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { checkTaskDeadlines, checkPassedDeadlines } = require('../jobs/taskDeadlineChecker');

// POST /api/tasks/deadline-check (Manual trigger - có thể dùng cho cron job)
router.post('/deadline-check', verifyToken, async (req, res) => {
  try {
    const result = await checkTaskDeadlines();
    return res.json({
      message: 'Đã kiểm tra deadline thành công',
      ...result
    });
  } catch (error) {
    console.error('Error checking deadlines:', error);
    return res.status(500).json({
      message: 'Lỗi kiểm tra deadline',
      error: error.message
    });
  }
});

// POST /api/tasks/deadline-check-passed (Kiểm tra deadline đã qua)
router.post('/deadline-check-passed', verifyToken, async (req, res) => {
  try {
    const result = await checkPassedDeadlines();
    return res.json({
      message: 'Đã kiểm tra deadline đã qua thành công',
      ...result
    });
  } catch (error) {
    console.error('Error checking passed deadlines:', error);
    return res.status(500).json({
      message: 'Lỗi kiểm tra deadline đã qua',
      error: error.message
    });
  }
});

module.exports = router;

