const { User, Role } = require('../models');

// GET /api/users/students — список всех студентов
const getStudents = async (req, res) => {
    const studentRole = await Role.findOne({ where: { role: 'student' } });

    const students = await User.findAll({
        where: { role_id: studentRole.role_id },
        attributes: ['user_id', 'email', 'created_at']
    });

    res.json(students);
};

module.exports = { getStudents };
