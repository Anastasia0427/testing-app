const { User, Role } = require('../models');
const AppError = require('../utils/AppError');

const getStudents = async () => {
    const studentRole = await Role.findOne({ where: { role: 'student' } });
    return User.findAll({
        where: { role_id: studentRole.role_id },
        attributes: ['user_id', 'email', 'name', 'created_at']
    });
};

const updateProfile = async (userId, name) => {
    const user = await User.findByPk(userId, { include: [{ association: 'role' }] });
    if (!user) throw new AppError('Пользователь не найден', 404);
    await user.update({ name: name?.trim() || null });
    return user;
};

module.exports = { getStudents, updateProfile };
