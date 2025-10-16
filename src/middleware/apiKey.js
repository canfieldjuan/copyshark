const config = require('../config');
const { UnauthorizedError } = require('../../utils/errors');

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== config.aiPortal.apiKey) {
        throw new UnauthorizedError('Invalid AI Portal API key.');
    }

    req.user = { userId: 'ai-portal', isAIPortal: true };
    req.isAIPortal = true;
    next();
};

const attachApiPortalContext = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (apiKey && apiKey === config.aiPortal.apiKey) {
        req.user = Object.assign({}, req.user, { userId: 'ai-portal', isAIPortal: true });
        req.isAIPortal = true;
    }

    next();
};

module.exports = {
    validateApiKey,
    attachApiPortalContext
};
