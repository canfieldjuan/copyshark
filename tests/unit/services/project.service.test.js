const { BadRequestError } = require('../../../utils/errors');

const mockDb = {
    createProject: jest.fn(),
    getProjectById: jest.fn(),
    listProjectsByBrand: jest.fn(),
    insertVariants: jest.fn(),
    listVariantsByProject: jest.fn(),
    updateVariant: jest.fn(),
    setVariantFavorite: jest.fn(),
    createVariantFeedback: jest.fn(),
    listFeedbackByVariant: jest.fn()
};

jest.mock('../../../database.js', () => mockDb);

// eslint-disable-next-line global-require
const projectService = require('../../../src/services/project.service.js');

describe('Project Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('createProject should validate inputs and call database with sanitized payload', async () => {
        const project = { id: 'proj-1', title: 'Launch' };
        mockDb.createProject.mockResolvedValueOnce(project);

        const result = await projectService.createProject({
            brandId: ' brand-1 ',
            title: ' Launch Campaign ',
            objective: 'Drive signups',
            brief: ' Use a friendly tone ',
            nicheId: 'llm-tuning',
            frameworkId: 'aida',
            targetChannel: ' email '
        });

        expect(mockDb.createProject).toHaveBeenCalledWith({
            brandId: 'brand-1',
            title: 'Launch Campaign',
            objective: 'Drive signups',
            brief: 'Use a friendly tone',
            nicheId: 'llm-tuning',
            frameworkId: 'aida',
            targetChannel: 'email'
        });
        expect(result).toEqual(project);
    });

    it('createProject should throw when brandId missing', async () => {
        await expect(projectService.createProject({ title: 'Test' }))
            .rejects.toThrow(BadRequestError);
    });

    it('createVariants should sanitize and forward payload', async () => {
        const variants = [{ id: 'var-1' }];
        mockDb.insertVariants.mockResolvedValueOnce(variants);

        const result = await projectService.createVariants('proj-1', [{
            model: 'gpt-4o-mini',
            headline: ' Hello ',
            body: ' World ',
            cta: 'Act now',
            toneSnapshot: 'Friendly',
            score: '89',
            isFavorite: true,
            metadata: { keywords: ['ai'] }
        }]);

        expect(mockDb.insertVariants).toHaveBeenCalledWith('proj-1', [
            {
                model: 'gpt-4o-mini',
                headline: 'Hello',
                body: 'World',
                cta: 'Act now',
                toneSnapshot: 'Friendly',
                score: 89,
                isFavorite: true,
                metadata: { keywords: ['ai'] },
                generatedAt: null
            }
        ]);
        expect(result).toEqual(variants);
    });

    it('updateVariant should pass through mapped fields', async () => {
        const variant = { id: 'var-1', score: 90 };
        mockDb.updateVariant.mockResolvedValueOnce(variant);

        const result = await projectService.updateVariant('var-1', {
            headline: ' Updated ',
            score: 90,
            metadata: { keywords: ['ai'] }
        });

        expect(mockDb.updateVariant).toHaveBeenCalledWith('var-1', {
            headline: 'Updated',
            score: 90,
            metadata: { keywords: ['ai'] }
        });
        expect(result).toEqual(variant);
    });

    it('recordFeedback should validate rating range and persist', async () => {
        const feedback = { id: 'feedback-1' };
        mockDb.createVariantFeedback.mockResolvedValueOnce(feedback);

        const result = await projectService.recordFeedback({
            variantId: 'var-1',
            rating: 5,
            notes: 'Excellent copy'
        });

        expect(mockDb.createVariantFeedback).toHaveBeenCalledWith({
            variantId: 'var-1',
            rating: 5,
            notes: 'Excellent copy'
        });
        expect(result).toEqual(feedback);
    });

    it('recordFeedback should throw for invalid rating', async () => {
        await expect(projectService.recordFeedback({ variantId: 'var-1', rating: 8 }))
            .rejects.toThrow(BadRequestError);
    });
});
