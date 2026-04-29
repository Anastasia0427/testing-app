import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getTestById, updateTest, addQuestion, deleteQuestion } from '../../api/tests';
import styles from './TestForm.module.css';

const SERVER = 'http://localhost:3000';

const TYPES = [
    { value: 'single_choice',   label: 'Один верный ответ' },
    { value: 'multiple_choice', label: 'Несколько верных ответов' },
    { value: 'text',            label: 'Текстовый ответ' },
];

const emptyQuestion = () => ({
    _key: Date.now(),
    type: 'single_choice',
    question_text: '',
    points: 1,
    options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
});

const savedToEditor = (q) => ({
    _key: Date.now(),
    type: q.type?.type ?? 'single_choice',
    question_text: q.question_text,
    points: q.points ?? 1,
    options: (q.options ?? []).map(o => ({ text: o.option_text, is_correct: o.is_correct })),
});

const EditTest = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: '', description: '', pass_score: '', max_attempts: '', time_limit: '',
    });
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    const [savedQuestions, setSavedQuestions] = useState([]);
    const [toDelete, setToDelete] = useState([]);        // ID существующих вопросов на удаление
    const [newQuestions, setNewQuestions] = useState([]); // вопросы ещё не в БД

    // редактор
    const [editing, setEditing] = useState(null);
    const [editingNewIdx, setEditingNewIdx] = useState(null);   // индекс в newQuestions
    const [editingSavedId, setEditingSavedId] = useState(null); // question_id редактируемого сохранённого вопроса

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getTestById(id)
            .then(res => {
                const t = res.data;
                setForm({
                    title:        t.title        ?? '',
                    description:  t.description  ?? '',
                    pass_score:   t.pass_score   ?? '',
                    max_attempts: t.max_attempts ?? '',
                    time_limit:   t.time_limit   ?? '',
                });
                if (t.cover_image) setCoverPreview(`${SERVER}${t.cover_image}`);
                setSavedQuestions(t.questions ?? []);
            })
            .catch(() => setError('Не удалось загрузить тест'))
            .finally(() => setLoading(false));
    }, [id]);

    // ── форма теста ──────────────────────────────────────────
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCover = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    // ── действия с сохранёнными вопросами ───────────────────
    const openEditSaved = (q) => {
        setEditing(savedToEditor(q));
        setEditingSavedId(q.question_id);
        setEditingNewIdx(null);
    };

    const markDelete = (q) => {
        setToDelete(prev => [...prev, q.question_id]);
        setSavedQuestions(prev => prev.filter(x => x.question_id !== q.question_id));
        if (editingSavedId === q.question_id) cancelEditing();
    };

    // ── действия с новыми вопросами ──────────────────────────
    const openNewQuestion = () => {
        setEditing(emptyQuestion());
        setEditingNewIdx(null);
        setEditingSavedId(null);
    };

    const openEditNew = (q, idx) => {
        setEditing({ ...q, options: q.options.map(o => ({ ...o })) });
        setEditingNewIdx(idx);
        setEditingSavedId(null);
    };

    const cancelEditing = () => {
        setEditing(null);
        setEditingNewIdx(null);
        setEditingSavedId(null);
    };

    // ── поля редактора ───────────────────────────────────────
    const handleQField = (field, value) => {
        setEditing(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'type' && value === 'text') next.options = [];
            if (field === 'type' && value !== 'text' && prev.type === 'text') {
                next.options = [{ text: '', is_correct: false }, { text: '', is_correct: false }];
            }
            return next;
        });
    };

    const handleOptionText = (idx, value) =>
        setEditing(prev => ({
            ...prev,
            options: prev.options.map((o, i) => i === idx ? { ...o, text: value } : o),
        }));

    const handleOptionCorrect = (idx) =>
        setEditing(prev => ({
            ...prev,
            options: prev.type === 'single_choice'
                ? prev.options.map((o, i) => ({ ...o, is_correct: i === idx }))
                : prev.options.map((o, i) => i === idx ? { ...o, is_correct: !o.is_correct } : o),
        }));

    const addOption = () =>
        setEditing(prev => ({ ...prev, options: [...prev.options, { text: '', is_correct: false }] }));

    const removeOption = (idx) =>
        setEditing(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));

    // ── сохранить вопрос ─────────────────────────────────────
    const saveQuestion = () => {
        if (!editing.question_text.trim()) return alert('Введите текст вопроса');
        if (editing.type !== 'text') {
            if (editing.options.length < 2) return alert('Добавьте хотя бы 2 варианта ответа');
            if (editing.options.some(o => !o.text.trim())) return alert('Заполните все варианты ответа');
            if (!editing.options.some(o => o.is_correct)) return alert('Отметьте хотя бы один верный ответ');
        }

        if (editingSavedId !== null) {
            // редактирование существующего: помечаем старый на удаление, добавляем как новый
            setToDelete(prev => [...prev, editingSavedId]);
            setSavedQuestions(prev => prev.filter(q => q.question_id !== editingSavedId));
            setNewQuestions(prev => [...prev, { ...editing, _key: Date.now() }]);
        } else if (editingNewIdx !== null) {
            setNewQuestions(prev => prev.map((q, i) => i === editingNewIdx ? editing : q));
        } else {
            setNewQuestions(prev => [...prev, editing]);
        }

        cancelEditing();
    };

    const removeNew = (idx) => {
        setNewQuestions(prev => prev.filter((_, i) => i !== idx));
        if (editingNewIdx === idx) cancelEditing();
    };

    // ── отправка ─────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.title.trim()) return setError('Укажите название теста');
        if (savedQuestions.length + newQuestions.length === 0)
            return setError('В тесте должен быть хотя бы один вопрос');

        setSubmitting(true);
        setError('');

        try {
            const fd = new FormData();
            fd.append('title',       form.title.trim());
            fd.append('description', form.description);
            if (form.pass_score)   fd.append('pass_score',   form.pass_score);
            if (form.max_attempts) fd.append('max_attempts', form.max_attempts);
            if (form.time_limit)   fd.append('time_limit',   form.time_limit);
            if (coverFile)         fd.append('cover_image',  coverFile);

            await updateTest(id, fd);

            for (const qId of toDelete) {
                await deleteQuestion(id, qId);
            }

            for (const q of newQuestions) {
                await addQuestion(id, {
                    question_text: q.question_text,
                    question_type: q.type,
                    points:        q.points,
                    options:       q.options.map(o => ({ text: o.text, is_correct: o.is_correct })),
                });
            }

            navigate('/teacher/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка при сохранении');
            setSubmitting(false);
        }
    };

    const typeLabel = (q) => {
        const t = q.type?.type ?? q.type;
        return TYPES.find(x => x.value === t)?.label ?? t;
    };

    if (loading) return <Layout><p style={{ padding: 32 }}>Загрузка...</p></Layout>;

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <button className="btn btn-outline" onClick={() => navigate('/teacher/dashboard')}>
                        ← Назад
                    </button>
                    <h2 className={styles.heading}>Редактирование теста</h2>
                </div>

                {/* настройки */}
                <div className={`card ${styles.section}`}>
                    <h3 className={styles.sectionTitle}>Основные настройки</h3>

                    <div className={styles.coverRow}>
                        {coverPreview && (
                            <img src={coverPreview} alt="обложка" className={styles.coverPreview} />
                        )}
                        <label className={styles.coverLabel}>
                            {coverPreview ? 'Сменить обложку' : '+ Обложка'}
                            <input type="file" accept="image/*" onChange={handleCover} hidden />
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Название *</label>
                        <input name="title" value={form.title} onChange={handleFormChange} />
                    </div>
                    <div className="form-group">
                        <label>Описание</label>
                        <textarea name="description" value={form.description}
                            onChange={handleFormChange} rows={3} />
                    </div>

                    <div className={styles.row3}>
                        <div className="form-group">
                            <label>Проходной балл (%)</label>
                            <input type="number" name="pass_score" value={form.pass_score}
                                onChange={handleFormChange} min={0} max={100} />
                        </div>
                        <div className="form-group">
                            <label>Попыток</label>
                            <input type="number" name="max_attempts" value={form.max_attempts}
                                onChange={handleFormChange} min={1} />
                        </div>
                        <div className="form-group">
                            <label>Время (мин)</label>
                            <input type="number" name="time_limit" value={form.time_limit}
                                onChange={handleFormChange} min={1} />
                        </div>
                    </div>
                </div>

                {/* вопросы */}
                <div className={`card ${styles.section}`}>
                    <h3 className={styles.sectionTitle}>
                        Вопросы ({savedQuestions.length + newQuestions.length})
                    </h3>

                    {savedQuestions.length === 0 && newQuestions.length === 0 && !editing && (
                        <p className={styles.hint}>Вопросов нет. Добавьте хотя бы один.</p>
                    )}

                    {/* существующие вопросы */}
                    {savedQuestions.map((q, idx) => (
                        <div key={q.question_id}
                            className={`${styles.qRow} ${editingSavedId === q.question_id ? styles.qRowEditing : ''}`}>
                            <div className={styles.qInfo}>
                                <span className={styles.qNum}>{idx + 1}</span>
                                <div>
                                    <p className={styles.qText}>{q.question_text}</p>
                                    <span className={styles.qMeta}>
                                        {typeLabel(q)} · {q.points} б.
                                        {q.options?.length > 0 && ` · ${q.options.length} вариантов`}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.qActions}>
                                <button className="btn btn-outline" onClick={() => openEditSaved(q)}>
                                    Изменить
                                </button>
                                <button className="btn btn-danger" onClick={() => markDelete(q)}>
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* новые вопросы */}
                    {newQuestions.map((q, idx) => (
                        <div key={q._key} className={`${styles.qRow} ${styles.qRowNew}`}>
                            <div className={styles.qInfo}>
                                <span className={`${styles.qNum} ${styles.qNumNew}`}>
                                    {savedQuestions.length + idx + 1}
                                </span>
                                <div>
                                    <p className={styles.qText}>{q.question_text}</p>
                                    <span className={styles.qMeta}>{typeLabel(q)} · {q.points} б. · новый</span>
                                </div>
                            </div>
                            <div className={styles.qActions}>
                                <button className="btn btn-outline" onClick={() => openEditNew(q, idx)}>
                                    Изменить
                                </button>
                                <button className="btn btn-danger" onClick={() => removeNew(idx)}>
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* редактор */}
                    {editing && (
                        <div className={styles.editor}>
                            <h4 className={styles.editorTitle}>
                                {editingSavedId !== null
                                    ? 'Редактирование вопроса'
                                    : editingNewIdx !== null
                                        ? 'Редактирование вопроса'
                                        : 'Новый вопрос'}
                            </h4>

                            <div className={styles.editorRow}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Тип</label>
                                    <select value={editing.type} onChange={e => handleQField('type', e.target.value)}>
                                        {TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ width: 90 }}>
                                    <label>Баллы</label>
                                    <input type="number" min={1} value={editing.points}
                                        onChange={e => handleQField('points', Number(e.target.value))} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Текст вопроса *</label>
                                <textarea rows={2} value={editing.question_text}
                                    onChange={e => handleQField('question_text', e.target.value)}
                                    placeholder="Введите вопрос..." />
                            </div>

                            {editing.type !== 'text' && (
                                <div className={styles.options}>
                                    <label className={styles.optionsLabel}>
                                        Варианты ответа
                                        <span className={styles.optionsHint}>
                                            {editing.type === 'single_choice'
                                                ? '— выберите один верный'
                                                : '— выберите все верные'}
                                        </span>
                                    </label>

                                    {editing.options.map((opt, i) => (
                                        <div key={i} className={styles.optionRow}>
                                            {editing.type === 'single_choice' ? (
                                                <input type="radio" checked={opt.is_correct}
                                                    onChange={() => handleOptionCorrect(i)} />
                                            ) : (
                                                <input type="checkbox" checked={opt.is_correct}
                                                    onChange={() => handleOptionCorrect(i)} />
                                            )}
                                            <input
                                                className={styles.optionInput}
                                                value={opt.text}
                                                onChange={e => handleOptionText(i, e.target.value)}
                                                placeholder={`Вариант ${i + 1}`}
                                            />
                                            {editing.options.length > 2 && (
                                                <button className={styles.removeOpt} onClick={() => removeOption(i)}>✕</button>
                                            )}
                                        </div>
                                    ))}

                                    <button className="btn btn-outline" onClick={addOption}
                                        style={{ marginTop: 8, width: 'auto', fontSize: 13 }}>
                                        + Добавить вариант
                                    </button>
                                </div>
                            )}

                            <div className={styles.editorFooter}>
                                <button className="btn btn-outline" onClick={cancelEditing}>Отмена</button>
                                <button className={`btn btn-primary ${styles.saveBtn}`} onClick={saveQuestion}>
                                    Сохранить вопрос
                                </button>
                            </div>
                        </div>
                    )}

                    {!editing && (
                        <button className={`btn btn-outline ${styles.addQBtn}`} onClick={openNewQuestion}>
                            + Добавить вопрос
                        </button>
                    )}
                </div>

                {error && <p className="page-error">{error}</p>}

                <div className={styles.submitRow}>
                    <button
                        className={`btn btn-primary ${styles.submitBtn}`}
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default EditTest;
