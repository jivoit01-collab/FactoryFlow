# Marketplace Module — Developer Guide

Scan-driven **outward dispatch** and **inward returns** for marketplace channels
(**Flipkart**, **Amazon**), anchored on the marketplace **Order ID**.

The business reason this module exists: marketplace sales have **no SAP sales invoice**. So JI
decrements stock in SAP (via a Delivery Note) but issues its **own internal, non-SAP billing
document**. Combos are expanded in JI as a **sales-BOM replacement**.

| | |
|---|---|
| **Frontend** | `FactoryFlow/src/modules/marketplace/` — repo `FactoryFlow`, branch `main` |
| **Backend** | `factory_app/marketplace/` — repo `factory_app`, branch `main` |
| **Route prefix** | `/marketplace` |
| **API prefix** | `/api/v1/marketplace/` (`config/urls.py` → `marketplace.urls`) |

> **Both repos must be on `main`.** `factory_app`'s `marketplace` app exists **only on `main`** —
> it is absent from older feature branches (e.g. `feature/warehouse-location-pallet-scan`). If you
> check out an old backend branch, every page in this module 404s and it *looks* like the backend
> was never written.

---

## 1. The five screens

| Page | Route | Gate | Purpose |
|---|---|---|---|
| Overview | `/marketplace` | operator | Recent dispatches per channel + quick links |
| **Outward** | `/marketplace/outward` | operator | Pick order → scan FG → confirm → SAP delivery note + internal bill |
| **Inward** | `/marketplace/inward` | operator | Scan returned items → submit → internal credit doc |
| Masters | `/marketplace/masters` | admin | SKU→FG mappings, Combos, channel→SAP warehouse links |
| Reconciliation | `/marketplace/reconciliation` | admin | Outward↔Inward and Portal↔Physical deviations |

The core idea: **a marketplace SKU is not a warehouse item.** Masters translate a marketplace SKU
(FSN/ASIN) into real item codes, expanding combos into **FG** (finished goods) and **PM** (packing
material) lines. The scan flows then verify the physical goods match that expansion before anything
touches SAP.

---

## 2. File map

### Frontend — `FactoryFlow/src/modules/marketplace/`
```
index.ts                       # public surface
module.config.tsx              # routes + sidebar nav + permission gates
types/marketplace.types.ts     # domain types (mirror the DRF serializers)
api/marketplace.api.ts         # thin axios wrapper, 1 fn per endpoint
api/marketplace.queries.ts     # React Query keys, hooks, invalidation
components/MpChannelSelect.tsx # Flipkart/Amazon segmented control
components/MpScanPanel.tsx     # scan capture (reuses the WMS scanner)
components/MpProgressTable.tsx # required-vs-scanned table
pages/MpOverviewPage.tsx  MpOutwardPage.tsx  MpInwardPage.tsx
pages/MpMastersPage.tsx   MpReconciliationPage.tsx
```
Registered in `src/app/registry/index.ts`. Permissions live in
`src/config/permissions/marketplace.permissions.ts`; endpoint strings in
`src/config/constants/api.constants.ts` (`API_ENDPOINTS.MARKETPLACE`).

### Backend — `factory_app/marketplace/`
```
models.py            # 10 models (masters, orders, dispatch, returns, billing)
serializers.py       # list vs detail serializers; detail computes progress
views.py             # 512 lines, plain APIViews (no DRF ViewSets/pagination)
urls.py              # matches the frontend endpoint table exactly
permissions.py       # one BasePermission class per custom codename
services/
  resolve_service.py        # SKU → FG/PM lines (combo expansion + aggregation)
  scan_service.py           # scan capture, duplicate/over-scan rules, progress
  confirm_service.py        # the atomic confirm: validate → SAP → billing
  sap_gateway.py            # SAP boundary; simulate mode for dev
  reconciliation_service.py # per-order deviation report
  errors.py                 # MarketplaceError → {code, error, detail}
migrations/0002_marketplace_group.py  # creates the "Marketplace" auth group
management/commands/seed_marketplace_demo.py  # idempotent demo data
tests.py             # 9 tests
```

---

## 3. Architecture — strict one-way layering

**Frontend**
```
types ──► api (axios) ──► queries (React Query) ──► components / pages
                                                        ▲
module.config (routes + nav + perms) ────────────────────┘
```
- Pages **never** call `marketplaceApi` directly — always a hook from `marketplace.queries.ts`.
- `marketplace.api.ts` is stateless and maps 1:1 to endpoints.
- Endpoint strings live only in `API_ENDPOINTS.MARKETPLACE`.

**Backend**
```
views (thin: auth, company scope, serialize) ──► services (all business rules) ──► models
                                                     │
                                                     └──► sap_gateway ──► SAP
```
**All business logic lives in `services/`.** Views only resolve the object, check permissions, call
a service, and serialise. Keep it that way.

---

## 4. Domain model

### Masters
- **`MarketplaceWarehouse`** — channel → SAP godown. Carries `sap_warehouse_code`,
  `sap_customer_card_code` (the DN's `CardCode`), `facility_code`.
  Unique on `(company, channel, sap_warehouse_code)`.
- **`ComboDefinition` + `ComboComponent`** — a JI-authored sales BOM. Each component is
  `{component_type: FG|PM, item_code, quantity /* per 1 combo unit */, uom}`.
- **`SkuMapping`** — the translation table. `sku_type = RAW` → one `fg_item_code`;
  `sku_type = COMBO` → FK to a `ComboDefinition`. Unique on `(company, channel, marketplace_sku)`.

### Orders
`MarketplaceOrder` (unique on `company, channel, order_id`) + `MarketplaceOrderLine`
(`marketplace_sku`, `ordered_quantity`). Status: `OPEN | DISPATCHED | RETURNED | PARTIAL`.

### Sessions
- **`MarketplaceDispatch`** — `DRAFT → SCANNING → READY → CONFIRMED` (or `CANCELLED`).
  On confirm gains `sap_delivery_note_doc_entry/_num` and FK to `MarketplaceOrderBilling`.
- **`MarketplaceReturn`** — `DRAFT → SCANNING → SUBMITTED` (or `CANCELLED`), gains
  `internal_credit_doc_num`.
- **`MarketplaceScan` / `MarketplaceReturnScan`** — unique on `(session, barcode_raw)`; **that
  constraint is how a duplicate scan is detected.**
- **`MarketplaceOrderBilling`** — the internal, non-SAP invoice (`invoice_number` is globally
  unique).

### Order resolution — the central transform (`resolve_service.resolve_order`)
```
order.lines[]  { marketplace_sku, ordered_quantity }
        │
        ├─ no active SkuMapping ──────────────► unmapped_skus[]   (blocks confirm)
        ├─ RAW   → 1 FG line, qty = ordered
        └─ COMBO → 1 line per component, qty = ordered × component.quantity
        │
        └──► aggregated by (UPPER(item_code), component_type) ──► resolved_lines[]
             { item_code, item_name, component_type, required_quantity, uom,
               warehouse_code /* = order.sap_warehouse_code */, source_skus[] }
```
**Operators scan FG lines only.** PM lines are never scanned — they are consumed automatically at
confirm (SAP Goods Issue) and shown as a footnote in Outward.

---

## 5. Flows

### 5.1 Outward
```
choose channel → pick order (list) or type/scan Order ID
      │
      ▼  POST /dispatches/ {channel, order_id}      ← IDEMPOTENT (see below)
   dispatch.id
      │
      ▼  GET /dispatches/{id}/  → scans, resolved_lines, progress, unmapped_skus
      │
   ┌──┴─────────────────────────────────────────────┐
   │ scan loop: POST /dispatches/{id}/scans/         │  invalidates ONLY dispatch(id)
   │  · item not on order        → 400 ITEM_NOT_ON_ORDER
   │  · same barcode again       → 200 {duplicate: true}, no new row
   │  · would exceed required    → 400 OVER_SCAN
   │  · else creates scan, status → SCANNING or READY
   └──┬─────────────────────────────────────────────┘
      ▼  POST /dispatches/{id}/confirm/ {override_deviation}
   @transaction.atomic:
      unmapped SKUs?      → 409 UNMAPPED_SKUS
      UNDER/OVER lines?   → 409 SCAN_DEVIATION  (unless override_deviation)
      verify stock        → 409 INSUFFICIENT_STOCK
      SAP Delivery Note (FG, decrements stock)
      SAP Goods Issue     (PM consumption)
      internal billing doc  MKT-YYYYMMDD-00001
      dispatch → CONFIRMED, order → DISPATCHED
```
Frontend confirm button is disabled when `unmapped_skus.length > 0`, or when not every progress row
is `COMPLETE` and the operator hasn't ticked **Override scan deviation**. The backend re-checks both.

`POST /dispatches/` returns the **existing non-cancelled dispatch** for that order if one exists
(HTTP 200) and only creates a new one otherwise (HTTP 201). So re-opening an order does *not*
create orphan drafts. `confirm` and `submit` are likewise idempotent.

### 5.2 Inward
Same shape, simpler: `POST /returns/` → scan loop → `POST /returns/{id}/submit/` →
`internal_credit_doc_num` (`CRD-YYYYMMDD-00001`). No unmapped-SKU gate, no override, **and no
over-scan guard** (see gotchas).

### 5.3 Masters
Three tabs (SKU Mappings / Combos / Warehouses), each list + upsert + delete, scoped by channel.
SKU mappings also support bulk import: `POST /sku-mappings/import/ {rows}` → `{imported, skipped, errors}`.

### 5.4 Reconciliation
`GET /reconciliation/?channel&from_date&to_date&order_id`. Per order+item:
```
portal   = required_quantity (from resolve)      outward = Σ confirmed dispatch scans
inward   = Σ return scans                        physical = outward − inward
outward_vs_inward_deviation = outward − inward
portal_vs_physical_deviation = portal − physical
```
The frontend's **"only deviations"** toggle filters client-side on `row.has_deviation`.

---

## 6. API contract

All paths under `/api/v1`. Source of truth: `API_ENDPOINTS.MARKETPLACE` ↔ `marketplace/urls.py`.

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/marketplace/warehouses/` | `?channel` | `MarketplaceWarehouse[]` |
| POST/PATCH/DELETE | `/marketplace/warehouses/[{id}/]` | upsert | `MarketplaceWarehouse` |
| GET | `/marketplace/sku-mappings/` | `?channel,status,search` | `SkuMapping[]` |
| POST/PATCH/DELETE | `/marketplace/sku-mappings/[{id}/]` | upsert | `SkuMapping` |
| POST | `/marketplace/sku-mappings/import/` | `{rows[]}` | `{imported, skipped, errors}` |
| GET | `/marketplace/combos/` | `?channel` | `ComboDefinition[]` |
| POST/PATCH/DELETE | `/marketplace/combos/[{id}/]` | upsert | `ComboDefinition` |
| GET | `/marketplace/orders/` | `?channel,status,search` | `MarketplaceOrder[]` |
| GET | `/marketplace/orders/resolve/` | `?channel,order_id` | `ResolvedOrder` |
| GET | `/marketplace/dispatches/` | `?channel,status` | `MarketplaceDispatch[]` (**max 200**) |
| POST | `/marketplace/dispatches/` | `{channel, order_id}` | existing (200) or new (201) dispatch |
| GET | `/marketplace/dispatches/{id}/` | — | dispatch **+ scans, resolved_lines, progress, unmapped_skus** |
| POST | `/marketplace/dispatches/{id}/scans/` | `{barcode_raw, item_code?, quantity?}` | `MpScan` (`duplicate?`) |
| DELETE | `/marketplace/dispatches/{id}/scans/{scanId}/` | — | 204, status recomputed |
| POST | `/marketplace/dispatches/{id}/confirm/` | `{override_deviation?, remarks?}` | dispatch |
| POST | `/marketplace/dispatches/{id}/cancel/` | `{reason?}` | dispatch |
| GET/POST | `/marketplace/returns/[{id}/]` | `{channel, order_id}` | `MarketplaceReturn` |
| POST | `/marketplace/returns/{id}/scans/` | `ScanRequest` | `MpReturnScan` |
| POST | `/marketplace/returns/{id}/submit/` | `{remarks?}` | return |
| GET | `/marketplace/reconciliation/` | `?channel,from_date,to_date,order_id` | `ReconciliationReport` |

**Conventions**
- Lists return a **bare JSON array** — there is no DRF pagination on these views, and the frontend
  api layer does **not** unwrap a `{results: []}` envelope.
- **Decimals serialise as strings.** Don't `parseFloat` and round-trip; compare/sum server-side.
- Business errors return `{code, error, detail?}` with a meaningful status
  (`400` scan rules, `409` state/deviation/stock). Codes: `ITEM_NOT_ON_ORDER`, `OVER_SCAN`,
  `UNMAPPED_SKUS`, `SCAN_DEVIATION`, `INSUFFICIENT_STOCK`, `NO_WAREHOUSE`, `INVALID_STATE`.

---

## 7. Permissions

Custom codenames are declared in model `Meta.permissions` and bundled into a **`Marketplace`** auth
group by `migrations/0002_marketplace_group.py`. They are **not** Django's default
`add_/change_/delete_` codenames.

| Codename | Guards |
|---|---|
| `view_dispatch` `add_dispatch` `scan_dispatch` `confirm_dispatch` `cancel_dispatch` | Outward |
| `view_return` `add_return` `submit_return` | Inward |
| `view_master` `change_master` | Masters |
| `view_reconciliation` | Reconciliation |

Frontend bundles (`src/config/permissions/marketplace.permissions.ts`):
- `MARKETPLACE_ACCESS` → Overview, Outward, Inward
- `MARKETPLACE_ADMIN_ACCESS` → Masters, Reconciliation

`ProtectedRoute` grants access if the user has **any** listed permission (`requireAll` is false).
The sidebar group uses `modulePrefix: 'marketplace'`, hiding the whole menu from users with no
`marketplace.*` permission. Backend enforces per-view via `permissions.py`.

---

## 8. Caching (React Query)

Keys namespaced under `['marketplace', ...]` (`MARKETPLACE_QUERY_KEYS`).

| Data | `staleTime` |
|---|---|
| warehouses, sku mappings, combos | 60 s |
| orders, dispatches, returns, reconciliation | 30 s |
| dispatch / return **detail** | 15 s |

Invalidation is deliberate — **preserve it**:
- **scan / remove-scan** invalidate **only** `dispatch(id)` / `return(id)`. A barcode gun fires
  rapidly; invalidating the whole subtree per scan would refetch orders and masters every time.
- **everything else** (create, confirm, cancel, submit, master edits) → `invalidateMarketplace()`.

---

## 9. Gotchas & real bugs

**Confirmed bugs — worth fixing**

1. **Reconciliation flags every dispatched order as deviating.**
   In `reconciliation_service.build_report`: `physical = out - inw` and `ovi = out - inw` are the
   *same expression*, then `has_dev = ovi != 0 or pvp != 0`. A normal order (out=5, inw=0) gives
   `ovi = 5` → `has_deviation = True`, even though `pvp = 0`. So `orders_with_deviation` ≈ every
   confirmed order, and the UI's "only deviations" filter hides nothing. `outward_vs_inward_deviation`
   almost certainly shouldn't be `out − inw`.

2. **Confirm ignores the order's warehouse.** `confirm_service._warehouse_for()` picks the
   **first active** `MarketplaceWarehouse` for the channel (`.order_by("id").first()`), ignoring
   `dispatch.sap_warehouse_code`. Meanwhile `resolve_service` stamps each line's `warehouse_code`
   from `order.sap_warehouse_code`, and `sap_gateway` posts DN lines with
   `l["warehouse_code"] or warehouse_code`. Net effect: **stock is verified against the master
   warehouse but the Delivery Note may post from the order's warehouse.** Multi-godown channels
   will misbehave.

3. **SAP writes are not covered by the DB transaction.** `confirm_dispatch` is
   `@transaction.atomic`, but the Delivery Note and Goods Issue are external. If the GI or the
   billing insert fails *after* the DN succeeded, Django rolls back the DB and **leaves an orphan
   SAP delivery note** that JI has no record of.

4. **Document numbers race.** `_next_invoice_number()` (and the credit-doc equivalent in
   `ReturnSubmitView`) use `count() + 1`. Two concurrent confirms produce the same
   `invoice_number`, which is `unique=True` → `IntegrityError`. Needs a sequence or
   `select_for_update`.

5. **Returns have no over-scan guard.** `record_dispatch_scan` raises `OVER_SCAN`;
   `record_return_scan` does not. So `MpProgressStatus.OVER` is effectively reachable only on the
   Inward flow.

**Sharp edges**

6. **`GET /dispatches/` is capped at `qs[:200]`** with no pagination and no indication of
   truncation. The Overview page will silently stop showing older dispatches.
7. **No DRF pagination anywhere** in this app. If it's ever switched on, every frontend list
   silently becomes `[]` (the api layer reads `data`, not `data.results`).
8. **`MARKETPLACE_SIMULATE_SAP` defaults to `DEBUG`.** In dev, SAP calls are skipped and synthetic
   `SIMDN-…` / `SIMGI-…` numbers are returned, and `verify_stock` is a **no-op**. Don't mistake a
   green dev confirm for a working SAP integration.
9. **`verify_stock` is best-effort in real mode too** — it silently skips if `WMSHanaReader` is
   unavailable or lacks `get_available_stock`. A confirm can proceed with no stock check at all.
10. **Cross-module coupling:** `MpScanPanel` imports `WmsScanButton` from `@/modules/wms`. Changing
    the WMS scanner's props breaks Marketplace. It is this module's only outward dependency.
11. **`MpProgressTable` keys rows on `item_code` alone.** Safe today (progress is FG-only), but it
    breaks the moment a PM line enters `progress[]`. Prefer `` `${item_code}:${component_type}` ``.
12. **Frontend has zero tests.** Backend has 9 (`marketplace/tests.py`) covering resolve, duplicate
    scan, over-scan, item-not-on-order, ready transition, confirm, and the under-scan block.

---

## 10. Local setup

```bash
# backend (repo: factory_app, branch main)
python manage.py migrate                       # creates the "Marketplace" auth group
python manage.py seed_marketplace_demo --company JIVO_MART   # idempotent demo data
# MARKETPLACE_SIMULATE_SAP defaults to DEBUG → SAP calls are simulated

# frontend (repo: FactoryFlow, branch main)
npm run dev
```
Assign the **Marketplace** group (or the individual codenames) to your user, or the sidebar entry
stays hidden.

---

## 11. How to modify — recipes

### Add a channel (e.g. `MEESHO`)
1. Backend `models.py` → add to `MarketplaceChannel.TextChoices`, make a migration.
2. Frontend `types/marketplace.types.ts` → extend `MarketplaceChannel` + `MARKETPLACE_CHANNELS`.
3. Nothing else — `MpChannelSelect` renders from `MARKETPLACE_CHANNELS`.

### Add a field to a master (e.g. `SkuMapping.hsn_code`)
1. Backend: `models.py` (+ migration) → `serializers.py`.
2. Frontend: `types/marketplace.types.ts` → the form + table in `MpMastersPage.tsx` (`SkuTab`).

### Add an endpoint
1. Backend: a service function in `services/`, a thin view in `views.py`, a route in `urls.py`,
   a permission class in `permissions.py` if it needs a new codename.
2. Frontend: `API_ENDPOINTS.MARKETPLACE` → `marketplace.api.ts` → a hook + query key in
   `marketplace.queries.ts` (choose targeted vs subtree invalidation) → consume in the page.
   **Never call `marketplaceApi` from a page.**

### Add a page
Create `pages/MpFooPage.tsx` (default export), then in `module.config.tsx` add a `lazy()` import,
a `routes[]` entry (`path`, `element`, `layout: 'main'`, `permissions`, `breadcrumb`) **and** a
`navigation[0].children[]` entry.

### Change a business rule
It's in `services/`, not in a view. Scan rules → `scan_service.py`. Combo expansion →
`resolve_service.py`. Confirm/SAP/billing → `confirm_service.py` + `sap_gateway.py`.
Deviation maths → `reconciliation_service.py`. Add a test in `marketplace/tests.py`.

### Change permissions
Backend: model `Meta.permissions` + a data migration to add it to the `Marketplace` group, plus a
class in `permissions.py`. Frontend: `src/config/permissions/marketplace.permissions.ts` — routes
and sidebar both read those bundles, so one edit covers both.

---

## 12. Suggested next steps

1. Fix the reconciliation deviation formula (§9.1) — the report is currently unusable as a filter.
2. Honour `dispatch.sap_warehouse_code` in `_warehouse_for` (§9.2), or drop it from the model.
3. Move SAP writes outside the DB transaction, or add a compensating cancel on failure (§9.3).
4. Replace `count()+1` document numbering with a real sequence (§9.4).
5. Add an over-scan guard to returns, or document that over-return is intentional (§9.5).
6. Add frontend tests for Outward's confirm gating (`unmapped_skus`, `allComplete`, `override`) —
   that's where the business risk concentrates.
