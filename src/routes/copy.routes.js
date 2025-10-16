const { Router } = require('express');

const {
    attachApiPortalContext,
    optionalAuth,
    validateCopyRequest
} = require('../middleware');
const { copyController } = require('../controllers');

const router = Router();

router.post(
    '/generate-copy',
    attachApiPortalContext,
    optionalAuth,
    validateCopyRequest,
    copyController.generateCopy
);

module.exports = router;
