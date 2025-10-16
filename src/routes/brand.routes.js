const { Router } = require('express');

const { authenticateJWT } = require('../middleware');
const { brandController, projectController } = require('../controllers');

const router = Router();

router.use(authenticateJWT);

router.get('/', brandController.list);
router.post('/', brandController.create);
router.get('/:brandId', brandController.get);
router.patch('/:brandId', brandController.update);
router.delete('/:brandId', brandController.remove);

// Nested project routes scoped to a brand
router.get('/:brandId/projects', projectController.listForBrand);
router.post('/:brandId/projects', projectController.createForBrand);

module.exports = router;
