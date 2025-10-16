require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: 4000,
    
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: '24h'
    },
    
    limits: {
        free: 10,
        pro: -1
    },
    
    llm: {
        provider: process.env.LLM_PROVIDER || 'google',
        apiKeys: {
            google: process.env.GEMINI_API_KEY,
            openai: process.env.OPENAI_API_KEY,
            anthropic: process.env.ANTHROPIC_API_KEY
        },
        rateLimit: 60
    },
    
    aiPortal: {
        apiKey: process.env.AI_PORTAL_API_KEY
    },

    graph: {
        baseUrl: process.env.GRAPHITI_BASE_URL || '',
        apiKey: process.env.GRAPHITI_API_KEY || '',
        timeoutMs: parseInt(process.env.GRAPHITI_TIMEOUT_MS || '10000', 10)
    },
    
    database: {
        url: process.env.DATABASE_URL || 'sqlite:./copyshark.db',
        isSQLite: (process.env.DATABASE_URL || 'sqlite:').startsWith('sqlite:')
    },
    
    cors: {
        origins: [
            'http://localhost:3000',
            'http://localhost:8000',
            'http://127.0.0.1:8000',
            'https://your-ai-portal-domain.com'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    },
    
    bcrypt: {
        saltRounds: 10
    }
};

module.exports = config;
