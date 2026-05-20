const { Pool } = require('pg');
const AppError = require('../utils/AppError');
const { isSchemaAllowed } = require('./schemaManagerService');

// Пул для выполнения запросов студентов/преподавателей (sandbox_user — только SELECT)
const sandboxPool = new Pool({
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: 'diplom_sandbox',
    user:     'sandbox_user',
    password: process.env.SANDBOX_PASSWORD,
    max: 5,
    idleTimeoutMillis:    30000,
    connectionTimeoutMillis: 5000,
});

// Пул только для чтения метаданных схемы.
// information_schema.key_column_usage/constraint_column_usage видят PK/FK
// только для таблиц, которыми владеет текущий пользователь.
// sandbox_user — не владелец, поэтому нужен postgres-суперпользователь.
const metaPool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: 'diplom_sandbox',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 3,
    idleTimeoutMillis: 30000,
});


// ─── private ──────────────────────────────────────────────────────────────────

// Нормализуем значение: числа приводим к единому формату, чтобы '850.00' и '850' совпадали.
const normalizeValue = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    const n = Number(s);
    if (!isNaN(n) && s.trim() !== '') return String(n);
    return s;
};

// Нормализуем одну строку: значения сортируем, чтобы игнорировать порядок столбцов и алиасы.
const normalizeRow = (row) =>
    Object.values(row).map(normalizeValue).sort().join('\x00');

// Сравнение без учёта порядка строк (для запросов без ORDER BY).
const normalizeUnordered = (rows) =>
    rows.map(normalizeRow).sort().join('\n');

// Сравнение с учётом порядка строк (для запросов с ORDER BY).
const normalizeOrdered = (rows) =>
    rows.map(normalizeRow).join('\n');

// Проверяет наличие ORDER BY на верхнем уровне запроса (не внутри подзапроса).
const hasTopLevelOrderBy = (sql) => {
    let depth = 0;
    for (let i = 0; i < sql.length; i++) {
        if (sql[i] === '(') { depth++; continue; }
        if (sql[i] === ')') { depth--; continue; }
        if (depth === 0 && /^ORDER\s+BY\b/i.test(sql.slice(i))) return true;
    }
    return false;
};

const compareResults = (a, b, ordered = false) => {
    if (a.columns.length !== b.columns.length) return false;
    if (a.rows.length !== b.rows.length) return false;
    const normalize = ordered ? normalizeOrdered : normalizeUnordered;
    return normalize(a.rows) === normalize(b.rows);
};

// ─── public ───────────────────────────────────────────────────────────────────

/**
 * Выполняет один SQL-запрос в изолированной транзакции (всегда ROLLBACK).
 * Возвращает { columns, rows, rowCount } или бросает AppError.
 */
const runQuery = async (sql, schema) => {
    if (!await isSchemaAllowed(schema))
        throw new AppError(`Схема "${schema}" не поддерживается`, 400);

    const client = await sandboxPool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL statement_timeout = '5s'`);
        await client.query(`SET LOCAL search_path = ${schema}`);

        const result = await client.query(sql);
        const columns = result.fields.map(f => f.name);

        return { columns, rows: result.rows, rowCount: result.rowCount };
    } catch (err) {
        // Синтаксические ошибки и timeout — возвращаем как пользовательские
        throw new AppError(err.message, 400);
    } finally {
        await client.query('ROLLBACK');
        client.release();
    }
};

/**
 * Выполняет запрос студента и эталонный запрос, сравнивает результаты.
 * Возвращает { correct, studentResult, referenceResult }.
 */
const runAndCompare = async (studentSql, referenceSql, schema) => {
    const [studentResult, referenceResult] = await Promise.all([
        runQuery(studentSql, schema),
        runQuery(referenceSql, schema),
    ]);

    const ordered = hasTopLevelOrderBy(referenceSql);

    return {
        correct: compareResults(studentResult, referenceResult, ordered),
        studentResult,
        referenceResult,
    };
};

/**
 * Возвращает структуру таблиц схемы: имена таблиц, столбцы, типы, FK.
 */
const getSchemaInfo = async (schema) => {
    if (!await isSchemaAllowed(schema))
        throw new AppError(`Схема "${schema}" не поддерживается`, 400);

    const client = await metaPool.connect();
    try {
        const { rows: cols } = await client.query(`
            SELECT c.table_name, c.column_name,
                   CASE
                       WHEN c.character_maximum_length IS NOT NULL
                           THEN c.data_type || '(' || c.character_maximum_length || ')'
                       WHEN c.data_type = 'numeric' AND c.numeric_precision IS NOT NULL
                           THEN 'numeric(' || c.numeric_precision ||
                                CASE WHEN c.numeric_scale IS NOT NULL THEN ',' || c.numeric_scale ELSE '' END || ')'
                       ELSE c.data_type
                   END AS data_type,
                   c.is_nullable,
                   kcu.constraint_name AS pk_name,
                   ccu.table_name      AS fk_ref_table,
                   ccu.column_name     AS fk_ref_column
            FROM information_schema.columns c
            LEFT JOIN information_schema.key_column_usage kcu
                ON kcu.table_schema = c.table_schema
                AND kcu.table_name  = c.table_name
                AND kcu.column_name = c.column_name
            LEFT JOIN information_schema.table_constraints tc
                ON tc.constraint_name  = kcu.constraint_name
                AND tc.constraint_type = 'FOREIGN KEY'
            LEFT JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE c.table_schema = $1
            ORDER BY c.table_name, c.ordinal_position
        `, [schema]);

        const { rows: pks } = await client.query(`
            SELECT kcu.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema   = kcu.table_schema
            WHERE tc.table_schema    = $1
              AND tc.constraint_type = 'PRIMARY KEY'
        `, [schema]);

        const pkSet = new Set(pks.map(r => `${r.table_name}.${r.column_name}`));

        const tables = {};
        for (const row of cols) {
            if (!tables[row.table_name]) tables[row.table_name] = [];
            tables[row.table_name].push({
                column:      row.column_name,
                type:        row.data_type,
                nullable:    row.is_nullable === 'YES',
                primary_key: pkSet.has(`${row.table_name}.${row.column_name}`),
                fk_ref:      row.fk_ref_table ? `${row.fk_ref_table}.${row.fk_ref_column}` : null,
            });
        }

        return tables;
    } finally {
        client.release();
    }
};

module.exports = { runQuery, runAndCompare, getSchemaInfo };
