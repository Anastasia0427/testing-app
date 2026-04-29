import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { getMyAssignments } from '../../api/attempts';
import { updateProfile } from '../../api/users';
import styles from './Profile.module.css';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState(user?.name ?? '');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    useEffect(() => {
        getMyAssignments()
            .then(res => setAssignments(res.data))
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

    const allAttempts = assignments.flatMap(a => a.attempts ?? []);
    const finished = allAttempts.filter(a => a.finished_at);
    const avgScore = finished.length
        ? Math.round(finished.reduce((sum, a) => sum + a.score, 0) / finished.length)
        : null;
    const passed = assignments.filter(a => {
        const best = Math.max(...(a.attempts?.filter(at => at.finished_at).map(at => at.score) ?? [-1]));
        return a.test?.pass_score && best >= a.test.pass_score;
    }).length;

    const chartData = avgScore !== null
        ? [{ name: 'Средний балл', value: avgScore, fill: 'var(--primary)' }]
        : [];

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
                        <span className={styles.role}>Студент</span>
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
                            <span className={styles.statValue}>{assignments.length}</span>
                            <span className={styles.statLabel}>Назначено тестов</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{finished.length}</span>
                            <span className={styles.statLabel}>Завершено попыток</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{passed}</span>
                            <span className={styles.statLabel}>Тестов сдано</span>
                        </div>
                        {avgScore !== null && (
                            <div className={`${styles.statCard} ${styles.statChart}`}>
                                <ResponsiveContainer width={80} height={80}>
                                    <RadialBarChart
                                        innerRadius={28}
                                        outerRadius={40}
                                        data={chartData}
                                        startAngle={90}
                                        endAngle={90 - 360 * avgScore / 100}
                                    >
                                        <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'var(--border)' }} />
                                        <Tooltip formatter={v => [`${v}%`, 'Средний балл']} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div>
                                    <span className={styles.statValue}>{avgScore}%</span>
                                    <span className={styles.statLabel}>Средний балл</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* история тестов */}
                <div className={styles.history}>
                    <h3 className={styles.historyTitle}>История тестов</h3>

                    {loading && <p className={styles.hint}>Загрузка...</p>}
                    {!loading && assignments.length === 0 && <p className={styles.hint}>Тестов пока нет.</p>}

                    {assignments.map(a => {
                        const finishedAttempts = a.attempts?.filter(at => at.finished_at) ?? [];
                        const best = finishedAttempts.length
                            ? Math.max(...finishedAttempts.map(at => at.score))
                            : null;
                        const isPassed = best !== null && a.test?.pass_score && best >= a.test.pass_score;

                        return (
                            <div key={a.asgn_id} className={styles.testRow}>
                                <div className={styles.testInfo}>
                                    <span className={styles.testName}>{a.test?.title}</span>
                                    <span className={styles.testMeta}>
                                        {finishedAttempts.length} из {a.test?.max_attempts ?? '∞'} попыток
                                    </span>
                                </div>
                                <div className={styles.testRight}>
                                    {best !== null && (
                                        <span className={`${styles.bestScore} ${isPassed ? styles.scorePassed : styles.scoreFailed}`}>
                                            {best}%
                                        </span>
                                    )}
                                    {best === null && <span className={styles.noScore}>Не начат</span>}
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => navigate(`/student/tests/${a.test.test_id}?asgn=${a.asgn_id}`)}
                                    >
                                        Перейти
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

export default Profile;
