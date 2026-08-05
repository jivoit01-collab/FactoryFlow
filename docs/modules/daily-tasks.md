# Daily Tasks

Every user's job sheet for one day: what they are responsible for, what they have already
recorded today, and what is still open. Plus a supervisor board covering all users.

- `/daily-tasks` — My daily tasks (needs `activity_center.can_view_my_activities`)
- `/daily-tasks/team` — All users (needs `activity_center.can_view_all_activities`)
- Stepping the board back to earlier days additionally needs `can_view_activity_reports`

Backend: the `activity_center` Django app. The job catalogue is `activity_center/registry.py`;
the day-scoped endpoints are `activity_center/daily.py`.

---

## The two axes

The design rests on keeping these separate. Conflating them is the mistake to avoid.

**Cadence** — how often a job is expected. Describes the job itself.

| Cadence | Meaning | Counted? |
|---|---|---|
| `DAILY` | Expected on a normal working day | yes |
| `SHIFT` | Expected once for each shift worked | yes |
| `EVENT` | Only exists when something triggers it — a vehicle arrives, a machine breaks | no |
| `PERIODIC` | Master data and settings; only when something changes | no |

**Countable** — whether the system can *observe* the job being done, i.e. whether the record
stores who acted (`actor_field` + `actor_date_field`). Roughly two thirds of the catalogue does.

```
tally = jobs where cadence ∈ {DAILY, SHIFT} AND countable
shown = every in-scope job, grouped by cadence, uncountable ones flagged "Not tracked"
```

A job can be `SHIFT` and uncountable — "Complete the production run at shift end" is exactly
that. It belongs in the shift section where the operator looks for it, marked as not tracked.
Filing it under `EVENT` because we cannot observe it would hide it from the person whose job
it is.

`PERIODIC` is currently empty. Every registry row is transactional; the periodic jobs in the
original job-sheet PDF are master-data screens the registry does not model. The bucket is kept
so the vocabulary matches the PDF and master-data rows can be added later. Do not "fix" the
emptiness by reclassifying transactional rows into it.

---

## Design constraints

These are decisions, not omissions. Please read before adding to this module.

### 1. Nothing here is a score

There is no attendance, shift or roster data anywhere in the backend — `attendance.Employee`
and `AttendanceRecord` are empty, there is no user→department mapping, and "shift" is a free-text
label with three incompatible enums across apps. **We cannot tell an idle day from a day off.**

Consequently:

- No percentage, no progress ring, no compliance figure, no ranking.
- Nothing is labelled *missed*, *overdue* or *non-compliant*. The wording is *Not yet today*.
- Un-done jobs are never red and never carry a warning icon. Red would accuse someone of
  something we have no evidence for.
- The API ships no score field, and its default sort is name ascending — sorting by "did least"
  would make the payload itself a shame list.
- Ageing (`oldest_pending_days`) is the one amber signal, and only past a week. It describes a
  record, not a person.

### 2. Show, don't score

Uncountable jobs are shown, with their pending count and a working link, but never tallied.
`done_today` and `last_done_at` come back as `null` — never `0` — precisely so the UI can render
*Not tracked* instead of a zero that reads as failure. If you touch the serializers, keep
`allow_null=True`; a `default=0` there would silently turn "we cannot see this" into "you did
nothing".

The honesty notice (`NotTrackedNotice`) is deliberately inline and always visible on both pages.
Do not move it into a tooltip, a collapsible or a "learn more" link.

### 3. Nothing is ticked by hand

Completion is derived from records other modules write. There is no manual tick-box and no
mutation endpoint — that is what makes the numbers worth anything. A self-tick would make the
sheet unfalsifiable.

### 4. No sidebar badge

The natural badge number is "not yet", and a standing red pill next to *Daily Tasks* is exactly
the punitive nag constraint 1 rules out — a user with a legitimately quiet day would carry it all
day. The alternative, a pending-record count, needs a poll of an expensive endpoint every 30s per
user for a number nobody can act on from the sidebar. If a live signal is ever wanted, the right
shape is a neutral dot, not a count.

Several of these constraints are enforced by assertions in
`src/modules/daily-tasks/__tests__/module.config.test.tsx` — a failure there means the contract
was weakened, not that the test is stale.

---

## Known limitations, disclosed in the UI

- **Superusers** hold every permission, so their expected counts are inflated. They are tagged
  `admin` and muted rather than hidden — hiding users is its own kind of dishonesty.
- **Some jobs are not company-scoped** and are counted in every company. Stated under the board.
- **Users with no group** get an empty sheet. The message points at fixing their access, not at
  them having nothing to do.

---

## Frontend layout

```
src/modules/daily-tasks/
├── module.config.tsx     routes + nav (no badge, no modulePrefix — see above)
├── api/                  apiClient calls + React Query hooks (read-only, no mutations)
├── types/                mirrors the backend serializers
├── constants/            cadence display metadata, stale times
├── utils/                local-day helpers (never toISOString — it shifts the day in IST)
├── components/
│   ├── DailyJobRow       ← the three states; where "show, don't score" lives
│   ├── NotTrackedNotice  ← the honesty block
│   ├── CadenceSection, DailySheetStats, DailyTasksDateNav
│   └── TeamBoardTable, TeamBoardFilters
└── pages/                MyDailyTasksPage, TeamDailyTasksPage
```

The nav item gates on the two explicit permissions rather than `modulePrefix`, because the
`activity_center` prefix also matches `can_view_activity_reports` — a user holding only that
would see the menu but be unable to open either page.

---

## Cadence assignments

Cadence is a judgement call derived from what each stage means, not from operational data.
Expect the plant to correct some of it. Because cadence only drives grouping and never scoring,
a wrong assignment is cosmetic.

| Registry group | Default | Exceptions |
|---|---|---|
| Work orders | DAILY | `wo_submit_draft` → EVENT |
| Work permits | DAILY | `wp_submit_draft`, `wp_accept` → EVENT; `wp_close` → SHIFT |
| Indents | DAILY | `mi_submit_draft` → EVENT |
| PM / Fire & safety | — | `pm_execute`, `pm_finish` → DAILY; `fire_report_review` → SHIFT; `safety_fine_settle`, `fire_equipment_return` → EVENT |
| Quality control | DAILY | `qc_slip_submit`, `qc_slip_rejected` → EVENT; `qc_prod_submit` → SHIFT |
| Production / Blowing | SHIFT | the four waste sign-offs → DAILY |
| Returnable items | EVENT | `rgp_approve`, `rgp_close` → DAILY |
| Warehouse | DAILY | `fg_receive` → SHIFT; the four BST movement stages → EVENT |
| Dispatch | EVENT | `dock_partial_approve`, `dock_skip_approve` → DAILY |
| Barcode | — | `bc_scan`, `bc_complete` → EVENT; `bc_close`, `bc_sap_retry` → DAILY |

---

## Not in v1

Per-user drill-down from the board; CSV/PDF export; a job-catalogue page; trend charts, week
views and streaks (each becomes a score by implication); notifications and nudges; any
attendance or roster integration.
