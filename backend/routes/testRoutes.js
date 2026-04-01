const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const upload = require('../middleware/upload');
const { getTests, getTestById, createTest, updateTest, deleteTest, addQuestion, deleteQuestion } = require('../controllers/testController');

router.use(authMiddleware);
router.use(roleMiddleware('teacher', 'admin'));

router.get('/', asyncHandler(getTests));
router.get('/:id', asyncHandler(getTestById));
router.post('/', upload.single('cover_image'), asyncHandler(createTest));
router.put('/:id', upload.single('cover_image'), asyncHandler(updateTest));
router.delete('/:id', asyncHandler(deleteTest));

router.post('/:id/questions', asyncHandler(addQuestion));
router.delete('/:testId/questions/:questionId', asyncHandler(deleteQuestion));

module.exports = router;
