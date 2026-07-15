# Goods Return — Frontend (modules/gate)

> The screens and user journeys for **Customer / Goods Return** (finished goods
> coming back from a customer) **and** **Rejected-QC Return** (QA-rejected raw
> material going back out to the vendor).
>
> Paired backend doc: `C:/Users/gurpa/dev/factory_app/gate_core/docs/goods_return.md`
>
> Status: **built, adoption pending.** Trust the code. The two flows share the
> "return" label and the `modules/gate` folder but behave very differently: one
> persists to the server, the other lives **only in the browser**.

---

## Overview — what it does & who uses it

| Flow | Screens live in | Persistence | Who |
| --- | --- | --- | --- |
| **Customer / Goods Return** | `src/modules/gate/pages/customerSalesFlow/CustomerReturn*.tsx` | **Browser `localStorage` only** + one read-only SAP invoice lookup | Gate clerk receiving returned finished goods |
| **Rejected-QC Return** | `src/modules/gate/pages/rejectedMaterialPages/*` | **Real backend** (`/gate-core/rejected-qc-returns/`) + a local mirror | Gate/QC staff sending rejected raw material back to the vendor |

- **Customer / Goods Return** is a multi-step *prototype*: look up a SAP sales
  invoice, record which lines are coming back and why, attach documents, then hand
  off to QC and finally record a manual SAP goods-return number. **Every bit of that
  is stored in the operator's browser.** The only server call is the invoice search.
- **Rejected-QC Return** is a 3-step wizard that **does** save to the server on the
  last step. Its dashboard reads the server list (with a local fallback).

Neither flow uses **barcode scanning** — items are chosen from dropdowns/tables, not
scanned. If you're looking for box-scan behaviour, that's the *sales dispatch* flow,
not this one.

---

## Key concepts & entities (frontend)

### Shared building blocks

- **`VehicleSelect` / `DriverSelect`** (`src/modules/gate/components`) — pick an
  existing vehicle/driver (with "create" dialogs). Selecting sets ids used by the
  backend.
- **`StepHeader` / `StepFooter`** — the wizard chrome (step X of Y, Next/Previous/
  Cancel).
- **`RequiredWeighmentForm`** + `src/modules/gate/utils` (`validateRequiredWeighment`,
  `calculateRequiredNetWeight`, `buildRequiredWeighmentDateTime`) — the weighbridge
  sub-form shared with other gate-out flows.
- **`GateStatusBadge`** — renders the status pill.

### Customer / Goods Return state model

`src/modules/gate/pages/customerSalesFlow/customerSalesFlow.storage.ts`

- **`localStorage` key `gate.customer-return.completed-entries`** (`CUSTOMER_RETURN_KEY`)
  holds an array of **`CustomerFlowEntry`** objects. Helpers:
  `readCustomerFlowEntries`, `upsertCustomerFlowEntry`, `updateCustomerFlowEntry`,
  `findCustomerFlowEntry`.
- **`CustomerFlowEntry`** = `{ id, entryNo, status, values: Record<string,…>, items:
  CustomerFlowItem[], createdAt, updatedAt }`. `values` is a loose bag of strings
  (invoice fields, vehicle/driver, SAP GR fields, attachment file-name lists as JSON).
- **`CustomerFlowStatus`**: `IN_PROGRESS` → `PENDING_QC` → (`QC_ACCEPTED` /
  `QC_PARTIAL` / `QC_REJECTED`) → `PENDING_SAP_GR` → `COMPLETED`; plus `CANCELLED`,
  `POSTED`. `getCustomerReturnStatusLabel` renders these, including the factory-head
  decision label for rejected entries (`CUSTOMER_RETURN_FACTORY_HEAD_DECISION_LABELS`).
- **`CustomerReturnInvoice`** (`api/customerReturnInvoice/customerReturnInvoice.api.ts`)
  — the shape returned by the SAP invoice lookup.

### Rejected-QC Return state model

`src/modules/gate/pages/rejectedMaterialPages/rejectedQcReturn.storage.ts`

- **Draft** in `localStorage` key `gate.rejected-qc-return.form-draft`
  (`RejectedQCReturnDraft`) — carries the wizard across its 3 steps.
- **Completed mirror** in key `gate.rejected-qc-return.completed-entries`
  (`RejectedQCReturnEntry`), written after a successful server POST.
- **Server types** live in `api/rejectedQcReturn/rejectedQcReturn.api.ts`
  (`RejectedQCReturnCreateRequest`, `RejectedQCReturnEntryResponse`).

---

## End-to-end flows (screen by screen)

### Flow A — Customer / Goods Return (2 visible steps + downstream)

Route base `/gate/customer-return` (see `module.config.tsx`).

1. **Dashboard** — `CustomerReturnDashboardPage.tsx`.
   - Reads `readCustomerFlowEntries(CUSTOMER_RETURN_KEY)` (localStorage), filters by
     the global date range and a free-text search.
   - Stat cards: In Progress, Pending QC, Pending SAP GR, Completed, Awaiting Factory
     Head, Final Rejected. A **Refresh** button just re-reads localStorage.
   - Row click routes to the attachments step if `IN_PROGRESS`, else to the detail
     page.
2. **Step 1/2 — New / Edit** — `CustomerReturnNewPage.tsx`.
   - **Vehicle & Driver** (`VehicleSelect`/`DriverSelect`), a **locked** Gate-In
     date/time (set to *now*, read-only), Security Name.
   - **Source Invoice**: type the SAP invoice number → **Search** runs
     `useCustomerReturnInvoiceSearch` → `GET /dispatch-plans/bills/by-number/<no>/`.
     On success a green "SAP Invoice Found" card shows customer/branch/totals and the
     invoice lines populate the **Returned Items** table.
   - **Returned Items**: per line, enter **Return Qty** (max = invoice qty), Reason,
     Condition.
   - **Return Reference**: Customer Claim No.
   - **Save and Next** validation (client-only): invoice searched, ≥1 line with
     `returnQty > 0`, `returnQty ≤ invoice qty`, vehicle + driver present. Writes the
     entry to localStorage (status `IN_PROGRESS`), routes to attachments.
3. **Step 2/2 — Attachments** — `CustomerReturnAttachmentsPage.tsx` →
   `CustomerSalesAttachmentsPage.tsx` with `flow="return"`.
   - A single **Attachments** upload panel + Attachment Notes + Remarks.
   - **"Complete Goods Return"** sets status to **`PENDING_QC`** and returns to the
     dashboard. *(For the return flow, attachments are optional — the required-doc
     enforcement only applies to `flow="dispatch"`.)*
   - **Only file names are captured** (`file.name`), stored as JSON in
     `values.attachmentFileNames`. No file is uploaded anywhere.
4. **Downstream — QC decision (different module).** The `PENDING_QC` entry is read
   from the **same** localStorage key by
   `src/modules/qc/pages/customerReturns/CustomerReturnQCDashboardPage.tsx` /
   `CustomerReturnQCDetailPage.tsx`, which move it to `QC_ACCEPTED` / `QC_PARTIAL` /
   `QC_REJECTED` (with a factory-head decision) and on to `PENDING_SAP_GR`.
5. **Detail / SAP GR** — `CustomerReturnDetailPage.tsx`.
   - Shows the summary, vehicle/driver, and returned items with a per-line QC result.
   - When status is `PENDING_SAP_GR`, the operator types the **SAP Document No.**
     (+ date/reference/notes) and clicks **Mark SAP Posting Done** → status
     `COMPLETED`. This is a **manual** capture; nothing is posted to SAP.
6. **Downstream — Finance (different module).** Completed returns feed the credit-note
   flow (`src/modules/finance/pages/FinanceMemo*.tsx`) via the shared
   `getCreditableReturnEntries()` helper — again localStorage, not the server.

### Flow B — Rejected-QC Return (3-step wizard, persists on step 3)

Route base `/gate/rejected-qc-return` (aliased at `/gate/rejected-materials`).

1. **Dashboard** — `RejectedQCReturnDashboardPage.tsx`.
   - Reads the **server** list `useRejectedQCReturnEntries()` **and** the local
     mirror. Merge rule (important quirk):
     `if (backendEntries.length === 0) return localEntries;` — when the server has any
     rows, local rows are hidden; when the server returns none, the stale local rows
     show. Date filtering is **client-side only**.
   - One "Completed" stat card; a table of completed entries; **Add New Entry**.
2. **Step 1/3 — Vehicle** — `RejectedQCReturnVehiclePage.tsx`.
   - `VehicleDriverFormShell`; requires a vehicle and driver. Saves to the draft.
3. **Step 2/3 — Items** — `RejectedQCReturnItemsPage.tsx`.
   - **Gate-Out Details**: Gate-Out Date (required), Out Time, Challan No., E-way Bill
     No., Manual SAP Reference, Security Name.
   - **Select Return Items**: dropdown fed by
     `useReturnToVendorInspections()` (`GET /quality-control/inspections/return-to-vendor/`)
     — QA-rejected, not-yet-returned inspections for the active company. Add rows to a
     table; already-selected items are filtered out. Requires ≥1 item + a gate-out
     date to advance.
4. **Step 3/3 — Weighment** — `RejectedQCReturnWeighmentPage.tsx`.
   - `RequiredWeighmentForm` (gross/tare/slip/times; net computed) + a **Gatepass
     Document** upload (again **file names only**).
   - **Complete Entry** validates weighment + ≥1 gatepass file, then
     `useCreateRejectedQCReturn().mutateAsync(...)` → `POST /gate-core/rejected-qc-returns/`
     with `inspection_ids = items.map(id)`.
   - On success: writes a `COMPLETED` entry to the local mirror, **clears the draft**,
     routes to the dashboard.
   - On failure: shows the backend `detail` message (e.g. "Only QA-rejected QC items
     can be returned to vendor") and **keeps the draft** so the operator can retry.

---

## State / offline behaviour (read this)

- **Customer / Goods Return is 100% client-side state.** Every entry, item,
  attachment name, QC decision, and SAP GR number lives in
  `localStorage['gate.customer-return.completed-entries']` in **one browser on one
  machine for one login**. There is:
  - **no sync** across devices, browsers, or users — two clerks cannot share a queue;
  - **no company scoping of the local data** — the same entries show regardless of the
    active Company-Code (only the invoice *search* is company-scoped, server-side);
  - **no recovery** — clearing site data, a new device, or a different user = the
    entries are simply gone, with no error.
- **Rejected-QC Return is server-backed**, but keeps a local mirror + a form draft.
  The draft (`gate.rejected-qc-return.form-draft`) survives refreshes mid-wizard and
  is only cleared on a successful POST — good for retry. The completed mirror can
  drift from the server (see the dashboard merge quirk).
- **No scanner / offline-scan handling anywhere in this module.** Item selection is
  online (the rejected-QC list is a live query; the customer invoice is a live SAP
  lookup). If the network/SAP is down you cannot pick items — there is no offline
  queue.

---

## Permission-gated navigation

Routes and gates are in `src/modules/gate/module.config.tsx`; permission constants in
`src/config/permissions/gate.permissions.ts`.

- **Customer / Goods Return** routes gated by
  `GATE_PERMISSIONS.CUSTOMER_RETURN.VIEW` / `.CREATE`, both mapped to
  `person_gatein.can_view_dashboard`:
  - `/gate/customer-return` (dashboard, VIEW)
  - `/gate/customer-return/new` (+ `/new/attachments`) (CREATE)
  - `/gate/customer-return/:entryId` (detail, VIEW)
- **Rejected-QC Return** routes gated by
  `GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW` (`raw_material_gatein.view_poreceipt`)
  and `.CREATE` (`raw_material_gatein.add_poreceipt`):
  - `/gate/rejected-qc-return` and alias `/gate/rejected-materials` (dashboard, VIEW)
  - `.../new`, `.../new/items`, `.../new/weighment` (VIEW + CREATE)
- **Sidebar nav:** neither flow appears in the Gate submenu `children` in
  `module.config.tsx`. They are reachable from the **Gate Dashboard tiles**
  (`GateDashboardPage.tsx`, gated by `hasAnyPermission(entryType.viewPermissions)`
  via `GATE_ENTRY_TYPES`) and by direct URL. So a user with the permission but who
  never opens the dashboard tile may not discover them.
- **Dashboard tile data source differs:** the customer-return tile counts come from
  `localStorage` (`readCustomerFlowEntries`); the rejected-QC tile counts come from
  the server hook (`useRejectedQCReturnEntries`, enabled only when the tile is
  visible).

---

## Real-world edge cases

Each: **trigger → current behaviour → operator-visible symptom → risk/gap.**

1. **Operator clears browser data / uses another machine (customer flow).**
   → All customer-return entries are gone; QC and Finance (which read the same key)
   see nothing.
   → Dashboard shows "No goods return entries yet"; no error.
   → Risk: **high** — silent, total data loss; work simply disappears.

2. **SAP down during invoice search (customer flow).**
   → `useCustomerReturnInvoiceSearch` errors; page distinguishes not-found from
   outage via `isNotFoundError`.
   → Inline red banner: "No SAP invoice found for …" or "Unable to search SAP invoice
   right now." Cannot proceed.
   → Risk: the whole customer flow is blocked without SAP.

3. **Return qty exceeds invoice qty (customer flow).**
   → Client validation on **Save and Next** blocks it.
   → "Return quantity cannot be greater than invoice quantity."
   → Risk: guard is client-only; nothing prevents a *second* return against the same
   invoice, so cumulative over-return is possible.

4. **Attachments "uploaded" but not really (both flows).**
   → Only `file.name` is stored; the file is never sent.
   → UI shows the file name with a remove button and looks successful.
   → Risk: the gatepass/invoice document referenced does not exist anywhere; useless
   for later retrieval or audit.

5. **Rejected-QC list is empty in the wrong company.**
   → `useReturnToVendorInspections` is company-scoped server-side.
   → Items dropdown shows "No more Return to Vendor items".
   → Risk: "blank in sibling company" confusion; operator must switch Company-Code.

6. **Duplicate rejected-QC item / re-submit.**
   → Server rejects an already-returned inspection; the frontend keeps the draft and
   shows the backend `detail`.
   → "Only QA-rejected QC items can be returned to vendor" / "… already returned".
   → Risk: low; retry-safe.

7. **Rejected-QC dashboard merge quirk.**
   → When the server list returns rows, the local mirror is hidden; when it returns
   none (e.g. filtered/errored), stale local rows appear instead.
   → Operator may see an entry "reappear" or "vanish" depending on server results.
   → Risk: confusing counts; the dashboard is not a single source of truth.

8. **Missing weighbridge weight (rejected-QC).**
   → `validateRequiredWeighment` blocks completion; if bypassed, server 400s.
   → Inline weighment error; **Complete Entry** disabled/erroring.
   → Risk: none — weighing is enforced.

9. **Returning-goods vehicle isn't tracked at the gate (customer flow).**
   → No `VehicleEntry`/arrival is created; the truck never shows on any inside-vehicle
   board.
   → Nothing visible; security has no record.
   → Risk: no gate/inside-truck trail for returned-goods vehicles.

10. **Factory head chose Scrap/Accept-override, gate still returns it (rejected-QC).**
    → The item is still QA-rejected + not returned, so it stays selectable and posts.
    → No symptom — it succeeds.
    → Risk: material can be sent to vendor against the factory-head decision (not
    enforced).

---

## Failure modes / what an operator or manager notices

| Failure | Screen | What they see |
| --- | --- | --- |
| SAP outage / bad invoice | `CustomerReturnNewPage` | Red banner: "Unable to search SAP invoice right now." / "No SAP invoice found for …" |
| Over-qty / missing line/vehicle | `CustomerReturnNewPage` | `StepHeader` error line under the title |
| Return-to-vendor list empty | `RejectedQCReturnItemsPage` | "No more Return to Vendor items" in the dropdown |
| Server rejects the return | `RejectedQCReturnWeighmentPage` | Backend `detail` shown; draft preserved for retry |
| Weighment invalid | `RejectedQCReturnWeighmentPage` | Weighment validation message |
| Local data lost | both dashboards | Empty tables, no error — the entries are just gone (customer flow) |
| Attachment "lost" | both attachment steps | Nothing at the time; the document is simply never retrievable later |

---

## Improvement opportunities & known gaps

- **Persist the customer-return flow server-side.** It has no backend model; move it
  off `localStorage` before real adoption (audit, multi-user, company scoping,
  over-return enforcement, real SAP posting).
- **Actually upload attachments.** Replace file-name capture with a real upload (both
  flows) so gatepass/invoice/delivery documents exist beyond a string.
- **Fix the rejected-QC dashboard merge** so server and local don't hide each other;
  push the date range to the server (`from_date`/`to_date` are supported but unused
  by the dashboard).
- **Surface these flows in the sidebar** (or a discoverable entry) — today they rely
  on dashboard tiles/direct URLs.
- **Enforce the factory-head `RETURN_TO_VENDOR` decision** on the rejected-QC path if
  that is the intended control.
- **Reconcile permissions**: the frontend gates rejected-QC by
  `raw_material_gatein.*` and customer-return by `person_gatein.can_view_dashboard`,
  while the backend rejected-QC endpoints enforce no object permission at all.

---

## Developer file map

**Customer / Goods Return**

- Pages: `src/modules/gate/pages/customerSalesFlow/CustomerReturnDashboardPage.tsx`,
  `CustomerReturnNewPage.tsx`, `CustomerReturnAttachmentsPage.tsx`
  (→ `CustomerSalesAttachmentsPage.tsx`), `CustomerReturnDetailPage.tsx`.
- State: `src/modules/gate/pages/customerSalesFlow/customerSalesFlow.storage.ts`.
- API: `src/modules/gate/api/customerReturnInvoice/customerReturnInvoice.api.ts`
  + `.queries.ts` (`useCustomerReturnInvoiceSearch`).
- Endpoint constant: `API_ENDPOINTS.DISPATCH_PLANS.BILL_BY_NUMBER`
  (`src/config/constants/api.constants.ts`).
- Downstream: `src/modules/qc/pages/customerReturns/CustomerReturnQC*Page.tsx`,
  `src/modules/finance/pages/FinanceMemo*.tsx`.

**Rejected-QC Return**

- Pages: `src/modules/gate/pages/rejectedMaterialPages/RejectedQCReturnDashboardPage.tsx`,
  `RejectedQCReturnVehiclePage.tsx`, `RejectedQCReturnItemsPage.tsx`,
  `RejectedQCReturnWeighmentPage.tsx`.
- State: `src/modules/gate/pages/rejectedMaterialPages/rejectedQcReturn.storage.ts`.
- API: `src/modules/gate/api/rejectedQcReturn/rejectedQcReturn.api.ts` + `.queries.ts`
  (`useRejectedQCReturnEntries`, `useCreateRejectedQCReturn`).
- Item source: `src/modules/qc/api/inspection/inspection.queries.ts`
  (`useReturnToVendorInspections`).
- Endpoint constants: `API_ENDPOINTS.GATE_CORE.REJECTED_QC_RETURNS` /
  `REJECTED_QC_RETURN_BY_ID`.

**Shared / config**

- Routes + gates: `src/modules/gate/module.config.tsx`.
- Permissions: `src/config/permissions/gate.permissions.ts`
  (`CUSTOMER_RETURN`, `REJECTED_QC_RETURN`).
- Dashboard tiles: `src/modules/gate/pages/GateDashboardPage.tsx`,
  `src/modules/gate/constants/gateEntryTypes.ts`.

---

## Related docs

- **Paired backend doc:** `C:/Users/gurpa/dev/factory_app/gate_core/docs/goods_return.md`
- `C:/Users/gurpa/dev/FactoryFlow/docs/modules/gate.md` — the wider Gate module.
- `C:/Users/gurpa/dev/FactoryFlow/docs/modules/sales-dispatch-docking.md` — the
  outbound counterpart that shares the `customerSalesFlow` folder + attachments page.
- `C:/Users/gurpa/dev/FactoryFlow/docs/modules/qc.md` — QC inspections that produce
  the rejected lots and drive the customer-return QC handoff.
