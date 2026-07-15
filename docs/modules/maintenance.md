# Maintenance & Safety (CMMS / EHS) — Frontend

> Rewritten to match the **shipped** React module. The previous version of this
> file was a planning proposal ("should become…") and is superseded. Source lives
> in `src/modules/maintenance/`. Backend companion:
> `C:/Users/gurpa/dev/factory_app/maintenance/docs/README.md`.

## Overview — what it does & who uses it

`src/modules/maintenance` is the UI for the plant's combined maintenance (CMMS)
and safety (EHS) operations, plus **returnable / non-returnable gate passes**. It
is a single sidebar module ("Maintenance", `Wrench` icon) whose sub-sections are
each **permission-gated**, so a user only sees the parts they can use — a
technician sees work orders and permits; a gate clerk sees returnable and gate
material-in; the Fire Department Head sees fire store, fire reports, safety fines
and permit approvals.

It talks to **two Django apps** — `maintenance` and `returnable_items` — so the
sidebar entry is gated by *either* module prefix
(`modulePrefix: [MAINTENANCE_MODULE_PREFIX, RETURNABLE_MODULE_PREFIX]` in
`module.config.tsx`), otherwise a returnable-only user would have no menu to hang
the section on. Two more links point *out* of the module into the Gate module
(Gate Material In, Repair Movement).

## Key concepts & entities (UI vocabulary)

- **Hub** (`/maintenance`) — a card grid of every sub-section, each card shown only
  if the user has its view permission (`MaintenanceHubPage`).
- **Work order** — the repair/service job. Its own list + detail page with the
  assign → start → complete → approve → close buttons.
- **PM / Checklist** — preventive maintenance plans, their due executions, and the
  mobile-friendly checklist run.
- **Store / Spares** and **Store / Fire** — two parallel stores (the fire store is
  a copy), each with stock, requests and issue.
- **Fire Reports** — daily day/night fire-equipment inspection logs with photos.
- **Fire Equipment Issue / Return** — issue gear to a person, track returns.
- **Work Permits** — permit-to-work with a submit → Fire-Head-approve → start →
  complete → close lifecycle, multi-day validity, PPE, and renewal.
- **Safety Fines** — PPE-violation fines (Fire-Head only).
- **Returnable / Non-returnable** — the gate-pass register (list, detail, create/edit
  form) for material leaving the gate.
- **Automation** — the scan-lookup + alerts console.

## End-to-end flows (as the operator experiences them)

### 1. Scan lookup & scan-complaint (`MaintenanceAutomationPage`)
"Scan Lookup" is a **text/keyboard-wedge input**, not a camera — the operator types
(or a hardware barcode scanner types) an asset QR, asset code, spare part number or
SAP item code and presses Enter/Search. `useMaintenanceScanLookup(code)` resolves
it server-side:
- **Asset hit** → shows the asset card with a "Save QR" button (persists the
  suggested QR) and a "Scan Complaint" form (title/priority/impact/problem) that
  `POST`s a work order via `useCreateWorkOrderFromScan` and navigates to it.
- **Spare hit** → shows a "Spare Availability" panel with **local stock** and a
  live **SAP** warehouse table (on-hand/committed/available/on-order) from
  `useMaintenanceSpareStock`. A warehouse box filters the SAP query.
- **No match** → a red inline banner "No matching maintenance asset or spare found."

The same page shows the four alert tiles (PM_DUE, BREAKDOWN_ESCALATION,
LOW_CRITICAL_SPARE, AMC_WARRANTY_EXPIRY) from `useMaintenanceAlerts`, with per-alert
"Open" (navigate) and "Send" (push a notification) buttons.

### 2. Work order lifecycle (`MaintenanceWorkOrdersPage` → `…DetailPage`)
Create from the list (or from a scan). The detail page exposes the transition
buttons — assign, start, request spare, complete (with RCA/CAPA + before/after
photos), approve, close — each calling the matching `maintenanceApi` action. Buttons
are shown/enabled by both the current status and the user's permission
(`ASSIGN/START/COMPLETE/APPROVE/CLOSE_WORK_ORDER`).

### 3. PM run (`MaintenancePMPage`)
Plans + due executions. Start an execution, fill the checklist (checkbox/pass-fail/
number/text inputs), and complete — the form blocks completion if a required
checklist item is unfilled (mirrors the server rule).

### 4. Work permits (`MaintenanceWorkPermitsPage`)
Draft a permit (types, multi-day validity window, hazards, isolations, precautions,
workers, attachments) → **Send for Approval** (`submitPermit`) → the Fire Department
Head **Approves** (`approvePermit`, which is where PPE is set) → **Start** (blocked
if validity already lapsed) → **Complete** (abandoned/verified + handover) → **Close**.
An expired or cancelled permit offers **Renew**, which clones it into a fresh draft.
The visible action set is driven by status + the `ISSUE/APPROVE/CLOSE/MANAGE_WORK_PERMIT`
permissions.

### 5. Returnable gate pass (department + gate)
- **Create/edit** (`MaintenanceReturnableFormPage` → `ReturnableForm`): a stepped
  form. Step 1 toggles **Returnable vs Non-returnable** (a `Switch`, **locked once
  created** — the number series is fixed). Step 2 swaps its fields by type
  (Party & Return date vs Recipient/Issued-By). Step 3 is item **cards** (not a
  table — a scrolling table would clip the SAP search dropdown) with a
  `SapItemSelect` typeahead against SAP `OITM`; you can also type an item with no
  SAP code (returnable only). Step 4 stages attachments.
- **Save order matters:** the pass is created first, then attachments upload
  **sequentially** with its id. A failed attachment upload is a **warning toast**
  ("…was saved, but some attachments failed to upload"), not a rollback — the pass
  is already stored.
- **Detail & workflow** (`MaintenanceReturnableDetailPage`): shows type/status
  badges (with overdue days), gate-out block, item return progress, return trips,
  attachments, and an append-only **Audit History** timeline. Action buttons appear
  by status **and** permission: Send for Approval, Approve/Reject, Acknowledge
  Collection (n), Close, Short Close, Cancel. Reject/Cancel/Short-close open a
  **reason dialog** (`ReturnableReasonDialog`). Rejected/short-closed reasons render
  as colored banners at the top.
- **Gate-out and record-return live in the *Gate* module, not here.** The
  maintenance module owns the API client and the department-facing screens (list,
  detail, form) and exposes the gate hooks (`useGateOutReturnable`,
  `useRecordReturnableReturn`, `useRejectReturnableAtGate`), but the actual
  gate-side **screens** are `src/modules/gate/pages/returnablePages/`
  (`ReturnOutListPage`/`ReturnOutFormPage` = gate-out, `ReturnInListPage`/
  `ReturnInFormPage` = record-return) under `/gate/repair-parts-out` — the
  "Repair Movement" nav link. The gate imports the client through
  `src/modules/gate/api/returnable/index.ts`, which re-exports from
  `@/modules/maintenance/api`. Inside the maintenance module the detail page
  (`MaintenanceReturnableDetailPage`) shows **no** gate-out/record-return buttons;
  the list page (`MaintenanceReturnablePage`) only surfaces the queues read-only as
  summary tiles (Draft, Pending Approval, Pending Gate Out, Out with Party, Back at
  Gate…) and status filters.

### 6. Fire store, fire reports, fire issue, safety fines
Straightforward list/form pages backed by `fire.api.ts`, `fireReport.api.ts`,
`fireIssue.api.ts`, `safetyFine.api.ts`. Fire reports have a **Review** action
(Fire Head); safety fines have a **Settle** (PAID/WAIVED) action gated by
`MANAGE_SAFETY_FINE`.

## Critical business rules & invariants (as enforced/echoed in the UI)

- **Permission-gated everything.** Routes, sidebar children, and hub cards all gate
  on the same `MAINTENANCE_PERMISSIONS.*` / `RETURNABLE_PERMISSIONS.*` constants
  (`src/config/permissions/{maintenance,returnable}.permissions.ts`). Hub cards and
  nav use *any-of* semantics (`hasAnyPermission`).
- **Returnable type is immutable after create** — the `Switch` is `disabled` in edit
  mode and the form warns you to cancel + re-raise to change it.
- **Non-returnable hides the return half** — the form never sends return date,
  serial, make/model, condition or estimated value for an NRGP (they're forced to
  neutral values), and the detail page hides those columns.
- **UOM is read-only**, taken from the selected SAP item — the clerk can't override
  the item master's unit.
- **Client filter hygiene** — `cleanFilters` strips `undefined`/`''`/`'ALL'` before
  every request so empty filters don't leak into query strings.
- **Route ordering** — `/maintenance/returnable/new` is declared before
  `/:passId` so "new" is never parsed as an id.

## Integrations & cross-module boundaries

- **Backend APIs:** `maintenance.api.ts` + `workPermit.api.ts` + `safetyFine.api.ts`
  + `fire*.api.ts` hit `/api/v1/maintenance/`; `returnableGatePass.api.ts` hits
  `/api/v1/returnable-items/`; the SAP item picker and spare-stock panel are backed
  by live HANA reads on the server.
- **Gate module:** two nav links (`/gate/maintenance`, `/gate/repair-parts-out`)
  gated by `GATE_PERMISSIONS`, so material-in and repair-movement are reachable from
  the maintenance menu even though they render in the Gate module. The Gate module's
  returnable screens **re-use this module's returnable client** — `modules/gate/api/
  returnable/index.ts` re-exports `returnableGatePassApi` and the gate hooks from
  `@/modules/maintenance/api` rather than duplicating them.
- **Shared UI:** `@/shared/components/ui` (Card, Button, Input, NativeSelect,
  Switch, Textarea), `DashboardHeader`/`SummaryCard`, `sonner` toasts, and
  `usePermission()` for gating.
- **State:** TanStack Query throughout (`*.queries.ts`). Mutations invalidate the
  relevant lists/detail on success; there is **no offline mutation queue** — actions
  require connectivity and surface failures as toasts.

## Real-world edge cases (trigger → behaviour → what the operator sees → risk)

- **Scanner reads an unknown code.** Trigger: code matches no asset/spare.
  Behaviour: `useMaintenanceScanLookup` errors. Operator sees a red "No matching
  maintenance asset or spare found." banner. Risk: none — nothing is created.
- **Duplicate / re-typed scan.** Trigger: the same code entered twice. Behaviour:
  lookup is a cached GET (idempotent); creating a complaint is an explicit button,
  so a re-scan doesn't double-create. Risk: a user could click "Create Work Order"
  twice — the button disables while pending, but there's no dedupe beyond that.
- **SAP down while picking a returnable item.** Trigger: HANA unreachable.
  Behaviour: `searchSapItems` gets a 503; the picker shows no results. Operator
  can still **type the item manually** (returnable lines allow a blank SAP code).
  Risk: none for returnable; a non-returnable line expects a SAP pick.
- **SAP down on the spare-stock panel.** Trigger: HANA unreachable. Behaviour: local
  stock still renders; the SAP table shows the server's message row ("No SAP stock
  rows found." / the error). Operator sees local numbers only.
- **Attachment upload fails after the pass saves.** Trigger: network blip during the
  sequential upload. Behaviour: the pass is already created; a **warning toast**
  tells the operator to re-add the files from the pass. Risk: a pass with missing
  challan/photos until someone re-uploads.
- **Approving your own returnable pass.** Trigger: submitter clicks Approve.
  Behaviour: server 400; the shared `run()` helper shows the server `detail`
  ("You cannot approve a gate pass you submitted yourself.") as an error toast.
- **Acting on a stale status.** Trigger: someone else advanced the pass/permit in
  another tab. Behaviour: the server rejects the out-of-order action; the operator
  sees the server's `detail` toast (e.g. "Only a completed permit can be closed.")
  and the query refetches. Risk: momentary confusion, no bad write.
- **Permit start after lapse.** Trigger: Start clicked on an approved permit whose
  window has passed. Behaviour: server 400 "Permit validity has lapsed. Renew it
  before starting work." shown as a toast; the operator uses **Renew**.
- **Non-returnable pass in the gate-in queue.** Trigger: none — NRGPs close at
  gate-out and never enter the gate-in queue; the detail page hides return/collect/
  short-close for them.

## Failure modes / what can break (operator-visible)

- **No permissions for any section** → the hub renders "You don't have access to any
  Maintenance sections." and the sidebar entry may not appear at all.
- **Any workflow action rejected by the server** → a red error toast with the
  server's `detail` string (returnable detail, permit page, work-order page all use
  the same `error.response.data.detail` fallback pattern). The list/detail then
  refetches, so the buttons re-render for the real status.
- **A large report/list** → these are plain client tables over unpaginated server
  responses; very large ranges are slow to load. No skeleton beyond a "Loading…"
  state.
- **Camera expectation** → there is **no in-browser camera scanner** in this module;
  "scan" means a keyboard-wedge/manual code entry. An operator expecting to point a
  phone camera will be confused — hardware scanners or typing are the path.

## Improvement opportunities & known gaps

- The frontend defines an `ACCEPT_WORK_PERMIT` permission constant, but the backend
  has **no accept endpoint** — the button/step can't exist meaningfully until the
  server wires it. Keep the two in sync (add it or drop the constant).
- No optimistic UI or offline queue: every action needs the network and shows a
  toast on failure. Fine for a wired plant office, weak on a phone at the gate.
- Client-side de-dupe on "Create Work Order from scan" is only the pending-disable;
  a double submission window exists.
- Reports/lists would benefit from server pagination + virtualized tables.

## Permissions & roles (nav gating)

Permission strings: `src/config/permissions/maintenance.permissions.ts` and
`returnable.permissions.ts`. Each route and each sidebar child lists the permissions
that reveal it (any-of). Highlights:

| Section | View gate |
|---|---|
| Dashboard | `can_view_maintenance_dashboard` |
| Assets / Masters | `view_asset` / the three master-view perms + `can_manage_maintenance_settings` |
| Work Orders | `can_view_work_order` |
| Store / Spares, Store / Fire | `can_view_spare`, `can_view_fire` |
| Fire Reports / Fire Issue | `can_view_fire_report`, `can_view_fire_issue` |
| Work Permits | `can_view_work_permit` (approve needs `can_approve_work_permit` = Fire Head) |
| Safety Fines | `can_view_safety_fine` (issue/settle needs `can_manage_safety_fine`) |
| Returnable | `returnable_items.can_view_returnable_gatepass`; create needs `…can_manage_returnable_gatepass`; approve/gate/close each have their own perm |
| PM / Reports / Automation | `can_view_pm`, `can_view_maintenance_reports`, `can_view_maintenance_module` |
| Gate Material In / Repair Movement | `GATE_PERMISSIONS.*` (Gate module) |

The sidebar parent is gated by **either** the `maintenance` or `returnable_items`
module prefix, so returnable-only users still get the menu.

## Developer file map (frontend)

- `src/modules/maintenance/module.config.tsx` — routes, sidebar nav, permission
  gates, and the cross-module Gate links.
- `pages/` — `MaintenanceHubPage`, `MaintenanceDashboardPage`,
  `MaintenanceAssetsPage`/`MaintenanceAssetDetailPage`,
  `MaintenanceWorkOrdersPage`/`MaintenanceWorkOrderDetailPage`,
  `MaintenancePMPage`, `MaintenanceSparesPage`, `MaintenanceFirePage`,
  `MaintenanceFireReportsPage`, `MaintenanceFireIssuePage`,
  `MaintenanceWorkPermitsPage`, `MaintenanceSafetyFinePage`,
  `MaintenanceReturnablePage`/`MaintenanceReturnableDetailPage`/`MaintenanceReturnableFormPage`,
  `MaintenanceReportsPage`, `MaintenanceAutomationPage`, `MaintenanceMastersPage`.
- `api/` — `maintenance.api.ts` + `maintenance.queries.ts` (core CMMS),
  `workPermit.*`, `safetyFine.*`, `fire.*`/`fireReport.*`/`fireIssue.*`,
  `returnableGatePass.*`, and `api/index.ts` barrel.
- `components/` — `AssetFormDialog`, `WorkOrderDialogs`, `MasterDataDialog`,
  status badges (`AssetStatusBadge`, `WorkOrderStatusBadge`,
  `WorkPermitStatusBadge`, `SafetyFineStatusBadge`), and `components/returnable/`
  (`ReturnableForm`, `SapItemSelect`, `ReturnableAttachmentsField`,
  `ReturnableTimeline`, `ReturnableReasonDialog`, badges).
- `schemas/returnable.schema.ts`, `constants/{returnable,workPermit}.constants.ts`,
  `types/` (per-feature type files).
- `src/config/permissions/{maintenance,returnable}.permissions.ts` — the gate strings.

## Related docs

- Backend companion: `C:/Users/gurpa/dev/factory_app/maintenance/docs/README.md`
- Gate module: `./gate.md` · GRPO (SAP posting): `./grpo.md` · Production: `./production.md`
- Older usage notes (partly stale): `./maintenance-usage.md`
