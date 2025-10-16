const { BadRequestError, UnauthorizedError } = require('../../../utils/errors');

const mockDb = {
    createUser: jest.fn(),
    findUserByEmail: jest.fn(),
    getUser: jest.fn()
};

jest.mock('../../../database.js', () => mockDb);
jest.mock('bcrypt', () => ({
    compare: jest.fn()
}));
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn()
}));

describe('Auth Service', () => {
    let authService;
    let bcrypt;
    let jsonwebtoken;

    beforeAll(() => {
        process.env.JWT_SECRET = 'test-secret';
        // eslint-disable-next-line global-require
        authService = require('../../../src/services/auth.service.js');
        // eslint-disable-next-line global-require
        bcrypt = require('bcrypt');
        // eslint-disable-next-line global-require
        jsonwebtoken = require('jsonwebtoken');
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('registerUser should trim email and return created user', async () => {
        const user = { id: 'user-1', email: 'test@example.com' };
        mockDb.createUser.mockResolvedValueOnce(user);

        const result = await authService.registerUser('  test@example.com  ', 'secret');

        expect(mockDb.createUser).toHaveBeenCalledWith('test@example.com', 'secret');
        expect(result).toEqual(user);
    });

    it('registerUser should throw BadRequestError on duplicate email', async () => {
        const error = new Error('UNIQUE constraint failed');
        error.code = 'SQLITE_CONSTRAINT';
        mockDb.createUser.mockRejectedValueOnce(error);

        await expect(authService.registerUser('dup@example.com', 'secret'))
            .rejects.toBeInstanceOf(BadRequestError);
    });

    it('loginUser should return JWT token when credentials valid', async () => {
        const user = { id: 'user-1', email: 'test@example.com', password_hash: 'hash' };
        mockDb.findUserByEmail.mockResolvedValueOnce(user);
        bcrypt.compare.mockResolvedValueOnce(true);
        jsonwebtoken.sign.mockReturnValueOnce('signed-token');

        const result = await authService.loginUser('test@example.com', 'secret');

        expect(mockDb.findUserByEmail).toHaveBeenCalledWith('test@example.com');
        expect(bcrypt.compare).toHaveBeenCalledWith('secret', 'hash');
        expect(result).toEqual({ token: 'signed-token', user });
    });

    it('loginUser should throw UnauthorizedError when credentials invalid', async () => {
        mockDb.findUserByEmail.mockResolvedValueOnce(null);

        await expect(authService.loginUser('missing@example.com', 'secret'))
            .rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('getUserProfile should return user from database', async () => {
        const profile = { id: 'user-1', email: 'test@example.com', plan: 'free', usage_count: 0 };
        mockDb.getUser.mockResolvedValueOnce(profile);

        const result = await authService.getUserProfile('user-1');

        expect(mockDb.getUser).toHaveBeenCalledWith('user-1');
        expect(result).toEqual(profile);
    });
});
