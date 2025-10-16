const logger = require('../config/logger').child({ module: 'projectService' });
const { ApiError, BadRequestError } = require('../../utils/errors');

let db;
try {
    db = require('../../database.js');
} catch (error) {
    logger.warn({ err: error }, 'Database module unavailable; project service limited');
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

function sanitizeVariants(variants = []) {
    return variants.map((variant) => ({
        model: sanitizeString(variant.model),
        headline: sanitizeString(variant.headline),
        body: sanitizeString(variant.body),
        cta: sanitizeString(variant.cta),
        toneSnapshot: sanitizeString(variant.toneSnapshot),
        score: variant.score === undefined || variant.score === null ? null : Number(variant.score),
        isFavorite: Boolean(variant.isFavorite),
        metadata: variant.metadata ?? null,
        generatedAt: variant.generatedAt ?? null
    }));
}

async function createProject(payload) {
    ensureDatabase();

    const brandId = sanitizeString(payload.brandId);
    const title = sanitizeString(payload.title);

    if (!brandId) {
        throw new BadRequestError('brandId is required to create a project.');
    }
    if (!title) {
        throw new BadRequestError('Project title is required.');
    }

    return db.createProject({
        brandId,
        title,
        objective: sanitizeString(payload.objective),
        brief: sanitizeString(payload.brief),
        nicheId: sanitizeString(payload.nicheId),
        frameworkId: sanitizeString(payload.frameworkId),
        targetChannel: sanitizeString(payload.targetChannel)
    });
}

async function getProject(projectId) {
    ensureDatabase();

    if (!projectId) {
        throw new BadRequestError('projectId is required.');
    }

    return db.getProjectById(projectId);
}

async function getVariant(variantId) {
    ensureDatabase();

    if (!variantId) {
        throw new BadRequestError('variantId is required.');
    }

    return db.getVariantById(variantId);
}

async function listProjectsByBrand(brandId) {
    ensureDatabase();

    if (!brandId) {
        throw new BadRequestError('brandId is required.');
    }

    return db.listProjectsByBrand(brandId);
}

async function createVariants(projectId, variants) {
    ensureDatabase();

    if (!projectId) {
        throw new BadRequestError('projectId is required.');
    }

    const normalized = sanitizeVariants(variants);
    return db.insertVariants(projectId, normalized);
}

async function listVariants(projectId) {
    ensureDatabase();

    if (!projectId) {
        throw new BadRequestError('projectId is required.');
    }

    return db.listVariantsByProject(projectId);
}

async function updateVariant(variantId, updates) {
    ensureDatabase();

    if (!variantId) {
        throw new BadRequestError('variantId is required.');
    }

    const payload = {};
    if (updates.headline !== undefined) payload.headline = sanitizeString(updates.headline);
    if (updates.body !== undefined) payload.body = sanitizeString(updates.body);
    if (updates.cta !== undefined) payload.cta = sanitizeString(updates.cta);
    if (updates.toneSnapshot !== undefined) payload.toneSnapshot = sanitizeString(updates.toneSnapshot);
    if (updates.score !== undefined && updates.score !== null) {
        payload.score = Number(updates.score);
    } else if (updates.score === null) {
        payload.score = null;
    }
    if (updates.metadata !== undefined) {
        payload.metadata = updates.metadata;
    }

    return db.updateVariant(variantId, payload);
}

async function setVariantFavorite(variantId, isFavorite) {
    ensureDatabase();

    if (!variantId) {
        throw new BadRequestError('variantId is required.');
    }

    await db.setVariantFavorite(variantId, Boolean(isFavorite));
}

function validateRating(rating) {
    if (rating === undefined || rating === null) {
        return null;
    }
    const numeric = Number(rating);
    if (Number.isNaN(numeric) || numeric < 1 || numeric > 5) {
        throw new BadRequestError('Rating must be between 1 and 5.');
    }
    return numeric;
}

async function recordFeedback({ variantId, rating, notes }) {
    ensureDatabase();

    if (!variantId) {
        throw new BadRequestError('variantId is required.');
    }

    const numericRating = validateRating(rating);

    return db.createVariantFeedback({
        variantId,
        rating: numericRating,
        notes: sanitizeString(notes)
    });
}

async function listFeedback(variantId) {
    ensureDatabase();

    if (!variantId) {
        throw new BadRequestError('variantId is required.');
    }

    return db.listFeedbackByVariant(variantId);
}

module.exports = {
    createProject,
    getProject,
    getVariant,
    listProjectsByBrand,
    createVariants,
    listVariants,
    updateVariant,
    setVariantFavorite,
    recordFeedback,
    listFeedback
};
