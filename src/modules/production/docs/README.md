# Production Module

Manages the full production lifecycle — from planning what to produce to executing runs on the factory floor.

## Sub-Modules

| Sub-Module | Path | Purpose |
|------------|------|---------|
| Planning | `production/planning/` | Create and manage production plans, BOM, weekly/daily breakdowns |
| Execution | `production/execution/` | Run production on lines, log output, track breakdowns and waste |

## Structure

```
production/
├── module.config.tsx              # Routes and navigation for both sub-modules
├── planning/
│   ├── api/                       # planning.api.ts, planning.queries.ts
│   ├── components/                # PlanForm, BulkImport, WeeklyPlanView, etc.
│   ├── constants/                 # Status colors, labels, icons
│   ├── hooks/
│   ├── pages/
│   │   ├── PlanningDashboard.tsx  # Main planning view with filters
│   │   └── BulkImportPage.tsx     # CSV/bulk plan creation
│   ├── schemas/                   # Zod validation for plan forms
│   └── types/
│       └── planning.types.ts      # ProductionPlan, WeeklyPlan, DailyEntry, BOMComponent
├── execution/
│   ├── api/                       # execution.api.ts, execution.queries.ts
│   ├── components/                # 24 components (RunForm, LogTable, BreakdownForm, etc.)
│   ├── constants/                 # Run status, machine status, breakdown type configs
│   ├── hooks/
│   ├── pages/
│   │   ├── ExecutionDashboard.tsx  # Card-based navigation to sub-features
│   │   ├── StartRun.tsx            # Create/start production run
│   │   ├── RunDetail.tsx           # Full run view with logs, breakdowns, materials
│   │   ├── YieldReport.tsx         # Material usage tracking
│   │   ├── LineClearanceList.tsx   # Clearance records list
│   │   ├── LineClearanceForm.tsx   # Create/edit clearance
│   │   ├── MachineChecklist.tsx    # Pre-run machine checks
│   │   ├── BreakdownLog.tsx        # Machine breakdown tracking
│   │   ├── WasteManagement.tsx     # Waste recording with approval workflow
│   │   ├── Reports.tsx             # Analytics and reporting
│   │   └── DailyProductionReport.tsx
│   ├── schemas/                    # 8 Zod schemas for execution forms
│   └── types/
│       └── execution.types.ts      # ProductionRun, Machine, Breakdown, Clearance, Waste
└── docs/
    └── README.md                   # This file
```

## Key Patterns

### Planning → Execution Flow

1. **Plan** created with item, BOM materials, target quantity, and date range
2. Plan broken into **weekly plans** with target quantities
3. Weekly plans broken into **daily entries** tracking actual production
4. Plan posted to **SAP** when finalized
5. **Production runs** execute the plan on a specific line
6. Run tracks hourly logs, breakdowns, materials, manpower, and waste

### Production Run Lifecycle

```
StartRun → Line Clearance → Machine Checklist → Hourly Logging → Complete Run
                                                      │
                                            ├── Breakdown Logs
                                            ├── Material Usage (Yield)
                                            ├── Manpower Records
                                            └── Waste Management
```

### API Pattern

Both sub-modules follow the standard pattern:
- `{feature}.api.ts` — Axios calls using `API_ENDPOINTS.PRODUCTION_PLANNING` / `PRODUCTION_EXECUTION`
- `{feature}.queries.ts` — React Query hooks with `PLANNING_QUERY_KEYS` / `EXECUTION_QUERY_KEYS`

### Status Types

**Plan:** `DRAFT` → `OPEN` → `IN_PROGRESS` → `COMPLETED` → `CLOSED` | `CANCELLED`

**Run:** `DRAFT` → `IN_PROGRESS` → `COMPLETED`

**Clearance:** `DRAFT` → `SUBMITTED` → `CLEARED` | `NOT_CLEARED`

**Waste:** `PENDING` → `PARTIALLY_APPROVED` → `FULLY_APPROVED` (4-level approval chain)

## Dependencies

- `@/config/constants` — Status constants, API endpoints
- `@/shared/components` — UI primitives, DashboardHeader
- `@/core/api` — API client
- `@/core/auth` — Permission hooks
- No cross-module imports

## Related Documentation

- [Production Module (central)](../../../docs/modules/production.md)
- [API Endpoints](../../../docs/api/endpoints.md#production-planning)
- [Data Models](../../../docs/architecture/data-models.md)
