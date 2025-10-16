const { ApiError, BadRequestError } = require('../../utils/errors');
const brandService = require('../services/brand.service');
const graphService = require('../services/graph.service');
const authService = require('../services/auth.service');
const projectService = require('../services/project.service');

async function ensureBrandOwnership(userId, brandId) {
    const brand = await brandService.getProfile(brandId);
    if (!brand || brand.userId !== userId) {
        throw new ApiError(404, 'Brand not found');
    }
    return brand;
}

function ensureAuth(req) {
    if (!req.user?.userId) {
        throw new ApiError(401, 'Authentication required');
    }
    return req.user.userId;
}

async function status(req, res) {
    res.json({ success: true, enabled: graphService.isEnabled() });
}

async function insights(req, res, next) {
    try {
        const userId = ensureAuth(req);
        const { brandId, query, limit } = req.query;

        if (!brandId) {
            throw new BadRequestError('brandId is required');
        }

        if (!graphService.isEnabled()) {
            return res.json({ success: true, enabled: false, insights: [] });
        }

        const brand = await ensureBrandOwnership(userId, brandId);
        const insights = await graphService.searchInsights({
            brand,
            query,
            limit: Number(limit) || 10
        });

        res.json({ success: true, enabled: true, insights });
    } catch (error) {
        next(error);
    }
}

async function replayVariant(req, res, next) {
    try {
        const userId = ensureAuth(req);
        const { variantId } = req.params;
        if (!variantId) {
            throw new BadRequestError('variantId is required');
        }

        if (!graphService.isEnabled()) {
            throw new ApiError(503, 'Graph service not configured');
        }

        const variant = await projectService.getVariant(variantId);
        if (!variant) {
            throw new ApiError(404, 'Variant not found');
        }

        const project = await projectService.getProject(variant.projectId);
        if (!project) {
            throw new ApiError(404, 'Project not found');
        }

        const brand = await ensureBrandOwnership(userId, project.brandId);
        const user = await authService.getUserProfile(userId);

        await graphService.recordVariantFeedback({
            brand,
            project,
            variant,
            feedback: {
                id: `replay-${variant.id}`,
                rating: null,
                notes: 'Manual re-sync to graph',
                createdAt: new Date().toISOString()
            },
            user
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    status,
    insights,
    replayVariant
};
