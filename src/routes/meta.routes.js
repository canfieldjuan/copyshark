const { Router } = require('express');

const { metaController } = require('../controllers');

const router = Router();

router.get('/health', metaController.health);
router.get('/models', metaController.models);

module.exports = router;
