const { Pool } = require('pg');
const { SandboxSchema, Question } = require('../models');
const AppError = require('../utils/AppError');

const BUILTIN_SCHEMAS = ['books', 'hr'];
const SANDBOX_USER = 'sandbox_user';

// Тот же суперпользователь, что и metaPool в sandboxService
const adminPool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: 'diplom_sandbox',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 3,
    idleTimeoutMillis: 30000,
});

// ─── validation ────────────────────────────────────────────────────────────────

const DANGEROUS = [
    /\bdrop\s+database\b/i,
    /\bdrop\s+schema\b/i,
    /\bcreate\s+role\b/i,
    /\bcreate\s+user\b/i,
    /\bgrant\b/i,
    /\brevoke\b/i,
    /\balter\s+role\b/i,
    /\balter\s+system\b/i,
    /\bdrop\s+owned\b/i,
    /\bcopy\b/i,           // COPY ... TO FILE
    /\\\\/,               // psql backslash commands
];

const validateDdl = (ddl) => {
    for (const p of DANGEROUS) {
        if (p.test(ddl)) throw new AppError('DDL содержит недопустимые операции', 400);
    }
};

// Превращаем display_name в безопасный ключ схемы: t{userId}_{slug}
const toSchemaKey = (userId, displayName) => {
    const slug = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 30) || 'schema';
    return `t${userId}_${slug}`;
};

// ─── public ────────────────────────────────────────────────────────────────────

const listSchemas = (userId) =>
    SandboxSchema.findAll({ where: { owner_id: userId }, order: [['created_at', 'DESC']] });

/**
 * Выполняет DDL в одноразовой схеме внутри транзакции (всегда ROLLBACK).
 * Возвращает список таблиц с колонками — чтобы учитель увидел результат до сохранения.
 */
const previewDdl = async (ddl, userId) => {
    validateDdl(ddl);
    const tmp = `tmp_prev_${userId}_${Date.now()}`;
    const client = await adminPool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`CREATE SCHEMA "${tmp}"`);
        await client.query(`SET LOCAL search_path = "${tmp}"`);
        await client.query(`SET LOCAL statement_timeout = '5s'`);
        await client.query(ddl);

        const { rows: tables } = await client.query(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = $1 AND table_type = 'BASE TABLE'
             ORDER BY table_name`,
            [tmp]
        );

        // первичные ключи по всей временной схеме
        const { rows: pkRows } = await client.query(
            `SELECT kcu.table_name, kcu.column_name
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
               ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema    = kcu.table_schema
             WHERE tc.table_schema    = $1
               AND tc.constraint_type = 'PRIMARY KEY'`,
            [tmp]
        );
        const pkSet = new Set(pkRows.map(r => `${r.table_name}.${r.column_name}`));

        // внешние ключи
        const { rows: fkRows } = await client.query(
            `SELECT kcu.table_name, kcu.column_name,
                    ccu.table_name AS ref_table, ccu.column_name AS ref_column
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
               ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema    = kcu.table_schema
             JOIN information_schema.constraint_column_usage ccu
               ON ccu.constraint_name = tc.constraint_name
             WHERE tc.table_schema    = $1
               AND tc.constraint_type = 'FOREIGN KEY'`,
            [tmp]
        );
        const fkMap = {};
        for (const r of fkRows)
            fkMap[`${r.table_name}.${r.column_name}`] = `${r.ref_table}.${r.ref_column}`;

        // уникальные ограничения
        const { rows: uqRows } = await client.query(
            `SELECT kcu.table_name, kcu.column_name
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
               ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema    = kcu.table_schema
             WHERE tc.table_schema    = $1
               AND tc.constraint_type = 'UNIQUE'`,
            [tmp]
        );
        const uqSet = new Set(uqRows.map(r => `${r.table_name}.${r.column_name}`));

        const result = [];
        for (const { table_name } of tables) {
            const { rows: cols } = await client.query(
                `SELECT column_name,
                        CASE
                            WHEN character_maximum_length IS NOT NULL
                                THEN data_type || '(' || character_maximum_length || ')'
                            WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL
                                THEN 'numeric(' || numeric_precision ||
                                     CASE WHEN numeric_scale IS NOT NULL THEN ',' || numeric_scale ELSE '' END || ')'
                            ELSE data_type
                        END AS data_type,
                        is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = $1 AND table_name = $2
                 ORDER BY ordinal_position`,
                [tmp, table_name]
            );
            const { rows: counts } = await client.query(
                `SELECT COUNT(*) AS cnt FROM "${tmp}"."${table_name}"`
            );
            const enriched = cols.map(c => ({
                ...c,
                is_pk:  pkSet.has(`${table_name}.${c.column_name}`),
                is_uq:  uqSet.has(`${table_name}.${c.column_name}`),
                fk_ref: fkMap[`${table_name}.${c.column_name}`] ?? null,
            }));
            result.push({ table: table_name, columns: enriched, rows: Number(counts[0].cnt) });
        }

        return result;
    } catch (err) {
        throw new AppError(err.message, 400);
    } finally {
        await client.query('ROLLBACK');
        client.release();
    }
};

/**
 * Создаёт схему в diplom_sandbox и сохраняет запись в основной БД.
 */
const createSchema = async (userId, displayName, ddl) => {
    if (!displayName?.trim()) throw new AppError('Укажите название схемы', 400);
    if (!ddl?.trim())         throw new AppError('Укажите DDL схемы', 400);
    validateDdl(ddl);

    const schemaKey = toSchemaKey(userId, displayName);

    const existing = await SandboxSchema.findOne({ where: { schema_key: schemaKey } });
    if (existing) throw new AppError('Схема с таким названием уже существует', 409);

    const client = await adminPool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`CREATE SCHEMA "${schemaKey}"`);
        await client.query(`SET LOCAL search_path = "${schemaKey}"`);
        await client.query(`SET LOCAL statement_timeout = '10s'`);
        await client.query(ddl);
        await client.query(`GRANT USAGE ON SCHEMA "${schemaKey}" TO ${SANDBOX_USER}`);
        await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA "${schemaKey}" TO ${SANDBOX_USER}`);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw new AppError(err.message, 400);
    } finally {
        client.release();
    }

    return SandboxSchema.create({
        owner_id:     userId,
        schema_key:   schemaKey,
        display_name: displayName.trim(),
        ddl:          ddl.trim(),
    });
};

/**
 * Обновляет схему: переименовывает display_name и/или пересоздаёт PostgreSQL-схему.
 * schema_key никогда не меняется — иначе сломаются вопросы, ссылающиеся на неё.
 */
const updateSchema = async (schemaId, userId, { display_name, ddl }) => {
    const record = await SandboxSchema.findOne({ where: { schema_id: schemaId, owner_id: userId } });
    if (!record) throw new AppError('Схема не найдена', 404);

    const updates = {};
    if (display_name?.trim() && display_name.trim() !== record.display_name)
        updates.display_name = display_name.trim();

    if (ddl?.trim()) {
        validateDdl(ddl);
        const client = await adminPool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`DROP SCHEMA IF EXISTS "${record.schema_key}" CASCADE`);
            await client.query(`CREATE SCHEMA "${record.schema_key}"`);
            await client.query(`SET LOCAL search_path = "${record.schema_key}"`);
            await client.query(`SET LOCAL statement_timeout = '10s'`);
            await client.query(ddl);
            await client.query(`GRANT USAGE ON SCHEMA "${record.schema_key}" TO ${SANDBOX_USER}`);
            await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA "${record.schema_key}" TO ${SANDBOX_USER}`);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw new AppError(err.message, 400);
        } finally {
            client.release();
        }
        updates.ddl = ddl.trim();
    }

    if (Object.keys(updates).length > 0) await record.update(updates);
    return record.reload();
};

/**
 * Удаляет схему из diplom_sandbox и запись из основной БД.
 * Блокирует удаление, если схема используется в вопросах.
 */
const deleteSchema = async (schemaId, userId) => {
    const record = await SandboxSchema.findOne({ where: { schema_id: schemaId, owner_id: userId } });
    if (!record) throw new AppError('Схема не найдена', 404);

    const usageCount = await Question.count({ where: { schema_name: record.schema_key } });
    if (usageCount > 0)
        throw new AppError(`Схема используется в ${usageCount} вопр. Сначала удалите их.`, 409);

    const client = await adminPool.connect();
    try {
        await client.query(`DROP SCHEMA IF EXISTS "${record.schema_key}" CASCADE`);
    } finally {
        client.release();
    }

    await record.destroy();
};

/**
 * Проверяет, разрешена ли схема для sandbox-выполнения.
 * Встроенные схемы — всегда, остальные — только если есть запись в БД.
 */
const isSchemaAllowed = async (schemaKey) => {
    if (BUILTIN_SCHEMAS.includes(schemaKey)) return true;
    const record = await SandboxSchema.findOne({ where: { schema_key: schemaKey } });
    return !!record;
};

module.exports = { listSchemas, previewDdl, createSchema, updateSchema, deleteSchema, isSchemaAllowed, BUILTIN_SCHEMAS };
