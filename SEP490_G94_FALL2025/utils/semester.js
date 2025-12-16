/**
 * Utility functions for semester management
 */

/**
 * Tính toán semester hiện tại dựa trên thời gian
 * @returns {string} Semester hiện tại (ví dụ: "Fall2025")
 */
function getCurrentSemester() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // Logic phân chia semester:
  // Fall: Tháng 8-12 (8, 9, 10, 11, 12)
  // Spring: Tháng 1-5 (1, 2, 3, 4, 5) 
  // Summer: Tháng 6-7 (6, 7)
  
  if (month >= 9 && month <= 12) {
    return `Fall${year}`;
  } else if (month >= 1 && month <= 4) {
    return `Spring${year}`;
  } else if (month >= 5 && month <= 8) {
    return `Summer${year}`;
  } 
  
  // Fallback - mặc định là Fall
  return `Fall${year}`;
}

/**
 * Lấy danh sách tất cả semester trong năm hiện tại
 * @returns {Array} Danh sách semester
 */
function getAllSemestersInCurrentYear() {
  const year = new Date().getFullYear();
  return [
    `Fall${year}`,
    `Spring${year}`,
    `Summer${year}`
  ];
}

/**
 * Kiểm tra xem semester có hợp lệ không
 * @param {string} semester 
 * @returns {boolean}
 */
function isValidSemester(semester) {
  return /^(Fall|Spring|Summer)\d{4}$/.test(semester);
}

/**
 * Lấy thông tin chi tiết về semester
 * @param {string} semester 
 * @returns {object} Thông tin semester
 */
function getSemesterInfo(semester) {
  if (!isValidSemester(semester)) {
    return null;
  }
  
  const match = semester.match(/^(Fall|Spring|Summer)(\d{4})$/);
  const season = match[1];
  const year = parseInt(match[2]);
  
  const seasonNames = {
    'Fall': 'Học kì Thu',
    'Spring': 'Học kì Xuân', 
    'Summer': 'Học kì Hè'
  };
  
  return {
    semester,
    season,
    year,
    displayName: `${seasonNames[season]} ${year}`,
    seasonName: seasonNames[season]
  };
}

module.exports = {
  getCurrentSemester,
  getAllSemestersInCurrentYear,
  isValidSemester,
  getSemesterInfo
};
