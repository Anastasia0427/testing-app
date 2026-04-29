const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const { getMyAssignments, startAttempt, submitAttempt, getAttempt, reviewAttempt, gradeAttempt } = require('../controllers/attemptController');

router.use(authMiddleware);

// только для учителя
router.get('/:id/review', roleMiddleware('teacher', 'admin'), asyncHandler(reviewAttempt));
router.post('/:id/grade', roleMiddleware('teacher', 'admin'), asyncHandler(gradeAttempt));

// только для студента
router.use(roleMiddleware('student'));
router.get('/assignments', asyncHandler(getMyAssignments));
router.post('/', asyncHandler(startAttempt));
router.post('/:id/submit', asyncHandler(submitAttempt));
router.get('/:id', asyncHandler(getAttempt));

module.exports = router;
