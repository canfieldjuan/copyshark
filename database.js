const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const buildLogger = require('pino');
const logger = buildLogger({ name: 'database' });
const saltRounds = 10;

// Check if using SQLite or PostgreSQL
const isSQLite = process.env.DATABASE_URL?.startsWith('sqlite:');
let pool;
let db;

if (isSQLite) {
    // SQLite setup
    const dbPath = process.env.DATABASE_URL.replace('sqlite:', '');
    db = new sqlite3.Database(dbPath);
    logger.info('✅ Connecting to SQLite database...');
} else {
    // PostgreSQL setup
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
        } : false
    });
    logger.info('✅ Connecting to PostgreSQL database...');
}

const initializeSchema = async () => {
    if (isSQLite) {
        // SQLite schema
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

                CREATE TABLE IF NOT EXISTS brand_profiles (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    tone TEXT,
                    audience TEXT,
                    value_props TEXT,
                    brand_voice TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(user_id, name),
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_brand_profiles_user ON brand_profiles(user_id);

                CREATE TABLE IF NOT EXISTS copy_projects (
                    id TEXT PRIMARY KEY,
                    brand_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    objective TEXT,
                    brief TEXT,
                    niche_id TEXT,
                    framework_id TEXT,
                    target_channel TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (brand_id) REFERENCES brand_profiles (id) ON DELETE CASCADE,
                    FOREIGN KEY (niche_id) REFERENCES niches (id),
                    FOREIGN KEY (framework_id) REFERENCES frameworks (id)
                );
                CREATE INDEX IF NOT EXISTS idx_copy_projects_brand ON copy_projects(brand_id);
                CREATE INDEX IF NOT EXISTS idx_copy_projects_created ON copy_projects(created_at);

                CREATE TABLE IF NOT EXISTS copy_variants (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    model TEXT,
                    headline TEXT,
                    body TEXT,
                    cta TEXT,
                    tone_snapshot TEXT,
                    score INTEGER,
                    is_favorite INTEGER DEFAULT 0,
                    metadata TEXT,
                    generated_at TEXT NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES copy_projects (id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_copy_variants_project ON copy_variants(project_id);
                CREATE INDEX IF NOT EXISTS idx_copy_variants_favorite ON copy_variants(is_favorite);

                CREATE TABLE IF NOT EXISTS variant_feedback (
                    id TEXT PRIMARY KEY,
                    variant_id TEXT NOT NULL,
                    rating INTEGER,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (variant_id) REFERENCES copy_variants (id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_variant_feedback_variant ON variant_feedback(variant_id);
            `;

            db.serialize(() => {
                db.exec('PRAGMA foreign_keys = ON;');
                db.exec(schemaSql, (err) => {
                    if (err) {
                        logger.error({ err }, 'Failed to initialize SQLite schema');
                        reject(err);
                    } else {
                        logger.info('✅ SQLite database schema verified.');
                        resolve();
                    }
                });
            });
        });
    } else {
        // PostgreSQL schema
        const client = await pool.connect();
        try {
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
                `,
                `
                CREATE TABLE IF NOT EXISTS brand_profiles (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    tone TEXT,
                    audience TEXT,
                    value_props TEXT,
                    brand_voice TEXT,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    UNIQUE (user_id, name)
                );
                `,
                `
                CREATE INDEX IF NOT EXISTS idx_brand_profiles_user ON brand_profiles(user_id);
                `,
                `
                CREATE TABLE IF NOT EXISTS copy_projects (
                    id TEXT PRIMARY KEY,
                    brand_id TEXT NOT NULL REFERENCES brand_profiles (id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    objective TEXT,
                    brief TEXT,
                    niche_id TEXT REFERENCES niches (id),
                    framework_id TEXT REFERENCES frameworks (id),
                    target_channel TEXT,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
                );
                `,
                `
                CREATE INDEX IF NOT EXISTS idx_copy_projects_brand ON copy_projects(brand_id);
                `,
                `
                CREATE INDEX IF NOT EXISTS idx_copy_projects_created ON copy_projects(created_at);
                `,
                `
                CREATE TABLE IF NOT EXISTS copy_variants (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL REFERENCES copy_projects (id) ON DELETE CASCADE,
                    model TEXT,
                    headline TEXT,
                    body TEXT,
                    cta TEXT,
                    tone_snapshot TEXT,
                    score INTEGER,
                    is_favorite BOOLEAN DEFAULT FALSE,
                    metadata JSONB,
                    generated_at TIMESTAMPTZ NOT NULL
                );
                `,
                `
                CREATE INDEX IF NOT EXISTS idx_copy_variants_project ON copy_variants(project_id);
                `,
                `
                CREATE INDEX IF NOT EXISTS idx_copy_variants_favorite ON copy_variants(is_favorite);
                `,
                `
                CREATE TABLE IF NOT EXISTS variant_feedback (
                    id TEXT PRIMARY KEY,
                    variant_id TEXT NOT NULL REFERENCES copy_variants (id) ON DELETE CASCADE,
                    rating INTEGER,
                    notes TEXT,
                    created_at TIMESTAMPTZ NOT NULL
                );
                `,
                `
                CREATE INDEX IF NOT EXISTS idx_variant_feedback_variant ON variant_feedback(variant_id);
                `
            ];

            for (const statement of statements) {
                await client.query(statement);
            }

            logger.info('✅ PostgreSQL database schema verified.');
        } finally {
            client.release();
        }
    }
};

initializeSchema().catch(err => logger.error({ err }, 'Failed to initialize schema'));

async function createUser(email, password) {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const id = randomUUID();
    const now = new Date().toISOString();
    
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
                [id, email, hashedPassword, now],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, email });
                }
            );
        });
    } else {
        const res = await pool.query(
            'INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4) RETURNING id, email',
            [id, email, hashedPassword, now]
        );
        return res.rows[0];
    }
}

async function findUserByEmail(email) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    } else {
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return res.rows[0];
    }
}

async function getUser(userId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    } else {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        return res.rows[0];
    }
}

async function incrementUserUsage(userId) {
    const now = new Date().toISOString();
    
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET usage_count = usage_count + 1, last_active = ? WHERE id = ?',
                [now, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    } else {
        await pool.query(
            'UPDATE users SET usage_count = usage_count + 1, last_active = $1 WHERE id = $2',
            [now, userId]
        );
    }
}

async function updateUserPlan(userId, newPlan) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.run('UPDATE users SET plan = ? WHERE id = ?', [newPlan, userId], (err) => {
                if (err) reject(err);
                else {
                    logger.info({ userId, newPlan }, 'User plan updated.');
                    resolve();
                }
            });
        });
    } else {
        await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [newPlan, userId]);
        logger.info({ userId, newPlan }, 'User plan updated.');
    }
}

async function getNiches() {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM niches', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    } else {
        const res = await pool.query('SELECT * FROM niches');
        return res.rows;
    }
}

async function getNicheById(nicheId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM niches WHERE id = ?', [nicheId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    } else {
        const res = await pool.query('SELECT * FROM niches WHERE id = $1', [nicheId]);
        return res.rows[0];
    }
}

async function getFrameworks() {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM frameworks', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    } else {
        const res = await pool.query('SELECT * FROM frameworks');
        return res.rows;
    }
}

async function getFrameworkById(frameworkId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM frameworks WHERE id = ?', [frameworkId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    } else {
        const res = await pool.query('SELECT * FROM frameworks WHERE id = $1', [frameworkId]);
        return res.rows[0];
    }
}

async function getKeywordsForNiche(nicheId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.all('SELECT keyword FROM niche_keywords WHERE niche_id = ?', [nicheId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.keyword));
            });
        });
    } else {
        const res = await pool.query('SELECT keyword FROM niche_keywords WHERE niche_id = $1', [nicheId]);
        return res.rows.map(row => row.keyword);
    }
}

function normalizeTimestamp(value) {
    return value instanceof Date ? value.toISOString() : value;
}

function parseMetadata(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (error) {
            return value;
        }
    }
    return value;
}

function mapBrandRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        tone: row.tone,
        audience: row.audience,
        valueProps: row.value_props,
        brandVoice: row.brand_voice,
        createdAt: normalizeTimestamp(row.created_at),
        updatedAt: normalizeTimestamp(row.updated_at)
    };
}

function mapProjectRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        brandId: row.brand_id,
        title: row.title,
        objective: row.objective,
        brief: row.brief,
        nicheId: row.niche_id,
        frameworkId: row.framework_id,
        targetChannel: row.target_channel,
        createdAt: normalizeTimestamp(row.created_at),
        updatedAt: normalizeTimestamp(row.updated_at)
    };
}

function mapVariantRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        projectId: row.project_id,
        model: row.model,
        headline: row.headline,
        body: row.body,
        cta: row.cta,
        toneSnapshot: row.tone_snapshot,
        score: row.score === null || row.score === undefined ? null : Number(row.score),
        isFavorite: row.is_favorite === true || row.is_favorite === 1,
        metadata: parseMetadata(row.metadata),
        generatedAt: normalizeTimestamp(row.generated_at)
    };
}

function mapFeedbackRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        variantId: row.variant_id,
        rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
        notes: row.notes,
        createdAt: normalizeTimestamp(row.created_at)
    };
}

async function createBrandProfile({ userId, name, tone, audience, valueProps, brandVoice }) {
    const id = randomUUID();
    const now = new Date().toISOString();

    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO brand_profiles (
                    id, user_id, name, tone, audience, value_props, brand_voice, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    userId,
                    name,
                    tone ?? null,
                    audience ?? null,
                    valueProps ?? null,
                    brandVoice ?? null,
                    now,
                    now
                ],
                (err) => {
                    if (err) return reject(err);
                    resolve(mapBrandRow({
                        id,
                        user_id: userId,
                        name,
                        tone,
                        audience,
                        value_props: valueProps ?? null,
                        brand_voice: brandVoice ?? null,
                        created_at: now,
                        updated_at: now
                    }));
                }
            );
        });
    }

    const res = await pool.query(
        `INSERT INTO brand_profiles (
            id, user_id, name, tone, audience, value_props, brand_voice, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz)
        RETURNING *`,
        [id, userId, name, tone ?? null, audience ?? null, valueProps ?? null, brandVoice ?? null, now, now]
    );
    return mapBrandRow(res.rows[0]);
}

async function listBrandProfilesByUser(userId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM brand_profiles WHERE user_id = ? ORDER BY updated_at DESC', [userId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(mapBrandRow));
            });
        });
    }

    const res = await pool.query(
        'SELECT * FROM brand_profiles WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
    );
    return res.rows.map(mapBrandRow);
}

async function getBrandProfileById(profileId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM brand_profiles WHERE id = ?', [profileId], (err, row) => {
                if (err) return reject(err);
                resolve(mapBrandRow(row));
            });
        });
    }

    const res = await pool.query('SELECT * FROM brand_profiles WHERE id = $1', [profileId]);
    return mapBrandRow(res.rows[0]);
}

async function updateBrandProfile(profileId, updates) {
    const allowed = {
        name: 'name',
        tone: 'tone',
        audience: 'audience',
        valueProps: 'value_props',
        brandVoice: 'brand_voice'
    };

    const assignments = [];
    const values = [];
    Object.entries(allowed).forEach(([inputKey, columnKey]) => {
        if (Object.prototype.hasOwnProperty.call(updates, inputKey)) {
            assignments.push(`${columnKey} = ?`);
            values.push(updates[inputKey] ?? null);
        }
    });

    const now = new Date().toISOString();

    if (!assignments.length) {
        return getBrandProfileById(profileId);
    }

    if (isSQLite) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE brand_profiles SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`;
            db.run(sql, [...values, now, profileId], async (err) => {
                if (err) return reject(err);
                try {
                    const refreshed = await getBrandProfileById(profileId);
                    resolve(refreshed);
                } catch (fetchError) {
                    reject(fetchError);
                }
            });
        });
    }

    const postgresAssignments = assignments.map((assignment, index) => assignment.replace('?', `$${index + 1}`));
    const queryText = `UPDATE brand_profiles SET ${postgresAssignments.join(', ')}, updated_at = $${assignments.length + 1} WHERE id = $${assignments.length + 2} RETURNING *`;
    const res = await pool.query(queryText, [...values, now, profileId]);
    return mapBrandRow(res.rows[0]);
}

async function deleteBrandProfile(profileId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM brand_profiles WHERE id = ?', [profileId], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    await pool.query('DELETE FROM brand_profiles WHERE id = $1', [profileId]);
}

async function createProject({
    brandId,
    title,
    objective,
    brief,
    nicheId,
    frameworkId,
    targetChannel
}) {
    const id = randomUUID();
    const now = new Date().toISOString();

    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO copy_projects (
                    id, brand_id, title, objective, brief, niche_id, framework_id, target_channel, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    brandId,
                    title,
                    objective ?? null,
                    brief ?? null,
                    nicheId ?? null,
                    frameworkId ?? null,
                    targetChannel ?? null,
                    now,
                    now
                ],
                (err) => {
                    if (err) return reject(err);
                    resolve(mapProjectRow({
                        id,
                        brand_id: brandId,
                        title,
                        objective: objective ?? null,
                        brief: brief ?? null,
                        niche_id: nicheId ?? null,
                        framework_id: frameworkId ?? null,
                        target_channel: targetChannel ?? null,
                        created_at: now,
                        updated_at: now
                    }));
                }
            );
        });
    }

    const res = await pool.query(
        `INSERT INTO copy_projects (
            id, brand_id, title, objective, brief, niche_id, framework_id, target_channel, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz)
        RETURNING *`,
        [
            id,
            brandId,
            title,
            objective ?? null,
            brief ?? null,
            nicheId ?? null,
            frameworkId ?? null,
            targetChannel ?? null,
            now,
            now
        ]
    );
    return mapProjectRow(res.rows[0]);
}

async function getProjectById(projectId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM copy_projects WHERE id = ?', [projectId], (err, row) => {
                if (err) return reject(err);
                resolve(mapProjectRow(row));
            });
        });
    }

    const res = await pool.query('SELECT * FROM copy_projects WHERE id = $1', [projectId]);
    return mapProjectRow(res.rows[0]);
}

async function listProjectsByBrand(brandId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM copy_projects WHERE brand_id = ? ORDER BY updated_at DESC',
                [brandId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows.map(mapProjectRow));
                }
            );
        });
    }

    const res = await pool.query(
        'SELECT * FROM copy_projects WHERE brand_id = $1 ORDER BY updated_at DESC',
        [brandId]
    );
    return res.rows.map(mapProjectRow);
}

async function insertVariant(projectId, variant) {
    const id = variant.id || randomUUID();
    const generatedAt = variant.generatedAt || new Date().toISOString();
    const metadataValue = variant.metadata === undefined || variant.metadata === null
        ? null
        : typeof variant.metadata === 'string'
            ? variant.metadata
            : JSON.stringify(variant.metadata);

    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO copy_variants (
                    id, project_id, model, headline, body, cta, tone_snapshot, score, is_favorite, metadata, generated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
                [
                    id,
                    projectId,
                    variant.model ?? null,
                    variant.headline ?? null,
                    variant.body ?? null,
                    variant.cta ?? null,
                    variant.toneSnapshot ?? null,
                    variant.score ?? null,
                    variant.isFavorite ? 1 : 0,
                    metadataValue,
                    generatedAt
                ],
                (err) => {
                    if (err) return reject(err);
                    resolve(mapVariantRow({
                        id,
                        project_id: projectId,
                        model: variant.model ?? null,
                        headline: variant.headline ?? null,
                        body: variant.body ?? null,
                        cta: variant.cta ?? null,
                        tone_snapshot: variant.toneSnapshot ?? null,
                        score: variant.score ?? null,
                        is_favorite: variant.isFavorite ? 1 : 0,
                        metadata: metadataValue,
                        generated_at: generatedAt
                    }));
                }
            );
        });
    }

    const res = await pool.query(
        `INSERT INTO copy_variants (
            id, project_id, model, headline, body, cta, tone_snapshot, score, is_favorite, metadata, generated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::timestamptz
        ) RETURNING *`,
        [
            id,
            projectId,
            variant.model ?? null,
            variant.headline ?? null,
            variant.body ?? null,
            variant.cta ?? null,
            variant.toneSnapshot ?? null,
            variant.score ?? null,
            variant.isFavorite ?? false,
            metadataValue,
            generatedAt
        ]
    );
    return mapVariantRow(res.rows[0]);
}

async function insertVariants(projectId, variants) {
    if (!Array.isArray(variants) || variants.length === 0) {
        return [];
    }

    const inserted = [];
    for (const variant of variants) {
        const result = await insertVariant(projectId, variant);
        inserted.push(result);
    }
    return inserted;
}

async function listVariantsByProject(projectId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM copy_variants WHERE project_id = ? ORDER BY generated_at DESC',
                [projectId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows.map(mapVariantRow));
                }
            );
        });
    }

    const res = await pool.query(
        'SELECT * FROM copy_variants WHERE project_id = $1 ORDER BY generated_at DESC',
        [projectId]
    );
    return res.rows.map(mapVariantRow);
}

async function updateVariant(variantId, updates) {
    const allowed = {
        headline: 'headline',
        body: 'body',
        cta: 'cta',
        toneSnapshot: 'tone_snapshot',
        score: 'score',
        metadata: 'metadata'
    };

    const assignments = [];
    const values = [];

    Object.entries(allowed).forEach(([inputKey, columnKey]) => {
        if (Object.prototype.hasOwnProperty.call(updates, inputKey)) {
            let value = updates[inputKey];
            if (inputKey === 'metadata') {
                value = value === null || value === undefined
                    ? null
                    : typeof value === 'string'
                        ? value
                        : JSON.stringify(value);
            }
            assignments.push(`${columnKey} = ?`);
            values.push(value);
        }
    });

    if (!assignments.length) {
        return getVariantById(variantId);
    }

    if (isSQLite) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE copy_variants SET ${assignments.join(', ')} WHERE id = ?`;
            db.run(sql, [...values, variantId], async (err) => {
                if (err) return reject(err);
                try {
                    const refreshed = await getVariantById(variantId);
                    resolve(refreshed);
                } catch (fetchError) {
                    reject(fetchError);
                }
            });
        });
    }

    const postgresAssignments = assignments.map((assignment, index) => {
        if (assignment.startsWith('metadata')) {
            return assignment.replace('?', `$${index + 1}::jsonb`);
        }
        return assignment.replace('?', `$${index + 1}`);
    });

    const res = await pool.query(
        `UPDATE copy_variants SET ${postgresAssignments.join(', ')} WHERE id = $${assignments.length + 1} RETURNING *`,
        [...values, variantId]
    );
    return mapVariantRow(res.rows[0]);
}

async function setVariantFavorite(variantId, isFavorite) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE copy_variants SET is_favorite = ? WHERE id = ?',
                [isFavorite ? 1 : 0, variantId],
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
    }

    await pool.query(
        'UPDATE copy_variants SET is_favorite = $1 WHERE id = $2',
        [isFavorite, variantId]
    );
}

async function getVariantById(variantId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM copy_variants WHERE id = ?', [variantId], (err, row) => {
                if (err) return reject(err);
                resolve(mapVariantRow(row));
            });
        });
    }

    const res = await pool.query('SELECT * FROM copy_variants WHERE id = $1', [variantId]);
    return mapVariantRow(res.rows[0]);
}

async function createVariantFeedback({ variantId, rating, notes }) {
    const id = randomUUID();
    const now = new Date().toISOString();

    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO variant_feedback (id, variant_id, rating, notes, created_at)
                 VALUES (?, ?, ?, ?, ?)` ,
                [id, variantId, rating ?? null, notes ?? null, now],
                (err) => {
                    if (err) return reject(err);
                    resolve(mapFeedbackRow({
                        id,
                        variant_id: variantId,
                        rating: rating ?? null,
                        notes: notes ?? null,
                        created_at: now
                    }));
                }
            );
        });
    }

    const res = await pool.query(
        `INSERT INTO variant_feedback (id, variant_id, rating, notes, created_at)
         VALUES ($1, $2, $3, $4, $5::timestamptz)
         RETURNING *`,
        [id, variantId, rating ?? null, notes ?? null, now]
    );
    return mapFeedbackRow(res.rows[0]);
}

async function listFeedbackByVariant(variantId) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM variant_feedback WHERE variant_id = ? ORDER BY created_at DESC',
                [variantId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows.map(mapFeedbackRow));
                }
            );
        });
    }

    const res = await pool.query(
        'SELECT * FROM variant_feedback WHERE variant_id = $1 ORDER BY created_at DESC',
        [variantId]
    );
    return res.rows.map(mapFeedbackRow);
}

module.exports = {
    initializeSchema,
    createUser,
    findUserByEmail,
    getUser,
    incrementUserUsage,
    updateUserPlan,
    getNiches,
    getNicheById,
    getFrameworks,
    getFrameworkById,
    getKeywordsForNiche,
    createBrandProfile,
    listBrandProfilesByUser,
    getBrandProfileById,
    updateBrandProfile,
    deleteBrandProfile,
    createProject,
    getProjectById,
    listProjectsByBrand,
    insertVariants,
    listVariantsByProject,
    updateVariant,
    setVariantFavorite,
    getVariantById,
    createVariantFeedback,
    listFeedbackByVariant
};
