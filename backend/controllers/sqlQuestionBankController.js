const svc = require('../services/sqlQuestionBankService');

const getAll = async (_req, res) => {
    res.json(await svc.getAll());
};

const getById = async (req, res) => {
    res.json(await svc.getById(req.params.id));
};

const create = async (req, res) => {
    const { title, question_text, reference_sql, schema_name } = req.body;
    if (!title || !question_text || !reference_sql || !schema_name)
        return res.status(400).json({ error: 'Заполните все поля' });

    const q = await svc.create({ title, question_text, reference_sql, schema_name }, req.user.user_id);
    res.status(201).json(q);
};

const update = async (req, res) => {
    const { title, question_text, reference_sql, schema_name } = req.body;
    const q = await svc.update(req.params.id, req.user.user_id, { title, question_text, reference_sql, schema_name });
    res.json(q);
};

const remove = async (req, res) => {
    await svc.remove(req.params.id, req.user.user_id);
    res.json({ message: 'Вопрос удалён' });
};

module.exports = { getAll, getById, create, update, remove };
