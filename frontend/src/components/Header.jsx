import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import profileIcon from '../assets/icons/profile_icon.svg';
import NotificationBell from './NotificationBell';
import styles from './Header.module.css';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    const isTeacher = user?.role?.role === 'teacher';

    // закрываем dropdown при клике вне него
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link to={isTeacher ? '/teacher/dashboard' : '/student/dashboard'} className={styles.logo}>
                    TestSQL
                </Link>

                <nav className={styles.nav}>
                    {isTeacher ? (
                        <>
                            <Link to="/teacher/dashboard">Мои тесты</Link>
                            <Link to="/teacher/assignments">Назначения</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/student/dashboard">Тесты</Link>
                        </>
                    )}
                </nav>

                <NotificationBell />

                <div className={styles.profileWrapper} ref={dropdownRef}>
                    <button className={styles.profileBtn} onClick={() => setOpen(v => !v)}>
                        <img src={profileIcon} alt="Профиль" className={styles.profileIcon} />
                    </button>

                    {open && (
                        <div className={styles.dropdown}>
                            <p className={styles.dropdownEmail}>{user?.email}</p>
                            <hr className={styles.divider} />
                            <Link
                                to={isTeacher ? '/teacher/profile' : '/student/profile'}
                                className={styles.dropdownItem}
                                onClick={() => setOpen(false)}
                            >
                                Мой профиль
                            </Link>
                            <button className={styles.dropdownLogout} onClick={handleLogout}>
                                Выйти
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
