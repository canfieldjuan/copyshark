const axios = require('axios');

const config = require('../config');
const logger = require('../config/logger').child({ module: 'graphService' });

function isEnabled() {
    return Boolean(config.graph?.baseUrl);
}

function getHttpClient() {
    if (!isEnabled()) {
        throw new Error('Graph service not configured');
    }

    const instance = axios.create({
        baseURL: config.graph.baseUrl.replace(/\/$/, ''),
        timeout: Number(config.graph.timeoutMs || 10000)
    });

    if (config.graph.apiKey) {
        instance.defaults.headers.common['x-api-key'] = config.graph.apiKey;
    }

    return instance;
}

async function safeRequest(promiseFactory, fallbackValue = null) {
    if (!isEnabled()) {
        return fallbackValue;
    }

    try {
        const client = getHttpClient();
        return await promiseFactory(client);
    } catch (error) {
        logger.warn({ err: error }, 'Graph service request failed');
        return fallbackValue;
    }
}

function buildEpisodePayload({ brand, project, variant, feedback, user }) {
    const headline = variant.headline || 'Untitled copy';
    const ratingText = feedback.rating ? `Rating: ${feedback.rating}/5.` : 'Rating not provided.';
    const personaText = brand.audience ? `Audience cues: ${brand.audience}.` : '';
    const toneText = brand.tone ? `Tone guidance: ${brand.tone}.` : '';

    return {
        name: `Variant feedback · ${headline}`,
        episode_body: [
            `${ratingText} ${feedback.notes || ''}`.trim(),
            `Project: ${project.title}. Channel: ${project.targetChannel || 'unspecified'}.`,
            `Variant body: ${variant.body || ''}`,
            toneText,
            personaText
        ].filter(Boolean).join('\n\n'),
        source_description: `User ${user?.email || user?.userId || 'unknown'} reviewed variant ${variant.id}.` ,
        reference_time: new Date().toISOString(),
        group_id: brand.id
    };
}

async function recordVariantFeedback({ brand, project, variant, feedback, user }) {
    return safeRequest(async (client) => {
        const payload = buildEpisodePayload({ brand, project, variant, feedback, user });
        await client.post('/episodes', payload);
    });
}

async function searchInsights({ brand, query, limit = 10 }) {
    return safeRequest(async (client) => {
        const params = new URLSearchParams({
            query: query || brand.name || 'brand insights',
            group_ids: brand.id,
            num_results: String(limit)
        });

        const response = await client.get(`/search?${params.toString()}`);
        const edges = Array.isArray(response.data?.edges) ? response.data.edges : [];

        return edges.map((edge) => ({
            id: edge.uuid || edge.id,
            name: edge.name || 'Untitled insight',
            fact: edge.fact || '',
            createdAt: edge.created_at || null,
            expiresAt: edge.expired_at || null,
            source: edge.source_description || null,
            sourceNode: edge.source_node?.name || null,
            targetNode: edge.target_node?.name || null
        }));
    }, []);
}

module.exports = {
    isEnabled,
    recordVariantFeedback,
    searchInsights
};
