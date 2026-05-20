import { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import Layout from '../../components/Layout';
import SchemaTable from '../../components/SchemaTable';
import { listSchemas, previewDdl, createSchema, updateSchema, deleteSchema } from '../../api/schemaManager';
import styles from './SchemaManager.module.css';

// previewDdl response → normalized columns for SchemaTable
const toCols = (cols) => cols.map(c => ({
    name: c.column_name,
    type: c.data_type,
    pk:   c.is_pk,
    uq:   c.is_uq && !c.is_pk,
    fk:   c.fk_ref ?? null,
}));

const PLACEHOLDER = `-- Пример: создайте таблицы и заполните данными
CREATE TABLE departments (
  dept_id   SERIAL PRIMARY KEY,
  dept_name TEXT NOT NULL
);

CREATE TABLE employees (
  emp_id    SERIAL PRIMARY KEY,
  dept_id   INT REFERENCES departments(dept_id),
  full_name TEXT NOT NULL,
  salary    NUMERIC(10,2)
);

INSERT INTO departments VALUES (1,'Разработка'),(2,'Аналитика');
INSERT INTO employees VALUES
  (1,1,'Иванов А.',85000),
  (2,1,'Петров Б.',90000),
  (3,2,'Сидорова В.',75000);`;

// ── блок превью DDL ───────────────────────────────────────────────────────────
const PreviewBlock = ({ tables }) => (
    <div className={styles.preview}>
        <p className={styles.previewTitle}>
            Таблиц: <strong>{tables.length}</strong>
        </p>
        {tables.map(t => (
            <div key={t.table} className={styles.previewTable}>
                <p className={styles.previewTableName}>
                    {t.table}
                    <span className={styles.rowCount}>{t.rows} строк</span>
                </p>
                <SchemaTable columns={toCols(t.columns)} />
            </div>
        ))}
    </div>
);

// ── форма (используется и для создания, и для редактирования) ─────────────────
const SchemaForm = ({ title, initialName = '', initialDdl = '', nameEditable = true, onSave, onCancel, saveLabel }) => {
    const [name, setName]     = useState(initialName);
    const [ddl, setDdl]       = useState(initialDdl);
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');
    const [preview, setPreview]   = useState(null);
    const [prevError, setPrevError] = useState('');
    const [previewing, setPreviewing] = useState(false);

    const handlePreview = async () => {
        if (!ddl.trim()) return;
        setPreviewing(true);
        setPreview(null);
        setPrevError('');
        try {
            const { data } = await previewDdl(ddl);
            setPreview(data);
        } catch (err) {
            setPrevError(err.response?.data?.error || 'Ошибка выполнения DDL');
        } finally {
            setPreviewing(false);
        }
    };

    const handleSave = async () => {
        setError('');
        setSaving(true);
        try {
            await onSave(name, ddl);
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка при сохранении');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`card ${styles.formCard}`}>
            <h3 className={styles.formTitle}>{title}</h3>

            {nameEditable && (
                <>
                    <label className={styles.label}>Название</label>
                    <input
                        className={styles.input}
                        placeholder="Например: Интернет-магазин"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <p className={styles.hint}>
                        Ключ схемы в PostgreSQL: <code>t{'{ваш_id}'}_{'{название}'}</code>
                    </p>
                </>
            )}
            {!nameEditable && (
                <>
                    <label className={styles.label}>Название</label>
                    <input
                        className={styles.input}
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <p className={styles.hint}>Ключ схемы не изменится — вопросы, ссылающиеся на неё, продолжат работать.</p>
                </>
            )}

            <label className={styles.label}>DDL + данные (SQL)</label>
            <CodeMirror
                value={ddl}
                onChange={setDdl}
                extensions={[sql()]}
                height="260px"
                basicSetup={{ lineNumbers: true }}
                placeholder={PLACEHOLDER}
                className={styles.editor}
            />

            <div className={styles.formActions}>
                <button className="btn btn-outline" onClick={handlePreview} disabled={previewing || !ddl.trim()}>
                    {previewing ? '...' : '▶ Предпросмотр'}
                </button>
                <div style={{ flex: 1 }} />
                <button className="btn btn-outline" onClick={onCancel} style={{ marginRight: '8px' }}>Отмена</button>
                <button className="btn btn-primary" onClick={handleSave}
                    disabled={saving || !name.trim()}>
                    {saving ? 'Сохранение...' : saveLabel}
                </button>
            </div>

            {prevError && <p className={styles.error}>{prevError}</p>}
            {error     && <p className={styles.error}>{error}</p>}
            {preview   && <PreviewBlock tables={preview} />}
        </div>
    );
};

// ── главный компонент ─────────────────────────────────────────────────────────
const SchemaManager = () => {
    const [schemas, setSchemas]     = useState([]);
    const [loading, setLoading]     = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        listSchemas()
            .then(r => setSchemas(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleCreate = async (name, ddl) => {
        const { data } = await createSchema(name, ddl);
        setSchemas(prev => [data, ...prev]);
        setShowCreate(false);
    };

    const handleUpdate = async (schemaId) => async (name, ddl) => {
        const { data } = await updateSchema(schemaId, name, ddl);
        setSchemas(prev => prev.map(s => s.schema_id === schemaId ? data : s));
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить схему? Это действие необратимо.')) return;
        setDeletingId(id);
        try {
            await deleteSchema(id);
            setSchemas(prev => prev.filter(s => s.schema_id !== id));
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка при удалении');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.heading}>Мои схемы БД</h2>
                        <p className={styles.subheading}>Создайте собственную схему для SQL-заданий</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setShowCreate(v => !v); setEditingId(null); }}>
                        {showCreate ? '✕ Отмена' : '+ Новая схема'}
                    </button>
                </div>

                {showCreate && (
                    <SchemaForm
                        title="Новая схема"
                        nameEditable
                        saveLabel="✓ Создать схему"
                        onSave={handleCreate}
                        onCancel={() => setShowCreate(false)}
                    />
                )}

                {loading
                    ? <p className={styles.empty}>Загрузка...</p>
                    : schemas.length === 0 && !showCreate
                        ? <p className={styles.empty}>У вас ещё нет собственных схем.<br />Нажмите «+ Новая схема», чтобы создать первую.</p>
                        : (
                            <div className={styles.list}>
                                {schemas.map(s => (
                                    <div key={s.schema_id}>
                                        <div className={styles.schemaCard}>
                                            <div className={styles.schemaInfo}>
                                                <p className={styles.schemaName}>{s.display_name}</p>
                                                <p className={styles.schemaKey}>{s.schema_key}</p>
                                            </div>
                                            <button
                                                className={styles.editBtn}
                                                onClick={() => setEditingId(id => id === s.schema_id ? null : s.schema_id)}
                                                title="Редактировать схему"
                                            >
                                                {editingId === s.schema_id ? '−' : '✎'}
                                            </button>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => handleDelete(s.schema_id)}
                                                disabled={deletingId === s.schema_id}
                                                title="Удалить схему"
                                            >
                                                {deletingId === s.schema_id ? '...' : '✕'}
                                            </button>
                                        </div>

                                        {editingId === s.schema_id && (
                                            <SchemaForm
                                                title={`Редактировать: ${s.display_name}`}
                                                initialName={s.display_name}
                                                initialDdl={s.ddl || ''}
                                                nameEditable={false}
                                                saveLabel="✓ Сохранить изменения"
                                                onSave={handleUpdate(s.schema_id)}
                                                onCancel={() => setEditingId(null)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                }
            </div>
        </Layout>
    );
};

export default SchemaManager;
