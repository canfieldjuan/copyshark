const { Router } = require('express');

const { authenticateJWT } = require('../middleware');
const { graphController } = require('../controllers');

const router = Router();

router.get('/status', graphController.status);
router.use(authenticateJWT);
router.get('/insights', graphController.insights);
router.post('/variants/:variantId/replay', graphController.replayVariant);

module.exports = router;
