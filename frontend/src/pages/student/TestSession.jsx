import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { submitAttempt } from '../../api/attempts';
import { getSchemaInfo, runQuery as sandboxRun, checkAnswer as sandboxCheck } from '../../api/sandbox';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import styles from './TestSession.module.css';

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const TestSession = () => {
    const { id } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();

    const { attempt_id, started_at, test } = state || {};
    const questions = test?.questions ?? [];
    const timeLimitSec = test?.time_limit ? test.time_limit * 60 : null;

    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // sql-вопросы: состояние per-question (run/check результаты)
    const [sqlState, setSqlState] = useState({});
    const [schemaInfoMap, setSchemaInfoMap] = useState({});

    // таймер
    const [timeLeft, setTimeLeft] = useState(() => {
        if (!timeLimitSec) return null;
        const elapsed = Math.floor((Date.now() - new Date(started_at).getTime()) / 1000);
        return Math.max(0, timeLimitSec - elapsed);
    });
    const submittingRef = useRef(false);

    const handleSubmit = useCallback(async () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        try {
            const payload = questions.map(q => {
                const a = answers[q.question_id] ?? {};
                const type = q.type?.type;
                if (type === 'multiple_choice') {
                    const ids = a.option_ids ?? [];
                    return {
                        question_id: q.question_id,
                        option_id: null,
                        answer_text: ids.length > 0 ? JSON.stringify(ids) : null
                    };
                }
                return {
                    question_id: q.question_id,
                    option_id: a.option_id ?? null,
                    answer_text: a.answer_text ?? null
                };
            });
            await submitAttempt(attempt_id, payload);
            navigate(`/student/tests/${id}/results/${attempt_id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка при отправке');
            submittingRef.current = false;
            setSubmitting(false);
        }
    }, [answers, questions, attempt_id, id, navigate]);

    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft === 0) {
            handleSubmit();
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, handleSubmit]);

    // загружаем схему при переходе на sql-вопрос
    useEffect(() => {
        const q = questions[current];
        if (q?.type?.type !== 'sql_code' || !q.schema_name) return;
        const schema = q.schema_name;
        if (schemaInfoMap[schema]) return;
        getSchemaInfo(schema)
            .then(res => setSchemaInfoMap(prev => ({ ...prev, [schema]: res.data })))
            .catch(() => {});
    }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!state) {
        navigate(-1);
        return null;
    }

    const question = questions[current];
    const qType = question?.type?.type;
    const answer = answers[question?.question_id] ?? {};

    const handleSingleChoice = (option_id) => {
        setAnswers(prev => ({ ...prev, [question.question_id]: { option_id } }));
    };

    const handleMultipleChoice = (option_id) => {
        const current_ids = answer.option_ids ?? [];
        const updated = current_ids.includes(option_id)
            ? current_ids.filter(i => i !== option_id)
            : [...current_ids, option_id];
        setAnswers(prev => ({ ...prev, [question.question_id]: { option_ids: updated } }));
    };

    const handleText = (answer_text) => {
        setAnswers(prev => ({ ...prev, [question.question_id]: { answer_text } }));
    };

    const setSqlQState = (qid, patch) =>
        setSqlState(prev => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));

    const handleSqlChange = (qid, value) =>
        setAnswers(prev => ({ ...prev, [qid]: { ...prev[qid], answer_text: value } }));

    const handleSqlRun = async (qid, sqlText, schema) => {
        if (!sqlText?.trim()) return;
        if (!schema) {
            setSqlQState(qid, { runError: 'Схема БД не указана для этого вопроса' });
            return;
        }
        setSqlQState(qid, { running: true, runResult: null, runError: '' });
        try {
            const { data } = await sandboxRun(sqlText, schema);
            setSqlQState(qid, { running: false, runResult: data });
        } catch (err) {
            setSqlQState(qid, { running: false, runError: err.response?.data?.error || 'Ошибка выполнения' });
        }
    };

    const handleSqlCheck = async (qid, sqlText) => {
        if (!sqlText?.trim()) return;
        setSqlQState(qid, { checking: true, checkResult: null, checkError: '' });
        try {
            const { data } = await sandboxCheck(sqlText, qid);
            setSqlQState(qid, { checking: false, checkResult: data });
        } catch (err) {
            setSqlQState(qid, { checking: false, checkError: err.response?.data?.error || 'Ошибка при проверке' });
        }
    };

    const isAnswered = (q) => {
        const a = answers[q.question_id];
        if (!a) return false;
        const type = q.type?.type;
        if (type === 'single_choice') return !!a.option_id;
        if (type === 'multiple_choice') return a.option_ids?.length > 0;
        if (type === 'text') return !!a.answer_text?.trim();
        if (type === 'sql_code') return !!a.answer_text?.trim();
        return false;
    };

    const isWarning = timeLeft !== null && timeLeft <= 60;

    // для sql-вопроса
    const qid = question?.question_id;
    const qSql = (qid && sqlState[qid]) || {};
    const schemaInfo = question?.schema_name ? schemaInfoMap[question.schema_name] : null;

    return (
        <div className={styles.layout}>
            {/* боковая панель */}
            <aside className={styles.sidebar}>
                <h4 className={styles.sidebarTitle}>Вопросы</h4>
                <div className={styles.navGrid}>
                    {questions.map((q, i) => (
                        <button
                            key={q.question_id}
                            className={`${styles.navBtn} ${i === current ? styles.navActive : ''} ${isAnswered(q) ? styles.navAnswered : ''}`}
                            onClick={() => setCurrent(i)}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                {timeLeft !== null && (
                    <div className={`${styles.timer} ${isWarning ? styles.timerWarning : ''}`}>
                        ⏱ {formatTime(timeLeft)}
                    </div>
                )}

                <button
                    className={`btn btn-primary ${styles.submitBtn}`}
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? 'Отправка...' : 'Завершить тест'}
                </button>
                {error && <p className={styles.error}>{error}</p>}
            </aside>

            {/* основной контент */}
            <main className={styles.main}>
                <div className={styles.progress}>
                    Вопрос {current + 1} из {questions.length}
                </div>

                <div className={styles.card}>
                    <p className={styles.questionText}>{question.question_text}</p>

                    {qType === 'single_choice' && (
                        <div className={styles.options}>
                            {question.options.map(opt => (
                                <label key={opt.option_id} className={`${styles.option} ${answer.option_id === opt.option_id ? styles.optionSelected : ''}`}>
                                    <input
                                        type="radio"
                                        name={`q_${question.question_id}`}
                                        checked={answer.option_id === opt.option_id}
                                        onChange={() => handleSingleChoice(opt.option_id)}
                                    />
                                    {opt.option_text}
                                </label>
                            ))}
                        </div>
                    )}

                    {qType === 'multiple_choice' && (
                        <div className={styles.options}>
                            {question.options.map(opt => (
                                <label key={opt.option_id} className={`${styles.option} ${(answer.option_ids ?? []).includes(opt.option_id) ? styles.optionSelected : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={(answer.option_ids ?? []).includes(opt.option_id)}
                                        onChange={() => handleMultipleChoice(opt.option_id)}
                                    />
                                    {opt.option_text}
                                </label>
                            ))}
                        </div>
                    )}

                    {qType === 'text' && (
                        <textarea
                            className={styles.textarea}
                            rows={5}
                            placeholder="Введите ваш ответ..."
                            value={answer.answer_text ?? ''}
                            onChange={e => handleText(e.target.value)}
                        />
                    )}

                    {qType === 'sql_code' && (
                        <div className={styles.sqlSection}>
                            {schemaInfo && (
                                <details className={styles.schemaPanel}>
                                    <summary className={styles.schemaSummary}>
                                        Схема БД: <strong>{question.schema_name}</strong>
                                    </summary>
                                    <div className={styles.schemaContent}>
                                        {Object.entries(schemaInfo).map(([table, cols]) => (
                                            <div key={table} className={styles.schemaTableBlock}>
                                                <p className={styles.schemaTableName}>{table}</p>
                                                <table className={styles.schemaCols}>
                                                    <thead>
                                                        <tr><th>Столбец</th><th>Тип</th><th>Связь</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {cols.map(col => (
                                                            <tr key={col.column}>
                                                                <td>{col.primary_key ? '🔑 ' : ''}{col.column}</td>
                                                                <td>{col.type}</td>
                                                                <td>{col.fk_ref && <span className={styles.fkRef}>→ {col.fk_ref}</span>}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            <CodeMirror
                                value={answer.answer_text ?? ''}
                                onChange={v => handleSqlChange(qid, v)}
                                extensions={[sql()]}
                                height="160px"
                                basicSetup={{ lineNumbers: true }}
                                className={styles.sqlEditor}
                            />

                            <div className={styles.sqlActions}>
                                <button className="btn btn-outline"
                                    onClick={() => handleSqlRun(qid, answer.answer_text, question.schema_name)}
                                    disabled={qSql.running || !answer.answer_text?.trim()}>
                                    {qSql.running ? '...' : '▶ Запустить'}
                                </button>
                                <button className={`btn btn-primary ${styles.checkBtn}`}
                                    onClick={() => handleSqlCheck(qid, answer.answer_text)}
                                    disabled={qSql.checking || !answer.answer_text?.trim()}>
                                    {qSql.checking ? '...' : '✓ Проверить ответ'}
                                </button>
                            </div>

                            {qSql.runError && <p className={styles.sqlError}>{qSql.runError}</p>}

                            {qSql.runResult && !qSql.runError && (
                                <div className={styles.sqlResultWrap}>
                                    <p className={styles.sqlResultLabel}>Результат ({qSql.runResult.rowCount} строк):</p>
                                    <div className={styles.sqlTableWrap}>
                                        <table className={styles.sqlTable}>
                                            <thead>
                                                <tr>{qSql.runResult.columns.map(c => <th key={c}>{c}</th>)}</tr>
                                            </thead>
                                            <tbody>
                                                {qSql.runResult.rows.map((row, i) => (
                                                    <tr key={i}>{qSql.runResult.columns.map(c => (
                                                        <td key={c}>{String(row[c] ?? '')}</td>
                                                    ))}</tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {qSql.checkError && <p className={styles.sqlError}>{qSql.checkError}</p>}

                            {qSql.checkResult && (
                                <div className={`${styles.sqlFeedback} ${qSql.checkResult.correct ? styles.sqlCorrect : styles.sqlWrong}`}>
                                    {qSql.checkResult.correct
                                        ? '✓ Правильно!'
                                        : '✗ Результаты не совпадают с эталоном'}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.nav}>
                    <button className="btn btn-outline" onClick={() => setCurrent(i => i - 1)} disabled={current === 0}>
                        ← Назад
                    </button>
                    {current < questions.length - 1 ? (
                        <button className="btn btn-outline" onClick={() => setCurrent(i => i + 1)}>
                            Вперёд →
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Отправка...' : 'Завершить тест'}
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TestSession;
