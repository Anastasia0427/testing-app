const { SqlQuestion } = require('../models');
const AppError = require('../utils/AppError');

const authorInclude = { association: 'author', attributes: ['user_id', 'name', 'email'] };

const getAll = () =>
    SqlQuestion.findAll({
        include: [authorInclude],
        order: [['created_at', 'DESC']],
    });

const getById = async (id) => {
    const q = await SqlQuestion.findByPk(id, { include: [authorInclude] });
    if (!q) throw new AppError('Вопрос не найден', 404);
    return q;
};

const create = (data, authorId) =>
    SqlQuestion.create({ ...data, author_id: authorId });

const update = async (id, authorId, data) => {
    const q = await SqlQuestion.findOne({ where: { sq_id: id, author_id: authorId } });
    if (!q) throw new AppError('Вопрос не найден или доступ запрещён', 404);
    await q.update(data);
    return q;
};

const remove = async (id, authorId) => {
    const q = await SqlQuestion.findOne({ where: { sq_id: id, author_id: authorId } });
    if (!q) throw new AppError('Вопрос не найден или доступ запрещён', 404);
    await q.destroy();
};

module.exports = { getAll, getById, create, update, remove };
