import { Link } from 'react-router-dom';
import styles from './TestCard.module.css';

const SERVER = 'http://localhost:3000';

const TestCard = ({ assignment }) => {
    const { test, attempts, asgn_id, deadline } = assignment;

    const coverUrl = test.cover_image
        ? `${SERVER}${test.cover_image}`
        : `${SERVER}/images/default-cover.png`;

    const lastAttempt = attempts?.at(-1);
    const attemptsUsed = attempts?.length ?? 0;
    const attemptsLeft = test.max_attempts ? test.max_attempts - attemptsUsed : null;
    const passed = lastAttempt && test.pass_score && lastAttempt.score >= test.pass_score;

    return (
        <Link to={`/student/tests/${test.test_id}?asgn=${asgn_id}`} className={styles.card}>
            <div className={styles.cover}>
                <img src={coverUrl} alt={test.title} />
                {passed && <span className={styles.badge}>Сдан</span>}
            </div>

            <div className={styles.body}>
                <h3 className={styles.title}>{test.title}</h3>
                {test.description && (
                    <p className={styles.desc}>{test.description}</p>
                )}

                <div className={styles.meta}>
                    {test.pass_score && (
                        <span>Проходной балл: {test.pass_score}%</span>
                    )}
                    {attemptsLeft !== null && (
                        <span>Попыток осталось: {attemptsLeft}</span>
                    )}
                    {deadline && (
                        <span>До: {new Date(deadline).toLocaleDateString('ru-RU')}</span>
                    )}
                </div>

                {lastAttempt?.score != null && (
                    <div className={styles.score}>
                        Последний результат: <strong>{lastAttempt.score}%</strong>
                    </div>
                )}
            </div>
        </Link>
    );
};

export default TestCard;
