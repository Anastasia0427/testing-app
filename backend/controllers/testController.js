const testService = require('../services/testService');

const getTests = async (req, res) => {
    const tests = await testService.getTestsByTeacher(req.user.user_id);
    res.json(tests);
};

const getTestById = async (req, res) => {
    const test = await testService.getTestById(req.params.id, req.user.user_id);
    res.json(test);
};

const createTest = async (req, res) => {
    const { title, description, max_attempts, pass_score, time_limit } = req.body;
    if (!title) return res.status(400).json({ error: 'Укажите название теста' });

    const test = await testService.createTest(
        { title, description, max_attempts, pass_score, time_limit },
        req.user.user_id,
        req.file?.filename
    );
    res.status(201).json(test);
};

const updateTest = async (req, res) => {
    const { title, description, max_attempts, pass_score, time_limit, is_active } = req.body;

    const test = await testService.updateTest(
        req.params.id,
        req.user.user_id,
        { title, description, max_attempts, pass_score, time_limit, is_active },
        req.file?.filename
    );
    res.json(test);
};

const deleteTest = async (req, res) => {
    await testService.deleteTest(req.params.id, req.user.user_id);
    res.json({ message: 'Тест удалён' });
};

const addQuestion = async (req, res) => {
    const { question_text, question_type, points, options } = req.body;
    if (!question_text || !question_type)
        return res.status(400).json({ error: 'Укажите текст и тип вопроса' });

    const question = await testService.addQuestion(
        req.params.id,
        req.user.user_id,
        { question_text, question_type, points, options }
    );
    res.status(201).json(question);
};

const deleteQuestion = async (req, res) => {
    await testService.deleteQuestion(req.params.testId, req.user.user_id, req.params.questionId);
    res.json({ message: 'Вопрос удалён' });
};

module.exports = { getTests, getTestById, createTest, updateTest, deleteTest, addQuestion, deleteQuestion };
