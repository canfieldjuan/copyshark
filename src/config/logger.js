const pino = require('pino');
const config = require('./index');

const logger = pino({
    name: 'copyshark',
    level: process.env.LOG_LEVEL || 'info',
    transport: config.env === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    } : undefined
});

function createChildLogger(moduleName) {
    return logger.child({ module: moduleName });
}

module.exports = logger;
module.exports.createChildLogger = createChildLogger;
