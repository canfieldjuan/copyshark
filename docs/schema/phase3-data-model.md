# CopyShark Feature Expansion – Phase 1 Data Model

## Purpose
Design verified schema updates to support brand profiles, campaign projects, multi-variant copy storage, and feedback loops while maintaining dual-driver support (SQLite + PostgreSQL).

## Existing Baseline
Confirmed via `database.js` (2025-10-15):
- Tables: `users`, `niches`, `frameworks`, `niche_keywords`
- Drivers: SQLite (`sqlite3`) and PostgreSQL (`pg`)
- Initialization executed inside `initializeSchema()` for both engines.

## New Tables
All IDs use `TEXT` (UUID strings) for compatibility across drivers. Boolean fields use `INTEGER` (0/1) in SQLite and `BOOLEAN` in PostgreSQL.

### brand_profiles
Stores reusable brand briefs and tone guidance per account.

| Column        | Type (SQLite) | Type (Postgres) | Notes |
|---------------|---------------|-----------------|-------|
| id            | TEXT PK       | TEXT PRIMARY KEY| UUID generated in application |
| user_id       | TEXT          | TEXT            | FK → users.id (ON DELETE CASCADE) |
| name          | TEXT          | TEXT            | Unique per user; indexed |
| tone          | TEXT          | TEXT            | High-level tone description |
| audience      | TEXT          | TEXT            | Primary audience persona |
| value_props   | TEXT          | TEXT            | Pipe/comma separated key benefits |
| brand_voice   | TEXT          | TEXT            | Free-form guidelines |
| created_at    | TEXT          | TIMESTAMPTZ     | ISO string storage for SQLite |
| updated_at    | TEXT          | TIMESTAMPTZ     | Updated whenever profile changes |

Indexes:
- `UNIQUE(user_id, name)` to prevent duplicates.
- `INDEX(user_id)` for quick lookups.

### copy_projects
Represents a campaign or request grouping multiple variants.

| Column        | Type (SQLite) | Type (Postgres) | Notes |
|---------------|---------------|-----------------|-------|
| id            | TEXT PK       | TEXT PRIMARY KEY| UUID |
| brand_id      | TEXT          | TEXT            | FK → brand_profiles.id (CASCADE) |
| title         | TEXT          | TEXT            | Campaign or product headline |
| objective     | TEXT          | TEXT            | Desired outcome/goal |
| brief         | TEXT          | TEXT            | Detailed instructions (JSON string allowed) |
| niche_id      | TEXT          | TEXT            | Optional FK → niches.id |
| framework_id  | TEXT          | TEXT            | Optional FK → frameworks.id |
| target_channel| TEXT          | TEXT            | e.g., email, landing page |
| created_at    | TEXT          | TIMESTAMPTZ     | |
| updated_at    | TEXT          | TIMESTAMPTZ     | |

Indexes:
- `INDEX(brand_id)`
- `INDEX(created_at)` for history ordering.

### copy_variants
Stores generated copy outputs and quick-evaluate metadata.

| Column        | Type (SQLite) | Type (Postgres) | Notes |
|---------------|---------------|-----------------|-------|
| id            | TEXT PK       | TEXT PRIMARY KEY| UUID |
| project_id    | TEXT          | TEXT            | FK → copy_projects.id (CASCADE) |
| model         | TEXT          | TEXT            | LLM model identifier |
| headline      | TEXT          | TEXT            | Generated headline |
| body          | TEXT          | TEXT            | Main copy block |
| cta           | TEXT          | TEXT            | Call-to-action |
| tone_snapshot | TEXT          | TEXT            | Tone applied for auditing |
| score         | INTEGER       | INTEGER         | Optional numeric score (0-100) |
| is_favorite   | INTEGER (0/1) | BOOLEAN         | Quick toggle |
| metadata      | TEXT          | JSONB           | Stores JSON string of keywords/context |
| generated_at  | TEXT          | TIMESTAMPTZ     | Generation timestamp |

Indexes:
- `INDEX(project_id)`
- `INDEX(is_favorite)` (optional) for filtering.

### variant_feedback
Captures reviewer input per variant.

| Column        | Type (SQLite) | Type (Postgres) | Notes |
|---------------|---------------|-----------------|-------|
| id            | TEXT PK       | TEXT PRIMARY KEY| UUID |
| variant_id    | TEXT          | TEXT            | FK → copy_variants.id (CASCADE) |
| rating        | INTEGER       | INTEGER         | 1-5 scale |
| notes         | TEXT          | TEXT            | Reviewer comments |
| created_at    | TEXT          | TIMESTAMPTZ     | Timestamp |

Indexes:
- `INDEX(variant_id)`

## Required Application Changes
1. **database.js**
   - Extend `initializeSchema()` for both drivers with new CREATE TABLE statements.
   - Add helper functions:
     - `createBrandProfile`, `listBrandProfilesByUser`, `updateBrandProfile`, `deleteBrandProfile`
     - `createProject`, `getProjectById`, `listProjectsByBrand`
     - `insertVariants`, `listVariantsByProject`, `updateVariant`, `setVariantFavorite`
     - `createVariantFeedback`, `listFeedbackByVariant`
   - Ensure SQLite uses `FOREIGN KEY` constraints with `ON DELETE CASCADE`.

2. **Service Layer**
   - New modules `src/services/brand.service.js` and `src/services/project.service.js` wrapping DB helpers and handling validation/UUID generation.

3. **Testing**
   - Unit tests for each service (Jest) with mocked database module.
   - Schema smoke tests: run SQLite `PRAGMA table_info` and Postgres `SELECT` migration scripts in CI (manual during development).

## Validation Strategy
- After schema updates, run `sqlite3 copyshark.db '.schema'` to verify tables.
- For PostgreSQL, use local/docker instance or `psql` in CI to apply migrations (ensuring idempotence).
- Execute `npx jest tests/unit/services/*` to confirm service contracts.
- Manual flow (post Phase 1): seed a brand/profile and ensure data persists via DB helper scripts.

## Open Questions
- Should brand profiles be shareable across users/teams? (Assume single-owner for MVP.)
- Do we need soft deletes? (Out-of-scope for Phase 1; revisit in later phases.)
- JSON storage: `metadata` column stored as TEXT in SQLite; service will stringify/parse.

## Approval Checklist
- [ ] Review column names & data types with stakeholder
- [ ] Confirm foreign key cascade behaviour acceptable
- [ ] Validate new helper methods cover required CRUD operations

Once approved, proceed with Phase 1 implementation following the above schema.
