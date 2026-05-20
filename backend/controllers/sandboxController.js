const sandboxService = require('../services/sandboxService');
const { Question, SandboxSchema, Role } = require('../models');
const AppError = require('../utils/AppError');
const { BUILTIN_SCHEMAS } = require('../services/schemaManagerService');

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

const BUILTIN_DISPLAY = { books: 'Книги', hr: 'HR' };

// GET /api/sandbox/schemas — встроенные схемы + собственные схемы учителя
const getSchemas = async (req, res) => {
    const builtin = BUILTIN_SCHEMAS.map(key => ({ key, display_name: BUILTIN_DISPLAY[key] ?? key, builtin: true }));

    const roleRecord = await Role.findByPk(req.user.role_id);
    if (roleRecord?.role === 'teacher' || roleRecord?.role === 'admin') {
        const own = await SandboxSchema.findAll({
            where: { owner_id: req.user.user_id },
            attributes: ['schema_key', 'display_name'],
        });
        const custom = own.map(s => ({ key: s.schema_key, display_name: s.display_name, builtin: false }));
        return res.json([...builtin, ...custom]);
    }

    res.json(builtin);
};

// GET /api/sandbox/schema-info/:schema — структура таблиц схемы
const getSchemaInfo = async (req, res) => {
    const info = await sandboxService.getSchemaInfo(req.params.schema);
    res.json(info);
};

module.exports = { runQuery, checkAnswer, getSchemas, getSchemaInfo };
