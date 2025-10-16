const config = require('../../../src/config');
const logger = require('../../../src/config/logger');
const databaseConfig = require('../../../src/config/database');

describe('Configuration Module', () => {
    describe('Main Config', () => {
        test('should load environment variables', () => {
            expect(config).toBeDefined();
            expect(config.env).toBeDefined();
            expect(config.port).toBeDefined();
        });

        test('should have JWT configuration', () => {
            expect(config.jwt).toBeDefined();
            expect(config.jwt.secret).toBeDefined();
            expect(config.jwt.expiresIn).toBe('24h');
        });

        test('should have usage limits', () => {
            expect(config.limits).toBeDefined();
            expect(config.limits.free).toBe(10);
            expect(config.limits.pro).toBe(-1);
        });

        test('should have LLM configuration', () => {
            expect(config.llm).toBeDefined();
            expect(config.llm.provider).toBeDefined();
            expect(config.llm.apiKeys).toBeDefined();
        });

        test('should have AI Portal configuration', () => {
            expect(config.aiPortal).toBeDefined();
            expect(config.aiPortal.apiKey).toBeDefined();
        });

        test('should have database configuration', () => {
            expect(config.database).toBeDefined();
            expect(config.database.url).toBeDefined();
            expect(typeof config.database.isSQLite).toBe('boolean');
        });

        test('should have CORS configuration', () => {
            expect(config.cors).toBeDefined();
            expect(Array.isArray(config.cors.origins)).toBe(true);
            expect(config.cors.methods).toBeDefined();
        });

        test('should have bcrypt configuration', () => {
            expect(config.bcrypt).toBeDefined();
            expect(config.bcrypt.saltRounds).toBe(10);
        });
    });

    describe('Logger', () => {
        test('should create logger instance', () => {
            expect(logger).toBeDefined();
            expect(logger.info).toBeDefined();
            expect(logger.error).toBeDefined();
            expect(logger.warn).toBeDefined();
        });

        test('should create child logger', () => {
            const childLogger = logger.child({ module: 'test' });
            expect(childLogger).toBeDefined();
            expect(childLogger.info).toBeDefined();
        });
    });

    describe('Database Config', () => {
        test('should have database URL', () => {
            expect(databaseConfig.url).toBeDefined();
            expect(typeof databaseConfig.isSQLite).toBe('boolean');
        });

        test('should have SQLite config when using SQLite', () => {
            if (databaseConfig.isSQLite) {
                expect(databaseConfig.sqlite).toBeDefined();
                expect(databaseConfig.sqlite.path).toBeDefined();
            }
        });

        test('should have PostgreSQL config', () => {
            expect(databaseConfig.postgres).toBeDefined();
            expect(databaseConfig.postgres.connectionString).toBeDefined();
        });
    });
});
