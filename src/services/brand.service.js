const logger = require('../config/logger').child({ module: 'brandService' });
const { ApiError, BadRequestError } = require('../../utils/errors');

let db;
try {
    db = require('../../database.js');
} catch (error) {
    logger.warn({ err: error }, 'Database module unavailable; brand service limited');
    db = null;
}

function ensureDatabase() {
    if (!db) {
        throw new ApiError(503, 'Database not available');
    }
}

function sanitizeString(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
}

function normalizeListField(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => sanitizeString(item))
            .filter(Boolean)
            .join(', ');
    }
    return sanitizeString(value);
}

function normalizeProfileInput(payload = {}) {
    return {
        name: sanitizeString(payload.name),
        tone: sanitizeString(payload.tone),
        audience: normalizeListField(payload.audience),
        valueProps: normalizeListField(payload.valueProps),
        brandVoice: sanitizeString(payload.brandVoice)
    };
}

async function createProfile(userId, payload) {
    ensureDatabase();

    if (!userId) {
        throw new BadRequestError('userId is required to create a brand profile.');
    }

    const profile = normalizeProfileInput(payload);

    if (!profile.name) {
        throw new BadRequestError('Brand profile name is required.');
    }

    return db.createBrandProfile({ userId, ...profile });
}

async function getProfilesForUser(userId) {
    ensureDatabase();

    if (!userId) {
        throw new BadRequestError('userId is required.');
    }

    return db.listBrandProfilesByUser(userId);
}

async function getProfile(profileId) {
    ensureDatabase();

    if (!profileId) {
        throw new BadRequestError('profileId is required.');
    }

    return db.getBrandProfileById(profileId);
}

async function updateProfile(profileId, payload) {
    ensureDatabase();

    if (!profileId) {
        throw new BadRequestError('profileId is required.');
    }

    const updates = normalizeProfileInput(payload);

    return db.updateBrandProfile(profileId, updates);
}

async function deleteProfile(profileId) {
    ensureDatabase();

    if (!profileId) {
        throw new BadRequestError('profileId is required.');
    }

    await db.deleteBrandProfile(profileId);
}

module.exports = {
    createProfile,
    getProfilesForUser,
    getProfile,
    updateProfile,
    deleteProfile
};
