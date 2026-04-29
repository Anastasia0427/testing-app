import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import styles from './NotificationBell.module.css';

const BellIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const formatTime = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();

    const load = useCallback(async () => {
        try {
            const { data } = await getNotifications();
            setNotifications(data);
        } catch {}
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [load]);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unread = notifications.filter(n => !n.is_read).length;

    const handleClick = async (n) => {
        if (!n.is_read) {
            await markNotificationRead(n.notification_id).catch(() => {});
            setNotifications(prev =>
                prev.map(x => x.notification_id === n.notification_id ? { ...x, is_read: true } : x)
            );
        }
        setOpen(false);
        if (n.link) navigate(n.link);
    };

    const handleMarkAll = async () => {
        await markAllNotificationsRead().catch(() => {});
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    return (
        <div className={styles.wrapper} ref={ref}>
            <button
                className={`${styles.bell} ${open ? styles.bellActive : ''}`}
                onClick={() => setOpen(v => !v)}
                aria-label="Уведомления"
            >
                <BellIcon />
                {unread > 0 && (
                    <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>
                )}
            </button>

            {open && (
                <div className={styles.popup}>
                    <div className={styles.popupHeader}>
                        <span className={styles.popupTitle}>Уведомления</span>
                        {unread > 0 && (
                            <button className={styles.markAll} onClick={handleMarkAll}>
                                Прочитать все
                            </button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {notifications.length === 0 ? (
                            <p className={styles.empty}>Нет уведомлений</p>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.notification_id}
                                    className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
                                    onClick={() => handleClick(n)}
                                >
                                    <p className={styles.msg}>{n.message}</p>
                                    <span className={styles.time}>{formatTime(n.created_at)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
