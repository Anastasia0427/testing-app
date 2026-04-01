const { User, Role, Test, Question, AnswerOption, QuestionType } = require('../models');

const seedDemo = async () => {
    // находим роли
    const teacherRole = await Role.findOne({ where: { role: 'teacher' } });
    const studentRole = await Role.findOne({ where: { role: 'student' } });

    // создаём тестового учителя
    const [teacher] = await User.findOrCreate({
        where: { email: 'teacher@demo.com' },
        defaults: { password: 'demo1234', role_id: teacherRole.role_id }
    });

    // создаём тестового студента
    await User.findOrCreate({
        where: { email: 'student@demo.com' },
        defaults: { password: 'demo1234', role_id: studentRole.role_id }
    });

    // проверяем — тест уже есть?
    const existing = await Test.findOne({ where: { title: 'Основы SQL', created_by: teacher.user_id } });
    if (existing) {
        console.log('Demo-тест уже существует, пропускаем');
        return;
    }

    // создаём тест
    const test = await Test.create({
        title: 'Основы SQL',
        description: 'Базовые концепции языка SQL: запросы, фильтрация, агрегация.',
        created_by: teacher.user_id,
        max_attempts: 3,
        pass_score: 60,
        is_active: true,
        cover_image: '/images/default-cover.png'
    });

    // типы вопросов
    const singleType = await QuestionType.findOne({ where: { type: 'single_choice' } });
    const multiType  = await QuestionType.findOne({ where: { type: 'multiple_choice' } });
    const textType   = await QuestionType.findOne({ where: { type: 'text' } });

    // ── Вопрос 1: single_choice ──────────────────────────────
    const q1 = await Question.create({
        test_id: test.test_id,
        question_text: 'Какой оператор используется для выборки данных из таблицы?',
        question_type: singleType.type_id,
        points: 1
    });

    await AnswerOption.bulkCreate([
        { question_id: q1.question_id, option_text: 'SELECT', is_correct: true },
        { question_id: q1.question_id, option_text: 'INSERT', is_correct: false },
        { question_id: q1.question_id, option_text: 'UPDATE', is_correct: false },
        { question_id: q1.question_id, option_text: 'DELETE', is_correct: false }
    ]);

    // ── Вопрос 2: multiple_choice ────────────────────────────
    const q2 = await Question.create({
        test_id: test.test_id,
        question_text: 'Какие из перечисленных являются агрегатными функциями SQL? (выберите все верные)',
        question_type: multiType.type_id,
        points: 2
    });

    await AnswerOption.bulkCreate([
        { question_id: q2.question_id, option_text: 'COUNT()', is_correct: true },
        { question_id: q2.question_id, option_text: 'SUM()',   is_correct: true },
        { question_id: q2.question_id, option_text: 'AVG()',   is_correct: true },
        { question_id: q2.question_id, option_text: 'FETCH()', is_correct: false },
        { question_id: q2.question_id, option_text: 'FIND()',  is_correct: false }
    ]);

    // ── Вопрос 3: text ───────────────────────────────────────
    await Question.create({
        test_id: test.test_id,
        question_text: 'Напишите SQL-запрос, который выбирает все строки из таблицы "students".',
        question_type: textType.type_id,
        points: 3
    });

    console.log(`Demo-тест создан: "${test.title}" (teacher: teacher@demo.com / student: student@demo.com, пароль: demo1234)`);
};

module.exports = seedDemo;
