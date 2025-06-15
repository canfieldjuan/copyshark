const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Conditionally load your custom modules
let llmService, db, frameworks, niches;
try {
    llmService = require('./services/llmService');
} catch (err) {
    console.warn('LLM Service not available:', err.message);
}

try {
    db = require('./database');
} catch (err) {
    console.warn('Database module not available:', err.message);
}

try {
    frameworks = require('./data/frameworks');
} catch (err) {
    console.warn('Frameworks data not available:', err.message);
    frameworks = {};
}

try {
    niches = require('./data/niches');
} catch (err) {
    console.warn('Niches data not available:', err.message);
    niches = {};
}

const app = express();

// Enhanced CORS configuration for AI Portal integration
app.use(cors({
    origin: [
        'http://localhost:3000',  // CopyShark frontend
        'http://localhost:8000',  // AI Portal
        'http://127.0.0.1:8000',  // AI Portal alternative
        'https://your-ai-portal-domain.com'  // Production AI Portal
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const JWT_SECRET = process.env.JWT_SECRET;
const AI_PORTAL_API_KEY = process.env.AI_PORTAL_API_KEY || 'your_ai_portal_api_key';
const LIMITS = { free: 10, pro: -1 };

// Enhanced authentication middleware that supports both JWT and API keys
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];
    
    // Check for AI Portal API key first
    if (apiKey && apiKey === AI_PORTAL_API_KEY) {
        req.user = { userId: 'ai-portal', isAIPortal: true };
        return next();
    }
    
    // Check for JWT token
    const token = authHeader?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Middleware for AI Portal requests (bypasses usage limits)
function authenticateAIPortal(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== AI_PORTAL_API_KEY) {
        return res.status(401).json({ error: 'Invalid AI Portal API key' });
    }
    req.user = { userId: 'ai-portal', isAIPortal: true };
    next();
}

// Test endpoint
app.get('/api/health', (req, res) => {
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
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
        const user = await db.createUser(email, password);
        res.status(201).json({ success: true, userId: user.id });
    } catch (error) {
        res.status(409).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        const { email, password } = req.body;
        const user = await db.findUserByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Login failed.' });
    }
});

// Public endpoints
app.get('/api/frameworks', (req, res) => res.json(frameworks || {}));
app.get('/api/niches', (req, res) => res.json(niches || {}));

// Enhanced copy generation with AI Portal support
app.post('/api/generate-copy', async (req, res) => {
    try {
        if (!llmService) {
            return res.status(503).json({ error: 'AI service not available' });
        }
        
        const { productName, audience, niche, framework, tone } = req.body;
        
        const prompt = `You are an expert copywriter. Generate ad copy. Product: "${productName}", Audience: "${audience}", Niche: "${niches[niche]?.name || niche}", Framework: "${frameworks[framework]?.name || framework}", Tone: "${tone}". Output ONLY a raw JSON object with keys: "headline", "body", "cta".`;
        
        const generatedCopy = await llmService.generate(prompt);
        
        res.json({ success: true, copy: generatedCopy });
    } catch (error) {
        console.error('Copy generation error:', error);
        res.status(500).json({ success: false, error: 'AI service failed.' });
    }
});

// User info endpoint
app.get('/api/user/me', authenticateToken, async (req, res) => {
    try {
        if (req.user.isAIPortal) {
            return res.json({ 
                success: true, 
                email: 'ai-portal@system', 
                plan: 'unlimited', 
                usage: 0 
            });
        }
        
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const user = await db.getUser(req.user.userId);
        res.json({ 
            success: true, 
            email: user.email, 
            plan: user.plan, 
            usage: user.usage_count 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch user data' });
    }
});

// AI Portal Function Calling Endpoint
app.post('/api/ai-portal/function-call', authenticateAIPortal, async (req, res) => {
    try {
        const { function_name, arguments: args } = req.body;
        
        switch (function_name) {
            case 'generateAdCopy':
                if (!llmService) {
                    return res.status(503).json({ error: 'AI service not available' });
                }
                const copyResult = await generateCopyLogic(args);
                res.json({ success: true, result: copyResult });
                break;
                
            case 'getFrameworks':
                res.json({ success: true, result: frameworks || {} });
                break;
                
            case 'getNiches':
                res.json({ success: true, result: niches || {} });
                break;
                
            case 'getUserUsage':
                res.json({ 
                    success: true, 
                    result: { 
                        email: 'ai-portal@system', 
                        plan: 'unlimited', 
                        usage: 0 
                    } 
                });
                break;
                
            default:
                res.status(404).json({ success: false, error: `Function ${function_name} not found` });
        }
    } catch (error) {
        console.error('Function call error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper function for copy generation logic
async function generateCopyLogic(args) {
    const { productName, audience, niche, framework, tone = 'professional' } = args;
    
    if (!productName || !audience) {
        throw new Error('productName and audience are required');
    }
    
    const prompt = `You are an expert copywriter. Generate ad copy. Product: "${productName}", Audience: "${audience}", Niche: "${niches[niche]?.name || niche || 'general'}", Framework: "${frameworks[framework]?.name || framework || 'AIDA'}", Tone: "${tone}". Output ONLY a raw JSON object with keys: "headline", "body", "cta".`;
    
    const generatedCopy = await llmService.generate(prompt);
    return { copy: generatedCopy };
}

// Function definitions endpoint for AI Portal
app.get('/api/functions', (req, res) => {
    const functionDefinitions = [
        {
            name: "generateAdCopy",
            description: "Generate marketing ad copy with headline, body, and call-to-action using AI",
            parameters: {
                type: "object",
                properties: {
                    productName: {
                        type: "string",
                        description: "Name or description of the product/service to advertise"
                    },
                    audience: {
                        type: "string",
                        description: "Target audience for the ad (e.g. 'busy professionals', 'fitness enthusiasts')"
                    },
                    niche: {
                        type: "string",
                        description: "Business niche/category",
                        enum: Object.keys(niches || {})
                    },
                    framework: {
                        type: "string",
                        description: "Marketing framework to use for the copy structure",
                        enum: Object.keys(frameworks || {})
                    },
                    tone: {
                        type: "string",
                        description: "Tone of voice for the ad",
                        enum: ["professional", "casual", "urgent", "friendly", "authoritative", "playful", "emotional"]
                    }
                },
                required: ["productName", "audience"]
            }
        },
        {
            name: "getFrameworks",
            description: "Get available marketing frameworks for ad generation",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        },
        {
            name: "getNiches",
            description: "Get available business niches for ad targeting",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        },
        {
            name: "getUserUsage",
            description: "Get current user's plan and usage statistics",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    ];
    
    res.json({ success: true, functions: functionDefinitions });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'CopyShark API is running!' });
});

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
    console.log(`🚀 CopyShark is LIVE at ${HOST}:${PORT}`);
    console.log(`📡 AI Portal Integration: ${AI_PORTAL_API_KEY ? 'ENABLED' : 'DISABLED'}`);
    console.log(`💳 Stripe: DISABLED`);
    console.log(`🤖 LLM Service: ${llmService ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🗄️ Database: ${db ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔑 Available functions: generateAdCopy, getFrameworks, getNiches, getUserUsage`);
});