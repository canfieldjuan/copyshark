const mockDb = {
    getNiches: jest.fn(),
    getFrameworks: jest.fn(),
    getKeywordsForNiche: jest.fn()
};

jest.mock('../../../database.js', () => mockDb);

describe('Taxonomy Service', () => {
    let taxonomyService;

    beforeAll(() => {
        // eslint-disable-next-line global-require
        taxonomyService = require('../../../src/services/taxonomy.service.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        taxonomyService.resetToFallbacks();
    });

    it('returns fallback taxonomy data when database unavailable', () => {
        const niches = taxonomyService.getTaxonomyList('niches');
        const frameworks = taxonomyService.getTaxonomyList('frameworks');

        expect(Array.isArray(niches)).toBe(true);
        expect(Array.isArray(frameworks)).toBe(true);
        expect(niches.length).toBeGreaterThan(0);
        expect(frameworks.length).toBeGreaterThan(0);
    });

    it('refreshTaxonomyCache loads data from database', async () => {
        const nicheRow = { id: 'custom-niche', name: 'Custom Niche', description: 'Test niche' };
        const frameworkRow = { id: 'pass', name: 'PASS', description: 'Problem, Agitate, Solve, Satisfy' };
        mockDb.getNiches.mockResolvedValueOnce([nicheRow]);
        mockDb.getFrameworks.mockResolvedValueOnce([frameworkRow]);

        await taxonomyService.refreshTaxonomyCache();

        const niches = taxonomyService.getTaxonomyList('niches');
        const frameworks = taxonomyService.getTaxonomyList('frameworks');

        expect(niches).toContainEqual(nicheRow);
        expect(frameworks).toContainEqual(frameworkRow);
    });

    it('getNicheKeywords caches database results per niche', async () => {
        mockDb.getKeywordsForNiche.mockResolvedValue(['alpha', 'beta']);

        const first = await taxonomyService.getNicheKeywords('custom-niche');
        const second = await taxonomyService.getNicheKeywords('custom-niche');

        expect(first).toEqual(['alpha', 'beta']);
        expect(second).toEqual(['alpha', 'beta']);
        expect(mockDb.getKeywordsForNiche).toHaveBeenCalledTimes(1);
    });
});
