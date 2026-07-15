# Gate Management — Inbound Vehicle & Material Entry (Frontend)

> The operator-facing side of the gate. Covers the screens a security/stores operator uses to
> record a truck arriving with material, receive its PO, hand it to QC, weigh it, and complete it.
> **This file was rewritten from the code — the previous version contained illustrative pseudo-code
> that no longer matches the app. Trust this + the source.**
>
> Backend counterpart: [`factory_app/gate_core/docs/README.md`](../../../factory_app/gate_core/docs/README.md)

## Overview — what it does & who uses it

`src/modules/gate/` is the React/Vite home of **every gate transaction** at a plant. It is a large
module: alongside the inbound material flows it also hosts outbound dispatch, empty-vehicle,
BST-out, repair/returnable and person/labour gate flows. **This doc scopes to inbound vehicle &
material entry** — the two things that arrive *at* the gate:

- **Material entry** — Raw Materials (RM/PM/Assets), Daily Needs, Maintenance, Construction and Fixed
  Assets — which all share one wizard spine (the canonical, detailed path here).
- **Inbound (empty) vehicle** — **Empty Vehicle In** + the **cross-company Arrivals** board: an empty
  truck arriving to be loaded for dispatch. The gate-in and the one-trip arrival lifecycle are in
  scope (flow 4); the loading tail (docking, box scans, gatepass) is the dispatch module.

Users: a **gate operator** at the security desk (vehicle, driver, safety check), a **stores/
receiving operator** (PO receipt, arrival slip, weighment), and **managers** who watch dashboards.
Everything is gated by Django permissions surfaced through `module.config.tsx`.

The module is registered via `gateModuleConfig` in
`src/modules/gate/module.config.tsx` (routes + sidebar nav + per-route permission gates) and
consumed by the app registry (`src/app/registry`).

## Key concepts & entities

- **Entry type** — `constants/gateEntryTypes.ts` defines every gate flow as a `GateEntryTypeConfig`
  (title, direction `in|out|return`, `vehicleMode`, dashboard/new routes, view/create permissions,
  `requiresWeighment`, `requiresGatepass`). The inbound-material ones are `raw-materials`,
  `daily-needs`, `maintenance`, `construction`, `fixed-assets`.
- **Entry-flow config** — `constants/entryFlowConfig.ts` gives each flow its wizard shape
  (`routePrefix`, `headerTitle`, `totalSteps`, `attachmentsPreviousStep`). RM = `Material Inward`,
  4 steps; the others are 3 steps.
- **Vehicle entry** — the backend `VehicleEntry`; created at Step 1, referenced everywhere by
  `entryId`. Typed in `api/vehicle/vehicleEntry.api.ts`.
- **PO receipt / items** — `api/po/*` (SAP PO lookup + receive against the entry).
- **Arrival slip** — `api/arrivalSlip/*`; the QC hand-off document raised per PO item.
- **Weighment** — `api/weighment/*`.
- **Full view** — `api/gateEntryFullView/*`; the read model the Review page renders, including
  `qc_summary.can_complete`.

## End-to-end flows

### 1. Raw-material inward wizard (the canonical inbound path)

Routes (`module.config.tsx`) — note the **displayed step count (4) is offset from the URL segments**
because Vehicle/Driver and the old Security step were merged into step 1
(`constants/wizard.constants.ts`, `entryFlowConfig.ts`):

| URL (new) | Component | What the operator does |
|-----------|-----------|------------------------|
| `/gate/raw-materials/new` | `Step1Page` → `SharedStep1Page` | Vehicle, Driver **&** Security (one screen) |
| `/gate/raw-materials/new/step2` | `Step3Page` | PO Receipt (SAP PO lookup + line qty) |
| `/gate/raw-materials/new/step3` | `ArrivalSlipPage` | Arrival slip per PO item → submit to QA |
| `/gate/raw-materials/new/step4` | `Step4Page` | Weighment (gross/tare) |
| `/gate/raw-materials/new/attachments` | `AttachmentsPage` | Upload gate documents |
| `/gate/raw-materials/new/review` | `ReviewPage` | Review + **Complete Entry** |

Edit mode mirrors these at `/gate/raw-materials/edit/:entryId/{step1,step2,step3,step4,attachments,review}`.

Step-by-step behaviour:

1. **Step 1 (`SharedStep1Page`).** Operator selects vehicle (auto-fills transporter) and driver, and
   fills the security check (vehicle/tyre/fire condition, seals, alcohol test, inspector name). On
   **Next** in create mode it:
   - generates `entry_no = GE-<year>-<last-4-digits-of-Date.now()>`,
   - `POST`s the vehicle entry **once** (guarded by `createdEntryIdRef` so a retry never
     double-creates),
   - then `POST`s the security check (which flips the entry to `IN_PROGRESS`),
   - then navigates to `…/edit/{id}/step2`. **Even a "new" entry lands on the `/edit/{id}` routes
     after Step 1**, because the id now exists.
   The RM Step 1 also shows a `PONumberLookup` panel at the top.
2. **Step 2 — PO Receipt (`Step3Page`).** Look up an open SAP PO for the supplier and receive its
   lines. `poReceiptApi.create` → `POST .../po-receipts/`. Success moves the entry to `QC_PENDING`.
3. **Step 3 — Arrival Slip (`ArrivalSlipPage`).** Raise a `MaterialArrivalSlip` per PO item
   (billing qty/UOM, commercial invoice, e-way, bilty, CoA/CoQ flags) and **submit to QA**, optionally
   attaching Certificate of Analysis/Quantity files (`arrivalSlipApi.submit`, multipart). This is the
   hand-off into the QC module.
4. **Step 4 — Weighment (`Step4Page`).** Record gross/tare; net is computed server-side. **Optional
   for RM** — the entry can complete without it.
5. **Attachments.** Upload gate documents against the entry.
6. **Review (`ReviewPage`).** Renders `gateEntryFullView`. **Complete Entry** is disabled until
   `qc_summary.can_complete` is true (all items QC-done). On success it clears the entry's tracked
   step and shows a full-screen animated **success screen** ("Entry Completed!"). If QC is not ready,
   an amber banner lists the blockers ("N pending, M on hold").

### 2. The other inbound flows (Daily Needs / Maintenance / Construction / Fixed Assets)

Same spine, fewer steps (3), driven by the corresponding `*_FLOW` config: Step 1 (vehicle/driver/
security, shared shell), a line-detail step, attachments, review. No PO/SAP receipt or QC arrival
slip — these post to their own `*_gatein` backend apps.

### 3. Empty Vehicle In & the cross-company Arrivals board (inbound vehicle)

The empty-vehicle-in flow lives in `pages/emptyVehicleInPages/` (`api/emptyVehicleIn/`, `api/arrivals/`).

| URL | Component | What the operator does |
|-----|-----------|------------------------|
| `/gate/empty-vehicle-in` | `EmptyVehicleInPage` | List of empty-vehicle gate-ins; an `inside_only` filter shows trucks still in |
| `/gate/empty-vehicle-in/new` (+ `/weighment`, `/attachments`, `/review`) | `EmptyVehicleInNewPage` … | Register the empty truck (vehicle/driver/reason), tare weighment, attachments, review |
| `/gate/arrivals` | `CrossCompanyArrivalPage` | The **one-truck, many-companies** board: which trucks are inside, their per-company bills, and Depart / Empty-out |
| `/gate/arrivals/:arrivalId/gatepass` | `ArrivalGatepassPage` | Print/commit the combined whole-truck gatepass |

Behaviour that matters to the operator:

1. **Register in.** New empty-vehicle-in posts to `gate-core/empty-vehicle-ins/`. If the same truck is
   still inside, the backend guard rejects it and the operator sees a banner: *"{vehicle} is already
   inside under gate entry {EVGI-…} and has not left yet. Finish its dispatch, or do an
   empty-vehicle-out, before starting a new entry."*
2. **Cross-company, auto.** For a `DISPATCH` truck, one gate-in marks it in across **every** company
   whose booked bills it carries — the operator does not register it once per company.
3. **It leaves once.** As each company's load dispatches its covers are consumed; when the whole load
   has gone the arrival **auto-departs** (no manual step). The board stops showing the truck. A truck
   that left empty is closed via **Empty Vehicle Out** / the arrival's Empty-out action.

### 4. Resuming an interrupted entry

`hooks/useEntryStepTracker.ts` persists `entryId → lastStep` in `localStorage`
(`gate_entry_last_step`, capped at 50 entries). Every step page calls the tracker on mount, so a
dashboard can send the operator back to where they left off. `clearEntryStep` runs on completion.

## Critical business rules & invariants (frontend-enforced)

- **Single create.** `createdEntryIdRef` in `SharedStep1Page` prevents duplicate `VehicleEntry`
  creation if the operator retries after a transient error.
- **`entry_no` is minted on the client** as `GE-<year>-<last4 epoch ms>` — not server-authoritative
  (collision risk; see edge cases).
- **Complete is QC-gated in the UI**, mirroring the backend: `ReviewPage` disables the button unless
  `qc_summary.can_complete`.
- **Edit is lock-aware.** In edit mode a step is read-only until the operator clicks **Update**
  (`updateMode`), and `canUpdate` is false once the entry is `COMPLETED`.
- **PO editability comes from the server.** `POReceipt.is_editable` / `lock_reason` decide whether the
  PO step is writable; a submitted-to-QC PO must be **Replaced** (with a reason), not edited.
- **Wire formats vary by endpoint.** Vehicle entry = `application/x-www-form-urlencoded`; security
  check & arrival-slip submit = `multipart/form-data`; PO receipt & weighment = JSON. (See the `api/`
  files — this trips up new devs.)

## Integrations & cross-module boundaries

- **Backend gate apps** via `apiClient` (axios) using `API_ENDPOINTS` from `@/config/constants`. All
  requests carry the auth token and the active `Company-Code` header (see `docs/modules/auth.md`).
- **State/caching:** TanStack Query (`*.queries.ts` per resource). Mutations invalidate keys like
  `vehicleEntries`, `securityCheck`, `vehicleEntry`, `gateEntryFullView`.
- **QC module (`@/modules/qc`)** — arrival slips and inspection status types are imported by
  `gateEntryFullView.api.ts`; the arrival-slip step is the entry point into QC.
- **GRPO** — after completion the entry surfaces in the GRPO module (`/grpo/material/preview/{id}`)
  via a backend notification; the gate itself does not post GRPO.
- **Dispatch / barcode (outbound, same module folder)** — sales-dispatch `new` routes **redirect** to
  `/dispatch/docking/new` (`RedirectWithSearch`); box/barcode scanning lives there and in
  `@/modules/barcode`. **Inbound material entry involves no scanning.**
- **Cross-company arrivals** — `/gate/arrivals` (`CrossCompanyArrivalPage`) and the empty-vehicle-in
  flow implement one physical truck across companies (covered in flow 3). The *loading* tail beyond
  the gate — docking, box scans, the per-bill dispatch — is the dispatch module; the arrival board
  only shows the trip and its exit.

## Real-world edge cases

- **Scanner/offline** — trigger: no network mid-wizard → behaviour: the app is **online-only** (no
  offline queue); the mutation rejects → symptom: an error banner/field errors and the operator stays
  on the step; already-saved steps persist server-side and the localStorage step tracker lets them
  resume → risk: at a dead-zone gate the operator cannot proceed until connectivity returns.
- **SAP down at PO receipt** — trigger: backend returns `503` → symptom: "SAP system is currently
  unavailable. Please try again later."; the entry exists at `IN_PROGRESS` with no PO → risk: truck
  waits; nothing is queued for retry.
- **Duplicate `entry_no`** — trigger: two entries created in the same 10-second window collide on
  `GE-<year>-<last4ms>` → symptom: generic "Failed to save gate entry" on Step 1 Next; a re-click
  regenerates the suffix and usually succeeds.
- **Wrong PO already submitted to QC** — trigger: operator booked the wrong PO and submitted the slip
  → behaviour: PO step becomes read-only (`is_editable=false`), only **Replace** is offered and only
  after QC sends it back → symptom: lock reason shown; a QC round-trip is required to fix a gate typo.
- **Re-scanned / re-received line** — trigger: same `po_number` added twice, or a line over 110 % of
  ordered → symptom: backend `400` ("PO … already added" / "cannot exceed 110 %") shown inline.
- **Missing weighbridge weight for item group 105** — trigger: complete an item-group-105 material
  without a gross weight → behaviour: the gate lets it complete (weighment optional) → symptom: the
  failure appears later in **GRPO** as a SAP `(200032)` rejection, not in the gate → risk: the
  operator who caused it never sees the error; the GRPO team does.
- **Complete before QC** — trigger: any item lacking an ACCEPTED/REJECTED inspection → behaviour:
  Review's **Complete** button is disabled and the amber banner lists what's pending.
- **Cross-company "blank" RM entry** — trigger: opening an RM entry that belongs to a sibling company
  under a different active `Company-Code` → symptom: not found / not listed (inbound RM is
  company-scoped; only weighment/attachments span companies).
- **Empty truck "already inside" / stale arrival** — trigger: operator tries to register an empty
  vehicle that is still marked inside — usually because a previous trip's arrival never auto-departed
  (a partial load, an abandoned committed docking, or a bill removed on the console) → behaviour: the
  backend gate-in guard `400`s → symptom: banner *"{vehicle} is already inside under gate entry
  {EVGI-…} and has not left yet. Finish its dispatch, or do an empty-vehicle-out…"*, even though the
  truck physically left → risk: the operator is blocked; freeing it needs an Empty Vehicle Out (or an
  admin console unwind) — often under a *different* company than the one active, so it can be
  unreachable without switching companies. See the vehicle-arrival memory notes.
- **Bill/PO added after gate-in on an inside truck** — a late-booked dispatch bill auto-attaches to the
  truck's live arrival (it does not need a second gate-in); this is the **inside-vehicle / dispatch**
  console path — see the dispatch module and the memory note on late-booked bills.

## Failure modes / what an operator sees

| Situation | What the operator sees |
|-----------|------------------------|
| Server 5xx on load/save | `getServerErrorMessage()` banner ("Something went wrong…") |
| Field validation from API | Inline per-field messages (mapped from `apiError.errors`) |
| SAP unavailable at PO step | "SAP system is currently unavailable. Please try again later." |
| Complete fails (5xx) | "Cannot complete the entry at the moment. Please try again later." |
| Complete blocked by QC | Amber "QC must be completed…" with pending/hold counts; button disabled |
| Empty vehicle already inside | Banner: "{vehicle} is already inside under gate entry {EVGI-…} and has not left yet." (a live or stale arrival) |
| No permission for a route | Route/nav item hidden; direct navigation is blocked by the guard |
| Entry already completed | Review shows a green "Entry Completed" state; edit steps are read-only |

## Improvement opportunities & known gaps

- **Client-minted `entry_no`** should move server-side to remove the collision window.
- **No offline resilience** — a flaky gate network blocks the wizard mid-entry; the localStorage
  tracker only remembers the step, it does not queue writes.
- **Weighment optionality is invisible at the gate**, so the item-group-105 gross-weight requirement
  only bites downstream at GRPO; a gate-side hint would help.
- The previous version of this doc was pseudo-code fiction; keep this one code-grounded when the
  wizard changes (the step/URL offset in particular).

## Permissions & roles (nav gating)

The **Gate** sidebar item (`Truck` icon) is shown when the user holds **any** permission in
`GATE_NAVIGATION_PERMISSIONS` (the union of every entry type's view/create perms + `BST_OUT.VIEW`).
Each route lists a `permissions: [...]` array evaluated as **any-of**. Codenames come from
`src/config/permissions/gate.permissions.ts` and map 1:1 to Django perms.

| Role / action | Permission(s) |
|---------------|---------------|
| See the Gate module & dashboard | any of `GATE_DASHBOARD_ACCESS_PERMISSIONS` (`person_gatein.can_view_dashboard`, `gate_core.can_view_gate_entry`, or any entry-type view perm) |
| View RM entries | `raw_material_gatein.view_poreceipt` **or** `gate_core.can_view_raw_material_full_entry` |
| Create / receive RM | `raw_material_gatein.add_poreceipt` **or** `raw_material_gatein.can_receive_po` |
| Edit RM entry | `raw_material_gatein.change_poreceipt` |
| Delete RM entry | `raw_material_gatein.delete_poreceipt` |
| Complete RM entry | `raw_material_gatein.can_complete_raw_material_entry` (enforced backend-side) |
| Daily Needs / Maintenance / Construction / Fixed Assets | the matching `*_gatein.*` perms (see the config) |
| Empty Vehicle In / Arrivals board | `EMPTY_VEHICLE_IN.VIEW` / `.CREATE` (`gate.permissions.ts`); backend gate-in is company-context-gated |

> **Nav-gating gotcha (see memory):** the sidebar filters by **permission**, not by Django group.
> Adding/removing a permission on a user's group can make whole gate sub-modules appear/disappear.
> If a module is unexpectedly hidden, check `module.config.tsx` gates against the user's effective perms.

## Developer file map

**Frontend (this repo):**
- `src/modules/gate/module.config.tsx` — routes, sidebar nav, permission gates
- `src/modules/gate/constants/{gateEntryTypes,entryFlowConfig,wizard.constants}.ts`
- `src/modules/gate/pages/GateDashboardPage.tsx`, `GateNewEntryPage.tsx`
- `src/modules/gate/pages/RawMaterialsPage.tsx` (list) and `pages/rawMaterialPages/`:
  `RawMaterialsDashboard.tsx`, `Step1Page.tsx`, `Step3Page.tsx` (PO), `ArrivalSlipPage.tsx`,
  `Step4Page.tsx` (weighment), `AttachmentsPage.tsx`, `ReviewPage.tsx`
- `src/modules/gate/pages/shared/SharedStep1Page.tsx`, `SharedDashboard.tsx`, `SharedAllPage.tsx`
  (the reused shells for all inbound flows)
- `src/modules/gate/pages/{dailyNeedsPages,maintenancePages,constructionPages,fixedAssetsPages}/`
- Inbound vehicle: `src/modules/gate/pages/emptyVehicleInPages/` (`EmptyVehicleInPage`, `EmptyVehicleInNewPage`,
  `EmptyVehicleInWeighmentPage`, `EmptyVehicleInReviewPage`, `CrossCompanyArrivalPage`, `ArrivalGatepassPage`)
- `src/modules/gate/api/vehicle/vehicleEntry.api.ts` + `.queries.ts`
- `src/modules/gate/api/securityCheck/`, `api/weighment/`, `api/po/{po,poReceipt}.*`,
  `api/arrivalSlip/`, `api/gateEntryFullView/`, `api/emptyVehicleIn/`, `api/arrivals/`
- `src/modules/gate/hooks/{useEntryId,useEntryStepTracker}.ts`
- `src/modules/gate/components/` — `VehicleDriverSecurityFormShell`, `PONumberLookup`,
  `DriverSelect`, `VehicleSelect`, `TransporterSelect`, `StepHeader`, `StepFooter`, etc.
- `src/config/permissions/gate.permissions.ts` — permission codenames

## Related docs

- **Backend counterpart:** [`factory_app/gate_core/docs/README.md`](../../../factory_app/gate_core/docs/README.md)
- `docs/modules/auth.md` — auth + `Company-Code` header
- `docs/modules/qc.md` / `qc-status-analysis.md` — arrival-slip & inspection flow the gate hands to
- `docs/modules/grpo.md` — the downstream GRPO posting
- `docs/modules/dispatch.md` / `sales-dispatch-docking.md` — the outbound loading tail the arrival hands off to
- `docs/modules/overview.md` — module registry & conventions
