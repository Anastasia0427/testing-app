import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { getQuestionBank, deleteQuestion } from '../../api/questionBank';
import { getSchemas } from '../../api/sandbox';
import styles from './QuestionBank.module.css';

const QuestionBank = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [schemaLabels, setSchemaLabels] = useState({});
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');

    useEffect(() => {
        getSchemas()
            .then(res => {
                const map = {};
                for (const s of res.data) map[s.key] = s.display_name;
                setSchemaLabels(map);
            })
            .catch(() => {});

        getQuestionBank()
            .then(res => setQuestions(res.data))
            .catch(() => setError('Не удалось загрузить банк вопросов'))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id) => {
        if (!confirm('Удалить вопрос из банка?')) return;
        await deleteQuestion(id);
        setQuestions(prev => prev.filter(q => q.sq_id !== id));
    };

    if (loading) return <Layout><p className={styles.hint}>Загрузка...</p></Layout>;
    if (error)   return <Layout><p className="page-error" style={{ margin: 32 }}>{error}</p></Layout>;

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.header}>
                    <h2 className={styles.heading}>Банк SQL-вопросов</h2>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/teacher/question-bank/new')}
                    >
                        + Создать вопрос
                    </button>
                </div>

                {questions.length === 0 ? (
                    <div className={styles.empty}>
                        <p>Банк вопросов пуст. Создайте первый SQL-вопрос.</p>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {questions.map(q => {
                            const isOwn = q.author_id === user?.user_id;
                            return (
                                <div key={q.sq_id} className={styles.card}>
                                    <div className={styles.cardBody}>
                                        <div className={styles.cardTop}>
                                            <span className={`${styles.schemaBadge} ${styles[q.schema_name] ?? styles.custom}`}>
                                                {schemaLabels[q.schema_name] ?? q.schema_name}
                                            </span>
                                            {isOwn && <span className={styles.ownBadge}>мой</span>}
                                        </div>
                                        <p className={styles.title}>{q.title}</p>
                                        <p className={styles.desc}>{q.question_text}</p>
                                        <p className={styles.meta}>
                                            {q.author?.name || q.author?.email} ·{' '}
                                            {new Date(q.created_at).toLocaleDateString('ru-RU')}
                                        </p>
                                    </div>
                                    <div className={styles.cardActions}>
                                        {isOwn && (
                                            <>
                                                <button
                                                    className="btn btn-outline"
                                                    onClick={() => navigate(`/teacher/question-bank/${q.sq_id}/edit`)}
                                                >
                                                    Редактировать
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={() => handleDelete(q.sq_id)}
                                                >
                                                    Удалить
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default QuestionBank;
