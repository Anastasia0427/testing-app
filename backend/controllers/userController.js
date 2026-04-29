const { User, Role } = require('../models');

// GET /api/users/students — список всех студентов
const getStudents = async (req, res) => {
    const studentRole = await Role.findOne({ where: { role: 'student' } });

    const students = await User.findAll({
        where: { role_id: studentRole.role_id },
        attributes: ['user_id', 'email', 'name', 'created_at']
    });

    res.json(students);
};

// PUT /api/users/profile — обновить своё имя
const updateProfile = async (req, res) => {
    const { name } = req.body;

    const user = await User.findByPk(req.user.user_id, {
        include: [{ association: 'role' }]
    });

    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    await user.update({ name: name?.trim() || null });

    res.json(user);
};

module.exports = { getStudents, updateProfile };
