const { ApiError, BadRequestError } = require('../../utils/errors');
const brandService = require('../services/brand.service');

function ensureUser(req) {
    const userId = req.user?.userId;
    if (!userId) {
        throw new ApiError(401, 'Authentication required');
    }
    return userId;
}

async function assertOwnership(userId, brandId) {
    const brand = await brandService.getProfile(brandId);
    if (!brand || brand.userId !== userId) {
        throw new ApiError(404, 'Brand not found');
    }
    return brand;
}

async function list(req, res, next) {
    try {
        const userId = ensureUser(req);
        const brands = await brandService.getProfilesForUser(userId);
        res.json({ success: true, brands });
    } catch (error) {
        next(error);
    }
}

async function create(req, res, next) {
    try {
        const userId = ensureUser(req);
        const brand = await brandService.createProfile(userId, req.body);
        res.status(201).json({ success: true, brand });
    } catch (error) {
        next(error);
    }
}

async function get(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { brandId } = req.params;
        const brand = await assertOwnership(userId, brandId);
        res.json({ success: true, brand });
    } catch (error) {
        next(error);
    }
}

async function update(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { brandId } = req.params;
        await assertOwnership(userId, brandId);
        const updated = await brandService.updateProfile(brandId, req.body);
        res.json({ success: true, brand: updated });
    } catch (error) {
        next(error);
    }
}

async function remove(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { brandId } = req.params;
        await assertOwnership(userId, brandId);
        await brandService.deleteProfile(brandId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

module.exports = {
    list,
    create,
    get,
    update,
    remove
};
