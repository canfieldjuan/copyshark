const config = require('../config');
const logger = require('../config/logger').child({ module: 'copyService' });
const taxonomyService = require('./taxonomy.service');
const { ApiError } = require('../../utils/errors');

let llmService;
try {
    llmService = require('../../services/llmService.js');
} catch (error) {
    logger.error({ err: error }, 'LLM service unavailable');
    llmService = null;
}

let db;
try {
    db = require('../../database.js');
} catch (error) {
    logger.warn({ err: error }, 'Database module unavailable; usage enforcement disabled');
    db = null;
}

function cleanText(value) {
    return String(value ?? '').trim();
}

async function buildCopyPrompt({ productName, audience, nicheId, frameworkId, tone }) {
    const safeProduct = cleanText(productName);
    const safeAudience = cleanText(audience);
    const safeTone = cleanText(tone) || 'professional';
    const fallbackNicheId = cleanText(nicheId) || 'general';
    const fallbackFrameworkId = cleanText(frameworkId) || 'aida';

    const nicheMeta = taxonomyService.getNicheMeta(fallbackNicheId) || taxonomyService.getNicheMeta(nicheId);
    const frameworkMeta = taxonomyService.getFrameworkMeta(fallbackFrameworkId) || taxonomyService.getFrameworkMeta(frameworkId);

    const resolvedNicheId = nicheMeta?.id || fallbackNicheId;
    const resolvedFrameworkId = frameworkMeta?.id || fallbackFrameworkId;
    const resolvedNicheName = nicheMeta?.name || fallbackNicheId;
    const resolvedFrameworkName = frameworkMeta?.name || fallbackFrameworkId;
    const keywords = await taxonomyService.getNicheKeywords(resolvedNicheId);

    const keywordInstruction = keywords.length
        ? `Use these niche-specific keywords where natural: ${keywords.join(', ')}.`
        : '';

    const prompt = [
        '🦈 You are CopyShark - an elite, ruthless copywriter who writes copy that SELLS.',
        'Your mission: craft irresistible marketing copy that tugs at wallets and drives immediate action.',
        '',
        '⚡ YOUR COPYWRITING RULES:',
        '1. Lead with PAIN or DESIRE - hit emotional triggers hard',
        '2. Create URGENCY - make them feel they\'ll miss out if they don\'t act NOW',
        '3. Use POWER WORDS - transform, dominate, breakthrough, explosive, guaranteed, proven',
        '4. Be SPECIFIC - use numbers, percentages, concrete results (not vague promises)',
        '5. Write like you\'re having a 1-on-1 conversation - direct, personal, compelling',
        '6. Every sentence must EARN its place - cut fluff, maximize impact',
        '7. The CTA must be IRRESISTIBLE - make saying "no" feel like a mistake',
        '',
        '🎯 YOUR ASSIGNMENT:',
        `Product: "${safeProduct}"`,
        `Target Audience: "${safeAudience}"`,
        `Industry Context: "${resolvedNicheName}"`,
        `Persuasion Framework: "${resolvedFrameworkName}"`,
        `Tone: "${safeTone}"`,
        keywordInstruction,
        '',
        '💰 WHAT MAKES GREAT COPY:',
        '- Headlines that stop the scroll and demand attention',
        '- Body copy that builds desire and eliminates objections',
        '- CTAs that feel like the only logical next step',
        '- Language that speaks to aspirations AND fears',
        '- Specificity that builds credibility (numbers, proof, results)',
        '',
        '📝 OUTPUT FORMAT:',
        'Return ONLY a raw JSON object with these keys:',
        '{"headline": "60 chars max, punchy, benefit-driven", "body": "2-4 sentences, build desire and urgency", "cta": "Action-oriented, 3-5 words"}',
        '',
        '🔥 Now write copy that CONVERTS. Make every word count. Sell, sell, SELL!'
    ]
        .filter(Boolean)
        .join('\n');

    return {
        prompt,
        context: {
            nicheId: resolvedNicheId,
            frameworkId: resolvedFrameworkId,
            nicheName: resolvedNicheName,
            frameworkName: resolvedFrameworkName,
            keywords
        }
    };
}

async function enforceUsageLimit(userId, log) {
    if (!db || !userId) {
        return;
    }

    const user = await db.getUser(userId);
    if (!user) {
        return;
    }

    const limit = config.limits[user.plan] || config.limits.free;
    if (limit !== -1 && user.usage_count >= limit) {
        log?.warn({ userId, plan: user.plan, usage: user.usage_count, limit }, 'User exceeded usage limit');
        throw new ApiError(429, `Usage limit reached for ${user.plan} plan. Upgrade to continue.`);
    }
}

async function incrementUsage(userId, log) {
    if (!db || !userId) {
        return;
    }

    try {
        await db.incrementUserUsage(userId);
        log?.info({ userId, event: 'usage_incremented' }, 'User usage count incremented');
    } catch (error) {
        log?.error({ err: error, userId }, 'Failed to increment usage count');
    }
}

async function generateCopy(payload, { userId = null, isAIPortal = false, log } = {}) {
    if (!llmService) {
        throw new ApiError(503, 'AI service not available');
    }

    if (!isAIPortal) {
        await enforceUsageLimit(userId, log);
    } else {
        log?.info({ event: 'ai_portal_request' }, 'AI Portal request detected');
    }

    const { prompt, context } = await buildCopyPrompt(payload);

    log?.info(
        {
            event: 'generate_copy_request',
            context,
            userId: userId || 'anonymous',
            isAIPortal,
            preview: prompt.slice(0, 160),
            model: payload.model || 'default'
        },
        'Dispatching prompt to LLM service'
    );

    const generatedCopy = await llmService.generate(prompt, { model: payload.model });

    if (!isAIPortal) {
        await incrementUsage(userId, log);
    }

    log?.info(
        {
            event: 'generate_copy_success',
            context,
            userId: userId || 'anonymous',
            model: payload.model || 'default'
        },
        'Copy generated successfully'
    );

    return { copy: generatedCopy, context };
}

module.exports = {
    buildCopyPrompt,
    generateCopy,
    enforceUsageLimit,
    incrementUsage
};
