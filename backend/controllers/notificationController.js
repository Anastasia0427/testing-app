const notificationService = require('../services/notificationService');

const getNotifications = async (req, res) => {
    const notifications = await notificationService.getNotifications(req.user.user_id);
    res.json(notifications);
};

const markRead = async (req, res) => {
    await notificationService.markRead(req.params.id, req.user.user_id);
    res.json({ ok: true });
};

const markAllRead = async (req, res) => {
    await notificationService.markAllRead(req.user.user_id);
    res.json({ ok: true });
};

module.exports = { getNotifications, markRead, markAllRead };
