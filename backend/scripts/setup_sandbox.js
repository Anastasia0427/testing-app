/**
 * Запуск: node backend/scripts/setup_sandbox.js
 * Создаёт БД diplom_sandbox, пользователя sandbox_user, схемы books и hr с тестовыми данными.
 * Требует доступ суперпользователя (DB_USER / DB_PASSWORD из .env).
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SANDBOX_DB   = 'diplom_sandbox';
const SANDBOX_USER = 'sandbox_user';
const SANDBOX_PASS = process.env.SANDBOX_PASSWORD || 'sandbox_secret';

const adminConfig = {
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const log = (msg) => console.log(`  ✓ ${msg}`);

async function adminQuery(pool, sql, label) {
    await pool.query(sql);
    if (label) log(label);
}

// ─── schemas & data ───────────────────────────────────────────────────────────

const BOOKS_SCHEMA = `
CREATE SCHEMA IF NOT EXISTS books;

CREATE TABLE IF NOT EXISTS books.genres (
    genre_id   SERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS books.authors (
    author_id  SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    birth_year INT,
    country    VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS books.books (
    book_id    SERIAL PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    author_id  INT REFERENCES books.authors(author_id),
    genre_id   INT REFERENCES books.genres(genre_id),
    year       INT,
    pages      INT,
    price      NUMERIC(8,2)
);

INSERT INTO books.genres (name) VALUES
    ('Роман'), ('Фантастика'), ('Детектив'), ('Поэзия'), ('Биография'), ('Исторический')
ON CONFLICT DO NOTHING;

INSERT INTO books.authors (name, birth_year, country) VALUES
    ('Лев Толстой',             1828, 'Россия'),
    ('Фёдор Достоевский',       1821, 'Россия'),
    ('Михаил Булгаков',         1891, 'Россия'),
    ('Антон Чехов',             1860, 'Россия'),
    ('Айзек Азимов',            1920, 'США'),
    ('Агата Кристи',            1890, 'Великобритания'),
    ('Артур Конан Дойл',        1859, 'Великобритания'),
    ('Габриэль Гарсиа Маркес',  1927, 'Колумбия')
ON CONFLICT DO NOTHING;

INSERT INTO books.books (title, author_id, genre_id, year, pages, price) VALUES
    ('Война и мир',                       1, 1, 1869, 1274, 850.00),
    ('Анна Каренина',                     1, 1, 1878,  864, 650.00),
    ('Преступление и наказание',          2, 1, 1866,  608, 550.00),
    ('Братья Карамазовы',                 2, 1, 1880,  896, 700.00),
    ('Идиот',                             2, 1, 1869,  640, 580.00),
    ('Мастер и Маргарита',                3, 1, 1967,  448, 480.00),
    ('Белая гвардия',                     3, 6, 1924,  320, 420.00),
    ('Вишнёвый сад',                      4, 1, 1904,   96, 280.00),
    ('Основание',                         5, 2, 1951,  255, 390.00),
    ('Я, Робот',                          5, 2, 1950,  224, 360.00),
    ('Убийство в Восточном экспрессе',    6, 3, 1934,  256, 400.00),
    ('Десять негритят',                   6, 3, 1939,  224, 380.00),
    ('Приключения Шерлока Холмса',        7, 3, 1892,  307, 450.00),
    ('Собака Баскервилей',                7, 3, 1902,  248, 420.00),
    ('Сто лет одиночества',               8, 1, 1967,  448, 520.00)
ON CONFLICT DO NOTHING;
`;

const HR_SCHEMA = `
CREATE SCHEMA IF NOT EXISTS hr;

CREATE TABLE IF NOT EXISTS hr.departments (
    dept_id   SERIAL PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    location  VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS hr.employees (
    emp_id    SERIAL PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    dept_id   INT REFERENCES hr.departments(dept_id),
    salary    NUMERIC(10,2),
    hire_date DATE,
    position  VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS hr.projects (
    proj_id    SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    dept_id    INT REFERENCES hr.departments(dept_id),
    budget     NUMERIC(12,2),
    start_date DATE,
    end_date   DATE
);

CREATE TABLE IF NOT EXISTS hr.employee_projects (
    emp_id  INT REFERENCES hr.employees(emp_id),
    proj_id INT REFERENCES hr.projects(proj_id),
    role    VARCHAR(100),
    PRIMARY KEY (emp_id, proj_id)
);

INSERT INTO hr.departments (name, location) VALUES
    ('Разработка',   'Москва'),
    ('Маркетинг',    'Москва'),
    ('Финансы',      'Санкт-Петербург'),
    ('HR',           'Москва'),
    ('Аналитика',    'Казань')
ON CONFLICT DO NOTHING;

INSERT INTO hr.employees (name, dept_id, salary, hire_date, position) VALUES
    ('Анна Смирнова',     1, 120000, '2020-03-15', 'Senior Developer'),
    ('Иван Петров',       1,  95000, '2021-06-01', 'Developer'),
    ('Мария Козлова',     1,  85000, '2022-01-10', 'Junior Developer'),
    ('Алексей Новиков',   2,  75000, '2019-11-20', 'Marketing Manager'),
    ('Ольга Морозова',    2,  60000, '2021-09-05', 'Marketing Specialist'),
    ('Дмитрий Волков',    3, 110000, '2018-04-12', 'Financial Director'),
    ('Екатерина Зайцева', 3,  80000, '2020-07-22', 'Accountant'),
    ('Сергей Лебедев',    4,  70000, '2021-03-01', 'HR Manager'),
    ('Наталья Соколова',  5, 100000, '2019-08-14', 'Data Analyst'),
    ('Павел Михайлов',    5,  90000, '2022-05-18', 'BI Developer'),
    ('Татьяна Фёдорова',  1, 130000, '2017-02-28', 'Tech Lead'),
    ('Андрей Захаров',    2,  55000, '2023-01-09', 'Content Manager'),
    ('Юлия Орлова',       3,  72000, '2022-11-15', 'Accountant'),
    ('Максим Кузнецов',   5,  95000, '2020-10-30', 'Data Engineer'),
    ('Виктория Попова',   1,  88000, '2021-12-01', 'Developer')
ON CONFLICT DO NOTHING;

INSERT INTO hr.projects (name, dept_id, budget, start_date, end_date) VALUES
    ('Новая платформа',          1, 5000000, '2023-01-01', '2023-12-31'),
    ('Мобильное приложение',     1, 2000000, '2023-03-01', '2023-09-30'),
    ('Ребрендинг',               2,  800000, '2023-02-01', '2023-06-30'),
    ('Автоматизация отчётности', 3, 1200000, '2023-04-01', '2023-10-31'),
    ('Аналитика продаж',         5,  600000, '2023-01-15', '2023-07-15')
ON CONFLICT DO NOTHING;

INSERT INTO hr.employee_projects (emp_id, proj_id, role) VALUES
    (1,  1, 'Tech Lead'),  (2,  1, 'Developer'), (3,  1, 'Developer'),
    (15, 1, 'Developer'),  (11, 1, 'Architect'),
    (2,  2, 'Developer'),  (3,  2, 'Developer'),
    (4,  3, 'Manager'),    (5,  3, 'Specialist'),
    (6,  4, 'Sponsor'),    (7,  4, 'Analyst'),   (13, 4, 'Analyst'),
    (9,  5, 'Lead Analyst'),(10, 5, 'Developer'), (14, 5, 'Engineer')
ON CONFLICT DO NOTHING;
`;

const GRANTS = `
GRANT USAGE ON SCHEMA books TO sandbox_user;
GRANT SELECT ON ALL TABLES IN SCHEMA books TO sandbox_user;
GRANT USAGE ON SCHEMA hr TO sandbox_user;
GRANT SELECT ON ALL TABLES IN SCHEMA hr TO sandbox_user;
`;

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🔧 Настройка sandbox базы данных...\n');

    // Шаг 1: подключаемся к postgres как суперпользователь
    const adminPool = new Pool({ ...adminConfig, database: 'postgres' });
    try {
        // Создаём пользователя sandbox_user
        await adminPool.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${SANDBOX_USER}') THEN
                    CREATE USER ${SANDBOX_USER} WITH PASSWORD '${SANDBOX_PASS}';
                END IF;
            END $$;
        `);
        log(`Пользователь ${SANDBOX_USER} готов`);

        // Создаём базу данных (вне транзакции — требование PostgreSQL)
        const { rows } = await adminPool.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`, [SANDBOX_DB]
        );
        if (rows.length === 0) {
            await adminPool.query(`CREATE DATABASE ${SANDBOX_DB}`);
            log(`База данных ${SANDBOX_DB} создана`);
        } else {
            log(`База данных ${SANDBOX_DB} уже существует`);
        }

        await adminPool.query(`GRANT CONNECT ON DATABASE ${SANDBOX_DB} TO ${SANDBOX_USER}`);
        log('CONNECT выдан');
    } finally {
        await adminPool.end();
    }

    // Шаг 2: подключаемся к diplom_sandbox как суперпользователь
    const sandboxPool = new Pool({ ...adminConfig, database: SANDBOX_DB });
    try {
        await sandboxPool.query(BOOKS_SCHEMA);
        log('Схема books создана и заполнена');

        await sandboxPool.query(HR_SCHEMA);
        log('Схема hr создана и заполнена');

        await sandboxPool.query(GRANTS);
        log('Права на SELECT выданы sandbox_user');
    } finally {
        await sandboxPool.end();
    }

    console.log('\n✅ Готово! Добавь в .env:\n');
    console.log(`   SANDBOX_PASSWORD=${SANDBOX_PASS}\n`);
}

main().catch((err) => {
    console.error('\n❌ Ошибка:', err.message);
    process.exit(1);
});
