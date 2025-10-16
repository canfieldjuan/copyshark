let modelCatalogProvider = () => ({ provider: 'openai', models: [] });

function setModelCatalogProvider(provider) {
    if (typeof provider === 'function') {
        modelCatalogProvider = provider;
    }
}

function health(req, res) {
    res.json({
        success: true,
        service: 'CopyShark',
        status: 'online',
        timestamp: new Date().toISOString(),
        available_functions: [
            'generateAdCopy',
            'getFrameworks',
            'getNiches',
            'getUserUsage'
        ]
    });
}

function models(req, res, next) {
    try {
        const catalog = modelCatalogProvider();
        res.json({ success: true, provider: catalog.provider, models: catalog.models });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    health,
    models,
    setModelCatalogProvider
};
