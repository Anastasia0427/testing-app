const sandboxService = require('../services/sandboxService');
const { Question } = require('../models');
const AppError = require('../utils/AppError');

// POST /api/sandbox/run — выполнить произвольный запрос (для редактора)
const runQuery = async (req, res) => {
    const { sql, schema } = req.body;
    if (!sql?.trim()) return res.status(400).json({ error: 'Укажите SQL-запрос' });
    if (!schema)      return res.status(400).json({ error: 'Укажите схему' });

    const result = await sandboxService.runQuery(sql, schema);
    res.json(result);
};

// POST /api/sandbox/check — проверить ответ студента
// Принимает question_id; reference_sql/schema_name читаются из БД — клиент их не знает
const checkAnswer = async (req, res) => {
    const { sql, question_id } = req.body;
    if (!sql?.trim())  return res.status(400).json({ error: 'Укажите SQL-запрос' });
    if (!question_id)  return res.status(400).json({ error: 'Укажите question_id' });

    const question = await Question.findByPk(question_id, {
        attributes: ['reference_sql', 'schema_name', 'question_type'],
        include: [{ association: 'type', attributes: ['type'] }],
    });

    if (!question || question.type?.type !== 'sql_code')
        throw new AppError('Вопрос не найден или не является SQL-заданием', 400);
    if (!question.reference_sql || !question.schema_name)
        throw new AppError('Вопрос настроен некорректно — обратитесь к преподавателю', 400);

    const result = await sandboxService.runAndCompare(sql, question.reference_sql, question.schema_name);
    res.json(result);
};

// GET /api/sandbox/schemas — список доступных схем
const getSchemas = async (_req, res) => {
    res.json(sandboxService.ALLOWED_SCHEMAS);
};

// GET /api/sandbox/schema-info/:schema — структура таблиц схемы
const getSchemaInfo = async (req, res) => {
    const info = await sandboxService.getSchemaInfo(req.params.schema);
    res.json(info);
};

module.exports = { runQuery, checkAnswer, getSchemas, getSchemaInfo };
