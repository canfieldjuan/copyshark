const { Router } = require('express');

const { authenticateJWT, validateCopyRequest } = require('../middleware');
const { projectController } = require('../controllers');

const router = Router();

router.use(authenticateJWT);

router.get('/', projectController.list);
router.post('/', projectController.create);
router.get('/:projectId', projectController.get);
router.get('/:projectId/variants', projectController.listVariants);
router.post('/:projectId/variants', projectController.createVariants);
router.post('/:projectId/generate', validateCopyRequest, projectController.generateVariants);

module.exports = router;
