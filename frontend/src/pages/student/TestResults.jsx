import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/Layout';
import { getAttempt } from '../../api/attempts';
import { checkAnswer as sandboxCheck } from '../../api/sandbox';
import styles from './TestResults.module.css';

const TestResults = () => {
    const { id: testId, attemptId } = useParams();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sqlResults, setSqlResults] = useState({});

    useEffect(() => {
        getAttempt(attemptId)
            .then(res => setAttempt(res.data))
            .catch(() => setError('Не удалось загрузить результаты'))
            .finally(() => setLoading(false));
    }, [attemptId]);

    useEffect(() => {
        if (!attempt) return;
        const sqlSels = attempt.selections.filter(
            s => s.question?.type?.type === 'sql_code'
                && s.answer_text?.trim()
                && s.question.reference_sql
                && s.question.schema_name
        );
        if (sqlSels.length === 0) return;
        Promise.all(
            sqlSels.map(s =>
                sandboxCheck(s.answer_text, s.question_id)
                    .then(res => ({ qid: s.question_id, correct: res.data.correct }))
                    .catch(() => ({ qid: s.question_id, correct: false }))
            )
        ).then(results => {
            setSqlResults(Object.fromEntries(results.map(r => [r.qid, r.correct])));
        });
    }, [attempt]);

    if (loading) return <Layout><p className={styles.hint}>Загрузка...</p></Layout>;
    if (error) return <Layout><div className="page-error">{error}</div></Layout>;

    const { score, assignment, selections } = attempt;
    const test = assignment?.test;
    const passed = test?.pass_score ? score >= test.pass_score : null;

    const isMultiChoice = (s) => s.question?.type?.type === 'multiple_choice';
    const isTextQuestion = (s) => s.question?.type?.type === 'text';
    const isSqlQuestion  = (s) => s.question?.type?.type === 'sql_code';

    const getMultiState = (s) => {
        if (!s.answer_text) return 'unanswered';
        let ids = [];
        try { ids = JSON.parse(s.answer_text); } catch { return 'unanswered'; }
        if (ids.length === 0) return 'unanswered';
        const correctIds = s.question?.options?.filter(o => o.is_correct).map(o => o.option_id) ?? [];
        const noWrong = ids.every(id => correctIds.includes(id));
        if (!noWrong) return 'incorrect';
        const allCorrect = correctIds.every(id => ids.includes(id));
        return allCorrect ? 'correct' : 'partial';
    };

    const correct = selections.filter(s => {
        if (isTextQuestion(s)) return false;
        if (isSqlQuestion(s)) return sqlResults[s.question_id] === true;
        if (isMultiChoice(s)) return getMultiState(s) === 'correct';
        return s.selected_option?.is_correct === true;
    }).length;
    const partial = selections.filter(s => {
        if (isTextQuestion(s) || isSqlQuestion(s) || !isMultiChoice(s)) return false;
        return getMultiState(s) === 'partial';
    }).length;
    const incorrect = selections.filter(s => {
        if (isTextQuestion(s)) return false;
        if (isSqlQuestion(s)) return !!s.answer_text?.trim() && sqlResults[s.question_id] === false;
        if (isMultiChoice(s)) return getMultiState(s) === 'incorrect';
        return s.selected_option != null && !s.selected_option.is_correct;
    }).length;
    const unanswered = selections.filter(s => {
        if (isTextQuestion(s)) return false;
        if (isSqlQuestion(s)) return !s.answer_text?.trim();
        if (isMultiChoice(s)) {
            if (!s.answer_text) return true;
            try { return JSON.parse(s.answer_text).length === 0; } catch { return true; }
        }
        return !s.selected_option;
    }).length;

    const chartData = [
        { name: 'Верно', value: correct, fill: 'var(--success)' },
        { name: 'Частично', value: partial, fill: '#86efac' },
        { name: 'Неверно', value: incorrect, fill: 'var(--error)' },
        { name: 'Без ответа', value: unanswered, fill: '#DDD4F0' },
    ].filter(d => d.value > 0);

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{test?.title}</h2>
                    <div className={`${styles.scoreBadge} ${passed === true ? styles.passed : passed === false ? styles.failed : ''}`}>
                        {score}%
                    </div>
                    {passed !== null && (
                        <p className={styles.verdict}>{passed ? '✓ Тест сдан' : '✗ Тест не сдан'}</p>
                    )}
                </div>

                {chartData.length > 0 && (
                    <div className={styles.chart}>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" />
                                <Tooltip formatter={(val, name) => [`${val} вопр.`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className={styles.legend}>
                            {chartData.map((d, i) => (
                                <span key={i} className={styles.legendItem}>
                                    <span className={styles.dot} style={{ background: d.fill }} />
                                    {d.name}: {d.value}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className={styles.answers}>
                    <h3>Разбор ответов</h3>
                    {selections.filter(s => !isTextQuestion(s)).map((s, i) => {
                        const isSql = isSqlQuestion(s);
                        const isCorrect = s.selected_option?.is_correct;

                        let selectedIds = [];
                        let multiState = null;
                        if (isMultiChoice(s)) {
                            if (s.answer_text) {
                                try { selectedIds = JSON.parse(s.answer_text); } catch { selectedIds = []; }
                            }
                            multiState = getMultiState(s);
                        }

                        let cardStyle;
                        if (isSql) {
                            const ok = sqlResults[s.question_id];
                            cardStyle = ok === true ? styles.correct : ok === false ? styles.incorrect : styles.neutral;
                        } else if (isMultiChoice(s)) {
                            cardStyle = { correct: styles.correct, partial: styles.partial, incorrect: styles.incorrect, unanswered: styles.neutral }[multiState] ?? styles.neutral;
                        } else {
                            cardStyle = isCorrect ? styles.correct : styles.incorrect;
                        }

                        return (
                            <div key={s.answer_id} className={`${styles.answerCard} ${cardStyle}`}>
                                <p className={styles.qNum}>Вопрос {i + 1}</p>
                                <p className={styles.qText}>{s.question?.question_text}</p>

                                {/* sql_code */}
                                {isSql && (s.answer_text
                                    ? <>
                                        <pre className={styles.sqlCode}>{s.answer_text}</pre>
                                        {sqlResults[s.question_id] !== undefined && (
                                            <p className={styles.answer}>
                                                <span className={styles.mark}>
                                                    {sqlResults[s.question_id] ? '✓ Верно' : '✗ Неверно'}
                                                </span>
                                            </p>
                                        )}
                                    </>
                                    : <p className={`${styles.answer} ${styles.skipped}`}>Ответ не дан</p>
                                )}

                                {/* single choice */}
                                {!isSql && !isMultiChoice(s) && s.selected_option && (
                                    <>
                                        <p className={styles.answer}>
                                            Ваш ответ: <strong>{s.selected_option.option_text}</strong>
                                            <span className={styles.mark}>{isCorrect ? ' ✓' : ' ✗'}</span>
                                        </p>
                                        {!isCorrect && (() => {
                                            const correct = s.question?.options?.find(o => o.is_correct);
                                            return correct ? (
                                                <p className={styles.correctAnswer}>
                                                    Правильный ответ: <strong>{correct.option_text}</strong>
                                                </p>
                                            ) : null;
                                        })()}
                                    </>
                                )}

                                {/* multiple choice */}
                                {!isSql && isMultiChoice(s) && (
                                    <div className={styles.answer}>
                                        {selectedIds.length === 0
                                            ? <p className={styles.skipped}>Ответ не дан</p>
                                            : <>
                                                <span>Ваш ответ: <span className={styles.mark}>
                                                    {multiState === 'correct' ? '✓' : multiState === 'partial' ? '~ частично верно' : '✗'}
                                                </span></span>
                                                <ul className={styles.multiList}>
                                                    {selectedIds.map(id => {
                                                        const opt = s.question?.options?.find(o => o.option_id === id);
                                                        return (
                                                            <li key={id} className={styles.multiCorrect}>
                                                                {opt?.option_text ?? `Вариант ${id}`}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                                {multiState === 'partial' && (() => {
                                                    const missed = s.question?.options?.filter(o => o.is_correct && !selectedIds.includes(o.option_id));
                                                    return missed?.length > 0 ? (
                                                        <div className={styles.correctAnswer}>
                                                            Пропущены:
                                                            <ul className={styles.multiList}>
                                                                {missed.map(o => <li key={o.option_id}>{o.option_text}</li>)}
                                                            </ul>
                                                        </div>
                                                    ) : null;
                                                })()}
                                                {multiState === 'incorrect' && (
                                                    <div className={styles.correctAnswer}>
                                                        Правильные варианты:
                                                        <ul className={styles.multiList}>
                                                            {s.question?.options?.filter(o => o.is_correct).map(o => (
                                                                <li key={o.option_id}>{o.option_text}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </>
                                        }
                                    </div>
                                )}

                                {!isSql && !isMultiChoice(s) && !s.selected_option && !s.answer_text && (
                                    <p className={`${styles.answer} ${styles.skipped}`}>Ответ не дан</p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {selections.some(s => isTextQuestion(s) && s.answer_text) && (
                    <div className={styles.textAnswers}>
                        <h3>Ответы на проверке у преподавателя</h3>
                        <p className={styles.textHint}>Эти ответы не влияют на автоматический результат.</p>
                        {selections.filter(s => isTextQuestion(s)).map((s, i) => (
                            <div key={s.answer_id} className={`${styles.answerCard} ${styles.text}`}>
                                <p className={styles.qNum}>Текстовый вопрос {i + 1}</p>
                                <p className={styles.qText}>{s.question?.question_text}</p>
                                <p className={styles.answer}>
                                    {s.answer_text
                                        ? <strong>{s.answer_text}</strong>
                                        : <span className={styles.skipped}>Ответ не дан</span>
                                    }
                                </p>
                                {s.teacher_comment && (
                                    <div className={styles.teacherComment}>
                                        <span className={styles.commentLabel}>Комментарий преподавателя:</span>
                                        <p>{s.teacher_comment}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <button className="btn btn-outline" onClick={() => navigate(`/student/tests/${testId}?asgn=${attempt.assignment?.asgn_id}`)}>
                    ← Назад к тесту
                </button>
            </div>
        </Layout>
    );
};

export default TestResults;
