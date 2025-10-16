const { Router } = require('express');

const { authenticateJWT } = require('../middleware');
const { projectController } = require('../controllers');

const router = Router({ mergeParams: true });

router.use(authenticateJWT);

router.patch('/:variantId', projectController.updateVariant);
router.post('/:variantId/favorite', projectController.toggleFavorite);
router.post('/:variantId/feedback', projectController.addFeedback);
router.get('/:variantId/feedback', projectController.listFeedback);

module.exports = router;
