# Returnable Items — Implementation Plan

**Status:** ✅ **Implemented** (2026-07-09). Backend `returnable_items` app: 15/15 tests pass. Frontend: 13/13 tests pass, zero type errors, lint clean.
**Date:** 2026-07-09
**Author:** Claude (analysis of `FactoryFlow` frontend + `factory_app` Django backend)

> **What changed from the plan during implementation**
> - The notification set grew from 6 to 9 (see §3.7). Added `RETURNABLE_DUE_TODAY` (fires on the expected return date, to **both** the gate and the department), `RETURNABLE_ACKNOWLEDGED` (department collected → gate stops holding the material) and `RETURNABLE_CANCELLED` (so a cancelled pass does not sit in the gate's queue forever).
> - `run_scheduler` replaces `run_work_permit_scheduler` as the recommended single scheduler process; it runs both the work-permit expiry job and the returnable due/overdue checks. The old command is untouched — **do not run both.**
> - `z.coerce.number()` could not be used in the zod schemas: coercion widens the input type to `unknown` and breaks `zodResolver`. Plain `z.number().nullable().optional()` instead.

---

## 1. What we are building

A **Returnable Gate Pass (RGP)** module. Items leave the factory gate temporarily — for repair, exchange, calibration, job work, warranty claim, demo — and are expected to come back. Today nothing in either codebase tracks this (I grepped `returnable` across the whole Django backend: zero matches). Items go out and are remembered in someone's head.

The module gives every outgoing item a numbered pass, a named party it went to, an expected return date, and a running quantity ledger of what has actually come back.

### The four-stage flow (as you described it)

1. **Department** fills the pass — what is going out, why, to whom, when it is expected back — and sends it to the gate.
2. **Gate Out** (`/gate/return-out`) — the gate operator fills in *their* details: which vehicle loaded the item, driver, transporter, security name. The gate approves, and the material physically leaves.
3. **Gate In** (`/gate/return-in`) — when the vehicle comes back, the gate operator checks the items against the pass, records how many came back and in what condition, and approves the vehicle in.
4. **Department closes** — the department physically collects the returned items from the gate, acknowledges receipt, and closes the entry.

Overdue passes (past their expected return date, still not fully back) are flagged automatically by a scheduled job and pushed as notifications.

### Confirmed decisions

| Question | Your answer |
|---|---|
| Approval before the gate sees it? | No separate approver. Department submits → gate out fills details and approves → gate in checks and approves → department collects and closes. |
| Partial / multiple returns? | Yes. Per-line `quantity_out` vs `quantity_returned`, multiple return trips per pass. |
| Overdue tracking? | Yes. `expected_return_date` + scheduled job + notifications. |

---

## 2. Where this fits in the existing code

I traced two existing features as reference patterns:

**Work Permit** (`maintenance` app) gives us the workflow scaffolding: a company-scoped header model on `BaseModel`, a `TextChoices` status machine, `@action` transition endpoints that stamp actor + timestamp, per-action DRF permission classes, `NotificationService.send_notification_by_permission(...)` on each transition, auth groups auto-created by a `post_migrate` signal, and an APScheduler job for the time-based transition (`expire_work_permits`).

**FireEquipmentIssue / FireEquipmentIssueItem** (`maintenance` app) is the closest thing to a returnable ledger that already exists: `quantity_issued` vs `quantity_returned`, `pending_return_qty`, `return_condition`, and a `refresh_status()` that derives ISSUED / PARTIALLY_RETURNED / RETURNED from the line totals. The RGP line model is a direct descendant of this.

Two other things I am borrowing:
- **`ArrivalGatepassSequence` / `SalesDispatchGatepassSequence`** (`gate_core`) — a financial-year sequence table using `transaction.atomic()` + `select_for_update()`. This is collision-safe. The more common `next_serial_no()` pattern used by WorkPermit (scan-for-last-row, increment) is **not** safe under concurrency, and gate operators create passes in bursts. We use the sequence table.
- **`VehicleDriverFormShell`** (`src/modules/gate/components/forms/`) — the existing reusable Vehicle Details + Driver Information form with typeahead select-or-create for vehicle/driver/transporter. The Gate Out screen reuses this wholesale rather than building a new vehicle form.

There is also precedent for a maintenance feature having gate-side screens: **Repair Movement** already does exactly this (`maintenance_gatein.MaintenanceGateEntry`, surfaced at `/gate/repair-parts-out` and `/gate/repair-parts-in`, with a cross-link from the maintenance sidebar). Returnable Items follows the same shape.

---

## 3. Backend design

### 3.1 New Django app: `returnable_items`

**Decision:** a new app rather than more code in `maintenance`. That app's `models.py` is already 1,935 lines and `views.py` is over 4,000. A new app gets its own migrations, its own permission sentinel, its own group signal, and its own URL root, with no risk of destabilising the work-order / spares / fire code. It imports `BaseModel` from `gate_core`, and `Vehicle` / `Driver` / `Company` as foreign keys.

Mounted at `/api/v1/returnable-items/` in `config/urls.py`, added to `INSTALLED_APPS`.

```
factory_app/returnable_items/
├── __init__.py
├── apps.py                  # ready() wires signals
├── constants.py             # all TextChoices
├── models.py
├── serializers.py
├── views.py
├── permissions.py
├── urls.py
├── signals.py               # post_migrate → ensure_returnable_groups
├── jobs.py                  # flag_overdue_returnables()
├── admin.py
├── tests.py
├── management/commands/
│   ├── flag_overdue_returnables.py
│   └── run_returnable_scheduler.py
└── migrations/0001_initial.py
```

### 3.2 Models

All extend `gate_core.models.BaseModel` (`created_at/updated_at/created_by/updated_by/is_active`) and carry a `company` FK on PROTECT, matching every other model in this codebase.

#### `ReturnableGatePassSequence`
Financial-year counter. `unique_together (company, financial_year)`, field `last_number`. Classmethod `next_pass_no(company)` wraps `transaction.atomic()` + `select_for_update()`. Produces `RGP/2025-26/000001`.

#### `ReturnableGatePass` — the header

| Group | Fields |
|---|---|
| Identity | `pass_no` (unique, from sequence), `company`, `status` |
| Raised by | `department` (FK `accounts.Department`), `requested_by_name`, `contact_no` |
| Why | `purpose` (choice), `purpose_detail` (text) |
| Where to | `party_name`, `party_contact`, `party_address`, `party_gstin` |
| When back | `expected_return_date` (date, **required**), `is_overdue` (bool), `overdue_notified_at` |
| Optional links | `asset` (FK `maintenance.Asset`), `work_order` (FK `maintenance.MaintenanceWorkOrder`) |
| Gate-out block *(filled by gate)* | `vehicle` (FK), `driver` (FK), `transporter` (FK), `vehicle_number_manual`, `driver_name_manual`, `driver_mobile`, `security_name`, `out_remarks` |
| Lifecycle stamps | `submitted_by/at`, `gate_out_by/at`, `last_return_at`, `closed_by/at`, `cancelled_by/at`, `cancel_reason`, `rejected_reason`, `short_close_reason` |

Indexes on `(company, status)` and `(company, expected_return_date)`.

Properties: `total_estimated_value`, `pending_return_qty`, `days_overdue`, `is_fully_returned`.
Method: `refresh_status()` — derives `OUT` / `PARTIALLY_RETURNED` / `RETURNED` from the line totals, exactly as `FireEquipmentIssue.refresh_status()` does.

#### `ReturnableGatePassItem` — the line
`gate_pass` FK (`related_name="items"`), `line_num` with `UniqueConstraint(gate_pass, line_num)` — same constraint style as `BSTGateOutItem` / `SalesDispatchGateOutItem`.

`item_code`, `item_name`, `description`, `serial_no`, `make_model`, optional `spare` FK (`maintenance.MaintenanceSpare`), optional `asset` FK, `uom`, `quantity_out` (Decimal 14,3, min 0.001), `quantity_returned` (Decimal, default 0), `condition_out` (choice), `estimated_value`, `remarks`.

Properties: `pending_return_qty = quantity_out - quantity_returned`, `is_fully_returned`.

#### `ReturnableReturnEvent` — one return trip
A pass can have several. `gate_pass` FK (`related_name="return_events"`), `event_no` (1, 2, 3…), `event_ref` (`RGP/2025-26/000001-R1`), `returned_at`, vehicle/driver/transporter FKs + manual fallbacks, `security_name`, `verified_by` + `verified_at` (the gate user who approved), `acknowledged_by` + `acknowledged_at` (the department user who collected), `remarks`.

#### `ReturnableReturnEventItem`
`event` FK (`related_name="lines"`), `pass_item` FK, `quantity_returned`, `return_condition` (choice), `remarks`.

**Invariant, enforced in the serializer and re-checked in the model:** for any `pass_item`, the sum of `quantity_returned` across all its event lines must never exceed `pass_item.quantity_out`. Over-return is a 400, not a silent clamp.

#### `ReturnableGatePassAttachment`
`gate_pass` FK, `file`, `doc_type` (CHALLAN / PHOTO / INVOICE / OTHER), `caption`.

#### `ReturnableGatePassLog` — the timeline
The backend has **no** `django-simple-history` and no audit-log model; audit today is just `created_by` / `updated_by` plus per-transition stamped fields. For a document that leaves the premises, a real timeline is worth having. `gate_pass` FK, `action` (choice), `actor` FK, `at`, `note`, `meta` (JSON). Written on every transition. Drives the timeline widget in the UI.

### 3.3 Status machine

```
                          ┌──────────── reject-at-gate (reason) ────────────┐
                          ▼                                                 │
  DRAFT ──submit──▶ PENDING_GATE_OUT ──gate-out──▶ OUT ──────────────────────┘
                                                    │
                                       record-return (partial)
                                                    │
                                                    ▼
                                          PARTIALLY_RETURNED
                                                    │
                                       record-return (last line closes)
                                                    ▼
                                                RETURNED ──close──▶ CLOSED
                                                    ▲                  ▲
                                                    │                  │
                                                    └── OUT ──record-return (full) ──┘
                                                                       │
  {DRAFT, PENDING_GATE_OUT, OUT, PARTIALLY_RETURNED} ──cancel──▶ CANCELLED
  {OUT, PARTIALLY_RETURNED} ──short-close (reason, elevated perm)──▶ CLOSED
```

Two deliberate choices here:

**Overdue is a flag, not a status.** `is_overdue` is a boolean set by the scheduled job. A pass that is overdue is still `OUT` or `PARTIALLY_RETURNED` — the physical reality has not changed, only the clock. This keeps the status machine clean and means "overdue" composes with every status filter instead of hiding the real one.

**The gate cannot silently change quantities.** If what arrives at the gate does not match what the department wrote on the pass, the gate operator hits **Reject** with a reason. Status returns to `DRAFT`, the creator is notified, the department fixes and resubmits. Letting the gate edit `quantity_out` would make the document unauditable.

**`short-close`** exists because reality intrudes: the vendor scraps the motor and it never comes back. Elevated permission, mandatory reason, writes a log entry, closes the pass with unreturned quantity intact so the report still shows what was lost.

### 3.4 Dept acknowledgement vs close

Gate-in approval marks quantities as returned and physically at the gate. The department then collects. `acknowledge` stamps `acknowledged_by/at` on the **return event** — so if there are three return trips, the department acknowledges each one. `close` is allowed only when the pass is `RETURNED` and every return event is acknowledged. This is precisely the "when returnable items depart are collect then close the entry" step you described.

### 3.5 Permissions

Sentinel model `ReturnablePermission(managed=False)` in `models.py`, mirroring `MaintenancePermission`.

| Codename | Held by |
|---|---|
| `can_view_returnable_module` | everyone in the module |
| `can_view_returnable_gatepass` | everyone |
| `can_manage_returnable_gatepass` | department (create / edit / delete DRAFT) |
| `can_submit_returnable_gatepass` | department |
| `can_gate_out_returnable` | gate |
| `can_gate_in_returnable` | gate |
| `can_reject_returnable_at_gate` | gate |
| `can_acknowledge_returnable` | department |
| `can_close_returnable` | department |
| `can_cancel_returnable` | department |
| `can_short_close_returnable` | admin / head only |
| `can_view_returnable_reports` | department + admin |

Groups auto-provisioned by `signals.py::ensure_returnable_groups` on `post_migrate` (same mechanism as `ensure_maintenance_groups`), from a `RETURNABLE_ROLE_PERMISSIONS` dict:
`returnable_admin` (all), `returnable_department`, `returnable_gate`, `returnable_viewer`.

DRF classes in `permissions.py` reuse the `DjangoPermission` / `AnyDjangoPermission` base shape from `maintenance/permissions.py`. Company context comes from the `Company-Code` header via `HasCompanyContext`, as everywhere else.

### 3.6 API surface

Root `/api/v1/returnable-items/`. `ReturnableGatePassViewSet` extends the existing `CompanyScopedViewSet` pattern.

| Method | Path | Permission |
|---|---|---|
| CRUD | `returnable-gatepasses/` | view / manage |
| POST | `{id}/submit/` | `can_submit_returnable_gatepass` |
| POST | `{id}/gate-out/` | `can_gate_out_returnable` |
| POST | `{id}/reject-at-gate/` | `can_reject_returnable_at_gate` |
| POST | `{id}/record-return/` | `can_gate_in_returnable` |
| POST | `{id}/acknowledge/` | `can_acknowledge_returnable` |
| POST | `{id}/close/` | `can_close_returnable` |
| POST | `{id}/short-close/` | `can_short_close_returnable` |
| POST | `{id}/cancel/` | `can_cancel_returnable` |
| GET | `{id}/timeline/` | view |
| GET | `pending-gate-out/` | `can_gate_out_returnable` |
| GET | `pending-gate-in/` | `can_gate_in_returnable` |
| — | `returnable-gatepass-items/`, `returnable-return-events/`, `returnable-attachments/` | child routers |
| GET | `dashboard/` | view |
| GET | `reports/` | `can_view_returnable_reports` |
| GET | `options/` | view |

List filters: `status`, `purpose`, `department`, `party`, `overdue=true`, `expected_return_from` / `_to`, `q` (searches `pass_no`, `party_name`, `item_name`, `serial_no`). Filter cleaning drops empty / `ALL` values, matching `cleanFilters()` on the frontend.

`gate-out` body: `vehicle_id` or `vehicle_number_manual`, `driver_id` or `driver_name_manual` + `driver_mobile`, `transporter_id`, `security_name`, `out_remarks`.
`record-return` body: vehicle/driver of the returning vehicle, `security_name`, `remarks`, and `lines: [{pass_item_id, quantity_returned, return_condition, remarks}]`.

### 3.7 Notifications

Nine members on `notifications.NotificationType`, all fanned out from `returnable_items/notifications.py`. Every one carries `reference_type='returnable_gatepass'` and `reference_id=pass.id`, plus a `click_action_url` pointing at *the screen that recipient needs* — department users land on `/maintenance/returnable/{id}`, gate-out users on `/gate/return-out/{id}`, gate-in users on `/gate/return-in/{id}`.

The rule: **every transition notifies the other side of the handoff**, so nobody has to poll a list to discover that work has arrived.

| Type | Fires when | Who hears about it |
|---|---|---|
| `RETURNABLE_SUBMITTED` | Department sends the pass to the gate | **The gate** (holders of `can_gate_out_returnable`) |
| `RETURNABLE_GATE_OUT` | Vehicle physically leaves | **The department** (pass creator) |
| `RETURNABLE_REJECTED_AT_GATE` | Gate finds a mismatch and bounces it | The department (creator) |
| `RETURNABLE_RETURN_RECORDED` | Gate accepts a return trip | The creator **and** everyone with `can_acknowledge_returnable` — go collect it |
| `RETURNABLE_ACKNOWLEDGED` | Department collects from the gate | The gate (`can_gate_in_returnable`) — stop holding the material |
| `RETURNABLE_DUE_TODAY` | Expected return date arrives, items still out | **Gate and department, both.** The gate expects a vehicle; the department chases the vendor |
| `RETURNABLE_OVERDUE` | Past the expected date, still out | Creator + gate + `returnable_admin` group |
| `RETURNABLE_CLOSED` | Pass closed or short-closed | The creator |
| `RETURNABLE_CANCELLED` | Pass cancelled | Both gate queues — otherwise it sits there forever |

The three time-based ones (`DUE_TODAY`, `OVERDUE`) are guarded by `due_notified_at` / `overdue_notified_at`, so each pass is notified at most once per event no matter how often the job runs.

Notification failures are swallowed and logged, never rolling back the transition that triggered them — the same contract `maintenance/jobs.py` follows for work-permit expiry.

### 3.8 Scheduled jobs

`returnable_items/jobs.py` holds two idempotent checks:

- **`notify_due_returnables()`** — `status in (OUT, PARTIALLY_RETURNED)`, `expected_return_date == today`, `due_notified_at IS NULL`. Notifies the gate and the department, writes a `DUE_TODAY` timeline row, stamps `due_notified_at`.
- **`flag_overdue_returnables()`** — same statuses, `expected_return_date < today`, `overdue_notified_at IS NULL`. Sets `is_overdue=True`, writes an `OVERDUE_FLAGGED` timeline row, notifies, stamps `overdue_notified_at`.

`run_returnable_checks()` runs both in the order a day actually unfolds.

**Commands:**
- `python manage.py check_returnable_items` — one-shot, cron / Windows Task Scheduler friendly.
- `python manage.py run_scheduler` — the recommended long-running process. APScheduler `BlockingScheduler` + `DjangoJobStore`, registering **both** `expire_work_permits` (every `WORK_PERMIT_EXPIRY_INTERVAL_MINUTES`, default 5) and `check_returnable_items` (every `RETURNABLE_CHECK_INTERVAL_MINUTES`, default 60).

> ⚠️ **Deployment note.** `run_scheduler` supersedes `run_work_permit_scheduler`. The old command still exists for back-compat, but **do not run both** — each job is registered once, in `run_scheduler`. As with work permits today, if nobody starts the process, the due-today and overdue notifications simply never fire.

---

## 4. Frontend design

### 4.1 Shared layer

| File | Contents |
|---|---|
| `src/config/permissions/returnable.permissions.ts` | `RETURNABLE_PERMISSIONS` map + `RETURNABLE_MODULE_PREFIX = 'returnable_items'`; exported from the barrel |
| `src/config/constants/api.constants.ts` | new `API_ENDPOINTS.RETURNABLE` block |
| `src/modules/maintenance/types/returnableGatePass.types.ts` | `ReturnableGatePass`, `ReturnableGatePassItem`, `ReturnableReturnEvent`, status/purpose/condition unions, payload + filter interfaces |
| `src/modules/maintenance/api/returnableGatePass.api.ts` | axios client on `apiClient`, with the `cleanFilters()` helper |
| `src/modules/maintenance/api/returnableGatePass.queries.ts` | `RETURNABLE_QUERY_KEYS`, `useReturnableGatePasses(filters)`, `useReturnableGatePass(id)`, one mutation hook per transition, shared `invalidateReturnables()` |
| `src/modules/maintenance/constants/returnable.constants.ts` | purpose / condition option lists, status labels + badge colours |
| `src/modules/maintenance/schemas/returnable.schema.ts` | zod schemas |
| `src/modules/gate/api/returnable/index.ts` | thin barrel re-exporting the maintenance queries, so gate pages import in gate style |

The API client lives under `maintenance/` because the department owns the document; the gate module re-exports it. Cross-module imports already exist in both directions (the maintenance sidebar links into `/gate/*` today), so this introduces no new coupling.

**Forms use `react-hook-form` + `zod` + `zodResolver`**, the canonical pattern (as in `CreateVehicleDialog`), not the raw `useState` style that `MaintenanceWorkPermitsPage` happens to use.

### 4.2 Department screens — maintenance module

| Route | Page | Permission |
|---|---|---|
| `/maintenance/returnable` | `MaintenanceReturnablePage.tsx` | `VIEW_RETURNABLE_GATEPASS` |
| `/maintenance/returnable/:passId` | `MaintenanceReturnableDetailPage.tsx` | `VIEW_RETURNABLE_GATEPASS` |

**List page:** `DashboardHeader` + `SummaryCard` tiles (Draft, Pending Gate Out, Out, Partially Returned, **Overdue** in red, Closed) + filter card (search, status, purpose, date range, overdue toggle) + the standard `<table>` inside `overflow-x-auto rounded-md border`. Server-side filtering via query params. "New Returnable Pass" button gated on `MANAGE_RETURNABLE_GATEPASS`.

**Detail page:** header card, item table showing **out / returned / pending** per line, return-events accordion (one card per trip with its lines and conditions), attachments, `ReturnableTimeline`, and status-and-permission-gated action buttons.

New components in `src/modules/maintenance/components/returnable/`:
`ReturnableFormDialog.tsx` (with `useFieldArray` for dynamic item lines), `ReturnableStatusBadge.tsx`, `ReturnableTimeline.tsx`, `AcknowledgeDialog.tsx`, `ShortCloseDialog.tsx`, `ReturnableItemsTable.tsx`.

### 4.3 Gate screens — gate module

You wrote these as `gate/return_out` and `gate_return_in`. Every route in this codebase is kebab-case (`/gate/repair-parts-out`), so: **`/gate/return-out`** and **`/gate/return-in`**.

New folder `src/modules/gate/pages/returnablePages/`:

| Route | Page | Does |
|---|---|---|
| `/gate/return-out` | `ReturnOutListPage.tsx` | Queue of `PENDING_GATE_OUT` passes |
| `/gate/return-out/:passId` | `ReturnOutFormPage.tsx` | Reuses **`VehicleDriverFormShell`** for vehicle + driver + transporter capture, shows the item list read-only for physical verification, then **Approve & Gate Out** or **Reject** (reason required) |
| `/gate/return-in` | `ReturnInListPage.tsx` | Queue of `OUT` + `PARTIALLY_RETURNED`, overdue rows highlighted, sorted by expected return date |
| `/gate/return-in/:passId` | `ReturnInFormPage.tsx` | Vehicle details of the **returning** vehicle + an editable per-line grid (`quantity_returned`, `return_condition`, remarks) pre-filled with pending quantity, then **Approve Return** |

Gate permissions added to `GATE_PERMISSIONS` as a `RETURNABLE` block (`VIEW`, `GATE_OUT`, `GATE_IN`, `REJECT`), pointing at the `returnable_items.*` codenames — exactly how the existing `REPAIR_MOVEMENT` block points at `maintenance_gatein.*`.

### 4.4 Navigation

- `maintenance/module.config.tsx` — nav item **Returnable Items** → `/maintenance/returnable`; plus cross-links **Returnable Gate Out** / **Returnable Gate In**, matching the existing "Gate Material In" / "Repair Movement" cross-links.
- `gate/module.config.tsx` — routes + submenu entries **Returnable Out** / **Returnable In**.
- `MaintenanceHubPage.tsx` — a new card.

### 4.5 Printing and scanning

The physical pass travels with the vehicle. `ReturnableGatePassPrint.tsx` uses `react-to-print` (already used by `SalesDispatchGatepassPrint`) and embeds a **QR code of the `pass_no`** via `qrcode.react`.

At return, the gate operator scans that QR with the existing `html5-qrcode` scanner (`src/modules/barcode/hooks/useScanner.ts`) and lands straight on `/gate/return-in/:passId`. No typing a pass number at a busy gate. A server-side PDF (`services/returnable_gatepass_pdf.py`, following `sales_dispatch_gatepass_pdf.py`) is the fallback for reprints.

---

## 5. Reports

`GET /api/v1/returnable-items/reports/?type=…`, CSV + XLSX export:

- **Register** — all passes in a date range, filterable by status / party / department.
- **Overdue & ageing** — buckets 0–7, 8–15, 16–30, 30+ days past `expected_return_date`. The report that justifies the module.
- **Party-wise pending** — how much material is sitting with each vendor right now.
- **Item-wise pending** — which items are out, and for how long.

---

## 6. Testing

**Backend** (`returnable_items/tests.py`, `python manage.py test returnable_items`, `APITestCase` with the `Company-Code` header):
full lifecycle happy path; partial return across two events with correct arithmetic; over-return rejected with 400; reject-at-gate returns to DRAFT and notifies; close blocked while any event is unacknowledged; short-close requires the elevated permission and a reason; overdue job is idempotent across repeated runs; sequence generation under concurrent creates; company scoping — company A cannot read company B's passes.

**Frontend** (vitest, `src/modules/maintenance/__tests__/`): status badge mapping, item field-array validation, pending-quantity arithmetic, permission gating of action buttons.

---

## 7. What shipped

### Backend — `c:/Users/dev02/factory_app/returnable_items/`
`constants.py` · `models.py` · `serializers.py` · `views.py` · `permissions.py` · `urls.py` · `signals.py` · `notifications.py` · `jobs.py` · `admin.py` · `apps.py` · `tests.py` · `migrations/0001_initial.py` · `management/commands/{check_returnable_items,run_scheduler}.py`

Also touched: `config/settings.py` (INSTALLED_APPS), `config/urls.py` (`/api/v1/returnable-items/`), `notifications/models.py` (+9 `NotificationType` members, migration `0012`).

### Frontend — `c:/Users/dev02/FactoryFlow/src/`
- `config/permissions/returnable.permissions.ts` (+ barrel, + `GATE_PERMISSIONS.RETURNABLE`)
- `config/constants/api.constants.ts` → `API_ENDPOINTS.RETURNABLE`
- `modules/maintenance/types/returnableGatePass.types.ts`
- `modules/maintenance/api/returnableGatePass.{api,queries}.ts`
- `modules/maintenance/constants/returnable.constants.ts`, `schemas/returnable.schema.ts`
- `modules/maintenance/components/returnable/` — `ReturnableFormDialog`, `ReturnableReasonDialog`, `ReturnableStatusBadge`, `ReturnableTimeline`
- `modules/maintenance/pages/MaintenanceReturnable{,Detail}Page.tsx`
- `modules/gate/api/returnable/index.ts` (re-export barrel)
- `modules/gate/components/returnable/` — `ReturnableVehicleFields`, `returnableVehicleForm`
- `modules/gate/pages/returnablePages/` — `ReturnOut{List,Form}Page`, `ReturnIn{List,Form}Page`
- Nav + routes in both `module.config.tsx` files, card on `MaintenanceHubPage`
- `modules/maintenance/__tests__/returnable.test.tsx`

### Deferred (not built)
Reports UI page, gate-pass PDF/print, and the QR-scan-to-return-in shortcut described in §4.5. The `reports/` and `dashboard/` API endpoints exist and are tested-adjacent; nothing consumes them yet.

---

## 8. Decisions I made on your behalf — please confirm or override

1. **New Django app `returnable_items`** rather than growing `maintenance/models.py` (already 1,935 lines) and `views.py` (4,000+).
2. **Routes are kebab-case** — `/gate/return-out`, `/gate/return-in` — to match every other route in the app, not the `return_out` / `gate_return_in` spelling in your message.
3. **The gate cannot edit quantities.** Mismatch at the gate means **Reject with a reason**, back to the department. Preserves auditability.
4. **Overdue is a boolean flag, not a status.** Composes with status filters instead of masking them.
5. **`short-close`** added for items that legitimately never return (scrapped by vendor). Elevated permission, mandatory reason.
6. **FY sequence table** (`RGP/2025-26/000001`) with `select_for_update`, not the unsafe scan-last-row numbering WorkPermit uses.
7. **Department acknowledges each return event**, and `close` is blocked until all events are acknowledged — this is your "when returnable items depart are collect then close the entry" step made explicit.
8. **`department` is an FK to `accounts.Department`**, not the maintenance-local `AssetDepartment`. Say the word if RGPs should be scoped to maintenance departments only.
9. **Non-returnable gate passes are out of scope.** The schema leaves room (`purpose` choices, and a future `is_returnable` flag) but nothing is built for it now.
10. **Scheduler consolidation** (§3.8) — I suggest folding the overdue job into the existing work-permit scheduler process rather than running a second one.

---

## 9. Open question

**Does the returning vehicle have to be the same vehicle that took the items out?** In practice it usually is not — the vendor sends their own vehicle back. The plan assumes **no constraint**: the return event captures its own vehicle/driver independently. If you want a warning (not a block) when the returning vehicle differs from the outgoing one, that is a small addition to `ReturnInFormPage`.

---

**Nothing will be implemented until you approve this document.**
