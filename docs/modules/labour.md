# Labour — Frontend (React / Vite)

> Screens for casual-labour headcount, gate in/out, department allocation, and
> the daily-count register.
>
> **Paired backend doc:** [`factory_app/labour_count/docs/README.md`](../../../factory_app/labour_count/docs/README.md)
> (absolute: `C:/Users/gurpa/dev/factory_app/labour_count/docs/README.md`)

---

## Overview — what it does & who uses it

The Labour frontend is **thin and reuses gate screens**. The top-level
`src/modules/labour/` folder contains only `module.config.tsx` — one route
(`/labour`) and one sidebar entry. Every actual screen lives under
`src/modules/gate/pages/`, because Labour reuses the gate's masters
(`Contractor`, `Department`) and API clients.

There are **five screens**, backed by **two backend apps** (`labour_gate` for
the live in/out tally + allocation, `labour_count` for the man-day register —
see the paired backend doc for the domain model):

| Screen (component) | Route | Backend app | User |
|--------------------|-------|-------------|------|
| **Labour** allocation (`LabourModulePage`) | `/labour` | `labour_gate` | HOD |
| **Labour In** (`GateLabourInPage`) | `/gate/labour-in` | `labour_gate` | Gate person |
| **Labour Out** (`LabourOutPage`) | `/gate/labour-out` | `labour_gate` | Gate person |
| **Daily Labour** count (`LabourCountPage`) | `/gate/labour` | `labour_count` | Dept supervisor |
| **Labour Verification** board (`LabourGatePage`) | `/gate/labour/verify` | `labour_count` | Gate operator |

Only `/labour` is a first-class **sidebar** item (icon `Users`). The four
`/gate/labour*` screens are **not** in the sidebar tree — they are reached from
the **Gate Dashboard** (`GateDashboardPage`): the two count screens appear as
"Labour" tools, and Labour In / Labour Out appear as Gate-In / Gate-Out entry
tiles (`constants/gateEntryTypes.ts`). Any of them is also reachable by direct
URL if the user holds the permission.

**No scanning, no offline queue.** These screens are pure typed-number entry
(React Query + toasts). There is no barcode/QR scanner and no offline mutation
buffer here — a failed call simply rejects and shows a toast.

---

## Key concepts & entities (frontend view)

- **Gate intake** = a `LabourGateEntry` with `department == null` (owned by the
  Labour In screen). **Allocation split** = an entry with `department` set
  (owned by the Labour module). Both carry `count_in`, `total_out`, `remaining`,
  `out_batches`, soft-delete flags, and grace-window flags
  (`can_undo_last`, `can_restore`). Types: `api/labourGate/labourGate.api.ts`.
- **Count sheet** = a `LabourCountSheet` (`DRAFT` → `SUBMITTED` → `VERIFIED`,
  `is_holiday`, `lock_at`, `total_count`, `gate_counted`, `variance`,
  `remaining`, `is_editable`, `can_pull_back`). Type:
  `api/labourCount/labourCount.api.ts`.
- **Shift** = `'DAY' | 'NIGHT'`. Everything on every screen is filtered
  **client-side** by the selected shift; day and night are separate tallies.
- **Contractor / Department masters** come from the gate module
  (`api/personGateIn`, `components/DepartmentSelect`).

---

## End-to-end flows (user journeys)

### 1. Daily Labour count — supervisor (`LabourCountPage`, `/gate/labour`)

1. Pick **Department + Date + Shift**. On any change, `useEnsureLabourSheet`
   get-or-creates the sheet and loads its items into the grid.
2. The status bar shows a badge (DRAFT/SUBMITTED/VERIFIED or **Holiday**) and a
   **live lock countdown** ("Auto-submits in 2h 15m (at 18:30)"), re-rendered
   once a minute.
3. Type a count per contractor (grid of all active contractors). Inputs are
   **disabled** unless `sheet.is_editable` (DRAFT and before lock).
4. **Save Draft** (`useSaveLabourItems`), **Submit** (saves then
   `useSubmitLabourSheet`), or **Mark Holiday** (`useHolidayLabourSheet`).
   **Pull Back** appears while `can_pull_back` (SUBMITTED, before lock).
5. Once the gate starts marking out, the bar also shows **Submitted / Out so far
   / Left**; after finalize it shows **Out (gate) / Variance** (green if 0,
   amber otherwise).

### 2. Gate verification board — gate operator (`LabourGatePage`, `/gate/labour/verify`)

1. Pick **Date + Shift** → `useLabourBoard` lists all SUBMITTED/VERIFIED
   department sheets for the shift.
2. Grand-total headline: **Submitted / Out so far / Variance**, plus
   "N/M departments finalized".
3. **By Department** (actionable): per department, type how many just left and
   **Out** (`useMarkOutLabour`), **Undo** the last batch, or **Finalize**
   (`useFinalizeLabour`). Finalized rows show a variance chip + **Re-open**
   (`useReopenLabour`). **By Contractor** is a read-only reference tally.

### 3. Labour In — gate person (`GateLabourInPage`, `/gate/labour-in`)

1. Pick **Shift + Date** (shift defaults by time of day — see §Shift logic).
   `useLabourGateDay(date)` fetches the whole day; the page keeps only
   department-less rows for the selected shift.
2. Summary: **In / Out / Inside** + progress bar.
3. Select a contractor (or **Add contractor** inline) and a count → **Add**
   (`useRecordLabourIn`). Rows are colour-coded: **green** all still in,
   **yellow** partially out, **red** all out. Edit a count inline
   (`useUpdateLabourIn`) or delete (`useRemoveLabourIn`, blocked once anyone is
   marked out).

### 4. Labour module (HOD allocation) — (`LabourModulePage`, `/labour`)

1. Pick **Shift + Date**. Progressive form: choose a **Department first**, then a
   **Contractor + count**.
2. The contractor dropdown lists **only contractors that still have labour
   inside the gate this shift** (`department==null && remaining>0`); empty text
   is "No contractors with labour still inside".
3. A live hint shows **entered / used / left** for the selected contractor. On
   **Add** (`useRecordLabourIn` with a `department`), if the split would exceed
   what's left, a **"Not enough labour left"** dialog shows entered/used/left/
   attempted (from a client pre-check *and* the backend 400 payload).
4. Allocations are grouped into a **department accordion** (edit / delete /
   history per row) with a total-allocated headline. Soft-deleted rows appear in
   a **Deleted** section with **Undo** while `can_restore` (10-min window).
5. **History** (per entry) opens `LabourHistoryDialog` → `useLabourEntryAudit`
   (the append-only backend audit trail, colour-dotted by action).

### 5. Labour Out — gate person (`LabourOutPage`, `/gate/labour-out`)

1. Pick **Shift + Date**. Summary **In / Out / Inside** turns green when all
   cleared.
2. **Allocation Breakdown** (read-only, from the Labour module): toggle **By
   Department** / **By Contractor**; the contractor view flags any
   `unallocated` remainder.
3. Select a contractor with labour inside and a count → **Out**
   (`useAddLabourOut`, ≤ remaining). The **Out Log** table lists every batch
   newest-first with **Undo** on the most recent (within the 10-min window via
   `can_undo_last`).

---

## Critical business rules & invariants (as enforced/echoed in the UI)

- **Permission gates decide visibility** (see §Permissions). A user without the
  permission never sees the route or the dashboard tile; direct navigation is
  blocked by the route guard.
- **Shift filtering is client-side.** `useLabourGateDay` returns the whole day
  (both shifts, active + soft-deleted); each page filters by `e.shift === shift`
  and by kind (`department == null` vs set). Picking the wrong shift shows an
  empty or partial screen even though data exists.
- **Allocation ≤ intake** is enforced twice: an eager client check
  (`entered − used`) and the backend 400. The dialog reads whichever fires.
- **Grace windows (10 min)** for undo-out and restore are surfaced as
  `can_undo_last` / `can_restore`; the buttons disappear once false, and a late
  call is rejected by the backend.
- **Lock/editability** is driven by server flags `is_editable` / `can_pull_back`
  on the sheet — the client never computes lock time itself (it only *displays*
  a countdown from `lock_at`).
- **Register vs gate tally are separate.** The count register (`/gate/labour`,
  `/gate/labour/verify`) and the gate tally (`/gate/labour-in`,
  `/gate/labour-out`, `/labour`) do not share state; marking out on one does not
  change the other.

---

## State, data & offline behaviour

- **React Query** (`@tanstack/react-query`) throughout. Query keys:
  `['labourGateDay', date]`, `['labourGateAudit', id]`, `['labourHistory',
  params]`, `['labourBoard', params]`. Mutations call `mutateAsync` then
  `toast`, and `invalidateQueries` the relevant key to refetch.
- **No optimistic updates** — the UI waits for the server, so a slow network
  shows a disabled/busy button until the response lands.
- **No offline persistence / no scan queue.** If the request fails (offline,
  500, 4xx), the mutation rejects and a toast appears; nothing is buffered for
  retry. The operator must re-tap after connectivity returns.
- **Live clock:** `LabourCountPage` runs a 60-second interval to keep the lock
  countdown fresh (`setNow(Date.now())`).
- **Local date/shift defaults:** `todayLocal()` seeds the date; see below for
  shift.

### Shift toggle & default-shift logic (a real subtlety)

- `ShiftToggle` (`labourShared.tsx`) is the Day/Night pill used by the three
  **`labour_gate`** screens (`LabourModulePage`, `GateLabourInPage`,
  `LabourOutPage`). Those seed their shift from **`defaultShift()`**
  (`labourUtils.ts`): **Day 06:00–17:59, Night otherwise** — so at 8pm the gate
  screens open on Night.
- The two **`labour_count`** screens (`LabourCountPage`, `LabourGatePage`) use a
  plain two-button Day/Night selector and **hard-code the initial shift to
  `'DAY'`** — they do **not** call `defaultShift()`. So the register/verify
  screens always open on **Day** regardless of the clock; an operator working a
  night shift must switch manually or the sheet/board looks empty.
- Consequence for NIGHT: the sheet's `work_date` is the shift-*start* date and
  its lock/verify fall the next morning (backend `services/lock.py`). Filtering
  the board by "tomorrow" shows nothing until you select the start date.

---

## Integrations & cross-module boundaries

- **Reuses the gate module** entirely: `api/personGateIn` (contractors),
  `components/DepartmentSelect`, `components/CreateContractorDialog`,
  `SearchableSelect`. Contractors can be created inline from the In / allocation
  screens.
- **No SAP, no scanner, no weighbridge** on any Labour screen.
- **Company context** is implicit (the shared `apiClient` sends the active
  company). Switching company blanks the screens for the day — data is scoped
  server-side (see the backend doc's cross-company note).
- **Permission source of truth:** `config/permissions/labour.permissions.ts`
  (`LABOUR_PERMISSIONS`) and `config/permissions/gate.permissions.ts`
  (`GATE_PERMISSIONS.LABOUR_GATE` / `.LABOUR_COUNT`) map to the same Django
  codenames.

---

## Real-world edge cases

Each: **trigger → current behaviour → what the operator sees → risk/gap.**

1. **HOD over-allocates across departments.** Trigger: split > intake left for
   the shift. Behaviour: the **"Not enough labour left"** dialog (entered / used
   / left / attempted); nothing saved. Risk: if the gate later *reduces* the
   intake below what's already split, the UI does not re-flag the now-excess
   allocations (backend doesn't re-validate either).

2. **Delete a gate intake row after someone left.** Trigger: trash icon on a row
   with out batches. Behaviour: toast **"Could not delete (labour already marked
   out)"** (backend 409). Row stays. Risk: none — intentional.

3. **Undo/Restore after 10 minutes.** Trigger: the grace window elapsed.
   Behaviour: the **Undo/Restore button is gone** (`can_undo_last` /
   `can_restore` are false); a stale click that slips through gets a backend
   409 toast. Risk: corrections older than 10 min need admin/DB intervention.

4. **Wrong shift selected.** Trigger: gate screen defaults to Night at 8pm but
   the labour is logged under Day (or the count screens sit on Day during a
   night shift). Behaviour: the list looks **empty / partial** though data
   exists on the other shift. Symptom: "my labour disappeared". Risk: the two
   screen families default shift differently (see §Shift logic) — a common
   confusion.

5. **Night-shift date filter.** Trigger: operator filters the board by "today"
   (the calendar day *after* a night shift started). Behaviour: nothing shows
   until they pick the shift-start date. Risk: counts look missing.

6. **Empty draft never submitted.** Trigger: a supervisor opens a sheet but
   enters nothing and doesn't mark holiday, then the lock passes. Behaviour:
   inputs become read-only; the auto-submit job skips empty drafts, so the sheet
   never appears on the gate board. Symptom: the department is silently absent
   at verification with no warning.

7. **Submit with no data.** Trigger: **Submit** on an empty, non-holiday sheet.
   Behaviour: backend 400 → toast **"Could not submit"**. The operator must add
   a count or **Mark Holiday**.

8. **Edit a count below what already left.** Trigger: lower `count_in` below
   `total_out`. Behaviour: toast **"Could not update (less than already marked
   out?)"** (backend 400). Nothing changes.

9. **Pull back after lock.** Trigger: try to pull a submission back once locked.
   Behaviour: the **Pull Back** button is hidden; a late call → toast **"Could
   not pull back (past the lock time?)"**. Risk: post-lock fixes need the gate
   to reopen, or admin.

10. **Non-zero variance at finalize.** Trigger: gate out total ≠ submitted.
    Behaviour: finalize succeeds; an **amber variance chip** (`+3` / `−2`)
    shows. Risk: nothing forces reconciliation — the gap is only visible on the
    board and in backend `LabourVerification`.

11. **Re-open then re-finalize.** Trigger: **Re-open** a verified department,
    mark more out, finalize again. Behaviour: works and keeps the running out
    count; but the backend writes a **second** verification record. Risk:
    double-counted verification history in downstream reports.

12. **Double bookkeeping of exits.** Trigger: the same people are marked out on
    both the count board (`/gate/labour/verify`) and the gate Labour-Out
    (`/gate/labour-out`). Behaviour: both succeed independently; no cross-check.
    Symptom: the register and the gate tally disagree later. Risk: the biggest
    data-quality gap — the two families are not reconciled.

13. **Company switch mid-task.** Trigger: user changes active company.
    Behaviour: every list refetches scoped to the new company and goes **blank**
    for the day. Risk: looks like data loss; it's just out of scope.

14. **Contractor deactivated.** Trigger: a contractor is set inactive.
    Behaviour: it drops out of the Add/Select dropdowns (rosters filter to
    active); existing rows still edit/out fine. Symptom: "I can't find the
    contractor to add".

---

## Failure modes / what an operator or manager notices

- **Missing permission** → the screen/tile isn't shown at all (route guard); a
  bookmarked URL redirects/blocks. Managers: "the new gate user can't see
  Labour In" usually means the `can_record_labour_in` permission (or group)
  wasn't granted.
- **Backend down / offline** → the button spins then a toast like *"Could not
  save labour in"*, *"Could not mark out"*, *"Failed to load the labour sheet"*.
  Nothing is queued; retry after reconnect.
- **Auto-submit scheduler not running (server-side)** → supervisors "did the
  count" but the **verification board is empty** at shift end, because those
  sheets are still DRAFT and now past lock (read-only). This is a backend
  process issue (see the paired doc), visible only as absence on the board.
- **Stale React Query cache** is avoided by per-mutation `invalidateQueries`;
  if a second operator changes the same day, a manual refresh (or the next
  mutation) reconciles — there is no websocket/live sync.

---

## Improvement opportunities & known gaps

- Align default-shift behaviour across the count screens and the gate screens
  (edge case 4), or persist the last-used shift.
- Surface a warning for empty DRAFT sheets before lock (edge case 6).
- Reconcile or merge the two "out" flows so the register and gate tally cannot
  diverge (edge case 12).
- Live sync (websocket / polling) for multi-operator gate boards.
- The frontend labour folder has no tests of its own; the reused gate screens
  are covered under `modules/gate/__tests__` (persongatein), not these pages.

---

## Permissions & roles (nav gating)

Codenames from `config/permissions/labour.permissions.ts` &
`gate.permissions.ts` (they mirror the Django perms):

| Constant | Django codename | Role | Unlocks |
|----------|-----------------|------|---------|
| `LABOUR_PERMISSIONS.VIEW` | `labour_gate.view_labourgateentry` | any labour role | reading gate entries |
| `LABOUR_PERMISSIONS.IN` / `LABOUR_GATE.RECORD_IN` | `labour_gate.can_record_labour_in` | Gate person | Labour In tile + screen |
| `LABOUR_PERMISSIONS.OUT` / `LABOUR_GATE.RECORD_OUT` | `labour_gate.can_record_labour_out` | Gate person | Labour Out tile + screen |
| `LABOUR_PERMISSIONS.ALLOCATE` / `LABOUR_GATE.ALLOCATE` | `labour_gate.can_allocate_labour_department` | HOD | `/labour` allocation |
| `LABOUR_COUNT.SUBMIT` | `labour_count.can_submit_labour_count` | Dept supervisor | Daily Labour (`/gate/labour`) |
| `LABOUR_COUNT.VERIFY` | `labour_count.can_verify_labour_count` | Gate operator | Labour Verification (`/gate/labour/verify`) |

Nav gating specifics (worth knowing when "a whole screen is missing"):

- **`/labour` sidebar entry** (`modules/labour/module.config.tsx`) is gated on
  **`[ALLOCATE, VIEW]`** — holding *either* lights it up. This is why an HOD
  (allocate) *and* a plain viewer both see the Labour module.
- **Labour In / Labour Out tiles** (`constants/gateEntryTypes.ts`) are gated on
  **`RECORD_IN` / `RECORD_OUT` only** — `VIEW` is deliberately **excluded** so
  that an HOD (who holds `VIEW` to reach `/labour`) does **not** accidentally
  trip the gate In/Out tiles. The *routes* themselves accept `RECORD_* OR VIEW`.
- **Daily Labour / Labour Verification** dashboard tools
  (`GateDashboardPage.GATE_TOOLS`) are gated on `LABOUR_COUNT.SUBMIT` /
  `LABOUR_COUNT.VERIFY` respectively.
- None of the four `/gate/labour*` screens are in the gate **sidebar** submenu —
  they are dashboard-tile + direct-URL only. Changing a user's **group** (e.g.
  the `labour` HOD group) rather than individual perms is the usual lever; see
  the memory note "Group perms vs frontend nav gating".

---

## Developer file map

**Frontend — module & pages:**
- `src/modules/labour/module.config.tsx` — `/labour` route + sidebar entry
  (gated `[ALLOCATE, VIEW]`).
- `src/modules/gate/pages/labourGatePages/LabourModulePage.tsx` — HOD allocation
  (rendered at `/labour`).
- `src/modules/gate/pages/labourGatePages/GateLabourInPage.tsx` — gate intake.
- `src/modules/gate/pages/labourGatePages/LabourOutPage.tsx` — gate mark-out +
  allocation breakdown.
- `src/modules/gate/pages/labourGatePages/LabourHistoryDialog.tsx` — per-entry
  audit timeline.
- `src/modules/gate/pages/labourGatePages/labourShared.tsx` — `ShiftToggle`,
  `ProgressBar`, `AuditLine`, `SummaryStat`.
- `src/modules/gate/pages/labourGatePages/labourUtils.ts` — `todayLocal`,
  `defaultShift`, `fmtTime`, `fmtDateTime`, `pctOf`.
- `src/modules/gate/pages/labourPages/LabourCountPage.tsx` — register (supervisor).
- `src/modules/gate/pages/labourPages/LabourGatePage.tsx` — verification board.

**Frontend — API & config:**
- `src/modules/gate/api/labourGate/labourGate.api.ts` + `.queries.ts` — gate
  in/out/allocation endpoints & hooks.
- `src/modules/gate/api/labourCount/labourCount.api.ts` + `.queries.ts` — count
  sheet & gate-board endpoints & hooks.
- `src/config/permissions/labour.permissions.ts`,
  `src/config/permissions/gate.permissions.ts` — permission constants.
- `src/modules/gate/constants/gateEntryTypes.ts` — Labour In/Out dashboard tiles.
- `src/modules/gate/pages/GateDashboardPage.tsx` — Daily Labour / Labour
  Verification tools + In/Out tiles.

---

## Related docs

- **Paired backend doc:** `C:/Users/gurpa/dev/factory_app/labour_count/docs/README.md`
- Gate module: `C:/Users/gurpa/dev/FactoryFlow/docs/modules/gate.md`
