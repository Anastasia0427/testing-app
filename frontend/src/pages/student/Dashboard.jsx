import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import TestCard from '../../components/TestCard';
import { getMyAssignments } from '../../api/attempts';
import styles from './Dashboard.module.css';

const StudentDashboard = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getMyAssignments()
            .then(res => setAssignments(res.data))
            .catch(() => setError('Не удалось загрузить тесты'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Layout>
            <div className={styles.page}>
                <h2 className={styles.heading}>Мои тесты</h2>

                {loading && <p className={styles.hint}>Загрузка...</p>}
                {error && <div className="page-error">{error}</div>}

                {!loading && !error && assignments.length === 0 && (
                    <p className={styles.hint}>Вам пока не назначено ни одного теста.</p>
                )}

                <div className={styles.grid}>
                    {assignments.map(a => (
                        <TestCard key={a.asgn_id} assignment={a} />
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default StudentDashboard;
