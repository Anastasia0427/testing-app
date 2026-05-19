const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const AppError = require('../utils/AppError');

const generateToken = (user) =>
    jwt.sign(
        { user_id: user.user_id, role_id: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

const register = async (email, password, role) => {
    const roleRecord = await Role.findOne({ where: { role } });
    if (!roleRecord) throw new AppError(`Роль "${role}" не существует`, 400);
    if (roleRecord.role === 'admin') throw new AppError('Нельзя зарегистрироваться как admin', 403);

    const existing = await User.findOne({ where: { email } });
    if (existing) throw new AppError('Пользователь с таким email уже существует', 409);

    const created = await User.create({ email, password, role_id: roleRecord.role_id });
    const user = await User.findByPk(created.user_id, { include: [{ association: 'role' }] });

    return { token: generateToken(user), user };
};

const login = async (email, password) => {
    const user = await User.findOne({ where: { email }, include: [{ association: 'role' }] });
    if (!user) throw new AppError('Неверный email или пароль', 401);

    const valid = await user.comparePassword(password);
    if (!valid) throw new AppError('Неверный email или пароль', 401);

    return { token: generateToken(user), user };
};

module.exports = { register, login };
