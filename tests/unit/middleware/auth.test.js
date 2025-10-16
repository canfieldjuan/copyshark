const jwt = require('jsonwebtoken');

const config = require('../../../src/config');
const { authenticateJWT, optionalAuth } = require('../../../src/middleware/auth');

if (!config.jwt.secret) {
    config.jwt.secret = 'test-secret';
}

const TEST_SECRET = config.jwt.secret;

describe('Auth Middleware', () => {
    const payload = { userId: 'user-123' };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });

    const createRequest = (headers = {}) => ({
        headers,
        log: {
            debug: jest.fn()
        }
    });

    it('authenticateJWT should attach user and call next when token valid', () => {
        const req = createRequest({ authorization: `Bearer ${token}` });
        const res = {};
        const next = jest.fn();

        authenticateJWT(req, res, next);

        expect(req.user).toMatchObject(payload);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('authenticateJWT should throw when token missing', () => {
        const req = createRequest();

        expect(() => authenticateJWT(req, {}, jest.fn())).toThrow('Authentication token is required.');
    });

    it('optionalAuth should attach user when token valid', () => {
        const req = createRequest({ authorization: `Bearer ${token}` });
        const next = jest.fn();

        optionalAuth(req, {}, next);

        expect(req.user).toMatchObject(payload);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('optionalAuth should skip verification for AI Portal requests', () => {
        const req = createRequest();
        req.isAIPortal = true;
        const next = jest.fn();

        optionalAuth(req, {}, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toBeUndefined();
    });
});
