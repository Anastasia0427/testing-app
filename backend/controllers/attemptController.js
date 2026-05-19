const attemptService = require('../services/attemptService');

const getMyAssignments = async (req, res) => {
    const assignments = await attemptService.getStudentAssignments(req.user.user_id);
    res.json(assignments);
};

const startAttempt = async (req, res) => {
    const result = await attemptService.startAttempt(req.body.assignment_id, req.user.user_id);
    res.status(201).json(result);
};

const submitAttempt = async (req, res) => {
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers))
        return res.status(400).json({ error: 'Укажите ответы' });

    const studentName = req.user.name || req.user.email;
    const result = await attemptService.submitAttempt(
        req.params.id, req.user.user_id, studentName, answers
    );
    res.json(result);
};

const getAttempt = async (req, res) => {
    const attempt = await attemptService.getAttempt(req.params.id, req.user.user_id);
    res.json(attempt);
};

const reviewAttempt = async (req, res) => {
    const attempt = await attemptService.reviewAttempt(req.params.id, req.user.user_id);
    res.json(attempt);
};

const gradeAttempt = async (req, res) => {
    const { text_grades, comments } = req.body;
    if (!text_grades || typeof text_grades !== 'object')
        return res.status(400).json({ error: 'Укажите text_grades' });

    const result = await attemptService.gradeAttempt(
        req.params.id, req.user.user_id, text_grades, comments
    );
    res.json(result);
};

module.exports = { getMyAssignments, startAttempt, submitAttempt, getAttempt, reviewAttempt, gradeAttempt };
