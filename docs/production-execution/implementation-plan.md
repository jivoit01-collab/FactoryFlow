# Production Execution Module - Frontend Implementation Plan

> **Important:** The Production Execution module sits alongside Production Planning.
> Production Planning creates the orders; Execution handles everything from line clearance
> through hourly logging, material tracking, and report generation.
> Module path: `src/modules/production/execution/`

---

## Module Structure

```
src/modules/production/
  execution/
    pages/
      ExecutionDashboardPage.tsx           <- Page 1: Overview
      StartRunPage.tsx                     <- Page 2: Start production run
      RunDetailPage.tsx                    <- Page 3: Hourly entry (Daily Production Report)
      YieldReportPage.tsx                  <- Page 4: Material & machine time
      LineClearanceListPage.tsx            <- Page 5a: Line clearance list
      LineClearanceFormPage.tsx            <- Page 5b: Create/edit clearance
      MachineChecklistPage.tsx             <- Page 6: Calendar checklist view
      BreakdownLogPage.tsx                 <- Page 7: Breakdown log
      WasteManagementPage.tsx              <- Page 8: Waste log & approval
      ReportsPage.tsx                      <- Page 9: Reports dashboard
      DailyProductionReportPage.tsx        <- Page 9b: Print view
    components/
      # Production Run
      RunCard.tsx                          # Active run card for dashboard
      RunSummaryCards.tsx                  # Summary metrics (production, breakdown, efficiency)
      HourlyProductionGrid.tsx            # Main editable hourly table
      HourlyProductionRow.tsx             # Single time slot row
      MachineStatusSelect.tsx             # Dropdown with colored dot
      RunTabBar.tsx                       # Run 1 / Run 2 / Run 3 tabs
      SignatureBlock.tsx                  # Reusable signature component

      # Line Clearance
      ClearanceChecklistTable.tsx         # Checklist with YES/NO/NA radios
      ClearanceDecision.tsx               # Cleared / Not Cleared radio cards
      ClearanceAuthorizationSection.tsx   # Supervisor + Incharge + QA signatures

      # Yield / Materials
      MaterialConsumptionTable.tsx        # Opening/Issue/Closing/Wastage table
      MachineTimeTable.tsx                # Machine runtime table
      BatchTabs.tsx                       # Batch 1 / 2 / 3 tabs

      # Breakdowns
      BreakdownTable.tsx                  # Breakdown list table
      BreakdownForm.tsx                   # Add/edit breakdown modal
      BreakdownTimeline.tsx               # Visual timeline bar

      # Machine Checklists
      ChecklistCalendarGrid.tsx           # Monthly calendar grid
      ChecklistCellPopover.tsx            # OK/Not OK/NA popover
      FrequencyTabs.tsx                   # Daily / Weekly / Monthly tabs

      # Waste
      WasteLogTable.tsx                   # Waste log with approval columns
      WasteApprovalTimeline.tsx           # Vertical approval flow
      WasteApprovalDialog.tsx             # Approve/Reject confirmation

      # Manpower
      ManpowerSection.tsx                 # Shift cards for manpower
      ManpowerCard.tsx                    # Single shift card

      # Reports
      ReportCard.tsx                      # Report type selection card
      AnalyticsCards.tsx                  # OEE, efficiency, material loss, downtime
      PrintableReport.tsx                 # Print-formatted report wrapper

      # Shared
      ProductionStatusBadge.tsx           # Run status badge
      MachineStatusDot.tsx                # Green/Red/Gray/Amber dot indicator

    api/
      execution.api.ts                    # All API calls
      execution.queries.ts                # React Query hooks
    types/
      execution.types.ts                  # Full type definitions
    schemas/
      execution.schema.ts                 # Zod validation schemas
    constants/
      execution.constants.ts              # Status mappings, time slots, machine types
    hooks/
      useAutoCalculations.ts              # Production metrics auto-calc
      useHourlyGrid.ts                    # Hourly grid state management
      useApprovalFlow.ts                  # Waste approval workflow
    module.config.tsx                     # Routes & navigation config
```

---

## Shared / Config Files (Setup - before any page)

### S1. Types (`execution.types.ts`)

```typescript
// Enums
type RunStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'
type MachineStatus = 'RUNNING' | 'IDLE' | 'BREAKDOWN' | 'CHANGEOVER'
type MachineType = 'FILLER' | 'CAPPER' | 'CONVEYOR' | 'LABELER' | 'CODING' | 'SHRINK_PACK' | 'STICKER_LABELER' | 'TAPPING_MACHINE'
type BreakdownType = 'LINE' | 'EXTERNAL'
type ClearanceResult = 'YES' | 'NO' | 'NA'
type ClearanceStatus = 'DRAFT' | 'SUBMITTED' | 'CLEARED' | 'NOT_CLEARED'
type ChecklistStatus = 'OK' | 'NOT_OK' | 'NA'
type ChecklistFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'
type WasteApprovalStatus = 'PENDING' | 'PARTIALLY_APPROVED' | 'FULLY_APPROVED'
type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT'

// Master Data
interface ProductionLine { id, name, description, is_active }
interface Machine { id, name, machine_type, line_id, is_active }
interface ChecklistTemplate { id, machine_type, task, frequency, sort_order }

// Production Run
interface ProductionRun { id, production_order_id, run_number, date, line_id, line_name, brand, pack, sap_order_no, rated_speed, total_production, total_minutes_pe, total_minutes_me, total_breakdown_time, line_breakdown_time, external_breakdown_time, unrecorded_time, status, created_by, created_at }
interface ProductionRunDetail extends ProductionRun { logs[], breakdowns[], materials[], machine_runtime[], manpower[], waste_logs[] }

// Hourly Log
interface ProductionLog { id, production_run_id, time_slot, time_start, time_end, produced_cases, machine_status, recd_minutes, breakdown_detail, remarks }

// Breakdown
interface MachineBreakdown { id, production_run_id, machine_id, machine_name, start_time, end_time, breakdown_minutes, type, is_unrecovered, reason, remarks }

// Material Usage
interface ProductionMaterialUsage { id, production_run_id, material_name, opening_qty, issued_qty, closing_qty, wastage_qty, uom, batch_number }

// Machine Runtime
interface MachineRuntime { id, production_run_id, machine_id, machine_type, runtime_minutes, downtime_minutes, remarks }

// Manpower
interface ProductionManpower { id, production_run_id, shift, worker_count, supervisor, engineer, remarks }

// Line Clearance
interface LineClearance { id, date, line_id, line_name, production_order_id, verified_by, qa_approved, qa_approved_by, status, document_id, created_at }
interface LineClearanceDetail extends LineClearance { checklist_items[] }
interface ClearanceChecklistItem { id, clearance_id, checkpoint, sort_order, result, remarks }

// Machine Checklist
interface MachineChecklistEntry { id, machine_id, machine_type, date, month, year, task_id, task_description, frequency, status, operator, shift_incharge, remarks }

// Waste
interface WasteLog { id, production_run_id, material_name, wastage_qty, uom, reason, engineer_sign, am_sign, store_sign, hod_sign, wastage_approval_status, created_at }

// Reports / Analytics
interface DailyProductionReport { date, runs[], total_production, total_breakdown, efficiency, ... }
interface AnalyticsData { oee, availability, performance, quality, line_efficiency, material_loss_pct, downtime_hours, production_vs_plan_pct }

// Dashboard Summary
interface ExecutionDashboardSummary { todays_production, active_runs, total_breakdown_minutes, line_efficiency, pending_clearances, pending_waste_approvals }

// Request types
interface CreateRunRequest { production_order_id, line_id, date, sap_order_no?, rated_speed, ... }
interface CreateLogRequest { time_slot, produced_cases, machine_status, recd_minutes, breakdown_detail?, remarks? }
interface CreateBreakdownRequest { machine_id, start_time, end_time, type, reason, is_unrecovered?, remarks? }
interface CreateMaterialUsageRequest { material_name, opening_qty, issued_qty, closing_qty, batch_number? }
interface CreateClearanceRequest { date, line_id, production_order_id, checklist_items[] }
interface CreateChecklistEntryRequest { machine_id, date, task_id, status, operator?, shift_incharge? }
interface CreateWasteLogRequest { production_run_id, material_name, wastage_qty, uom, reason }

// Dropdown types
interface LineDropdown { id, name }
interface MachineDropdown { id, name, machine_type, line_id }
```

### S2. Constants (`execution.constants.ts`)

```typescript
// Time slots for hourly production grid
TIME_SLOTS = [
  { slot: '07:00-08:00', start: '07:00', end: '08:00' },
  { slot: '08:00-09:00', start: '08:00', end: '09:00' },
  // ... through 18:00-19:00
]

// Machine types with labels
MACHINE_TYPES = { FILLER: 'Filler', CAPPER: 'Capper', ... }

// Standard materials for yield report
STANDARD_MATERIALS = ['Bottle', 'Cap', 'Front Label', 'Back Label', 'Tikki', 'Shrink', 'Carton']

// Status color configs (matching existing pattern)
RUN_STATUS_COLORS = { DRAFT: 'gray', IN_PROGRESS: 'amber', COMPLETED: 'green' }
MACHINE_STATUS_COLORS = { RUNNING: 'green', IDLE: 'gray', BREAKDOWN: 'red', CHANGEOVER: 'amber' }
CLEARANCE_STATUS_COLORS = { DRAFT: 'gray', SUBMITTED: 'blue', CLEARED: 'green', NOT_CLEARED: 'red' }
WASTE_APPROVAL_COLORS = { PENDING: 'amber', PARTIALLY_APPROVED: 'blue', FULLY_APPROVED: 'green' }

// Line clearance checklist items (standard)
LINE_CLEARANCE_CHECKPOINTS = [
  'Previous product, labels and packaging materials removed',
  'Machine/equipment cleaned and free from product residues',
  // ... all 9 items
]
```

### S3. API Layer (`execution.api.ts`)

- `executionApi` object with all endpoint methods grouped by domain
- Add endpoints to `api.constants.ts` under `PRODUCTION_EXECUTION` section

### S4. React Query Hooks (`execution.queries.ts`)

```
EXECUTION_QUERY_KEYS factory

// Dashboard
useExecutionDashboard() - summary data

// Runs
useProductionRuns(date?, lineId?, status?) - list
useRunDetail(runId) - full detail
useCreateRun, useUpdateRun, useCompleteRun - mutations

// Hourly Logs
useProductionLogs(runId) - list
useCreateLog, useUpdateLog - mutations
useBulkUpdateLogs(runId) - bulk save

// Breakdowns
useBreakdowns(runId) - list
useCreateBreakdown, useUpdateBreakdown, useDeleteBreakdown - mutations

// Materials
useMaterialUsage(runId) - list
useCreateMaterialUsage, useUpdateMaterialUsage - mutations

// Machine Runtime
useMachineRuntime(runId) - list
useCreateMachineRuntime, useUpdateMachineRuntime - mutations

// Manpower
useManpower(runId) - list
useCreateManpower, useUpdateManpower - mutations

// Line Clearance
useLineClearances(date?, lineId?) - list
useClearanceDetail(clearanceId) - detail
useCreateClearance, useUpdateClearance, useSubmitClearance, useApproveClearance - mutations

// Machine Checklists
useChecklistEntries(machineType?, lineId?, month?, year?) - calendar data
useChecklistTemplates(machineType?) - template list
useCreateChecklistEntry, useBulkUpdateChecklist - mutations

// Waste
useWasteLogs(runId?, status?) - list
useCreateWasteLog - mutation
useApproveWaste(role) - engineer/am/store/hod approval mutation

// Reports
useDailyProductionReport(date, lineId?) - report data
useYieldReport(runId) - yield data
useAnalytics(dateRange, lineId?) - analytics
useOEE(dateRange, lineId?) - OEE breakdown

// Dropdowns
useProductionLines() - lines
useMachines(lineId?, type?) - machines
```

### S5. Zod Schemas (`execution.schema.ts`)

```
createRunSchema - validated run creation
productionLogSchema - single hourly log entry
breakdownSchema - breakdown with time validation (end > start)
materialUsageSchema - material entry with qty validation
clearanceSchema - clearance with checklist items
checklistEntrySchema - single checklist cell
wasteLogSchema - waste entry
manpowerSchema - shift manpower
```

### S6. Permissions (`production.permissions.ts` update)

Add PRODUCTION_EXECUTION_PERMISSIONS with all permission strings from design doc.

### S7. Module Config (`module.config.tsx`)

- Route definitions with lazy-loaded pages
- Navigation items for sidebar under "Production" section
- Register in `src/app/registry/index.ts`

### S8. API Endpoints (`api.constants.ts` update)

Add `PRODUCTION_EXECUTION` section with all endpoint paths from design doc.

---

## Implementation Phases

### Phase 0: Setup (S1-S8)

Foundation work — types, constants, API layer, hooks, schemas, permissions, module config.

```
├── S1. Types (execution.types.ts)
├── S2. Constants (execution.constants.ts)
├── S3. API layer (execution.api.ts) + S8. Endpoints
├── S4. React Query hooks (execution.queries.ts)
├── S5. Zod schemas (execution.schema.ts)
├── S6. Permissions update
└── S7. Module config + registry
```

### Phase 1: Line Clearance (Pre-Production)

Build this first — it's a prerequisite for starting production.

```
├── ClearanceChecklistTable component
├── ClearanceDecision component
├── ClearanceAuthorizationSection component
├── LineClearanceListPage (list with filters)
└── LineClearanceFormPage (create/edit/submit/approve)
```

**API calls:**
- GET /line-clearance/ (list)
- POST /line-clearance/ (create)
- GET /line-clearance/:id/ (detail)
- PATCH /line-clearance/:id/ (update)
- POST /line-clearance/:id/submit/ (submit for QA)
- POST /line-clearance/:id/approve/ (QA approve)

### Phase 2: Production Run + Hourly Entry (Core)

The heart of the module — starting runs and logging hourly production.

```
├── RunCard, RunSummaryCards, ProductionStatusBadge components
├── HourlyProductionGrid + HourlyProductionRow components
├── MachineStatusSelect, MachineStatusDot components
├── RunTabBar component
├── SignatureBlock component (shared)
├── ManpowerSection + ManpowerCard components
├── ExecutionDashboardPage (overview with active runs)
├── StartRunPage (form with line clearance check)
└── RunDetailPage (hourly entry grid + summary + signatures)
```

**API calls:**
- GET /runs/ (list)
- POST /runs/ (start)
- GET /runs/:runId/ (detail with nested data)
- PATCH /runs/:runId/ (update)
- POST /runs/:runId/complete/ (complete)
- GET/POST/PATCH /runs/:runId/logs/ (hourly entries)
- GET/POST/PATCH /runs/:runId/manpower/ (manpower)

### Phase 3: Breakdowns

Breakdown logging attached to production runs.

```
├── BreakdownTable component
├── BreakdownForm component (modal)
├── BreakdownTimeline component (visual)
└── BreakdownLogPage (list + timeline + add/edit)
```

**API calls:**
- GET/POST/PATCH/DELETE /runs/:runId/breakdowns/

### Phase 4: Material Consumption & Yield Report

Material tracking and the yield report page.

```
├── MaterialConsumptionTable component
├── MachineTimeTable component
├── BatchTabs component
└── YieldReportPage (machine time + materials + signatures)
```

**API calls:**
- GET/POST/PATCH /runs/:runId/materials/
- GET/POST/PATCH /runs/:runId/machine-runtime/
- GET /reports/yield/:runId/

### Phase 5: Machine Checklists

Calendar-based maintenance checklists.

```
├── ChecklistCalendarGrid component
├── ChecklistCellPopover component
├── FrequencyTabs component
└── MachineChecklistPage (calendar grid with daily/weekly/monthly tabs)
```

**API calls:**
- GET /machine-checklists/?machine_type=&month=&year=
- POST /machine-checklists/ (single)
- POST /machine-checklists/bulk/ (calendar save)
- GET /checklist-templates/

### Phase 6: Waste Management

Waste logging with sequential approval workflow.

```
├── WasteLogTable component
├── WasteApprovalTimeline component
├── WasteApprovalDialog component
└── WasteManagementPage (table + approval flow)
```

**API calls:**
- GET/POST /waste/
- POST /waste/:id/approve/engineer/
- POST /waste/:id/approve/am/
- POST /waste/:id/approve/store/
- POST /waste/:id/approve/hod/

### Phase 7: Reports & Analytics

Auto-generated reports and analytics dashboards.

```
├── ReportCard component
├── AnalyticsCards component (OEE, efficiency, loss, downtime)
├── PrintableReport component (print wrapper)
├── ReportsPage (dashboard with analytics)
└── DailyProductionReportPage (print-formatted report)
```

**API calls:**
- GET /reports/daily-production/?date=&line=
- GET /reports/yield/:runId/
- GET /reports/line-clearance/
- GET /reports/analytics/?start=&end=&line=
- GET /reports/analytics/oee/
- GET /reports/analytics/downtime/
- GET /reports/analytics/material-loss/

---

## Implementation Order Summary

```
Phase 0: Setup (types, API, hooks, schemas, config)
   |
Phase 1: Line Clearance
   |     (prerequisite for production — build first)
   |
Phase 2: Production Run + Hourly Entry
   |     (core module — most complex page)
   |
Phase 3: Breakdowns
   |     (extends run detail, smaller scope)
   |
Phase 4: Material Consumption & Yield
   |     (extends run with yield data)
   |
Phase 5: Machine Checklists
   |     (independent, calendar UI)
   |
Phase 6: Waste Management
   |     (approval workflow, depends on yield data)
   |
Phase 7: Reports & Analytics
         (aggregation layer, build last)
```

Each phase is self-contained and testable. Phase 1-2 form the critical path.
Phases 3-6 can be developed in parallel by different developers.
Phase 7 depends on data from all previous phases.

---

## Key Technical Considerations

### Hourly Grid State Management
- Use `useReducer` or Redux slice for the 12-row hourly grid
- Optimistic updates on cell blur
- Auto-save every 30 seconds (debounced)
- Track dirty cells for save indicator

### Auto-Calculations Hook (`useAutoCalculations`)
- Recalculates: total production, breakdown time, speed, efficiency on every log change
- Memoized with `useMemo` to avoid unnecessary rerenders
- Formulas documented in design-doc.md Section 8

### Calendar Grid Performance
- 31 columns x 16 rows = ~500 cells
- Use virtualization if scrolling is slow (unlikely at this size)
- Batch API calls: single bulk save for entire calendar on "Save"

### Print Layout
- Use `@media print` CSS for Daily Production Report
- Hide navigation, action buttons in print
- A4 landscape format for hourly table
- Consider `react-to-print` library

### Approval Flow State Machine
- Waste approval is strictly sequential: Engineer → AM → Store → HOD
- Each step checks previous step is signed before enabling
- Use React Query's `onSuccess` to invalidate and refetch after approval
