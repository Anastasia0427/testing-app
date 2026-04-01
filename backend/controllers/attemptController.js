const { Assignment, Attempt, Test, Question, AnswerOption, UserSelection } = require('../models');

// GET /api/attempts/assignments — назначенные студенту тесты
const getMyAssignments = async (req, res) => {
    const assignments = await Assignment.findAll({
        where: { student_id: req.user.user_id },
        include: [
            { association: 'test', attributes: ['test_id', 'title', 'description', 'time_limit', 'pass_score', 'max_attempts'] },
            { association: 'attempts', attributes: ['attempt_id', 'score', 'finished_at', 'started_at'] }
        ]
    });

    res.json(assignments);
};

// POST /api/attempts — начать попытку
const startAttempt = async (req, res) => {
    const { assignment_id } = req.body;

    const assignment = await Assignment.findOne({
        where: { asgn_id: assignment_id, student_id: req.user.user_id },
        include: [{ association: 'test' }]
    });

    if (!assignment) return res.status(404).json({ error: 'Назначение не найдено' });

    // проверяем лимит попыток
    if (assignment.test.max_attempts) {
        const attemptsCount = await Attempt.count({ where: { assignment_id } });
        if (attemptsCount >= assignment.test.max_attempts) {
            return res.status(403).json({ error: 'Превышено максимальное количество попыток' });
        }
    }

    // проверяем дедлайн
    if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
        return res.status(403).json({ error: 'Срок выполнения истёк' });
    }

    const attempt = await Attempt.create({ assignment_id });

    // возвращаем тест с вопросами (без правильных ответов!)
    const test = await Test.findByPk(assignment.test.test_id, {
        include: [{
            association: 'questions',
            include: [{
                association: 'options',
                attributes: ['option_id', 'option_text'] // is_correct не отдаём
            }, {
                association: 'type'
            }]
        }]
    });

    res.status(201).json({ attempt_id: attempt.attempt_id, test });
};

// POST /api/attempts/:id/submit — отправить ответы и получить результат
const submitAttempt = async (req, res) => {
    const attempt = await Attempt.findOne({
        where: { attempt_id: req.params.id },
        include: [{ association: 'assignment' }]
    });

    if (!attempt) return res.status(404).json({ error: 'Попытка не найдена' });
    if (attempt.assignment.student_id !== req.user.user_id) return res.status(403).json({ error: 'Доступ запрещён' });
    if (attempt.finished_at) return res.status(400).json({ error: 'Попытка уже завершена' });

    const { answers } = req.body; // [{ question_id, option_id?, answer_text? }]
    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Укажите ответы' });
    }

    // сохраняем ответы
    for (const answer of answers) {
        await UserSelection.upsert({
            attempt_id: attempt.attempt_id,
            question_id: answer.question_id,
            option_id: answer.option_id || null,
            answer_text: answer.answer_text || null
        });
    }

    // считаем баллы
    const questions = await Question.findAll({
        where: { test_id: attempt.assignment.test_id },
        include: [{ association: 'options' }]
    });

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of questions) {
        totalPoints += question.points || 1;

        const userAnswer = answers.find(a => a.question_id === question.question_id);
        if (!userAnswer) continue;

        if (userAnswer.option_id) {
            const option = question.options.find(o => o.option_id === userAnswer.option_id);
            if (option && option.is_correct) {
                earnedPoints += question.points || 1;
            }
        }
        // text-ответы пока не проверяются автоматически
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    await attempt.update({ score, finished_at: new Date() });

    res.json({
        score,
        earned_points: earnedPoints,
        total_points: totalPoints,
        finished_at: attempt.finished_at
    });
};

// GET /api/attempts/:id — результат попытки
const getAttempt = async (req, res) => {
    const attempt = await Attempt.findOne({
        where: { attempt_id: req.params.id },
        include: [
            {
                association: 'assignment',
                include: [{ association: 'test' }]
            },
            {
                association: 'selections',
                include: [{ association: 'question' }, { association: 'selected_option' }]
            }
        ]
    });

    if (!attempt) return res.status(404).json({ error: 'Попытка не найдена' });
    if (attempt.assignment.student_id !== req.user.user_id) return res.status(403).json({ error: 'Доступ запрещён' });

    res.json(attempt);
};

module.exports = { getMyAssignments, startAttempt, submitAttempt, getAttempt };
