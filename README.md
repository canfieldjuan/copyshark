"# CopyShark - AI-Powered Copy Generation Platform

**Version**: 5.0.0  
**Status**: Production Ready + Modularization Planning Complete  
**Last Updated**: 2025-10-15

---

## Overview

CopyShark is a production-ready AI-powered copy generation platform with complete user authentication, usage tracking, multi-provider LLM support, and a polished frontend experience.

**Key Features**:
- Multi-provider LLM orchestration (OpenAI, Anthropic, Google Gemini)
- JWT-based user authentication
- Plan-based usage tracking and limits
- Niche-specific knowledge priming
- Marketing framework integration
- Brand profile vault + campaign workspaces + variant library
- AI Portal API for external integration
- Comprehensive unit suite (52 tests and counting)

---

## Quick Start

### Installation
```bash
npm install
cp .env.example .env
# Configure .env with your API keys
# Optional: configure GraphITI/Neo4j integration
# GRAPHITI_BASE_URL=http://localhost:8000
# GRAPHITI_API_KEY=your_graphiti_key
# GRAPHITI_TIMEOUT_MS=10000
```

### Database Setup
```bash
node scripts/seed_db.js
```

### Run
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

### Test
```bash
npm test
```

---

## Documentation Index

### Getting Started
- **This File** - Project overview and quick start
- **STATUS.md** - Current status, features, and deployment readiness
- **CHECKLIST.md** - Phase 3 completion checklist

### Development History
- **project_log.md** - Complete development history (Phases 1-4)
- **PHASE3_SUMMARY.md** - Phase 3 implementation details

### Modularization (Current Initiative)
- **MODULARIZATION_SUMMARY.md** - Quick overview and next steps ⭐ START HERE
- **MODULAR_IMPLEMENTATION_PLAN.md** - Detailed 10-phase implementation plan
- **SESSION_CONTINUITY.md** - Progress tracking across sessions

---

## Current Architecture

### Monolithic (Current)
```
server.js (670 lines)
├── Express setup
├── Middleware config
├── Auth logic
├── 15+ API routes
├── Business logic
├── Cache management
└── Error handling

database.js (good abstraction)
services/llmService.js (good pattern)
utils/errors.js (good pattern)
```

### Target Architecture (Planned)
```
server.js (50-100 lines - bootstrap only)

src/
├── config/        # Configuration
├── middleware/    # Reusable middleware
├── routes/        # Route definitions
├── controllers/   # HTTP layer
├── services/      # Business logic
├── models/        # Data models
├── database/      # DB adapters
└── utils/         # Utilities

tests/
├── unit/          # 50+ unit tests
├── integration/   # 30+ integration tests
└── e2e/          # 10+ E2E tests
```

---

## API Endpoints

### Public
- `GET /api/health` - Health check
- `GET /api/frameworks` - Marketing frameworks
- `GET /api/niches` - Business niches
- `GET /api/models` - LLM model catalog
- `GET /api/functions` - AI Portal function definitions

### Authenticated Brand Workspace
- `GET /api/brands` · `POST /api/brands` · `GET/PATCH/DELETE /api/brands/:brandId`
- `GET /api/brands/:brandId/projects` · `POST /api/brands/:brandId/projects`
- `GET /api/projects` · `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/variants`
- `POST /api/projects/:projectId/variants`
- `POST /api/projects/:projectId/generate` (batch variant generation)
- `PATCH /api/variants/:variantId` · `POST /api/variants/:variantId/favorite`
- `POST /api/variants/:variantId/feedback` · `GET /api/variants/:variantId/feedback`

---

## Frontend Workspace

The conversational workspace lives in `frontend/app.html` and is powered by the bundled `frontend/vendor/react-lite.js` runtime (React-compatible). It exposes:

- Brand profile management (tone, personas, value props)
- Campaign project creation with niche/framework presets
- Variant lab for multi-variant generation, feedback, favorites, and markdown export
- Knowledge graph teaser panel for future Graph RAG + Neo4j integrations

> **Heads up:** Babel is still loaded from unpkg for JSX convenience—migrate to a bundler (Vite/Next) when hardening for production.

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Protected
- `GET /api/user/me` - User info (requires JWT)
- `POST /api/generate-copy` - Generate copy (optional JWT)

### AI Portal
- `POST /api/ai-portal/function-call` - Function calling (requires API key)

---

## Environment Variables

```env
# Database
DATABASE_URL=sqlite:./copyshark.db

# Authentication
JWT_SECRET=your_jwt_secret_key

# AI Portal
AI_PORTAL_API_KEY=your_api_key

# LLM Provider
LLM_PROVIDER=google|openai|anthropic
GOOGLE_AI_API_KEY=your_key
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key

# GraphITI (optional)
GRAPHITI_BASE_URL=http://localhost:8000
GRAPHITI_API_KEY=your_graphiti_key
GRAPHITI_TIMEOUT_MS=10000
```

---

## Development

### Commands
```bash
npm start         # Production server
npm run dev       # Development with hot reload
npm test          # Run test suite
```

### Scripts
```bash
node scripts/seed_db.js         # Seed database
node scripts/validate_server.js # Validate endpoints
```

### Testing
- **Current**: 56 unit tests (integration suite pending)
- **Target**: 100+ tests
- **Coverage**: ~60% → 80%+

---

## Current Status

✅ **Phase 1-3**: Complete
- Structured logging
- Hot reload
- Error handling
- Database-driven taxonomy
- Niche-specific keywords
- Usage tracking
- Authentication-aware UI
- Comprehensive tests

⏳ **Phase 4**: Planning Complete
- Modularization plan ready
- 10 detailed phases
- 7-8 week timeline
- Ready to implement

---

## Next Steps

### For Development Team
1. Read `MODULARIZATION_SUMMARY.md` for quick overview
2. Read `MODULAR_IMPLEMENTATION_PLAN.md` for details
3. Use `SESSION_CONTINUITY.md` to track progress
4. Begin Phase 1: Foundation Setup

### For New Contributors
1. Read this README
2. Check `STATUS.md` for current capabilities
3. Review `project_log.md` for development history
4. Run tests: `npm test`
5. Start server: `npm run dev`

---

## Tech Stack

**Backend**:
- Node.js 18.x
- Express.js
- SQLite/PostgreSQL
- JWT authentication
- Pino logging

**LLM Providers**:
- Google Gemini
- OpenAI
- Anthropic Claude

**Frontend**:
- React (vendored `react-lite` runtime) + vanilla CSS
- Babel Standalone (development only)

**Testing**:
- Jest
- Supertest

**Development**:
- Nodemon (hot reload)
- dotenv (config)

---

## Project Statistics

### Current (Version 5.0.0)
- **Lines of Code**: ~3,100
- **Tests**: 56 unit (integration pending)
- **Endpoints**: 20+
- **Test Coverage**: ~60%
- **Main File Size**: ~220 lines (server.js bootstrap + routing)

### Target (Post-Modularization)
- **Lines of Code**: ~3,500
- **Tests**: 100+
- **Endpoints**: 15+ (same)
- **Test Coverage**: >80%
- **Main File Size**: 50-100 lines (server.js)

---

## Contributing

1. Read documentation (start with MODULARIZATION_SUMMARY.md)
2. Check SESSION_CONTINUITY.md for current phase
3. Follow the implementation plan
4. Write tests for all changes
5. Update documentation
6. Ensure all tests pass

---

## License

[Your License Here]

---

## Support

For questions or issues:
- Check documentation in this repository
- Review project_log.md for development history
- Consult MODULAR_IMPLEMENTATION_PLAN.md for architecture details

---

**Status**: Production Ready + Planning Complete for Modularization  
**Next Phase**: Implementation Phase 1 - Foundation Setup  
**Timeline**: 7-8 weeks to complete modularization

---

*Built with ❤️ using Node.js, Express, and AI*" 
