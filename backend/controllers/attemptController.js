const { Assignment, Attempt, Test, Question, UserSelection, Notification } = require('../models');

// GET /api/attempts/assignments — назначенные студенту тесты
const getMyAssignments = async (req, res) => {
    const assignments = await Assignment.findAll({
        where: { student_id: req.user.user_id },
        include: [
            { association: 'test', attributes: ['test_id', 'title', 'description', 'time_limit', 'pass_score', 'max_attempts', 'cover_image'] },
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

    res.status(201).json({ attempt_id: attempt.attempt_id, started_at: attempt.started_at, test });
};

// POST /api/attempts/:id/submit — отправить ответы и получить результат
const submitAttempt = async (req, res) => {
    const attempt = await Attempt.findOne({
        where: { attempt_id: req.params.id },
        include: [{ association: 'assignment', include: [{ association: 'test', attributes: ['test_id', 'title', 'created_by'] }] }]
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
        include: [{ association: 'options' }, { association: 'type' }]
    });

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of questions) {
        // text-вопросы не участвуют в автоподсчёте
        if (question.type?.type === 'text') continue;

        totalPoints += question.points || 1;

        const userAnswer = answers.find(a => a.question_id === question.question_id);
        if (!userAnswer) continue;

        if (question.type?.type === 'multiple_choice' && userAnswer.answer_text) {
            let selectedIds = [];
            try { selectedIds = JSON.parse(userAnswer.answer_text); } catch { selectedIds = []; }

            const correctIds = question.options.filter(o => o.is_correct).map(o => o.option_id);
            const noWrongSelected = selectedIds.every(id => correctIds.includes(id));

            if (noWrongSelected && selectedIds.length > 0 && correctIds.length > 0) {
                const correctSelected = selectedIds.filter(id => correctIds.includes(id)).length;
                earnedPoints += (question.points || 1) * (correctSelected / correctIds.length);
            }
        } else if (userAnswer.option_id) {
            const option = question.options.find(o => o.option_id === userAnswer.option_id);
            if (option && option.is_correct) {
                earnedPoints += question.points || 1;
            }
        }
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : null;

    await attempt.update({ score, finished_at: new Date() });

    const test = attempt.assignment.test;
    const studentName = req.user.name || req.user.email;
    await Notification.create({
        user_id: test.created_by,
        type: 'attempt_submitted',
        message: `${studentName} сдал(а) тест «${test.title}»`,
        link: `/teacher/attempts/${attempt.attempt_id}/review`
    });

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
                include: [
                    { association: 'question', include: [{ association: 'type' }, { association: 'options' }] },
                    { association: 'selected_option' }
                ]
            }
        ]
    });

    if (!attempt) return res.status(404).json({ error: 'Попытка не найдена' });
    if (attempt.assignment.student_id !== req.user.user_id) return res.status(403).json({ error: 'Доступ запрещён' });

    res.json(attempt);
};

// POST /api/attempts/:id/grade — учитель выставляет оценки за текстовые вопросы
const gradeAttempt = async (req, res) => {
    const { text_grades, comments } = req.body;
    if (!text_grades || typeof text_grades !== 'object') {
        return res.status(400).json({ error: 'Укажите text_grades' });
    }

    const attempt = await Attempt.findOne({
        where: { attempt_id: req.params.id },
        include: [{
            association: 'assignment',
            include: [{ association: 'test', where: { created_by: req.user.user_id } }]
        }]
    });

    if (!attempt) return res.status(404).json({ error: 'Попытка не найдена или доступ запрещён' });
    if (!attempt.finished_at) return res.status(400).json({ error: 'Попытка ещё не завершена' });

    const questions = await Question.findAll({
        where: { test_id: attempt.assignment.test_id },
        include: [{ association: 'options' }, { association: 'type' }]
    });

    const selections = await UserSelection.findAll({ where: { attempt_id: attempt.attempt_id } });

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of questions) {
        const pts = question.points || 1;
        totalPoints += pts;

        const qType = question.type?.type;
        const userAnswer = selections.find(s => s.question_id === question.question_id);

        if (qType === 'text') {
            const g = text_grades[question.question_id];
            if (g === true) earnedPoints += pts;
            else if (g === 'partial') earnedPoints += pts * 0.5;
        } else if (qType === 'multiple_choice' && userAnswer?.answer_text) {
            let selectedIds = [];
            try { selectedIds = JSON.parse(userAnswer.answer_text); } catch { selectedIds = []; }
            const correctIds = question.options.filter(o => o.is_correct).map(o => o.option_id);
            const noWrong = selectedIds.every(id => correctIds.includes(id));
            if (noWrong && selectedIds.length > 0 && correctIds.length > 0) {
                const correctSelected = selectedIds.filter(id => correctIds.includes(id)).length;
                earnedPoints += pts * (correctSelected / correctIds.length);
            }
        } else if (qType === 'single_choice' && userAnswer?.option_id) {
            const opt = question.options.find(o => o.option_id === userAnswer.option_id);
            if (opt?.is_correct) earnedPoints += pts;
        }
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    await attempt.update({ score });

    if (comments && typeof comments === 'object') {
        for (const [questionId, comment] of Object.entries(comments)) {
            const sel = selections.find(s => s.question_id === Number(questionId));
            if (sel && comment?.trim()) {
                await sel.update({ teacher_comment: comment.trim() });
            }
        }
    }

    res.json({ score, earned_points: earnedPoints, total_points: totalPoints });
};

// GET /api/attempts/:id/review — просмотр попытки учителем
const reviewAttempt = async (req, res) => {
    const attempt = await Attempt.findOne({
        where: { attempt_id: req.params.id },
        include: [
            {
                association: 'assignment',
                include: [{
                    association: 'test',
                    where: { created_by: req.user.user_id },
                    include: [{ association: 'questions', include: [{ association: 'type' }, { association: 'options' }] }]
                }, {
                    association: 'student',
                    attributes: ['user_id', 'email', 'name']
                }]
            },
            {
                association: 'selections',
                include: [
                    { association: 'question', include: [{ association: 'type' }, { association: 'options' }] },
                    { association: 'selected_option' }
                ]
            }
        ]
    });

    if (!attempt) return res.status(404).json({ error: 'Попытка не найдена или доступ запрещён' });

    res.json(attempt);
};

module.exports = { getMyAssignments, startAttempt, submitAttempt, getAttempt, reviewAttempt, gradeAttempt };
