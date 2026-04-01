const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const { createAssignment, getAssignments, deleteAssignment } = require('../controllers/assignmentController');

router.use(authMiddleware);
router.use(roleMiddleware('teacher', 'admin'));

router.get('/', asyncHandler(getAssignments));
router.post('/', asyncHandler(createAssignment));
router.delete('/:id', asyncHandler(deleteAssignment));

module.exports = router;
