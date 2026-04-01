const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const { getMyAssignments, startAttempt, submitAttempt, getAttempt } = require('../controllers/attemptController');

router.use(authMiddleware);
router.use(roleMiddleware('student'));

router.get('/assignments', asyncHandler(getMyAssignments));
router.post('/', asyncHandler(startAttempt));
router.post('/:id/submit', asyncHandler(submitAttempt));
router.get('/:id', asyncHandler(getAttempt));

module.exports = router;
