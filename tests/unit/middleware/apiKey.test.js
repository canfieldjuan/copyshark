const config = require('../../../src/config');
const { validateApiKey, attachApiPortalContext } = require('../../../src/middleware/apiKey');

if (!config.aiPortal.apiKey) {
    config.aiPortal.apiKey = 'test-api-key';
}

describe('API Key Middleware', () => {
    const createRequest = (headers = {}) => ({ headers });

    it('validateApiKey should attach AI Portal context when key valid', () => {
        const req = createRequest({ 'x-api-key': config.aiPortal.apiKey });
        const next = jest.fn();

        validateApiKey(req, {}, next);

        expect(req.user).toMatchObject({ userId: 'ai-portal', isAIPortal: true });
        expect(req.isAIPortal).toBe(true);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('validateApiKey should throw when key invalid', () => {
        const req = createRequest({ 'x-api-key': 'invalid-key' });

        expect(() => validateApiKey(req, {}, jest.fn())).toThrow('Invalid AI Portal API key.');
    });

    it('attachApiPortalContext should set context when key valid', () => {
        const req = createRequest({ 'x-api-key': config.aiPortal.apiKey });
        const next = jest.fn();

        attachApiPortalContext(req, {}, next);

        expect(req.user).toMatchObject({ userId: 'ai-portal', isAIPortal: true });
        expect(req.isAIPortal).toBe(true);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('attachApiPortalContext should not modify request when key missing', () => {
        const req = createRequest();
        const next = jest.fn();

        attachApiPortalContext(req, {}, next);

        expect(req.user).toBeUndefined();
        expect(req.isAIPortal).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
    });
});
