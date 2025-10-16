# CopyShark Modular Implementation Plan

**Date Created**: 2025-10-15  
**Current Version**: 5.0.0  
**Status**: Planning Phase

---

## Executive Summary

This plan outlines the transformation of CopyShark from a monolithic architecture (670-line server.js) into a modular, maintainable, and scalable application following industry best practices. The implementation will be phased to ensure zero downtime and comprehensive testing at each step.

**Key Objectives**:
1. Separate concerns (routes, middleware, controllers, services)
2. Improve testability and maintainability
3. Enable team collaboration through clear module boundaries
4. Facilitate future feature additions
5. Maintain 100% backward compatibility

---

## Current Architecture Analysis

### Existing Structure
```
copyshark/
├── server.js (670 lines - MONOLITHIC)
│   ├── Express app setup
│   ├── Middleware configuration
│   ├── Authentication logic
│   ├── All API routes (15+ endpoints)
│   ├── Business logic
│   ├── Cache management
│   └── Error handling
├── database.js (Database layer - GOOD)
├── services/
│   ├── llmService.js (LLM orchestration - GOOD)
│   ├── frameworks.js (Fallback data)
│   └── niches.js (Fallback data)
├── utils/
│   └── errors.js (Error classes - GOOD)
└── tests/
    └── server.test.js (18 tests - GOOD)
```

### Problems Identified
1. **Single Responsibility Violation**: server.js handles routing, business logic, and request handling
2. **Difficult Testing**: Routes and business logic tightly coupled
3. **Poor Scalability**: Adding new features requires modifying massive file
4. **Code Duplication**: Auth logic repeated in multiple route handlers
5. **Limited Reusability**: Business logic embedded in routes

### What's Working Well (Keep)
- Database abstraction layer (database.js)
- LLM service orchestration (services/llmService.js)
- Error handling classes (utils/errors.js)
- Test suite structure
- Environment configuration

---

## Target Architecture

### Modular Structure
```
copyshark/
├── server.js (50-100 lines - APP BOOTSTRAP ONLY)
├── src/
│   ├── config/
│   │   ├── index.js (Centralized config)
│   │   ├── database.js (DB config)
│   │   └── logger.js (Logger config)
│   ├── middleware/
│   │   ├── index.js (Export all middleware)
│   │   ├── auth.js (JWT verification)
│   │   ├── errorHandler.js (Global error handling)
│   │   ├── validation.js (Request validation)
│   │   └── rateLimiter.js (Rate limiting)
│   ├── routes/
│   │   ├── index.js (Route aggregator)
│   │   ├── auth.routes.js (Auth endpoints)
│   │   ├── copy.routes.js (Copy generation)
│   │   ├── taxonomy.routes.js (Niches/frameworks)
│   │   ├── user.routes.js (User management)
│   │   └── aiportal.routes.js (AI Portal integration)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── copy.controller.js
│   │   ├── taxonomy.controller.js
│   │   ├── user.controller.js
│   │   └── aiportal.controller.js
│   ├── services/
│   │   ├── auth.service.js (JWT, bcrypt operations)
│   │   ├── copy.service.js (Copy generation logic)
│   │   ├── taxonomy.service.js (Cache management)
│   │   ├── user.service.js (User operations)
│   │   └── llm.service.js (Rename from llmService.js)
│   ├── models/
│   │   ├── user.model.js (User schema & validation)
│   │   ├── niche.model.js
│   │   └── framework.model.js
│   ├── utils/
│   │   ├── errors.js (Keep existing)
│   │   ├── validators.js (Input validation helpers)
│   │   ├── constants.js (App constants)
│   │   └── helpers.js (Common utilities)
│   └── database/
│       ├── index.js (DB factory)
│       ├── sqlite.adapter.js
│       ├── postgres.adapter.js
│       └── migrations/ (Future: version-controlled schema)
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── controllers/
│   │   └── utils/
│   ├── integration/
│   │   └── routes/
│   └── e2e/
│       └── workflows/
└── scripts/
    ├── seed_db.js (Keep)
    └── validate_server.js (Keep)
```

---

## Implementation Phases

## Phase 1: Foundation Setup (Week 1)

**Goal**: Create new directory structure and configuration layer without breaking existing code

### Tasks

#### 1.1: Create Directory Structure
- [ ] Create `src/` directory tree
- [ ] Create subdirectories: config, middleware, routes, controllers, services, models, utils, database
- [ ] Create test subdirectories: unit, integration, e2e
- [ ] Update .gitignore if needed

**Files to Create**:
- `src/config/index.js`
- `src/config/database.js`
- `src/config/logger.js`
- `src/middleware/index.js`
- `src/routes/index.js`
- `src/controllers/index.js`
- `src/services/index.js`
- `src/utils/index.js`

**Verification**:
```bash
npm test  # All 18 tests must pass
npm start # Server must start without errors
```

#### 1.2: Extract Configuration
**Current**: Configuration scattered in server.js and database.js  
**Target**: Centralized configuration module

**Create `src/config/index.js`**:
```javascript
module.exports = {
    port: 4000,
    nodeEnv: process.env.NODE_ENV || 'development',
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
            google: process.env.GOOGLE_AI_API_KEY,
            openai: process.env.OPENAI_API_KEY,
            anthropic: process.env.ANTHROPIC_API_KEY
        },
        rateLimit: 60
    },
    aiPortal: {
        apiKey: process.env.AI_PORTAL_API_KEY
    },
    database: {
        url: process.env.DATABASE_URL || 'sqlite:./copyshark.db',
        isSQLite: (process.env.DATABASE_URL || '').startsWith('sqlite:')
    }
};
```

**Create `src/config/logger.js`**:
```javascript
const pino = require('pino');

const logger = pino({
    name: 'copyshark',
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: { colorize: true }
    } : undefined
});

module.exports = logger;
```

**Validation Steps**:
1. Import config in server.js
2. Replace hardcoded values with config references
3. Run tests: `npm test`
4. Verify server starts: `npm start`

---

## Phase 2: Extract Middleware (Week 1-2)

**Goal**: Move middleware to dedicated modules for reusability

### Tasks

#### 2.1: Authentication Middleware
**Extract from**: server.js (lines with JWT verification)  
**Create**: `src/middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        throw new UnauthorizedError('No authorization header');
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (error) {
        throw new UnauthorizedError('Invalid token');
    }
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            req.user = jwt.verify(token, config.jwt.secret);
        } catch (error) {
            req.log.warn('Invalid token in optional auth');
        }
    }
    
    next();
};

module.exports = {
    authenticateJWT,
    optionalAuth
};
```

#### 2.2: API Key Middleware
**Create**: `src/middleware/apiKey.js`

```javascript
const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== config.aiPortal.apiKey) {
        throw new UnauthorizedError('Invalid API key');
    }
    
    req.isAIPortal = true;
    next();
};

module.exports = { validateApiKey };
```

#### 2.3: Error Handler Middleware
**Extract from**: server.js  
**Create**: `src/middleware/errorHandler.js`

```javascript
const { ApiError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        req.log.warn({ 
            err, 
            statusCode: err.statusCode 
        }, 'API Error occurred');
        
        return res.status(err.statusCode).json({
            error: err.message,
            statusCode: err.statusCode
        });
    }

    req.log.error({ err }, 'Unexpected error occurred');
    
    res.status(500).json({
        error: 'An unexpected error occurred',
        statusCode: 500
    });
};

module.exports = { errorHandler };
```

#### 2.4: Validation Middleware
**Create**: `src/middleware/validation.js`

```javascript
const { BadRequestError } = require('../utils/errors');

const validateCopyRequest = (req, res, next) => {
    const { productName, productDescription, niche, framework } = req.body;
    
    if (!productName?.trim()) {
        throw new BadRequestError('Product name is required');
    }
    
    if (!productDescription?.trim()) {
        throw new BadRequestError('Product description is required');
    }
    
    if (!niche?.trim()) {
        throw new BadRequestError('Niche is required');
    }
    
    if (!framework?.trim()) {
        throw new BadRequestError('Framework is required');
    }
    
    next();
};

const validateAuthRequest = (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email?.trim()) {
        throw new BadRequestError('Email is required');
    }
    
    if (!password) {
        throw new BadRequestError('Password is required');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new BadRequestError('Invalid email format');
    }
    
    if (password.length < 6) {
        throw new BadRequestError('Password must be at least 6 characters');
    }
    
    next();
};

module.exports = {
    validateCopyRequest,
    validateAuthRequest
};
```

#### 2.5: Middleware Index
**Create**: `src/middleware/index.js`

```javascript
const { authenticateJWT, optionalAuth } = require('./auth');
const { validateApiKey } = require('./apiKey');
const { errorHandler } = require('./errorHandler');
const { validateCopyRequest, validateAuthRequest } = require('./validation');

module.exports = {
    authenticateJWT,
    optionalAuth,
    validateApiKey,
    errorHandler,
    validateCopyRequest,
    validateAuthRequest
};
```

**Validation**:
1. Update server.js to use new middleware
2. Run tests: `npm test` (all 18 must pass)
3. Test each endpoint manually
4. Verify error handling works

---

## Phase 3: Extract Services (Week 2-3)

**Goal**: Move business logic to service layer

### Tasks

#### 3.1: Authentication Service
**Create**: `src/services/auth.service.js`

```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError, BadRequestError } = require('../utils/errors');
const logger = require('../config/logger').child({ module: 'auth-service' });

const SALT_ROUNDS = 10;

class AuthService {
    constructor(database) {
        this.db = database;
    }

    async register(email, password) {
        logger.info({ email }, 'Registering new user');
        
        const existingUser = await this.db.getUserByEmail(email);
        if (existingUser) {
            throw new BadRequestError('User already exists');
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await this.db.createUser(email, passwordHash);
        
        const token = this.generateToken(user.id, user.email);
        
        logger.info({ userId: user.id }, 'User registered successfully');
        return { user, token };
    }

    async login(email, password) {
        logger.info({ email }, 'User login attempt');
        
        const user = await this.db.getUserByEmail(email);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const token = this.generateToken(user.id, user.email);
        
        logger.info({ userId: user.id }, 'User logged in successfully');
        return { user, token };
    }

    generateToken(userId, email) {
        return jwt.sign(
            { userId, email },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, config.jwt.secret);
        } catch (error) {
            throw new UnauthorizedError('Invalid token');
        }
    }
}

module.exports = AuthService;
```

#### 3.2: Copy Generation Service
**Create**: `src/services/copy.service.js`

```javascript
const config = require('../config');
const { ApiError } = require('../utils/errors');
const logger = require('../config/logger').child({ module: 'copy-service' });

class CopyService {
    constructor(database, llmService, taxonomyService) {
        this.db = database;
        this.llmService = llmService;
        this.taxonomyService = taxonomyService;
    }

    async generateCopy(params, userId = null) {
        const { productName, productDescription, niche, framework, model } = params;
        
        logger.info({ 
            userId, 
            niche, 
            framework, 
            model 
        }, 'Generating copy');

        if (userId) {
            await this.checkAndEnforceLimit(userId);
        }

        const prompt = await this.buildPrompt(
            productName,
            productDescription,
            niche,
            framework
        );

        let generatedCopy;
        try {
            generatedCopy = await this.llmService.generateText(prompt, model);
        } catch (error) {
            logger.error({ err: error }, 'LLM generation failed, using fallback');
            generatedCopy = this.getFallbackCopy(productName, framework);
        }

        if (userId) {
            await this.db.incrementUserUsage(userId);
            logger.info({ userId }, 'User usage incremented');
        }

        return {
            copy: generatedCopy,
            metadata: {
                niche,
                framework,
                model: model || 'default',
                timestamp: new Date().toISOString()
            }
        };
    }

    async checkAndEnforceLimit(userId) {
        const user = await this.db.getUser(userId);
        const limit = config.limits[user.plan] || config.limits.free;

        if (limit !== -1 && user.usage_count >= limit) {
            throw new ApiError(
                429,
                `Usage limit reached for ${user.plan} plan. ` +
                `You have used ${user.usage_count} of ${limit} requests.`
            );
        }

        logger.info({ 
            userId, 
            usage: user.usage_count, 
            limit 
        }, 'Usage limit checked');
    }

    async buildPrompt(productName, productDescription, niche, framework) {
        const keywords = await this.taxonomyService.getKeywordsForNiche(niche);
        const nicheMeta = this.taxonomyService.getNicheMeta(niche);
        const frameworkMeta = this.taxonomyService.getFrameworkMeta(framework);

        let prompt = `You are an expert copywriter specializing in ${niche}.`;
        
        if (nicheMeta?.description) {
            prompt += ` ${nicheMeta.description}`;
        }

        prompt += `\n\nCreate compelling marketing copy using the ${framework} framework.`;
        
        if (frameworkMeta?.description) {
            prompt += ` ${frameworkMeta.description}`;
        }

        if (keywords && keywords.length > 0) {
            prompt += `\n\nKey industry terms: ${keywords.join(', ')}.`;
        }

        prompt += `\n\nProduct: ${productName}`;
        prompt += `\nDescription: ${productDescription}`;
        prompt += `\n\nGenerate persuasive copy:`;

        return prompt;
    }

    getFallbackCopy(productName, framework) {
        return `Discover ${productName} - the solution you have been waiting for! ` +
               `Using the proven ${framework} framework, we deliver results that matter. ` +
               `Do not miss out on this opportunity!`;
    }
}

module.exports = CopyService;
```

#### 3.3: Taxonomy Service
**Create**: `src/services/taxonomy.service.js`

```javascript
const logger = require('../config/logger').child({ module: 'taxonomy-service' });

class TaxonomyService {
    constructor(database, fallbackNiches, fallbackFrameworks) {
        this.db = database;
        this.cache = {
            niches: new Map(),
            frameworks: new Map()
        };
        this.keywordCache = new Map();
        
        this.initializeCache(fallbackNiches, fallbackFrameworks);
    }

    initializeCache(fallbackNiches, fallbackFrameworks) {
        Object.entries(fallbackNiches).forEach(([id, value]) => {
            this.cache.niches.set(id, { id, ...value });
        });

        Object.entries(fallbackFrameworks).forEach(([id, value]) => {
            this.cache.frameworks.set(id, { id, ...value });
        });

        logger.info({
            niches: this.cache.niches.size,
            frameworks: this.cache.frameworks.size
        }, 'Taxonomy cache initialized with fallbacks');
    }

    async refreshCache() {
        if (!this.db) {
            logger.warn('Database unavailable, using fallback taxonomy');
            return;
        }

        try {
            const [nicheRows, frameworkRows] = await Promise.all([
                this.db.getNiches(),
                this.db.getFrameworks()
            ]);

            if (Array.isArray(nicheRows) && nicheRows.length) {
                this.cache.niches.clear();
                nicheRows.forEach(niche => {
                    this.cache.niches.set(niche.id, niche);
                });
            }

            if (Array.isArray(frameworkRows) && frameworkRows.length) {
                this.cache.frameworks.clear();
                frameworkRows.forEach(framework => {
                    this.cache.frameworks.set(framework.id, framework);
                });
            }

            this.keywordCache.clear();
            
            logger.info({
                niches: this.cache.niches.size,
                frameworks: this.cache.frameworks.size
            }, 'Taxonomy cache refreshed from database');
        } catch (error) {
            logger.error({ err: error }, 'Failed to refresh taxonomy cache');
        }
    }

    getNiches() {
        return Array.from(this.cache.niches.values());
    }

    getFrameworks() {
        return Array.from(this.cache.frameworks.values());
    }

    getNicheMeta(nicheId) {
        return this.cache.niches.get(nicheId);
    }

    getFrameworkMeta(frameworkId) {
        return this.cache.frameworks.get(frameworkId);
    }

    async getKeywordsForNiche(nicheId) {
        if (this.keywordCache.has(nicheId)) {
            return this.keywordCache.get(nicheId);
        }

        if (!this.db?.getKeywordsForNiche) {
            return [];
        }

        try {
            const keywords = await this.db.getKeywordsForNiche(nicheId);
            this.keywordCache.set(nicheId, keywords);
            return keywords;
        } catch (error) {
            logger.error({ err: error, nicheId }, 'Failed to load keywords');
            return [];
        }
    }
}

module.exports = TaxonomyService;
```

#### 3.4: User Service
**Create**: `src/services/user.service.js`

```javascript
const logger = require('../config/logger').child({ module: 'user-service' });

class UserService {
    constructor(database) {
        this.db = database;
    }

    async getUserInfo(userId) {
        const user = await this.db.getUser(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        return {
            id: user.id,
            email: user.email,
            plan: user.plan,
            usage_count: user.usage_count,
            created_at: user.created_at
        };
    }

    async getUserUsage(userId) {
        const user = await this.db.getUser(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        const limit = config.limits[user.plan] || config.limits.free;

        return {
            current: user.usage_count,
            limit: limit === -1 ? 'unlimited' : limit,
            remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - user.usage_count),
            plan: user.plan
        };
    }

    async updateUserPlan(userId, newPlan) {
        logger.info({ userId, newPlan }, 'Updating user plan');
        
        if (!['free', 'pro'].includes(newPlan)) {
            throw new Error('Invalid plan type');
        }

        await this.db.updateUserPlan(userId, newPlan);
        
        return await this.getUserInfo(userId);
    }
}

module.exports = UserService;
```

#### 3.5: Service Index
**Create**: `src/services/index.js`

```javascript
const AuthService = require('./auth.service');
const CopyService = require('./copy.service');
const TaxonomyService = require('./taxonomy.service');
const UserService = require('./user.service');

module.exports = {
    AuthService,
    CopyService,
    TaxonomyService,
    UserService
};
```

**Validation**:
1. Create unit tests for each service
2. Verify services work independently
3. Integration test with database
4. Run full test suite

---

## Phase 4: Extract Controllers (Week 3-4)

**Goal**: Create thin controller layer to handle HTTP requests/responses

### Tasks

#### 4.1: Auth Controller
**Create**: `src/controllers/auth.controller.js`

```javascript
class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    async register(req, res, next) {
        try {
            const { email, password } = req.body;
            const { user, token } = await this.authService.register(email, password);

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    plan: user.plan
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const { user, token } = await this.authService.login(email, password);

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    plan: user.plan,
                    usage_count: user.usage_count
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;
```

#### 4.2: Copy Controller
**Create**: `src/controllers/copy.controller.js`

```javascript
class CopyController {
    constructor(copyService) {
        this.copyService = copyService;
    }

    async generateCopy(req, res, next) {
        try {
            const userId = req.user?.userId || null;
            const isAIPortal = req.isAIPortal || false;

            req.log.info({
                userId,
                isAIPortal,
                event: 'generate_copy_request'
            }, 'Copy generation requested');

            const result = await this.copyService.generateCopy(
                req.body,
                isAIPortal ? null : userId
            );

            res.json({
                success: true,
                copy: result.copy,
                metadata: result.metadata
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = CopyController;
```

#### 4.3: Taxonomy Controller
**Create**: `src/controllers/taxonomy.controller.js`

```javascript
class TaxonomyController {
    constructor(taxonomyService) {
        this.taxonomyService = taxonomyService;
    }

    async getNiches(req, res, next) {
        try {
            const niches = this.taxonomyService.getNiches();
            res.json({ niches });
        } catch (error) {
            next(error);
        }
    }

    async getFrameworks(req, res, next) {
        try {
            const frameworks = this.taxonomyService.getFrameworks();
            res.json({ frameworks });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = TaxonomyController;
```

#### 4.4: User Controller
**Create**: `src/controllers/user.controller.js`

```javascript
class UserController {
    constructor(userService) {
        this.userService = userService;
    }

    async getMe(req, res, next) {
        try {
            const userId = req.user.userId;
            const userInfo = await this.userService.getUserInfo(userId);
            res.json({ user: userInfo });
        } catch (error) {
            next(error);
        }
    }

    async getUsage(req, res, next) {
        try {
            const userId = req.user.userId;
            const usage = await this.userService.getUserUsage(userId);
            res.json({ usage });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = UserController;
```

#### 4.5: AI Portal Controller
**Create**: `src/controllers/aiportal.controller.js`

```javascript
const logger = require('../config/logger').child({ module: 'aiportal-controller' });

class AIPortalController {
    constructor(taxonomyService, userService, copyService) {
        this.taxonomyService = taxonomyService;
        this.userService = userService;
        this.copyService = copyService;
    }

    async getFunctions(req, res, next) {
        try {
            const functions = [
                {
                    name: 'generateAdCopy',
                    description: 'Generate marketing copy',
                    parameters: {
                        productName: 'string',
                        productDescription: 'string',
                        niche: 'string',
                        framework: 'string'
                    }
                },
                {
                    name: 'getNiches',
                    description: 'Get available business niches',
                    parameters: {}
                },
                {
                    name: 'getFrameworks',
                    description: 'Get marketing frameworks',
                    parameters: {}
                },
                {
                    name: 'getUserUsage',
                    description: 'Get user usage statistics',
                    parameters: {
                        userId: 'string'
                    }
                }
            ];

            res.json({ functions });
        } catch (error) {
            next(error);
        }
    }

    async handleFunctionCall(req, res, next) {
        try {
            const { functionName, parameters } = req.body;

            logger.info({ functionName, parameters }, 'AI Portal function call');

            let result;
            switch (functionName) {
                case 'generateAdCopy':
                    result = await this.copyService.generateCopy(parameters, null);
                    break;
                
                case 'getNiches':
                    result = { niches: this.taxonomyService.getNiches() };
                    break;
                
                case 'getFrameworks':
                    result = { frameworks: this.taxonomyService.getFrameworks() };
                    break;
                
                case 'getUserUsage':
                    result = await this.userService.getUserUsage(parameters.userId);
                    break;
                
                default:
                    throw new Error(`Unknown function: ${functionName}`);
            }

            res.json({ success: true, result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AIPortalController;
```

**Validation**:
1. Create controller tests
2. Verify HTTP layer separation
3. Test error propagation
4. Ensure middleware works with controllers

---

## Phase 5: Extract Routes (Week 4)

**Goal**: Create route modules with clear endpoint definitions

### Tasks

#### 5.1: Auth Routes
**Create**: `src/routes/auth.routes.js`

```javascript
const express = require('express');
const { validateAuthRequest } = require('../middleware');

function createAuthRouter(authController) {
    const router = express.Router();

    router.post('/register', validateAuthRequest, (req, res, next) => {
        authController.register(req, res, next);
    });

    router.post('/login', validateAuthRequest, (req, res, next) => {
        authController.login(req, res, next);
    });

    return router;
}

module.exports = createAuthRouter;
```

#### 5.2: Copy Routes
**Create**: `src/routes/copy.routes.js`

```javascript
const express = require('express');
const { optionalAuth, validateCopyRequest } = require('../middleware');

function createCopyRouter(copyController) {
    const router = express.Router();

    router.post('/generate-copy',
        optionalAuth,
        validateCopyRequest,
        (req, res, next) => {
            copyController.generateCopy(req, res, next);
        }
    );

    return router;
}

module.exports = createCopyRouter;
```

#### 5.3: Taxonomy Routes
**Create**: `src/routes/taxonomy.routes.js`

```javascript
const express = require('express');

function createTaxonomyRouter(taxonomyController) {
    const router = express.Router();

    router.get('/niches', (req, res, next) => {
        taxonomyController.getNiches(req, res, next);
    });

    router.get('/frameworks', (req, res, next) => {
        taxonomyController.getFrameworks(req, res, next);
    });

    return router;
}

module.exports = createTaxonomyRouter;
```

#### 5.4: User Routes
**Create**: `src/routes/user.routes.js`

```javascript
const express = require('express');
const { authenticateJWT } = require('../middleware');

function createUserRouter(userController) {
    const router = express.Router();

    router.get('/me', authenticateJWT, (req, res, next) => {
        userController.getMe(req, res, next);
    });

    router.get('/usage', authenticateJWT, (req, res, next) => {
        userController.getUsage(req, res, next);
    });

    return router;
}

module.exports = createUserRouter;
```

#### 5.5: AI Portal Routes
**Create**: `src/routes/aiportal.routes.js`

```javascript
const express = require('express');
const { validateApiKey } = require('../middleware');

function createAIPortalRouter(aiportalController) {
    const router = express.Router();

    router.get('/functions', (req, res, next) => {
        aiportalController.getFunctions(req, res, next);
    });

    router.post('/function-call', validateApiKey, (req, res, next) => {
        aiportalController.handleFunctionCall(req, res, next);
    });

    return router;
}

module.exports = createAIPortalRouter;
```

#### 5.6: Main Router
**Create**: `src/routes/index.js`

```javascript
const express = require('express');
const createAuthRouter = require('./auth.routes');
const createCopyRouter = require('./copy.routes');
const createTaxonomyRouter = require('./taxonomy.routes');
const createUserRouter = require('./user.routes');
const createAIPortalRouter = require('./aiportal.routes');

function createAppRouter(controllers) {
    const router = express.Router();

    router.use('/auth', createAuthRouter(controllers.auth));
    router.use('/', createCopyRouter(controllers.copy));
    router.use('/', createTaxonomyRouter(controllers.taxonomy));
    router.use('/user', createUserRouter(controllers.user));
    router.use('/ai-portal', createAIPortalRouter(controllers.aiportal));

    router.get('/health', (req, res) => {
        res.json({ status: 'online', timestamp: new Date().toISOString() });
    });

    router.get('/models', (req, res) => {
        const catalog = controllers.llmService?.getModelCatalog?.() || { 
            provider: 'none', 
            models: [] 
        };
        res.json(catalog);
    });

    return router;
}

module.exports = createAppRouter;
```

**Validation**:
1. Test each route independently
2. Verify middleware chain
3. Check endpoint paths
4. Run integration tests

---

## Phase 6: Refactor server.js (Week 5)

**Goal**: Reduce server.js to 50-100 lines - just app bootstrap

### Tasks

#### 6.1: New server.js
**Replace**: Current 670-line server.js  
**With**: Modular bootstrap

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const pinoHttp = require('pino-http');
require('dotenv').config();

const config = require('./src/config');
const logger = require('./src/config/logger');
const { errorHandler } = require('./src/middleware');
const createAppRouter = require('./src/routes');

const db = require('./database');
const llmService = require('./services/llmService');
const fallbackNiches = require('./services/niches');
const fallbackFrameworks = require('./services/frameworks');

const {
    AuthService,
    CopyService,
    TaxonomyService,
    UserService
} = require('./src/services');

const AuthController = require('./src/controllers/auth.controller');
const CopyController = require('./src/controllers/copy.controller');
const TaxonomyController = require('./src/controllers/taxonomy.controller');
const UserController = require('./src/controllers/user.controller');
const AIPortalController = require('./src/controllers/aiportal.controller');

const app = express();
const httpLogger = pinoHttp({ logger });

app.use(httpLogger);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

const taxonomyService = new TaxonomyService(db, fallbackNiches, fallbackFrameworks);
taxonomyService.refreshCache();

const authService = new AuthService(db);
const userService = new UserService(db);
const copyService = new CopyService(db, llmService, taxonomyService);

const controllers = {
    auth: new AuthController(authService),
    copy: new CopyController(copyService),
    taxonomy: new TaxonomyController(taxonomyService),
    user: new UserController(userService),
    aiportal: new AIPortalController(taxonomyService, userService, copyService),
    llmService
};

app.use('/api', createAppRouter(controllers));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'app.html'));
});

app.use(errorHandler);

const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGUSR2', () => {
    logger.info('SIGUSR2 received (nodemon restart)');
});

module.exports = app;
```

**Validation**:
1. Server starts successfully
2. All 18 tests pass
3. All endpoints work
4. Frontend loads correctly
5. No regression in functionality

---

## Phase 7: Database Abstraction (Week 5-6)

**Goal**: Improve database layer with better abstractions

### Tasks

#### 7.1: Database Factory
**Create**: `src/database/index.js`

```javascript
const config = require('../config');
const SQLiteAdapter = require('./sqlite.adapter');
const PostgresAdapter = require('./postgres.adapter');
const logger = require('../config/logger').child({ module: 'database' });

function createDatabase() {
    if (config.database.isSQLite) {
        logger.info('Initializing SQLite database');
        return new SQLiteAdapter(config.database.url);
    } else {
        logger.info('Initializing PostgreSQL database');
        return new PostgresAdapter(config.database.url);
    }
}

module.exports = createDatabase();
```

#### 7.2: SQLite Adapter
**Create**: `src/database/sqlite.adapter.js`  
(Move current SQLite logic from database.js)

#### 7.3: PostgreSQL Adapter
**Create**: `src/database/postgres.adapter.js`  
(Move current PostgreSQL logic from database.js)

**Validation**:
1. Test with SQLite
2. Test with PostgreSQL
3. Verify all database operations
4. Run migration scripts

---

## Phase 8: Testing Enhancement (Week 6-7)

**Goal**: Expand test coverage to match new modular structure

### Tasks

#### 8.1: Unit Tests

**Create**: `tests/unit/services/auth.service.test.js`
**Create**: `tests/unit/services/copy.service.test.js`
**Create**: `tests/unit/services/taxonomy.service.test.js`
**Create**: `tests/unit/services/user.service.test.js`

**Create**: `tests/unit/controllers/auth.controller.test.js`
**Create**: `tests/unit/controllers/copy.controller.test.js`

**Create**: `tests/unit/middleware/auth.test.js`
**Create**: `tests/unit/middleware/validation.test.js`

Target: 50+ unit tests

#### 8.2: Integration Tests

**Create**: `tests/integration/routes/auth.routes.test.js`
**Create**: `tests/integration/routes/copy.routes.test.js`
**Create**: `tests/integration/routes/taxonomy.routes.test.js`
**Create**: `tests/integration/routes/user.routes.test.js`

Target: 30+ integration tests

#### 8.3: E2E Tests

**Create**: `tests/e2e/workflows/user-registration.test.js`
**Create**: `tests/e2e/workflows/copy-generation.test.js`
**Create**: `tests/e2e/workflows/usage-limits.test.js`

Target: 10+ E2E tests

**Total Target**: 100+ tests (currently 18)

**Validation**:
1. All tests pass
2. Coverage >80%
3. No flaky tests
4. Fast execution (<30s)

---

## Phase 9: Documentation & Cleanup (Week 7)

**Goal**: Update documentation and remove deprecated code

### Tasks

#### 9.1: Update Documentation

**Update**: `README.md` with new architecture
**Create**: `ARCHITECTURE.md` - detailed architecture documentation
**Create**: `API.md` - API endpoint documentation
**Create**: `DEVELOPMENT.md` - development guide
**Update**: `project_log.md` - document modularization

#### 9.2: Code Cleanup

- [ ] Remove old commented code
- [ ] Update JSDoc comments
- [ ] Verify no unused dependencies
- [ ] Check for code duplication
- [ ] Ensure consistent naming

#### 9.3: Migration Guide

**Create**: `MIGRATION.md` - guide for team members

---

## Phase 10: Optional Enhancements (Week 8+)

### Future Considerations

#### 10.1: TypeScript Migration
- Add type safety
- Better IDE support
- Catch errors at compile time

#### 10.2: GraphQL API
- Alternative to REST
- Better for complex queries
- Frontend flexibility

#### 10.3: Microservices
- Split into independent services
- Better scalability
- Independent deployment

#### 10.4: Event-Driven Architecture
- Add event bus (RabbitMQ/Kafka)
- Async processing
- Better decoupling

---

## Implementation Guidelines

### Critical Rules

1. **Never Assume - Always Verify**
   - Read files before modifying
   - Check dependencies exist
   - Verify function signatures
   - Test before committing

2. **Validate Changes**
   - Run tests after each change
   - Manual testing for UI changes
   - Check logs for errors
   - Verify no breaking changes

3. **Incremental Implementation**
   - One module at a time
   - Complete each phase fully
   - Don't skip validation steps
   - Document as you go

4. **Backward Compatibility**
   - Keep old code working during migration
   - Feature flags for new code
   - Gradual rollout
   - Easy rollback plan

5. **No Placeholders**
   - No TODO comments in production
   - No mock implementations
   - No stub functions
   - Complete working code only

6. **Code Quality**
   - Max 30 lines per function
   - Clear naming conventions
   - No Unicode in Python files
   - Robust error handling
   - Comprehensive logging

### Testing Strategy

Each phase must include:
- Unit tests for new modules
- Integration tests for interactions
- Regression tests for existing features
- Manual smoke testing
- Performance testing

### Rollback Plan

Each phase should be:
- In separate git branch
- Fully reversible
- Documented in commit messages
- Tagged for easy reference

---

## Success Metrics

### Code Quality
- [ ] Lines per file: <200 (currently server.js = 670)
- [ ] Functions per file: <20
- [ ] Cyclomatic complexity: <10
- [ ] Test coverage: >80%
- [ ] No code duplication

### Performance
- [ ] Response times unchanged
- [ ] No memory leaks
- [ ] Efficient caching
- [ ] Optimal database queries

### Maintainability
- [ ] Clear module boundaries
- [ ] Easy to add new features
- [ ] Simple to test
- [ ] Good documentation
- [ ] Consistent code style

### Team Productivity
- [ ] Faster onboarding
- [ ] Fewer merge conflicts
- [ ] Easier code reviews
- [ ] Clear ownership
- [ ] Better collaboration

---

## Risk Management

### Identified Risks

1. **Breaking Changes**
   - Mitigation: Comprehensive testing, gradual rollout
   - Rollback: Keep old code, feature flags

2. **Performance Degradation**
   - Mitigation: Performance testing, profiling
   - Rollback: Optimize or revert

3. **Learning Curve**
   - Mitigation: Documentation, pair programming
   - Support: Regular team sync

4. **Scope Creep**
   - Mitigation: Stick to plan, phase by phase
   - Control: Regular reviews

---

## Timeline Summary

- **Week 1**: Foundation & Config (Phase 1-2)
- **Week 2-3**: Services & Business Logic (Phase 3)
- **Week 3-4**: Controllers & HTTP Layer (Phase 4)
- **Week 4**: Routes & Integration (Phase 5)
- **Week 5**: Server Refactor & DB (Phase 6-7)
- **Week 6-7**: Testing & Quality (Phase 8)
- **Week 7**: Documentation (Phase 9)
- **Week 8+**: Optional Enhancements (Phase 10)

**Total**: 7-8 weeks for complete modularization

---

## Conclusion

This plan transforms CopyShark from a monolithic application into a modern, modular, maintainable codebase. Each phase builds on the previous one, ensuring stability and backward compatibility throughout the process.

The end result will be:
- Easier to test
- Easier to maintain
- Easier to scale
- Easier to extend
- Better team collaboration

**Next Steps**: Review this plan, get team approval, and begin Phase 1.
