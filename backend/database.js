const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const saltRounds = 10;

// Check if using SQLite or PostgreSQL
const isSQLite = process.env.DATABASE_URL?.startsWith('sqlite:');
let pool;
let db;

if (isSQLite) {
    // SQLite setup
    const dbPath = process.env.DATABASE_URL.replace('sqlite:', '');
    db = new sqlite3.Database(dbPath);
    console.log('✅ Connecting to SQLite database...');
} else {
    // PostgreSQL setup
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
        } : false
    });
    console.log('✅ Connecting to PostgreSQL database...');
}

const initializeSchema = async () => {
    if (isSQLite) {
        // SQLite schema
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        plan TEXT NOT NULL DEFAULT 'free',
                        usage_count INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL,
                        last_active TEXT
                    );
                `, (err) => {
                    if (err) {
                        console.error('Failed to initialize SQLite schema:', err);
                        reject(err);
                    } else {
                        console.log('✅ SQLite database schema verified.');
                        resolve();
                    }
                });
            });
        });
    } else {
        // PostgreSQL schema
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    plan TEXT NOT NULL DEFAULT 'free',
                    usage_count INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL,
                    last_active TIMESTAMPTZ
                );
            `);
            console.log('✅ PostgreSQL database schema verified.');
        } finally {
            client.release();
        }
    }
};

initializeSchema().catch(err => console.error("Failed to initialize schema:", err));

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
                    console.log(`User ${userId} plan updated to ${newPlan}.`);
                    resolve();
                }
            });
        });
    } else {
        await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [newPlan, userId]);
        console.log(`User ${userId} plan updated to ${newPlan}.`);
    }
}

module.exports = { createUser, findUserByEmail, getUser, incrementUserUsage, updateUserPlan };