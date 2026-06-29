# Casual-Labour Daily Count & Gate Verification — Implementation Plan

> Status: **Planned** (not yet implemented). Drafted 2026-06-23.
> Backend: `factory_app` (Django). Frontend: `FactoryFlow` (React/TS).
> Reference artifact: [`docs/fORMAT.xlsx`](./fORMAT.xlsx) — the manual register this feature digitizes.

## 1. Background & problem

The factory receives ~50–100 **casual daily-wage labourers** per day from nearby villages. They are never permanent and come through **informal contractors / mukadams**. Crucially, **the factory pays the contractor, and the contractor pays the workers** — so the factory needs **no per-worker payroll or identity**, only **counts per contractor**.

The current `person_gatein` system models individual labourers (`Labour` master + per-person `EntryLog` gate-in/out). Registering 50–100 fresh people every day is far too heavy and is the wrong tool for casual labour.

### What `fORMAT.xlsx` actually is

A **man-day register**: 18 sheets = 6 months × 3 sheets (`Canola`, `Wheat Grass`, `Total Labour`). Every sheet is the same grid:

- **Rows = dates** (1–31); Sundays/holidays left blank or marked `holiday`.
- **Columns = contractors** (Gaurav, SVK, Nheem, Vikas, Gaurav Kundli, Imran, Anup, Harvinder, …), each split **Day / Night**, plus a **Company** column (own regular workforce) and a daily **TOTAL**.
- **Each cell = a headcount** — no names.
- **Bottom row = monthly man-days per contractor** = the basis for that contractor's bill.
- `Total Labour` = `Canola` + `Wheat Grass` (roll-up, excludes the own-workforce Company column).

This confirms the contractor-pays model and tells us exactly what to build: a digital version of this grid.

## 2. Concept

Two roles share one record per **(department, date, shift)**:

- **Department supervisor** maintains today's count grid (contractor → headcount), submits it, and can pull it back to edit until a lock time. If not submitted, it **auto-submits at the lock time**.
- **Gate operator** sees only *submitted* counts, filters by department / contractor / both, does a physical head-count, **enters his counted number**, and marks it **OK**. Tallying at any one level (a department, a contractor, or the grand total) is sufficient and cascades the OK.

## 3. Locked decisions

1. **Department unit = `accounts.Department`** — the existing global master (`name`, `description`; endpoint `/accounts/departments/`, `DepartmentListView`). Already used by `daily_needs_gatein.receiving_department` and maintenance, and already wired on the frontend (`useDepartments()` hook + `DepartmentSelect.tsx`). No new master; not `ProductionLine`.
2. **Gate operator enters his physically-counted number** on verify (variance vs the submitted count is computed and flagged) — not a binary OK.
3. **Night labour is physically counted by the night security guard at 07:00**; the 09:00 gate operator records/finalizes the OK. Night gate-count is a real number; the night verify window stays open until 09:00. (The night guard must also hold the verify permission.)

## 4. Shift timing & state machine

| Shift | Hours | Dept edit + pull-back until | Auto-submit & hard-lock | Gate "OK" window |
|---|---|---|---|---|
| **Day** | 07:00–19:00 | **18:30** | **18:30** | submission → ~19:00 (labour exits) |
| **Night** | 19:00 → **07:00 next day** | **06:30 next day** | **06:30 next day** | submission → **09:00 next day** (gate arrives) |

All four times are **configurable per company** (defaults IST), not hard-coded.

**Night-shift date rule:** a night sheet's `work_date` = the date the shift *starts* (the 19:00 date), exactly like the Excel row. Its lock is `work_date + 1 @ 06:30`; its verify deadline is `work_date + 1 @ 09:00`.

**Sheet status flow:**

```
DRAFT  ──submit (manual, anytime)──►  SUBMITTED  ──gate OK──►  VERIFIED
  ▲                                      │
  └──────── pull-back (only while now < lock_at) ──────────────┘

At lock_at: any DRAFT-with-data → SUBMITTED (auto_submitted=true); pull-back disabled.
HOLIDAY / "no labour today" is an explicit flag so the gate knows it wasn't forgotten.
```

**Robustness — dual lock** so correctness never depends on the cron firing on time:
- (a) submit/edit/pull-back endpoints reject any write where `now ≥ lock_at` (HTTP 409);
- (b) the APScheduler job *materializes* the transition (DRAFT→SUBMITTED, stamps `auto_submitted`, notifies the gate).

## 5. Backend (`factory_app`) — new app `labour_count`

Mirrors `person_gatein` conventions: `models.py`, `serializers.py`, `views.py`, `urls.py`, `services/`, `permissions.py`, plus a scheduler management command. Register in `config/settings.py` `INSTALLED_APPS`.

### Models (inherit `gate_core.BaseModel` → `created_at/by`, `updated_at/by`, `is_active`)

```python
class LabourShift(TextChoices):  DAY = "DAY"; NIGHT = "NIGHT"
class SheetStatus(TextChoices):  DRAFT; SUBMITTED; VERIFIED
class VerifyBasis(TextChoices):  TOTAL; DEPARTMENT; CONTRACTOR

class LabourCountSheet(BaseModel):
    company      = FK(Company, PROTECT)
    department   = FK("accounts.Department", PROTECT)   # existing master
    work_date    = DateField()                          # NIGHT = shift-start date
    shift        = CharField(choices=LabourShift)
    status       = CharField(default=DRAFT)
    is_holiday   = BooleanField(default=False)
    lock_at      = DateTimeField()                      # computed 18:30 / next-06:30
    submitted_at, submitted_by, auto_submitted
    # verification:
    verified, verified_at, verified_by
    gate_counted = PositiveIntegerField(null=True)      # gate's physical count
    verify_basis = CharField(blank=True)
    verify_remark= TextField(blank=True)
    class Meta: unique_together = ("company", "department", "work_date", "shift")

class LabourCountItem(BaseModel):
    sheet      = FK(LabourCountSheet, related_name="items", CASCADE)
    contractor = FK("person_gatein.Contractor", PROTECT)
    count      = PositiveIntegerField(default=0)
    class Meta: unique_together = ("sheet", "contractor")

class LabourVerification(BaseModel):       # audit of HOW the gate tallied
    company, work_date, shift
    basis        = CharField(choices=VerifyBasis)        # TOTAL / DEPARTMENT / CONTRACTOR
    department   = FK("accounts.Department", null=True)  # set when basis=DEPARTMENT
    contractor   = FK("person_gatein.Contractor", null=True)  # set when basis=CONTRACTOR
    submitted_total, gate_counted, variance              # variance = counted − submitted
    # created_by/at = who OK'd & when

class LabourShiftWindow(BaseModel):        # editable timings per company
    company, shift, submit_lock_time, verify_deadline_time
    # defaults: DAY 18:30/19:00, NIGHT 06:30/09:00

# Optional (later phase): DepartmentMembership(user, company, department)
# to auto-scope a supervisor to their department(s).
```

**Verification semantics ("tally any level is enough"):** the gate OK can be applied at one department-sheet, one contractor-across-departments for the day, or the grand total. OK at a coarser scope **cascades** `verified=True` to every covered sheet and writes one `LabourVerification` audit row (basis, counted number, variance).

### Scheduler — `labour_count/management/commands/run_labour_count_scheduler.py`

Follows the existing `sales_planning_requirement` / `stock_dashboard` APScheduler pattern (the project uses **django-apscheduler, not Celery**; `TIME_ZONE = Asia/Kolkata`, `USE_TZ = True`):

```python
CronTrigger(hour="6,18", minute=30, timezone="Asia/Kolkata")
# 18:30 → lock today's DAY sheets;  06:30 → lock yesterday's NIGHT sheets.
# Sweep: any sheet with now ≥ lock_at still DRAFT → SUBMITTED. Notify gate (notifications app).
```

### Permissions (migration)

- `labour_count.can_submit_labour_count` → Department Supervisor role
- `labour_count.can_verify_labour_count` → Gate Security / Gate Supervisor role (incl. the night guard)
- `labour_count.view_labourcountsheet`

All views also use `IsAuthenticated` + `HasCompanyContext` (reads the `Company-Code` header, attaches `request.company`).

### Endpoints (service-layer + APIView, like `production_execution`)

**Department:**
- `GET  /labour-count/sheet/?date=&shift=&department=` — fetch/ensure today's sheet + items + status + `lock_at` (dashboard payload)
- `PUT  /labour-count/sheet/{id}/items` — bulk upsert counts (only while editable)
- `POST /labour-count/sheet/{id}/submit` · `/pull-back` · `/holiday`
- `GET  /labour-count/sheet/history/?department=&from=&to=` — trend for the dashboard

**Gate:**
- `GET  /labour-count/gate/board/?date=&shift=&company=&department=&contractor=` — submitted sheets + aggregates (by department, by contractor, grand total)
- `POST /labour-count/gate/verify` — `{basis, date, shift, department?, contractor?, gate_counted, remark}` → computes variance, cascades `verified`

## 6. Frontend (`FactoryFlow`) — under the gate module

**Department page** — `src/modules/gate/pages/labourPages/LabourCountPage.tsx`:
- Header: `DepartmentSelect` + date + Day/Night toggle.
- **Dashboard**: status chip (Draft / Submitted / Verified), live **countdown to auto-submit**, small history strip (last N days' totals).
- **Count grid**: one row per active contractor (from `personGateInApi`), number input per count; "Add contractor" for a new roster face; running total. Reuses `ContractorLaboursPage` table styling.
- Actions: **Submit**, **Pull back** (only while `now < lock_at`), **Mark holiday**; `sonner` toasts; inputs read-only after lock.

**Gate verification page** — `src/modules/gate/pages/labourVerification/LabourVerificationPage.tsx`:
- Date + Day/Night selector; **view toggle: By Department / By Contractor / Both** (matrix).
- Board shows *submitted* counts with row/column/grand totals; un-submitted departments shown as "Not submitted".
- Gate enters his counted number at whichever scope he tallied and hits **OK** (row / column / grand-total); variance highlighted; OK cascades. NIGHT board stays actionable until 09:00.

**Wiring:** lazy routes + sidebar nav in `module.config.tsx` gated by the new permission strings added to `src/config/permissions/gate.permissions.ts`; two api domains `api/labour/` and `api/labourVerification/`, each `*.api.ts` + `*.queries.ts`; Zod schemas in `schemas/`. Reuse `useDepartments()` + `DepartmentSelect`. Conventions: shadcn/ui + `sonner` + react-query; `apiClient` injects the `Company-Code` header.

## 7. Phasing

1. **Backend core** — app, models/migrations, department endpoints (fetch/edit/submit/pull-back/holiday), lock guards.
2. **Auto-submit** — APScheduler command + `LabourShiftWindow` config + gate notification.
3. **Department page** — grid, dashboard, countdown, submit/pull-back.
4. **Gate board + verify** — filters, tally-any-level OK with counted number + variance.
5. **Reports** — monthly man-days per contractor (the Excel's bottom row), then optional `DepartmentMembership` auto-scoping and a config UI for the times.

## 8. Open / deferred items

- No user→department link exists today; v1 lets a permitted supervisor pick their department via `DepartmentSelect`. `DepartmentMembership` (auto-scope/restrict) is deferred to Phase 5.
- `accounts.Department` is global (not company-scoped); tenant scoping comes from the sheet's `company` FK (same pattern as `daily_needs`).
- The Excel's per-product-line split (Canola / Wheat Grass) is reconstructable only if those exist as departments in the master; otherwise product-line attribution is a separate, later concern.
