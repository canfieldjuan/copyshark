const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const llmService = require('./services/llmService');
const db = require('./database');
const frameworks = require('./data/frameworks');
const niches = require('./data/niches');

const app = express();

// Stripe webhook needs the raw body, so we define it before express.json()
app.post('/api/payments/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;
        if (!userId) {
            return res.status(400).send('Webhook Error: Missing userId in session metadata.');
        }
        await db.updateUserPlan(userId, 'pro');
    }
    res.status(200).send();
});

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

// Original authentication endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
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

app.post('/api/payments/create-checkout-session', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const session = await stripe.checkout.sessions.create({
            line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
            mode: 'subscription',
            success_url: `${req.headers.origin}?checkout=success`,
            cancel_url: `${req.headers.origin}`,
            metadata: { userId: userId }
        });
        res.json({ success: true, url: session.url });
    } catch (error) {
        console.error("Stripe session creation failed:", error);
        res.status(500).json({ success: false, error: "Could not initiate payment." });
    }
});

// Enhanced copy generation with AI Portal support
app.post('/api/generate-copy', authenticateToken, async (req, res) => {
    try {
        const { productName, audience, niche, framework, tone } = req.body;
        const userId = req.user.userId;
        
        // Skip usage limits for AI Portal requests
        if (!req.user.isAIPortal) {
            const user = await db.getUser(userId);
            if (user.plan === 'free' && user.usage_count >= LIMITS.free) {
                return res.status(403).json({ error: 'Usage limit reached.', requiresUpgrade: true });
            }
        }
        
        const prompt = `You are an expert copywriter. Generate ad copy. Product: "${productName}", Audience: "${audience}", Niche: "${niches[niche]?.name || niche}", Framework: "${frameworks[framework]?.name || framework}", Tone: "${tone}". Output ONLY a raw JSON object with keys: "headline", "body", "cta".`;
        
        const generatedCopy = await llmService.generate(prompt);
        
        // Only increment usage for non-AI Portal requests
        if (!req.user.isAIPortal) {
            await db.incrementUserUsage(req.user.userId);
        }
        
        res.json({ success: true, copy: generatedCopy });
    } catch (error) {
        console.error('Copy generation error:', error);
        res.status(500).json({ success: false, error: 'AI service failed.' });
    }
});

// NEW: AI Portal Function Calling Endpoint
app.post('/api/ai-portal/function-call', authenticateAIPortal, async (req, res) => {
    try {
        const { function_name, arguments: args } = req.body;
        
        switch (function_name) {
            case 'generateAdCopy':
                const copyResult = await generateCopyLogic(args);
                res.json({ success: true, result: copyResult });
                break;
                
            case 'getFrameworks':
                res.json({ success: true, result: frameworks });
                break;
                
            case 'getNiches':
                res.json({ success: true, result: niches });
                break;
                
            case 'getUserUsage':
                // For AI Portal, return dummy data or aggregate stats
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

// Enhanced endpoints with AI Portal support
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

// Public endpoints (no authentication required)
app.get('/api/frameworks', (req, res) => res.json(frameworks));
app.get('/api/niches', (req, res) => res.json(niches));

// NEW: Health check endpoint for AI Portal
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

// NEW: Function definitions endpoint for AI Portal
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
                        enum: Object.keys(niches)
                    },
                    framework: {
                        type: "string",
                        description: "Marketing framework to use for the copy structure",
                        enum: Object.keys(frameworks)
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

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";  // Accept external connections

app.listen(PORT, HOST, () => {
    console.log(`🚀 CopyShark is LIVE at ${HOST}:${PORT}`);
    console.log(`📡 AI Portal Integration: ${AI_PORTAL_API_KEY ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔑 Available functions: generateAdCopy, getFrameworks, getNiches, getUserUsage`);
});
});