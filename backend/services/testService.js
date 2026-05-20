const fs = require('fs');
const path = require('path');
const { Test, Question, AnswerOption, QuestionType } = require('../models');
const AppError = require('../utils/AppError');

const deleteFile = (filePath) => {
    if (!filePath || !filePath.startsWith('/uploads/')) return;
    const abs = path.join(__dirname, '../public', filePath);
    fs.unlink(abs, () => {});
};

const getTestsByTeacher = (userId) =>
    Test.findAll({ where: { created_by: userId }, order: [['created_at', 'DESC']] });

const getTestById = async (testId, userId) => {
    const test = await Test.findOne({
        where: { test_id: testId, created_by: userId },
        include: [{
            association: 'questions',
            include: [{ association: 'options' }, { association: 'type' }]
        }]
    });
    if (!test) throw new AppError('Тест не найден', 404);
    return test;
};

const createTest = (data, userId, coverFilename) => {
    const cover_image = coverFilename
        ? `/uploads/covers/${coverFilename}`
        : '/images/default-cover.png';
    return Test.create({ ...data, cover_image, created_by: userId });
};

const updateTest = async (testId, userId, data, newCoverFilename) => {
    const test = await Test.findOne({ where: { test_id: testId, created_by: userId } });
    if (!test) throw new AppError('Тест не найден', 404);

    if (newCoverFilename) {
        deleteFile(test.cover_image);
        data.cover_image = `/uploads/covers/${newCoverFilename}`;
    }

    await test.update(data);
    return test;
};

const deleteTest = async (testId, userId) => {
    const test = await Test.findOne({ where: { test_id: testId, created_by: userId } });
    if (!test) throw new AppError('Тест не найден', 404);
    deleteFile(test.cover_image);
    await test.destroy();
};

const addQuestion = async (testId, userId, { question_text, question_type, points, options, reference_sql, schema_name }) => {
    const test = await Test.findOne({ where: { test_id: testId, created_by: userId } });
    if (!test) throw new AppError('Тест не найден', 404);

    const typeRecord = await QuestionType.findOne({ where: { type: question_type } });
    if (!typeRecord) throw new AppError(`Тип вопроса "${question_type}" не существует`, 400);

    const question = await Question.create({
        test_id: test.test_id,
        question_text,
        question_type: typeRecord.type_id,
        points: points || 1,
        ...(question_type === 'sql_code' ? { reference_sql, schema_name } : {}),
    });

    if (question_type !== 'sql_code' && options?.length > 0) {
        await AnswerOption.bulkCreate(
            options.map(opt => ({
                question_id: question.question_id,
                option_text: opt.text,
                is_correct: opt.is_correct || false
            }))
        );
    }

    return Question.findByPk(question.question_id, {
        include: [{ association: 'options' }, { association: 'type' }]
    });
};

const deleteQuestion = async (testId, userId, questionId) => {
    const test = await Test.findOne({ where: { test_id: testId, created_by: userId } });
    if (!test) throw new AppError('Тест не найден', 404);

    const question = await Question.findOne({
        where: { question_id: questionId, test_id: test.test_id }
    });
    if (!question) throw new AppError('Вопрос не найден', 404);

    await question.destroy();
};

module.exports = {
    getTestsByTeacher, getTestById, createTest, updateTest,
    deleteTest, addQuestion, deleteQuestion
};
