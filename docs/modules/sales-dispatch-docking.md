# Sales Dispatch & Docking — Frontend (customer dispatch gate-out)

> **Scope:** the React/Vite screens and user journeys for the customer finished-goods dispatch
> gate-out ("Docking"). Pages live in **`src/modules/gate/pages/customerSalesFlow/`**; routes are
> registered in **`src/modules/dispatch/module.config.tsx`** and **`src/modules/gate/module.config.tsx`**;
> the Inside-Vehicle console lives in **`src/modules/vehicle-management/pages/InsideVehicleManagerPage.tsx`**.
> Paired backend doc: **`C:/Users/gurpa/dev/factory_app/gate_core/docs/sales_dispatch.md`**.
>
> Written from the **code as of this commit**. Where an older doc disagrees, the code wins.

---

## Overview — what it does & who uses it

Docking is the multi-step wizard a **loaded customer truck** goes through to leave the factory.
The same server record (`SalesDispatchGateOut`) is driven from **two URL surfaces**, distinguished
at runtime by `isSalesDispatchOutPath(pathname)` (`salesDispatchRoutes.ts`) into an `isGateOutMode` flag:

- **Docking surface — `/dispatch/docking`** (`isGateOutMode = false`): warehouse/docking staff
  create the docking, scan boxes, attach the truck photo + freight/bilty/e-way documents, and
  **print + commit** the gatepass. This is the 4-step wizard.
- **Gate Sales-Dispatch Out surface — `/gate/sales-dispatch`** (`isGateOutMode = true`): gate
  security wait for the committed gatepass, record the **gross weight**, **mark dispatched**, and
  **depart** the truck. The same pages render a gate-flavoured header and action set.

A `/gate/bst-out` surface reuses the exact same pages for **stock-transfer** dockings.

The **docking board** (`SalesDispatchDashboardPage`) is the hub: it lists live dockings grouped by
physical truck (arrival), plus pending bookings not yet docked, and routes into the wizard.

---

## Key concepts & entities (frontend view)

- **Docking entry** (`SalesDispatchGateOut`, `api/salesDispatch/salesDispatch.api.ts`): the record
  the whole flow reads. Threaded by `vehicle_entry` through the wizard steps via `useEntryId`.
- **Bill** (`SalesDispatchGateOutDocument`): a docking carries one or more bills; the scan page
  renders one accordion card per bill and scans boxes **into a specific bill**.
- **`gatepass_readiness`** (embedded on every entry): the object that drives every gate/lock in the
  UI — `ready`, `missing[]`, `has_truck_photo_geolocation`, `has_box_scans`, `is_partial_scan`,
  `scanned_boxes`, `expected_boxes`, `box_scan_optional`, `scan_skip_approved`,
  `partial_scan_approved`, `has_weighment`, `requires_eway_bill`, etc.
- **Arrival fields on the entry**: `arrival`, `arrival_no`, `arrival_status`,
  `arrival_company_count` (`>1` = multi-company truck), `arrival_can_depart`. These make the UI
  treat a shared truck as one unit.
- **`gatepass_print_locked` / `gatepass_lock_reason`**: the print lock **of this docking's company**
  (not the active company selector) — the UI reads it straight off the entry.
- **Statuses**: `DOCKED → PHOTO_ATTACHED → READY_FOR_GATEPASS → GATEPASS_PRINTED → PRINT_COMMITTED →
  DISPATCHED` (+ `REJECTED`/`CANCELLED`, and a synthetic `PENDING_DOCKING` for un-docked bookings).

### Wizard steps (`DOCKING_TOTAL_STEPS = 4`)

```
1. New Entry (pick bills + vehicle/driver)   →  SalesDispatchNewPage
2. Box Scanning                              →  SalesDispatchBarcodeScanPage
3. Attachments (truck photo, bilty, e-way…)  →  SalesDispatchAttachmentsPage
4. Gatepass (print → commit → [gate: weigh → dispatch → depart])  →  SalesDispatchGatepassPage
```

Routes are built by `buildSalesDispatchRoutes(base)` in `salesDispatchRoutes.ts` for all three
bases (`DOCKING_ROUTES`, `SALES_DISPATCH_OUT_ROUTES`, `BST_OUT_DOCKING_ROUTES`). A `?review=1` flag
renders the flow **read-only** to walk a closed entry.

---

## End-to-end flows (what the operator does)

### 1. Create a docking — `SalesDispatchNewPage`

- From the board, the operator picks one or more **bills** (SAP invoices, fetched live and
  searchable, optionally `all_companies` for the cross-company board) and a **vehicle + driver**.
- On submit (`salesDispatchApi.create`), the backend snapshots the bills and either creates a new
  docking (**201**) or **merges** into the truck's existing open docking (**200**). Warnings
  (multiple customers / e-way bills) are shown but don't block.
- The flow then advances to Box Scanning, carrying the `vehicle_entry` id in the URL (`useEntryId`).

### 2. Box scanning — `SalesDispatchBarcodeScanPage`

The most operationally intricate screen. Key behaviours:

- **Per-bill accordion.** One `BillScanCard` per bill; boxes scanned while a bill is open are
  attributed to that bill (`scanTargetRef`). A single-bill load auto-opens.
- **Camera + hardware scanner.** `useScanner` drives the camera; a connected gun behaves like a
  keyboard. The barcode input auto-focuses **only on fine-pointer devices** (`detectFinePointer`)
  so the soft keyboard never covers the camera on phones/tablets.
- **Non-blocking scan queue (offline-tolerant within a session).** Scans are accepted instantly into
  a client-side queue (`scanQueueRef`) and POSTed **one at a time** in the background
  (`processQueue`), so the field never locks. A **"Syncing N"** badge shows the backlog; a green
  flash confirms each accepted box.
- **Failed-scan queue.** A rejected sync (over-invoice, wrong bill, unknown barcode) drops into a
  persistent **Failed scans** list with the reason and **Retry / Dismiss** buttons — deduped by
  barcode, newest first.
- **Duplicate handling.** A box already scanned toasts "already scanned" (server returns
  `duplicate:true`, 200) — never an error.
- **Progress + per-line completeness.** Expected vs scanned boxes (pack-size-aware,
  `salesDispatchBoxCounts.ts`, mirroring the backend), a progress bar, and per-item Open/Partial/
  Complete badges. "Boxes outside this bill's item list" is flagged in red.
- **Check Barcode Scans dialog.** Looks up boxes already scanned in the legacy barcode module for
  the same SAP bill and lets the operator **import** them instead of re-scanning.

**The scan gate** (`scanGateSatisfied`): the operator can only continue when box scanning is
complete, **or** an admin approved a **scan-skip** (zero scans), **or** an admin approved a
**partial-scan** (some scans), **or** the company has scanning off (`box_scan_optional`). Otherwise
the Next button is disabled and a lock banner explains exactly which of those is needed. This
mirrors the backend readiness gate, so the two can't disagree.

### 3. Attachments — `SalesDispatchAttachmentsPage`

- Upload the **truck photo** (with geolocation — required for readiness), **bilty** (+ number and
  date), **e-way bill** (+ attachment, required when the invoice total > ₹50,000), and optional
  invoice/delivery-note/credit-note files. Attachment presence drives `gatepass_readiness.missing`.

### 4. Gatepass, weighment, dispatch, depart — `SalesDispatchGatepassPage`

`getNextAction(entry, isGateOutMode)` decides the single primary action:

| Status | Docking surface (`isGateOutMode=false`) | Gate surface (`isGateOutMode=true`) |
|---|---|---|
| pre-print | **Print Gatepass** | "Waiting for Docking" |
| `GATEPASS_PRINTED` | **Commit Print** | "Waiting" |
| `PRINT_COMMITTED` | done (back to dashboard) | **Record Gross Weight** → **Mark Dispatched** |
| `DISPATCHED` + `arrival_can_depart` | — | **Depart Truck** |

- **Print** (`printGatepass`) checks `gatepass_print_locked` and `gatepass_readiness.ready` client-side
  first (with a readable error), then posts; on success it opens the print dialog.
- **Commit** (`commitPrint`) moves to `PRINT_COMMITTED`.
- **Multi-company truck** (`arrival_company_count > 1`): Mark Dispatched dispatches **every** company
  on the truck at once (the backend does it atomically); the toast says "All companies on this truck
  dispatched". Arrival-backed trucks then show an inline **Depart Truck** button once every gate-in
  is retired (`arrival_can_depart`), rather than navigating away.
- **Reprint** (audited) is available from the gatepass screen for printed entries when the user has
  the reprint permission.

### 5. Correction paths

- **Inside Vehicle Manager** (`/…` from `vehicle-management`, `InsideVehicleManagerPage`): the
  dispatch correction console. Groups gate-ins by physical truck (arrival) and lets an authorised
  user **Add Bill**, **Add other-company bill**, **Remove**, **Move** (to another inside truck),
  **Unlink All**, or **Mark Out** — each a separate permission-gated button (see Permissions).
  **Add / Remove / Move / Unlink** hit dedicated backend endpoints that re-check the same perm.
  **Mark Out** is different: it does not call an empty-out API from here — it `navigate(...)`s to the
  empty-vehicle-out wizard (`/gate/empty-vehicle-out/new?entry=<vehicle_entry_id>`), and its
  `can_mark_out_inside_vehicle` gate is **frontend-only** (that wizard is auth-gated, not perm-gated).
  Bills that are committed/scanned show **Locked — <reason>** and can't be removed; a bill on more
  than one gate-in shows a red **Duplicate cover** badge.
- **Partial dispatch / add-document** actions surface on the detail page and gatepass flow via the
  `partialDispatch` API.

---

## Critical business rules & invariants (as enforced/echoed in the UI)

- **The UI never bypasses the server gate.** Every lock the frontend shows (`scanGateSatisfied`,
  readiness `missing`, print lock, weight guard) is re-checked server-side; the UI copies exist to
  fail fast and explain, not to authorise.
- **Company follows the record.** The board reads across all the user's companies (`all_companies`);
  a docking's lock/readiness are the **docking's company's**, read straight off the entry — so a
  sibling-company docking renders correctly regardless of the active company selector.
- **Scan gate = complete OR skip-approved OR partial-approved OR scanning-optional.**
- **Partial-ness is judged per bill/line**, not just the load total (`hasUnscannedBillLine`), so a
  surplus on one bill can't mask a shortfall on another — matching `load_scan_status` on the server.
- **PRINT_COMMITTED is one-way** in the UI too: past commit, the flow only offers weigh/dispatch
  (gate) or "done" (docking); there is no cancel button.
- **One physical exit.** A multi-company truck shows one Depart action gated on `arrival_can_depart`.

---

## Real-world edge cases

Each: **trigger → current behaviour → what the operator sees → risk/gap.**

1. **Partial truck load.** Fewer boxes than expected, or a bill/line short. → Next is disabled; a
   `PartialScanPanel` offers "Request Partial Dispatch Approval". → Operator sees "Locked — scan all
   boxes, or request partial dispatch approval… You can continue once it is approved." → Risk: the
   operator is hard-gated until an admin acts in Admin → Partial Dispatch Approvals.

2. **Scanner offline / dropped network mid-scan.** → Scans stay in the local queue and drain when
   the POST succeeds; failures land in the Failed-scans list with Retry. → Operator sees "Syncing N"
   and, on failure, a red Failed-scans card. → Risk: the queue is **in-memory** — a full page reload
   before it drains loses un-synced scans (they must be re-scanned); already-saved scans persist.

3. **Duplicate / re-scanned box.** → Deduped client-side (`inFlightRef` + existing scans) and again
   server-side. → Toast "This box is already in the scan list" / "already scanned for this docking". →
   Risk: none.

4. **SAP down while creating or searching bills.** → The create/search calls fail. → Operator sees a
   toast/inline error like "SAP system is currently unavailable. Please try again later." and no
   docking is created. → Risk: the bill stays a pending booking on the board; retry when SAP is back.

5. **A bill added after gate-in.** → Add it via Inside Vehicle Manager "Add Bill" (or it auto-merges
   server-side) **while the truck photo hasn't been taken**. → The bill appears on the existing
   docking; after photo-lock the picker note says adding is blocked. → Risk: post-lock late bills
   need a new trip.

6. **Stale / stuck-inside truck.** → From Inside Vehicle Manager use **Mark Out** (empty-out) to reset
   the trip, or the truck departs automatically once the last chain dispatches. → Operator sees the
   truck leave the inside list. → Risk: if a gate-in isn't retired, `arrival_can_depart` stays false
   and Depart won't appear — the empty-out path is the manual escape hatch.

7. **Cross-company blank data.** → The board and detail read the docking by its own company, not the
   active selector. → The sibling-company docking renders normally. → Risk: a new screen that filters
   by the active company header instead of the entry would reintroduce blank/hidden siblings.

8. **Missing weighbridge weight at the gate.** → On the gate surface, Mark Dispatched is blocked. →
   Operator is routed to "Record Gross Weight" first (`getNextAction` returns `weighment`), and a
   failed dispatch shows the server's exact weight message. → Risk: none.

9. **Print lock engaged.** → `gatepass_print_locked` is true on the entry. → The gatepass screen
   shows a lock banner with `gatepass_lock_reason`; Print/Commit refuse with that reason (server 423).
   → Risk: none; an admin must clear the lock.

10. **Inside-Vehicle action without permission.** → The corresponding button is simply **not rendered**
    (`canAdd`/`canRemove`/`canMove`/`canUnlink`/`canMarkOut` each `hasPermission(...)`). → The operator
    never sees a button they can't use. → Risk: for **Add / Remove / Move / Unlink**, none — the backend
    re-enforces the same per-action perm. For **Mark Out** the gate is UI-only: it routes to the
    empty-vehicle-out wizard, which the backend guards with auth + company scope, **not**
    `can_mark_out_inside_vehicle`; likewise the combined-arrival dispatch/depart/empty-out endpoints are
    auth + scope only. A determined user with those routes can act without the button-perm.

---

## Failure modes / what can break (operator-visible)

| Failure | Where | What the operator sees |
|---|---|---|
| Un-synced scans lost on reload | scan page (in-memory queue) | scanned count drops back; boxes must be re-scanned |
| Readiness incomplete | gatepass Print | inline "…is not ready for gatepass: truck_photo_geolocation, bilty_no, …" |
| Company print-locked | gatepass Print/Commit/Reprint | lock banner + toast with the lock reason (server 423) |
| Partial not approved / no credit note | Print | error explaining a pending approval or missing credit note |
| Bad/missing gross weight | gate Mark Dispatched | server weight message ("Gross weight is required…") |
| Sibling company not ready | multi-company dispatch | "`<CODE>`: Print must be committed…"; nothing dispatches |
| Depart too early | Depart Truck | "All companies must be dispatched before the truck can depart." |
| Duplicate SAP bill on create | New Entry | "SAP document … is already docked as DOCK-…" |
| Scanning a closed docking | scan page | auto-redirects to the current step with a toast; scans disabled |
| No permission to scan/print/dispatch | any action | button hidden or inline "You do not have permission to …" |

---

## Improvement opportunities & known gaps

- **Scan queue is not persisted.** A reload or crash before the background queue drains loses
  un-synced scans. Persisting the queue (IndexedDB/localStorage) would make the scan page truly
  offline-resilient. (Note: the `customerSalesFlow.storage.ts` localStorage helpers are a legacy
  demo/customer-return path, **not** used by the live server-backed docking flow.)
- **Expected-box counts are name-parsed.** `salesDispatchBoxCounts.ts` derives box counts from item
  names (pack size); a mis-named item skews the progress bar and the partial/complete badges.
- **No self-service unwind from PRINT_COMMITTED.** The UI offers no way back once committed; a stuck
  committed load needs admin/backend intervention.
- **Two surfaces, one record.** The `/dispatch/docking` vs `/gate/sales-dispatch` split is powerful
  but subtle (`isGateOutMode`); mislabeled links can send a user to the wrong action set.
- **Some action-perms are UI-only.** `INSIDE_VEHICLE_MARK_OUT` and the combined-arrival actions gate
  the button but not the backend endpoint (auth + company scope only). If these are meant to be real
  authorisation boundaries, the backend endpoints need the matching `required_permissions`; until then
  the buttons are the only enforcement, so hiding them is necessary but not sufficient.

---

## Permissions & roles (nav gating)

Route access is enforced by each route's `permissions:` in the module configs; individual buttons
are gated by `usePermission().hasPermission(...)`. Permission constants live in
`src/config/permissions/gate.permissions.ts` (`GATE_PERMISSIONS.SALES_DISPATCH.*`),
`admin.permissions.ts` (`ADMIN_PERMISSIONS.DOCKING.*`), and `dispatch.permissions.ts`
(`DISPATCH_PERMISSIONS.INSIDE_VEHICLE_*`).

| UI capability | Permission |
|---|---|
| See the docking board / open an entry | `GATE_PERMISSIONS.SALES_DISPATCH.VIEW` (`gate_core.can_view_sales_dispatch_out`) |
| Start a docking / scan boxes / attach | `SALES_DISPATCH.CREATE` (`…can_create…`); scan also accepts EDIT |
| Print / commit / reprint gatepass | `SALES_DISPATCH.PRINT_GATEPASS` / `COMMIT_PRINT` / `REPRINT_GATEPASS` |
| Record weight / mark dispatched (gate) | `SALES_DISPATCH.DISPATCH` (`…can_dispatch…`) |
| Request scan-skip / partial-scan | `ADMIN_PERMISSIONS.DOCKING.REQUEST_SCAN_SKIP` / `REQUEST_PARTIAL_SCAN` |
| Approve scan-skip / partial-scan (admin queue) | `DOCKING.APPROVE_SCAN_SKIP` / `APPROVE_PARTIAL_SCAN` |
| Inside Vehicle Manager: view | `DISPATCH_PERMISSIONS.INSIDE_VEHICLE_VIEW` |
| Inside Vehicle: Add / Remove / Move / Unlink (**backend re-enforced**) | `INSIDE_VEHICLE_ADD_BILL` / `REMOVE_BILL` / `MOVE_BILL` / `UNLINK_ALL` |
| Inside Vehicle: Mark Out (**frontend-only gate**) | `INSIDE_VEHICLE_MARK_OUT` (`can_mark_out_inside_vehicle`) — hides the button; the empty-out wizard it opens is auth-gated, not perm-gated |

**Nav gating note:** the sidebar and each action button gate on the **permission**, not the Django
group — changing a group's perms alone can hide/show whole modules. Every Inside-Vehicle button and
every wizard action is hidden when the user lacks the specific perm. The backend rejects a forged call
with 403 for the wizard actions (print/commit/dispatch/scan) and for Inside-Vehicle **add/remove/move/
unlink**. It does **not** re-check the perm for **Mark Out** or for the combined-arrival
gatepass/dispatch/depart/empty-out endpoints — those are guarded by auth + company scope only, so
treat their button-perms as UI hints, not hard controls.

---

## Developer file map

### Frontend (`C:/Users/gurpa/dev/FactoryFlow/src`)

| Path | Contents |
|---|---|
| `modules/gate/pages/customerSalesFlow/SalesDispatchDashboardPage.tsx` | Docking board: live dockings grouped by truck + pending bookings |
| `…/SalesDispatchNewPage.tsx` | Step 1 — pick bills + vehicle/driver, create/merge docking |
| `…/SalesDispatchBarcodeScanPage.tsx` | Step 2 — per-bill scanning, camera/gun, offline queue, skip/partial panels, barcode-import dialog |
| `…/SalesDispatchAttachmentsPage.tsx` | Step 3 — truck photo (geo), bilty, e-way, other documents |
| `…/SalesDispatchGatepassPage.tsx` | Step 4 — print → commit → (gate) weigh → dispatch → depart; reprint |
| `…/SalesDispatchGateOutWeighmentPage.tsx` | Gross weighment (gate surface) |
| `…/SalesDispatchDetailPage.tsx` | Read-only detail + correction actions |
| `…/SalesDispatchReprintPage.tsx` / `SalesDispatchReportsPage.tsx` / `SalesDispatchSapGatepassPrint.tsx` | Reprint search, reports, SAP gatepass print |
| `…/salesDispatchRoutes.ts` | Route builders + `isSalesDispatchOutPath` (gate-vs-docking surface) |
| `…/salesDispatchFlow.helpers.ts` / `salesDispatchBoxCounts.ts` / `salesDispatchVehicleGrouping.ts` | Formatting, pack-size box counts, truck grouping |
| `…/salesDispatchBoxCounts.ts` | Pack-size-aware expected box counts (mirrors backend) |
| `…/ReviewModeBanner.tsx` / `ExpectedVehiclesSection.tsx` / `ArrivalCombinedGatepassPanel.tsx` | Review banner, expected vehicles, combined-gatepass panel |
| `modules/gate/api/salesDispatch/{salesDispatch.api.ts,salesDispatch.queries.ts}` | Types, `salesDispatchApi`, React Query hooks |
| `modules/gate/api/partialDispatch/*` , `arrivals/*` | Partial-dispatch + arrival API/hooks |
| `modules/admin/api` (docking) | Scan-skip / partial-scan request hooks (`useCreateDockingScanSkipRequest`, `useDockingPartialScanRequestByDispatch`, …) |
| `modules/vehicle-management/pages/InsideVehicleManagerPage.tsx` | Inside Vehicle Manager correction console (per-action perms) |
| `modules/dispatch/module.config.tsx` | `/dispatch/docking/**` routes (primary docking wizard) |
| `modules/gate/module.config.tsx` | `/gate/sales-dispatch/**` routes (gate-out surface) + admin scan approvals |
| `modules/gate/hooks/useEntryId.ts` | Threads `vehicle_entry` id through the wizard |
| `config/permissions/{gate,admin,dispatch}.permissions.ts` | Permission constants |

---

## Related docs

- **Paired backend doc:** `C:/Users/gurpa/dev/factory_app/gate_core/docs/sales_dispatch.md`
- FactoryFlow `docs/modules/gate.md` — gate module overview
- FactoryFlow `docs/modules/barcode.md`, `docs/modules/barcode-dispatch-design.md` — box scanning + legacy dispatch
- FactoryFlow `docs/modules/sap-plan-dashboard.md` / `sap-plan-dashboard-frontend.md` — upstream dispatch planning
