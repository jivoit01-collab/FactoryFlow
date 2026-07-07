# Work Permit (Permit-to-Work) — Maintenance Module Integration Guide

> Source form: **"Work Permit — Moon Beverages Limited, Greater Noida Plant"**
> (`Work Permit G. Noida New.pdf`, Revision 03, SMS-FRM-02-11-01).
> This document explains **what the form is** and **how to build it into the existing
> Maintenance module** following the same patterns already used for Fire Reports and
> Work Orders. It is a design/reference doc — no code is shipped by this file.

---

## 1. What the form actually is

The PDF is a **Permit-to-Work (PTW)** — a safety clearance that a person/contractor must
obtain **before** starting a hazardous maintenance job. It is **not a report**; it is a
**multi-stage approval workflow** with sign-offs and a defined lifecycle.

A single permit is valid for **one job, one location, one shift/day**. Emergencies auto-cancel
the permit. If work isn't started within 30 minutes of issue, the permit is void.

### Permit types (tick relevant — a permit may carry more than one)
`GENERAL` · `HEIGHT` (> 2 m) · `HOT_WORK` (welding/grinding/chipping) · `COLD_WORK` ·
`CONFINED_SPACE` · `LINE_BREAKING` · `HAZARDOUS_ENERGY_CONTROL` · `EXCAVATION` ·
`LOADING_UNLOADING_HAZMAT`

> `permit_types` is stored as a JSON list on the model; the allowed values live in the
> `WorkPermitType` enum (serializer-validated), so adding a type needs no migration.

### Automatic expiry
`maintenance/jobs.py::expire_lapsed_work_permits()` flips lapsed live permits to EXPIRED
and notifies the Fire Head + submitter. Run it automatically with
`python manage.py run_work_permit_scheduler` (APScheduler, every
`WORK_PERMIT_EXPIRY_INTERVAL_MINUTES`, default 5) or once via `python manage.py
expire_work_permits` (cron / Task Scheduler).

### The 17 numbered sections on the form
| # | Section | Nature |
|---|---------|--------|
| — | Serial No. (`D-…`), permit type ticks | header |
| 1 | Validity — date, time start, time end | data |
| 2 | Issuing Dept — name, phone | data |
| 3 | Issued To — name, phone | data |
| 4 | Cross Reference | data |
| 5 | Job Location | data |
| 6 | Job Description | data |
| 7 | Hazards Identified (jointly) | **checklist** |
| 8 | Specify Hazards & Control Measures / Method Statement | text + attachment |
| 9 | Isolations Required — Electrical / Service / Process | **structured + certify** |
| 10 | PPE to be Used | **checklist (grouped by task)** |
| 11 | Precautions Checklist | **checklist (grouped by task)** |
| 12 | Permit Authorization — Issuer / Area Incharge / Safety Coordinator / Factory Manager | **sign-off matrix** |
| 13 | Permit Acceptance (contractor/supervisor) | **sign-off** |
| 14 | Energization — Service / Process / Electrical | **sign-off** |
| 15 | Work Completed (A abandon / B verified closure) | **sign-off** |
| 16 | Names of Employees on the Job (up to 30, + signature) | **child list** |
| 17 | Permit Handover / Extension | **sign-off** |
| p2 | Method Statement / Pre-Task Hazard Analysis + Rescue Plans | text + static reference |

**Key takeaway:** this maps almost exactly onto the **Fire Reports** pattern
(parent record + child items + attachments + a review/sign-off action), with the one addition
being a **multi-role approval matrix** instead of a single reviewer.

---

## 2. Lifecycle / status workflow

```
DRAFT ──issue──▶ ISSUED ──approvals──▶ APPROVED ──accept──▶ ACCEPTED
                                                              │
                                                        (work in progress)
                                                              │
                                              ┌──energize──▶ ENERGIZED ─┐
                                              │                         ▼
                                              └──────────────────▶ COMPLETED ──close──▶ CLOSED
                                                                        │
                                                                  CANCELLED / EXPIRED (any stage)
```

Suggested `status` enum:
`DRAFT · ISSUED · APPROVED · ACCEPTED · IN_PROGRESS · COMPLETED · CLOSED · CANCELLED · EXPIRED`

Each transition is a **permission-gated action button** that stamps `user + timestamp`
(mirrors `fireReportApi.reviewReport`). Do **not** collect free-text "signatures"; the
audit trail (who + when) is the digital signature.

---

## 3. Data model

One parent + child collections. Field names follow the snake_case + `*_display` +
audit-field conventions already used by `FireShiftReport`
(`src/modules/maintenance/types/fireReport.types.ts`).

### 3.1 WorkPermit (parent)
```
id, company
serial_no                       # auto-generated "D-…"
permit_types[]                  # multi-select enum (see §1)
status, status_display

# 1. Validity
valid_date, time_start, time_end

# 2–4
issuing_dept, issuer_name, issuer_phone
issued_to_name, issued_to_phone
cross_ref

# 5–6
job_location, job_description

# 7–8
hazards_identified[]            # array of hazard codes (checklist)
control_measures                # method-statement text

# 9. Isolations (each a small structured object)
electrical_isolation { required, drive_panel, how_isolated[], certified_by, certified_at }
service_isolation    { required, services[], how_isolated, certified_by, certified_at }
process_isolation    { required, equipment, how_isolated, certified_by, certified_at }

# 10–11
ppe[]                           # array of PPE codes (checklist)
precautions[]                   # array of precaution codes (checklist)

# 12. Authorization matrix (each: user id + name + timestamp)
issuer_*        area_incharge_*        safety_coordinator_*        factory_manager_*
modification_authorization_required   # YES/NO
fire_watcher_name

# 13. Acceptance
accepted_by, accepted_by_name, accepted_at, contractor_company

# 14. Energization (each Y/N + certified_by + at)
service_energization_*   process_energization_*   electrical_energization_*

# 15. Completion
work_completed_type             # ABANDONED | VERIFIED
completed_by, completed_at, closure_time

# 17. Handover / extension
handover_by, handover_to, handover_at

# audit (identical to FireShiftReport)
is_active, created_by, created_by_name, updated_by, updated_by_name, created_at, updated_at
```

### 3.2 Child tables
- **WorkPermitWorker** — section 16 list (mirrors `FireShiftReportItem`):
  `id, permit, name, role, signed (bool), signed_at, + audit`
- **WorkPermitAttachment** — method-statement page / photos (mirrors `FireShiftReportAttachment`):
  `id, permit, file, title, uploaded_by_name, + audit`
- **WorkPermitMethodStep** *(optional, page-2 table)*:
  `id, permit, step_text, possible_hazards, control_measures, + audit`

### 3.3 Reference lists (seed as masters/constants, not free text)
Keep hazards / PPE / precautions as **coded checklist options** so permits stay reportable.
Group them by task where the form does (Hot Work, Electrical, Height, Confined Space).
Store option catalogs in `src/modules/maintenance/constants/workPermit.constants.ts` (frontend
labels) mirroring the backend choices.

---

## 4. Frontend file layout (mirror Fire Reports)

```
src/modules/maintenance/
  types/workPermit.types.ts               # ← like fireReport.types.ts
  constants/workPermit.constants.ts        # hazard/PPE/precaution catalogs + labels
  api/workPermit.api.ts                    # ← like fireReport.api.ts
  api/workPermit.queries.ts                # react-query hooks
  api/index.ts                             # add exports
  pages/MaintenanceWorkPermitsPage.tsx     # list + filters (status/type/date)
  pages/MaintenanceWorkPermitDetailPage.tsx# wizard form + sign-off action bar
  components/WorkPermitDialogs.tsx          # create/edit dialog
  components/WorkPermitStatusBadge.tsx      # ← like WorkOrderStatusBadge.tsx
```

### Detail form = a wizard, not one long page
The form has too many sections for a single scroll. Reuse the step pattern already built in
`src/modules/gate/pages/maintenancePages/Step1Page.tsx`:

1. **Details** — validity, depts, job location/description, permit types
2. **Hazards & Control** — hazard checklist + method statement + attachments
3. **Isolations & PPE** — electrical/service/process isolation + PPE checklist
4. **Precautions** — task-grouped precautions checklist
5. **Workers** — section 16 list
6. **Review & Sign-off** — authorization matrix action buttons + status

---

## 5. API surface (`workPermit.api.ts`)

Copy the shape of `fireReport.api.ts` verbatim (including the `cleanFilters` helper).

```
getPermits(filters)            GET    EP.WORK_PERMITS
getPermit(id)                  GET    EP.WORK_PERMIT_DETAIL(id)
createPermit(payload)          POST   EP.WORK_PERMITS
updatePermit(id, payload)      PATCH  EP.WORK_PERMIT_DETAIL(id)
deletePermit(id)               DELETE EP.WORK_PERMIT_DETAIL(id)

# workflow actions (each stamps user+time on the server)
issuePermit(id)                POST   EP.WORK_PERMIT_ISSUE(id)
approvePermit(id, {role})      POST   EP.WORK_PERMIT_APPROVE(id)
acceptPermit(id, payload)      POST   EP.WORK_PERMIT_ACCEPT(id)
energizePermit(id, payload)    POST   EP.WORK_PERMIT_ENERGIZE(id)
completePermit(id, payload)    POST   EP.WORK_PERMIT_COMPLETE(id)
closePermit(id)                POST   EP.WORK_PERMIT_CLOSE(id)
cancelPermit(id, {reason})     POST   EP.WORK_PERMIT_CANCEL(id)

# children
createWorker / updateWorker / deleteWorker
uploadAttachment / deleteAttachment      # multipart/form-data like fire report photos
```
Add the matching endpoint constants under `API_ENDPOINTS.MAINTENANCE` in
`src/config/constants` (search for `FIRE_REPORTS` / `FIRE_REPORT_DETAIL` to see the shape).

---

## 6. Permissions

Add to `src/config/permissions/maintenance.permissions.ts`, modeled on the existing
`can_*_work_order` and `can_review_fire_report` keys:

```ts
VIEW_WORK_PERMIT:    'maintenance.can_view_work_permit',
MANAGE_WORK_PERMIT:  'maintenance.can_manage_work_permit',   // create/edit/delete draft
ISSUE_WORK_PERMIT:   'maintenance.can_issue_work_permit',
APPROVE_WORK_PERMIT: 'maintenance.can_approve_work_permit',  // authorization matrix
ACCEPT_WORK_PERMIT:  'maintenance.can_accept_work_permit',
CLOSE_WORK_PERMIT:   'maintenance.can_close_work_permit',
```
> If the four authorization roles (Issuer / Area Incharge / Safety Coordinator / Factory
> Manager) must be enforced separately, split `APPROVE_WORK_PERMIT` into per-role perms.
> Otherwise one approve permission + a `role` argument on the action is simpler.

---

## 7. Wiring checklist (the three known touch-points)

1. **`src/modules/maintenance/module.config.tsx`**
   - Add `const MaintenanceWorkPermitsPage = lazy(...)` and the detail page.
   - Add routes `/maintenance/work-permits` and `/maintenance/work-permits/:permitId`
     gated by `VIEW_WORK_PERMIT`.
   - Add the `VIEW_WORK_PERMIT` perm to the `/maintenance` hub route's `permissions[]`.
   - Add a `children` nav entry (icon suggestion: `ShieldCheck` or `FileCheck` from lucide).

2. **`src/modules/maintenance/pages/MaintenanceHubPage.tsx`**
   - Add a `SUB_MODULES` card: title "Work Permits", desc "Raise, approve and close
     permit-to-work for hazardous jobs.", `to: '/maintenance/work-permits'`, gated by
     `VIEW_WORK_PERMIT`.

3. **`src/config/permissions/maintenance.permissions.ts`** — add the keys from §6.

---

## 8. Backend (Django — `c:/Users/dev02/factory_app`)

Endpoints do **not** exist yet (this is a new form). Backend work required:
- Models: `WorkPermit`, `WorkPermitWorker`, `WorkPermitAttachment`
  (+ optional `WorkPermitMethodStep`) in the `maintenance` app.
- DRF serializers with nested read (workers/attachments) + `*_input` write serializers,
  matching the `FireShiftReport` serializer style.
- ViewSet with `@action` methods for each workflow transition (`issue`, `approve`, `accept`,
  `energize`, `complete`, `close`, `cancel`) that set status + stamp `user`/`timestamp` and
  enforce valid transitions.
- Custom permissions (`can_view_work_permit`, etc.) registered so they appear in the
  permissions/groups admin.
- Auto serial-no generation (`D-<seq>`), and a scheduled/lazy check to flip `ISSUED`→`EXPIRED`
  after the validity window (or 30-min no-start rule).

> Backend test/run commands: see the memory note *FactoryFlow backend location*
> (`c:/Users/dev02/factory_app`).

---

## 9. Testing (follow existing conventions)

Add tests mirroring `src/modules/maintenance/__tests__/maintenance.api.test.ts` and the
gate maintenance page tests:
- `workPermit.api.test.ts` — CRUD + each workflow action calls the right endpoint.
- `MaintenanceWorkPermitsPage.test.tsx` — list renders, filters work, permission gating.
- `MaintenanceWorkPermitDetailPage.test.tsx` — wizard steps, sign-off buttons hidden without
  the right permission, status badge.

---

## 10. Open decisions to confirm before coding

1. **Approval matrix** — one `APPROVE_WORK_PERMIT` perm with a role arg, or four separate
   role permissions enforced in order?
2. **Printing** — is a print/PDF export of the completed permit required (3 copies:
   Yellow/White/Red as noted on the form)? If yes, plan a print-friendly view.
3. **Method statement / rescue plans (page 2)** — capture as structured `WorkPermitMethodStep`
   rows, or just a free-text field + file attachment of the plan?
4. **Serial number** — global sequence or per-plant/per-department prefix?
5. **Bilingual labels** — the form has Hindi instructions; do checklist labels need Hindi too?
```
