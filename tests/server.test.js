const request = require('supertest');
const { app } = require('../server');

describe('Server API', () => {
    describe('Health and Info Endpoints', () => {
        it('should return 200 and success for /api/health', async () => {
            const response = await request(app).get('/api/health');
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('online');
        });

        it('should expose model catalog via /api/models', async () => {
            const response = await request(app).get('/api/models');
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(typeof response.body.provider).toBe('string');
            expect(Array.isArray(response.body.models)).toBe(true);
        });

        it('should expose function definitions via /api/functions', async () => {
            const response = await request(app).get('/api/functions');
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.functions)).toBe(true);
            expect(response.body.functions.length).toBeGreaterThan(0);
        });
    });

    describe('Taxonomy Endpoints', () => {
        it('should return frameworks list via /api/frameworks', async () => {
            const response = await request(app).get('/api/frameworks');
            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should return niches list via /api/niches', async () => {
            const response = await request(app).get('/api/niches');
            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Authentication Endpoints', () => {
        const testEmail = `test${Date.now()}@example.com`;
        const testPassword = 'testpassword123';
        let authToken = null;

        it('should register a new user', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: testEmail, password: testPassword });
            
            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.userId).toBeDefined();
        });

        it('should reject duplicate email registration', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: testEmail, password: testPassword });
            
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: testEmail, password: testPassword });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
            authToken = response.body.token;
        });

        it('should reject login with invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: testEmail, password: 'wrongpassword' });
            
            expect(response.statusCode).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should return user info with valid token', async () => {
            const response = await request(app)
                .get('/api/user/me')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.email).toBe(testEmail);
            expect(response.body.plan).toBe('free');
            expect(response.body.usage).toBe(0);
        });

        it('should reject /api/user/me without token', async () => {
            const response = await request(app).get('/api/user/me');
            expect(response.statusCode).toBe(401);
        });
    });

    describe('Copy Generation Endpoint', () => {
        it('should reject generation without required fields', async () => {
            const response = await request(app)
                .post('/api/generate-copy')
                .send({ productName: 'Test Product' });
            
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should accept generation request with valid fields (anonymous)', async () => {
            const response = await request(app)
                .post('/api/generate-copy')
                .send({
                    productName: 'Test Product',
                    audience: 'Test Audience',
                    niche: 'general',
                    framework: 'aida',
                    tone: 'professional'
                });
            
            if (response.statusCode === 503) {
                expect(response.body.error).toContain('AI service');
            } else {
                expect(response.statusCode).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.copy).toBeDefined();
                expect(response.body.copy.headline).toBeDefined();
                expect(response.body.copy.body).toBeDefined();
                expect(response.body.copy.cta).toBeDefined();
            }
        });
    });

    describe('AI Portal Integration', () => {
        const AI_PORTAL_KEY = process.env.AI_PORTAL_API_KEY || 'your_ai_portal_api_key';

        it('should accept AI Portal requests with valid API key', async () => {
            const response = await request(app)
                .post('/api/ai-portal/function-call')
                .set('X-API-Key', AI_PORTAL_KEY)
                .send({
                    function_name: 'getFrameworks',
                    arguments: {}
                });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject AI Portal requests without API key', async () => {
            const response = await request(app)
                .post('/api/ai-portal/function-call')
                .send({
                    function_name: 'getFrameworks',
                    arguments: {}
                });
            
            expect(response.statusCode).toBe(401);
        });

        it('should handle getNiches function call', async () => {
            const response = await request(app)
                .post('/api/ai-portal/function-call')
                .set('X-API-Key', AI_PORTAL_KEY)
                .send({
                    function_name: 'getNiches',
                    arguments: {}
                });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.result).toBeDefined();
        });

        it('should handle getUserUsage function call', async () => {
            const response = await request(app)
                .post('/api/ai-portal/function-call')
                .set('X-API-Key', AI_PORTAL_KEY)
                .send({
                    function_name: 'getUserUsage',
                    arguments: {}
                });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.result.plan).toBe('unlimited');
        });

        it('should reject unknown function calls', async () => {
            const response = await request(app)
                .post('/api/ai-portal/function-call')
                .set('X-API-Key', AI_PORTAL_KEY)
                .send({
                    function_name: 'unknownFunction',
                    arguments: {}
                });
            
            expect(response.statusCode).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
});

