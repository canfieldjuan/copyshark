const { BadRequestError } = require('../../utils/errors');

const validateAuthRequest = (req, res, next) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        throw new BadRequestError('Email and password are required.');
    }

    const trimmedEmail = String(email).trim();
    if (!trimmedEmail) {
        throw new BadRequestError('Email and password are required.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
        throw new BadRequestError('Invalid email format.');
    }

    if (String(password).length < 6) {
        throw new BadRequestError('Password must be at least 6 characters.');
    }

    next();
};

const validateCopyRequest = (req, res, next) => {
    const { productName, audience } = req.body || {};

    if (!productName || !audience) {
        throw new BadRequestError('productName and audience are required.');
    }

    if (!String(productName).trim()) {
        throw new BadRequestError('productName and audience are required.');
    }

    if (!String(audience).trim()) {
        throw new BadRequestError('productName and audience are required.');
    }

    next();
};

module.exports = {
    validateAuthRequest,
    validateCopyRequest
};
