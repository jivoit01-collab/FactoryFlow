# Quality Control — Frontend (`src/modules/qc`)

> Paired backend doc: `C:/Users/gurpa/dev/factory_app/quality_control/docs/README.md`
> (repo `factory_app`, path `quality_control/docs/README.md`).
>
> Written from the code (`module.config.tsx`, `api/*`, `pages/*`, `hooks/*`,
> `types/*`).
>
> **2026-09:** Production QC (+ its approvals), Online Quality Monitoring / Water
> Quality Specs, Customer Return QC and Documents (the fillable QC record sheets) were
> removed from the frontend, and their backend deleted. They will be rebuilt from
> scratch; nothing in the frontend calls their old endpoints any more.
>
> **2026-09-29:** Production QC is back, rebuilt from scratch (entries on a running
> line, one-step approval — see [Flow D](#flow-d--production-qc)). None of the old
> session-based pages, routes, endpoints or permissions came back with it.

---

## Overview — what it does & who uses it

The QC module is the QA/lab UI. It is one sidebar entry ("Quality Control", flask
icon) with **five items, one per area**. An area of several pages has a tab bar across
them (`components/qcSections.tsx`); each page keeps its own route, so bookmarks,
notification links and in-page URL filters are untouched. There is no dashboard: `/qc`
opens the first page the user may see (`pages/QCSectionRedirect.tsx`).

1. **Arrival Slips (Raw-Material QC)** — the live daily workflow. Tabs: **Inspections**
   (`/qc/arrival-slips`), **Approvals** (`/qc/arrival-slips/approvals`, chemist/QAM
   only), **Decision Changes** (`/qc/arrival-slips/decision-changed`), and the masters
   the inspections run on: **Material Types** (`/qc/arrival-slips/material-types`) and
   **QC Parameters** (`/qc/arrival-slips/parameters`; the old `/qc/master/*` addresses
   redirect, keeping the query). Lab users
   create an inspection against a submitted arrival slip, enter parameter readings, and
   route it through **QA Chemist → QA Manager**. The sidebar item carries a red count of
   inspections waiting for *this* user's sign-off (`PendingApprovalsBadge`).
2. **Production QC** — checks QC make on a line while a run is on it. Tabs: **Entries**
   (`/qc/production`, the dashboard) and **Parameter Types**
   (`/qc/production/parameter-types`, the masters; manage-only). An entry is made
   against a running line and a *parameter type*, one value per parameter, and saving it
   sends it to a QC lead, who approves it or sends it back. Its badge counts entries
   pending approval, for approvers only (`ProductionQCBadge`).
3. **Line Clearance** (`/qc/line-clearance`) — approve pre-production line clearances
   (the data comes from the `production/execution` module; QC just reviews/approves).
   Its badge counts clearances SUBMITTED and waiting for QA (`LineClearanceQABadge`).
4. **QA Procedures** — the controlled procedures kept as the original PDF file
   (`/qc/qa-procedures`), with an audit log of who changed which procedure.
5. **Master Data** (`/qc/master` → `/qc/master/print-documents`) — one tab for now,
   **Print Documents**: where every printed form's document number lives — the two
   arrival-slip reports and each production QC sheet (one row per parameter type;
   ETP keeps its own, `etp.EtpPrintDocument`).

A tab bar shows only the tabs the user may open, and none at all when that is one.

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

Production QC, in `types/productionQC.types.ts` (mirrors
`quality_control/serializers_production_qc.py`):

- **`ProductionParameterType`** — plays the part a material type does on the arrival
  slip: its own list of parameters (`ProductionParameter`: spec text, min / max, uom,
  sequence, mandatory, and `value_type` — the kind of reading, NUMERIC / TEXT / BOOLEAN
  / RANGE) and the FG products it applies to (`items`, keyed on SAP item code).
  `parameter_count` counts active parameters; a type with none cannot be checked
  against. Production parameters are **not** the arrival-slip ones.
- **`ProductionRunningLine`** — a line a check can be made on: the line's IN_PROGRESS
  run whose latest segment started in the last 24h or is open now.
  `is_running_now=false` means stopped (breakdown / lunch) since `stopped_at`.
  `linked_parameter_types` are the types its product is linked to.
- **`ProductionQCEntry`** — one check: line / run / product snapshot, the parameter
  type, `checked_at`, `status` PENDING / SENT_BACK / APPROVED, remarks, and `results[]`
  (`ProductionQCResult`, the parameter's spec snapshotted onto each reading).

Status → label/colour/icon maps live in `constants/qc.constants.ts`
(`WORKFLOW_STATUS_CONFIG`, `FINAL_STATUS_CONFIG`, `DECISION_STATUS_CONFIG`).
`ARRIVAL_SLIP_STATUS` / `FINAL_STATUS` are **re-exported from `@/config/constants`**
(shared with gate & grpo).

---

## End-to-end flows (what the user does on screen)

### Flow A — Raw-material inspection

1. **Arrival Slips list** (`/qc/arrival-slips`, `PendingInspectionsPage`) — tabbed
   (All / Actionable / Pending / Draft / Approved / Rejected). The active tab drives
   which backend list endpoint is hit (`useInspectionsByTab`). Client-side search,
   global date-range filter, and **Excel export** (`xlsx`). Clicking a row opens the
   inspection: `/qc/arrival-slips/inspections/<slipId>` if an inspection exists, else
   `…/<slipId>/new`.
2. **Inspection detail/create** (`InspectionDetailPage`, ~1950 lines — the workhorse).
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
3. **Approval queue** (`/qc/arrival-slips/approvals`, `ApprovalQueuePage`) — two tabs
   ("QA Chemist Queue" / "QA Manager Queue"), each visible only with the matching
   permission; loads `awaiting-chemist` / `awaiting-qam`. "Review" opens the
   inspection.
4. **Decision** (inside `InspectionDetailPage`): approvers see an **Approval card**
   with a remarks box and **Approved / Hold / Reject** buttons (Reject requires a
   remark). Chemist decision → manager decision. The QAM card shows the chemist's
   decision inline and, if the QAM already decided, notes that re-deciding updates it
   (previous kept in **Manager Decision History**). After a decision, an animated
   `QCSuccessScreen` confirms.
5. **Print** — `useInspectionReportPrint` opens a section picker and prints the report
   (same format as the GRPO report), embedding COA/COQ and QC attachments on separate
   pages; the company's `print_document_id` is stamped via a `body` dataset attribute.

### Flow B — Send back to gate

If the arrival slip is SUBMITTED and there's no inspection or it's still DRAFT, a user
with `can_send_back_arrival_slip` sees an orange **"Send Back to Gate"** card with an
optional remark. On success it navigates back to the list; the gate is notified.

### Flow C — Line Clearance QA

`/qc/line-clearance` (`LineClearanceQAPage`) lists clearances (default filter
"Pending Approval") from the `production/execution` API, with a review dialog to
Approve/Reject. Approving requires `can_approve_line_clearance_qc`.

### Flow D — Production QC

**The dashboard is one day at a time** (`?date=YYYY-MM-DD`, default today; the list,
counts and search are that day's). A notice points at checks still waiting on other
days (`waiting_elsewhere` in the counts). A **List / Sheet** toggle (`?view=sheet`) lays
the day out as the paper record — one sheet per parameter type, a column per check
(PRODUCT / SKU / LINE ID, then each parameter with its UoM, remarks, Q.A Chemist,
Q.A.M; `ProductionQCSheet.tsx`, rows from `utils/productionQCSheet.ts`). Each sheet
prints (`ProductionQCSheetPrint.tsx`, `useProductionQCSheetPrint.tsx`): landscape A4 in
the shared `ControlledDocumentFrame`, ten time columns a page as on the form, out-of-spec
readings bold red with `*`. The form's number comes from Master Data > Print Documents
(the type's `print_document_id`) and is printed above "Controlled Document" in the
footer, as on the paper form; its revision / revision date come from the type.


1. **Dashboard** (`/qc/production`, `ProductionQCDashboardPage`) — count cards
   (Pending Approval and Sent Back on every date; Approved within the global date
   range), status chips (All / Pending Approval / Sent Back / Approved, in `?status=`),
   a line filter (`?line=`, applied client-side over the loaded list), and a search
   that spans every date. Pending and sent-back entries are listed whatever their date,
   so an unfinished check never drops off. A row opens the entry.
2. **New** (FILL only, `NewProductionQCEntryDialog`) — step 1 picks a running line
   (`GET production-qc/running-lines/`), each showing product, item code and a
   *Running* / *Stopped since HH:MM* badge. Step 2 picks the parameter type: a product
   linked to types is offered **only those** (the only one is preselected); an
   **unlinked** product is offered every active type, with a note that the one picked
   is linked to it when the entry is saved (the backend links it). A type with no
   parameters is disabled. Continue opens `/qc/production/new?run=<run_id>&type=<id>`.
3. **Entry form** (`ProductionQCEntryPage`, shared with `/qc/production/entries/:id/edit`)
   — line / product / item code / run / type, then one row per parameter: name, spec,
   the input by value kind (number; text; a Pass / Fail select), an optional row remark,
   and a live within / out-of-spec hint. The hint is `utils/productionQCSpec.ts`, a port
   of the backend's `spec_evaluation.py` (min / max first, else the spec text: `910±5`,
   `NLT 20`, `58.6-61.7`), so it predicts the verdict the server records; a reading the
   spec cannot judge (text, a spec without numbers) gets a hand-set *Within spec* box.
   **Save** is also *send for approval* — there are no drafts. The form blocks a missing
   mandatory value and an out-of-spec reading with no entry remark; the backend's own
   400s land on the field (`remarks`, `results`, `run_id` / `parameter_type_id` with a
   *Pick again* button, or `detail`). If the run left the line before the form opened,
   the form says so and offers the way back.
4. **Entry detail** (`/qc/production/entries/:entryId`, `ProductionQCEntryDetailPage`) —
   status, the check, the results (value, spec, in-spec ✓/✗), remarks, and a highlighted
   banner with the send-back remark while SENT_BACK. **Edit** (FILL) while PENDING or
   SENT_BACK → the form in edit mode → `PATCH`, which puts it back to PENDING.
   **Approve** (optional remark) and **Send back** (remark required) for APPROVE while
   PENDING. Mutations invalidate the entry lists, the counts and so the badge.
5. **Parameter Types** (`/qc/production/parameter-types`, `ProductionParameterTypesPage`,
   MANAGE) — search / add / edit / remove types (a soft delete: saved entries keep
   their readings); select one (`?type=`) for its parameters (add / edit / remove:
   code, name, standard value, value type, min / max for numeric kinds, uom, sequence,
   mandatory) and its linked products (unlink; link by typing item code + name).

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
- **Gate module** — `DateRangePicker` is imported from `@/modules/gate/components`.
- **Production/execution module** — Line Clearance QA (and its sidebar badge's
  pending count) use `@/modules/production/execution/api`.
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
| Network / 5xx | "Failed to Load" panel with Retry; toasts on mutation failure |
| Locked inspection | Form is read-only; only Print (and history) available |

---

## Improvement opportunities & known gaps

- **`utils/factoryHeadDecision.ts` is mostly dead code** — its `localStorage`
  read/write helpers lost their only caller with Customer Return QC; the file survives
  for the `FactoryHeadDecisionRecord` type that the gate's rejected-QC-return storage
  imports.
- **`InspectionDetailPage` is ~1950 lines** doing create/edit/approve/send-back/print —
  a candidate for decomposition.
- **Legacy routes** (`/qc/pending`, `/qc/approvals`, `/qc/pdf-documents`) redirect to
  their pages; `/qc/inspections/*` still renders the detail page for old links. The app
  itself links only to `/qc/arrival-slips/*`, so the sidebar stays lit on a detail page.
- **No offline queue** for the live QC flows — they require connectivity.

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
| Line Clearance QA | `can_(view/approve)_line_clearance_qc` | Production-QC group |
| Master data | `can_manage_material_types`, `can_manage_qc_parameters` | qam / admins |
| Production QC — see entries | `can_view_production_qc_entries` (FILL / APPROVE see them too) | QC |
| Production QC — make / correct an entry | `can_fill_production_qc_entries` | QC chemist |
| Production QC — approve / send back | `can_approve_production_qc_entries` | QC lead |
| Production QC — parameter types | `can_manage_production_qc_parameters` | qam / admins |

`QC_PERMISSIONS.PRODUCTION_QC = { VIEW, FILL, APPROVE, MANAGE_PARAMETERS }`. The
sidebar item and `/qc/production` open to VIEW / FILL / APPROVE; New and edit need
FILL; the running-lines endpoint needs FILL. A user holding only MANAGE_PARAMETERS has
no Production QC sidebar item and lands on Parameter Types from `/qc`. These are new
codenames: the removed session-based ones (`can_view_production_qc`,
`can_create_production_qc`, …) must not come back (the permission and module-config
tests check the exact old strings are absent).

The line-clearance-QC codenames keep their `quality_control` app label; on the backend
they are declared on `RawMaterialInspection`'s `Meta.permissions` now that
`ProductionQCSession` is gone.

**Nav gating nuance** (documented in `module.config.tsx`): the top-level QC sidebar
item is gated on exactly the union of its pages' permissions (`QC_MODULE_PERMISSIONS`),
so nobody gets a Quality Control menu with nothing in it — a gate user holding only
arrival-slip view no longer sees QC at all. The line-clearance-QC perms are held only by
QC groups (Production QC, qc_manager) — not by the shop-floor `production_execution`
group — so gating on them does not surface the module to the shop floor. A
Production-QC user sees only the Line Clearance item. A user holding only the audit-log
permission sees the module with no items and lands on the log from `/qc`.

---

## Developer file map

**Frontend (`C:/Users/gurpa/dev/FactoryFlow/src/modules/qc/`)**
- `module.config.tsx` — routes (incl. legacy redirects), sidebar, permission gates.
- `constants/qcSections.ts` — the areas' tabs, their permissions, where `/qc` lands.
- `components/QCSectionTabs.tsx`, `components/qcSections.tsx` — the tab bars.
- `components/QCSidebarBadges.tsx` — the Arrival Slips / Production QC / Line Clearance counts.
- `pages/QCSectionRedirect.tsx` — `/qc` and `/qc/master` open the first allowed page.
- `pages/PendingInspectionsPage.tsx` — arrival-slip list, tabs, search, Excel export.
- `pages/InspectionDetailPage.tsx` — create/edit/submit/approve/send-back/print.
- `pages/ApprovalQueuePage.tsx` — chemist/QAM approval queues.
- `pages/productionQC/` — `ProductionQCDashboardPage` (entries), `NewProductionQCEntryDialog`
  (line → type), `ProductionQCEntryPage` (new / edit form), `ProductionQCEntryDetailPage`
  (detail, approve / send back), `ProductionParameterTypesPage` (masters),
  `ProductionQCStatusBadge` (status / running badges, send-back banner).
- `pages/LineClearanceQAPage.tsx` — line-clearance review/approve.
- `pages/qaProcedures/` — `QAProceduresPage`, `QAProcedureLogPage` (PDF library + audit log).
- `pages/masterdata/` — `MaterialTypesPage`, `QCParametersPage`, `PrintDocumentsPage`.
- `api/` — `inspection/`, `arrivalSlip/`, `materialType/`, `qcParameter/`,
  `parameterSet/`, `printDocument/`, `qcDocumentFile/`, `qcDocumentFileAudit/`,
  `productionQC/` (each `*.api.ts` + `*.queries.ts`).
- `constants/productionQC.ts` — Production QC status labels / colours and filter chips.
- `utils/productionQCSpec.ts` — judging a reading against its spec (port of the
  backend's `spec_evaluation.py`); `utils/productionQCFormat.ts` — date / time labels.
- `types/productionQC.types.ts` — Production QC types.
- `hooks/useInspectionPermissions.ts` — permission × workflow-state flags.
- `constants/qc.constants.ts` — status/decision label & colour maps.
- `types/qc.types.ts` — all module types.
- `components/` — `MaterialTypeSelect`, `QCSuccessScreen`, `useInspectionReportPrint`.
- `utils/factoryHeadDecision.ts` — `FactoryHeadDecisionRecord` type (used by the gate's
  rejected-QC-return storage); its localStorage helpers are unused.
- Endpoints: `@/config/constants/api.constants.ts` → `QUALITY_CONTROL_V2`.

**Backend** — see the paired doc for models/services/APIs.

---

## Related docs

- **Paired backend doc:** `C:/Users/gurpa/dev/factory_app/quality_control/docs/README.md`.
- `docs/modules/gate.md` — creates the arrival slips QC inspects; owns the rejected-QC
  vendor-return gate-out.
- `docs/modules/grpo.md` — consumes QAM-accepted inspections; a posted GRPO locks the
  QC decision.
- `src/modules/qc/docs/README.md` — any module-local notes (if still maintained).
