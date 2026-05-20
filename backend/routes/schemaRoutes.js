const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const { list, preview, create, update, remove } = require('../controllers/schemaManagerController');

router.use(auth);
router.use(role('teacher', 'admin'));

router.get('/',            asyncHandler(list));
router.post('/preview',    asyncHandler(preview));
router.post('/',           asyncHandler(create));
router.put('/:id',         asyncHandler(update));
router.delete('/:id',      asyncHandler(remove));

module.exports = router;
