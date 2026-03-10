# Production Planning Module - Frontend Implementation Plan

> **Important:** The backend API models each Production Plan as a **single finished good**
> (1 plan = 1 item + weekly breakdown + daily entries). The Excel-like multi-item view
> is achieved by listing all plans for a given month on the dashboard.

---

## Module Structure

```
src/modules/production/
  planning/
    pages/
      PlanningDashboardPage.tsx        ← Page 1
      CreatePlanPage.tsx               ← Page 2
      PlanDetailPage.tsx               ← Page 3
    components/
      PlanStatusBadge.tsx
      SAPPostingBadge.tsx
      WeeklyPlanSection.tsx
      WeeklyPlanForm.tsx
      DailyEntrySection.tsx
      DailyEntryForm.tsx
      MaterialsSection.tsx
      PlanSummaryCards.tsx
      ItemSearchSelect.tsx
    api/
      planning.api.ts
      planning.queries.ts
    types/
      planning.types.ts
    schemas/
      planning.schema.ts
    constants/
      planning.constants.ts
    hooks/
      usePlanActions.ts
    module.config.tsx
```

---

## Shared / Config Files (Setup - before any page)

### S1. Types (`planning.types.ts`)
- PlanStatus, SAPPostingStatus, WeeklyPlanStatus, Shift enums
- ProductionPlan (list item shape)
- ProductionPlanDetail (full detail with nested weekly_plans + materials)
- WeeklyPlan, DailyProductionEntry
- PlanMaterial
- CreatePlanRequest, UpdatePlanRequest
- CreateWeeklyPlanRequest, UpdateWeeklyPlanRequest
- CreateDailyEntryRequest, UpdateDailyEntryRequest
- PostToSAPResponse, ClosePlanResponse
- PlanSummary (dashboard summary)
- Dropdown types: ItemDropdown, UoMDropdown, WarehouseDropdown

### S2. Constants (`planning.constants.ts`)
- Status label/color mappings (reuse StatusColorConfig pattern)
- SAP posting status label/color mappings

### S3. API Layer (`planning.api.ts`)
- planningApi object with all endpoint methods
- Add endpoints to api.constants.ts under PRODUCTION_PLANNING section

### S4. React Query Hooks (`planning.queries.ts`)
- PLANNING_QUERY_KEYS factory
- usePlans(status?, month?) - list
- usePlanDetail(planId) - detail
- usePlanSummary(month?) - dashboard summary
- useWeeklyPlans(planId) - weekly list
- useDailyEntries(weekId) - daily entries
- useItemsDropdown(type?, search?) - SAP items
- useUoMDropdown() - units
- useWarehousesDropdown() - warehouses
- Mutations: useCreatePlan, useUpdatePlan, useDeletePlan, usePostToSAP, useClosePlan
- Mutations: useCreateWeeklyPlan, useUpdateWeeklyPlan, useDeleteWeeklyPlan
- Mutations: useCreateDailyEntry, useUpdateDailyEntry

### S5. Zod Schemas (`planning.schema.ts`)
- createPlanSchema, updatePlanSchema
- createWeeklyPlanSchema, updateWeeklyPlanSchema
- createDailyEntrySchema

### S6. Permissions (`src/config/permissions/production.permissions.ts`)
- PRODUCTION_PERMISSIONS object with all permission strings
- Add to permissions/index.ts

### S7. Module Config (`module.config.tsx`)
- Route definitions with lazy-loaded pages
- Navigation items for sidebar
- Register in src/app/registry/index.ts

### S8. API Endpoints (`api.constants.ts` update)
- Add PRODUCTION_PLANNING section with all endpoint paths

---

## Page 1: Planning Dashboard (`PlanningDashboardPage.tsx`)

**Route:** `/production/planning`

**What it shows:**
- Summary cards at top (from /summary/ endpoint)
  - Total Plans | Total Planned Qty | Total Produced Qty | Overall Progress %
  - Status breakdown badges (DRAFT count, OPEN count, IN_PROGRESS count, etc.)
  - SAP Failed count as warning badge (if > 0)
- Month filter (month/year picker, defaults to current month)
- Plans table listing all production plans for selected month

**Table columns:**
| Column | Source Field | Notes |
|--------|-------------|-------|
| Item Code | item_code | Monospace font |
| Item Name | item_name | Main identifier |
| UoM | uom | |
| Warehouse | warehouse_code | |
| Planned Qty | planned_qty | Formatted number |
| Produced Qty | completed_qty | Formatted number |
| Progress | progress_percent | Progress bar |
| Status | status | PlanStatusBadge component |
| SAP Status | sap_posting_status | SAPPostingBadge component |
| Dates | target_start_date - due_date | Date range |
| Actions | - | View detail, Edit (DRAFT only), Delete (DRAFT only) |

**Actions:**
- "+ Create Plan" button (top right, requires can_create_production_plan)
- Click row → navigate to PlanDetailPage
- Status filter tabs or dropdown (ALL, DRAFT, OPEN, IN_PROGRESS, COMPLETED)

**Components needed:**
- PlanSummaryCards
- PlanStatusBadge
- SAPPostingBadge

**API calls:**
- GET /api/v1/production-planning/summary/?month=YYYY-MM
- GET /api/v1/production-planning/?month=YYYY-MM&status=<filter>

---

## Page 2: Create Plan (`CreatePlanPage.tsx`)

**Route:** `/production/planning/create`

**What it shows:**
A form to create a new production plan (single item).

**Form fields:**

| Field | Type | Source | Required |
|-------|------|--------|----------|
| Item | SearchableSelect | GET /dropdown/items/?type=finished | Yes |
| UoM | Auto-filled from item selection, or manual select | GET /dropdown/uom/ | No |
| Warehouse | Select dropdown | GET /dropdown/warehouses/ | No |
| Planned Qty | Number input | User | Yes |
| Start Date | Date picker | User | Yes |
| Due Date | Date picker | User (must be >= start date) | Yes |
| Branch ID | Hidden or select (from env config) | Config | No |
| Remarks | Textarea | User | No |

**Materials Section (BOM - optional):**
- "Add Material" button opens inline row
- Each material row: Item search (type=raw), Qty, UoM, Warehouse, Remove button
- Can add multiple materials

**Behavior:**
1. Load all 3 dropdowns in parallel on mount
2. When user selects a finished good → auto-fill UoM from item.uom
3. Date picker for due_date restricts to >= target_start_date
4. On submit → POST /api/v1/production-planning/ → redirect to plan detail on 201
5. Show field-level validation errors from 400 response

**Components needed:**
- ItemSearchSelect (async search with debounce)
- MaterialsSection (add/remove material rows)

**API calls:**
- GET /dropdown/items/?type=finished&search=<query>
- GET /dropdown/uom/
- GET /dropdown/warehouses/
- GET /dropdown/items/?type=raw&search=<query> (for materials)
- POST /api/v1/production-planning/

---

## Page 3: Plan Detail (`PlanDetailPage.tsx`)

**Route:** `/production/planning/:planId`

**This is the most complex page. It shows the full plan with all sub-sections.**

### Section A: Plan Header
- Item code + Item name (large)
- Status badges: PlanStatusBadge + SAPPostingBadge
- Key info: Warehouse, UoM, Dates, Planned Qty, Produced Qty
- Overall progress bar (progress_percent)
- Remarks (if any)

**Action buttons (conditional per status - see button visibility matrix):**
| Button | Condition |
|--------|-----------|
| Edit Plan | status === 'DRAFT' |
| Delete Plan | status === 'DRAFT' |
| Post to SAP | sap_posting_status !== 'POSTED' && (status === 'DRAFT' or 'OPEN') |
| Close Plan | status not in ['CLOSED', 'CANCELLED', 'COMPLETED'] |

**SAP error banner:** Show when sap_posting_status === 'FAILED' with sap_error_message

### Section B: Materials (BOM)
- Table showing materials: Component Code, Name, Required Qty, UoM, Warehouse
- "Add Material" button (when plan is DRAFT/OPEN/IN_PROGRESS)
- Delete material button per row (DRAFT only)

### Section C: Weekly Plans
- 4 cards/rows showing each week's plan
- Each shows: Week label, Date range, Target Qty, Produced Qty, Progress bar, Status badge
- "Add Week" button (when status is OPEN or IN_PROGRESS)
- Edit target_qty inline or via modal
- Delete week (only if no daily entries)
- Click week → expands to show daily entries (Section D)

**Weekly plan form fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Week Number | Auto-suggested (existing + 1) | Yes | |
| Week Label | Text input | No | e.g., "Week 1" |
| Start Date | Date picker | Yes | Within plan date range |
| End Date | Date picker | Yes | >= start_date, within plan range |
| Target Qty | Number input | Yes | Remaining = planned_qty - sum(other weeks) shown |

### Section D: Daily Production Entries (per week)
- Table within expanded week section
- Columns: Date, Produced Qty, Shift, Remarks, Recorded By, Actions
- "Add Entry" button (when plan not closed/cancelled/completed)
- Edit entry (qty and remarks only)

**Daily entry form fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Production Date | Date picker | Yes | Within week range, not future |
| Produced Qty | Number input | Yes | > 0 |
| Shift | Select (Morning/Afternoon/Night/None) | No | Optional |
| Remarks | Text input | No | |

### Phase 2 Placeholder
- Small banner/chip: "Version history & plan comparison — coming soon"

**Components needed:**
- WeeklyPlanSection (list of weeks with expand/collapse)
- WeeklyPlanForm (create/edit weekly plan)
- DailyEntrySection (table of daily entries within a week)
- DailyEntryForm (create/edit daily entry)
- MaterialsSection (reuse from create page, with view-only mode)

**API calls:**
- GET /api/v1/production-planning/:planId/ (loads everything: plan + materials + weekly_plans)
- POST /:planId/post-to-sap/
- POST /:planId/close/
- PATCH /:planId/ (edit DRAFT)
- DELETE /:planId/ (delete DRAFT)
- POST /:planId/materials/
- DELETE /:planId/materials/:materialId/
- POST /:planId/weekly-plans/
- PATCH /:planId/weekly-plans/:weekId/
- DELETE /:planId/weekly-plans/:weekId/
- GET /weekly-plans/:weekId/daily-entries/
- POST /weekly-plans/:weekId/daily-entries/
- PATCH /weekly-plans/:weekId/daily-entries/:entryId/

---

## Implementation Order

```
Phase 0: Setup (S1-S8)
  ├── S1. Types
  ├── S2. Constants
  ├── S3. API layer + S8. Endpoints in api.constants.ts
  ├── S4. React Query hooks
  ├── S5. Zod schemas
  ├── S6. Permissions
  └── S7. Module config + registry

Phase 1: Page 1 - Planning Dashboard
  ├── PlanStatusBadge component
  ├── SAPPostingBadge component
  ├── PlanSummaryCards component
  └── PlanningDashboardPage (table + summary + filters)

Phase 2: Page 2 - Create Plan
  ├── ItemSearchSelect component
  ├── MaterialsSection component
  └── CreatePlanPage (form + validation + submit)

Phase 3: Page 3 - Plan Detail
  ├── WeeklyPlanSection + WeeklyPlanForm components
  ├── DailyEntrySection + DailyEntryForm components
  ├── Plan header with action buttons
  └── PlanDetailPage (full page assembly)
```

Each phase is self-contained and testable. We build the dashboard first so we can see
plans immediately, then create, then the full detail view with weekly/daily management.
