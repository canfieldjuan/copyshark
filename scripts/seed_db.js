const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const buildLogger = require('pino');

const logger = buildLogger({ name: 'seed-script' });
const isSQLite = process.env.DATABASE_URL?.startsWith('sqlite:');
let sqliteDb;
let pool;

const taxonomy = {
    niches: [
        { id: 'ecommerce', name: 'eCommerce', description: 'Online retail and direct-to-consumer products.' },
        { id: 'saas', name: 'SaaS', description: 'Software-as-a-Service platforms and tools.' },
        { id: 'general', name: 'General', description: 'Default niche when no specialization is provided.' },
        { id: 'llm-tuning', name: 'LLM Fine-tuning and Training', description: 'Creating specialized AI models.' }
    ],
    frameworks: [
        { id: 'aida', name: 'AIDA', description: 'Attention, Interest, Desire, Action' },
        { id: 'pas', name: 'PAS', description: 'Problem-Agitate-Solution' }
    ]
};

const llmKeywords = [
    'LoRA',
    'hyperparameters',
    'inference',
    'quantization',
    'overfitting',
    'training data',
    'foundation model',
    'instruction tuning'
];

if (isSQLite) {
    const dbPath = process.env.DATABASE_URL.replace('sqlite:', '');
    sqliteDb = new sqlite3.Database(dbPath);
    logger.info({ dbPath }, 'Connected to SQLite database');
} else {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    logger.info('Connected to PostgreSQL database');
}

function initializeSqliteSchema() {
    return new Promise((resolve, reject) => {
        const schemaSql = `
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                plan TEXT NOT NULL DEFAULT 'free',
                usage_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                last_active TEXT
            );

            CREATE TABLE IF NOT EXISTS niches (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS frameworks (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS niche_keywords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                niche_id TEXT NOT NULL,
                keyword TEXT NOT NULL,
                FOREIGN KEY (niche_id) REFERENCES niches (id),
                UNIQUE (niche_id, keyword)
            );
        `;

        sqliteDb.serialize(() => {
            sqliteDb.exec(schemaSql, (err) => {
                if (err) return reject(err);
                logger.info('SQLite schema verified');
                resolve();
            });
        });
    });
}

async function initializePostgresSchema() {
    const client = await pool.connect();
    const statements = [
        `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            plan TEXT NOT NULL DEFAULT 'free',
            usage_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL,
            last_active TIMESTAMPTZ
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS niches (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS frameworks (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS niche_keywords (
            id SERIAL PRIMARY KEY,
            niche_id TEXT NOT NULL REFERENCES niches (id) ON DELETE CASCADE,
            keyword TEXT NOT NULL,
            UNIQUE (niche_id, keyword)
        );
        `
    ];

    try {
        for (const statement of statements) {
            await client.query(statement);
        }
        logger.info('PostgreSQL schema verified');
    } finally {
        client.release();
    }
}

async function initializeSchema() {
    if (isSQLite) {
        await initializeSqliteSchema();
    } else {
        await initializePostgresSchema();
    }
}

function seedSqliteCollection(table, rows) {
    return new Promise((resolve, reject) => {
        sqliteDb.serialize(() => {
            const placeholders = {
                niches: 'INSERT OR IGNORE INTO niches (id, name, description) VALUES (?, ?, ?)',
                frameworks: 'INSERT OR IGNORE INTO frameworks (id, name, description) VALUES (?, ?, ?)',
                keywords: 'INSERT OR IGNORE INTO niche_keywords (niche_id, keyword) VALUES (?, ?)'
            };
            const stmt = sqliteDb.prepare(placeholders[table]);
            for (const row of rows) {
                stmt.run(...row, (err) => {
                    if (err) logger.error({ err, table, row }, 'Seeding row failed');
                });
            }
            stmt.finalize((err) => {
                if (err) return reject(err);
                logger.info({ table }, 'Seeded collection');
                resolve();
            });
        });
    });
}

async function seedPostgresCollection(table, rows) {
    const client = await pool.connect();
    try {
        for (const row of rows) {
            if (table === 'niches') {
                await client.query(
                    'INSERT INTO niches (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
                    row
                );
            } else if (table === 'frameworks') {
                await client.query(
                    'INSERT INTO frameworks (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
                    row
                );
            } else if (table === 'keywords') {
                await client.query(
                    'INSERT INTO niche_keywords (niche_id, keyword) VALUES ($1, $2) ON CONFLICT (niche_id, keyword) DO NOTHING',
                    row
                );
            }
        }
        logger.info({ table }, 'Seeded collection');
    } finally {
        client.release();
    }
}

function mapTaxonomyRows() {
    const nicheRows = taxonomy.niches.map((niche) => [niche.id, niche.name, niche.description || '']);
    const frameworkRows = taxonomy.frameworks.map((framework) => [framework.id, framework.name, framework.description || '']);
    const keywordRows = llmKeywords.map((keyword) => ['llm-tuning', keyword]);
    return { nicheRows, frameworkRows, keywordRows };
}

async function seedTaxonomy() {
    const { nicheRows, frameworkRows, keywordRows } = mapTaxonomyRows();

    if (isSQLite) {
        await seedSqliteCollection('niches', nicheRows);
        await seedSqliteCollection('frameworks', frameworkRows);
        await seedSqliteCollection('keywords', keywordRows);
    } else {
        await seedPostgresCollection('niches', nicheRows);
        await seedPostgresCollection('frameworks', frameworkRows);
        await seedPostgresCollection('keywords', keywordRows);
    }
}

(async () => {
    try {
        await initializeSchema();
        await seedTaxonomy();
        logger.info('Database seeding complete');
    } catch (err) {
        logger.error({ err }, 'Database seeding failed');
        process.exitCode = 1;
    } finally {
        if (sqliteDb) {
            sqliteDb.close();
        }
        if (pool) {
            await pool.end();
        }
        logger.info('Seeding process finished');
    }
})();
