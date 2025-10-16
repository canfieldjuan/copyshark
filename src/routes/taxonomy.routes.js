const { Router } = require('express');

const { taxonomyController } = require('../controllers');

const router = Router();

router.get('/frameworks', taxonomyController.getFrameworks);
router.get('/niches', taxonomyController.getNiches);

module.exports = router;
