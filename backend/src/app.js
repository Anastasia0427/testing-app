const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));

// body parsing
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// статические файлы (картинки обложек)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===================== ROUTES =====================
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/tests', require('../routes/testRoutes'));
// app.use('/api/questions', require('../routes/questionRoutes'));
app.use('/api/assignments', require('../routes/assignmentRoutes'));
app.use('/api/attempts', require('../routes/attemptRoutes'));
app.use('/api/users', require('../routes/userRoutes'));

// ===================== ERROR HANDLING =====================
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    // Ошибки валидации Sequelize (например, неверный email, короткий пароль)
    if (err.name === 'SequelizeValidationError') {
        const messages = err.errors.map(e => e.message);
        return res.status(400).json({ error: messages.join(', ') });
    }

    // Нарушение уникальности (например, дублирующийся email)
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Запись с такими данными уже существует' });
    }

    // Нарушение внешнего ключа
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ error: 'Связанная запись не найдена' });
    }

    // Невалидный JWT
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Токен недействителен или истёк' });
    }

    // Ошибки загрузки файлов (multer)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Файл слишком большой. Максимум 5 МБ' });
    }
    if (err.message && err.message.includes('Допустимые форматы')) {
        return res.status(400).json({ error: err.message });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

/*
http.createServer(function(request, response){

    response.end("hello node.js!");

}).listen(3000, "127.0.0.1", function(){
    console.log("Сервер начал прослушивание запросов на порту 3000");
});
*/

module.exports = app;