const { BadRequestError } = require('../../../utils/errors');

const mockDb = {
    createBrandProfile: jest.fn(),
    listBrandProfilesByUser: jest.fn(),
    getBrandProfileById: jest.fn(),
    updateBrandProfile: jest.fn(),
    deleteBrandProfile: jest.fn()
};

jest.mock('../../../database.js', () => mockDb);

// eslint-disable-next-line global-require
const brandService = require('../../../src/services/brand.service.js');

describe('Brand Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('createProfile should sanitize inputs and call database', async () => {
        const dbResponse = { id: 'brand-1', name: 'CopyShark' };
        mockDb.createBrandProfile.mockResolvedValueOnce(dbResponse);

        const result = await brandService.createProfile('user-1', {
            name: ' CopyShark ',
            tone: 'Friendly',
            audience: ['Marketers', 'Founders'],
            valueProps: ['Fast', 'Insightful'],
            brandVoice: 'Human & Helpful '
        });

        expect(mockDb.createBrandProfile).toHaveBeenCalledWith({
            userId: 'user-1',
            name: 'CopyShark',
            tone: 'Friendly',
            audience: 'Marketers, Founders',
            valueProps: 'Fast, Insightful',
            brandVoice: 'Human & Helpful'
        });
        expect(result).toBe(dbResponse);
    });

    it('createProfile should throw when name missing', async () => {
        await expect(brandService.createProfile('user-1', { tone: 'Bold' }))
            .rejects.toBeInstanceOf(BadRequestError);
    });

    it('getProfilesForUser should validate userId', async () => {
        await expect(brandService.getProfilesForUser())
            .rejects.toBeInstanceOf(BadRequestError);
    });

    it('getProfilesForUser should return database results', async () => {
        const profiles = [{ id: 'brand-1' }];
        mockDb.listBrandProfilesByUser.mockResolvedValueOnce(profiles);

        const result = await brandService.getProfilesForUser('user-1');

        expect(mockDb.listBrandProfilesByUser).toHaveBeenCalledWith('user-1');
        expect(result).toEqual(profiles);
    });

    it('updateProfile should pass sanitized payload to database', async () => {
        const profile = { id: 'brand-1', name: 'Updated' };
        mockDb.updateBrandProfile.mockResolvedValueOnce(profile);

        const result = await brandService.updateProfile('brand-1', {
            name: ' Updated ',
            tone: null
        });

        expect(mockDb.updateBrandProfile).toHaveBeenCalledWith('brand-1', {
            name: 'Updated',
            tone: null,
            audience: null,
            valueProps: null,
            brandVoice: null
        });
        expect(result).toEqual(profile);
    });

    it('deleteProfile should validate profileId', async () => {
        await expect(brandService.deleteProfile())
            .rejects.toBeInstanceOf(BadRequestError);
    });
});
