const fs = require('fs');
const path = require('path');
const { Test, Question, AnswerOption, QuestionType } = require('../models');

const deleteFile = (filePath) => {
    if (!filePath) return;
    const abs = path.join(__dirname, '../public', filePath);
    fs.unlink(abs, () => {}); // молча игнорируем если файл уже удалён
};

// GET /api/tests — все тесты учителя
const getTests = async (req, res) => {
    const tests = await Test.findAll({
        where: { created_by: req.user.user_id },
        order: [['created_at', 'DESC']]
    });
    res.json(tests);
};

// GET /api/tests/:id — один тест с вопросами и вариантами
const getTestById = async (req, res) => {
    const test = await Test.findOne({
        where: { test_id: req.params.id, created_by: req.user.user_id },
        include: [{
            association: 'questions',
            include: [{ association: 'options' }, { association: 'type' }]
        }]
    });

    if (!test) return res.status(404).json({ error: 'Тест не найден' });

    res.json(test);
};

// POST /api/tests — создать тест
const createTest = async (req, res) => {
    const { title, description, max_attempts, pass_score, time_limit } = req.body;

    if (!title) return res.status(400).json({ error: 'Укажите название теста' });

    const cover_image = req.file ? `/uploads/covers/${req.file.filename}` : '/images/default-cover.png';

    const test = await Test.create({
        title,
        description,
        max_attempts,
        pass_score,
        time_limit,
        cover_image,
        created_by: req.user.user_id
    });

    res.status(201).json(test);
};

// PUT /api/tests/:id — обновить тест
const updateTest = async (req, res) => {
    const test = await Test.findOne({
        where: { test_id: req.params.id, created_by: req.user.user_id }
    });

    if (!test) return res.status(404).json({ error: 'Тест не найден' });

    const { title, description, max_attempts, pass_score, time_limit, is_active } = req.body;

    if (req.file) {
        deleteFile(test.cover_image); // удаляем старую картинку
        test.cover_image = `/uploads/covers/${req.file.filename}`;
    }

    await test.update({ title, description, max_attempts, pass_score, time_limit, is_active, cover_image: test.cover_image });

    res.json(test);
};

// DELETE /api/tests/:id — удалить тест
const deleteTest = async (req, res) => {
    const test = await Test.findOne({
        where: { test_id: req.params.id, created_by: req.user.user_id }
    });

    if (!test) return res.status(404).json({ error: 'Тест не найден' });

    deleteFile(test.cover_image);
    await test.destroy();
    res.json({ message: 'Тест удалён' });
};

// POST /api/tests/:id/questions — добавить вопрос с вариантами
const addQuestion = async (req, res) => {
    const test = await Test.findOne({
        where: { test_id: req.params.id, created_by: req.user.user_id }
    });

    if (!test) return res.status(404).json({ error: 'Тест не найден' });

    const { question_text, question_type, points, options } = req.body;

    if (!question_text || !question_type) {
        return res.status(400).json({ error: 'Укажите текст и тип вопроса' });
    }

    const typeRecord = await QuestionType.findOne({ where: { type: question_type } });
    if (!typeRecord) return res.status(400).json({ error: `Тип вопроса "${question_type}" не существует` });

    const question = await Question.create({
        test_id: test.test_id,
        question_text,
        question_type: typeRecord.type_id,
        points: points || 1
    });

    if (options && options.length > 0) {
        const optionRecords = options.map(opt => ({
            question_id: question.question_id,
            option_text: opt.text,
            is_correct: opt.is_correct || false
        }));
        await AnswerOption.bulkCreate(optionRecords);
    }

    const result = await Question.findByPk(question.question_id, {
        include: [{ association: 'options' }, { association: 'type' }]
    });

    res.status(201).json(result);
};

// DELETE /api/tests/:testId/questions/:questionId — удалить вопрос
const deleteQuestion = async (req, res) => {
    const test = await Test.findOne({
        where: { test_id: req.params.testId, created_by: req.user.user_id }
    });

    if (!test) return res.status(404).json({ error: 'Тест не найден' });

    const question = await Question.findOne({
        where: { question_id: req.params.questionId, test_id: test.test_id }
    });

    if (!question) return res.status(404).json({ error: 'Вопрос не найден' });

    await question.destroy();
    res.json({ message: 'Вопрос удалён' });
};

module.exports = { getTests, getTestById, createTest, updateTest, deleteTest, addQuestion, deleteQuestion };
