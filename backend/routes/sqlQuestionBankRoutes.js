const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/sqlQuestionBankController');

const teacherOnly = [auth, role(['teacher', 'admin'])];

router.get('/',       auth,         asyncHandler(ctrl.getAll));
router.get('/:id',    auth,         asyncHandler(ctrl.getById));
router.post('/',      teacherOnly,  asyncHandler(ctrl.create));
router.put('/:id',    teacherOnly,  asyncHandler(ctrl.update));
router.delete('/:id', teacherOnly,  asyncHandler(ctrl.remove));

module.exports = router;
