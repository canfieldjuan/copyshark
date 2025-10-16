const { Router } = require('express');

const { validateAuthRequest } = require('../middleware');
const { authController } = require('../controllers');

const router = Router();

router.post('/register', validateAuthRequest, authController.register);
router.post('/login', validateAuthRequest, authController.login);

module.exports = router;
