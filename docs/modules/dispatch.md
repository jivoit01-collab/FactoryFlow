# Dispatch (Outbound Finished Goods) — Frontend

React + Vite module folder: **`src/modules/dispatch/`**

> Backend companion doc: `C:/Users/gurpa/dev/factory_app/dispatch_plans/docs/README.md`

---

## Overview — what it does & who uses it

The Dispatch module is the operator-facing surface for shipping finished goods: from
assigning a truck to a SAP A/R invoice, through the physical gate → dock → box-scan →
gatepass → dispatch-out journey, to billing the transporter's freight.

It is a **composite / umbrella module**: `module.config.tsx` registers everything
under the `/dispatch/*` URL space and one sidebar group, but most screens are
**lazy-imported from other modules**. Only a handful of pages actually live in this
folder (the dispatch landing dashboard, Open Bilties, and the Transporter A/P Invoice
pages). The rest are composed in:

| Screen | Route | Actually lives in |
|---|---|---|
| Dispatch landing (card launcher) | `/dispatch` | `src/modules/dispatch/pages/DispatchDashboardPage.tsx` |
| Plans dashboard | `/dispatch/plans` | `src/modules/dashboards/dispatch-plans/` |
| Vehicle Linking | `/dispatch/vehicle-linking` | `src/modules/vehicle-management/pages/DispatchVehicleLinkingPage.tsx` |
| Inside Vehicle Manager | `/dispatch/inside-vehicles` | `src/modules/vehicle-management/pages/InsideVehicleManagerPage.tsx` |
| Docking (+ new, box-scan, attachments, gatepass, reprint, detail) | `/dispatch/docking/*` | `src/modules/gate/pages/customerSalesFlow/` |
| Service GRPO (+ pending, preview, history) | `/dispatch/bilty-grpo/*` | `src/modules/warehouse/grpo/` |
| Open Bilties | `/dispatch/open-bilties` | `src/modules/dispatch/pages/OpenBiltiesPage.tsx` |
| A/P Invoice (+ pending, history, detail) | `/dispatch/transporter-invoices/*` | `src/modules/dispatch/pages/Transporter*Page.tsx` |

Audiences: **dispatch planners** (Plans, Vehicle Linking), **gate/warehouse
operators** (Docking, box scanning), **dispatch supervisors** (Inside Vehicle
Manager), **transporter-billing/finance** (Service GRPO, Open Bilties, A/P Invoice),
and **managers** (the read-only Plans/pipeline dashboard).

---

## Key concepts & entities (frontend view)

- **Dispatch bill** — a SAP A/R invoice row + its local `DispatchPlan` overlay. Carries a computed **`pipeline_status`** (`stage`, `stage_label`, and a "`<status> at <module>`" `module_label`, e.g. *"docked at dock"*, *"pending at sales dispatch out"*).
- **Booking status** — `PENDING` / `BOOKED` / `DISPATCHED` / `CANCELLED`.
- **`is_vehicle_link_locked`** — a serialized flag that turns off the vehicle/driver/transporter editors once the truck has physically gated in (VehicleEntry `COMPLETED`). The UI must respect this and hide/disable those controls.
- **Open bilty** (`OpenBilty` type) — a posted freight **service GRPO** not yet consumed by a transporter A/P invoice.
- **Transporter A/P invoice** (`TransporterAPInvoicePosting`) — consolidates selected open bilties; status `PENDING`/`POSTED`/`FAILED`/`CANCELLED`.
- **Docking / arrival** — a docking is per-company; a cross-company truck is one physical **arrival**. The Company-Code selector is a **decorator** across the four gate modules (Empty Vehicle In, Docking, Sales Dispatch Out, Reprint) — same all-company data + actions in place, no company switching.

Types live in `src/modules/dispatch/types/dispatch.types.ts` (Open bilty + all
transporter-invoice request/response shapes).

---

## End-to-end flows (user journeys)

### Flow 1 — Land & fan out (`/dispatch`)
`DispatchDashboardPage` renders a grid of cards (Plans, Vehicle Linking, Inside
Vehicle Manager, Docking, Reprint Gatepass, Service GRPO, Open Bilties, A/P Invoice).
Each card is filtered by `usePermission().hasAnyPermission(card.permissions)`, so an
operator only sees the sub-modules they can use. Clicking a card navigates to it.

### Flow 2 — Plan & book a bill (Plans / Vehicle Linking)
1. The Plans dashboard reads `GET /dispatch-plans/bills/` (window over SAP invoice or scheduled `dispatch_date`) and shows each bill with its live pipeline chip.
2. Vehicle Linking lets a planner set vehicle/transporter/driver/bilty/freight/`dispatch_date` and flip `booking_status` to `BOOKED` — `PATCH /dispatch-plans/bills/<doc_entry>/plan/` (multipart when a bilty file is attached).
3. Once the truck gates in, the editor **locks** (`is_vehicle_link_locked`); further transport edits are blocked (backend returns a "Vehicle linking is locked…" 400 if attempted).

### Flow 3 — Physical dispatch (Docking, `/dispatch/docking/*`)
The docking wizard (owned by the **gate** `customerSalesFlow` module) walks
**new docking → box scan → attachments → gatepass → commit → dispatch**. Box
scanning happens on `SalesDispatchBarcodeScanPage`; the gatepass step prints the
`DCK/…` gatepass and, for a multi-company truck, dispatches all companies together
then departs the arrival. The **Reprint Gatepass** screen re-issues audited copies.
(Deep scan/offline internals are documented in `gate.md`.)

### Flow 4 — Inside Vehicle Manager (`/dispatch/inside-vehicles`)
The dispatch correction console for trucks already inside: **add / remove / move /
unlink** bills, plus **mark out**. The first four are each a separate permission and
a separate `/gate-core/inside-dispatch-vehicles/*` endpoint (`add-bill`,
`remove-bill`, `move-bill`, `unlink-all`); **mark out has no such endpoint** — it
navigates to the empty-vehicle-out / arrival flow, and its
`can_mark_out_inside_vehicle` permission is a **frontend-only** gate (hides the
button; no backend view enforces it). This is the supported recovery path for "bill
booked after gate-in" and stuck-inside trucks (see Edge Cases).

### Flow 5 — Transporter freight billing
1. **Service GRPO** (`/dispatch/bilty-grpo`) — post the freight for a bilty as a service GRPO (warehouse/grpo pages; pending queue at `/dispatch/bilty-grpo/pending`).
2. **Open Bilties** (`/dispatch/open-bilties`) — `useOpenBilties()` polls `GET /dispatch/open-bilties/` every 60s (staleTime 30s); lists posted GRPOs awaiting an A/P invoice.
3. **A/P Invoice** (`/dispatch/transporter-invoices`) — `TransporterInvoicesPage` shows a **Pending A/P** card (PENDING+FAILED count + value), a **Posting History** row of Pending/Posted/Failed cards, and quick actions. Two-step posting:
   - `useSubmitTransporterInvoice()` → `POST /dispatch/transporter-invoices/submit/` (validate + persist a PENDING posting; multipart with attachments).
   - `usePostSubmittedAPInvoice()` → `POST /dispatch/transporter-invoices/<id>/post-ap-invoice/` (push to SAP). `usePostTransporterInvoice()` does both at once via `.../post-ap-invoice/`.
   - The **detail** page (`/dispatch/transporter-invoices/history/:postingId`) is where a **FAILED** invoice is retried — it reads `useTransporterInvoiceDetail()` and re-posts. On success, `onSuccess` invalidates the open-bilties, history, and detail query keys so every list refreshes.

---

## State, offline & scanning behaviour

- **Data layer** — TanStack React Query. Keys are centralised in `DISPATCH_QUERY_KEYS` (`api/dispatch.queries.ts`). Mutations invalidate the affected keys on success (open bilties + invoice history + that invoice's detail) so no manual refetch is needed.
- **Polling** — Open Bilties auto-refreshes on a 60s interval (30s stale). Other lists refetch on mount / window focus per React Query defaults.
- **Cross-company & the query key** — cross-company reads send `?all_companies=1`; that flag **must** be part of the React-Query key, or switching the active Company-Code won't refetch and the list shows the wrong company's data. The Company-Code selector is cosmetic for the gate/dispatch flows.
- **Attachments** — transporter-invoice submit/post switch to `multipart/form-data` when `attachments` are present, packing the JSON payload into a `data` field and appending each `File` (`dispatch.api.ts`).
- **Scanning** — the live docking box-scan is the gate module's `SalesDispatchBarcodeScanPage`; box-level idempotency and duplicate/already-dispatched rejection are enforced **server-side** (a re-scanned box returns "This box is already scanned"; an already-shipped box "Box already dispatched"). There is also a **separate, standalone** barcode `DispatchSession` scanner (backend `/api/v1/barcode/dispatch/…`) that is **not wired into this module's navigation**.

---

## Critical business rules the UI must honour

- **Respect `is_vehicle_link_locked`** — once true, do not offer vehicle/driver/transporter re-assignment; the backend will 400 anyway.
- **Never book a fresh bill onto an inside truck from Vehicle Linking** — that path is blocked server-side; direct the user to **Inside Vehicle Manager → Add Bills to Inside Vehicle**.
- **A/P invoice preconditions** — one vendor + one SAP branch across the selected bilties; the entered amount must match the selected GRPO total within **INR 1.00**; at least one **attachment**; the invoice number must be unique. All are enforced server-side and surface as `400` messages the UI shows verbatim.
- **Booking status is not a free toggle** — after gate-in it is part of the locked field set.

---

## Real-world edge cases (what the operator sees)

Each: **trigger → current behaviour → operator-visible symptom → risk/gap.**

1. **Partial truck load** — one bill on a multi-bill truck ships, another was never loaded. → The truck never fully retires; the un-loaded bill stays `BOOKED`. → In Vehicle Linking / Expected Dispatch the bill shows **"Already inside — can't start"**; the truck lingers in **Inside Vehicle Manager**. → Recovery is manual (unlink/mark-out the stragglers).

2. **Bill booked after gate-in** — planner tries to add a new bill to a truck already inside. → Vehicle Linking **rejects** it ("<vehicle> is already inside … Add bills from 'Add Bills to Inside Vehicle'"). → The bill appears stuck in Expected Dispatch. → **Correct action:** Inside Vehicle Manager → Add Bills to Inside Vehicle (attaches to the live arrival).

3. **Stale vehicle arrival** — a daily truck returns and its new gate-in latches onto yesterday's un-departed arrival. → Truck reads **"docked / inside since yesterday"**. → Only a manual empty-vehicle-out (or Inside Vehicle Manager mark-out) frees it.

4. **Bill shows "Rejected / Cancelled" but is really re-bookable** — a freed bill still points at a cancelled docking. → Pipeline chip reads **REJECTED** even though the bill can ship on a later trip. → Known backend quirk (`_pick_representative_gate_out` ignores `is_active`); the operator should trust Inside Vehicle Manager / re-linking, not the stale chip.

5. **SAP down while loading Plans / bill lookup** — HANA unreachable. → The page shows an **"SAP system is currently unavailable"** banner (backend 503); the read-only **schedule** still loads but item/warehouse columns are blank (`sap_available:false`). → Pipeline/booking data (Postgres) is unaffected.

6. **SAP rejects the A/P invoice on post** — validation/connection error during posting. → The invoice flips to **FAILED**; `TransporterInvoicesPage` shows it under the red **Failed** count with the SAP reason, and the history-load error banner offers a **retry** button. → Operator re-posts from the invoice detail page (only PENDING/FAILED are re-postable); already-uploaded attachments re-link.

7. **A/P amount mismatch / duplicate invoice number** — amount off by > INR 1.00, or the number already exists. → Submit/post is blocked with a `400` the UI displays ("amount does not match … within INR 1.00" / "already been submitted/posted"). → No SAP document is created.

8. **Re-scanned / already-dispatched box** — operator scans the same box twice, or a box already shipped. → The scan screen shows a **rejected-scan** message from the backend ("already scanned" / "already dispatched"). → The load total is not double-counted; rejections are logged.

9. **Missing weighbridge weight** — a docking is gatepass-printed & committed but never weighed out. → The bill sits at **"Print Committed"** on the pipeline and the truck stays inside. → No automatic nudge; a supervisor must finish or abandon the docking.

10. **Slow Pending Bilty GRPO page** — as the backlog grows, this queue gets sluggish. → Because the backend does one live SAP read **per row** (audit item B-C1). → Symptom: spinner lingers; not a data-loss bug, a performance one.

---

## Failure modes / what can break

| Failure | UI symptom |
|---|---|
| SAP unavailable (503) | Amber "SAP system is currently unavailable" banner on Plans/lookup; blank schedule item columns |
| SAP data error (502) | "SAP data error: …" message |
| History/list load fails | Yellow "Failed to Load" banner with a refresh (retry) button (`TransporterInvoicesPage`) |
| A/P invoice post fails | Invoice under the red **Failed** card; SAP reason on detail; retry available |
| Editing a locked plan | Backend 400 "Vehicle linking is locked…"; the UI should have already disabled those fields |
| Booking onto an inside truck | 400 redirecting the user to Inside Vehicle Manager |
| Wrong active company (no `all_companies`) | A truck/bill visible in one company appears **blank** in another |

---

## Improvement opportunities & known gaps

- **Front the B-C1 slowness** — until the backend batches the SAP read, consider a skeleton/streamed load on the Pending Bilty GRPO page so it doesn't feel hung.
- **Trust-worthy pipeline chip** — surface a clearer signal when a bill is re-bookable despite a stale REJECTED docking (depends on the backend `is_active` fix).
- **Stuck-inside visibility** — a dashboard badge for "trucks inside > N hours / bills BOOKED but never docked" would catch partial-trip and print-committed stalls early.
- **Composite-module coupling** — many `/dispatch/*` screens live in other modules; renames there silently affect this nav. Keep the route/permission table above in sync.

---

## Permissions & roles (nav gating)

Permission constants: `src/config/permissions/dispatch.permissions.ts`
(`DISPATCH_PERMISSIONS`), `gate.permissions.ts` (`GATE_PERMISSIONS.SALES_DISPATCH`),
and `GRPO_PERMISSIONS`.

- The **Dispatch** sidebar group and `/dispatch` landing appear if the user has **any** of `dispatchViewPermissions` (Plans view, link-vehicle, Inside-Vehicle view, post-bilty-GRPO, view-open-bilties, view/post transporter A/P, or any `SALES_DISPATCH` view/create/reprint/reports). This is why an add-bill-only SCM operator still sees the parent menu.
- Each child route/nav item is gated independently:

| Nav / route | Permission |
|---|---|
| Plans | `dispatch_plans.can_view_dispatch_plans` |
| Vehicle Linking | `dispatch_plans.can_link_dispatch_vehicle` |
| Inside Vehicle Manager | `dispatch_plans.can_view_inside_vehicle_manager` (+ per-action add/remove/move/unlink; **mark-out is a frontend-only gate — not backend-enforced**) |
| Docking / New / Scan / Attachments / Gatepass | `gate_core.can_view_/can_create_sales_dispatch_out` |
| Reprint Gatepass | `gate_core.can_reprint_sales_dispatch_gatepass` |
| Service GRPO | `dispatch_plans.can_post_bilty_service_grpo` (routes also accept `grpo.*`) |
| Open Bilties | `dispatch_plans.can_view_open_bilties` |
| A/P Invoice / Pending | `dispatch_plans.can_post_transporter_ap_invoice` |
| A/P Invoice History / Detail | `dispatch_plans.can_view_transporter_ap_invoice` |

Note the Service GRPO nav is intentionally gated on the **dispatch-owned**
`can_post_bilty_service_grpo` (not the material-GRPO app perms) so material-GRPO
clerks don't see the whole Dispatch module — but the routes themselves OR-accept
`grpo.*`, matching the backend.

---

## Developer file map

### This module (`src/modules/dispatch/`)
- `module.config.tsx` — all `/dispatch/*` routes + the sidebar group; the route→permission table above is defined here.
- `pages/DispatchDashboardPage.tsx` — permission-filtered card launcher.
- `pages/OpenBiltiesPage.tsx` — open-bilties list (feeds A/P invoice selection).
- `pages/TransporterInvoicesPage.tsx` — A/P landing (pending queue + history counts + quick actions).
- `pages/TransporterInvoiceQueuePage.tsx` — full pending A/P list.
- `pages/TransporterInvoiceHistoryPage.tsx` — posting history (filterable by status).
- `pages/TransporterInvoiceDetailPage.tsx` — one posting; retry a FAILED post to SAP.
- `api/dispatch.api.ts` — endpoint calls (open bilties, invoice preview/submit/post/post-submitted/history/detail; multipart handling).
- `api/dispatch.queries.ts` — React Query hooks + `DISPATCH_QUERY_KEYS` + invalidations.
- `types/dispatch.types.ts` — `OpenBilty`, transporter-invoice request/response/posting types.

### Composed from other modules
- `src/modules/dashboards/dispatch-plans/` — Plans dashboard, pipeline, schedule.
- `src/modules/vehicle-management/pages/{DispatchVehicleLinkingPage,InsideVehicleManagerPage}.tsx`.
- `src/modules/gate/pages/customerSalesFlow/*` — docking wizard, box scan, gatepass, reprint, detail.
- `src/modules/warehouse/grpo/*` — Service GRPO screens.

### Config
- `src/config/permissions/{dispatch,gate}.permissions.ts` — permission constants.
- `src/config/constants/api.constants.ts` — `API_ENDPOINTS.DISPATCH` (+ `DISPATCH_PLANS`, `DISPATCH_PIPELINE`, `GATE.INSIDE_VEHICLE_*`).

---

## Related docs
- **Backend companion**: `C:/Users/gurpa/dev/factory_app/dispatch_plans/docs/README.md`
- Docking / gate flow: `docs/modules/gate.md`
- Service GRPO: `docs/modules/grpo.md`
- Standalone barcode dispatch subsystem: `docs/modules/barcode-dispatch-design.md`, `docs/modules/barcode.md`
- Docking implementation plans: `docs/docking-module-factory-integration-plan.md`, `docs/docking-scan-speed-plan.md`
