# Brand Profile & Product Catalog Refactor - Implementation Plan

**Created:** October 16, 2025  
**Objective:** Refactor brand system to support one brand profile per user + multiple products per brand

---

## 📊 Current State Analysis

### Database Schema (Verified)
```sql
-- Current: brand_profiles (allows multiple brands per user)
CREATE TABLE brand_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    tone TEXT,
    audience TEXT,
    value_props TEXT,
    brand_voice TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, name),  -- Can have multiple brands with different names
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Current: copy_projects (links to brand_id)
CREATE TABLE copy_projects (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    title TEXT NOT NULL,
    objective TEXT,
    brief TEXT,
    niche_id TEXT,
    framework_id TEXT,
    target_channel TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (brand_id) REFERENCES brand_profiles (id) ON DELETE CASCADE
);
```

### Current Data
- **Brands:** 1 brand exists
- **Projects:** 1 project exists
- **Brand data:** `name="Dev Ops"`, `brand_voice=NULL`

### Backend Files (Verified)
- ✅ `/src/controllers/brand.controller.js` - CRUD operations
- ✅ `/src/services/brand.service.js` - Business logic
- ✅ `/database.js` - Database operations
- ✅ `/src/routes/` - API routes

### Frontend Files (Need to verify)
- ❓ `/frontend/app.html` - Main UI (2011 lines)
- ❓ Brand card component location
- ❓ Project creation flow

---

## 🎯 Target Architecture

### New Schema Design

#### 1. Enhanced `brand_profiles` (ONE per user)
```sql
CREATE TABLE brand_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    brand_voice TEXT NOT NULL,           -- Detailed description (REQUIRED)
    core_values TEXT,                    -- Mission, values
    target_audience TEXT NOT NULL,       -- Demographics, psychographics (REQUIRED)
    tone_default TEXT DEFAULT 'professional',
    niche_id TEXT,                       -- Default industry
    competitor_info TEXT,                -- Optional competitor analysis
    style_guide TEXT,                    -- Future: colors, fonts, etc.
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id),                     -- ONE brand per user (KEY CHANGE)
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (niche_id) REFERENCES niches (id)
);
```

#### 2. NEW `products` Table
```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    target_audience TEXT,                -- Product-specific audience (optional)
    price_point TEXT,                    -- "Premium", "$99/mo", "Free", etc.
    key_features TEXT,                   -- Comma-separated or JSON
    usps TEXT,                           -- Unique selling points
    category TEXT,                       -- "SaaS", "Physical Product", "Service", etc.
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (brand_id) REFERENCES brand_profiles(id) ON DELETE CASCADE
);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_active ON products(is_active);
```

#### 3. Update `copy_projects` (Add product_id)
```sql
ALTER TABLE copy_projects ADD COLUMN product_id TEXT REFERENCES products(id);
CREATE INDEX idx_copy_projects_product ON copy_projects(product_id);
```

---

## 📋 Phased Implementation Plan

### PHASE 1: Database Migration (Est: 1 hour)
**Goal:** Create new schema without breaking existing functionality

#### Step 1.1: Create Migration Script
- [ ] Create `/scripts/migrations/001_add_products_table.js`
- [ ] Create products table
- [ ] Add product_id column to copy_projects
- [ ] Create indexes
- [ ] **Verification:** Run migration on test database first

#### Step 1.2: Data Migration Strategy
- [ ] For existing brand: Keep as-is (don't enforce UNIQUE constraint yet)
- [ ] Create default product from existing project data
- [ ] Link existing projects to default product
- [ ] **Verification:** Query data to ensure no data loss

#### Step 1.3: Schema Enhancement (Breaking Change - Do Last)
- [ ] Add UNIQUE(user_id) constraint to brand_profiles
- [ ] Make brand_voice and target_audience NOT NULL
- [ ] **Verification:** Test with existing data

**Rollback Plan:** Keep backup of copyshark.db before migration

---

### PHASE 2: Backend API - Products (Est: 2 hours)
**Goal:** Create product CRUD operations

#### Step 2.1: Create Product Service
- [ ] Create `/src/services/product.service.js`
  - `createProduct(brandId, payload)`
  - `getProductsForBrand(brandId)`
  - `getProduct(productId)`
  - `updateProduct(productId, payload)`
  - `deleteProduct(productId)`
- [ ] Add validation for required fields
- [ ] Add logging at key points
- [ ] **Verification:** Unit tests for each function

#### Step 2.2: Create Product Controller
- [ ] Create `/src/controllers/product.controller.js`
  - `POST /api/products` - Create product
  - `GET /api/products` - List products for user's brand
  - `GET /api/products/:id` - Get single product
  - `PATCH /api/products/:id` - Update product
  - `DELETE /api/products/:id` - Delete product
- [ ] Add ownership verification
- [ ] Add error handling
- [ ] **Verification:** Test each endpoint with curl/Postman

#### Step 2.3: Add Product Routes
- [ ] Update `/src/routes/index.js` to include product routes
- [ ] Add authentication middleware
- [ ] **Verification:** Check routes with `GET /api/meta`

#### Step 2.4: Update Database Module
- [ ] Add product functions to `/database.js`
  - `createProduct(data)`
  - `listProductsByBrand(brandId)`
  - `getProductById(productId)`
  - `updateProduct(productId, data)`
  - `deleteProduct(productId)`
- [ ] **Verification:** Test each function directly

**Dependencies:** None (new feature, doesn't affect existing code)

---

### PHASE 3: Backend API - Enhanced Brand Profile (Est: 1.5 hours)
**Goal:** Update brand service to support enhanced fields

#### Step 3.1: Update Brand Service
- [ ] Update `/src/services/brand.service.js`
  - Add validation for new required fields (brand_voice, target_audience)
  - Update `normalizeProfileInput()` to handle new fields
  - Add `getOrCreateBrandForUser()` helper
- [ ] **Verification:** Test with existing brand data

#### Step 3.2: Update Brand Controller
- [ ] Update `/src/controllers/brand.controller.js`
  - Modify `create()` to enforce one brand per user
  - Add better error messages for validation
- [ ] **Verification:** Try creating duplicate brand (should fail)

#### Step 3.3: Add Brand Setup Check
- [ ] Create middleware to check if user has brand profile
- [ ] Add endpoint `GET /api/brands/setup-status`
- [ ] **Verification:** Test with user who has/doesn't have brand

**Risk:** Could break existing brand creation flow  
**Mitigation:** Test thoroughly before deploying

---

### PHASE 4: Copy Generation Enhancement (Est: 1 hour)
**Goal:** Use brand + product context in prompts

#### Step 4.1: Update Copy Service
- [ ] Update `/src/services/copy.service.js`
  - Modify `buildCopyPrompt()` to accept product data
  - Pull brand profile data (brand_voice, core_values, target_audience)
  - Pull product data (description, usps, target_audience)
  - Enhance prompt with full context
- [ ] **Verification:** Log generated prompts to see full context

#### Step 4.2: Update Project Controller
- [ ] Update `/src/controllers/project.controller.js`
  - Add product_id to project creation
  - Fetch product data when generating copy
  - Pass product data to copy service
- [ ] **Verification:** Generate copy and check prompt includes product details

**Example Enhanced Prompt:**
```
🦈 You are CopyShark...

🏢 BRAND CONTEXT:
Company: "TechCorp"
Brand Voice: "Bold, direct, data-driven. We speak to technical founders..."
Core Values: "Speed over perfection, transparency, no BS"
Brand Audience: "B2B SaaS founders, 25-45, technical background"

📦 PRODUCT CONTEXT:
Product: "AI Training Platform"
Description: "GPU-accelerated training for custom models"
Target Audience: "ML Engineers, Data Scientists"
USPs: "10x faster training, LoRA support, auto-scaling"
Price Point: "Premium ($499/mo)"

🎯 YOUR ASSIGNMENT:
Framework: "AIDA"
Tone: "professional"
...
```

---

### PHASE 5: Frontend - Product Catalog UI (Est: 3 hours)
**Goal:** Create product management interface

#### Step 5.1: Verify Current UI Structure
- [ ] Read `/frontend/app.html` to find:
  - Brand card component location
  - Project creation flow
  - State management structure
- [ ] Document current flow
- [ ] **Verification:** Understand existing code before modifying

#### Step 5.2: Create Product Components
- [ ] Create `ProductCatalog` component
  - List all products for brand
  - Add/Edit/Delete buttons
  - Product cards with key info
- [ ] Create `ProductModal` component
  - Form for creating/editing products
  - All fields: name, description, audience, usps, price, category
  - Validation
- [ ] **Verification:** Test modal open/close, form validation

#### Step 5.3: Update Project Creation Flow
- [ ] Add product selection dropdown to campaign creation
- [ ] Remove brand card from project view (no longer needed)
- [ ] Auto-fill brand context from profile
- [ ] **Verification:** Create campaign with product selected

#### Step 5.4: Add Navigation
- [ ] Add "Products" tab/section
- [ ] Add "Brand Profile" settings link
- [ ] **Verification:** Navigate between sections

**Risk:** Breaking existing UI flow  
**Mitigation:** Test each component in isolation first

---

### PHASE 6: Frontend - Brand Profile Setup (Est: 2 hours)
**Goal:** Create one-time brand profile setup flow

#### Step 6.1: Create Brand Setup Component
- [ ] Create `BrandProfileSetup` component
  - Large form with all brand fields
  - Detailed instructions/examples
  - Validation for required fields
- [ ] **Verification:** Test form submission

#### Step 6.2: Add First-Time User Flow
- [ ] Check if user has brand profile on login
- [ ] Show setup wizard if no brand exists
- [ ] Redirect to products after setup
- [ ] **Verification:** Test with new user account

#### Step 6.3: Add Brand Profile Edit
- [ ] Create `BrandProfileEdit` component
  - Same form as setup, but pre-filled
  - Accessible from settings
- [ ] **Verification:** Edit existing brand profile

---

### PHASE 7: Testing & Validation (Est: 2 hours)
**Goal:** Ensure everything works end-to-end

#### Step 7.1: Backend Tests
- [ ] Test product CRUD operations
- [ ] Test brand profile constraints (one per user)
- [ ] Test copy generation with product context
- [ ] Test migration script
- [ ] **Verification:** All tests pass

#### Step 7.2: Frontend Tests
- [ ] Test product catalog (add/edit/delete)
- [ ] Test brand profile setup
- [ ] Test campaign creation with products
- [ ] Test copy generation
- [ ] **Verification:** Manual testing of full flow

#### Step 7.3: Integration Tests
- [ ] Test full user journey:
  1. New user signs up
  2. Creates brand profile
  3. Adds products
  4. Creates campaign
  5. Generates copy
- [ ] **Verification:** No errors, copy includes brand+product context

---

### PHASE 8: Migration & Deployment (Est: 1 hour)
**Goal:** Deploy to production safely

#### Step 8.1: Backup Current Database
- [ ] Create backup of copyshark.db
- [ ] Store in safe location
- [ ] **Verification:** Backup file exists and is valid

#### Step 8.2: Run Migration
- [ ] Run migration script
- [ ] Verify data integrity
- [ ] Check existing projects still work
- [ ] **Verification:** Query database to confirm schema

#### Step 8.3: Deploy Code
- [ ] Restart server with new code
- [ ] Monitor logs for errors
- [ ] Test critical paths
- [ ] **Verification:** Server running, no errors in logs

#### Step 8.4: Rollback Plan (If Needed)
- [ ] Restore database from backup
- [ ] Revert code changes
- [ ] Restart server
- [ ] **Verification:** System back to previous state

---

## 🔍 Verification Checklist

### Database Verification
- [ ] Products table exists with correct schema
- [ ] product_id column added to copy_projects
- [ ] Indexes created
- [ ] Existing data preserved
- [ ] Foreign key constraints working

### Backend Verification
- [ ] Product endpoints respond correctly
- [ ] Brand profile enforces one per user
- [ ] Copy generation includes product context
- [ ] Error handling works
- [ ] Logging captures key events

### Frontend Verification
- [ ] Product catalog displays correctly
- [ ] Can add/edit/delete products
- [ ] Brand profile setup works
- [ ] Campaign creation uses products
- [ ] No console errors

### Integration Verification
- [ ] Full user flow works end-to-end
- [ ] Copy quality improved (more context)
- [ ] No broken features
- [ ] Performance acceptable

---

## 🚨 Risk Assessment

### High Risk
1. **Database migration** - Could corrupt data
   - **Mitigation:** Backup first, test on copy of database
   
2. **Brand constraint change** - Could break existing multi-brand users
   - **Mitigation:** Check if any users have multiple brands first

3. **Frontend refactor** - Could break existing UI
   - **Mitigation:** Test each component in isolation

### Medium Risk
1. **Copy generation changes** - Could produce worse copy
   - **Mitigation:** A/B test old vs new prompts

2. **API changes** - Could break frontend
   - **Mitigation:** Maintain backward compatibility where possible

### Low Risk
1. **New product features** - Additive, doesn't affect existing code
2. **Enhanced logging** - Only adds observability

---

## 📝 Dependencies & Order

**Must Do First:**
1. Phase 1 (Database) - Everything depends on this
2. Phase 2 (Product API) - Frontend needs this

**Can Do in Parallel:**
- Phase 3 (Brand API) + Phase 4 (Copy Enhancement)
- Phase 5 (Product UI) + Phase 6 (Brand UI) (after Phase 2 done)

**Must Do Last:**
- Phase 7 (Testing) - After all features complete
- Phase 8 (Deployment) - After testing passes

---

## 📊 Estimated Timeline

| Phase | Task | Time | Dependencies |
|-------|------|------|--------------|
| 1 | Database Migration | 1h | None |
| 2 | Product API | 2h | Phase 1 |
| 3 | Brand API Enhancement | 1.5h | Phase 1 |
| 4 | Copy Generation Enhancement | 1h | Phase 1, 2 |
| 5 | Product Catalog UI | 3h | Phase 2 |
| 6 | Brand Profile Setup UI | 2h | Phase 3 |
| 7 | Testing & Validation | 2h | All phases |
| 8 | Migration & Deployment | 1h | Phase 7 |
| **TOTAL** | | **13.5 hours** | |

**Realistic Timeline:** 2-3 days (accounting for testing, debugging, breaks)

---

## 🎯 Success Criteria

### Must Have
- ✅ One brand profile per user (enforced)
- ✅ Multiple products per brand (working CRUD)
- ✅ Copy generation uses brand + product context
- ✅ No data loss during migration
- ✅ All existing features still work

### Nice to Have
- ✅ Improved copy quality (measurable via user feedback)
- ✅ Better UX (fewer steps to create campaign)
- ✅ Comprehensive logging
- ✅ Unit tests for new features

### Metrics to Track
- Copy generation success rate
- User feedback ratings on variants
- Time to create campaign (should decrease)
- Number of products per brand (usage indicator)

---

## 📚 Next Steps

**Immediate Actions:**
1. Review this plan with stakeholders
2. Verify current frontend structure (read app.html)
3. Create database backup
4. Start Phase 1: Database Migration

**Questions to Answer:**
1. Should we enforce one brand per user immediately, or phase it in?
2. What happens to users with multiple brands (if any exist)?
3. Should products be required, or can users create campaigns without products?
4. What's the minimum viable product catalog (how many fields are truly required)?

---

**Status:** 📋 PLAN CREATED - AWAITING APPROVAL TO START PHASE 1
