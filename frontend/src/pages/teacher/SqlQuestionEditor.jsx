import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import Layout from '../../components/Layout';
import { getSchemas, runQuery } from '../../api/sandbox';
import { createQuestion, getQuestionById, updateQuestion } from '../../api/questionBank';
import styles from './SqlQuestionEditor.module.css';

const SqlQuestionEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [schemas, setSchemas]           = useState([]);
    const [form, setForm]                 = useState({
        title: '', schema_name: '', question_text: '', reference_sql: ''
    });
    const [queryResult, setQueryResult]   = useState(null);
    const [queryError, setQueryError]     = useState('');
    const [running, setRunning]           = useState(false);
    const [saving, setSaving]             = useState(false);
    const [loadError, setLoadError]       = useState('');

    useEffect(() => {
        getSchemas().then(res => {
            setSchemas(res.data);
            if (!isEdit) setForm(f => ({ ...f, schema_name: res.data[0] ?? '' }));
        });

        if (isEdit) {
            getQuestionById(id)
                .then(res => {
                    const q = res.data;
                    setForm({
                        title: q.title,
                        schema_name: q.schema_name,
                        question_text: q.question_text,
                        reference_sql: q.reference_sql,
                    });
                })
                .catch(() => setLoadError('Не удалось загрузить вопрос'));
        }
    }, [id, isEdit]);

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleRunQuery = async () => {
        if (!form.reference_sql.trim()) return;
        setRunning(true);
        setQueryError('');
        setQueryResult(null);
        try {
            const res = await runQuery(form.reference_sql, form.schema_name);
            setQueryResult(res.data);
        } catch (e) {
            setQueryError(e.response?.data?.error || 'Ошибка выполнения запроса');
        } finally {
            setRunning(false);
        }
    };

    const handleSave = async () => {
        if (!form.title || !form.question_text || !form.reference_sql || !form.schema_name) {
            alert('Заполните все поля');
            return;
        }
        setSaving(true);
        try {
            if (isEdit) {
                await updateQuestion(id, form);
            } else {
                await createQuestion(form);
            }
            navigate('/teacher/question-bank');
        } catch (e) {
            alert(e.response?.data?.error || 'Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    if (loadError) return <Layout><p className="page-error" style={{ margin: 32 }}>{loadError}</p></Layout>;

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <button className="btn btn-outline" onClick={() => navigate('/teacher/question-bank')}>
                        ← Назад
                    </button>
                    <h2 className={styles.heading}>
                        {isEdit ? 'Редактировать вопрос' : 'Новый SQL-вопрос'}
                    </h2>
                </div>

                <div className={`card ${styles.formCard}`}>
                    {/* Название */}
                    <div className={styles.field}>
                        <label className={styles.label}>Название (для банка)</label>
                        <input
                            className="input"
                            placeholder="Например: Выборка авторов старше 1850 г."
                            value={form.title}
                            onChange={set('title')}
                        />
                    </div>

                    {/* Схема */}
                    <div className={styles.field}>
                        <label className={styles.label}>Схема базы данных</label>
                        <select
                            className="input"
                            value={form.schema_name}
                            onChange={set('schema_name')}
                        >
                            {schemas.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Текст задания */}
                    <div className={styles.field}>
                        <label className={styles.label}>Текст задания</label>
                        <textarea
                            className="input"
                            rows={4}
                            placeholder="Напишите SQL-запрос, который выводит имена всех авторов, рождённых до 1850 года."
                            value={form.question_text}
                            onChange={set('question_text')}
                        />
                    </div>

                    {/* Эталонный запрос */}
                    <div className={styles.field}>
                        <div className={styles.sqlHeader}>
                            <label className={styles.label}>Эталонный запрос (правильный ответ)</label>
                            <button
                                className="btn btn-outline"
                                onClick={handleRunQuery}
                                disabled={running || !form.reference_sql.trim() || !form.schema_name}
                            >
                                {running ? 'Выполняется...' : '▶ Запустить'}
                            </button>
                        </div>
                        <div className={styles.editorWrap}>
                            <CodeMirror
                                value={form.reference_sql}
                                extensions={[sql()]}
                                onChange={(val) => setForm(f => ({ ...f, reference_sql: val }))}
                                theme="light"
                                basicSetup={{ lineNumbers: true, foldGutter: false }}
                                style={{ fontSize: 14 }}
                            />
                        </div>
                    </div>

                    {/* Результат выполнения */}
                    {queryError && (
                        <div className={styles.queryError}>{queryError}</div>
                    )}
                    {queryResult && (
                        <div className={styles.resultWrap}>
                            <p className={styles.resultMeta}>
                                Результат: {queryResult.rowCount} {queryResult.rowCount === 1 ? 'строка' : 'строк'}
                            </p>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            {queryResult.columns.map(c => <th key={c}>{c}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queryResult.rows.map((row, i) => (
                                            <tr key={i}>
                                                {queryResult.columns.map(c => (
                                                    <td key={c}>{row[c] ?? <span className={styles.null}>NULL</span>}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Добавить в банк'}
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default SqlQuestionEditor;
