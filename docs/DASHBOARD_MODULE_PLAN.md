# FactoryFlow — Module-Wise Dashboard System (Plan)

> **Status:** Planning only. No implementation in this document.
> **Goal:** A consistent, module-wise dashboard system where every app exposes its own KPI dashboard, all dashboards share one design/data pattern, they roll up into a single **Executive (All-in-One) Dashboard**, and interrelated modules cross-link and reconcile against each other.

---

## 1. Objectives & Principles

**What we are building**

1. **One dashboard per module** — QC, Production, Dispatch, Warehouse/WMS, Barcode, Marketplace, Maintenance/EHS, Gate, Finance/GRPO, Labour, Returnable, Work Permit.
2. **One Executive Dashboard** — a single landing page that aggregates the headline KPI from every module into a unified command view with drill-down into each module dashboard.
3. **Cross-module correlation** — dashboards that share a business object (an order, a batch, a vehicle, a plan) link to and reconcile against each other (e.g. Production plan → actual output → warehouse receipt → dispatch → marketplace fulfilment).

**Design principles**

- **Reuse, don't reinvent.** The repo already has a `dashboards/` module, shared dashboard primitives, and backend dashboard apps. Every new dashboard follows the *existing* patterns, not a new framework.
- **One data contract per dashboard.** Each dashboard is backed by exactly one summary endpoint returning a typed payload (KPIs + series + breakdown rows). No ad-hoc calls scattered across components.
- **Server does the aggregation.** KPIs are computed in a backend service layer (ORM aggregates or SAP proxy), never assembled client-side from raw lists.
- **Permission-gated end to end.** Every dashboard route, sidebar item, and API endpoint is gated by a Django permission codename.
- **Company-scoped.** Every metric respects the `Company-Code` header and multi-company context.
- **Drill-down, not dead-ends.** Every KPI tile and status tile links to the underlying filtered list/record in the owning module.

---

## 2. Current State (what already exists — reuse it)

**Frontend (`src/`)**
- `src/modules/dashboards/` — analytics suite (SAP plan, stock-level, inventory-age, non-moving, sales-planning, production-movement, dispatch-pipeline, dispatch-fulfilment). **Canonical multi-dashboard module** with landing page + per-dashboard folders.
- Per-dashboard folder pattern: `api/*.api.ts` (raw axios) + `api/*.queries.ts` (React Query hooks) + `components/` + `constants/` + `types/` + `pages/`. **Follow this exactly.**
- `src/shared/components/dashboard/` — `SummaryCard`, `StatusOverviewGrid`, `DashboardHeader`, `DashboardLoading`, `DashboardError`. **The building blocks.**
- `src/app/registry/index.ts` + `module.config.tsx` — registry-driven routing/nav/permissions.
- `recharts` v3 — charting library (already used in dispatch-fulfilment + warehouse analytics pages).
- Scattered existing dashboards to consolidate: `src/modules/dashboard/` (home), `src/modules/maintenance/dashboard`, `src/modules/warehouse/pages/*` (WMS, batch-expiry, billing, backlog, transfer, comparison), `production/execution/reports/*`.

**Backend (`factory_app/`)**
- Established dashboard apps under `api/v1/dashboards/…` and `api/v1/sap/…`: `stock_dashboard`, `inventory_age`, `sap_plan_dashboard`, `non_moving_rm`, `sales_planning_requirement`.
- Per-module dashboard endpoints already present: `dispatch_plans` (`dashboard_service.py`), `production_execution` (rich report suite), `grpo` (`summary/`), `maintenance` (`dashboard/`), `marketplace` (`warehouse-insights/`), `barcode` (dispatch/intercompany reports).
- Aggregation lives in **service layers** (`*/services.py`, `dashboard_service.py`), not views.
- Pre-aggregation pattern: **materialized table + APScheduler refresh command** (see `sales_planning_requirement`).
- Permission pattern: per-app permission model + `permissions.py` DRF class + codename migrations; typical stack `[IsAuthenticated, HasCompanyContext, CanView<Module>]`.

> **Key takeaway:** ~70% of the backend aggregation logic and all frontend primitives already exist. This project is mostly **standardization + gap-filling + one executive roll-up**, not greenfield.

---

## 3. Dashboard Taxonomy (three tiers)

```
Tier 1 — EXECUTIVE (All-in-One)          /dashboards  (landing)
         Headline KPI from every module + health tiles + cross-module alerts
                        │  drill down
                        ▼
Tier 2 — MODULE DASHBOARDS               /dashboards/<module>
         One per app: KPIs + trend + breakdown + status grid → drill into records
                        │  cross-link (shared business object)
                        ▼
Tier 3 — DETAIL / REPORTS                existing module pages & report suites
         Filtered lists, single-record views, export
```

---

## 4. Standard Anatomy of a Module Dashboard

Every module dashboard has the **same four zones** (built from `src/shared/components/dashboard/`):

1. **Header** — `DashboardHeader`: title, description, date-range + company filter, primary action (export / refresh).
2. **KPI Row** — 3–6 `SummaryCard` tiles. Each tile: value + delta vs previous period + click-through to filtered list.
3. **Trend + Breakdown** — one `recharts` time-series (the module's primary metric over time) + one breakdown (bar/pareto/donut by category, line, warehouse, etc.).
4. **Status Overview Grid** — `StatusOverviewGrid`: workflow states as clickable tiles (e.g. Pending / In-progress / Approved / Closed) that navigate to the pre-filtered module list.

**Single data contract per dashboard** — one endpoint returns:

```jsonc
{
  "kpis":       [ { "key", "label", "value", "unit", "delta", "trend", "link" } ],
  "series":     [ { "date", "<metric>" } ],          // for the trend chart
  "breakdown":  [ { "label", "value", "link" } ],     // for the bar/donut
  "status":     [ { "label", "count", "color", "link" } ],
  "meta":       { "asOf", "company", "range" }
}
```

Frontend consumes it via one React Query hook (`use<Module>Dashboard`). Loading → `DashboardLoading`, error → `DashboardError`.

---

## 5. Module-by-Module Dashboard Catalogue

Each row: the headline KPIs, the trend, the breakdown, the drill-downs, and the backend source. "Reuse" = endpoint already exists; "New" = to build.

### 5.1 Production (`production_execution`)
- **KPIs:** OEE %, Output (units/tonnes), Yield %, Downtime hrs, Waste %, Cost/unit.
- **Trend:** OEE trend / output over time. **Breakdown:** downtime Pareto by cause; output by line.
- **Status:** runs by status (planned/running/completed/held); line-clearance pending.
- **Backend:** **Reuse** `AnalyticsAPI`, `OEEAnalyticsAPI`, `DowntimeAnalyticsAPI`, `WasteAnalyticsAPI`, `CostAnalyticsAPI`, report suite. Add one thin `ProductionDashboardSummaryAPI` that composes them into the standard contract.
- **Frontend:** consolidate `production/execution/reports/*` under `/dashboards/production`.

### 5.2 Dispatch & Logistics (`dispatch_plans`, `gate_core`, `barcode`)
- **KPIs:** Dispatched value/weight/boxes, Plan-vs-billed %, Open bilties, Freight cost, On-time dispatch %.
- **Trend:** daily dispatch value. **Breakdown:** dispatch by transporter / destination.
- **Status:** dispatch plans by stage; docking scan approvals pending.
- **Backend:** **Reuse** `DispatchDashboardSummaryAPI`, `DispatchDashboardBillsAPI`, `barcode` dispatch reports, `gate_core.SalesDispatchReportView`.
- **Frontend:** relates to existing `dispatch-pipeline` / `dispatch-fulfilment` dashboards — fold into `/dashboards/dispatch`.

### 5.3 Warehouse / WMS (`warehouse`, `wms`, `stock_dashboard`, `inventory_age`, `non_moving_rm`)
- **KPIs:** On-hand vs benchmark, Stock health %, Inventory age (aged %), Non-moving value, FG receipts, BST in-transit.
- **Trend:** stock level over time. **Breakdown:** stock by warehouse/zone; aging buckets.
- **Status:** BOM requests, FG receipts, transfers by status.
- **Backend:** **Reuse** `StockDashboardAPI`, `InventoryAgeDashboardAPI`, `NonMovingRM`, `wms.Dashboard`, warehouse BST service.
- **Frontend:** consolidate `warehouse/pages/*` analytics under `/dashboards/warehouse`.

### 5.4 Barcode / Traceability (`barcode`)
- **KPIs:** Pallets/boxes generated, scanned units, dispatch scan completion %, rejected scans, intercompany transfers.
- **Trend:** scans/day. **Breakdown:** by operation (generate/move/split/repack/dismantle).
- **Backend:** **Reuse** `DispatchReportAPI`, `IntercompanyTransferDashboardAPI`, `BarcodeTraceabilityAPI`. Add `BarcodeDashboardSummaryAPI`.

### 5.5 QC (`quality_control`, `production_execution` QC checks)
- **KPIs:** Pass rate %, arrival slips pending/approved, inspections done, customer returns, line-clearance status.
- **Trend:** pass rate over time. **Breakdown:** rejections by parameter/material-type.
- **Status:** arrival-slip approvals, production-QC approvals pending.
- **Backend:** **New** `QCDashboardSummaryAPI` (aggregate from QC + in-process/final QC check models).

### 5.6 Marketplace (`marketplace`)
- **KPIs:** Orders, fulfilment %, dispatched, returns %, revenue (billing), packing pending.
- **Trend:** orders/day. **Breakdown:** by marketplace channel / SKU.
- **Backend:** **Reuse/extend** `WarehouseInsightsView` → `MarketplaceDashboardSummaryAPI`.

### 5.7 Maintenance & EHS (`maintenance`)
- **KPIs:** Open work orders, MTTR, PM compliance %, spare stock alerts, work permits active/expired, safety fines, fire-equipment issues.
- **Trend:** work orders raised/closed. **Breakdown:** by asset/type; downtime linkage.
- **Status:** work orders, permits, PM executions by status.
- **Backend:** **Reuse** `MaintenanceDashboardAPI`, `MaintenanceReportsAPI`, `MaintenanceAlertsAPI`.
- **Frontend:** fold existing `/maintenance/dashboard` into `/dashboards/maintenance`.

### 5.8 Gate & Security (`gate_core`, `*_gatein`, `person_gatein`, `labour_count`)
- **KPIs:** Vehicle arrivals, gate-outs, inside vehicles, empty-vehicle turnaround, visitor/contractor/labour count.
- **Trend:** arrivals/day. **Breakdown:** by gate/entry type.
- **Backend:** **New** `GateDashboardSummaryAPI` aggregating arrivals + gate-in variants + person/labour entries.

### 5.9 Finance / GRPO / Procurement (`grpo`, `finance`)
- **KPIs:** GRPO postings value, service GRPO, credit/debit notes, transporter AP invoices.
- **Trend:** GRPO value/day. **Breakdown:** by vendor/item.
- **Backend:** **Reuse** `GRPODashboardSummaryAPI`; add credit/debit-note aggregation.

### 5.10 Returnable Items (`returnable_items`)
- **KPIs:** Open gate passes, overdue (past due-date), returned, pending return, by department.
- **Status:** gate-out / gate-in / closed.
- **Backend:** **New** `ReturnableDashboardSummaryAPI` (reuse scheduler-computed due-date state).

### 5.11 Work Permit (`maintenance.WorkPermit`)
- **KPIs:** Active permits, pending approval, expired, renewed, by work-type.
- **Backend:** part of Maintenance dashboard or **New** `WorkPermitDashboardSummaryAPI`.

### 5.12 Labour (`labour_gate`, `labour_count`)
- **KPIs:** Headcount by shift, verified vs unverified, gate-out batches.
- **Backend:** **New** `LabourDashboardSummaryAPI`.

> **SAP-plan / stock / inventory-age / sales-planning** dashboards already exist under `dashboards/` — keep as-is, just link them into the executive tier.

---

## 6. Executive (All-in-One) Dashboard

**Route:** `/dashboards` (the landing page — replaces/absorbs the current `DashboardsLandingPage`).

**Layout**

1. **Global filters** — company selector + date range (propagates to every card's link).
2. **Module KPI strip** — one headline `SummaryCard` per module (e.g. Production OEE, Dispatch value, Stock health, QC pass rate, Marketplace fulfilment, Maintenance open WOs). Each card → its module dashboard.
3. **Health / Alert rail** — cross-module alerts pulled from existing alert sources (stock alerts, PM due, permits expiring, overdue returnables, dispatch approvals pending, low pass-rate).
4. **Value-chain flow strip** — the end-to-end pipeline (Plan → Produce → QC → Warehouse → Dispatch → Marketplace) with the count/value at each stage and reconciliation deltas (see §7).
5. **Module grid** — `StatusOverviewGrid` of all modules with their top status counts, permission-filtered (a user only sees modules they can access).

**Data strategy — do NOT fan out N calls on load.** Two options:

- **Option A (recommended):** one **`ExecutiveDashboardSummaryAPI`** that internally calls each module service and returns a single composed payload. Simplest for the client; backend controls fan-out and caching.
- **Option B:** client-side `useQueries` calling each module's summary endpoint in parallel, each card independently loading. More resilient (one module failing doesn't blank the page) but chattier.

> Recommendation: **Option A backed by a materialized snapshot** (see §8) so the executive view is fast and cheap, with Option B as the drill target.

---

## 7. Cross-Module Correlation (the "interrelated" part)

Dashboards correlate through **shared business objects**. Model these explicitly so a KPI in one dashboard reconciles against another.

### 7.1 The value chain (primary correlation spine)

```
 SAP Plan ──► Production Run ──► QC Check ──► FG Receipt (Warehouse) ──► Barcode/Pallet ──► Dispatch ──► Marketplace Fulfilment
 (plan qty)   (actual output)   (pass %)     (received qty)             (scanned units)    (dispatched)  (delivered)
```

At each hop, compute a **reconciliation delta** and surface it as a KPI on both adjacent dashboards:

| Correlation | Shared key | Reconciliation metric | Lives on |
|---|---|---|---|
| Plan vs Production | material/plan id | plan qty − actual output | Production ↔ SAP-plan |
| Production vs QC | production run id | output − QC-passed | Production ↔ QC |
| Production vs Warehouse | run / FG receipt | output − FG received | Production ↔ Warehouse |
| Warehouse vs Barcode | item / batch | on-hand − scanned units | Warehouse ↔ Barcode |
| Barcode vs Dispatch | dispatch session | scanned − dispatched | Barcode ↔ Dispatch |
| Dispatch vs Marketplace | order / invoice | dispatched − fulfilled | Dispatch ↔ Marketplace |
| Dispatch vs Finance | invoice | dispatched value − billed | Dispatch ↔ Finance/GRPO |
| Maintenance vs Production | machine / line | breakdown hrs → OEE downtime | Maintenance ↔ Production |
| Gate vs Dispatch | vehicle / gatepass | arrivals → gate-outs turnaround | Gate ↔ Dispatch |
| Returnable vs Gate | gatepass | gate-out vs gate-in | Returnable ↔ Gate |

### 7.2 How correlation is implemented (pattern)

- **Shared-key contract:** every module summary payload includes the correlation keys it owns (e.g. Production returns `run_id`, `plan_id`, `line_id`).
- **Reconciliation endpoint(s):** a small set of `reconciliation/*` endpoints that join two modules on the shared key and return the delta series. Owned by the backend (ORM joins or SAP correlation).
- **UI cross-links:** each reconciliation KPI tile deep-links to *both* sides (e.g. "output − received = 120 units" → click to Production run and to the Warehouse receipt filtered by that run).
- **Drill context propagation:** filters (company, date, line, item) carry across links via query params so the target dashboard opens pre-filtered (use the existing `filtersSlice`).

### 7.3 Correlation on the Executive dashboard

The **value-chain flow strip** (§6.4) is the visual home of correlation: each stage shows its count + the delta to the next stage, so a leak anywhere in the chain is visible at a glance and clickable into the two module dashboards that own it.

---

## 8. Data & Performance Strategy

- **Live vs materialized.** Fast, low-cardinality aggregates (counts by status) → compute live. Heavy/SAP-backed or chain-reconciliation aggregates → **materialize** into a summary table refreshed by APScheduler (follow `sales_planning_requirement`).
- **Executive snapshot table.** One `dashboard_snapshot` table holding the latest headline KPI per module per company, refreshed on a schedule → executive page reads one cheap row-set.
- **Caching.** Wrap expensive SAP-proxy summaries with `django-redis` (already available) keyed by company + range, short TTL.
- **React Query.** `staleTime` per dashboard (e.g. 60–300s); executive page can `refetchInterval` for near-live. Reuse `src/config/query.config.ts`.
- **No client-side heavy aggregation.** Client only formats server-computed numbers.

---

## 9. Frontend Architecture Plan

```
src/modules/dashboards/
├── module.config.tsx            # routes + nav + permissions for ALL dashboards
├── pages/
│   └── ExecutiveDashboardPage.tsx   # Tier-1 landing (replaces current landing)
├── _shared/                     # dashboard-suite-local shared bits
│   ├── components/  (KpiStrip, ValueChainStrip, AlertRail, ReconTile)
│   ├── hooks/       (useDashboardFilters — wraps filtersSlice)
│   └── types/       (DashboardSummary contract, KPI, Series, ReconDelta)
├── executive/       api/ (executive.api.ts + executive.queries.ts), types/
├── production/      api/ components/ constants/ types/ pages/
├── dispatch/        …
├── warehouse/       …
├── qc/              …
├── marketplace/     …
├── maintenance/     …
├── barcode/         …
├── gate/            …
├── finance/         …
├── returnable/      …
├── labour/          …
└── (existing) sap-plan/ stock-level/ inventory-age/ non-moving/ sales-planning-requirement/ …
```

- Every new sub-dashboard mirrors the **`sap-plan/`** folder (best existing example).
- One route each: `/dashboards/<module>`; all gated via `DASHBOARDS_PERMISSIONS` codenames in `src/config/permissions/`.
- Sidebar: a single collapsible **"Dashboards"** parent with children per module, permission-filtered (already supported by `Sidebar.tsx`).
- Build a **shared `<DashboardChart>` wrapper** around recharts (currently missing) so every chart is themed/consistent — put it in `src/shared/components/dashboard/`.
- Reuse `SummaryCard`, `StatusOverviewGrid`, `DashboardHeader`, `DashboardLoading`, `DashboardError` everywhere.

---

## 10. Backend Architecture Plan

- **Standard summary endpoint per module:** `<Module>DashboardSummaryAPI` returning the §4 contract. Thin view → dedicated `dashboard_service.py` (mirror `dispatch_plans/dashboard_service.py`).
- **Where it lives:** extend the owning app (Production summary in `production_execution`, etc.), not a monolith. Register under `api/v1/dashboards/<module>/` in `config/urls.py`.
- **Reconciliation service:** a small `reconciliation` app (or a `reconciliation/` service module) exposing `api/v1/dashboards/reconciliation/<pair>/` endpoints for the §7.1 deltas.
- **Executive composer:** `ExecutiveDashboardSummaryAPI` reads the `dashboard_snapshot` materialized table (fast) with a `?live=true` fallback that fans out to module services.
- **Pre-aggregation:** new `run_dashboard_scheduler` management command + `jobs.py` refreshing the snapshot + heavy materialized rows (mirror `sales_planning_requirement` / `stock_dashboard` scheduler).
- **Permissions:** per-dashboard codename (`can_view_<module>_dashboard`) via migration + `permissions.py` DRF class; standard stack `[IsAuthenticated, HasCompanyContext, CanView<Module>Dashboard]`. Bundle into role Groups via a `setup_dashboard_groups` command.
- **Company scoping:** every service filters by `request.company` (from `HasCompanyContext`).

---

## 11. Contracts (shared types — to define during implementation)

- **`DashboardSummary`** (§4) — the one payload shape every module summary returns. Define once in frontend `_shared/types/` and mirror as a backend serializer so all dashboards are interchangeable.
- **`ReconDelta`** — `{ pairKey, leftValue, rightValue, delta, unit, leftLink, rightLink }`.
- **`ExecutiveSummary`** — `{ modules: DashboardSummary[headline-only], alerts: Alert[], valueChain: Stage[] }`.

Locking these two contracts first is the highest-leverage step — every dashboard and every correlation depends on them.

---

## 12. Permissions & Access Model

- One codename per module dashboard + one for the executive view.
- Sidebar and routes already filter by permission — a user sees only the module dashboards they can access, and the executive strip renders only permitted cards.
- Reuse existing per-app permission models; add `can_view_<x>_dashboard` codenames via migrations; assign through role Groups.

---

## 13. Phased Delivery (suggested sequencing)

| Phase | Scope | Notes |
|---|---|---|
| **0. Contracts** | Lock `DashboardSummary` + `ReconDelta`; build `<DashboardChart>` wrapper; scaffold `dashboards/_shared/`. | Foundation; unblocks everything. |
| **1. Reuse wins** | Wrap already-existing backend summaries (Dispatch, Production, Stock, Inventory-age, Maintenance, GRPO, Marketplace, Barcode) into the standard contract + standard frontend pages. | Fast, high value — mostly adapter work. |
| **2. Gap modules** | New summaries: QC, Gate, Returnable, Work Permit, Labour, Finance notes. | Net-new aggregation services. |
| **3. Executive** | Snapshot table + scheduler + `ExecutiveDashboardSummaryAPI` + landing page (KPI strip, alert rail, module grid). | Depends on Phases 1–2. |
| **4. Correlation** | Reconciliation endpoints + value-chain strip + cross-links. | The differentiator; depends on shared keys from Phases 1–2. |
| **5. Polish** | Caching, refresh intervals, exports, drill-context propagation, mobile layout. | |

---

## 14. Open Questions (decide before building)

1. **Executive fan-out:** materialized snapshot (Option A, recommended) vs client parallel `useQueries` (Option B)? Affects freshness vs cost.
2. **Refresh cadence:** which KPIs must be near-live (dispatch, gate) vs daily (stock, non-moving, sales-planning)?
3. **Reconciliation ownership:** a dedicated `reconciliation` app vs distributing recon endpoints into each owning app?
4. **Consolidation:** retire the scattered dashboards (`modules/dashboard`, `maintenance/dashboard`, `warehouse/pages/*` analytics) into `dashboards/`, or leave in place and just link? (Recommend consolidate to avoid drift.)
5. **SAP load:** how heavy are the SAP-proxy summaries — do they *require* materialization to keep the executive page responsive?
6. **Cross-company:** should the executive dashboard support an all-companies roll-up, or strictly one company at a time?

---

## 14b. Implementation Status

**Built (Tier 1 — Executive/All-in-One "Command Centre"):**
- Route `/dashboards/overview` + sidebar entry "Command Centre" (first child under Dashboards), permission-gated, registered in `src/modules/dashboards/module.config.tsx`.
- Page `src/modules/dashboards/overview/pages/ExecutiveOverviewPage.tsx` — one screen with a **Live KPIs** band + an **All modules** directory.
- **Live KPI cards** (real data, no backend changes) reusing sibling dashboard hooks:
  - `LiveDispatchCard` → `useDispatchFulfilment` (dispatched value, trucks out, open backlog + 30-day trend).
  - `LiveStockHealthCard` → `useStockLevels` (tracked items, healthy/low/critical vs benchmark).
- **`ModuleDirectoryGrid`** — driven by the app nav registry (`getAllNavigation()`), so every module the user can access appears as a card linking to its real route; permission-filtered exactly like the sidebar.
- All uses the shared `SummaryCard`/`DashboardHeader` primitives + recharts; typecheck-clean and lint-clean.

**Not yet built (next phases, per §13):** per-module `Live<Module>Card`s for QC / Production / Maintenance / Marketplace / Gate / etc. (each needs its module summary endpoint, then slots into the Live KPIs band), the reconciliation/value-chain strip (§7), and the materialized executive snapshot (§8). The overview page is structured flat so adding a new `Live<Module>Card` is a drop-in.

## 15. Summary

- **Structure:** three tiers — Executive (all-in-one) → per-module dashboards → existing detail/reports.
- **Consistency:** one payload contract, one set of shared primitives, one folder pattern (`sap-plan/`), one permission model.
- **Correlation:** shared business keys + reconciliation deltas along the Plan→Produce→QC→Warehouse→Dispatch→Marketplace value chain, surfaced on both adjacent dashboards and on the executive value-chain strip.
- **Effort:** mostly standardization + adapters over existing backend aggregation, plus a handful of new summaries, one executive composer, and the reconciliation layer.
- **Start with:** locking the `DashboardSummary` and `ReconDelta` contracts and the shared chart wrapper — everything else composes on top.
```
