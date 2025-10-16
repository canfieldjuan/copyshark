const { ApiError } = require('../../utils/errors');
const taxonomyService = require('../services/taxonomy.service');
const copyService = require('../services/copy.service');

let getModelCatalog = () => ({ provider: 'openai', models: [] });

function setModelCatalogProvider(provider) {
    if (typeof provider === 'function') {
        getModelCatalog = provider;
    }
}

async function callFunction(req, res, next) {
    try {
        const { function_name: functionName, arguments: args } = req.body;

        switch (functionName) {
            case 'generateAdCopy': {
                const { copy } = await copyService.generateCopy(args, {
                    isAIPortal: true,
                    log: req.log
                });
                return res.json({ success: true, result: { copy } });
            }
            case 'getFrameworks':
                return res.json({ success: true, result: taxonomyService.getTaxonomyObject('frameworks') });
            case 'getNiches':
                return res.json({ success: true, result: taxonomyService.getTaxonomyObject('niches') });
            case 'getUserUsage':
                return res.json({
                    success: true,
                    result: {
                        email: 'ai-portal@system',
                        plan: 'unlimited',
                        usage: 0
                    }
                });
            default:
                return res.status(404).json({ success: false, error: `Function ${functionName} not found` });
        }
    } catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({ success: false, error: error.message });
        }
        req.log?.error({ err: error }, 'Function call error');
        return res.status(500).json({ success: false, error: error.message });
    }
}

function getFunctionDefinitions(req, res, next) {
    try {
        const catalog = getModelCatalog();
        const modelEnum = Array.isArray(catalog.models)
            ? catalog.models.map((item) => item.id)
            : [];

        const functionDefinitions = [
            {
                name: 'generateAdCopy',
                description: 'Generate marketing ad copy with headline, body, and call-to-action using AI',
                parameters: {
                    type: 'object',
                    properties: {
                        productName: {
                            type: 'string',
                            description: 'Name or description of the product/service to advertise'
                        },
                        audience: {
                            type: 'string',
                            description: "Target audience for the ad (e.g. 'busy professionals', 'fitness enthusiasts')"
                        },
                        niche: {
                            type: 'string',
                            description: 'Business niche/category',
                            enum: taxonomyService.getTaxonomyIds('niches')
                        },
                        framework: {
                            type: 'string',
                            description: 'Marketing framework to use for the copy structure',
                            enum: taxonomyService.getTaxonomyIds('frameworks')
                        },
                        tone: {
                            type: 'string',
                            description: 'Tone of voice for the ad',
                            enum: ['professional', 'casual', 'urgent', 'friendly', 'authoritative', 'playful', 'emotional']
                        },
                        model: {
                            type: 'string',
                            description: 'Override the default LLM model for this request',
                            enum: modelEnum
                        }
                    },
                    required: ['productName', 'audience']
                }
            },
            {
                name: 'getFrameworks',
                description: 'Get available marketing frameworks for ad generation',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'getNiches',
                description: 'Get available business niches for ad targeting',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'getUserUsage',
                description: "Get current user's plan and usage statistics",
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        ];

        res.json({ success: true, functions: functionDefinitions });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    callFunction,
    getFunctionDefinitions,
    setModelCatalogProvider
};
