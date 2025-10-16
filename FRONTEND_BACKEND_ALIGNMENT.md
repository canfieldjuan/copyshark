# Frontend-Backend Alignment Report
**Generated:** October 15, 2025  
**Status:** ⚠️ Partially Aligned - Missing UI Components

---

## Executive Summary

The CopyShark frontend and backend are **70% aligned**. The core user journey (auth → brands → projects → variants → copy generation) is fully implemented. However, **critical CRUD operations are missing UI components**, specifically:

- ❌ **Brand Update/Delete** - Backend exists, no UI
- ❌ **Variant Update** - Backend exists, no UI  
- ❌ **Project Update/Delete** - Backend exists, no UI
- ❌ **Legacy `/api/generate-copy` endpoint** - Not used by frontend
- ⚠️ **Graph replay variant** - Backend exists, no UI trigger

---

## 1. Backend API Endpoints (Complete Inventory)

### **Authentication Routes** (`/api/auth`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| POST | `/api/auth/register` | authController.register | ✅ Register form | ✅ Aligned |
| POST | `/api/auth/login` | authController.login | ✅ Login form | ✅ Aligned |

---

### **User Routes** (`/api/user`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| GET | `/api/user/me` | userController.getCurrentUser | ✅ Bootstrap call | ✅ Aligned |

---

### **Brand Routes** (`/api/brands`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| GET | `/api/brands` | brandController.list | ✅ Bootstrap call | ✅ Aligned |
| POST | `/api/brands` | brandController.create | ✅ Create brand form | ✅ Aligned |
| GET | `/api/brands/:brandId` | brandController.get | ❌ Not used | ⚠️ No UI |
| PATCH | `/api/brands/:brandId` | brandController.update | ❌ No UI | ❌ **MISSING** |
| DELETE | `/api/brands/:brandId` | brandController.remove | ❌ No UI | ❌ **MISSING** |
| GET | `/api/brands/:brandId/projects` | projectController.listForBrand | ✅ Brand selection | ✅ Aligned |
| POST | `/api/brands/:brandId/projects` | projectController.createForBrand | ✅ Create project | ✅ Aligned |

**Missing UI Components:**
- Brand edit modal (name, audience, tone updates)
- Brand delete confirmation dialog
- Brand settings panel

---

### **Project Routes** (`/api/projects`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| GET | `/api/projects/` | projectController.list | ❌ Not used | ⚠️ No UI |
| POST | `/api/projects/` | projectController.create | ❌ Not used | ⚠️ No UI |
| GET | `/api/projects/:projectId` | projectController.get | ❌ Not used | ⚠️ No UI |
| GET | `/api/projects/:projectId/variants` | projectController.listVariants | ✅ Project selection | ✅ Aligned |
| POST | `/api/projects/:projectId/variants` | projectController.createVariants | ❌ Not used | ⚠️ No UI |
| POST | `/api/projects/:projectId/generate` | projectController.generateVariants | ✅ Generate form | ✅ Aligned |

**Notes:**
- Frontend uses brand-scoped project creation (`/api/brands/:brandId/projects`)
- Direct project routes exist but unused
- No UI for project update/delete

---

### **Variant Routes** (`/api/variants`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| PATCH | `/api/variants/:variantId` | projectController.updateVariant | ❌ No UI | ❌ **MISSING** |
| POST | `/api/variants/:variantId/favorite` | projectController.toggleFavorite | ✅ Star button | ✅ Aligned |
| POST | `/api/variants/:variantId/feedback` | projectController.addFeedback | ✅ Feedback prompt | ✅ Aligned |
| GET | `/api/variants/:variantId/feedback` | projectController.listFeedback | ❌ No UI | ❌ **MISSING** |

**Missing UI Components:**
- Inline variant editor (headline/body/CTA edits)
- Feedback history viewer
- Variant version history

---

### **Graph Routes** (`/api/graph`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| GET | `/api/graph/status` | graphController.status | ✅ Bootstrap call | ✅ Aligned |
| GET | `/api/graph/insights` | graphController.insights | ✅ Graph panel | ✅ Aligned |
| POST | `/api/graph/variants/:variantId/replay` | graphController.replayVariant | ❌ No UI | ❌ **MISSING** |

**Missing UI Component:**
- "Replay from graph" button for variants

---

### **Taxonomy Routes** (`/api`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| GET | `/api/frameworks` | taxonomyController.getFrameworks | ✅ Bootstrap call | ✅ Aligned |
| GET | `/api/niches` | taxonomyController.getNiches | ✅ Bootstrap call | ✅ Aligned |

---

### **Meta Routes** (`/api`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| GET | `/api/health` | metaController.health | ❌ Not used | ⚠️ No UI |
| GET | `/api/models` | metaController.models | ✅ Bootstrap call | ✅ Aligned |

---

### **Copy Routes** (`/api`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| POST | `/api/generate-copy` | copyController.generateCopy | ❌ Not used | ⚠️ **LEGACY** |

**Note:** This is the original standalone copy generation endpoint. Frontend now uses project-scoped generation (`/api/projects/:id/generate`).

---

### **AI Portal Routes** (`/api`)
| Method | Endpoint | Controller | Frontend UI | Status |
|--------|----------|------------|-------------|--------|
| POST | `/api/ai-portal/function-call` | aiPortalController.callFunction | ❌ External | ⚠️ External |
| GET | `/api/functions` | aiPortalController.getFunctionDefinitions | ❌ External | ⚠️ External |

**Note:** These are for external AI portal integration, not used by main frontend.

---

## 2. Frontend API Calls (Complete Inventory)

### **Mapped Calls:**
```javascript
// Authentication
POST /api/auth/login              → handleLogin()
POST /api/auth/register           → handleRegister()

// User
GET /api/user/me                  → bootstrap()

// Brands
GET /api/brands                   → bootstrap()
POST /api/brands                  → handleCreateBrand()
GET /api/brands/:id/projects      → useEffect on selectedBrand change

// Projects
POST /api/brands/:id/projects     → handleCreateProject()
GET /api/projects/:id/variants    → useEffect on selectedProject change
POST /api/projects/:id/generate   → handleGenerateVariants()

// Variants
POST /api/variants/:id/favorite   → handleFavorite()
POST /api/variants/:id/feedback   → handleFeedback()

// Graph
GET /api/graph/status             → bootstrap()
GET /api/graph/insights           → fetchGraphInsights()

// Taxonomy
GET /api/niches                   → bootstrap()
GET /api/frameworks               → bootstrap()

// Meta
GET /api/models                   → bootstrap()
```

---

## 3. Missing UI Components (Priority Order)

### **🔴 Critical (Breaks CRUD completeness):**

#### **1. Brand Management Panel**
**Missing Features:**
- Edit brand name, audience, tone
- Delete brand with confirmation
- View brand metadata

**Endpoint:** `PATCH /api/brands/:brandId`, `DELETE /api/brands/:brandId`

**Proposed UI Location:** Settings icon next to brand name in sidebar

**Implementation:**
```javascript
const handleUpdateBrand = async (brandId, updates) => {
  const response = await apiRequest(`/api/brands/${brandId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  setBrands(brands.map(b => b.id === brandId ? response.brand : b));
  setSelectedBrand(response.brand);
};

const handleDeleteBrand = async (brandId) => {
  if (!confirm('Delete this brand and all its projects?')) return;
  await apiRequest(`/api/brands/${brandId}`, { method: 'DELETE' });
  setBrands(brands.filter(b => b.id !== brandId));
  setSelectedBrand(brands[0] || null);
};
```

---

#### **2. Variant Editor**
**Missing Features:**
- Inline editing of headline/body/CTA
- Save edited variants
- Version history

**Endpoint:** `PATCH /api/variants/:variantId`

**Proposed UI Location:** Edit button in variant card

**Implementation:**
```javascript
const handleUpdateVariant = async (variantId, updates) => {
  const response = await apiRequest(`/api/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  setVariants(variants.map(v => v.id === variantId ? response.variant : v));
};
```

---

#### **3. Feedback History Viewer**
**Missing Features:**
- View past feedback on variants
- Feedback timeline
- Rating trends

**Endpoint:** `GET /api/variants/:variantId/feedback`

**Proposed UI Location:** "View feedback history" link in variant card

**Implementation:**
```javascript
const [feedbackHistory, setFeedbackHistory] = useState([]);

const viewFeedbackHistory = async (variantId) => {
  const response = await apiRequest(`/api/variants/${variantId}/feedback`);
  setFeedbackHistory(response.feedback || []);
  // Show modal with feedback list
};
```

---

### **🟡 Medium Priority (Enhances UX):**

#### **4. Project Management**
**Missing Features:**
- Edit project title, channel, tone
- Delete project
- Archive projects

**Note:** No dedicated update/delete endpoints exist. Would need backend routes:
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`

---

#### **5. Graph Replay Button**
**Missing Features:**
- "Regenerate from graph insights" button
- Shows when graph has context

**Endpoint:** `POST /api/graph/variants/:variantId/replay`

**Implementation:**
```javascript
const handleReplayVariant = async (variantId) => {
  const response = await apiRequest(`/api/graph/variants/${variantId}/replay`, {
    method: 'POST',
  });
  // Add replayed variant to list
  setVariants(prev => [response.variant, ...prev]);
};
```

---

### **🟢 Low Priority (Nice-to-have):**

#### **6. Health Check Indicator**
**Endpoint:** `GET /api/health`

**Proposed UI:** Status dot in footer showing green/red based on health check

---

#### **7. Usage Analytics Dashboard**
**Current:** Simple "X/Y" display
**Enhancement:** Chart showing usage over time, model breakdown, success rates

---

## 4. Data Flow Alignment

### **✅ Fully Implemented Flows:**

```
USER REGISTRATION
└─ POST /api/auth/register → Auto-login → Bootstrap

USER LOGIN
└─ POST /api/auth/login → Set token → Bootstrap

BOOTSTRAP (On Load)
├─ GET /api/user/me
├─ GET /api/niches
├─ GET /api/frameworks
├─ GET /api/models
├─ GET /api/graph/status
└─ GET /api/brands
    └─ GET /api/brands/:id/projects
        └─ GET /api/projects/:id/variants

CREATE BRAND
└─ POST /api/brands → Update state → Select brand

CREATE PROJECT
└─ POST /api/brands/:id/projects → Update state → Select project

GENERATE VARIANTS
└─ POST /api/projects/:id/generate → Update variants → Fetch graph insights

FAVORITE VARIANT
└─ POST /api/variants/:id/favorite → Update state

SUBMIT FEEDBACK
└─ POST /api/variants/:id/feedback → Refresh graph insights
```

### **❌ Unimplemented Flows:**

```
UPDATE BRAND
└─ PATCH /api/brands/:id ← NO UI

DELETE BRAND
└─ DELETE /api/brands/:id ← NO UI

UPDATE VARIANT
└─ PATCH /api/variants/:id ← NO UI

VIEW FEEDBACK HISTORY
└─ GET /api/variants/:id/feedback ← NO UI

REPLAY FROM GRAPH
└─ POST /api/graph/variants/:id/replay ← NO UI
```

---

## 5. Recommendations

### **Immediate Actions (Sprint 1):**

1. **Add Brand Settings Modal**
   - Edit button in brand selector
   - Form for name, audience, tone
   - Delete confirmation dialog
   - Estimated: 3-4 hours

2. **Add Variant Editor**
   - "Edit" button in variant card
   - Inline contenteditable fields
   - Save/Cancel buttons
   - Estimated: 2-3 hours

3. **Add Feedback History Viewer**
   - "View history" link in variant card
   - Modal showing all feedback with timestamps
   - Rating visualization
   - Estimated: 2 hours

### **Future Enhancements (Sprint 2):**

4. **Project Management UI**
   - Backend routes first: `PATCH /api/projects/:id`, `DELETE /api/projects/:id`
   - Settings dropdown in project selector
   - Estimated: 4-5 hours

5. **Graph Replay Feature**
   - Button in variant card when graph enabled
   - "Regenerate with context" action
   - Estimated: 2 hours

6. **Usage Analytics Dashboard**
   - Replace simple progress bar
   - Chart.js integration
   - Model usage breakdown
   - Estimated: 4-6 hours

---

## 6. Testing Coverage Gaps

Current backend tests: **74 tests** across 11 suites  
Frontend tests: **0 tests** ❌

**Recommended Frontend Tests:**
- Component rendering tests (React-lite components)
- API integration tests (mocked fetch)
- User flow tests (login → create brand → generate)
- Form validation tests

**Tool:** Jest + @testing-library/react (or vanilla JS equivalent)

---

## 7. Conclusion

**Summary:**
- ✅ **Core user journey:** 100% functional
- ⚠️ **CRUD operations:** 60% complete (missing updates/deletes)
- ❌ **Advanced features:** 40% complete (missing editor, analytics)

**Impact:**
- Users can use CopyShark effectively for copy generation
- Users **cannot** edit or delete entities once created
- Power users lack advanced workflow tools

**Next Steps:**
1. Prioritize brand/variant editors (highest user impact)
2. Add feedback history viewer (closes graph feedback loop)
3. Consider project management routes
4. Add frontend test coverage

**Alignment Score: 7/10** ⭐⭐⭐⭐⭐⭐⭐☆☆☆

The system is production-ready for core workflows but needs CRUD completion for full feature parity.
