import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { getMyTests } from '../../api/tests';
import { getAssignments } from '../../api/assignments';
import { updateProfile } from '../../api/users';
import styles from '../student/Profile.module.css';

const TeacherProfile = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState(user?.name ?? '');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    useEffect(() => {
        Promise.all([getMyTests(), getAssignments()])
            .then(([tRes, aRes]) => {
                setTests(tRes.data);
                setAssignments(aRes.data);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSaveName = async () => {
        setSaving(true);
        setSaveMsg('');
        try {
            const { data } = await updateProfile({ name });
            updateUser({ name: data.name });
            setSaveMsg('Сохранено');
            setTimeout(() => setSaveMsg(''), 2000);
        } catch {
            setSaveMsg('Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const uniqueStudents = new Set(assignments.map(a => a.student?.user_id)).size;
    const completedAttempts = assignments.reduce(
        (sum, a) => sum + (a.attempts?.filter(at => at.finished_at).length ?? 0), 0
    );

    return (
        <Layout>
            <div className={styles.page}>

                {/* профиль */}
                <div className={styles.card}>
                    <div className={styles.avatar}>
                        {(user?.name ?? user?.email)?.[0]?.toUpperCase()}
                    </div>
                    <div className={styles.info}>
                        {user?.name && <h2 className={styles.email}>{user.name}</h2>}
                        <p className={user?.name ? styles.subEmail : styles.email}>{user?.email}</p>
                        <span className={styles.role}>Преподаватель</span>
                    </div>
                </div>

                {/* редактирование имени */}
                <div className={styles.history}>
                    <h3 className={styles.historyTitle}>Настройки профиля</h3>
                    <div className={styles.nameRow}>
                        <input
                            className={styles.nameInput}
                            placeholder="Введите имя"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                        />
                        <button className="btn btn-outline" onClick={handleSaveName} disabled={saving}>
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        {saveMsg && <span className={styles.saveMsg}>{saveMsg}</span>}
                    </div>
                </div>

                {/* статистика */}
                {!loading && (
                    <div className={styles.stats}>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{tests.length}</span>
                            <span className={styles.statLabel}>Тестов создано</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{assignments.length}</span>
                            <span className={styles.statLabel}>Назначений выдано</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{uniqueStudents}</span>
                            <span className={styles.statLabel}>Студентов</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{completedAttempts}</span>
                            <span className={styles.statLabel}>Попыток завершено</span>
                        </div>
                    </div>
                )}

                {/* список тестов */}
                <div className={styles.history}>
                    <h3 className={styles.historyTitle}>Мои тесты</h3>

                    {loading && <p className={styles.hint}>Загрузка...</p>}
                    {!loading && tests.length === 0 && <p className={styles.hint}>Тестов пока нет.</p>}

                    {tests.map(t => {
                        const testAssignments = assignments.filter(a => a.test?.test_id === t.test_id);
                        const completed = testAssignments.filter(a =>
                            a.attempts?.some(at => at.finished_at)
                        ).length;

                        return (
                            <div key={t.test_id} className={styles.testRow}>
                                <div className={styles.testInfo}>
                                    <span className={styles.testName}>{t.title}</span>
                                    <span className={styles.testMeta}>
                                        {testAssignments.length} студентов · {completed} завершили
                                        {t.pass_score ? ` · порог ${t.pass_score}%` : ''}
                                    </span>
                                </div>
                                <div className={styles.testRight}>
                                    <button
                                        className="btn btn-outline"
                                        style={{ width: 140 }}
                                        onClick={() => navigate(`/teacher/tests/${t.test_id}/edit`)}
                                    >
                                        Редактировать
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        style={{ width: 140 }}
                                        onClick={() => navigate(`/teacher/assignments?test=${t.test_id}`)}
                                    >
                                        Назначения
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
};

export default TeacherProfile;
