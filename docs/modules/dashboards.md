# Dashboards Module (SAP BI / Reporting) — Frontend

> **Scope:** the SAP-backed, read-only reporting dashboards in
> `src/modules/dashboards`. In scope here are the five that map to the SAP
> dashboard backends: **SAP Material Plan, Stock Benchmark, Inventory (Age),
> Non-Moving, Sales Planning vs Requirement**.
> **Paired backend doc:** [`factory_app/docs/dashboards_overview.md`](../../../factory_app/docs/dashboards_overview.md)
> (absolute: `C:/Users/gurpa/dev/factory_app/docs/dashboards_overview.md`).

The same folder also hosts **Production Movement**, **Dispatch Pipeline**,
**Dispatch Fulfilment**, and a **Dispatch Plans** redirect. Those are backed by
*other* Django apps (`production_execution`, `dispatch_plans`) and are **out of
scope for this doc** — they are noted only where routing/permissions overlap.

Grounded in the code as of this writing. The old
`src/modules/dashboards/sap-plan/docs/README.md` is stale (it lists components
and hooks that no longer exist) — trust this file and the code.

---

## Overview — what it does & who uses it

The Dashboards module is the platform's **BI surface over SAP Business One**. It
renders planning and inventory analytics for planners, procurement, and
warehouse/finance managers. Every screen is **read-only** (the single exception
is the Sales-Planning **Refresh** button, which triggers a server-side snapshot
rebuild — no direct SAP writes).

There is **no scanning and no offline queue** in this module — unlike the
barcode/dispatch modules, these are **online-only reads**. "State" here means
React Query cache, filter state, URL deep-links, and the SAP-down banner.

Screens (routes in `module.config.tsx`):

| Route | Screen | Backend app | View permission |
|-------|--------|-------------|-----------------|
| `/dashboards` | Landing (card grid) | — | any dashboard perm |
| `/dashboards/sap-plan` | SAP Material Plan | `sap_plan_dashboard` | `VIEW_PLAN_DASHBOARD` |
| `/dashboards/stock-levels` | Stock Benchmark | `stock_dashboard` | `VIEW_STOCK_DASHBOARD` |
| `/dashboards/inventory-age` | Inventory (Age & Value) | `inventory_age` | `VIEW_INVENTORY_AGE` |
| `/dashboards/non-moving` | Non-Moving | `non_moving_rm` | `VIEW_NON_MOVING_RM` |
| `/dashboards/sales-planning-requirement` | Sales Planning vs Requirement | `sales_planning_requirement` | `VIEW_SALES_PLANNING_REQUIREMENT` |
| `/dashboards/production-movement` | Production Movement *(out of scope)* | `production_execution` | `VIEW_PRODUCTION_MOVEMENT` |
| `/dashboards/blowing` | Blowing *(out of scope)* | `blowing` | `BLOWING_PERMISSIONS.VIEW_REPORTS` |
| `/dashboards/dispatch-pipeline` | Dispatch Pipeline *(out of scope)* | `dispatch_plans` | `VIEW_DISPATCH_PIPELINE` |
| `/dashboards/dispatch-fulfilment` | Dispatch Fulfilment *(out of scope)* | `dispatch_plans` | `VIEW_DISPATCH_PLANS` |
| `/dashboards/dispatch-plans` | → redirects to `/dispatch/plans` | `dispatch_plans` | `VIEW_DISPATCH_PLANS` |

---

## Key concepts & entities

- **`ModuleConfig`** (`module.config.tsx`) declares `routes` (React Router,
  lazy-loaded) and `navigation` (sidebar). Each route/nav entry carries a
  `permissions` array; the router and sidebar hide anything the user can't see.
- **Per-dashboard folder shape** (consistent across all five):
  `api/*.api.ts` (axios calls), `api/*.queries.ts` (TanStack Query hooks +
  query keys), `components/`, `constants/`, `types/`, `pages/<Page>.tsx`.
- **`apiClient`** (`@/core/api`) prefixes `/api/v1` and injects the
  **`Company-Code` header** from the IndexedDB `currentCompany`
  (`src/core/api/client.ts`). That header is what scopes every SAP read to the
  active company on the server.
- **Endpoints** are centralised in `src/config/constants/api.constants.ts`
  (`API_ENDPOINTS.SAP_PLAN_DASHBOARD`, `STOCK_DASHBOARD`, `INVENTORY_AGE_DASHBOARD`,
  `NON_MOVING_RM`, `SALES_PLANNING_REQUIREMENT`).
- **Permissions** are constants in `src/config/permissions/dashboards.permissions.ts`
  (`DASHBOARDS_PERMISSIONS`), consumed by `usePermission()` / `hasAnyPermission()`.
- **`SAPUnavailableBanner`** (`sap-plan/components/SAPUnavailableBanner.tsx`) is
  the shared SAP-error UI, re-imported by the other four pages.
- **`itemGroupDefaults`** (`utils/itemGroupDefaults.ts`) — Stock, Inventory Age,
  and Non-Moving all **default the item-group filter to the "Packing Material"
  group** (`findDefaultMaterialGroup`, `DEFAULT_MATERIAL_TYPE_NAME`), falling
  back to the first group. Reports do not fire until the material type resolves.
- **Query caching**: `staleTime = 5 min` on the four live SAP dashboards
  (SAP Plan, Stock, Inventory Age, Non-Moving) and **`2 min` on Sales Planning**
  (`SALES_PLANNING_REQUIREMENT_STALE_TIME`, its data is a Postgres snapshot). Each
  dashboard's `sapRetry` retries twice **except** on 401/403/404 — and for
  sales-planning it **also** skips 400/409.
- **Company switch wipes the cache.** `useAuth().switchCompany` calls
  `queryClient.clear()` after dispatching the switch (`core/auth/hooks/useAuth.ts`),
  so **every** dashboard query is discarded and refetches under the new
  `Company-Code` header. Independently, Stock, Inventory Age, Non-Moving, and Sales
  Planning also embed `currentCompany?.company_id` in their query keys; **SAP Plan
  does not** — a difference that only bites on a company change that bypasses
  `switchCompany()` (see edge cases).

---

## End-to-end flows

### 1. Landing (`DashboardsLandingPage.tsx`)
Renders a card grid from a local `dashboardsModules` array of **7 cards**: the
five in-scope SAP dashboards **plus Production Movement and Dispatch Pipeline**
(the Dispatch Fulfilment page and the Dispatch Plans redirect have **no** landing
card). `visibleModules` is filtered with `hasAnyPermission(mod.permissions)`, so a
user only sees cards they can open; clicking a card navigates to its route. Note
the divergence from the sidebar: the sidebar's module-level gate **omits**
`VIEW_PRODUCTION_MOVEMENT` (so production-only users don't get a "Dashboards"
sidebar entry), yet the `/dashboards` route and this landing card for Production
Movement remain reachable — see the comment in `module.config.tsx`.

### 2. SAP Material Plan (`sap-plan/pages/SAPPlanDashboardPage.tsx`)
1. Two tabs: **SKU Summary** and **Procurement** (switched via `Badge` chips).
2. `PlanDashboardFilters` sets `{ status, due_date_from/to, warehouse, sku,
   show_shortfall_only }`. **`status` is applied client-side** (multi-select in
   the table); the API only receives dates/warehouse/sku/shortfall
   (`buildParams` in `sap-plan.api.ts`, which upper-cases warehouse/sku).
3. `usePlanSummary(filters)` always runs; `usePlanProcurement(filters, enabled)`
   only runs when the Procurement tab is active (`enabled` flag).
4. Summary tab → `SummaryMetaCards` (order/shortfall counts) + `SKUSummaryTable`
   (client-filtered by `status`). Expanding a row lazily calls
   `useSKUDetail(docEntry)` (`SKU_DETAIL` endpoint) for the BOM breakdown.
5. Procurement tab → `ProcurementTable` (aggregated shortfall, suggested
   purchase qty, vendor/lead-time), server-sorted worst-first.
6. On a 502/503 the tab body is replaced by `SAPUnavailableBanner`.

### 3. Stock Benchmark (`stock-level/pages/StockLevelDashboardPage.tsx`)
1. **Deep-link seed:** on mount it reads `?search=` and `?item_group=` from the
   URL (this is where the **stock-alert notification** lands —
   `/dashboards/stock-levels?search=<item>`). Defaults: warehouses
   `['BH-BS','BH-PM']`, status `['healthy','low','critical']`, movement `['recent']`
   (`stock-level.constants.ts`).
2. Item groups come from `useWMSItemGroups` (warehouse module); the filter
   defaults to the packing-material group. The report is **gated until material
   types resolve** (`materialTypesResolved`).
3. **Two queries:** the main `useStockLevels(effectiveFilters + sort + page)`
   for the table, and a **separate stats query** (`page_size: 1`, fixed status
   set) that feeds `StockLevelMetaCards` so the health tiles reflect the full
   filtered population, not the current page.
4. `StockLevelMetaCards` tiles are clickable → `handleStatusCardSelect` narrows
   the status filter. `StockLevelTable` supports server-side sort + pagination.
5. Row expand: `useStockItemDetail(itemCode, warehouses)` runs **only when ≥ 2
   warehouses** are selected (matches the backend grouped view).
6. `?as_of_date=` (if set in filters) routes the request to the experimental
   `AS_OF` endpoint.

### 4. Inventory / Age & Value (`inventory-age/pages/InventoryAgeDashboardPage.tsx`)
1. `useInventoryAgeFilterOptions()` populates dropdowns (item groups, sub-groups,
   warehouses, varieties); default item group = packing material.
2. `useInventoryAgeReport(effectiveFilters, materialTypesResolved)` fetches the
   report. **Only `item_group`, `search`, `min_age` go to the API**; **warehouse,
   sub_group, and variety are filtered client-side** in the page (`filteredItems`),
   and the meta cards + warehouse summary are **recomputed on the client** from
   the filtered rows.
3. Renders `InventoryAgeMetaCards` (totals, value, litres),
   `InventoryAgeWarehouseSummary`, and `InventoryAgeTable` (age buckets, value).
4. Loading state shows "Loading material types." until options resolve; SAP
   errors show the banner.

### 5. Non-Moving (`non-moving/pages/NonMovingDashboardPage.tsx`)
1. `useItemGroups()` fills the group dropdown; default group = packing material
   until the user picks one (`hasSelectedMaterialType`).
2. `useNonMovingReport({ age, item_group })` — only `age` and `item_group` hit
   the API. Default `age = 45`.
3. **Client-side:** the page re-applies the age filter, `sub_group`, and
   `search`, then **groups rows by `branch::item_code`**
   (`groupNonMovingItemsBySku`) — merging multi-warehouse rows into one line and
   keeping the freshest movement date. Those grouped rows now feed **only the
   meta cards** (`filteredSummary`).
4. `NonMovingWarehouseSummary` is the **only** item view — there is no separate
   flat item table. Each warehouse row expands into its items, with the full
   column set (code, name, branch, sub group, quantity, value, days idle,
   status, last movement, consumption), age-coloured rows and its own sortable
   headers; the sort persists as you open other warehouses. Report rows carry
   **no warehouse** (`hana_reader` sets `warehouse: ""`), so the item↔warehouse
   link comes from `warehouse_summary[].items` — the backend's pro-rated split
   of each item across the warehouses where it currently holds stock.
   `buildNonMovingWarehouseGroups` resolves those item codes against the
   client-filtered rows and **recomputes each warehouse's item count, quantity,
   and value** from what survived, so the row totals always match the expanded
   list. A warehouse whose items are all filtered out disappears; if the
   backend omits `items`, the row keeps its server totals and simply doesn't
   expand. Clicking an item code or name inside a warehouse feeds it to the
   search filter.
5. **Factory scope:** only warehouses whose code starts with a
   `FACTORY_WAREHOUSE_PREFIXES` entry (`BH`, `GP`) are shown. C&F depots
   (`PB-*`, `DL-*`) and the backend's `Unassigned` bucket are dropped — so the
   warehouse rows cover **less** stock than the meta cards, which still total
   the whole report. Add a prefix to that constant to widen the scope.

### 6. Sales Planning vs Requirement (`sales-planning-requirement/pages/…`)
1. **Refresh panel** (`SalesPlanningRequirementRefreshPanel`) shows last-success
   timestamp, forecast name, and current status badge. The **Refresh** button is
   disabled unless the user has `REFRESH_SALES_PLANNING_REQUIREMENT` **and** no
   run is in progress; label becomes "No Refresh Access" without the perm.
2. `useSalesPlanningRequirementReport(filters)` (Postgres-backed, fast),
   `…Status()`, and `…Analysis()` run on load. Filters: `search`, `status`
   (all/shortage/po_covered), `page`, `page_size` (default page size from
   constants).
3. `useRefreshSalesPlanningRequirement()` is a **mutation** → POST refresh; on
   success it toasts `"Sales planning refreshed: N rows loaded"` and invalidates
   all sales-planning queries. `sapRetry` here **does not retry** 400/401/403/404/409.
4. Meta cards recompute `total_items` to match the active status filter;
   `SalesPlanningRequirementAnalysis` renders the procedure/column metadata;
   `SalesPlanningRequirementTable` paginates server-side.

---

## Critical business rules & invariants

- **Permission-gated everywhere.** Routes, sidebar entries, and landing cards
  all gate on `DASHBOARDS_PERMISSIONS`. No dashboard renders for a user lacking
  its `VIEW_*` perm.
- **Company scope = header, not query param.** The active company is sent as the
  `Company-Code` header by the interceptor. Four dashboards additionally encode
  `company_id` in their query keys so a company switch refetches; **SAP Plan does
  not** (invariant gap).
- **Default material type** is applied consistently (Stock, Inventory Age,
  Non-Moving) and reports are **suppressed until it resolves** to avoid firing an
  unfiltered, heavy query.
- **502 vs 503 handling is uniform.** `isSAPError` (each page) treats only
  502/503 as "SAP down" and swaps the body for `SAPUnavailableBanner`. 503 shows
  a **Retry** button; 502 shows "SAP Data Error" with **no** retry button.
- **Refresh is the only write** and is permission- and state-guarded (disabled
  while a run is `running`).
- **Client-side filtering** is deliberate on SAP Plan (status), Inventory Age
  (warehouse/sub_group/variety), and Non-Moving (age/sub_group/search + grouping);
  server round-trips are minimised to the coarse filters only.

---

## Integrations & cross-module boundaries

- **Backend SAP dashboards** — the five apps documented in the paired backend
  doc. Endpoint paths live in `api.constants.ts`.
- **`@/core/api`** — `apiClient` (Company-Code header injection, `/api/v1` base,
  `ApiError` with `.status`).
- **`@/core/auth`** — `useAuth().currentCompany` (query-key scoping),
  `usePermission()` (gating), IndexedDB current-company store.
- **Warehouse module** — Stock Benchmark imports `useWMSItemGroups` from
  `@/modules/warehouse/api` for its group dropdown.
- **Notifications** — the backend stock-alert job deep-links into
  `/dashboards/stock-levels?search=<item>`; this page consumes that URL param.
- **Out-of-scope siblings** — Production Movement (`production_execution`) and
  the Dispatch dashboards (`dispatch_plans`) share this module folder and the
  `DASHBOARDS_PERMISSIONS` map but hit different backends; document them with
  their owning modules.

---

## Real-world edge cases

Each: **trigger → current behaviour → operator-visible symptom → risk/gap.**

1. **SAP is temporarily down (503).**
   → Any dashboard's query fails with status 503; `react-query` retries twice,
   then the page swaps to `SAPUnavailableBanner` ("SAP System Unavailable" + Retry).
   → Operator sees an amber banner and can click **Retry** (refetches).
   → Fine; but the ~15 s server connect-timeout means Retry can feel slow.

2. **SAP returns a data error (502).**
   → Banner reads "SAP Data Error" with **no Retry button** (only 503 gets one).
   → Operator must reload the page or change filters to re-trigger.
   → Gap: a transient 502 leaves the user with no in-place retry affordance.

3. **User switches company (via the company picker).**
   → `switchCompany()` runs `queryClient.clear()`, so **all** dashboard caches —
   SAP Plan included — are wiped and refetch fresh under the new `Company-Code`
   header. No stale wrong-company rows via this path.
   → Symptom: a normal loading state, then the new company's data.
   → Residual gap: SAP Plan alone omits `company_id` from its query keys. If the
   active company is changed **without** going through `switchCompany()` (e.g. the
   `authSlice` fallback that reselects a default company when the current one drops
   out of the user's list on a token/permission refresh — no `clear()` there), SAP
   Plan could serve the prior company's cached Summary/Procurement rows until the
   query goes stale. (Fix: add `currentCompany?.company_id` to SAP Plan keys for
   defense-in-depth.)

4. **Sales Planning on an unsupported company (e.g. JIVO_MART).**
   → `report/`/`status/` return empty; `refresh/` returns **400** and the mutation
   toast/`error_message` reflect "not configured for this company".
   → Operator sees an empty table and a failing Refresh.
   → Gap: no explicit "not enabled for this company" message — reads as broken.

5. **Two users (or double-click) hit Refresh.**
   → Server returns **409**; `sapRetry` does not retry 409. The button is already
   disabled while status is `running`.
   → Symptom: nothing visibly happens for the second click; panel stays "running".
   → Working as designed.

6. **Refresh appears stuck on "running".**
   → If a server-side run crashed, the panel shows `running` until the backend's
   4-hour stale-reaper fails it; the button stays disabled.
   → Symptom: "Refreshing…" / disabled button for a long time.
   → Gap: the UI has no "looks stuck?" hint or force option.

7. **Stale snapshot on Sales Planning.**
   → Data is whatever the last successful refresh loaded; the panel shows an old
   "Last refresh" date and forecast name.
   → Symptom: numbers look current but are month-old; only the timestamp reveals it.
   → Risk: decisions on outdated forecast/PO coverage.

8. **Broad filter → huge table.**
   → SAP Plan, Inventory Age, and Non-Moving return **unpaginated** results; a
   wide filter (all groups, `age=0`) yields thousands of rows, all rendered.
   → Symptom: long spinner, sluggish scrolling/sorting.
   → Risk: browser jank; ties to the backend pagination gap.

9. **Non-Moving item counts don't reconcile.**
   → The meta cards count distinct `branch::item_code`, while the warehouse
   panel counts each item once **per warehouse** it holds stock in, on
   backend-pro-rated quantity/value. Both derive from the same filtered rows,
   but an item split across three warehouses counts three times in the panel.
   → Symptom: warehouse item counts sum to more than the "Total Items" card.
   → Risk: users question data integrity; by design for a warehouse breakdown.

10. **Slow-moving item missing from Stock "Critical" tile.**
    → The backend reports slow-moving (>30 days unconsumed) items as `none` and
    excludes them from health counts; the tile/table won't show a genuinely-short
    but dormant item as critical.
    → Symptom: an item you expect under "Critical" isn't there.
    → Risk/gap: by design, but surprising; switch the movement filter to "Slow
    Moving" to find it.

11. **Multi-warehouse selection changes the meaning of the numbers.**
    → Selecting ≥ 2 warehouses switches the backend to grouped mode (summed
    `MinStock`, "N warehouses" label) and enables the item-detail expand.
    → Symptom: benchmark figures jump versus single-warehouse view.
    → Risk: easy to misread the combined benchmark.

12. **Permission present for View but not Refresh (Sales Planning).**
    → Button renders disabled with label "No Refresh Access" and a tooltip.
    → Symptom: user sees data but cannot refresh.
    → Working as designed.

---

## Failure modes / what can break

- **Whole module hidden.** If the user's group lacks every `VIEW_*` dashboard
  perm, the sidebar "Dashboards" entry and all cards disappear. **Symptom:**
  "the dashboards vanished" after a group-permission change (see the platform
  memo on group-perms vs nav gating).
- **Blank dashboard, no error.** A company with no data (e.g. Sales Planning on
  JIVO_MART, or a filter matching nothing) shows an empty table with no banner.
  **Symptom:** looks broken; is actually "no rows".
- **Stale cross-company data on SAP Plan.** Only when the active company changes
  **without** `switchCompany()`/`queryClient.clear()` (edge case 3); the normal
  company picker wipes the cache. **Symptom:** SAP Plan figures don't match the
  selected company until the query goes stale — the other four dashboards are
  immune because they key on `company_id`.
- **Heavy render freeze.** Unpaginated large reports (edge case 8). **Symptom:**
  tab unresponsive while the table mounts.
- **Refresh toast but table unchanged.** If invalidation races or the report
  query is disabled, a successful refresh toast can appear before the table
  visibly updates. **Symptom:** "it said refreshed but I see old rows" until the
  report refetch lands.
- **Filter-options outage.** If `filter-options` / `item-groups` fail, the
  material-type default can't resolve; Inventory Age shows "Loading material
  types." and the report never fires. **Symptom:** perpetual loading with no report.

---

## Improvement opportunities & known gaps

- **Company-scope SAP Plan query keys** (add `currentCompany?.company_id`) to
  match the other four dashboards. The interactive switch is already safe via
  `queryClient.clear()`; this closes the narrow bypass path (non-`switchCompany`
  company changes) as defense-in-depth.
- **Add a Retry affordance for 502** (currently only 503 gets one).
- **Explicit "not enabled for this company"** empty-state for Sales Planning on
  unsupported companies, distinct from a normal empty result.
- **Paginate** the SAP Plan / Inventory Age / Non-Moving tables (or virtualise)
  to handle large result sets; today they render everything.
- **Reconcile Non-Moving counts** between the grouped table and the warehouse
  summary panel, or label them clearly.
- **"Refresh looks stuck?" hint** on the Sales Planning panel after a long
  `running` state.
- **Consolidate `isSAPError`** — it is copy-pasted into every page; extract once.
- **Retire the stale** `sap-plan/docs/README.md`.

---

## Permissions & roles

From `src/config/permissions/dashboards.permissions.ts`:

| Constant | Codename | Controls |
|----------|----------|----------|
| `VIEW_PLAN_DASHBOARD` | `sap_plan_dashboard.can_view_plan_dashboard` | SAP Material Plan route/card/nav |
| `EXPORT_PLAN_DASHBOARD` | `sap_plan_dashboard.can_export_plan_dashboard` | (defined; not wired to a UI action yet) |
| `VIEW_STOCK_DASHBOARD` | `stock_dashboard.can_view_stock_dashboard` | Stock Benchmark + receives stock alerts |
| `VIEW_INVENTORY_AGE` | `inventory_age.can_view_inventory_age` | Inventory (Age) |
| `VIEW_NON_MOVING_RM` | `non_moving_rm.can_view_non_moving_rm` | Non-Moving |
| `VIEW_SALES_PLANNING_REQUIREMENT` | `sales_planning_requirement.can_view_sales_planning_requirement` | Sales Planning view |
| `REFRESH_SALES_PLANNING_REQUIREMENT` | `sales_planning_requirement.can_refresh_sales_planning_requirement` | Enables the Refresh button |
| `VIEW_PRODUCTION_MOVEMENT` | `production_execution.can_view_reports` | Production Movement *(out of scope)* |
| `VIEW_DISPATCH_PLANS` / `EDIT_DISPATCH_PLANS` / `VIEW_DISPATCH_PIPELINE` | `dispatch_plans.*` | Dispatch dashboards *(out of scope)* |

**Nav gating:** the sidebar "Dashboards" parent shows if the user has **any** of
the listed dashboard perms; each child link is gated by its own perm. The
landing page mirrors this with `hasAnyPermission`. Note the module-level nav gate
**omits** Production Movement on purpose (it lives under the Production module),
though its route remains reachable.

---

## Developer file map

**Module-level**
- `src/modules/dashboards/module.config.tsx` — routes + sidebar + permission gates.
- `src/modules/dashboards/pages/DashboardsLandingPage.tsx` — card grid.
- `src/modules/dashboards/utils/itemGroupDefaults.ts` — default "Packing Material" group.
- `src/config/constants/api.constants.ts` — endpoint paths.
- `src/config/permissions/dashboards.permissions.ts` — `DASHBOARDS_PERMISSIONS`.

**Per in-scope dashboard** (`src/modules/dashboards/<name>/`)
- **sap-plan/** — `pages/SAPPlanDashboardPage.tsx`; `api/sap-plan.api.ts` +
  `sap-plan.queries.ts` (`usePlanSummary`, `usePlanProcurement`, `useSKUDetail`);
  `components/` (`PlanDashboardFilters`, `SKUSummaryTable`, `ProcurementTable`,
  `SummaryMetaCards`, `SKUDetailPanel`, `SAPUnavailableBanner` — the shared banner);
  `constants/sap-plan.constants.ts`; `types/sap-plan.types.ts`.
- **stock-level/** — `pages/StockLevelDashboardPage.tsx`;
  `api/stock-level.{api,queries}.ts` (`useStockLevels`, `useStockItemDetail`);
  `components/` (`StockLevelFilters`, `StockLevelMetaCards`, `StockLevelTable`,
  `StockItemDetailPanel`); `constants/stock-level.constants.ts` (defaults, stale time).
- **inventory-age/** — `pages/InventoryAgeDashboardPage.tsx`;
  `api/inventory-age.{api,queries}.ts` (`useInventoryAgeFilterOptions`,
  `useInventoryAgeReport`); `components/` (`InventoryAgeFilters`, `…MetaCards`,
  `…Table`, `…WarehouseSummary`).
- **non-moving/** — `pages/NonMovingDashboardPage.tsx`;
  `api/non-moving.{api,queries}.ts` (`useNonMovingReport`, `useItemGroups`);
  `utils/nonMovingGrouping.ts` (`groupNonMovingItemsBySku`, +test);
  `components/` (`NonMovingFilters`, `…MetaCards`, `…Table`, `…WarehouseSummary`).
- **sales-planning-requirement/** — `pages/SalesPlanningRequirementDashboardPage.tsx`;
  `api/sales-planning-requirement.{api,queries}.ts` (`useSalesPlanningRequirementReport`,
  `…Status`, `…Analysis`, `useRefreshSalesPlanningRequirement`);
  `components/` (`…RefreshPanel`, `…Filters`, `…MetaCards`, `…Analysis`, `…Table`);
  `types/sales-planning-requirement.types.ts`.

**Out-of-scope siblings (same folder):** `production-movement/`,
`dispatch-pipeline/`, `dispatch-fulfilment/`, `dispatch-plans/`, `blowing/`.

**`blowing/`** is the one dashboard with **no `api/` folder of its own** — it
reads the blowing feature module's hooks (`@/modules/production/blowing/api`:
`useMonthlyReport`, `useDailyReport`, `useRuns`, `useMakeVsBuy`, `useVariances`,
`useMachines`) so its numbers are identical to the Blowing section's own Reports
page. Month drives every panel except the machine/preform split, which follows a
separate day picker because `/blowing/reports/daily/` is single-date. Files:
`pages/BlowingDashboardPage.tsx`; `components/` (`BlowingFilters`,
`BlowingKpiStrip`, `BlowingCostBreakdown`, `BlowingTrend`, `BlowingDayBreakdown`,
`BlowingRunsTable`, `BlowingMakeVsBuyPanel`, `BlowingVariancePanel`);
`constants/blowing-dashboard.constants.ts`; `types/blowing-dashboard.types.ts`.

---

## Related docs

- **Paired backend doc:** `C:/Users/gurpa/dev/factory_app/docs/dashboards_overview.md`
  (`../../../factory_app/docs/dashboards_overview.md`).
- Older/partially-stale design notes in this repo: `docs/modules/dashboard.md`,
  `sap-plan-dashboard.md`, `sap-plan-dashboard-frontend.md`, `stock-benchmark.md`,
  `stock-benchmark-snapshot-plan.md` (verify against current code before relying on them).
- Superseded: `src/modules/dashboards/sap-plan/docs/README.md` (stale — do not trust).
