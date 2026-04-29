import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getMyAssignments, startAttempt } from '../../api/attempts';
import styles from './TestDetail.module.css';

const SERVER = 'http://localhost:3000';

const TestDetail = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const asgnId = Number(searchParams.get('asgn'));
    const navigate = useNavigate();

    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getMyAssignments()
            .then(res => {
                const found = res.data.find(a => a.asgn_id === asgnId);
                if (!found) setError('Тест не найден');
                else setAssignment(found);
            })
            .catch(() => setError('Ошибка загрузки'))
            .finally(() => setLoading(false));
    }, [asgnId]);

    const handleStart = async () => {
        setStarting(true);
        try {
            const res = await startAttempt(asgnId);
            navigate(`/student/tests/${id}/session`, {
                state: { attempt_id: res.data.attempt_id, started_at: res.data.started_at, test: res.data.test }
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Не удалось начать тест');
            setStarting(false);
        }
    };

    if (loading) return <Layout><p className={styles.hint}>Загрузка...</p></Layout>;
    if (error) return <Layout><div className="page-error">{error}</div></Layout>;

    const { test, attempts, deadline } = assignment;
    const attemptsUsed = attempts?.length ?? 0;
    const attemptsLeft = test.max_attempts ? test.max_attempts - attemptsUsed : null;
    const canStart = attemptsLeft === null || attemptsLeft > 0;
    const coverUrl = test.cover_image ? `${SERVER}${test.cover_image}` : `${SERVER}/images/default-cover.png`;

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.cover}>
                    <img src={coverUrl} alt={test.title} />
                </div>

                <div className={styles.content}>
                    <h2 className={styles.title}>{test.title}</h2>
                    {test.description && <p className={styles.desc}>{test.description}</p>}

                    <div className={styles.meta}>
                        {test.pass_score && <div className={styles.metaItem}><span>Проходной балл</span><strong>{test.pass_score}%</strong></div>}
                        {test.max_attempts && <div className={styles.metaItem}><span>Попыток</span><strong>{attemptsUsed} / {test.max_attempts}</strong></div>}
                        {test.time_limit && <div className={styles.metaItem}><span>Ограничение времени</span><strong>{test.time_limit}</strong></div>}
                        {deadline && <div className={styles.metaItem}><span>Дедлайн</span><strong>{new Date(deadline).toLocaleDateString('ru-RU')}</strong></div>}
                    </div>

                    {attempts?.length > 0 && (
                        <div className={styles.history}>
                            <h3>История попыток</h3>
                            {attempts.map((a, i) => (
                                <div key={a.attempt_id} className={styles.attemptRow}>
                                    <span>Попытка {i + 1}</span>
                                    <span>{a.finished_at ? (a.score !== null ? `${Math.round(a.score)}%` : 'На проверке') : 'Не завершена'}</span>
                                    {a.finished_at && (
                                        <button
                                            className={`btn btn-outline ${styles.viewBtn}`}
                                            onClick={() => navigate(`/student/tests/${id}/results/${a.attempt_id}`)}
                                        >
                                            Результаты
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {error && <div className="page-error">{error}</div>}

                    <button
                        className="btn btn-primary"
                        onClick={handleStart}
                        disabled={!canStart || starting}
                    >
                        {starting ? 'Загрузка...' : canStart ? 'Начать тест' : 'Попытки исчерпаны'}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default TestDetail;
