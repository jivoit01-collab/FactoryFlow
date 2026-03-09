# Code Structure Report — Production Module

> Generated: 2026-03-09
> Scope: Organizational issues in the production module file structure

---

## 1. Execution Folder Contains 6 Submodules in 1 Folder

**Current Structure:**
```
src/modules/production/
├── pages/                          # 1 page (ProductionDashboardPage)
├── module.config.tsx               # All routes (planning + execution)
├── planning/                       # 1 submodule: Planning
│   ├── api/ (2 files)
│   ├── components/ (5 files)
│   ├── constants/ (2 files)
│   ├── pages/ (4 pages)
│   ├── schemas/ (2 files)
│   └── types/ (2 files)
└── execution/                      # 6+ submodules crammed together
    ├── api/ (3 files)
    ├── components/ (24 files!)
    ├── constants/ (2 files)
    ├── pages/ (11 pages!)
    ├── schemas/ (2 files)
    └── types/ (2 files)
```

**Problem:** The `execution/` folder handles 6 distinct functional areas:
1. **Production Runs** — Run creation, detail, hourly logging
2. **Line Clearance** — Pre-production clearance workflow
3. **Machine Checklists** — Monthly maintenance tracking
4. **Breakdowns** — Machine breakdown logging
5. **Waste Management** — Waste tracking + approval workflow
6. **Yield/Reports** — Material consumption, analytics, daily reports

All 24 components and 11 pages live in a single flat folder, making navigation difficult.

---

## 2. Recommended Restructure Options

### Option A: Split Into Sub-Folders (Minimal Change)

Keep `execution/` but add sub-grouping:

```
src/modules/production/execution/
├── api/                            # Shared API layer (keep as-is)
├── types/                          # Shared types (keep as-is)
├── constants/                      # Shared constants (keep as-is)
├── schemas/                        # Shared schemas (keep as-is)
├── components/
│   ├── runs/                       # RunCard, RunSummaryCards, HourlyProductionGrid, etc.
│   ├── clearance/                  # ClearanceStatusBadge, ClearanceChecklistTable, etc.
│   ├── checklists/                 # FrequencyTabs, ChecklistCalendarGrid, etc.
│   ├── breakdowns/                 # BreakdownTable, BreakdownTimeline, BreakdownFormDialog
│   ├── waste/                      # WasteLogTable, WasteApprovalTimeline, WasteApprovalDialog
│   ├── yield/                      # MachineTimeTable, MaterialConsumptionTable, BatchTabs
│   └── shared/                     # ProductionStatusBadge, MachineStatusDot, SignatureBlock, ManpowerSection
│
└── pages/                          # Keep flat (11 pages is manageable)
```

**Pros:** Minimal refactoring, just move component files into sub-folders.
**Cons:** API/types/schemas still shared — finding what belongs to what is unclear.

### Option B: Promote to Sibling Submodules (More Structured)

```
src/modules/production/
├── pages/
├── module.config.tsx
├── planning/                       # As-is
├── execution/                      # Core run management only
│   ├── api/
│   ├── components/
│   ├── pages/ (ExecutionDashboard, StartRun, RunDetail)
│   ├── types/
│   └── schemas/
├── clearance/                      # Line clearance submodule
│   ├── components/
│   ├── pages/ (LineClearanceList, LineClearanceForm)
│   └── types/  (or import from execution)
├── checklists/                     # Machine maintenance
│   ├── components/
│   ├── pages/ (MachineChecklistPage)
│   └── types/
├── breakdowns/                     # Breakdown logging
│   ├── components/
│   ├── pages/ (BreakdownLogPage)
│   └── types/
├── waste/                          # Waste management
│   ├── components/
│   ├── pages/ (WasteManagementPage)
│   └── types/
└── reports/                        # Reports & analytics
    ├── components/
    ├── pages/ (ReportsPage, DailyProductionReport, YieldReport)
    └── types/
```

**Pros:** Each concern is isolated. Matches the sidebar navigation structure perfectly.
**Cons:** Significant refactoring. Shared types/API need to be in a common location. More import paths to manage.

---

## 3. Component Count by Domain

Current component-to-domain mapping (all in one flat `components/` folder):

| Domain | Components | Files |
|--------|-----------|-------|
| **Runs** | RunCard, RunSummaryCards, HourlyProductionGrid, ManpowerSection | 4 |
| **Status/Shared** | ProductionStatusBadge, MachineStatusDot, MachineStatusSelect, SignatureBlock | 4 |
| **Clearance** | ClearanceStatusBadge, ClearanceChecklistTable, ClearanceAuthorizationSection, ClearanceDecision | 4 |
| **Breakdowns** | BreakdownTable, BreakdownTimeline, BreakdownFormDialog | 3 |
| **Yield** | MachineTimeTable, MaterialConsumptionTable, BatchTabs | 3 |
| **Checklists** | FrequencyTabs, ChecklistCalendarGrid, ChecklistCellPopover | 3 |
| **Waste** | WasteLogTable, WasteApprovalTimeline, WasteApprovalDialog | 3 |
| **Total** | | **24** |

---

## 4. Query Hooks Concentration

`execution.queries.ts` contains **35+ hooks** in a single file (~600+ lines). Consider splitting by domain:

```
api/
├── execution.api.ts              # Raw API methods (keep as-is)
├── queries/
│   ├── runs.queries.ts           # useProductionRuns, useRunDetail, useCreateRun, etc.
│   ├── clearance.queries.ts      # useClearanceList, useClearanceDetail, etc.
│   ├── checklist.queries.ts      # useChecklistTemplates, useChecklistEntries, etc.
│   ├── breakdown.queries.ts      # useCreateBreakdown, useUpdateBreakdown, etc.
│   ├── waste.queries.ts          # useWasteLogs, useCreateWasteLog, etc.
│   ├── reports.queries.ts        # useDailyProductionReport, useAnalytics, etc.
│   └── index.ts                  # Re-export all
└── index.ts
```

---

## 5. Schema File

`execution.schema.ts` contains 8 Zod schemas for all domains in one file. Same split recommendation applies.

---

## 6. Other Structural Observations

### Planning has proper structure for its scale
- 4 pages, 5 components, own api/types/schemas — well organized for a single-concern module.

### module.config.tsx handles ALL routes
- 30+ routes in one file. This is fine for now but will grow. If Option B is chosen, each submodule could export its own route fragment.

### Navigation structure already reflects the split
The sidebar navigation in `module.config.tsx:160-195` already has 7 separate menu items:
- Planning
- Execution
- Line Clearance
- Machine Checklists
- Breakdowns
- Waste Management
- Reports

This confirms that conceptually these are treated as separate concerns, even though the code puts 6 of them in one folder.

---

## 7. Recommendation

**Short term:** Option A (sub-folder components). Low risk, immediate readability improvement.

**Medium term:** Option B if the module keeps growing (e.g., adding QC inspection, packaging tracking, etc.). Do this as a dedicated refactoring effort, not mixed with feature work.

**Immediate wins (no restructuring needed):**
1. Split `execution.queries.ts` into domain-specific files
2. Group components into sub-folders
3. Both are backwards-compatible since barrel `index.ts` files can re-export everything
