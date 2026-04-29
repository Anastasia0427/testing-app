const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const { getStudents, updateProfile } = require('../controllers/userController');

router.use(authMiddleware);

router.put('/profile', asyncHandler(updateProfile));

router.use(roleMiddleware('teacher', 'admin'));

router.get('/students', asyncHandler(getStudents));

module.exports = router;
