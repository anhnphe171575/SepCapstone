// Middleware xử lý lỗi chung
function errorHandler(err, req, res, next) {
    console.error(err.stack); // In lỗi ra console để debug
  
    // Nếu lỗi có status, dùng status đó, nếu không mặc định 500
    const statusCode = err.status || 500;
  
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Lỗi máy chủ nội bộ',
      // Có thể thêm trường chi tiết lỗi khi dev (bỏ khi production)
      // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
  
  module.exports = errorHandler;
  