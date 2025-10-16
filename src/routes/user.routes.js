const { Router } = require('express');

const { attachApiPortalContext, authenticateJWT } = require('../middleware');
const { userController } = require('../controllers');

const router = Router();

router.get(
    '/me',
    attachApiPortalContext,
    (req, res, next) => {
        if (req.isAIPortal) {
            return next();
        }

        try {
            authenticateJWT(req, res, next);
        } catch (error) {
            next(error);
        }
    },
    userController.getCurrentUser
);

module.exports = router;
