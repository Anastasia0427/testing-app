const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController');

router.use(authMiddleware);

router.get('/', asyncHandler(getNotifications));
router.put('/read-all', asyncHandler(markAllRead));
router.put('/:id/read', asyncHandler(markRead));

module.exports = router;
