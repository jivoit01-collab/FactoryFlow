# Branch Stock Transfer (BST) — Frontend

> React + Vite UI for the warehouse-driven, scan-based branch stock transfer.
> Backend companion doc: `C:/Users/gurpa/dev/factory_app/warehouse/docs/bst.md`
> (domain model, business rules, API, SAP behaviour).
>
> **Trust this doc + the code.** The older `src/docs/bst_flow.md` predates the
> cross-company **INVOICE** source type and multi-document entries and is partly stale.

---

## Overview — what it does & who uses it

BST is how a warehouse operator physically moves **barcoded finished-goods boxes/pallets**
to another warehouse (or another company) and gets a box-by-box acceptance at the far end.
It's a scan-driven, two-sided journey:

1. **Sender** (source-company warehouse) creates a BST from one or more **SAP documents**,
   **scans** boxes/pallets, and **approves**.
2. **Gate** operator (only if the goods leave on a vehicle) verifies the load and **marks the
   vehicle out**.
3. **Receiver** (destination warehouse) **scans** arriving boxes to **accept/reject** them and
   **finalizes** the receipt.

Two kinds of BST, chosen on the New screen:
- **Stock Transfer** — intra-company, sourced from a SAP stock transfer; boxes just change
  warehouse.
- **Invoice / Dispatch Bill** — a **cross-company sale** (e.g. JIVO OIL → JIVO MART); on
  receipt the boxes move into the **destination company's** stock.

All the screens live in **`src/modules/warehouse/pages/bst/`**; the gate step reuses the same
data in **`src/modules/gate/pages/bstGate/`**.

---

## Key concepts & entities (UI vocabulary)

- **Entry** = one `BSTTransfer` (`entry_no` like `BST-20260713-0001`), shown with a colored
  **status badge** (`bstStatus.tsx`).
- **Source document / bill** = the SAP stock transfer or invoice the entry is built from. An
  entry can **combine several documents** that share one route; `doc_count > 1` renders a
  `+N` chip and a **SAP documents** table (`BSTDocList`).
- **Bill vs scanned** (`BSTBillTable`) = the heart of every screen: per item, **boxes to scan**
  (target) vs **boxes scanned** (progress bar + Open/Partial/Complete/Over badges). "Boxes to
  scan" is a **carton count** (`expectedBstItemBoxes`: stored `expected_boxes`, else
  `quantity ÷ pack-size` parsed from the item name).
- **Box scan** = one `BSTBoxScan` row; on the receive side it also carries **ACCEPTED /
  REJECTED / PENDING** and an `unexpected` flag.
- **Requires gate** = "Leaves on a vehicle" — adds vehicle/driver and routes the entry through
  the gate.
- **Types/keys:** `src/modules/warehouse/types/bst.types.ts`; TanStack Query keys +
  hooks in `src/modules/warehouse/api/bst.queries.ts` (all under `['warehouse','bst', …]`).

---

## End-to-end flows (screens & journeys)

Routes are declared in `src/modules/warehouse/module.config.tsx` (warehouse) and
`src/modules/gate/module.config.tsx` (gate). Each route lists a permission (see
[Permissions](#permissions--roles)).

### 1. Dashboard — `BSTDashboardPage` · `/warehouse/bst`
- Two tabs: **Outgoing** (`useBSTTransfers`) and **Incoming** (`useBSTIncoming`, with a live
  count badge). A global **date-range picker** filters both.
- Rows show route (for INVOICE: destination company / customer, with an "invoice" chip),
  SAP doc (+`+N`), box count, dispatched/received timestamps, status.
- **New BST** button → `/warehouse/bst/new`. Clicking an Outgoing row → detail; an Incoming
  row → the receive screen.

### 2. Create — `BSTNewPage` · `/warehouse/bst/new`  *(needs `CREATE_BST`)*
1. **Source document toggle:** *Stock Transfer* or *Invoice / Dispatch Bill*. Switching resets
   the selection.
2. **Search** SAP by number (invoice search also matches customer) → results list
   (`useBSTSapTransfers`, only fires once a search is submitted).
3. **Add one or more documents.** The **first** added doc fixes the **route**; every other doc
   must match — mismatches are shown greyed with "different route" / "different customer/source"
   and blocked with a toast. Selected docs render as removable chips with the route summary.
4. **Invoice only:** pick the **Destination company** (the other companies the user belongs to;
   best-effort auto-matched from the invoice customer, overridable). Explanatory helper text
   notes the boxes move into that company's stock.
5. Optional **Invoice / Reference No.**, and **"Leaves on a vehicle (needs gate-out)"** which
   reveals required **Vehicle** + **Driver** selects.
6. **Create & Scan** (`useCreateBST`) → navigates straight to the scan page. Validation gates
   the button (≥1 doc; vehicle+driver if on-vehicle; destination company if invoice).

### 3. Scan — `BSTScanPage` · `/warehouse/bst/:id/scan`  *(needs `CREATE_BST`)*
- Only interactive while status is `SCANNING`/`DRAFT`; otherwise a "no longer open for scanning"
  card with a link to detail.
- Top card = **Stock to transfer** (`BSTBillTable`) with a running **"N of M boxes scanned"**.
- **Scan area** = camera viewport (`BoxScanCamera`, with torch + green success blink) **and** a
  manual/hardware-wedge input. A **pallet scan expands to all its active boxes** server-side.
- Uses the shared **`useBoxScanQueue`** (see [Offline & scanning](#state-offline--scanning-behaviour)):
  each scan flashes green, shows **"Syncing N…"**, and parks failures in a **Failed scans** list
  with **Retry** / dismiss.
- **Scanned boxes** table lists each box; off-bill items get a red "off-bill" chip; each row has
  a trash button (`useRemoveBSTScan`) while editable.
- **Review & approve** button (disabled until ≥1 box) → the review screen.

### 4. Review & approve — `BSTReviewPage` · `/warehouse/bst/:id/review`  *(needs `CREATE_BST`)*
- Summary (docs, invoice/ref, scanned box count, vehicle/driver), the **SAP documents** table
  when multi-doc, and **Bill vs scanned**.
- **Approve scanning** (`useApproveBST`) → toast tells the operator whether it went to the
  **gate** (`requires_gate`) or straight **in transit**, then navigates to detail. Once approved
  the screen shows "Approved by …" (+ "awaiting gate-out" chip) instead of the button.

### 5. Gate out — `BSTGateOutListPage` / `BSTGateOutReviewPage` · `/gate/bst-out[/:id]`  *(needs `BST_OUT.VIEW`)*
- Lives in the **Gate** module but reads the **warehouse** BST API (`useBSTGateOutwards`,
  `useMarkBSTGateOut`). The list is a gate board: **Awaiting Out / Gated Out / Total** tiles, a
  date range, and client-side search over entry/doc/vehicle/driver.
- The review page shows a **warehouse-approval banner** (green "approved by …" or amber "not yet
  approved"), the load summary, and **Bill vs scanned**. **Mark vehicle out** flips the entry to
  **In Transit** and returns to the board.

### 6. Receive — `BSTReceivePage` · `/warehouse/bst/incoming/:id`  *(needs `MANAGE_BST`)*
- Opened from the dashboard **Incoming** tab (`useBSTIncomingDetail`). Interactive only while
  `IN_TRANSIT` / `ARRIVED` / `RECEIVING`.
- **Scan an arriving box to accept it** (camera + manual), same queue/flash/failed-list UX.
  Scanning always **accepts** (`useBoxScanQueue.scanOne` → `receiveScan(..., decision:'ACCEPTED')`);
  a scanned box that wasn't dispatched here **fails with a clear reason** and lands in Failed scans.
- **Boxes** table with **accepted / rejected / pending** counts; per-row **✓ accept** or **✗
  reject**; reject opens a dialog for an optional reason (rejection is only reachable from the
  per-row button, never from a scan).
- **Latent "unexpected" UI.** `BSTReceivePage` renders an amber **"unexpected"** chip on
  `is_unexpected` rows and a "recorded as unexpected" toast when `result.unexpected.length > 0`,
  but the backend never sets `is_unexpected` and always returns `unexpected: []` (it 400s a
  non-dispatched box instead) — so **neither ever appears today**. Treat both as dead UI until the
  backend actually records unexpected boxes.
- **Finalize receipt** (`useCompleteBSTReceive`) → toast, back to the dashboard. Backend then
  settles accepted boxes and sets **Received** or **Partially Received**.

### 7. Detail & cancel — `BSTDetailPage` · `/warehouse/bst/:id`  *(needs `VIEW_BST`)*
- Full info card (type incl. an **"Invoice · cross-company"** badge, company, destination/customer
  for invoices, warehouses, docs, vehicle/driver, and every audit timestamp), the SAP-documents
  table (multi-doc), **Stock to transfer**, and the **Boxes** list with accept/reject state.
- **Resume scanning** appears while `SCANNING`/`DRAFT`. **Cancel transfer** (destructive, behind a
  confirm dialog with an optional reason) is available until the entry is
  Received/Partially/Closed/Cancelled — the backend still blocks it once any box is accepted.

---

## State, offline & scanning behaviour

- **Non-blocking scan queue — `src/shared/hooks/useBoxScanQueue.ts`** (shared with sales-dispatch
  docking). `enqueue()` returns instantly so the input/camera never lock; a single
  reentrancy-guarded worker drains the queue one box at a time, POSTing each scan.
  - **Local dedupe** before send (`isAlreadyScanned` / in-flight set) → "already scanned/accepted"
    toast, no server call.
  - **Success** → green flash (`flashing`) + the box appears after refetch.
  - **Failure** → the box lands in **`failedScans`** with the server's reason and a **Retry**
    button; retry re-enqueues it. `pendingCount` drives the "Syncing N…" text.
  - **`onDrained`** invalidates the BST query cache so counts/lists refresh once the burst settles.
  - **Caveat:** the queue is **in-memory** — a reload mid-sync loses **unsynced** scans (synced
    ones are safe on the server).
- **Camera** — `BoxScanCamera` conditionally mounts the viewport, offers a torch toggle when
  supported, and shows the same green success overlay. Manual entry (hardware wedge or typing +
  Enter) works in parallel; `useScanner` debounces camera reads (1800 ms).
- **Server truth, light client state.** Screens read via TanStack Query hooks and mutations
  invalidate `BST_QUERY_KEYS.all` (or the specific detail/incoming key). There is **no optimistic
  update** and **no offline persistence** — actions need connectivity, and errors surface as
  `sonner` toasts (`getErrorMessage`).

---

## Critical business rules the UI enforces or surfaces

- **Bill-bounded scanning.** The backend blocks off-bill items, boxes not at the source
  warehouse, over-count, and boxes already on another active BST; the UI shows each as a **failed
  scan with the reason** and flags off-bill rows/`BSTBillTable` "Over +N" defensively.
- **One route per entry.** `BSTNewPage.sameRoute` blocks adding a document whose warehouse/customer
  route differs from the first.
- **Invoice requires a destination company** (and it must differ from the current company) — button
  stays disabled until chosen.
- **Approve needs ≥1 box; Finalize needs the transfer to be receivable.** Buttons disable/hide
  accordingly.
- **Cancel is guarded** client-side by status and server-side by "no accepted boxes yet."

---

## Integrations & cross-module boundaries

- **Gate module (thin view over the warehouse API).** `/gate/bst-out` and `/gate/bst-out/:id`
  (`src/modules/gate/pages/bstGate/BSTGateOutListPage.tsx`, `BSTGateOutReviewPage.tsx`) import the
  **warehouse** BST hooks — `useBSTGateOutwards`, `useMarkBSTGateOut`, and `useBSTTransfer` (the
  sender/outward detail, not an incoming-scoped hook). No separate gate data layer exists for this
  flow. The routes are declared in `src/modules/gate/module.config.tsx` and gated by
  `GATE_PERMISSIONS.BST_OUT.VIEW` (= `warehouse.can_gate_bst`), which is also folded into the Gate
  module's permission union so a `can_gate_bst`-only user can reach it.
- **Shared scan queue.** `src/shared/hooks/useBoxScanQueue.ts` is shared with the **sales-dispatch
  docking** scan flow — identical enqueue/drain/flash/failed-retry behaviour.
- **Barcode module.** The camera decoder is `useScanner` (`src/modules/barcode/hooks/useScanner`,
  1800 ms debounce), wrapped by `BoxScanCamera.tsx`.
- **Gate components on the sender screens.** `VehicleSelect` / `DriverSelect`
  (`@/modules/gate/components`) power the "leaves on a vehicle" fields; `DateRangePicker` (also from
  `gate/components`) drives the dashboard and gate-board date filter, backed by the shared
  `useGlobalDateRange` (`@/core/store`).
- **Auth / company store (the cross-company edge).** INVOICE destination options come from
  `useAppSelector(s => s.auth.user.companies)` minus the current company; the actual cross-company
  visibility is enforced server-side (INVOICE reads scoped to `destination_company`), so the
  destination user sees the transfer in **Incoming** without any client company-switch.
- **SAP (read-only, via the backend).** `useBSTSapTransfers` / `useBSTSapTransfer` proxy the
  warehouse `bst/sap-transfers/` endpoints; the UI never talks to SAP directly. A SAP outage surfaces
  as an empty result or an error toast on **New BST**.
- **Legacy / orphaned gate-desk BST.** `src/modules/gate/api/{bstOut,bstIn,bstReturn}/*` call the
  old `/gate-core/bst-*` endpoints (`API_ENDPOINTS.GATE.BST_OUTS`, `BST_INS`, `BST_RETURNS`). They are
  only re-exported by the `gate/api` barrel; **no routed page uses them** — ignore them for this flow.

---

## Real-world edge cases

Each: **trigger → current behaviour → what the operator sees → risk/gap.**

1. **Scanner offline / dropped POST.** → box parked in **Failed scans**; operator taps **Retry**
   when back online. Risk: reloading before it syncs **loses that scan** (in-memory queue).
2. **Duplicate / re-scan.** → "already scanned" (sender) or "already accepted" (receiver) toast; no
   double row.
3. **Box not at source warehouse / off-bill / on another BST.** → **red failed row** with the exact
   backend reason (e.g. "is at WH-3, not the source warehouse WH-1"). The bill table also renders an
   "off-bill / Over" row defensively.
4. **Partial truck load.** Receiver accepts some, rejects/omits others, hits **Finalize** → status
   **Partially Received**; unaccepted boxes stay pending. The operator sees an orange badge. Gap:
   **no reopen** — a straggler box can't be received later from the UI.
5. **SAP down while searching/creating.** → the search shows "No … found" or the create toast shows
   the SAP error (HTTP 502). No entry is created.
6. **Invoice with no box total.** → `BSTBillTable` shows **"0 boxes to scan"** for that item (falls
   back to pack-size-from-name; if the name has no `… PCS`, it stays 0). Symptom: the item can't
   show progress and over-scan isn't caught for it.
7. **Cross-company item not mapped (JIVO MART).** → **create fails** with "Please maintain
   U_Oil_ItemCode …"; if it breaks later, **Finalize** errors with the same message. Operator sees a
   toast and can't proceed until master data is fixed.
8. **Cross-company blank Incoming.** The destination user's Incoming tab is populated because the
   backend scopes INVOICE reads to `destination_company`. If a future query regresses that scope, the
   symptom is an **empty Incoming tab despite a dispatched transfer** — the classic cross-company
   blank-data bug.
9. **Bill added after gate-in / stale vehicle.** Not modeled here — BST's gate step is a **status
   flip** (`mark-out`), not the inside-vehicle/`VehicleArrival` machinery, so BST doesn't create or
   reuse a physical arrival. (The legacy `gate_core` BST that *did* tie to `EmptyVehicleGateIn` is
   retired from the UI — see below.)

---

## Failure modes / what an operator or manager notices

- **"SAP unavailable" on New BST** — can't search/create; retry later.
- **Failed scans that won't clear** — usually a real rule violation (wrong warehouse, off-bill,
  locked on another BST); read the reason on the red row.
- **Stuck "Partially Received"** — stock is split and there's no reopen; a late box has nowhere to go.
- **Cross-company create/finalize blocked** — missing `U_Oil_ItemCode`; a data (not app) fix.
- **A scan "disappeared"** after a reload mid-sync — it was never persisted (in-memory queue).
- **"Cancel" errors** — a box was already accepted; the transfer must be received, not cancelled.

---

## Improvement opportunities & known gaps

1. **Persist the scan queue** (localStorage/IndexedDB). Today `useBoxScanQueue` is in-memory, so a
   reload or crash mid-sync silently loses **unsynced** scans — the biggest operator-facing risk on a
   flaky shop-floor network.
2. **Reopen / reconcile "Partially Received."** There is no UI (or API) to receive a straggler box
   after Finalize; the entry looks done while stock is split.
3. **Remove or wire the latent "unexpected" receive UI.** The amber "unexpected" chip and the
   "recorded as unexpected" toast in `BSTReceivePage` never fire (the backend 400s a non-dispatched
   box instead of returning it), so they mislead a reader into thinking the path is live.
4. **Destination gate-in is dead in the UI too.** `useMarkBSTGateIn`, `useBSTGateInwards`, and the
   `BST_GATE_MARK_IN` / `BST_GATE_INWARDS` endpoints all exist, but no routed page uses them and the
   backend transition to `AWAITING_GATE_IN`/`ARRIVED` is unreachable. Either build the destination
   gate-in screen or delete the scaffolding.
5. **Create / Scan / Review / Receive are gated only on the frontend** (route `permissions` +
   company context on the server). Unlike the gate endpoints, the backend does **not** check
   `can_create_bst` / `can_scan_bst` / `can_receive_bst`, so the client gate is the only barrier —
   see the companion doc's "Improvement opportunities."
6. **Retire the orphaned modules** (`gate/api/{bstOut,bstIn,bstReturn}`) and the stale
   `src/docs/bst_flow.md` once this flow is validated, to stop them showing up in searches.

---

## Permissions & roles (nav gating)

Route/nav gates use `WAREHOUSE_PERMISSIONS` (`src/config/permissions/warehouse.permissions.ts`) and
`GATE_PERMISSIONS.BST_OUT` (`src/config/permissions/gate.permissions.ts`):

| UI constant | Django codename | Gates |
|---|---|---|
| `VIEW_BST` | `warehouse.view_bsttransfer` | Dashboard, detail, and the **Branch Transfer** sidebar item |
| `CREATE_BST` | `warehouse.can_create_bst` | New / Scan / Review |
| `MANAGE_BST` | `warehouse.can_receive_bst` | Receive (incoming) |
| `BST_OUT.VIEW/CREATE/COMPLETE` | `warehouse.can_gate_bst` | Gate **BST Out** list/review + the Gate sidebar entry |

- The **Warehouse** sidebar group appears if the user holds any of its children's perms; **Branch
  Transfer** shows only with `VIEW_BST` (`warehouse/module.config.tsx`).
- The **Gate** module includes `BST_OUT.VIEW` in its union so a dedicated **BST Gate** role
  (`can_gate_bst` only) sees the Gate module and reaches **BST Out** and nothing else.
- Backend enforcement is **only** on the gate endpoints; the create/scan/receive routes are gated on
  the **frontend** here plus company context on the server. (Groups: *BST Operator*, *BST Gate* —
  `manage.py setup_bst_group`.)
- **Legacy note — `BST_IN` / `BST_RETURN`** in `gate.permissions.ts` map to
  `person_gatein.can_view_dashboard` and belong to the retired `gate_core` gate-desk BST; no routed
  page uses them.

---

## Developer file map

**Frontend (`C:/Users/gurpa/dev/FactoryFlow`)**
- Pages — `src/modules/warehouse/pages/bst/`: `BSTDashboardPage`, `BSTNewPage`, `BSTScanPage`,
  `BSTReviewPage`, `BSTReceivePage`, `BSTDetailPage`.
- Shared bits — same folder: `BSTBillTable.tsx` (bill vs scanned), `BSTDocList.tsx` (multi-doc),
  `BoxScanCamera.tsx`, `bstStatus.tsx` (status badge), `bstBoxCounts.ts` (`expectedBstItemBoxes`),
  `bstFormat.ts`.
- Data — `src/modules/warehouse/api/bst.api.ts` (endpoints), `bst.queries.ts` (hooks + query keys),
  `src/modules/warehouse/types/bst.types.ts`.
- Gate step — `src/modules/gate/pages/bstGate/BSTGateOutListPage.tsx`,
  `BSTGateOutReviewPage.tsx` (import the **warehouse** BST hooks).
- Scan queue — `src/shared/hooks/useBoxScanQueue.ts`; camera — `src/modules/barcode/hooks/useScanner`.
- Routing/nav — `src/modules/warehouse/module.config.tsx`, `src/modules/gate/module.config.tsx`.
- Endpoints/permissions — `src/config/constants/api.constants.ts` (`WAREHOUSE.BST_*`),
  `src/config/permissions/{warehouse,gate}.permissions.ts`.
- **Legacy/orphaned (gate-desk BST, no routed page):** `src/modules/gate/api/{bstOut,bstIn,bstReturn}/*`
  — only re-exported by the `gate/api` barrel; safe to ignore for the current flow.

**Backend (`C:/Users/gurpa/dev/factory_app`)** — see the companion doc: `warehouse/models_bst.py`,
`warehouse/services/bst_service.py`, `warehouse/views_bst.py`, `warehouse/urls.py`.

---

## Related docs
- **Backend companion:** `C:/Users/gurpa/dev/factory_app/warehouse/docs/bst.md`
- **Older flow note (partly stale — pre cross-company/multi-doc):** `src/docs/bst_flow.md`
- Gate module overview: `src/modules/gate/docs/README.md`
