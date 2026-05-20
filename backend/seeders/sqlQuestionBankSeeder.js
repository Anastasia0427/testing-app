const { SqlQuestion, User, Role } = require('../models');

// search_path будет выставлен в sandboxService, поэтому в запросах нет префикса схемы

const BOOKS = [
    {
        title: 'Книги дороже 500 ₽',
        question_text: 'Выведите название и цену всех книг, цена которых превышает 500 рублей. Отсортируйте по убыванию цены.',
        reference_sql:
`SELECT title, price
FROM books
WHERE price > 500
ORDER BY price DESC`,
    },
    {
        title: 'Три самые длинные книги',
        question_text: 'Найдите три книги с наибольшим количеством страниц. Выведите название, автора и число страниц.',
        reference_sql:
`SELECT b.title, a.name AS author, b.pages
FROM books b
JOIN authors a ON b.author_id = a.author_id
ORDER BY b.pages DESC
LIMIT 3`,
    },
    {
        title: 'Книги по жанру «Детектив»',
        question_text: 'Выведите названия и год издания всех книг жанра «Детектив». Отсортируйте по году.',
        reference_sql:
`SELECT b.title, b.year
FROM books b
JOIN genres g ON b.genre_id = g.genre_id
WHERE g.name = 'Детектив'
ORDER BY b.year`,
    },
    {
        title: 'Количество книг у каждого автора',
        question_text: 'Подсчитайте, сколько книг написал каждый автор. Выведите имя автора и количество книг, отсортируйте по убыванию.',
        reference_sql:
`SELECT a.name, COUNT(b.book_id) AS book_count
FROM authors a
LEFT JOIN books b ON a.author_id = b.author_id
GROUP BY a.name
ORDER BY book_count DESC`,
    },
    {
        title: 'Средняя цена книг по жанрам',
        question_text: 'Найдите среднюю цену книг в каждом жанре. Выведите название жанра и среднюю цену, округлённую до 2 знаков. Отсортируйте по убыванию средней цены.',
        reference_sql:
`SELECT g.name AS genre, ROUND(AVG(b.price), 2) AS avg_price
FROM genres g
JOIN books b ON g.genre_id = b.genre_id
GROUP BY g.name
ORDER BY avg_price DESC`,
    },
    {
        title: 'Авторы с высокой средней ценой книг',
        question_text: 'Найдите авторов, у которых средняя цена книг выше общей средней цены по всем книгам. Выведите имя автора и его среднюю цену.',
        reference_sql:
`SELECT a.name, ROUND(AVG(b.price), 2) AS avg_price
FROM authors a
JOIN books b ON a.author_id = b.author_id
GROUP BY a.name
HAVING AVG(b.price) > (SELECT AVG(price) FROM books)
ORDER BY avg_price DESC`,
    },
    {
        title: 'Самая дорогая книга в каждом жанре',
        question_text: 'Для каждого жанра найдите самую дорогую книгу. Выведите жанр, название книги и цену. Используйте оконную функцию.',
        reference_sql:
`SELECT genre, title, price
FROM (
    SELECT g.name AS genre, b.title, b.price,
           RANK() OVER (PARTITION BY g.genre_id ORDER BY b.price DESC) AS rnk
    FROM books b
    JOIN genres g ON b.genre_id = g.genre_id
) t
WHERE rnk = 1
ORDER BY price DESC`,
    },
    {
        title: 'Порядковый номер книги у автора',
        question_text: 'Пронумеруйте книги каждого автора по году издания (от старейшей к новейшей). Выведите имя автора, название книги, год и порядковый номер.',
        reference_sql:
`SELECT a.name AS author, b.title, b.year,
       ROW_NUMBER() OVER (PARTITION BY b.author_id ORDER BY b.year) AS book_num
FROM books b
JOIN authors a ON b.author_id = a.author_id
ORDER BY a.name, b.year`,
    },
    {
        title: 'Накопительная сумма цен книг',
        question_text: 'Выведите книги в порядке убывания цены. Для каждой книги вычислите накопительную сумму цен (running total) от самой дорогой к самой дешёвой.',
        reference_sql:
`SELECT title, price,
       SUM(price) OVER (ORDER BY price DESC) AS running_total
FROM books
ORDER BY price DESC`,
    },
    {
        title: 'Отклонение цены от средней по жанру',
        question_text: 'Для каждой книги вычислите отклонение её цены от средней цены в её жанре. Выведите название книги, жанр, цену и отклонение (округлить до 2 знаков).',
        reference_sql:
`SELECT b.title, g.name AS genre, b.price,
       ROUND(b.price - AVG(b.price) OVER (PARTITION BY b.genre_id), 2) AS diff_from_avg
FROM books b
JOIN genres g ON b.genre_id = g.genre_id
ORDER BY g.name, diff_from_avg DESC`,
    },
];

const HR = [
    {
        title: 'Сотрудники с зарплатой выше 90 000 ₽',
        question_text: 'Найдите всех сотрудников с зарплатой больше 90 000 рублей. Выведите имя, должность и зарплату, отсортируйте по убыванию зарплаты.',
        reference_sql:
`SELECT name, position, salary
FROM employees
WHERE salary > 90000
ORDER BY salary DESC`,
    },
    {
        title: 'Сотрудники и их отделы',
        question_text: 'Выведите имя каждого сотрудника, название его отдела и город расположения отдела.',
        reference_sql:
`SELECT e.name, d.name AS department, d.location
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id
ORDER BY d.name, e.name`,
    },
    {
        title: 'Количество сотрудников по отделам',
        question_text: 'Подсчитайте количество сотрудников в каждом отделе. Выведите название отдела и количество, отсортируйте по убыванию.',
        reference_sql:
`SELECT d.name AS department, COUNT(e.emp_id) AS employee_count
FROM departments d
LEFT JOIN employees e ON d.dept_id = e.dept_id
GROUP BY d.name
ORDER BY employee_count DESC`,
    },
    {
        title: 'Отделы со средней зарплатой выше 85 000 ₽',
        question_text: 'Найдите отделы, где средняя зарплата превышает 85 000 рублей. Выведите название отдела и среднюю зарплату (округлить до 2 знаков).',
        reference_sql:
`SELECT d.name AS department, ROUND(AVG(e.salary), 2) AS avg_salary
FROM departments d
JOIN employees e ON d.dept_id = e.dept_id
GROUP BY d.name
HAVING AVG(e.salary) > 85000
ORDER BY avg_salary DESC`,
    },
    {
        title: 'Участники проекта «Новая платформа»',
        question_text: 'Найдите всех сотрудников, участвующих в проекте «Новая платформа». Выведите имя сотрудника и его роль в проекте.',
        reference_sql:
`SELECT e.name, ep.role
FROM employees e
JOIN employee_projects ep ON e.emp_id = ep.emp_id
JOIN projects p ON ep.proj_id = p.proj_id
WHERE p.name = 'Новая платформа'
ORDER BY e.name`,
    },
    {
        title: 'Сотрудники с зарплатой выше средней по своему отделу',
        question_text: 'Найдите сотрудников, чья зарплата выше средней зарплаты в их собственном отделе. Выведите имя, отдел и зарплату.',
        reference_sql:
`SELECT e.name, d.name AS department, e.salary
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id
WHERE e.salary > (
    SELECT AVG(salary) FROM employees WHERE dept_id = e.dept_id
)
ORDER BY d.name, e.salary DESC`,
    },
    {
        title: 'Ранг сотрудников по зарплате внутри отдела',
        question_text: 'Проранжируйте сотрудников по зарплате внутри каждого отдела (1 — наивысшая зарплата). Выведите отдел, имя, зарплату и ранг.',
        reference_sql:
`SELECT d.name AS department, e.name, e.salary,
       RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS salary_rank
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id
ORDER BY d.name, salary_rank`,
    },
    {
        title: 'Дата найма предыдущего сотрудника (LAG)',
        question_text: 'Для каждого сотрудника (в порядке найма) выведите имя, дату найма и дату найма предыдущего принятого сотрудника. Используйте оконную функцию LAG.',
        reference_sql:
`SELECT name, hire_date,
       LAG(hire_date) OVER (ORDER BY hire_date) AS prev_hire_date
FROM employees
ORDER BY hire_date`,
    },
    {
        title: 'Отдел с максимальным суммарным бюджетом проектов (CTE)',
        question_text: 'С помощью CTE найдите отдел с максимальным суммарным бюджетом проектов. Выведите название отдела и суммарный бюджет.',
        reference_sql:
`WITH dept_budgets AS (
    SELECT d.name AS department, SUM(p.budget) AS total_budget
    FROM departments d
    JOIN projects p ON d.dept_id = p.dept_id
    GROUP BY d.name
)
SELECT department, total_budget
FROM dept_budgets
WHERE total_budget = (SELECT MAX(total_budget) FROM dept_budgets)`,
    },
    {
        title: 'Накопительная зарплата по дате найма',
        question_text: 'Выведите сотрудников в порядке найма. Для каждого вычислите накопительную сумму зарплат всех нанятых до него и включая его.',
        reference_sql:
`SELECT name, hire_date, salary,
       SUM(salary) OVER (ORDER BY hire_date) AS cumulative_salary
FROM employees
ORDER BY hire_date`,
    },
];

const seedSqlQuestionBank = async () => {
    const existing = await SqlQuestion.count();
    if (existing > 0) {
        console.log(`SQL банк вопросов: уже содержит ${existing} вопросов, пропускаем`);
        return;
    }

    const teacherRole = await Role.findOne({ where: { role: 'teacher' } });
    const teacher = await User.findOne({ where: { role_id: teacherRole.role_id } });
    if (!teacher) {
        console.log('SQL банк вопросов: учитель не найден, пропускаем');
        return;
    }

    const booksData = BOOKS.map(q => ({ ...q, schema_name: 'books', author_id: teacher.user_id }));
    const hrData    = HR.map(q => ({ ...q, schema_name: 'hr',    author_id: teacher.user_id }));

    await SqlQuestion.bulkCreate([...booksData, ...hrData]);
    console.log(`SQL банк вопросов: добавлено ${booksData.length + hrData.length} вопросов`);
};

module.exports = seedSqlQuestionBank;
