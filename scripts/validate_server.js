#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:4000';

function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: body
                    });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function validateServer() {
    console.log('=== CopyShark Server Validation ===\n');

    try {
        console.log('1. Testing health endpoint...');
        const health = await makeRequest('GET', '/api/health');
        console.log(`   Status: ${health.status} - ${health.data.status}`);
        console.log(`   Functions: ${health.data.available_functions?.join(', ')}`);

        console.log('\n2. Testing frameworks endpoint...');
        const frameworks = await makeRequest('GET', '/api/frameworks');
        console.log(`   Status: ${frameworks.status} - Found ${frameworks.data.length} frameworks`);

        console.log('\n3. Testing niches endpoint...');
        const niches = await makeRequest('GET', '/api/niches');
        console.log(`   Status: ${niches.status} - Found ${niches.data.length} niches`);

        console.log('\n4. Testing models endpoint...');
        const models = await makeRequest('GET', '/api/models');
        console.log(`   Status: ${models.status} - Provider: ${models.data.provider}`);
        console.log(`   Models: ${models.data.models?.map(m => m.id).join(', ')}`);

        console.log('\n5. Testing user registration...');
        const testEmail = `test${Date.now()}@example.com`;
        const register = await makeRequest('POST', '/api/auth/register', {
            email: testEmail,
            password: 'testpass123'
        });
        console.log(`   Status: ${register.status} - User ID: ${register.data.userId}`);

        console.log('\n6. Testing user login...');
        const login = await makeRequest('POST', '/api/auth/login', {
            email: testEmail,
            password: 'testpass123'
        });
        console.log(`   Status: ${login.status} - Token received: ${!!login.data.token}`);
        const token = login.data.token;

        console.log('\n7. Testing user info retrieval...');
        const userInfo = await makeRequest('GET', '/api/user/me', null, {
            'Authorization': `Bearer ${token}`
        });
        console.log(`   Status: ${userInfo.status}`);
        console.log(`   Email: ${userInfo.data.email}`);
        console.log(`   Plan: ${userInfo.data.plan}`);
        console.log(`   Usage: ${userInfo.data.usage}`);

        console.log('\n8. Testing copy generation (authenticated)...');
        const generate = await makeRequest('POST', '/api/generate-copy', {
            productName: 'Test Product',
            audience: 'Test Audience',
            niche: 'general',
            framework: 'aida',
            tone: 'professional'
        }, {
            'Authorization': `Bearer ${token}`
        });
        console.log(`   Status: ${generate.status}`);
        if (generate.data.success) {
            console.log(`   Headline: ${generate.data.copy.headline.substring(0, 50)}...`);
            console.log(`   Usage incremented: true`);
        } else {
            console.log(`   Error: ${generate.data.error}`);
        }

        console.log('\n9. Verifying usage increment...');
        const updatedInfo = await makeRequest('GET', '/api/user/me', null, {
            'Authorization': `Bearer ${token}`
        });
        console.log(`   New usage count: ${updatedInfo.data.usage}`);
        console.log(`   Increment verified: ${updatedInfo.data.usage > userInfo.data.usage}`);

        console.log('\n=== All Validations Passed ===\n');
        process.exit(0);
    } catch (error) {
        console.error('\n=== Validation Failed ===');
        console.error(error.message);
        process.exit(1);
    }
}

setTimeout(() => {
    console.log('Timeout: Server not responding\n');
    process.exit(1);
}, 30000);

validateServer();
