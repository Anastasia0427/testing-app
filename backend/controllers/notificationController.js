const { Notification } = require('../models');

const getNotifications = async (req, res) => {
    const notifications = await Notification.findAll({
        where: { user_id: req.user.user_id },
        order: [['created_at', 'DESC']],
        limit: 50
    });
    res.json(notifications);
};

const markRead = async (req, res) => {
    await Notification.update(
        { is_read: true },
        { where: { notification_id: req.params.id, user_id: req.user.user_id } }
    );
    res.json({ ok: true });
};

const markAllRead = async (req, res) => {
    await Notification.update(
        { is_read: true },
        { where: { user_id: req.user.user_id, is_read: false } }
    );
    res.json({ ok: true });
};

module.exports = { getNotifications, markRead, markAllRead };
