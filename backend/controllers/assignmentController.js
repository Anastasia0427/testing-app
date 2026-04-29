const { Assignment, Test, User, Role, Attempt, Notification } = require('../models');

// POST /api/assignments — назначить тест студенту
const createAssignment = async (req, res) => {
    const { student_id, test_id, deadline } = req.body;

    if (!student_id || !test_id) {
        return res.status(400).json({ error: 'Укажите student_id и test_id' });
    }

    // проверяем что тест принадлежит этому учителю
    const test = await Test.findOne({ where: { test_id, created_by: req.user.user_id } });
    if (!test) return res.status(404).json({ error: 'Тест не найден' });

    // проверяем что студент существует и является студентом
    const studentRole = await Role.findOne({ where: { role: 'student' } });
    const student = await User.findOne({ where: { user_id: student_id, role_id: studentRole.role_id } });
    if (!student) return res.status(404).json({ error: 'Студент не найден' });

    const existing = await Assignment.findOne({ where: { student_id, test_id } });
    if (existing) return res.status(409).json({ error: 'Тест уже назначен этому студенту' });

    const assignment = await Assignment.create({ student_id, test_id, deadline });

    await Notification.create({
        user_id: student_id,
        type: 'new_assignment',
        message: `Вам назначен тест «${test.title}»`,
        link: `/student/tests/${test_id}?asgn=${assignment.asgn_id}`
    });

    res.status(201).json(assignment);
};

// GET /api/assignments — все назначения по тестам учителя
const getAssignments = async (req, res) => {
    const tests = await Test.findAll({ where: { created_by: req.user.user_id } });
    const testIds = tests.map(t => t.test_id);

    const assignments = await Assignment.findAll({
        where: { test_id: testIds },
        include: [
            { association: 'student', attributes: ['user_id', 'email'] },
            { association: 'test', attributes: ['test_id', 'title'] },
            { association: 'attempts', attributes: ['attempt_id', 'score', 'finished_at'] }
        ]
    });

    res.json(assignments);
};

// DELETE /api/assignments/:id — снять назначение
const deleteAssignment = async (req, res) => {
    const tests = await Test.findAll({ where: { created_by: req.user.user_id } });
    const testIds = tests.map(t => t.test_id);

    const assignment = await Assignment.findOne({
        where: { asgn_id: req.params.id, test_id: testIds }
    });

    if (!assignment) return res.status(404).json({ error: 'Назначение не найдено' });

    await assignment.destroy();
    res.json({ message: 'Назначение удалено' });
};

module.exports = { createAssignment, getAssignments, deleteAssignment };
