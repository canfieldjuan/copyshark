const { Router } = require('express');

const { validateApiKey } = require('../middleware');
const { aiPortalController } = require('../controllers');

const router = Router();

router.post('/ai-portal/function-call', validateApiKey, aiPortalController.callFunction);
router.get('/functions', aiPortalController.getFunctionDefinitions);

module.exports = router;
