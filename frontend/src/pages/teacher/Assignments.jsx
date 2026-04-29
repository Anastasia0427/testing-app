import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getAssignments, createAssignment, deleteAssignment } from '../../api/assignments';
import { getMyTests } from '../../api/tests';
import { getStudents } from '../../api/users';
import styles from './Assignments.module.css';

const Assignments = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedTest = searchParams.get('test');

    const [assignments, setAssignments] = useState([]);
    const [tests, setTests] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // форма
    const [testId, setTestId] = useState(preselectedTest ?? '');
    const [studentId, setStudentId] = useState('');
    const [deadline, setDeadline] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [formError, setFormError] = useState('');

    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        Promise.all([getAssignments(), getMyTests(), getStudents()])
            .then(([aRes, tRes, sRes]) => {
                setAssignments(aRes.data);
                setTests(tRes.data);
                setStudents(sRes.data);
            })
            .finally(() => setLoading(false));
    }, []);

    // студенты, которым текущий тест ещё не назначен
    const availableStudents = students.filter(s =>
        !assignments.some(a => a.test?.test_id === Number(testId) && a.student?.user_id === s.user_id)
    );

    const handleAssign = async () => {
        if (!testId) return setFormError('Выберите тест');
        if (!studentId) return setFormError('Выберите студента');
        setFormError('');
        setAssigning(true);
        try {
            const res = await createAssignment({
                test_id:    Number(testId),
                student_id: Number(studentId),
                deadline:   deadline || null,
            });
            // добавляем в список с полными данными
            const test    = tests.find(t => t.test_id === Number(testId));
            const student = students.find(s => s.user_id === Number(studentId));
            setAssignments(prev => [...prev, { ...res.data, test, student, attempts: [] }]);
            setStudentId('');
            setDeadline('');
        } catch (err) {
            setFormError(err.response?.data?.error || 'Ошибка назначения');
        } finally {
            setAssigning(false);
        }
    };

    const handleDelete = async (asgn) => {
        if (!confirm(`Снять назначение теста «${asgn.test?.title}» у ${asgn.student?.email}?`)) return;
        setDeletingId(asgn.asgn_id);
        try {
            await deleteAssignment(asgn.asgn_id);
            setAssignments(prev => prev.filter(a => a.asgn_id !== asgn.asgn_id));
        } finally {
            setDeletingId(null);
        }
    };

    // группируем назначения по тесту
    const grouped = tests
        .map(t => ({
            test:  t,
            items: assignments.filter(a => a.test?.test_id === t.test_id),
        }))
        .filter(g => g.items.length > 0);

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <button className="btn btn-outline" onClick={() => navigate('/teacher/dashboard')}>
                        ← Назад
                    </button>
                    <h2 className={styles.heading}>Назначения</h2>
                </div>

                {/* форма назначения */}
                <div className={`card ${styles.formCard}`}>
                    <h3 className={styles.sectionTitle}>Назначить тест студенту</h3>

                    <div className={styles.formRow}>
                        <div className="form-group" style={{ flex: 2 }}>
                            <label>Тест</label>
                            <select value={testId} onChange={e => { setTestId(e.target.value); setStudentId(''); }}>
                                <option value="">— выберите тест —</option>
                                {tests.map(t => (
                                    <option key={t.test_id} value={t.test_id}>{t.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ flex: 2 }}>
                            <label>Студент</label>
                            <select value={studentId} onChange={e => setStudentId(e.target.value)}
                                disabled={!testId}>
                                <option value="">— выберите студента —</option>
                                {availableStudents.map(s => (
                                    <option key={s.user_id} value={s.user_id}>{s.email}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Дедлайн (необязательно)</label>
                            <input type="datetime-local" value={deadline}
                                onChange={e => setDeadline(e.target.value)} />
                        </div>
                    </div>

                    {formError && <p className="page-error" style={{ marginBottom: 12 }}>{formError}</p>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className={`btn btn-primary ${styles.assignBtn}`}
                            onClick={handleAssign}
                            disabled={assigning}
                        >
                            {assigning ? 'Назначение...' : 'Назначить'}
                        </button>
                    </div>
                </div>

                {/* список назначений */}
                {loading && <p className={styles.hint}>Загрузка...</p>}

                {!loading && grouped.length === 0 && (
                    <p className={styles.hint}>Назначений пока нет.</p>
                )}

                {!loading && grouped.map(({ test, items }) => (
                    <div key={test.test_id} className={`card ${styles.group}`}>
                        <h3 className={styles.groupTitle}>{test.title}</h3>

                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Студент</th>
                                    <th>Попыток</th>
                                    <th>Лучший балл</th>
                                    <th>Дедлайн</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(a => {
                                    const finished = a.attempts?.filter(at => at.finished_at) ?? [];
                                    const best = finished.length
                                        ? Math.max(...finished.map(at => at.score))
                                        : null;
                                    const passed = best !== null && test.pass_score && best >= test.pass_score;

                                    return (
                                        <tr key={a.asgn_id}>
                                            <td className={styles.email}>{a.student?.email}</td>
                                            <td>{finished.length} / {test.max_attempts ?? '∞'}</td>
                                            <td>
                                                {best !== null
                                                    ? <span className={passed ? styles.passed : styles.failed}>{best}%</span>
                                                    : <span className={styles.noScore}>—</span>}
                                            </td>
                                            <td className={styles.deadline}>
                                                {a.deadline
                                                    ? new Date(a.deadline).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
                                                    : '—'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {finished.length > 0 && (
                                                        <button
                                                            className="btn btn-outline"
                                                            onClick={() => navigate(`/teacher/attempts/${finished.at(-1).attempt_id}/review`)}
                                                            style={{ fontSize: 12, padding: '5px 12px', width: 'auto' }}
                                                        >
                                                            Ответы
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-danger"
                                                        onClick={() => handleDelete(a)}
                                                        disabled={deletingId === a.asgn_id}
                                                        style={{ fontSize: 12, padding: '5px 12px', width: 'auto' }}
                                                    >
                                                        Снять
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </Layout>
    );
};

export default Assignments;
