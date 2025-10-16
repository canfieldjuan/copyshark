const { validateAuthRequest, validateCopyRequest } = require('../../../src/middleware/validation');

const createRequest = (body = {}) => ({ body });

const createNext = () => jest.fn();

describe('Validation Middleware', () => {
    describe('validateAuthRequest', () => {
        it('should call next for valid credentials', () => {
            const req = createRequest({ email: 'user@example.com', password: 'strongpassword' });
            const next = createNext();

            validateAuthRequest(req, {}, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        it('should throw for missing email', () => {
            const req = createRequest({ password: 'strongpassword' });

            expect(() => validateAuthRequest(req, {}, createNext())).toThrow('Email and password are required.');
        });

        it('should throw for invalid email format', () => {
            const req = createRequest({ email: 'invalid', password: 'strongpassword' });

            expect(() => validateAuthRequest(req, {}, createNext())).toThrow('Invalid email format.');
        });

        it('should throw for short password', () => {
            const req = createRequest({ email: 'user@example.com', password: 'short' });

            expect(() => validateAuthRequest(req, {}, createNext())).toThrow('Password must be at least 6 characters.');
        });
    });

    describe('validateCopyRequest', () => {
        it('should call next for valid payload', () => {
            const req = createRequest({ productName: 'Product', audience: 'Audience' });
            const next = createNext();

            validateCopyRequest(req, {}, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        it('should throw when productName missing', () => {
            const req = createRequest({ audience: 'Audience' });

            expect(() => validateCopyRequest(req, {}, createNext())).toThrow('productName and audience are required.');
        });

        it('should throw when audience missing', () => {
            const req = createRequest({ productName: 'Product' });

            expect(() => validateCopyRequest(req, {}, createNext())).toThrow('productName and audience are required.');
        });
    });
});
