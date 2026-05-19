const { Assignment, Attempt, Test, Question, UserSelection, Notification } = require('../models');
const AppError = require('../utils/AppError');

// ─── private: score calculation ───────────────────────────────────────────────

const calcAutoScore = (questions, answers) => {
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of questions) {
        if (question.type?.type === 'text') continue;

        const pts = question.points || 1;
        totalPoints += pts;

        const userAnswer = answers.find(a => a.question_id === question.question_id);
        if (!userAnswer) continue;

        if (question.type?.type === 'multiple_choice' && userAnswer.answer_text) {
            let selectedIds = [];
            try { selectedIds = JSON.parse(userAnswer.answer_text); } catch { selectedIds = []; }

            const correctIds = question.options.filter(o => o.is_correct).map(o => o.option_id);
            const noWrong = selectedIds.every(id => correctIds.includes(id));

            if (noWrong && selectedIds.length > 0 && correctIds.length > 0) {
                const correctSelected = selectedIds.filter(id => correctIds.includes(id)).length;
                earnedPoints += pts * (correctSelected / correctIds.length);
            }
        } else if (userAnswer.option_id) {
            const option = question.options.find(o => o.option_id === userAnswer.option_id);
            if (option?.is_correct) earnedPoints += pts;
        }
    }

    return { totalPoints, earnedPoints };
};

const calcGradedScore = (questions, selections, textGrades) => {
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of questions) {
        const pts = question.points || 1;
        totalPoints += pts;

        const qType = question.type?.type;
        const userAnswer = selections.find(s => s.question_id === question.question_id);

        if (qType === 'text') {
            const g = textGrades[question.question_id];
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

    return { totalPoints, earnedPoints };
};

// ─── public service methods ───────────────────────────────────────────────────

const getStudentAssignments = (studentId) =>
    Assignment.findAll({
        where: { student_id: studentId },
        include: [
            {
                association: 'test',
                attributes: ['test_id', 'title', 'description', 'time_limit', 'pass_score', 'max_attempts', 'cover_image']
            },
            {
                association: 'attempts',
                attributes: ['attempt_id', 'score', 'finished_at', 'started_at']
            }
        ]
    });

const startAttempt = async (assignmentId, studentId) => {
    const assignment = await Assignment.findOne({
        where: { asgn_id: assignmentId, student_id: studentId },
        include: [{ association: 'test' }]
    });

    if (!assignment) throw new AppError('Назначение не найдено', 404);

    if (assignment.test.max_attempts) {
        const count = await Attempt.count({ where: { assignment_id: assignmentId } });
        if (count >= assignment.test.max_attempts)
            throw new AppError('Превышено максимальное количество попыток', 403);
    }

    if (assignment.deadline && new Date() > new Date(assignment.deadline))
        throw new AppError('Срок выполнения истёк', 403);

    const attempt = await Attempt.create({ assignment_id: assignmentId });

    const test = await Test.findByPk(assignment.test.test_id, {
        include: [{
            association: 'questions',
            include: [
                { association: 'options', attributes: ['option_id', 'option_text'] },
                { association: 'type' }
            ]
        }]
    });

    return { attempt_id: attempt.attempt_id, started_at: attempt.started_at, test };
};

const submitAttempt = async (attemptId, studentId, studentName, answers) => {
    const attempt = await Attempt.findOne({
        where: { attempt_id: attemptId },
        include: [{
            association: 'assignment',
            include: [{ association: 'test', attributes: ['test_id', 'title', 'created_by'] }]
        }]
    });

    if (!attempt) throw new AppError('Попытка не найдена', 404);
    if (attempt.assignment.student_id !== studentId) throw new AppError('Доступ запрещён', 403);
    if (attempt.finished_at) throw new AppError('Попытка уже завершена', 400);

    for (const answer of answers) {
        await UserSelection.upsert({
            attempt_id: attempt.attempt_id,
            question_id: answer.question_id,
            option_id: answer.option_id || null,
            answer_text: answer.answer_text || null
        });
    }

    const questions = await Question.findAll({
        where: { test_id: attempt.assignment.test_id },
        include: [{ association: 'options' }, { association: 'type' }]
    });

    const { totalPoints, earnedPoints } = calcAutoScore(questions, answers);
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : null;

    await attempt.update({ score, finished_at: new Date() });

    const { test } = attempt.assignment;
    await Notification.create({
        user_id: test.created_by,
        type: 'attempt_submitted',
        message: `${studentName} сдал(а) тест «${test.title}»`,
        link: `/teacher/attempts/${attempt.attempt_id}/review`
    });

    return { score, earned_points: earnedPoints, total_points: totalPoints, finished_at: attempt.finished_at };
};

const getAttempt = async (attemptId, studentId) => {
    const attempt = await Attempt.findOne({
        where: { attempt_id: attemptId },
        include: [
            { association: 'assignment', include: [{ association: 'test' }] },
            {
                association: 'selections',
                include: [
                    { association: 'question', include: [{ association: 'type' }, { association: 'options' }] },
                    { association: 'selected_option' }
                ]
            }
        ]
    });

    if (!attempt) throw new AppError('Попытка не найдена', 404);
    if (attempt.assignment.student_id !== studentId) throw new AppError('Доступ запрещён', 403);

    return attempt;
};

const reviewAttempt = async (attemptId, teacherId) => {
    const attempt = await Attempt.findOne({
        where: { attempt_id: attemptId },
        include: [
            {
                association: 'assignment',
                include: [
                    {
                        association: 'test',
                        where: { created_by: teacherId },
                        include: [{
                            association: 'questions',
                            include: [{ association: 'type' }, { association: 'options' }]
                        }]
                    },
                    { association: 'student', attributes: ['user_id', 'email', 'name'] }
                ]
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

    if (!attempt) throw new AppError('Попытка не найдена или доступ запрещён', 404);
    return attempt;
};

const gradeAttempt = async (attemptId, teacherId, textGrades, comments) => {
    const attempt = await Attempt.findOne({
        where: { attempt_id: attemptId },
        include: [{
            association: 'assignment',
            include: [{ association: 'test', where: { created_by: teacherId } }]
        }]
    });

    if (!attempt) throw new AppError('Попытка не найдена или доступ запрещён', 404);
    if (!attempt.finished_at) throw new AppError('Попытка ещё не завершена', 400);

    const questions = await Question.findAll({
        where: { test_id: attempt.assignment.test_id },
        include: [{ association: 'options' }, { association: 'type' }]
    });

    const selections = await UserSelection.findAll({ where: { attempt_id: attempt.attempt_id } });
    const { totalPoints, earnedPoints } = calcGradedScore(questions, selections, textGrades);
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    await attempt.update({ score });

    if (comments && typeof comments === 'object') {
        for (const [questionId, comment] of Object.entries(comments)) {
            const sel = selections.find(s => s.question_id === Number(questionId));
            if (sel && comment?.trim()) await sel.update({ teacher_comment: comment.trim() });
        }
    }

    return { score, earned_points: earnedPoints, total_points: totalPoints };
};

module.exports = {
    getStudentAssignments, startAttempt, submitAttempt,
    getAttempt, reviewAttempt, gradeAttempt
};
