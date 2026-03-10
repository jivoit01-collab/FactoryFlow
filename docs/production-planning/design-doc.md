# Production Planning Module - Design Document

> Sub-module of: **Production**
> Module path: `src/modules/production/planning/`

---

## 1. Overview

The Production Planning module replaces the Excel-based monthly production planning workflow. Head Office (HO) creates monthly production plans by selecting SKUs from SAP and assigning target quantities. The system auto-divides monthly targets into 4 weekly buckets. Factory teams receive the plan and can adjust weekly quantities based on available raw materials.

---

## 2. User Roles & Permissions

| Role | Can Create Plan | Can Set Monthly Qty | Can Edit Weekly Qty | Can View Plan |
|------|----------------|--------------------|--------------------|---------------|
| HO User | Yes | Yes | Yes | Yes |
| Factory User | No | No | Yes | Yes |

**Permissions (Django format):**
- `production.can_create_plan` - Create new monthly plan
- `production.can_edit_monthly_qty` - Set/edit monthly target quantity
- `production.can_edit_weekly_qty` - Edit weekly breakdown quantities
- `production.can_view_plan` - View production plans

---

## 3. Data Model

### 3.1 Production Plan (Header)

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | UUID | System | Primary key |
| month | integer (1-12) | User input | Planning month |
| year | integer | User input | Planning year |
| status | enum | System | DRAFT, PUBLISHED |
| created_by | FK(User) | System | HO user who created |
| created_at | datetime | System | Creation timestamp |
| updated_at | datetime | System | Last modification |
| version | integer | System | Plan version (Phase 2) |

### 3.2 Plan Line Item

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | UUID | System | Primary key |
| plan_id | FK(Plan) | System | Parent plan |
| item_code | string | SAP | e.g., "FG0000011" |
| brand | string | SAP | e.g., "JIVO", "SANO", "SO OLIVE" |
| head | string | SAP | "COMMODITY", "PREMIUM", "OTHER PREMIUM" |
| category | string | SAP | e.g., "MUSTARD", "SUNFLOWER" |
| sub_category | string | SAP | e.g., "JIVO MUSTARD" |
| sku_name | string | SAP | Full SKU description |
| unit | string | SAP | Unit of measure text |
| per_ltrs | decimal | SAP | Per litres value |
| ltrs_per_box | decimal | SAP | Litres per box |
| case_pack | integer | SAP | Cases per pack |
| monthly_qty | integer | User | Total monthly target |
| week1_qty | integer | Auto/User | Week 1 quantity |
| week2_qty | integer | Auto/User | Week 2 quantity |
| week3_qty | integer | Auto/User | Week 3 quantity |
| week4_qty | integer | Auto/User | Week 4 quantity |

**Constraint:** `week1_qty + week2_qty + week3_qty + week4_qty = monthly_qty`

### 3.3 Weekly Auto-Division Logic

When monthly_qty is set:
- Base amount per week: `Math.floor(monthly_qty / 4)`
- Remainder: `monthly_qty % 4`
- Remainder distributed to weeks 1 through N (1 extra unit each)

When a week's qty is manually edited:
- Remaining qty = `monthly_qty - edited_week_qty`
- Remaining qty is re-divided equally among the other 3 weeks
- If multiple weeks are manually locked, remaining is divided among unlocked weeks

---

## 4. Pages & Routes

### 4.1 Route Structure

```
/production/planning                    - Plan list (dashboard)
/production/planning/create             - Create new plan
/production/planning/:planId            - View/edit plan detail
```

### 4.2 Pages

#### A. Planning Dashboard (`PlanningDashboardPage`)
- List of all production plans (table view)
- Columns: Month/Year, Status, Total SKUs, Total Monthly Qty, Created By, Created At
- Actions: Create New Plan, View/Edit existing plan
- Default sort: newest first

#### B. Create Plan (`CreatePlanPage`)
- Step 1: Select month and year
- Step 2: Search and add SKU items from SAP
  - Searchable dropdown/modal to find items by code, name, category
  - Bulk add support (select multiple items at once)
  - Items load with SAP master data pre-filled (code, brand, head, category, sub_category, sku_name, unit, per_ltrs, ltrs_per_box, case_pack)
- Step 3: Set monthly quantities and review weekly auto-split
- Action: Publish (sends to factory)

#### C. Plan Detail (`PlanDetailPage`)
- Full plan view in an editable table (same structure as the Excel sheet)
- **Table columns:**
  - CODE | BRAND | HEAD | CATEGORY | SUB-CATEGORY | SKU | PER LTRS | LTRS/BOX | CASE PACK | MONTHLY QTY | WEEK 1 | WEEK 2 | WEEK 3 | WEEK 4
- **HO users:** Can edit monthly qty and all week columns
- **Factory users:** Can only edit week columns (weekly redistribution)
- Row totals shown in a summary row at top (like current Excel Row 1)
- Auto-recalculation on any edit
- Save action persists changes

---

## 5. UI Components

### 5.1 Shared Components (from existing)
- `Button`, `Input`, `Card`, `Badge` (shadcn/ui)
- `SearchableSelect` (for item search)
- `SummaryCard` (for dashboard stats)

### 5.2 New Components Needed

| Component | Purpose |
|-----------|---------|
| `PlanningTable` | Main editable table with inline editing for quantities |
| `SKUSearchModal` | Dialog to search/select SAP items for the plan |
| `WeeklyBreakdownCell` | Editable cell with auto-recalculation logic |
| `PlanSummaryRow` | Sticky top row showing column totals |
| `MonthYearPicker` | Month and year selector for plan creation |
| `PlanStatusBadge` | Status badge (DRAFT / PUBLISHED) |
| `VersionIndicator` | Shows current version with "History coming soon" tooltip (Phase 2 placeholder) |

### 5.3 Table Behavior
- **Inline editing:** Click a quantity cell to edit, Tab/Enter to move to next
- **Auto-recalculation:** When a weekly qty changes, other weeks auto-adjust to maintain monthly total
- **Visual indicator:** Manually edited cells get a subtle highlight to distinguish from auto-calculated
- **Summary row:** Pinned at top, shows sum of each numeric column
- **Sticky columns:** CODE and SKU columns stay visible when scrolling horizontally
- **Row highlighting:** Alternate row colors matching the Excel (HEAD-based color coding: COMMODITY=white, PREMIUM=yellow, OTHER PREMIUM=green)

---

## 6. API Endpoints

```
GET    /api/v1/production/plans/                    - List plans
POST   /api/v1/production/plans/                    - Create plan
GET    /api/v1/production/plans/:id/                - Get plan detail with line items
PATCH  /api/v1/production/plans/:id/                - Update plan (status, etc.)
POST   /api/v1/production/plans/:id/items/          - Add items to plan
PATCH  /api/v1/production/plans/:id/items/:itemId/  - Update item quantities
DELETE /api/v1/production/plans/:id/items/:itemId/  - Remove item from plan

GET    /api/v1/sap/finished-goods/                  - Search SAP finished goods (for SKU selection)
```

---

## 7. State Management

### Redux Slice: `productionPlanSlice`
- Current plan being edited (optimistic inline edits)
- Unsaved changes tracking

### React Query Keys
```
['production', 'plans']                  - Plan list
['production', 'plans', planId]          - Plan detail
['sap', 'finished-goods']               - SAP item search
```

---

## 8. Phase 2 (Future Enhancements)

The following features are planned for Phase 2 and should have UI placeholders:

- **Plan Versioning:** Track revision history, compare versions, rollback
- **Filtering & Grouping:** Filter plan table by Brand, Head, Category; group rows
- **SAP Auto-Calculation:** SAP integration to auto-calculate SKU quantities based on total production target
- **Export to Excel:** Download plan as Excel for offline reference
- **Audit Trail:** Track who changed what and when
- **Plan Templates:** Save frequently used SKU sets as reusable templates

---

## 9. Technical Notes

### Follows existing project conventions:
- Module structure: `src/modules/production/planning/`
  - `pages/` - Page components
  - `components/` - Module-specific components
  - `api/` - API functions + React Query hooks
  - `types/` - TypeScript interfaces
  - `schemas/` - Zod validation schemas
  - `constants/` - Module constants
  - `hooks/` - Custom hooks
  - `module.config.tsx` - Module registration
- Form validation: Zod + React Hook Form
- API layer: Axios + React Query (TanStack)
- Permissions: Django-format permission strings
- UI: Shadcn/ui + Tailwind CSS
- State: Redux Toolkit for local edits, React Query for server state
