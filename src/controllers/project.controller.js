const { ApiError, BadRequestError } = require('../../utils/errors');
const brandService = require('../services/brand.service');
const projectService = require('../services/project.service');
const copyService = require('../services/copy.service');
const graphService = require('../services/graph.service');
const authService = require('../services/auth.service');

function ensureUser(req) {
    const userId = req.user?.userId;
    if (!userId) {
        throw new ApiError(401, 'Authentication required');
    }
    return userId;
}

async function assertBrandOwnership(userId, brandId) {
    const brand = await brandService.getProfile(brandId);
    if (!brand || brand.userId !== userId) {
        throw new ApiError(404, 'Brand not found');
    }
    return brand;
}

async function assertProjectOwnership(userId, projectId) {
    const project = await projectService.getProject(projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }
    await assertBrandOwnership(userId, project.brandId);
    return project;
}

async function assertVariantOwnership(userId, variantId) {
    const variant = await projectService.getVariant(variantId);
    if (!variant) {
        throw new ApiError(404, 'Variant not found');
    }
    const project = await projectService.getProject(variant.projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }
    const brand = await assertBrandOwnership(userId, project.brandId);
    return { variant, project, brand };
}

async function create(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { brandId } = req.body;
        if (!brandId) {
            throw new BadRequestError('brandId is required');
        }
        await assertBrandOwnership(userId, brandId);
        const project = await projectService.createProject(req.body);
        res.status(201).json({ success: true, project });
    } catch (error) {
        next(error);
    }
}

async function createForBrand(req, res, next) {
    req.body = { ...req.body, brandId: req.params.brandId };
    return create(req, res, next);
}

async function list(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { brandId } = req.query;
        if (brandId) {
            await assertBrandOwnership(userId, brandId);
            const projects = await projectService.listProjectsByBrand(brandId);
            return res.json({ success: true, projects });
        }

        const brands = await brandService.getProfilesForUser(userId);
        const projectsByBrand = await Promise.all(
            brands.map((brand) => projectService.listProjectsByBrand(brand.id))
        );
        const projects = projectsByBrand.flat();
        return res.json({ success: true, projects });
    } catch (error) {
        next(error);
    }
}

async function listForBrand(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { brandId } = req.params;
        await assertBrandOwnership(userId, brandId);
        const projects = await projectService.listProjectsByBrand(brandId);
        res.json({ success: true, projects });
    } catch (error) {
        next(error);
    }
}

async function get(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { projectId } = req.params;
        const project = await assertProjectOwnership(userId, projectId);
        res.json({ success: true, project });
    } catch (error) {
        next(error);
    }
}

async function createVariants(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { projectId } = req.params;
        await assertProjectOwnership(userId, projectId);

        const variants = Array.isArray(req.body?.variants) ? req.body.variants : [];
        if (!variants.length) {
            throw new BadRequestError('variants[] is required');
        }

        const inserted = await projectService.createVariants(projectId, variants);
        res.status(201).json({ success: true, variants: inserted });
    } catch (error) {
        next(error);
    }
}

async function listVariants(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { projectId } = req.params;
        await assertProjectOwnership(userId, projectId);
        const variants = await projectService.listVariants(projectId);
        res.json({ success: true, variants });
    } catch (error) {
        next(error);
    }
}

function buildVariantFromCopy({ copy, context, model, tone }) {
    return {
        model: model ?? null,
        headline: copy?.headline ?? null,
        body: copy?.body ?? null,
        cta: copy?.cta ?? null,
        toneSnapshot: tone ?? null,
        metadata: { context }
    };
}

async function generateVariants(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { projectId } = req.params;
        const project = await assertProjectOwnership(userId, projectId);

        const variantCount = Math.min(Math.max(Number(req.body.variantCount) || 1, 1), 5);
        const generationPayload = {
            productName: req.body.productName,
            audience: req.body.audience,
            nicheId: req.body.nicheId ?? project.nicheId,
            frameworkId: req.body.frameworkId ?? project.frameworkId,
            tone: req.body.tone ?? null,
            model: req.body.model ?? null
        };

        const generated = [];
        for (let index = 0; index < variantCount; index += 1) {
            const { copy, context } = await copyService.generateCopy(generationPayload, {
                userId,
                isAIPortal: false,
                log: req.log
            });
            generated.push({ copy, context });
        }

        const variantsToStore = generated.map(({ copy, context }) => buildVariantFromCopy({
            copy,
            context,
            model: generationPayload.model,
            tone: generationPayload.tone
        }));
        const stored = await projectService.createVariants(projectId, variantsToStore);

        const responseVariants = stored.map((variant, index) => ({
            variant,
            copy: generated[index].copy,
            context: generated[index].context
        }));

        res.status(201).json({ success: true, variants: responseVariants });
    } catch (error) {
        next(error);
    }
}

async function updateVariant(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { variantId } = req.params;
        await assertVariantOwnership(userId, variantId);
        const updated = await projectService.updateVariant(variantId, req.body || {});
        res.json({ success: true, variant: updated });
    } catch (error) {
        next(error);
    }
}

async function toggleFavorite(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { variantId } = req.params;
        const flag = Boolean(req.body?.isFavorite);
        await assertVariantOwnership(userId, variantId);
        await projectService.setVariantFavorite(variantId, flag);
        res.json({ success: true, isFavorite: flag });
    } catch (error) {
        next(error);
    }
}

async function addFeedback(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { variantId } = req.params;
        const { variant, project, brand } = await assertVariantOwnership(userId, variantId);
        const feedback = await projectService.recordFeedback({
            variantId,
            rating: req.body?.rating,
            notes: req.body?.notes
        });
        if (graphService.isEnabled()) {
            try {
                const user = await authService.getUserProfile(userId);
                await graphService.recordVariantFeedback({
                    brand,
                    project,
                    variant,
                    feedback,
                    user
                });
            } catch (graphError) {
                req.log?.warn({ err: graphError, variantId }, 'Failed to sync feedback to graph');
            }
        }
        res.status(201).json({ success: true, feedback });
    } catch (error) {
        next(error);
    }
}

async function listFeedback(req, res, next) {
    try {
        const userId = ensureUser(req);
        const { variantId } = req.params;
        await assertVariantOwnership(userId, variantId);
        const feedback = await projectService.listFeedback(variantId);
        res.json({ success: true, feedback });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    create,
    createForBrand,
    list,
    listForBrand,
    get,
    createVariants,
    listVariants,
    generateVariants,
    updateVariant,
    toggleFavorite,
    addFeedback,
    listFeedback
};
