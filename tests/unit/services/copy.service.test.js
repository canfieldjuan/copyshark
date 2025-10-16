const { ApiError } = require('../../../utils/errors');

const mockDb = {
    getUser: jest.fn(),
    incrementUserUsage: jest.fn()
};

const mockLlmService = {
    generate: jest.fn()
};

const mockTaxonomy = {
    getNicheMeta: jest.fn(),
    getFrameworkMeta: jest.fn(),
    getNicheKeywords: jest.fn()
};

jest.mock('../../../database.js', () => mockDb);
jest.mock('../../../services/llmService.js', () => mockLlmService);
jest.mock('../../../src/services/taxonomy.service.js', () => mockTaxonomy);

describe('Copy Service', () => {
    let copyService;
    const log = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    };

    beforeAll(() => {
        mockTaxonomy.getNicheMeta.mockImplementation(() => ({ id: 'tech', name: 'Technology' }));
        mockTaxonomy.getFrameworkMeta.mockImplementation(() => ({ id: 'aida', name: 'AIDA' }));
        mockTaxonomy.getNicheKeywords.mockResolvedValue([]);
        mockDb.incrementUserUsage.mockResolvedValue();
        // eslint-disable-next-line global-require
        copyService = require('../../../src/services/copy.service.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockTaxonomy.getNicheMeta.mockReturnValue({ id: 'tech', name: 'Technology' });
        mockTaxonomy.getFrameworkMeta.mockReturnValue({ id: 'aida', name: 'AIDA' });
        mockTaxonomy.getNicheKeywords.mockResolvedValue(['ai', 'marketing']);
        mockDb.getUser.mockResolvedValue({ id: 'user-1', plan: 'free', usage_count: 0 });
        mockLlmService.generate.mockResolvedValue({
            headline: 'Hello World',
            body: 'Sample body',
            cta: 'Act now'
        });
    });

    it('buildCopyPrompt should assemble prompt and context', async () => {
        const payload = {
            productName: 'AI Tool',
            audience: 'Marketers',
            nicheId: 'tech',
            frameworkId: 'aida',
            tone: 'friendly'
        };

        const result = await copyService.buildCopyPrompt(payload);

        expect(mockTaxonomy.getNicheMeta).toHaveBeenCalledWith('tech');
        expect(result.prompt).toContain('AI Tool');
        expect(result.prompt).toContain('Marketers');
        expect(result.context).toMatchObject({
            nicheId: 'tech',
            frameworkId: 'aida'
        });
        expect(result.context.keywords).toEqual(['ai', 'marketing']);
    });

    it('generateCopy should enforce usage and increment count for authenticated users', async () => {
        const payload = {
            productName: 'AI Tool',
            audience: 'Marketers',
            niche: 'tech',
            framework: 'aida',
            tone: 'friendly'
        };

        const result = await copyService.generateCopy(payload, { userId: 'user-1', log });

        expect(mockDb.getUser).toHaveBeenCalledWith('user-1');
        expect(mockLlmService.generate).toHaveBeenCalledTimes(1);
        expect(mockDb.incrementUserUsage).toHaveBeenCalledWith('user-1');
        expect(result.copy).toEqual({ headline: 'Hello World', body: 'Sample body', cta: 'Act now' });
    });

    it('generateCopy should skip usage enforcement for AI Portal requests', async () => {
        const payload = {
            productName: 'AI Tool',
            audience: 'Marketers',
            niche: 'tech',
            framework: 'aida'
        };

        await copyService.generateCopy(payload, { isAIPortal: true, log });

        expect(mockDb.getUser).not.toHaveBeenCalled();
        expect(mockDb.incrementUserUsage).not.toHaveBeenCalled();
        expect(mockLlmService.generate).toHaveBeenCalledTimes(1);
    });

    it('generateCopy should throw ApiError when usage limit exceeded', async () => {
        mockDb.getUser.mockResolvedValueOnce({ id: 'user-1', plan: 'free', usage_count: 10 });

        await expect(copyService.generateCopy({
            productName: 'AI Tool',
            audience: 'Marketers',
            niche: 'tech',
            framework: 'aida'
        }, { userId: 'user-1', log }))
            .rejects.toBeInstanceOf(ApiError);

        expect(mockDb.incrementUserUsage).not.toHaveBeenCalled();
    });
});
