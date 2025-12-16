const ROLES = {
    ADMIN_DEVELOPER: 0, //0 - Toàn quyền
    STUDENT: 1 << 0, //1 - Sinh viên bình thường (chỉ xem)
    SUPERVISOR: 1 << 2, //4 - Giảng viên hướng dẫn
    ADMIN: 1 << 3, //8 - Quản trị viên
}
module.exports = { ROLES };