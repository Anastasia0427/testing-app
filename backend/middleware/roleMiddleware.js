const { Role } = require('../models');

const roleMiddleware = (...allowedRoles) => {
    return async (req, res, next) => {
        const role = await Role.findByPk(req.user.role_id);

        if (!role || !allowedRoles.includes(role.role)) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        req.role = role.role;
        next();
    };
};

module.exports = roleMiddleware;
