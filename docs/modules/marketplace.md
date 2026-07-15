# Marketplace (Flipkart / Amazon fulfilment) — Frontend

React + Vite module: `src/modules/marketplace` (in `C:/Users/gurpa/dev/FactoryFlow`).

> Backend counterpart: [`factory_app/marketplace/docs/README.md`](../../../factory_app/marketplace/docs/README.md)

*Verified against code on 2026-07-14 — trust this over older design notes.*

---

## Overview — what it does & who uses it

This module is the operator UI for fulfilling and returning **Flipkart / Amazon** orders out of a
company godown. It drives a six-step pipeline (surfaced everywhere by the `MpFlowSteps` bar):

```
Upload sheet → Review & map → Send to warehouse → Issue & receive → Pack → Dispatch
```

plus **Inward returns**, **Masters**, and a **Reconciliation** report.

The important domain fact operators must understand: dispatching an order produces an **internal
(non-SAP) billing document** in JI, while stock is still decremented in SAP behind the scenes (via a
Delivery Note + packing-material Goods Issue). Returns produce a printable **Return Note** and touch
no SAP stock. There is a **SAP-simulation mode** on the backend for demos/testing.

Everything is **company-scoped** (the active company comes from `useAuth`) and every screen is
**permission-gated** — a user with no `marketplace.*` permission never sees the module in the sidebar.

Audience: fulfilment operators (Outward/Inward), packing team (Packing), warehouse/godown team
(Warehouse Issues), and marketplace admins/managers (Masters, Reconciliation, Import).

---

## Key concepts & entities (as the UI shows them)

- **Channel** — FLIPKART / AMAZON. A `MpChannelSelect` in most page headers scopes every query.
  Sheet, packing and issue screens are currently **hard-scoped to FLIPKART** (the channel is passed
  as a literal `'FLIPKART'`).
- **Order ID** — the anchor operators scan/type against everywhere.
- **Batch** — one imported Flipkart CSV; expands to a **consolidated stock list** (FG + PM).
- **Issue request (MPIR-…)** — the warehouse's approve/issue/receive record for a batch.
- **Packing + PACK-… barcode** — the unique, printable item label generated per finished-good line;
  it is what gets scanned at Outward and returns.
- **Dispatch** — the scan-and-confirm session; shows a **Delivery Note** number, an **internal bill**
  number, and a **DN status** (`POSTED` / `FAILED` with Retry).
- **Return Note (RTN-…)** — the printable internal document for a submitted return.
- **Resolved lines & progress** — the DRF detail serializers return combo-expanded FG/PM lines and a
  live required-vs-scanned `progress` array, rendered by `MpProgressTable`.

Types live in `types/marketplace.types.ts` and mirror the DRF serializers (decimal quantities arrive
as **strings**, so components coerce with `Number(...)`).

---

## End-to-end flows (screens & user journeys)

### 1. Import Sheet — `MpImportPage` (`/marketplace/import`)
1. Drag/drop or pick a `.csv` (validated by extension; read client-side to text with `file.text()`).
2. **Analyze sheet** (`useImportPreview`) → a dry-run card: New / Duplicates / Unmapped SKUs counts,
   and the list of duplicate Order IDs.
3. If duplicates exist, the operator must tick **"Yes, these are duplicates — re-import and refresh"**
   to enable **Import all & refresh duplicates**; otherwise **Import new only** (`skip_duplicates`).
4. On success a result card shows imported / new / refreshed / skipped-dups counts and unmapped-SKU
   status, with a **Review batch →** link. A "Recent imports" table lists prior batches.

### 2–3. Batch review & send — `MpBatchDetailPage` (`/marketplace/batches/:batchId`)
- Shows the **consolidated stock list** split into Finished goods / Packing material.
- **Unmapped SKUs** appear in an amber card; each has a **Create mapping** dialog (RAW → SAP FG code,
  or COMBO → pick a combo). Saving re-runs the stock list automatically (query invalidation).
- **Send request** — pick a real SAP godown (`useSapWarehouses`, reused PO endpoint) and send;
  disabled while any SKU is unmapped or the list is empty, and it insists on a warehouse when the SAP
  list is available. Redirects to the new issue request.

### 4. Warehouse issue — `MpIssueRequestsPage` + `MpIssueRequestDetailPage` (`/marketplace/issues[/:id]`)
- List of `MPIR-…` requests with a **Warehouse Insights** panel (issued vs dispatched, in-packing,
  awaiting-dispatch, shortfalls).
- Detail: KPI tiles (lines / required / approved / issued / received) + an editable table (while
  `SENT/APPROVED/PARTIALLY_APPROVED`) with per-line **Approve qty** (`max={required_qty}`) and
  **Reject** toggles → **Save review** / **Reject all**. Then **Issue materials** (→ ISSUED) and
  **Confirm receipt** (→ RECEIVED). **Export CSV** downloads the issuance register (which sheet →
  what was issued) as a Blob.

### 5. Packing — `MpPackingPage` (`/marketplace/packing`)
- Paginated queue of issued orders (packed ones stay so labels can be **reprinted**; the button reads
  "Pack" vs "Reprint").
- Open an order → **Generate item barcodes** (one PACK-… per FG line) → **Print** (reuses the
  Barcode module's `PrintableLabel` + a marketplace `PackLabel` with a QR of the barcode) →
  **Complete packing → Outward**. Only PACKED orders appear in Outward.

### 6. Outward — `MpOutwardPage` (`/marketplace/outward`)
1. Pick an order — the list is filtered to `ready:1` (packed) orders; you can also type an Order ID.
   Loading an order **creates/reuses** its dispatch (`useCreateDispatch`).
2. **Scan finished goods** via `MpScanPanel` (camera or keyboard/gun). Each scan hits
   `useScanDispatch`; a success toast names the item, a duplicate shows a warning.
3. `MpProgressTable` shows required-vs-scanned per FG line; PM lines are listed as "consumed on
   confirm". A **Confirm dispatch** dialog explains it generates the SAP delivery note (decrementing
   stock), consumes packing materials, and creates the internal bill. Confirm is disabled while any
   SKU is unmapped or lines aren't complete (unless **Override scan deviation** is ticked).
4. After confirm the card shows the DN + internal bill number, or — if the SAP post failed — an amber
   banner with the error and a **Retry delivery note** button. A "Dispatched orders" table lists
   confirmed dispatches with a per-row Retry for FAILED posts.

### 7. Inward — `MpInwardPage` (`/marketplace/inward`)
- Scan/type an Order ID → open (or reuse) a return. Scan returned items (`useScanReturn`), watch the
  progress table, then **Submit return** (enabled once ≥1 item is scanned). Submitting shows the
  **Return Note** number and a **Print return note** button (`ReturnNoteButton`, A4 via
  react-to-print). The printed note lists item + returned qty from the return's `progress`.
- A paginated returns list lets a submitted return be re-opened and its note reprinted.

### Masters — `MpMastersPage` (`/marketplace/masters`)
Tabs: **SKU Mappings** (RAW→FG via `SapItemInput`, or COMBO→combo), **Combos** (FG+PM component
rows, each item via `SapItemInput`), **Warehouses** (SAP godown + customer CardCode). CRUD via
dialogs with client-side validation; delete has a confirm dialog.

### Reconciliation — `MpReconciliationPage` (`/marketplace/reconciliation`)
Date-range + channel filter, a "Deviations only" toggle (client-side filter on `has_deviation`), and
a per-order/item table: Portal / Outward / Inward / Physical (= outward − inward) / Out−In /
Portal−Phys (badged red when deviating).

---

## Critical business rules & invariants (as enforced/echoed in the UI)

- **Packed-gate.** Outward only lists/loads packed orders (`ready:1`); the empty state says "pack
  them first". Trying to load an unpacked order surfaces the backend `NOT_PACKED` 409 as a toast.
- **Unmapped SKUs block confirm.** The Outward card shows an amber "Unmapped SKUs …" banner and
  disables Confirm; the batch screen forces mapping before Send.
- **Scan deviation** must be explicitly overridden (checkbox in the confirm dialog) to confirm an
  incompletely-scanned order.
- **Best-effort SAP.** The UI is built around the fact that a confirm **succeeds even if SAP fails** —
  it shows a FAILED state with Retry rather than blocking. Toast on confirm: "Order dispatched —
  delivery note failed to post. Retry available."
- **Returns are internal.** The Return Note document itself states "No stock/SAP posting is implied."
- **Approve qty capped.** Issue-request review inputs are `max={required_qty}`; the backend also
  rejects `>required`.
- **Decimals are strings** — components coerce with `Number(...)` for display/compare.

---

## Integrations & cross-module boundaries

- **API client** — `api/marketplace.api.ts` over the shared `apiClient`; endpoints in
  `config/constants/api.constants.ts` (`API_ENDPOINTS.MARKETPLACE`).
- **WMS scanner** — `MpScanPanel` embeds `@/modules/wms/components/WmsScanButton` for camera scanning
  (plus a manual input).
- **Barcode module** — Packing reuses `@/modules/barcode/components/PrintableLabel` so PACK labels
  match Box labels; `PackLabel` renders the marketplace-specific label body + QR.
- **SAP masters via other modules** — `useSapWarehouses` reuses `API_ENDPOINTS.PO.WAREHOUSES`;
  `useSapItems` hits `/marketplace/sap-items/` (backed by production_execution's SAP reader). Both
  degrade gracefully to free-text when SAP is unreachable (`retry: false`, empty list).
- **Company context** — `useAuth().currentCompany` supplies the company name printed on the Return
  Note; the active company is sent by the shared client and enforced server-side.

---

## State, offline behaviour & scanning

- **Server-state via TanStack Query.** `api/marketplace.queries.ts` defines all hooks and
  `MARKETPLACE_QUERY_KEYS`. Most mutations call `invalidateMarketplace` (broad invalidation of the
  whole `['marketplace']` key); the hot scan loops (`useScanDispatch`, `useScanReturn`,
  `useRemoveScan`) invalidate only the single dispatch/return query to stay fast.
- **No offline queue.** Scans are **direct mutations** — there is no local buffering. If the network
  is down or the server 4xx/5xx, the scan is simply **not recorded** and the operator sees an error
  toast; nothing is queued for later replay.
- **Scanner double-fire guard.** `MpScanPanel` ignores input while a scan is `pending` (the `submit`
  helper early-returns if `disabled || pending`) and clears + re-focuses the input after each submit,
  so a barcode gun firing twice doesn't double-submit. The guard only holds while the mutation is in
  flight; once it resolves the panel re-enables.
- **Duplicate scans are safe** — the backend returns `duplicate:true` (HTTP 200) and the UI shows a
  warning toast instead of erroring; counts don't move.
- **Query freshness** — short `staleTime`s (10–60 s) mean lists refresh often; the packing queue and
  issue-request detail effectively refresh via broad invalidation after each action.

---

## Real-world edge cases (what the operator sees)

Each: **trigger → current behaviour → operator-visible symptom → risk/gap.**

- **SAP down / DN rejected at confirm.** Confirm still succeeds; card flips to an amber "Order
  dispatched, but the SAP delivery note failed to post" banner with the raw `sap_error` and a **Retry
  delivery note** button (also per-row in the dispatched table). Risk: if nobody retries, **SAP stock
  is never decremented** for that order — no automatic retry exists.
- **Scanner offline / network blip mid-scan.** The scan mutation fails; the item is **not** added and
  the operator gets an error toast. No local queue, so the operator must re-scan once back online.
- **Duplicate / re-scanned box.** Warning toast "Duplicate scan: …"; progress unchanged. Safe.
- **Over-scan / wrong item.** Backend 400 (`OVER_SCAN` / `ITEM_NOT_ON_ORDER`) surfaces as a generic
  error toast; the scan is rejected. (These `handleScan` paths rely on the global error toast — there
  is no bespoke message per code.)
- **Unpacked order at Outward.** Not listed (filtered to packed); typing its ID triggers the backend
  `NOT_PACKED` 409 → toast (the code shows the raw server message for a 409, else "Order X not
  found"). Operator is pointed to Packing.
- **Order not found for channel.** Loading a non-existent Order ID → toast "Order X not found for
  CHANNEL" (Outward and Inward).
- **Partial approval / short issue.** Warehouse Insights flags shortfalls (amber "short N") and shows
  "In packing" positive, but **Outward does not block** on a shortfall — a packed order still
  dispatches. Risk: physical/SAP mismatch is only advisory here.
- **Unmapped SKU at batch stage.** Amber card + disabled Send until every SKU is mapped inline.
- **Return of a damaged item — no photo.** There is **no photo capture anywhere** in the module (no
  file input on Inward, no image in `MpReturnScan`/`ReturnNote`). The backend `MarketplaceReturnPhoto`
  model is unwired, so despite "returns with photos" being a stated goal, an operator cannot attach
  condition evidence. Symptom: returns record items + a Return Note only. Gap: build capture + a
  photo endpoint, or drop the promise.
- **Warehouse form's SAP posting fields do nothing.** The Masters → Warehouses dialog shows
  **Document series**, **Tax code (VatGroup)** and **"Also post packing-material Goods Issue"**, and
  the upsert payload sends `sap_series` / `sap_tax_code` / `post_goods_issue`. **The backend
  serializer has no such fields, so they are silently dropped** — the DN posts with SAP defaults and
  the Goods Issue always posts regardless of the checkbox. Symptom: settings appear to save but never
  take effect. Gap: remove or wire them through.
- **SAP item/warehouse pickers unavailable.** `SapItemInput` and the godown `<select>` fall back to
  free-text / a plain input when the SAP-backed queries return empty — the operator can still type a
  code by hand.

---

## Failure modes / what a manager notices

- **Red "FAILED" DN badges piling up** in Outward → SAP integration or masters problem (missing
  warehouse, stock, or SAP down). Stock in SAP lags physical dispatch until retried.
- **Orders stuck before Outward** → they were never packed (Packing) or their materials never issued
  (Warehouse Issues); the Outward empty state and `NOT_PACKED`/`NOT_ISSUED` toasts point back
  upstream.
- **Import rejected** → wrong CSV (not the Flipkart export) or missing required columns; the Analyze
  step reports it before any write.
- **Reconciliation showing deviations** → outward/inward or portal/physical mismatches per order —
  the manager's signal to investigate mis-scans, partial returns, or overrides.
- **Combo can't be deleted** → it's referenced by a SKU mapping (backend `PROTECTED` 409) — toast
  "Could not delete — it may be used by a SKU mapping".

---

## Improvement opportunities & known gaps

- **Offline-resilient scanning.** A local scan buffer with replay would prevent lost scans on flaky
  warehouse Wi-Fi; today a failed scan is simply gone.
- **Wire or remove return photos.** The backend model exists but there is no capture UI, no endpoint,
  and `MpReturnScan`/`ReturnNote` carry no image — "returns with photos" is currently unfulfilled.
- **Remove or implement the warehouse SAP-posting fields** (`sap_series`, `sap_tax_code`,
  `post_goods_issue`) — currently dead UI that misleads admins. The `MarketplaceWarehouse` TS type
  even comments them as "used directly when posting to SAP", which is false.
- **Per-error scan messaging.** Surface `OVER_SCAN` / `ITEM_NOT_ON_ORDER` with tailored copy instead
  of the generic toast.
- **Sheet/packing/issue screens are FLIPKART-hardcoded** — Amazon can't yet run the sheet pipeline
  from the UI even though the backend is channel-generic.
- **Overview tiles omit the sheet pipeline** (Import/Issues/Packing) — `MpOverviewPage` only tiles
  Outward/Inward/Masters/Reconcile, so those steps are sidebar-only and easy for a new operator to
  miss.

---

## Permissions & roles

Gates come from `config/permissions/marketplace.permissions.ts`; routes/nav wire them in
`module.config.tsx`. The sidebar entry keys off `modulePrefix: 'marketplace'` — **absent all
`marketplace.*` permissions, the whole module is hidden**.

| Screen / nav item | Permission set |
| --- | --- |
| Overview, **Outward**, **Inward** | `MARKETPLACE_ACCESS` (view/add/scan/confirm dispatch + view/add return) |
| **Import Sheet**, Batch detail | `MARKETPLACE_SHEET_ACCESS` (`import_orders`, `view_batch`) |
| **Warehouse Issues** (+ detail) | `MARKETPLACE_ISSUE_ACCESS` (`view_batch` + send/review/issue/receive) |
| **Packing** | `MARKETPLACE_PACKING_ACCESS` (`view_packing`, `pack_order`) |
| **Masters**, **Reconciliation** | `MARKETPLACE_ADMIN_ACCESS` (`view_master`, `change_master`, `view_reconciliation`) |

Because these are **OR-of-permissions** sets (a route is reachable if the user holds *any* one
permission in the set), a user with a single permission in a set can reach that screen — page-level
actions then succeed/fail on the specific server permission. (See the repo note on "group perms vs
frontend nav gating": changing the Django `Marketplace` group alone can hide/show whole modules.)

---

## Developer file map

### Frontend (`C:/Users/gurpa/dev/FactoryFlow/src/modules/marketplace`)
- `module.config.tsx` — routes, sidebar nav, permission gates.
- `index.ts` — barrel re-exports (api, queries, config, types).
- `api/marketplace.api.ts` — thin endpoint wrappers over `apiClient`.
- `api/marketplace.queries.ts` — TanStack Query hooks + `MARKETPLACE_QUERY_KEYS` + invalidation.
- `types/marketplace.types.ts` — DRF-mirroring domain + request/response types.
- `pages/`
  - `MpOverviewPage.tsx` — tiles + recent dispatches.
  - `MpImportPage.tsx` — CSV upload, analyze, duplicate-safe import.
  - `MpBatchDetailPage.tsx` — stock list, inline SKU mapping, send to warehouse.
  - `MpIssueRequestsPage.tsx` / `MpIssueRequestDetailPage.tsx` — list+insights / review-issue-receive.
  - `MpPackingPage.tsx` — barcode generate/print/complete.
  - `MpOutwardPage.tsx` — scan → confirm → DN/bill / retry.
  - `MpInwardPage.tsx` — return scan → submit → Return Note.
  - `MpMastersPage.tsx` — SKU / combo / warehouse CRUD.
  - `MpReconciliationPage.tsx` — deviation report.
- `components/`
  - `MpScanPanel.tsx` — scan input + WMS camera button (in-flight double-fire guard).
  - `MpProgressTable.tsx` — required-vs-scanned FG summary.
  - `MpChannelSelect.tsx` — channel switch.
  - `MpFlowSteps.tsx` — six-step pipeline indicator.
  - `PackLabel.tsx` — printable PACK label (barcode-module style + QR).
  - `ReturnNote.tsx` — A4 Return Note (`ReturnNoteButton`, react-to-print).
  - `WarehouseInsightsPanel.tsx` — issued-vs-dispatched KPIs + shortfalls.
  - `SapItemInput.tsx` — debounced SAP item-code picker (free-text tolerant).
- `config/permissions/marketplace.permissions.ts` — permission constants + access sets.
- `config/constants/api.constants.ts` → `API_ENDPOINTS.MARKETPLACE` — endpoint map.

### Key backend files (`C:/Users/gurpa/dev/factory_app/marketplace`)
- `models.py`, `views.py`, `views_sheet.py`, `urls.py`, `serializers*.py`, `permissions.py`
- `services/` — `resolve_service`, `order_import_service`, `batch_resolve_service`,
  `issue_request_service`, `packing_service`, `scan_service`, `confirm_service`, `return_service`,
  `sap_gateway`, `dispatch_gate`, `reconciliation_service`, `warehouse_insights_service`.

---

## Related docs
- Backend: [`factory_app/marketplace/docs/README.md`](../../../factory_app/marketplace/docs/README.md)
  — domain entities, server-side flows, business rules, SAP behaviour, API surface, failure modes.
