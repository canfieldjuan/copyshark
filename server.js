const express = require('express');
const cors = require('cors');
const path = require('path');
const pinoHttp = require('pino-http');

const config = require('./src/config');
const logger = require('./src/config/logger');
const { errorHandler } = require('./src/middleware');
const { metaController, aiPortalController } = require('./src/controllers');
const registerRoutes = require('./src/routes');
const taxonomyService = require('./src/services/taxonomy.service');

const httpLogger = pinoHttp({ logger });
const app = express();

app.use(httpLogger);

// Conditionally load your custom modules
let llmService;
let db;
try {
    llmService = require('./services/llmService');
} catch (err) {
    // This happens before request logging is set up, so use console
    console.warn('LLM Service not available:', err.message);
}

try {
    db = require('./database');
} catch (err) {
    console.warn('Database module not available:', err.message);
}
function getModelCatalog() {
    if (!llmService?.getModelCatalog) {
        return { provider: 'openai', models: [] };
    }
    return llmService.getModelCatalog();
}

// Enhanced CORS configuration for AI Portal integration
app.use(cors({
    origin: config.cors.origins,
    credentials: config.cors.credentials,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders
}));

app.use(express.json());

metaController.setModelCatalogProvider(getModelCatalog);
aiPortalController.setModelCatalogProvider(getModelCatalog);

registerRoutes(app);

// Error handling middleware
app.use(errorHandler);

// Serve frontend
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'app.html'));
});

const PORT = config.port;
const HOST = "0.0.0.0";

function enableHotReload(serverInstance) {
    const shutdown = (signal) => {
        logger.info({ signal }, 'Received shutdown signal');
        serverInstance.close(() => {
            process.exit(0);
        });
    };

    process.once('SIGUSR2', () => {
        logger.info('Hot reload signal received (SIGUSR2)');
        serverInstance.close(() => {
            process.kill(process.pid, 'SIGUSR2');
        });
    });

    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.once(signal, () => shutdown(signal));
    }
}

const startServer = async () => {
    try {
        if (db?.initializeSchema) {
            await db.initializeSchema();
            await taxonomyService.refreshTaxonomyCache();
        } else {
            logger.warn('Database module missing initializeSchema; skipping migration step');
        }

        const server = app.listen(PORT, HOST, () => {
            logger.info({ host: HOST, port: PORT }, 'CopyShark server is live');
            logger.info({ aiPortal: !!config.aiPortal.apiKey, llm: !!llmService, database: !!db }, 'Service capability flags');
            logger.info({
                frameworks: taxonomyService.getTaxonomyList('frameworks').length,
                niches: taxonomyService.getTaxonomyList('niches').length
            }, 'Cached taxonomy counts');
            if (llmService?.getModelCatalog) {
                const catalog = llmService.getModelCatalog();
                logger.info({ provider: catalog.provider, models: catalog.models.map(item => item.id) }, 'LLM catalog ready');
            }
        });

        enableHotReload(server);
    } catch (error) {
        logger.error({ err: error }, 'Failed to start server');
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = { app };
