# Quality Control — Frontend (`src/modules/qc`)

> Paired backend doc: `C:/Users/gurpa/dev/factory_app/quality_control/docs/README.md`
> (repo `factory_app`, path `quality_control/docs/README.md`).
>
> Written from the code (`module.config.tsx`, `api/*`, `pages/*`, `hooks/*`,
> `types/*`). The previous version of this file was stale (listed 7 routes and no
> Production QC / Line Clearance / Customer Returns / Print Documents) — this rewrite
> reflects the current module.

---

## Overview — what it does & who uses it

The QC module is the QA/lab UI. It is one sidebar entry ("Quality Control", flask
icon) with sub-pages spanning **four sub-modules plus shared master data**:

1. **Arrival Slips (Raw-Material QC)** — the live daily workflow. Lab users create an
   inspection against a submitted arrival slip, enter parameter readings, and route it
   through **QA Chemist → QA Manager**. Chemist/QAM approvers work an approval queue.
2. **Production QC** — In-Process and Final (FG) QC per production run, with a
   submit→approve loop.
3. **Line Clearance QA** — approve pre-production line clearances (the data comes from
   the `production/execution` module; QC just reviews/approves).
4. **Customer Return QC** — verify returned finished goods. **This sub-module is a
   browser-`localStorage` prototype** (no QC backend) — see edge cases.
5. **Master Data** — Material Types, QC Parameters, Print Documents.

Audience: `qc_store` (guards), `qc_chemist` (lab + chemist), `qc_manager` (QAM), and a
Production-QC group. Navigation is permission-gated so shop-floor users don't see the
whole module (see [Permissions & roles](#permissions--roles)).

There is **no barcode/scanner workflow** in QC — every screen is form-based. (Unlike
the marketplace packing module, QC does not scan boxes.)

---

## Key concepts & entities (frontend types)

Defined in `types/qc.types.ts`:

- **`InspectionListItem`** — lightweight row for all list tabs (queried from the
  arrival slip on the backend). Has `arrival_slip_id`, `inspection_id` (nullable),
  `workflow_status` (incl. computed `NOT_STARTED`), `chemist_decision` /
  `manager_decision` (`InspectionDecisionInfo`), `material_type_name`, etc.
- **`Inspection`** — the full detail object: form fields, `parameter_results[]`,
  `chemist_decision`, `manager_decision`, `manager_decision_logs[]` (audit trail),
  `is_grpo_done`, `rejected_qc_return_entry_id`, `is_locked`, `qc_attachments`,
  `attachments` (COA/COQ from the slip), `print_document_id`.
- **`InspectionWorkflowStatus`** — DRAFT / SUBMITTED / QA_CHEMIST_APPROVED /
  QAM_APPROVED / REJECTED / COMPLETED (+ list-only `NOT_STARTED`).
- **`InspectionFinalStatus`** — PENDING / ACCEPTED / REJECTED / HOLD.
- **`InspectionDecision`** — APPROVED / HOLD / REJECTED (the actor's choice).
- **`ParameterType`** — NUMERIC / TEXT / BOOLEAN / RANGE (drives the result input:
  number field, text, Pass/Fail dropdown, number-within-range).
- **`ProductionQCSession` / `…ListItem`** — a run's QC round: `session_type`
  IN_PROCESS/FINAL, `workflow_status` DRAFT/SUBMITTED/APPROVED/REJECTED,
  `overall_result` PASS/FAIL, `pass_count`/`total_params`.

Status → label/colour/icon maps live in `constants/qc.constants.ts`
(`WORKFLOW_STATUS_CONFIG`, `FINAL_STATUS_CONFIG`, `DECISION_STATUS_CONFIG`).
`ARRIVAL_SLIP_STATUS` / `FINAL_STATUS` are **re-exported from `@/config/constants`**
(shared with gate & grpo).

---

## End-to-end flows (what the user does on screen)

### Flow A — Raw-material inspection

1. **Dashboard** (`/qc`, `QCDashboardPage`) shows count cards per sub-module the user
   can see (Arrival Slips pending/awaiting/completed, Production QC draft/submitted/
   approved/rejected, Line Clearance pending, Master Data shortcuts). Cards render
   only for permitted sub-modules.
2. **Arrival Slips list** (`/qc/arrival-slips`, `PendingInspectionsPage`) — tabbed
   (All / Actionable / Pending / Draft / Approved / Rejected). The active tab drives
   which backend list endpoint is hit (`useInspectionsByTab`). Client-side search,
   global date-range filter, and **Excel export** (`xlsx`). Clicking a row opens the
   inspection: `/qc/inspections/<slipId>` if an inspection exists, else
   `…/<slipId>/new`.
3. **Inspection detail/create** (`InspectionDetailPage`, ~1950 lines — the workhorse).
   - On **new**, form fields prefill from the arrival slip (material, supplier, packing
     = qty+uom, vehicle, invoice, remarks).
   - **Material type auto-resolves from the SAP code** via
     `useMaterialTypeBySapItem`. One candidate auto-selects; **multiple → a picker**
     appears ("linked to multiple material types — select one"); **none → an inline
     "Link SAP item …" button** opens a dialog to create the mapping
     (`useLinkMaterialTypeSAPItem`). Changing the SAP code clears the chosen type +
     results.
   - **Report No.** and **Internal Lot No.** are required manual inputs.
   - **QC Parameters** table: the input type follows `parameter_type`; NUMERIC/RANGE
     auto-fill `result_numeric` and compute Within-Spec; BOOLEAN is a Pass/Fail
     select; the Within-Spec checkbox is manual only for NUMERIC/TEXT.
   - **Save** validates SAP code, report/lot, material type, and mandatory params, then
     creates/updates the inspection and bulk-saves results. QC attachments upload as
     multipart.
   - **Submit for Approval** (`showSubmitButton`) posts submit. If the backend demands
     an out-of-spec remark, a **"Remark required" dialog** captures it inline and
     resubmits — so a submit-only user without an editable Remarks field can still
     submit.
4. **Approval queue** (`/qc/arrival-slips/approvals`, `ApprovalQueuePage`) — two tabs
   ("QA Chemist Queue" / "QA Manager Queue"), each visible only with the matching
   permission; loads `awaiting-chemist` / `awaiting-qam`. "Review" opens the
   inspection.
5. **Decision** (inside `InspectionDetailPage`): approvers see an **Approval card**
   with a remarks box and **Approved / Hold / Reject** buttons (Reject requires a
   remark). Chemist decision → manager decision. The QAM card shows the chemist's
   decision inline and, if the QAM already decided, notes that re-deciding updates it
   (previous kept in **Manager Decision History**). After a decision, an animated
   `QCSuccessScreen` confirms.
6. **Print** — `useInspectionReportPrint` opens a section picker and prints the report
   (same format as the GRPO report), embedding COA/COQ and QC attachments on separate
   pages; the company's `print_document_id` is stamped via a `body` dataset attribute.

### Flow B — Send back to gate

If the arrival slip is SUBMITTED and there's no inspection or it's still DRAFT, a user
with `can_send_back_arrival_slip` sees an orange **"Send Back to Gate"** card with an
optional remark. On success it navigates back to the list; the gate is notified.

### Flow C — Production QC

- **Dashboard** (`/qc/production`, `ProductionQCDashboardPage`) — searchable/filterable
  table of sessions. A FINAL draft with no material type shows as **"Pending"** (FG
  approval requested, parameters not yet selected).
- **Run page** (`/qc/production/runs/:runId`) — In-Process rounds + the single Final
  QC. "New QC Round" dialog picks a material type + session type + check time. Draft
  sessions can be deleted.
- **Session page** (`/qc/production/sessions/:sessionId`) — enter per-parameter results
  (DRAFT only), then submit PASS/FAIL.
- **Approvals** (`/qc/production/approvals`, `ProductionQCApprovalPage`) — approve
  (with PASS/FAIL) or reject submitted sessions.

### Flow D — Line Clearance QA

`/qc/line-clearance` (`LineClearanceQAPage`) lists clearances (default filter
"Pending Approval") from the `production/execution` API, with a review dialog to
Approve/Reject. Approving requires `can_approve_line_clearance_qc`.

### Flow E — Customer Return QC (localStorage prototype)

`/qc/customer-returns` + `/:returnId` read/write entries from the **gate module's
`customerSalesFlow.storage` (`localStorage`)**, not a QC API. QC records item
accept/reject quantities, QC remarks, and a **Factory Head decision** (also stored in
`localStorage` via `utils/factoryHeadDecision.ts`).

---

## Critical business rules & invariants (frontend-enforced)

- **Permission + workflow-state gating** is centralized in
  `hooks/useInspectionPermissions.ts`. It combines raw perms with the inspection state
  to expose flags: `showSaveButton`, `showSubmitButton`, `showChemistApproval`,
  `showQAMApproval`, `showRejectButton`, `canEditFields`, `isLocked`.
- **QAM re-decide is client-gated too:** `canManagerRedecide = isManagerDecided &&
  !grpoDone && !materialSentOut` — mirrors the backend lock on `is_grpo_done` /
  `rejected_qc_return_entry_id`. The QAM approval card shows even after a decision only
  while still changeable.
- **Editing is only allowed while unlocked**; an approver can toggle **Edit** to amend
  before deciding (the backend permits updates until QAM lock).
- **Mandatory-parameter and out-of-spec-remark checks** run client-side before submit,
  but the backend is the source of truth (the inline remark dialog reacts to the
  server's 400).
- **Company context** is implicit — the API client carries the active company; QC is
  single-company (no cross-company selection in the UI).

---

## Integrations & cross-module boundaries

- **Backend API** (`@/config/constants` → `API_ENDPOINTS.QUALITY_CONTROL_V2`, prefix
  `/quality-control/…`). Data fetching is **TanStack Query** (`api/*/**.queries.ts`),
  `staleTime` 30s; pending-inspections auto-refetch every 60s. Mutations invalidate
  `['inspections']`.
- **Gate module** — `DateRangePicker` is imported from `@/modules/gate/components`;
  Customer Return QC reads gate `customerSalesFlow.storage`.
- **Production/execution module** — Line Clearance QA and Production QC run/line lookups
  use `@/modules/production/execution/api`.
- **Shared constants** — `ARRIVAL_SLIP_STATUS`, `FINAL_STATUS` come from
  `@/config/constants` (used by gate + grpo too); QC-internal ones stay in
  `constants/qc.constants.ts`.
- **Permissions** — `@/config/permissions` (`QC_PERMISSIONS`) maps 1:1 to the Django
  codenames.

---

## Real-world edge cases

- **SAP code linked to multiple material types.** *Trigger:* open a new inspection for
  such a code. *Behaviour:* the Material Type field becomes a **searchable picker**;
  Save blocks until one is chosen. *Symptom:* "SAP item … is linked to multiple
  material types — select one."

- **Unmapped SAP code.** *Trigger:* SAP code with no material-type link. *Behaviour:*
  the field turns into a **"Link SAP item … to a material type"** button → dialog.
  *Symptom:* "No material type mapping found for SAP item …". *Risk:* if SAP item
  search is unavailable, the link dialog's search returns nothing and a brand-new code
  can't be mapped.

- **Out-of-spec parameter, submit-only user.** *Trigger:* submit with a failing
  reading. *Behaviour:* the backend 400 surfaces a **"Remark required" dialog**; the
  user types a remark and resubmits in one step. *Symptom:* modal blocking submit.

- **QAM opens an already-committed inspection.** *Trigger:* GRPO posted, or the rejected
  material already left the gate. *Behaviour:* `canManagerRedecide` is false → the QAM
  decision buttons are hidden; a server attempt would 400. *Symptom:* read-only
  inspection, no decision buttons.

- **Send-back after chemist already has it.** *Trigger:* try to send back once the
  inspection is past DRAFT. *Behaviour:* the "Send Back" card is hidden
  (`workflow_status !== DRAFT`); the server also refuses. *Symptom:* only rejection is
  available.

- **Deleted approver user.** *Trigger:* a chemist/QAM account removed. *Behaviour:* the
  backend returns `null` names; the UI shows blanks rather than erroring.

- **Customer Return QC on a different browser/device.** *Trigger:* open Customer Return
  QC where the `localStorage` entries were never written (different machine, cleared
  storage, incognito). *Behaviour:* the list is **empty** — the data is client-only.
  *Symptom:* "No customer returns available for QC." *Risk:* this sub-module does not
  persist server-side; a Factory Head decision saved on one device is invisible
  elsewhere.

- **Stale list after an action.** *Trigger:* approve/reject then look at a list.
  *Behaviour:* mutations invalidate the `['inspections']` query tree, so lists and
  counts refetch; a manual **Refresh** button exists on every list as a fallback.

- **Permission (403) vs. general error.** *Trigger:* a user lacks a list's permission.
  *Behaviour:* pages distinguish `status===403` and render a dedicated **"Permission
  Denied"** panel (shield icon) vs. a yellow "Failed to Load" panel, each with Retry.

---

## Failure modes / what can break (operator-visible)

| Situation | What the operator sees |
|---|---|
| SAP item search down while linking a new code | Link dialog search returns nothing; can't map the code |
| Duplicate report number | Inline field error "This report number is already in use." |
| Missing mandatory parameter on Save | Red field error under the parameter row |
| Out-of-spec reading on Submit | "Remark required" dialog blocking submit |
| No permission for a list/queue | Full-width "Permission Denied" panel with Retry |
| Network / 5xx | "Failed to Load" panel with Retry; toasts on mutation failure (Production QC uses `sonner` toasts) |
| Locked inspection | Form is read-only; only Print (and history) available |
| Customer Return QC on a fresh device | Empty list — data lives only in this browser |

---

## Improvement opportunities & known gaps

- **Customer Return QC is `localStorage`-only** — no backend, no cross-device sync, no
  audit trail. The highest-value gap to close; needs a QC-side API + model.
- **Factory Head decisions** are also `localStorage` (`utils/factoryHeadDecision.ts`),
  keyed per inspection id — not server-persisted.
- **`InspectionDetailPage` is ~1950 lines** doing create/edit/approve/send-back/print —
  a candidate for decomposition.
- **Legacy route redirects** (`/qc/pending`, `/qc/inspections/*`, `/qc/approvals`) are
  kept alongside the newer `/qc/arrival-slips/*` paths; navigation still points at some
  legacy paths (e.g. row clicks go to `/qc/inspections/<id>`). Consolidating would
  reduce confusion.
- **No offline queue** for the live QC flows — they require connectivity (only the
  prototype customer-returns flow works offline, by accident of being `localStorage`).

---

## Permissions & roles

`QC_PERMISSIONS` (`@/config/permissions/qc.permissions.ts`) mirrors the Django
codenames. Routes and sidebar entries in `module.config.tsx` gate on them.

| Area | Permission | Who |
|---|---|---|
| Arrival slips (view/list) | `view_rawmaterialinspection` | qc_store / chemist / qam |
| Create inspection | `add_rawmaterialinspection` | chemist / qam |
| Submit inspection | `can_submit_inspection` | chemist / qam |
| Chemist decision | `can_approve_as_chemist` | chemist / qam |
| QAM decision | `can_approve_as_qam` | qam |
| Send slip back | `can_send_back_arrival_slip` | qc_store / qam |
| Production QC view/create/approve | `can_(view/create/approve)_production_qc` | Production-QC group / qam |
| Line Clearance QA | `can_(view/approve)_line_clearance_qc` | Production-QC group |
| Master data | `can_manage_material_types`, `can_manage_qc_parameters` | qam / admins |

**Nav gating nuance** (documented in `module.config.tsx`): the top-level QC sidebar
item is gated on **inspection/arrival-slip perms + line-clearance perms** — *not*
`can_view_production_qc`. That is deliberate: the shop-floor `production_execution`
group holds `can_view_production_qc` for in-run checks, so gating on it would wrongly
expose the whole QC module to them. Children are still filtered per-permission, so a
Production-QC user sees only Production QC + Line Clearance QA. See the memory note
*"Group perms vs frontend nav gating."*

---

## Developer file map

**Frontend (`C:/Users/gurpa/dev/FactoryFlow/src/modules/qc/`)**
- `module.config.tsx` — routes (incl. legacy redirects), sidebar, permission gates.
- `pages/QCDashboardPage.tsx` — sub-module cards + counts.
- `pages/PendingInspectionsPage.tsx` — arrival-slip list, tabs, search, Excel export.
- `pages/InspectionDetailPage.tsx` — create/edit/submit/approve/send-back/print.
- `pages/ApprovalQueuePage.tsx` — chemist/QAM approval queues.
- `pages/production/` — `ProductionQCDashboardPage`, `ProductionQCRunPage`,
  `ProductionQCSessionPage`, `ProductionQCApprovalPage`.
- `pages/LineClearanceQAPage.tsx` — line-clearance review/approve.
- `pages/customerReturns/` — `CustomerReturnQCDashboardPage`, `…DetailPage`
  (localStorage prototype).
- `pages/masterdata/` — `MaterialTypesPage`, `QCParametersPage`, `PrintDocumentsPage`.
- `api/` — `inspection/`, `arrivalSlip/`, `materialType/`, `qcParameter/`,
  `productionQC/`, `printDocument/` (each `*.api.ts` + `*.queries.ts`).
- `hooks/useInspectionPermissions.ts` — permission × workflow-state flags.
- `constants/qc.constants.ts` — status/decision label & colour maps.
- `types/qc.types.ts` — all module types.
- `components/` — `MaterialTypeSelect`, `QCSuccessScreen`, `useInspectionReportPrint`.
- `utils/factoryHeadDecision.ts` — Factory Head decision (localStorage).
- Endpoints: `@/config/constants/api.constants.ts` → `QUALITY_CONTROL_V2`.

**Backend** — see the paired doc for models/services/APIs.

---

## Related docs

- **Paired backend doc:** `C:/Users/gurpa/dev/factory_app/quality_control/docs/README.md`.
- `docs/modules/gate.md` — creates the arrival slips QC inspects; owns the rejected-QC
  vendor-return gate-out and the customer-returns storage QC reuses.
- `docs/modules/grpo.md` — consumes QAM-accepted inspections; a posted GRPO locks the
  QC decision.
- `src/modules/qc/docs/README.md` — any module-local notes (if still maintained).
