const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/authMiddleware');
const { runQuery, checkAnswer, getSchemas, getSchemaInfo } = require('../controllers/sandboxController');

// Список схем — доступен всем авторизованным
router.get('/schemas', auth, asyncHandler(getSchemas));

// Запустить запрос — только учитель (для редактора эталонного запроса)
router.post('/run', auth, asyncHandler(runQuery));

// Проверить ответ студента
router.post('/check', auth, asyncHandler(checkAnswer));

// Структура таблиц схемы — для отображения студенту
router.get('/schema-info/:schema', auth, asyncHandler(getSchemaInfo));

module.exports = router;
