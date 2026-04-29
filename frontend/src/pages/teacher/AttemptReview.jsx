import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { reviewAttempt, gradeAttempt } from '../../api/attempts';
import styles from './AttemptReview.module.css';

const AttemptReview = () => {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [grades, setGrades] = useState({});
    const [comments, setComments] = useState({});
    const [saving, setSaving] = useState(false);
    const [savedScore, setSavedScore] = useState(null);

    useEffect(() => {
        reviewAttempt(attemptId)
            .then(res => setAttempt(res.data))
            .catch(() => setError('Не удалось загрузить попытку'))
            .finally(() => setLoading(false));
    }, [attemptId]);

    if (loading) return <Layout><p style={{ padding: 32 }}>Загрузка...</p></Layout>;
    if (error)   return <Layout><p className="page-error" style={{ margin: 32 }}>{error}</p></Layout>;

    const student    = attempt.assignment?.student;
    const test       = attempt.assignment?.test;
    const selections = attempt.selections ?? [];
    const questions  = test?.questions ?? [];

    const getName = (s) => s?.name || s?.email || '—';
    const getSelection = (qId) => selections.find(s => s.question_id === qId);

    const formatSpent = () => {
        if (!attempt.started_at || !attempt.finished_at) return null;
        const sec = Math.round((new Date(attempt.finished_at) - new Date(attempt.started_at)) / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m > 0 ? `${m} мин ${s} с` : `${s} с`;
    };
    const timeSpent = formatSpent();

    const textQuestions = questions.filter(q => q.type?.type === 'text');
    const hasText = textQuestions.length > 0;
    const allGraded = textQuestions.every(q => grades[q.question_id] != null);

    const setGrade = (qId, value) =>
        setGrades(prev => ({ ...prev, [qId]: prev[qId] === value ? null : value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const text_grades = {};
            textQuestions.forEach(q => { text_grades[q.question_id] = grades[q.question_id] ?? false; });
            const { data } = await gradeAttempt(attemptId, text_grades, comments);
            setSavedScore(data.score);
        } catch {
            alert('Ошибка при сохранении оценки');
        } finally {
            setSaving(false);
        }
    };

    const currentScore = savedScore ?? attempt.score;

    return (
        <Layout>
            <div className={styles.page}>

                {/* заголовок */}
                <div className={styles.pageHeader}>
                    <button className="btn btn-outline" onClick={() => navigate(-1)}>← Назад</button>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.heading}>Проверка ответов</h2>
                        <p className={styles.meta}>
                            {test?.title} · {getName(student)}
                            {attempt.finished_at && ` · ${new Date(attempt.finished_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}`}
                        </p>
                    </div>
                    <div className={styles.scoreBlock}>
                        <span className={styles.score}>
                            {currentScore}%
                            {savedScore !== null && <span className={styles.updatedBadge}>обновлено</span>}
                        </span>
                        {timeSpent && <span className={styles.timeSpent}>⏱ {timeSpent}</span>}
                    </div>
                </div>

                {/* все вопросы по порядку */}
                <div className={`card ${styles.section}`}>
                    {questions.map((q, idx) => {
                        const sel = getSelection(q.question_id);
                        const qType = q.type?.type;
                        const isText = qType === 'text';
                        const isMulti = qType === 'multiple_choice';
                        const grade = grades[q.question_id];

                        let selectedIds = [];
                        if (isMulti && sel?.answer_text) {
                            try { selectedIds = JSON.parse(sel.answer_text); } catch { selectedIds = []; }
                        }

                        return (
                            <div key={q.question_id} className={styles.qBlock}>
                                <div className={styles.qHeader}>
                                    <div className={styles.qMeta}>
                                        <span className={styles.qNum}>Вопрос {idx + 1}</span>
                                        <span className={styles.qPts}>{q.points} б.</span>
                                        <span className={styles.qType}>
                                            {isText ? 'открытый' : isMulti ? 'несколько вариантов' : 'один вариант'}
                                        </span>
                                    </div>
                                    {isText && (
                                        <div className={styles.gradeButtons}>
                                            <button
                                                className={`${styles.gradeBtn} ${grade === true ? styles.gradeBtnCorrect : ''}`}
                                                onClick={() => setGrade(q.question_id, true)}
                                            >
                                                ✓ Верно
                                            </button>
                                            <button
                                                className={`${styles.gradeBtn} ${grade === 'partial' ? styles.gradeBtnPartial : ''}`}
                                                onClick={() => setGrade(q.question_id, 'partial')}
                                            >
                                                ~ Частично
                                            </button>
                                            <button
                                                className={`${styles.gradeBtn} ${grade === false ? styles.gradeBtnWrong : ''}`}
                                                onClick={() => setGrade(q.question_id, false)}
                                            >
                                                ✗ Неверно
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className={styles.qText}>{q.question_text}</p>

                                {/* текстовый ответ */}
                                {isText && (
                                    <>
                                        <div className={`${styles.answer} ${grade === true ? styles.answerCorrect : grade === false ? styles.answerWrong : grade === 'partial' ? styles.answerPartial : ''}`}>
                                            {sel?.answer_text
                                                ? <p className={styles.answerText}>{sel.answer_text}</p>
                                                : <p className={styles.noAnswer}>Ответ не дан</p>}
                                        </div>
                                        <textarea
                                            className={styles.commentInput}
                                            placeholder="Комментарий для студента (необязательно)"
                                            value={comments[q.question_id] ?? ''}
                                            onChange={e => setComments(prev => ({ ...prev, [q.question_id]: e.target.value }))}
                                            rows={2}
                                        />
                                    </>
                                )}

                                {/* варианты */}
                                {!isText && (
                                    <div className={styles.options}>
                                        {q.options?.map(opt => {
                                            const isSelected = isMulti
                                                ? selectedIds.includes(opt.option_id)
                                                : sel?.selected_option?.option_id === opt.option_id;
                                            return (
                                                <div key={opt.option_id} className={[
                                                    styles.option,
                                                    opt.is_correct ? styles.optCorrect : '',
                                                    isSelected && !opt.is_correct ? styles.optWrong : '',
                                                ].join(' ')}>
                                                    <span className={styles.optMark}>{isSelected ? '●' : '○'}</span>
                                                    {opt.option_text}
                                                    {opt.is_correct && <span className={styles.correctBadge}>верный</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {hasText && (
                        <div className={styles.saveRow}>
                            {!allGraded && (
                                <p className={styles.saveHint}>Оцените все открытые вопросы перед сохранением</p>
                            )}
                            <button
                                className={`btn btn-primary ${styles.saveBtn}`}
                                onClick={handleSave}
                                disabled={saving || !allGraded}
                            >
                                {saving ? 'Сохранение...' : 'Сохранить оценку'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AttemptReview;
