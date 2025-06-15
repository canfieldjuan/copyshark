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

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'CopyShark API is running!' });
});

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
    console.log(`🚀 CopyShark is LIVE at ${HOST}:${PORT}`);
    console.log(`📡 AI Portal Integration: ${AI_PORTAL_API_KEY ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔑 Available functions: generateAdCopy, getFrameworks, getNiches, getUserUsage`);
});
