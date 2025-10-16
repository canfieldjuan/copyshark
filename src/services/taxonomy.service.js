const logger = require('../config/logger').child({ module: 'taxonomyService' });

let db;
try {
    db = require('../../database.js');
} catch (error) {
    logger.warn({ err: error }, 'Database module unavailable; taxonomy will use fallbacks');
    db = null;
}

const fallbackFrameworks = require('../../services/frameworks');
const fallbackNiches = require('../../services/niches');

const taxonomyCache = {
    niches: new Map(),
    frameworks: new Map()
};
const keywordCache = new Map();

function bootstrapCache(records) {
    return new Map(
        Object.entries(records).map(([id, value]) => [id, { id, ...value }])
    );
}

function hydrateFallbackCache() {
    taxonomyCache.niches = bootstrapCache(fallbackNiches);
    taxonomyCache.frameworks = bootstrapCache(fallbackFrameworks);
}

hydrateFallbackCache();

function getTaxonomyList(type) {
    return Array.from(taxonomyCache[type]?.values() ?? []);
}

function getTaxonomyObject(type) {
    return Object.fromEntries(taxonomyCache[type] ?? []);
}

function getTaxonomyIds(type) {
    return getTaxonomyList(type).map((item) => item.id);
}

function getNicheMeta(nicheId) {
    return taxonomyCache.niches.get(nicheId);
}

function getFrameworkMeta(frameworkId) {
    return taxonomyCache.frameworks.get(frameworkId);
}

async function listFrameworks(log) {
    if (db) {
        try {
            const frameworks = await db.getFrameworks();
            if (Array.isArray(frameworks) && frameworks.length) {
                return frameworks;
            }
            log?.warn('Frameworks table empty, serving cached taxonomy');
        } catch (error) {
            log?.error({ err: error }, 'Failed to fetch frameworks from database, serving cached taxonomy');
        }
    }

    return getTaxonomyList('frameworks');
}

async function listNiches(log) {
    if (db) {
        try {
            const niches = await db.getNiches();
            if (Array.isArray(niches) && niches.length) {
                return niches;
            }
            log?.warn('Niches table empty, serving cached taxonomy');
        } catch (error) {
            log?.error({ err: error }, 'Failed to fetch niches from database, serving cached taxonomy');
        }
    }

    return getTaxonomyList('niches');
}

async function refreshTaxonomyCache() {
    if (!db) {
        logger.warn('Database module unavailable; keeping fallback taxonomy cache');
        return;
    }

    try {
        const [nicheRows, frameworkRows] = await Promise.all([
            db.getNiches(),
            db.getFrameworks()
        ]);

        if (Array.isArray(nicheRows) && nicheRows.length) {
            taxonomyCache.niches.clear();
            for (const niche of nicheRows) {
                taxonomyCache.niches.set(niche.id, niche);
            }
        }

        if (Array.isArray(frameworkRows) && frameworkRows.length) {
            taxonomyCache.frameworks.clear();
            for (const framework of frameworkRows) {
                taxonomyCache.frameworks.set(framework.id, framework);
            }
        }

        keywordCache.clear();
        logger.info(
            {
                niches: taxonomyCache.niches.size,
                frameworks: taxonomyCache.frameworks.size
            },
            'Taxonomy cache refreshed from database'
        );
    } catch (error) {
        logger.error({ err: error }, 'Failed to refresh taxonomy cache; preserving existing entries');
    }
}

async function getNicheKeywords(nicheId) {
    if (!nicheId || !db) {
        return [];
    }

    if (keywordCache.has(nicheId)) {
        return keywordCache.get(nicheId);
    }

    try {
        const keywords = await db.getKeywordsForNiche(nicheId);
        keywordCache.set(nicheId, keywords);
        return keywords;
    } catch (error) {
        logger.error({ err: error, nicheId }, 'Failed to load niche keywords');
        return [];
    }
}

function resetToFallbacks() {
    hydrateFallbackCache();
    keywordCache.clear();
}

module.exports = {
    getTaxonomyList,
    getTaxonomyObject,
    getTaxonomyIds,
    getNicheMeta,
    getFrameworkMeta,
    listFrameworks,
    listNiches,
    refreshTaxonomyCache,
    getNicheKeywords,
    resetToFallbacks
};
