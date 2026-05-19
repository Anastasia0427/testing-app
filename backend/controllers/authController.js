const authService = require('../services/authService');

const register = async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role)
        return res.status(400).json({ error: 'Укажите email, пароль и роль' });

    const result = await authService.register(email, password, role);
    res.status(201).json(result);
};

const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Укажите email и пароль' });

    const result = await authService.login(email, password);
    res.json(result);
};

module.exports = { register, login };
