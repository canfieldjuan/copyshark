jest.mock('axios');

describe('Graph Service', () => {
    let graphService;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    function loadService(configOverrides = {}) {
        jest.doMock('../../../src/config', () => ({
            graph: {
                baseUrl: '',
                apiKey: '',
                timeoutMs: 1000,
                ...configOverrides
            }
        }));
        // eslint-disable-next-line global-require
        graphService = require('../../../src/services/graph.service.js');
    }

    test('isEnabled returns false when baseUrl missing', () => {
        loadService({ baseUrl: '' });
        expect(graphService.isEnabled()).toBe(false);
    });

    test('isEnabled returns true when baseUrl set', () => {
        loadService({ baseUrl: 'http://graphiti:8000' });
        expect(graphService.isEnabled()).toBe(true);
    });

    test('searchInsights returns empty array when disabled', async () => {
        loadService({ baseUrl: '' });
        const results = await graphService.searchInsights({
            brand: { id: 'brand-1', name: 'Brand' },
            query: 'test'
        });
        expect(results).toEqual([]);
    });

    test('recordVariantFeedback silently resolves when disabled', async () => {
        loadService({ baseUrl: '' });
        await expect(graphService.recordVariantFeedback({
            brand: {},
            project: {},
            variant: {},
            feedback: {},
            user: {}
        })).resolves.toBeNull();
    });
});
