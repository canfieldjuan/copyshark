const { ApiError, BadRequestError } = require('../../utils/errors');
const copyService = require('../services/copy.service');
const projectService = require('../services/project.service');
const brandService = require('../services/brand.service');

async function assertProjectOwnership(userId, projectId) {
    const project = await projectService.getProject(projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }
    const brand = await brandService.getProfile(project.brandId);
    if (!brand || brand.userId !== userId) {
        throw new ApiError(404, 'Project not found');
    }
    return project;
}

async function generateCopy(req, res, next) {
    try {
        const projectId = req.body?.projectId;
        const userId = req.user?.userId || null;

        const { copy, context } = await copyService.generateCopy(req.body, {
            userId: req.user?.userId || null,
            isAIPortal: Boolean(req.isAIPortal || req.user?.isAIPortal),
            log: req.log
        });

        let variant = null;

        if (projectId) {
            try {
                const project = await assertProjectOwnership(userId, projectId);
                const variantPayload = {
                    model: req.body?.model ?? null,
                    headline: copy?.headline ?? null,
                    body: copy?.body ?? null,
                    cta: copy?.cta ?? null,
                    toneSnapshot: req.body?.tone ?? null,
                    metadata: { context }
                };

                const stored = await projectService.createVariants(project.id, [variantPayload]);
                variant = stored[0] ?? null;
            } catch (storeError) {
                req.log?.error({ err: storeError, projectId }, 'Failed to persist generated variant');
                if (storeError instanceof ApiError || storeError instanceof BadRequestError) {
                    throw storeError;
                }
                throw new ApiError(500, 'Unable to store generated variant');
            }
        }

        res.json({ success: true, copy, context, variant });
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }
        next(new ApiError(500, 'AI service failed.'));
    }
}

module.exports = {
    generateCopy
};
