const svc = require('../services/schemaManagerService');

const list = async (req, res) => {
    const schemas = await svc.listSchemas(req.user.user_id);
    res.json(schemas);
};

const update = async (req, res) => {
    const { display_name, ddl } = req.body;
    const schema = await svc.updateSchema(req.params.id, req.user.user_id, { display_name, ddl });
    res.json(schema);
};

const preview = async (req, res) => {
    const { ddl } = req.body;
    if (!ddl?.trim()) return res.status(400).json({ error: 'Укажите DDL' });
    const tables = await svc.previewDdl(ddl, req.user.user_id);
    res.json(tables);
};

const create = async (req, res) => {
    const { display_name, ddl } = req.body;
    const schema = await svc.createSchema(req.user.user_id, display_name, ddl);
    res.status(201).json(schema);
};

const remove = async (req, res) => {
    await svc.deleteSchema(req.params.id, req.user.user_id);
    res.json({ message: 'Схема удалена' });
};

module.exports = { list, preview, create, update, remove };
