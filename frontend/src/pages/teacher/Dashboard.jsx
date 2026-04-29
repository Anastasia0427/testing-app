import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getMyTests, deleteTest } from '../../api/tests';
import styles from './Dashboard.module.css';

const SERVER = 'http://localhost:3000';

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        getMyTests()
            .then(res => setTests(res.data))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (test) => {
        if (!confirm(`Удалить тест «${test.title}»? Это действие необратимо.`)) return;
        setDeletingId(test.test_id);
        try {
            await deleteTest(test.test_id);
            setTests(prev => prev.filter(t => t.test_id !== test.test_id));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.header}>
                    <h2 className={styles.heading}>Мои тесты</h2>
                    <button
                        className={`btn btn-primary ${styles.createBtn}`}
                        onClick={() => navigate('/teacher/tests/create')}
                    >
                        + Создать тест
                    </button>
                </div>

                {loading && <p className={styles.hint}>Загрузка...</p>}

                {!loading && tests.length === 0 && (
                    <div className={styles.empty}>
                        <p>У вас ещё нет тестов.</p>
                        <button
                            className="btn btn-outline"
                            onClick={() => navigate('/teacher/tests/create')}
                        >
                            Создать первый тест
                        </button>
                    </div>
                )}

                {!loading && tests.length > 0 && (
                    <div className={styles.list}>
                        {tests.map(test => (
                            <div key={test.test_id} className={styles.testCard}>
                                <div className={styles.cover}>
                                    <img
                                        src={test.cover_image ? `${SERVER}${test.cover_image}` : `${SERVER}/images/default-cover.png`}
                                        alt={test.title}
                                    />
                                </div>

                                <div className={styles.cardBody}>
                                    <div className={styles.cardTop}>
                                        <span className={`${styles.badge} ${test.is_active ? styles.active : styles.inactive}`}>
                                            {test.is_active ? 'Активен' : 'Неактивен'}
                                        </span>
                                    </div>

                                    <h3 className={styles.testTitle}>{test.title}</h3>

                                    {test.description && (
                                        <p className={styles.testDesc}>{test.description}</p>
                                    )}

                                    <div className={styles.meta}>
                                        {test.pass_score != null && (
                                            <span className={styles.metaItem}>Порог: {test.pass_score}%</span>
                                        )}
                                        {test.max_attempts != null && (
                                            <span className={styles.metaItem}>Попыток: {test.max_attempts}</span>
                                        )}
                                        {test.time_limit != null && (
                                            <span className={styles.metaItem}>Время: {test.time_limit} мин</span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.cardActions}>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => navigate(`/teacher/tests/${test.test_id}/edit`)}
                                    >
                                        Редактировать
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => navigate(`/teacher/assignments?test=${test.test_id}`)}
                                    >
                                        Назначить
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleDelete(test)}
                                        disabled={deletingId === test.test_id}
                                    >
                                        {deletingId === test.test_id ? '...' : 'Удалить'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default TeacherDashboard;
