const router = require('express').Router();
const { register, login } = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));

module.exports = router;
