const jwt = require('jsonwebtoken');

const config = require('../config');
const { UnauthorizedError } = require('../../utils/errors');

function extractToken(authHeader) {
    if (!authHeader) {
        return null;
    }

    const [, token] = authHeader.split(' ');
    return token || null;
}

const authenticateJWT = (req, res, next) => {
    const token = extractToken(req.headers['authorization']);

    if (!token) {
        throw new UnauthorizedError('Authentication token is required.');
    }

    try {
        req.user = jwt.verify(token, config.jwt.secret);
        next();
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired authentication token.');
    }
};

const optionalAuth = (req, res, next) => {
    if (req.isAIPortal || req.user?.isAIPortal) {
        return next();
    }

    const token = extractToken(req.headers['authorization']);

    if (!token) {
        return next();
    }

    try {
        req.user = jwt.verify(token, config.jwt.secret);
    } catch (error) {
        if (req.log?.debug) {
            req.log.debug({ err: error }, 'Optional auth token verification failed');
        }
    }

    next();
};

module.exports = {
    authenticateJWT,
    optionalAuth
};
