const taxonomyService = require('../services/taxonomy.service');

async function getFrameworks(req, res, next) {
    try {
        const frameworks = await taxonomyService.listFrameworks(req.log);
        res.json(frameworks);
    } catch (error) {
        next(error);
    }
}

async function getNiches(req, res, next) {
    try {
        const niches = await taxonomyService.listNiches(req.log);
        res.json(niches);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getFrameworks,
    getNiches
};
