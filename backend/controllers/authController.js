const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

const generateToken = (user) => {
    return jwt.sign(
        { user_id: user.user_id, role_id: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

const register = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ error: 'Укажите email, пароль и роль' });
    }

    const roleRecord = await Role.findOne({ where: { role } });
    if (!roleRecord) {
        return res.status(400).json({ error: `Роль "${role}" не существует` });
    }

    if (roleRecord.role === 'admin') {
        return res.status(403).json({ error: 'Нельзя зарегистрироваться как admin' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const created = await User.create({ email, password, role_id: roleRecord.role_id });
    const user = await User.findByPk(created.user_id, { include: [{ association: 'role' }] });
    const token = generateToken(user);

    res.status(201).json({ token, user });
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Укажите email и пароль' });
    }

    const user = await User.findOne({ where: { email }, include: [{ association: 'role' }] });
    if (!user) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = generateToken(user);
    res.json({ token, user });
};

module.exports = { register, login };
