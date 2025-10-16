const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const config = require('../config');
const logger = require('../config/logger').child({ module: 'authService' });
const { ApiError, BadRequestError, UnauthorizedError } = require('../../utils/errors');

let db;
try {
    db = require('../../database.js');
} catch (error) {
    logger.warn({ err: error }, 'Database module unavailable; authentication limited');
    db = null;
}

function assertDatabaseAvailable() {
    if (!db) {
        throw new ApiError(503, 'Database not available');
    }
}

async function registerUser(email, password) {
    assertDatabaseAvailable();

    const trimmedEmail = String(email).trim();

    try {
        const user = await db.createUser(trimmedEmail, password);
        return user;
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT' || /unique/i.test(error.message)) {
            throw new BadRequestError('Email already in use.');
        }
        throw error;
    }
}

async function loginUser(email, password) {
    assertDatabaseAvailable();

    const trimmedEmail = String(email).trim();
    const user = await db.findUserByEmail(trimmedEmail);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new UnauthorizedError('Invalid credentials.');
    }

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: '1d' });
    return { token, user };
}

async function getUserProfile(userId) {
    assertDatabaseAvailable();
    return db.getUser(userId);
}

module.exports = {
    registerUser,
    loginUser,
    getUserProfile
};
