const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');
const buildLogger = require('pino');

const OPENAI_MODELS = [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', description: 'Fast, cost-effective JSON compliant model.' },
    { id: 'gpt-4o', label: 'GPT-4o', description: 'Production-grade reasoning with high quality output.' },
    { id: 'gpt-4o-mini-translate', label: 'GPT-4o mini Translate', description: 'Lightweight variant tuned for multilingual copy.' }
];

const ANTHROPIC_MODELS = [
    { id: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet', description: 'Balanced response quality and latency.' },
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: 'Anthropic flagship model for long-form writing.' },
    { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Low-latency Claude option for fast drafts.' }
];

const GOOGLE_MODELS = [
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Google fast generation model with JSON output.' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Higher quality Gemini model for nuanced copy.' },
    { id: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro', description: 'Stable Gemini baseline for compatibility.' }
];

const MODEL_REGISTRY = {
    openai: OPENAI_MODELS,
    anthropic: ANTHROPIC_MODELS,
    google: GOOGLE_MODELS
};

const PROVIDER_DETAILS = {
    openai: { envKeys: ['OPENAI_API_KEY'], defaultModel: OPENAI_MODELS[0].id },
    anthropic: { envKeys: ['ANTHROPIC_API_KEY'], defaultModel: ANTHROPIC_MODELS[0].id },
    google: { envKeys: ['GOOGLE_AI_API_KEY', 'GEMINI_API_KEY'], defaultModel: GOOGLE_MODELS[0].id }
};

const PROVIDER_PRIORITY = ['openai', 'anthropic', 'google'];

const DEFAULT_CACHE_TTL = 5 * 60 * 1000;
const DEFAULT_TIMEOUT = 30000;

function asNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function normalizeProvider(value) {
    return hasText(value) ? value.trim().toLowerCase() : '';
}

function modelSupported(provider, model) {
    return MODEL_REGISTRY[provider]?.some(item => item.id === model);
}

function buildGoogleSafetySettings() {
    return [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
    ];
}

class LLMService {
    constructor() {
        this.logger = buildLogger({ name: 'llm-service' });
        this.cache = new Map();
        this.cacheMaxAge = DEFAULT_CACHE_TTL;
        this.requestHistory = [];
        this.maxRequestsPerMinute = asNumber(process.env.LLM_MAX_RPM, 60);
        this.defaultTemperature = asNumber(process.env.LLM_TEMPERATURE, 0.7);
        this.defaultMaxTokens = asNumber(process.env.LLM_MAX_OUTPUT, 1024);
        this.provider = this.selectProvider();
        this.defaultModel = this.selectDefaultModel(this.provider);
        this.googleClient = null;
        this.googleSafety = buildGoogleSafetySettings();
        this.logger.info({ provider: this.provider, model: this.defaultModel }, 'LLM service configured');
    }

    selectProvider() {
        const envProvider = normalizeProvider(process.env.LLM_PROVIDER);
        if (this.isReadyProvider(envProvider)) {
            return envProvider;
        }
        for (const provider of PROVIDER_PRIORITY) {
            if (this.isReadyProvider(provider)) {
                return provider;
            }
        }
        return envProvider || 'openai';
    }

    selectDefaultModel(provider) {
        const envModel = process.env.LLM_MODEL;
        if (hasText(envModel) && modelSupported(provider, envModel.trim())) {
            return envModel.trim();
        }
        return PROVIDER_DETAILS[provider]?.defaultModel;
    }

    isReadyProvider(provider) {
        if (!provider || !PROVIDER_DETAILS[provider]) {
            return false;
        }
        const keys = PROVIDER_DETAILS[provider].envKeys;
        return keys.some(key => hasText(process.env[key]));
    }

    ensureProviderReady() {
        if (!this.isReadyProvider(this.provider)) {
            throw new Error('LLM provider not initialized - missing API key');
        }
    }

    resolveModel(requested) {
        if (hasText(requested)) {
            const trimmed = requested.trim();
            if (modelSupported(this.provider, trimmed)) {
                return trimmed;
            }
            this.logger.warn({ provider: this.provider, model: trimmed }, 'Requested model not available for provider');
        }
        return this.defaultModel;
    }

    validateInput(prompt) {
        if (!hasText(prompt)) {
            throw new Error('Prompt must be a non-empty string');
        }
        if (prompt.length > 30000) {
            throw new Error('Prompt too long (max 30,000 characters)');
        }
        const flagged = [
            /\b(hack|exploit|malware|virus)\b/i,
            /\b(illegal|drugs|violence)\b/i
        ];
        for (const pattern of flagged) {
            if (pattern.test(prompt)) {
                this.logger.warn({ pattern: pattern.toString() }, 'Potentially problematic content detected');
                break;
            }
        }
    }

    guardRateLimit() {
        const now = Date.now();
        const windowStart = now - 60000;
        this.requestHistory = this.requestHistory.filter(time => time > windowStart);
        if (this.requestHistory.length >= this.maxRequestsPerMinute) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
        this.requestHistory.push(now);
    }

    getCacheKey(prompt, options = {}) {
        const key = JSON.stringify({ prompt, ...options });
        return Buffer.from(key).toString('base64').substring(0, 50);
    }

    readCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (!cached) {
            return null;
        }
        if (Date.now() - cached.timestamp > this.cacheMaxAge) {
            this.cache.delete(cacheKey);
            return null;
        }
        return cached.response;
    }

    writeCache(cacheKey, response) {
        this.cache.set(cacheKey, { response, timestamp: Date.now() });
        if (this.cache.size > 100) {
            const [oldestKey] = this.cache.keys();
            this.cache.delete(oldestKey);
        }
    }

    async generate(prompt, options = {}) {
        this.ensureProviderReady();
        this.validateInput(prompt);
        this.guardRateLimit();
        const cacheKey = this.getCacheKey(prompt, options);
        const cached = this.readCache(cacheKey);
        if (cached) {
            this.logger.debug({ cacheKey }, 'Returning cached LLM response');
            return cached;
        }
        const model = this.resolveModel(options.model);
        const payload = {
            prompt,
            model,
            temperature: asNumber(options.temperature, this.defaultTemperature),
            maxTokens: asNumber(options.maxTokens, this.defaultMaxTokens)
        };
        try {
            const raw = await this.retryRequest(controller => this.dispatchPrompt(payload, controller));
            const parsed = this.parseAIResponse(raw);
            this.writeCache(cacheKey, parsed);
            this.logger.info({ provider: this.provider, model, cacheKey }, 'LLM response generated');
            return parsed;
        } catch (error) {
            this.logger.error({ err: error, provider: this.provider, model }, 'LLM generation failed, returning fallback');
            return this.fallbackResponse(prompt);
        }
    }

    async dispatchPrompt({ prompt, model, temperature, maxTokens }, controller) {
        if (this.provider === 'openai') {
            return this.callOpenAI({ prompt, model, temperature, maxTokens }, controller);
        }
        if (this.provider === 'anthropic') {
            return this.callAnthropic({ prompt, model, temperature, maxTokens }, controller);
        }
        return this.callGoogle({ prompt, model, temperature, maxTokens }, controller);
    }

    async callOpenAI({ prompt, model, temperature, maxTokens }, controller) {
        const apiKey = process.env.OPENAI_API_KEY;
        const body = {
            model,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: 'You are an expert copywriter. Respond with raw JSON only.' },
                { role: 'user', content: prompt }
            ]
        };
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(body),
            signal: controller?.signal
        });
        const data = await response.json();
        if (!response.ok) {
            const message = data?.error?.message || response.statusText;
            throw new Error(`OpenAI error: ${message}`);
        }
        return data?.choices?.[0]?.message?.content || '';
    }

    async callAnthropic({ prompt, model, temperature, maxTokens }, controller) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const body = {
            model,
            temperature,
            max_tokens: maxTokens,
            system: 'You are an expert copywriter. Respond with raw JSON only.',
            messages: [{ role: 'user', content: prompt }]
        };
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body),
            signal: controller?.signal
        });
        const data = await response.json();
        if (!response.ok) {
            const message = data?.error?.message || response.statusText;
            throw new Error(`Anthropic error: ${message}`);
        }
        const parts = Array.isArray(data?.content) ? data.content : [];
        return parts.map(part => part.text || '').join('\n');
    }

    async callGoogle({ prompt, model, temperature, maxTokens }) {
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!this.googleClient) {
            this.googleClient = new GoogleGenerativeAI(apiKey);
        }
        const generationConfig = {
            temperature,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: maxTokens,
            responseMimeType: 'text/plain'
        };
        const generativeModel = this.googleClient.getGenerativeModel({
            model,
            generationConfig,
            safetySettings: this.googleSafety
        });
        const result = await generativeModel.generateContent(prompt);
        return result?.response?.text() || '';
    }

    async retryRequest(fn, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
            try {
                const value = await fn(controller);
                clearTimeout(timer);
                return value;
            } catch (error) {
                clearTimeout(timer);
                if (attempt === maxRetries) {
                    throw error;
                }
                const retryable = /(rate limit|timeout|temporarily unavailable|abort)/i.test(error.message || '');
                if (!retryable) {
                    throw error;
                }
                const delay = Math.pow(2, attempt) * 1000;
                this.logger.warn({ attempt, delay }, 'LLM request failed, retrying');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('LLM retry logic exhausted');
    }

    parseAIResponse(text) {
        if (!hasText(text)) {
            throw new Error('Empty response from LLM provider');
        }
        this.logger.debug({ preview: text.slice(0, 120) }, 'Raw LLM response');
        try {
            return JSON.parse(text);
        } catch (primaryError) {
            this.logger.debug({ err: primaryError.message }, 'Direct JSON parse failed, attempting cleanup');
        }
        const cleaned = text.trim()
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .replace(/^[^{]*{/, '{')
            .replace(/}[^}]*$/, '}');
        try {
            return JSON.parse(cleaned);
        } catch (cleanError) {
            this.logger.debug({ err: cleanError.message }, 'Cleanup parse failed, attempting regex extraction');
        }
        const match = text.match(/\{[\s\S]*?\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (regexError) {
                this.logger.debug({ err: regexError.message }, 'Regex parse failed, falling back to heuristics');
            }
        }
        const lines = text.split('\n').filter(line => hasText(line));
        const extract = (pattern, fallback) => {
            for (const line of lines) {
                const candidate = line.match(pattern);
                if (candidate) {
                    return candidate[1].replace(/['"]/g, '').trim();
                }
            }
            return fallback;
        };
        return {
            headline: extract(/(?:headline|title)[:=]\s*["']?([^"'\n]+)["']?/i, 'Transform Your Business Today!'),
            body: extract(/(?:body|description|content)[:=]\s*["']?([^"'\n]+)["']?/i, 'Discover powerful solutions that deliver real results for your business.'),
            cta: extract(/(?:cta|call.to.action|button)[:=]\s*["']?([^"'\n]+)["']?/i, 'Get Started Now!')
        };
    }

    fallbackResponse(prompt) {
        const lower = prompt.toLowerCase();
        if (lower.includes('ecommerce') || lower.includes('shop')) {
            return {
                headline: 'Shop Smart, Save More Today!',
                body: 'Discover amazing deals on products you love. Free shipping and easy returns on all orders.',
                cta: 'Shop Now!'
            };
        }
        if (lower.includes('saas') || lower.includes('software')) {
            return {
                headline: 'Streamline Your Workflow',
                body: 'Powerful software solutions that grow with your business. Join thousands of satisfied customers.',
                cta: 'Start Free Trial'
            };
        }
        return {
            headline: 'Transform Your Business Today!',
            body: 'Discover the power of AI-driven solutions that deliver real results. Join thousands of successful businesses.',
            cta: 'Get Started!'
        };
    }

    getModelCatalog() {
        const models = MODEL_REGISTRY[this.provider] || [];
        return {
            provider: this.provider,
            models: models.map(item => ({
                id: item.id,
                label: item.label,
                description: item.description
            }))
        };
    }

    getStats() {
        return {
            provider: this.provider,
            requestCount: this.requestHistory.length,
            cacheSize: this.cache.size,
            defaultModel: this.defaultModel
        };
    }

    clearCache() {
        this.cache.clear();
        this.logger.info('LLM cache cleared');
    }

    async healthCheck() {
        if (!this.isReadyProvider(this.provider)) {
            return { status: 'error', message: 'Service not initialized' };
        }
        try {
            await this.generate('Health check prompt', { skipCache: true });
            return { status: 'healthy', stats: this.getStats() };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
}

module.exports = new LLMService();
