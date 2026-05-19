const assignmentService = require('../services/assignmentService');

const createAssignment = async (req, res) => {
    const { student_id, test_id, deadline } = req.body;
    if (!student_id || !test_id)
        return res.status(400).json({ error: 'Укажите student_id и test_id' });

    const assignment = await assignmentService.createAssignment(
        student_id, test_id, deadline, req.user.user_id
    );
    res.status(201).json(assignment);
};

const getAssignments = async (req, res) => {
    const assignments = await assignmentService.getAssignmentsByTeacher(req.user.user_id);
    res.json(assignments);
};

const deleteAssignment = async (req, res) => {
    await assignmentService.deleteAssignment(req.params.id, req.user.user_id);
    res.json({ message: 'Назначение удалено' });
};

module.exports = { createAssignment, getAssignments, deleteAssignment };
