# Production module (React / Vite frontend)

> Folder: `src/modules/production/`
> Route prefix: `/production` · Config: `src/modules/production/module.config.tsx`
> Talks to Django apps `production_execution` (`/api/v1/production-execution/`) and
> `production_planning` (planning sub-module).
>
> Backend counterpart: [`factory_app` `production_execution/docs/README.md`](../../../factory_app/production_execution/docs/README.md)
> (absolute: `C:/Users/gurpa/dev/factory_app/production_execution/docs/README.md`).

> **Accuracy note (2026-07):** rewritten from the code. Older versions of this file and
> `src/modules/production/docs/README.md` describe "hourly logging", sales-projection
> planning, and "no cross-module imports" — all stale for the execution flow. The run
> screen now imports from the **warehouse** and **qc** modules, the run timeline is
> **segments + breakdowns**, and QC has moved to `/qc/production`. Trust this file and
> the code.

---

## Overview — what it does & who uses it

The Production module is the factory-floor UI. It has two sub-folders:

- **`execution/`** — the operational heart: run list, start-run wizard, the live run
  detail (timeline, materials, breakdowns), line clearance, machine checklists, waste,
  resource/cost tracking, and a large reports set. Maps to `production_execution`.
- **`planning/`** — SAP-posted production plans (weekly/daily targets, BOM). Maps to
  `production_planning`. Present in this module but **out of scope** for this doc except
  where it hands off to execution.

Users: line supervisors/operators (runs, timeline, waste), QA (clearance approval — via
the QC module), store/HOD (waste sign-off), managers (reports, movement dashboard).

Everything is client-rendered React with **TanStack Query** for server state and
**react-hook-form + zod** for forms. There is **no offline queue and no barcode
scanning** here (unlike gate/marketplace) — items are chosen from server-backed
searchable dropdowns.

---

## Key concepts & entities (frontend view)

- **Production run** — the object every screen orbits. Carries a derived `live_status`
  (`DRAFT` / `RUNNING` / `STOPPED` / `BREAKDOWN` / `COMPLETED`) computed by the backend
  from active segments/breakdowns, plus `warehouse_approval_status`.
- **Segment** — a running period on the timeline. **Breakdown** — a stoppage. Together
  they render the `ProductionTimeline`.
- **Line SKU config** — a saved preset (speed, labour, cost rates, staff) that auto-fills
  the Start-Run form. Managed on the Line Management page.
- **Line clearance** — pre-production checklist gating the run; a single "all checks
  passed" toggle + supervisor sign, submitted for QA.
- **Waste log** — BOM/manual material waste rows with an approval sign-off.
- **FG receipt / Final QC** — post-completion handoff to warehouse + QC (cross-module).

Types: `execution/types/execution.types.ts`, `planning/types/planning.types.ts`.
API layer: `execution/api/execution.api.ts` (+ `.queries.ts` hooks),
`planning/api/planning.api.ts`.

---

## End-to-end flows (screens & journeys)

### 1. Find / start a run — `ExecutionDashboardPage` (`/production/execution`)
Filterable run table (status, line, date range, free-text search on run #, product, SAP
entry). Each row shows created time, product, line, total production, SAP entry, and a
`ProductionStatusBadge` from `live_status`. Row click → run detail. **Start Run** button
→ `/production/execution/start-run`.

### 2. Create a run — `StartRunPage`
1. **Product SKU** via `SearchableSelect` → `useSearchSAPItems(search, producedOnly=true)`
   (server-side, min 2 chars, restricted to finished goods that have a SAP BOM).
2. Pick **line** and **date**; enter **Required FG Quantity**.
3. Selecting the SKU fetches its BOM (`useBOMPreview`) and fills a materials table with
   **per-unit** quantities; changing Required Qty **re-scales** every row (`perUnit × qty`).
4. **Line configuration:** `useAutoFillConfig(line, sku)` applies the best preset
   automatically (exact SKU > line default, once per line/SKU combo); a dropdown lets the
   user pick a different preset. Presets fill speed/labour/cost/staff fields.
5. Submit → `useCreateRun` → navigate to the new run's detail page.

### 3. Run the floor — `RunDetailPage` (`/production/execution/runs/:runId`)
The hub. Header shows `ProductionStatusBadge` + `WarehouseApprovalBadge`. Action bar
adapts to state:
- **Submit BOM to WH** (only when `warehouse_approval_status === 'NOT_REQUESTED'`) →
  `useCreateBOMRequest` (needs `required_qty`; errors if unset).
- **Start Production** — disabled with a tooltip `startProductionBlockReason` until
  warehouse is approved **and** a `CLEARED` line clearance exists for the run.
- **Line Clearance** — routes to the run's clearance (or create with `?run_id=`); button
  is green when CLEARED, red otherwise.
- **Yield / Resources / Waste Logs (count)** — sub-screens.
- **Complete Run** — disabled unless the run is `IN_PROGRESS` with **no** active segment
  or breakdown; routes to `.../yield?complete=true` to confirm.
- **Timeline tab** (`ProductionTimeline`): Stop Production, Add Breakdown, Resolve
  Breakdown (`start_production` / `stop_production` / `stop_unrecovered`), and click a
  segment/breakdown to edit remarks. The **Add Breakdown** dialog picks a category,
  optional machine (or "Line-level"), and by default **creates a maintenance work order**
  with a priority; the breakdown detail dialog deep-links to the maintenance WO.
- **Materials tab** (`MaterialConsumptionTable`): edit closing quantity per row; wastage
  is computed server-side.
- **After completion** the action bar switches to the FG flow (see flow 6).

### 4. Line clearance — `LineClearanceFormPage`
Create (optionally linked to a run via `?run_id=`), read-only list of the 9 checklist
items, one **all-checks-passed** `Switch`, a supervisor name (auto-saved on blur), then
**Submit for QA Approval**. Submit is disabled until both the toggle is on and a
supervisor name is saved. **QA approval is not done here** — the screen only shows
"Waiting for QA approval" / "Approved" / "Rejected"; QA acts in the QC module.

### 5. Waste — `WasteManagementPage`
"Log Waste" opens a dialog listing the run's **BOM rows** plus **manually searched** SAP
items; enter a waste qty per row + a common reason; submit creates one waste log per row
(`useCreateWasteLog`). The list supports search/status/date filters. Approval is a single
**Sign & Approve** (name → `useApproveWaste`) that marks the log fully approved — the
status filter only offers **Pending** and **Approved**.

### 6. Post-completion FG handoff (cross-module) — on `RunDetailPage`
When the run is `COMPLETED`: **Send FG to QC** (`useRequestFinalProductionQC`) → the
button reflects the Final-QC gate (`getFinalQCGate`): *FG QC Requested → Awaiting QC
Approval → Final QC Rejected/Failed → Create FG Receipt*. Only on **APPROVED + PASS** can
the user open the **FG Receipt** dialog, pick a warehouse (`useWarehouses` from the
warehouse module), and `useCreateFGReceipt`. Warehouse then posts the goods receipt to
SAP. FG receipts already RECEIVED/SAP_POSTED lock the button.

### 7. QC — `QCRedirectPage`
`/production/execution/runs/:runId/qc` immediately redirects to
`/qc/production/runs/:runId`. QC lives in the separate `qc` module now.

---

## Critical business rules & invariants (frontend)

- **Start-Production gating is mirrored client-side** (`startProductionBlockReason` in
  `RunDetailPage`) to match the backend: WH not requested / pending / rejected, or
  clearance not CLEARED → button disabled with the exact reason. The server enforces it
  regardless.
- **Completed runs are read-only** — `isCompleted` hides/disables edit affordances
  (materials read-only, labour edit/delete hidden, no Start/Stop/Breakdown).
- **BOM scaling** is a pure client calculation from `required_qty`; the server stores
  whatever quantities are submitted.
- **Live status is not polled.** Query hooks use `staleTime` (runs list ~30s, master data
  ~5 min) and **no `refetchInterval`**; the timeline refreshes because each mutation
  invalidates `runDetail`/`runs`. Two operators on the same run won't see each other's
  actions until a refetch. There is **no offline persistence** — actions fail without a
  network.
- **Clearance submit** requires the toggle on **and** a saved supervisor name; the name
  auto-saves on blur, so submitting too fast can race (`isSavingSupervisor` guards it).
- **Waste** create requires at least one row with qty > 0; approval requires a typed name.

---

## Integrations & cross-module boundaries

- **warehouse** (`@/modules/warehouse/...`): `useCreateBOMRequest`, `useCreateFGReceipt`,
  `useFGReceipts`, and `useWarehouses` (GRPO) — the BOM-approval gate and FG-receipt
  handoff are warehouse features surfaced inside the run screen.
- **qc** (`@/modules/qc/...`): `useProductionQCRunSessions`, `useRequestFinalProductionQC`
  — Final-QC gating of FG; the whole QC UI is external (`/qc/production`).
- **maintenance**: breakdowns link to work orders; the breakdown dialog deep-links to
  `/maintenance/work-orders/:id`.
- **Dashboards**: "Production Movement" nav item points at
  `/dashboards/production-movement` (route lives in the Dashboards module, surfaced here).
- **planning** sub-module: separate API (`PRODUCTION_PLANNING`) and permission set; plans
  are posted to SAP and are the upstream of what gets produced.

---

## Real-world edge cases

**trigger → current behaviour → what the operator sees → risk/gap**

1. **Start clicked before warehouse approval / clearance** → button is disabled and
   `handleStartProduction` also toasts `startProductionBlockReason` → operator sees the
   exact reason (e.g. "Submit the BOM request to warehouse before starting production") →
   good UX; but the reasons are computed client-side and can drift from the server rules.
2. **Submit BOM with no Required Qty** → `parseFloat(required_qty)` is 0 → toast "Set
   required quantity on the run first"; no request sent → operator must edit the run first.
3. **SAP offline during SKU/BOM search** → `useSearchSAPItems`/`useBOMPreview` return
   nothing (503 from backend) → "No products found" / empty BOM table → operator can't
   start a new run; the failure looks like "no results", not "SAP is down".
4. **Run created while SAP was down** → materials tab is empty (backend swallowed the BOM
   error) → operator sees `Materials (0)` with no warning → they may start producing
   without a materials baseline.
5. **Complete Run with an active segment/breakdown** → button disabled, tooltip "Stop all
   running segments and resolve all breakdowns first" → prevents an inconsistent
   completion.
6. **Clearance rejected (NOT_CLEARED)** → the run's Line Clearance button stays red and
   Start stays blocked → operator must create a **new** clearance; there's no "re-open"
   of the rejected one.
7. **Final QC not approved when trying to send FG** → FG button shows the gate label
   (Awaiting QC Approval / Final QC Rejected) and is disabled → FG receipt can't be
   created until QC passes; the state is legible but depends on QC-module data loading.
8. **Warehouse already received the FG receipt** → `lockedFGReceipt` disables the button
   ("Warehouse has already received this FG receipt") → prevents a duplicate receipt.
9. **Two supervisors editing one run** → no live sync; one sees a stale timeline until a
   mutation/refetch → risk of double-logging a stop/breakdown.
10. **Company switch** → run lists come back empty for the other company (backend is
    company-scoped) → "my runs disappeared" confusion, not a bug.

---

## Failure modes / what can break (operator-visible)

- **Network/API error on a mutation** → `sonner` toast ("Failed to …") from the page's
  `catch`, or the global axios interceptor handles it (FG/BOM requests rely on the
  interceptor). The action silently no-ops otherwise.
- **SAP-backed dropdowns empty** → looks like "no results"; the underlying 503 isn't
  surfaced as an outage message.
- **Permission missing** → the route/nav item is hidden by the module config's
  `permissions` gate; a deep link renders the app's not-authorized fallback.
- **Slow run detail** → the page fans out many queries (run, materials, labour,
  categories, clearances, waste, machines, QC sessions, FG receipts); on a slow link the
  action bar/tabs populate incrementally.
- **QC/warehouse module data not loaded** → FG action shows loading/disabled states until
  those cross-module queries resolve.

---

## Improvement opportunities & known gaps

- **No real-time updates** on the run timeline (no polling/websocket); consider a short
  `refetchInterval` while a segment is active so co-located operators stay in sync.
- **Waste UI is single-step** and only shows Pending/Approved, matching the backend's
  one-shot approval — the 4-level chain in the data model is unused end-to-end.
- **SAP-outage messaging**: distinguish "SAP unavailable" from "no results" on SKU/BOM
  search and flag runs whose BOM failed to load.
- **Client vs server gate drift**: `startProductionBlockReason` duplicates backend logic;
  keep them in lockstep or derive from a single server-provided flag.
- **Stale in-module README** (`src/modules/production/docs/README.md`) should be retired in
  favour of this file.

---

## Permissions & roles (nav gating)

Constants: `src/config/permissions/production.permissions.ts`
(`EXECUTION_PERMISSIONS`, `PRODUCTION_PERMISSIONS`). Routes and the sidebar are gated in
`module.config.tsx`.

| Area | Route(s) | Permission |
|------|----------|------------|
| Production landing / sidebar group | `/production` | any of view-plan/run/clearance/checklist/waste/reports/manage-lines (`PRODUCTION_DASHBOARD_PERMISSIONS`) |
| Execution dashboard / run detail | `/production/execution`, `/runs/:id` | `VIEW_RUN` |
| Start run | `/execution/start-run` | `CREATE_RUN` |
| Yield | `/runs/:id/yield` | `VIEW_MATERIAL` |
| Breakdowns | `/runs/:id/breakdowns`, `/execution/breakdowns` | `VIEW_BREAKDOWN` |
| Resources | `/runs/:id/resources` | `CREATE_MATERIAL` |
| Line clearance list/form | `/execution/line-clearance*` | `VIEW_CLEARANCE` / `CREATE_CLEARANCE` |
| Machine checklists | `/execution/machine-checklists` | `VIEW_CHECKLIST` |
| Waste | `/execution/waste` | `VIEW_WASTE` |
| Reports (all) | `/execution/reports*` | `VIEW_REPORTS` |
| Master data / line management | `/execution/master-data`, `/line-management` | `MANAGE_LINES` |
| Planning | `/production/planning*` | `VIEW_PLAN` / `CREATE_PLAN` / `EDIT_PLAN` |

Sidebar children (`Execution`, `Line Clearance`, `Waste Management`, `Reports`,
`Production Movement`, `Line Management`) each carry their own permission, so a user only
sees the entries they can use. QA-approve of clearance and all QC live in the `qc` module.

---

## Developer file map

**Frontend (`C:/Users/gurpa/dev/FactoryFlow/src/modules/production/`)**
- `module.config.tsx` — routes, lazy imports, sidebar nav + permission gates.
- `pages/ProductionDashboardPage.tsx` — `/production` landing.
- `execution/api/execution.api.ts` — every `production_execution` endpoint call.
- `execution/api/execution.queries.ts` — TanStack Query hooks, query keys, invalidation.
- `execution/pages/ExecutionDashboardPage.tsx` — run list + filters.
- `execution/pages/StartRunPage.tsx` — SKU/BOM/preset start wizard.
- `execution/pages/RunDetailPage.tsx` — **the hub**: timeline, materials, gates, FG/QC handoff.
- `execution/pages/LineClearanceFormPage.tsx` / `LineClearanceListPage.tsx` — clearance.
- `execution/pages/WasteManagementPage.tsx` — waste logging + approval.
- `execution/pages/{MachineChecklist,BreakdownLog,ResourceTracking,YieldReport,MasterData,LineManagement}Page.tsx`.
- `execution/pages/*ReportPage.tsx` + `ReportsPage.tsx` — analytics screens.
- `execution/pages/QCRedirectPage.tsx` — redirect to `/qc/production`.
- `execution/components/` — `ProductionTimeline`, `MaterialConsumptionTable`,
  `ProductionStatusBadge`, `WasteLogTable`, `SignatureBlock`, badges, etc.
- `execution/schemas/`, `execution/types/`, `execution/constants/`.
- `planning/` — planning sub-module (`api/`, `pages/`, `schemas/`, `types/`).
- `src/config/permissions/production.permissions.ts` — permission constants.

**Backend** — see the paired doc for models/services/SAP.

---

## Related docs

- **Backend:** `C:/Users/gurpa/dev/factory_app/production_execution/docs/README.md`
- In-repo (stale, superseded by this file): `src/modules/production/docs/README.md`.
