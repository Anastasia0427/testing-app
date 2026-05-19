const { Assignment, Test, User, Role, Notification } = require('../models');
const AppError = require('../utils/AppError');

const createAssignment = async (studentId, testId, deadline, teacherId) => {
    const test = await Test.findOne({ where: { test_id: testId, created_by: teacherId } });
    if (!test) throw new AppError('Тест не найден', 404);

    const studentRole = await Role.findOne({ where: { role: 'student' } });
    const student = await User.findOne({ where: { user_id: studentId, role_id: studentRole.role_id } });
    if (!student) throw new AppError('Студент не найден', 404);

    const existing = await Assignment.findOne({ where: { student_id: studentId, test_id: testId } });
    if (existing) throw new AppError('Тест уже назначен этому студенту', 409);

    const assignment = await Assignment.create({ student_id: studentId, test_id: testId, deadline });

    await Notification.create({
        user_id: studentId,
        type: 'new_assignment',
        message: `Вам назначен тест «${test.title}»`,
        link: `/student/tests/${testId}?asgn=${assignment.asgn_id}`
    });

    return assignment;
};

const getAssignmentsByTeacher = async (teacherId) => {
    const tests = await Test.findAll({ where: { created_by: teacherId } });
    const testIds = tests.map(t => t.test_id);

    return Assignment.findAll({
        where: { test_id: testIds },
        include: [
            { association: 'student', attributes: ['user_id', 'email'] },
            { association: 'test', attributes: ['test_id', 'title'] },
            { association: 'attempts', attributes: ['attempt_id', 'score', 'finished_at'] }
        ]
    });
};

const deleteAssignment = async (assignmentId, teacherId) => {
    const tests = await Test.findAll({ where: { created_by: teacherId } });
    const testIds = tests.map(t => t.test_id);

    const assignment = await Assignment.findOne({
        where: { asgn_id: assignmentId, test_id: testIds }
    });
    if (!assignment) throw new AppError('Назначение не найдено', 404);

    await assignment.destroy();
};

module.exports = { createAssignment, getAssignmentsByTeacher, deleteAssignment };
