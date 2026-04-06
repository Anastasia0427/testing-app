import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { submitAttempt } from '../../api/attempts';
import styles from './TestSession.module.css';

const TestSession = () => {
    const { id } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();

    const { attempt_id, test } = state || {};
    const questions = test?.questions ?? [];

    const [current, setCurrent] = useState(0);
    // answers: { [question_id]: { option_id?, answer_text? } }
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

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
            ? current_ids.filter(id => id !== option_id)
            : [...current_ids, option_id];
        setAnswers(prev => ({ ...prev, [question.question_id]: { option_ids: updated } }));
    };

    const handleText = (answer_text) => {
        setAnswers(prev => ({ ...prev, [question.question_id]: { answer_text } }));
    };

    const isAnswered = (q) => {
        const a = answers[q.question_id];
        if (!a) return false;
        const type = q.type?.type;
        if (type === 'single_choice') return !!a.option_id;
        if (type === 'multiple_choice') return a.option_ids?.length > 0;
        if (type === 'text') return !!a.answer_text?.trim();
        return false;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = questions.map(q => {
                const a = answers[q.question_id] ?? {};
                const type = q.type?.type;
                if (type === 'multiple_choice') {
                    // сериализуем все выбранные варианты в answer_text
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
            setSubmitting(false);
        }
    };

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

                    {/* single choice */}
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

                    {/* multiple choice */}
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

                    {/* text */}
                    {qType === 'text' && (
                        <textarea
                            className={styles.textarea}
                            rows={5}
                            placeholder="Введите ваш ответ..."
                            value={answer.answer_text ?? ''}
                            onChange={e => handleText(e.target.value)}
                        />
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
