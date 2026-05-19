const { Notification } = require('../models');

const getNotifications = (userId) =>
    Notification.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: 50
    });

const markRead = (notificationId, userId) =>
    Notification.update(
        { is_read: true },
        { where: { notification_id: notificationId, user_id: userId } }
    );

const markAllRead = (userId) =>
    Notification.update(
        { is_read: true },
        { where: { user_id: userId, is_read: false } }
    );

const create = (data) => Notification.create(data);

module.exports = { getNotifications, markRead, markAllRead, create };
