const { ROLES } = require('../config/role.js');

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Chưa xác thực' });
        }
        const userRole = req.user.role; // bitmask
        console.log(userRole);
        // Chuyển allowedRoles thành bitmask tổng hợp
        let requiredRoles = 0;
        for (const role of allowedRoles) {
            if (typeof role === 'number') {
                requiredRoles |= role;
            } else if (typeof role === 'string' && ROLES[role] !== undefined) {
                requiredRoles |= ROLES[role];
            }
        }
        // ADMIN_DEVELOPER (bitmask 0) có toàn quyền
        if (userRole === ROLES.ADMIN_DEVELOPER) {
            return next();
        }
        if ((userRole & requiredRoles) === 0) {
            return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
        }
        next();
    };
}

module.exports = authorizeRoles;
  