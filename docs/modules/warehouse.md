# Warehouse — Frontend (BOM Issue Requests, FG Receipt & WMS Dashboards)

> Module: `src/modules/warehouse` · React + Vite + TanStack Query
> Paired backend doc: `C:/Users/gurpa/dev/factory_app/warehouse/docs/README.md`

The Warehouse module is the store operator's cockpit. It has three surfaces:

1. **BOM Requests** — review material requests from production, approve/partially-
   approve line quantities against live stock, and issue approved materials to SAP.
2. **FG Receipts** — receive finished goods off completed+QC-passed runs and post
   them to SAP.
3. **WMS dashboards** (`/wms/*`) — read-only stock, movement, transfer, batch-expiry,
   sales-backlog, billing and warehouse-comparison analytics from SAP HANA.

> This module folder **also** contains **BST** (`pages/bst/*`, Branch Stock Transfer
> — the only surface here with camera/barcode scanning) and the **GRPO** submodule
> (`grpo/`). Those have their own docs
> ([bst.md](./bst.md), [grpo.md](./grpo.md)); this page covers **BOM/FG + WMS**.
>
> The `/wms/*` pages here are HANA read dashboards served by the Django `warehouse`
> app. They are **not** the separate bin/pallet WMS app documented in [wms.md](./wms.md).

---

## Overview — screens & who uses them

| Screen | Route | Component | Primary user |
|--------|-------|-----------|--------------|
| Warehouse landing | `/warehouse` | `WarehouseDashboardPage` | Everyone (cards self-filter) |
| BOM Requests list | `/warehouse/bom-requests` | `BOMRequestListPage` | Store reviewer |
| BOM Request detail | `/warehouse/bom-requests/:requestId` | `BOMRequestDetailPage` | Store reviewer/issuer |
| FG Receipts | `/warehouse/fg-receipts` | `FGReceiptListPage` | Store receiver |
| WMS Dashboard | `/wms` | `WMSDashboardPage` | Store / manager |
| Stock Tracker | `/wms/stock` | `StockTrackerPage` (+ `ItemDetailModal`) | Store / manager |
| Billing Tracker | `/wms/billing` | `BillingTrackerPage` | Manager / accounts |
| Transfers | `/wms/transfers` | `TransferActivityPage` | Store / manager |
| Batch Expiry | `/wms/batches` | `BatchExpiryPage` | Store / QA |
| Order Backlog | `/wms/orders` | `SalesOrderBacklogPage` | Dispatch / planning |
| Warehouses | `/wms/warehouses` | `WarehouseComparisonPage` | Manager |

Routes and sidebar are declared in `src/modules/warehouse/module.config.tsx`.

---

## Key concepts & entities (client types)

Types live in `src/modules/warehouse/types/`:

- **`warehouse.types.ts`** — `BOMRequest`, `BOMRequestDetail` (adds `lines` +
  `sap_issue_doc_entries`), `BOMRequestLine`, `FGReceipt`, `StockInfo`, and the
  payload types. Status unions mirror the backend: `BOMRequestStatus`,
  `MaterialIssueStatus`, `FGReceiptStatus`.
- **`wms.types.ts`** — dashboard/stock/movement/transfer/batch/backlog/billing
  response shapes and `StockStatus` (`NORMAL|LOW|CRITICAL|OVERSTOCK|ZERO`).

A **BOM request line** shows `required_qty`, live `available_stock`, `approved_qty`,
`issued_qty`, `warehouse`. An **FG receipt** shows `good_qty` (derived server-side),
`rejected_qty`, `status`, and `sap_receipt_doc_entry` once posted.

---

## End-to-end flows (what the operator does)

### Flow 1 — Review & approve a BOM request

1. Operator opens **BOM Requests**, filters by status (default *All*), clicks a row.
2. `BOMRequestDetailPage` loads the detail (`useBOMRequestDetail`), whose lines are
   enriched by the server with **live stock**. Each line shows In-Stock coloured
   green (≥ required) / amber (partial) / red (none).
3. Per line the UI **pre-fills an approval**: `approved_qty = min(required, stock)`,
   status `APPROVED` if stock > 0 else `REJECTED`. The quantity input is **hard-
   capped at available stock** (`maxApprovalQty`) and disabled when stock is 0.
4. Operator tweaks per line (approve ✓ / reject ✗), then **Approve** (`useApproveBOMRequest`)
   or **Reject** with a reason (`useRejectBOMRequest`). Approve is disabled unless at
   least one line has stock. A partial approval toasts "partially approved".
5. Once `APPROVED`/`PARTIALLY_APPROVED` and not fully issued, **Issue Materials to
   SAP** appears. The confirm dialog explains it creates a SAP Goods Issue
   (`InventoryGenExits`) for all approved-remaining qty; `useIssueMaterials` posts it.
   Posted SAP docs are listed under **SAP Issue Documents**.

### Flow 2 — Receive & post finished goods

1. Operator opens **FG Receipts**, filters by status.
2. For a `PENDING` row → **Receive** (dialog → `useReceiveFG`). Row → *Received*.
3. For a `RECEIVED` **or** `FAILED` row → **Post to SAP** (dialog explains it creates
   an `InventoryGenEntries` Goods Receipt; `usePostFGToSAP`). Row → *SAP Posted* with
   a `SAP #<docEntry>` badge. Any `sap_error` from a prior attempt is shown in the
   dialog. (Note: per the backend, a failed post usually leaves the row **Received**,
   not **Failed** — see Failure modes.)

### Flow 3 — WMS analytics

- **Dashboard** (`WMSDashboardPage`) — KPI cards + Recharts (stock by warehouse,
  health donut, item-group pie, top-10 by value, recent movements). A warehouse
  `<select>` re-queries scoped data.
- **Stock Tracker** (`StockTrackerPage`) — search + warehouse + item-group + stock
  filter, server-paginated table (50/page), **CSV export** of the current page, and
  an **eye** icon opening `ItemDetailModal` (per-item warehouse breakdown via
  `useItemDetail`). Changing any filter resets to page 1.
- The remaining WMS pages are filtered read tables over their respective endpoints.

---

## State, offline behaviour & scanning

- **Server state** is TanStack Query. Keys: `WAREHOUSE_QUERY_KEYS` (BOM/FG) and
  `WMS_QUERY_KEYS` in `api/warehouse.queries.ts` / `api/wms.queries.ts`.
- **Mutations invalidate broadly:** every BOM/FG mutation invalidates
  `WAREHOUSE_QUERY_KEYS.all` **and** `['production-execution']`, so the production
  run screen's `warehouse_approval_status` and FG state refresh in lockstep.
- **Local approval state** in `BOMRequestDetailPage` is component `useState`
  (`approvals` keyed by line id) — it is **not persisted**; navigating away or
  refreshing discards unsaved approvals.
- **No offline / no scanning** on BOM/FG/WMS. These are online form + table screens.
  Camera/barcode scanning lives only in **BST** (`pages/bst/BoxScanCamera.tsx`) and
  GRPO — see their docs.
- **Errors** are surfaced by the global axios interceptor as toasts; the BOM/FG
  pages `try/catch` and swallow, relying on the interceptor's message. WMS pages use
  `DashboardLoading` / `DashboardError` states.

---

## Critical business rules & invariants (client-enforced)

- **Approve qty can't exceed stock.** The input `max` and value clamp to
  `available_stock`; the ✓ button is disabled when stock is 0. (The server also
  enforces this and rejects the whole call if violated.)
- **Approve needs at least one in-stock line**, else the button is disabled and a
  toast fires ("No materials have stock available to approve").
- **Reject requires a reason** (button disabled until non-empty).
- **Action visibility is status-driven:** Receive only on `PENDING`; Post to SAP
  only on `RECEIVED`/`FAILED`; Issue only when approved and not `FULLY_ISSUED`.
- **FG quantities are read-only** — `good_qty` comes from the run; the UI never lets
  the operator edit produced/good/rejected.

---

## Integrations & cross-module boundaries

- **API endpoints:** `API_ENDPOINTS.WAREHOUSE` in
  `src/config/constants/api.constants.ts` (BOM, `.../issue/`, `stock/check/`, FG,
  and all `wms/*` reads). `wms.api.ts` reuses the **same** `WAREHOUSE` endpoint
  group — the WMS dashboards are `warehouse`-app routes.
- **Production Execution.** The run screen submits BOM requests and creates FG
  receipts (production-side perms); this module is the review/issue/receive/post
  side. Shared cache key `['production-execution']` keeps both in sync.
- **GRPO submodule** is spread into these routes via `grpoRoutes` / `grpoNavChildren`
  and nested under the Warehouse sidebar group.
- **BST** shares the module folder and the Warehouse sidebar group.
- The `/wms/*` analytics are distinct from the separate bin/pallet **WMS app**
  (`wms.permissions.ts`, [wms.md](./wms.md)); don't confuse the two when wiring nav.

---

## Real-world edge cases

Each: **trigger → current behaviour → operator-visible symptom → risk/gap.**

1. **Line has stock in another warehouse.** → UI shows total company stock as
   available and lets the operator approve. → Approve succeeds, then **Issue fails**
   with a SAP error toast. → *Gap:* the "In Stock" figure isn't the issuing
   warehouse's stock (see backend doc, edge case 1).

2. **Stock changes after approval.** → No re-approve path (request no longer
   `PENDING`). → **Issue to SAP** button errors ("SAP issue failed…"); the operator
   can't easily fix it from the UI. → Stuck request.

3. **FG post fails at SAP.** → Backend rolls back the `FAILED` write, so the list
   still shows **Received** and the dialog's "Previous error" box stays empty. →
   Operator sees only a red toast, badge unchanged; they click **Post to SAP** again.
   → *Confusing:* no persistent failure indicator (this is the backend's key gap).

4. **Double-clicking Receive / Post.** → Buttons disable while `isPending`
   (`isActing`), and the server dedupes/guards. → Second click no-ops or 400s
   cleanly. → Safe.

5. **WMS dashboard on a big company with no warehouse filter.** → Backend fetches
   the whole item×warehouse set; the page shows `DashboardLoading` for a long time.
   → Slow first paint. → Mitigation: pick a warehouse in the `<select>`.

6. **Unsaved approvals + navigation.** → Local `approvals` state is dropped on route
   change/refresh (no draft persistence). → Operator loses in-progress toggles with
   no warning. → Minor data-entry risk on long BOMs.

7. **Empty states.** → No requests/receipts/rows → each page renders a friendly
   empty card ("No BOM requests found", etc.) rather than an error. → Clear.

---

## Failure modes / what an operator notices

- **SAP down / rejects during Issue or Post** → red toast with the SAP message; the
  BOM request or FG row stays in its pre-action status. For FG, the badge stays
  **Received** (the `FAILED` state doesn't persist server-side).
- **HANA unavailable** on a WMS page → `DashboardError` panel (WMS dashboard) or an
  empty/failed table; the backend returns HTTP 500 `{"error": …}`.
- **Permission missing** → the route/nav item simply doesn't render (see below); a
  deep-linked user without the perm is bounced by route gating.
- **Stale data after another user acts** → resolved on next refetch; mutations here
  invalidate aggressively so the acting user sees fresh data immediately.

---

## Improvement opportunities & known gaps

- **Surface FG post failures** once the backend persists `FAILED`/`sap_error`
  (today the badge never flips to Failed).
- **Show issuing-warehouse stock**, not company-wide totals, on the approval screen
  to prevent approve-then-issue-fails.
- **Warn on unsaved approvals** before navigation, or persist a draft.
- **WMS default warehouse scope** (or server-side pagination) to speed first load on
  large companies.
- **Consistent WMS gating** — every `/wms/*` route keys off `VIEW_BOM_REQUEST`, so a
  store user with only FG perms can't see WMS analytics; revisit if that's not intended.

---

## Permissions & roles (nav gating)

Permission constants: `src/config/permissions/warehouse.permissions.ts`
(`WAREHOUSE_PERMISSIONS`). Gating is declared in `module.config.tsx` and mirrored by
the landing cards in `WarehouseDashboardPage`.

- **Warehouse landing** (`/warehouse`) — **no** permission; reachable by all
  authenticated users. The **cards filter individually** by permission
  (`WarehouseDashboardPage.WAREHOUSE_SECTIONS`), so a user sees only the sections
  they hold.
- **Warehouse sidebar group** shows if the user holds **any** of
  `VIEW_BOM_REQUEST`, `VIEW_FG_RECEIPT`, `VIEW_BST`, or `GRPO.VIEW_PENDING`; each
  child filters on its own perm (`bom-requests` → `VIEW_BOM_REQUEST`, `fg-receipts`
  → `VIEW_FG_RECEIPT`, `bst` → `VIEW_BST`, GRPO children via `grpoNavChildren`).
- **BOM detail/list, WMS group and every `/wms/*` route** → `VIEW_BOM_REQUEST`.
- **FG Receipts** → `VIEW_FG_RECEIPT`.
- **BST routes** → `VIEW_BST` / `CREATE_BST` / `MANAGE_BST` as appropriate.
- Approve/Issue/Receive/Post buttons are shown by page state; the **server** enforces
  `can_approve_bom_request` / `can_issue_materials` / `can_receive_fg` /
  `can_post_fg_to_sap` (the client does not separately hide these by perm, so a
  viewer-only user who reaches the screen gets a 403 toast on action).

> Backend group split (`BOM & FG Store` vs `production_execution`) is described in the
> paired backend doc — production users deliberately lack `can_view_bom_request`, so
> the Warehouse module stays hidden from them.

---

## Developer file map

**Frontend (`src/modules/warehouse/`)**

- `module.config.tsx` — routes + sidebar (Warehouse group, WMS group, BST, GRPO).
- `pages/WarehouseDashboardPage.tsx` — permission-filtered landing cards.
- `pages/BOMRequestListPage.tsx`, `pages/BOMRequestDetailPage.tsx` — BOM review/approve/issue.
- `pages/FGReceiptListPage.tsx` — receive + post FG (with action dialog).
- `pages/WMSDashboardPage.tsx`, `StockTrackerPage.tsx`, `BillingTrackerPage.tsx`,
  `WarehouseComparisonPage.tsx`, `TransferActivityPage.tsx`, `BatchExpiryPage.tsx`,
  `SalesOrderBacklogPage.tsx` — WMS reads.
- `components/ItemDetailModal.tsx` — per-item warehouse breakdown.
- `api/warehouse.api.ts` + `api/warehouse.queries.ts` — BOM/FG endpoints + hooks.
- `api/wms.api.ts` + `api/wms.queries.ts` — WMS endpoints + hooks.
- `types/warehouse.types.ts`, `types/wms.types.ts`.
- `pages/bst/*`, `grpo/*` — sibling submodules (separate docs).

**Config**

- `src/config/constants/api.constants.ts` → `API_ENDPOINTS.WAREHOUSE`.
- `src/config/permissions/warehouse.permissions.ts` → `WAREHOUSE_PERMISSIONS`.

---

## Related docs

- **Paired backend doc:** `C:/Users/gurpa/dev/factory_app/warehouse/docs/README.md`
- **BST:** [bst.md](./bst.md) · backend `warehouse/docs/bst.md`
- **GRPO:** [grpo.md](./grpo.md) · `src/modules/warehouse/grpo/docs/README.md`
- **Bin/pallet WMS app (different module):** [wms.md](./wms.md)
- **Production:** [production.md](./production.md) · **QC:** [qc.md](./qc.md)
