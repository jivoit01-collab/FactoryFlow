# Two HOD Dashboards — Plan

> **Status:** Plan only. No code in this document.
> **Goal:** Split FactoryFlow's data across two role-owned dashboards, one per HOD, so each
> HOD answers "am I on track / where is it stuck / who is holding it" on one screen, and can
> export the evidence as a report without opening ten pages.

---

## 1. The split

The app's data divides cleanly along the **physical flow of material**. That is the split to
use — not "by module", because a module boundary is an engineering artefact and an HOD does
not own a module, they own a stretch of the flow.

```
   ┌──────────────── BOARD 1 · HOD-A ─────────────────┐
   │  PLAN  →  BUY  →  STOCK  →  PRODUCE              │
   │  OFCT/FCT1   PO    BH-PM/BS/PC     BH-PF         │
   └──────────────────────────────────┬───────────────┘
                                      │
                              ╔═══════▼═══════╗
                              ║   B S T       ║   ← the baton
                              ║ the hand-over ║      (on BOTH boards)
                              ╚═══════┬═══════╝
                                      │
   ┌──────────────────────────────────▼───────────────┐
   │  STORE  →  TRANSFER  →  PLAN  →  DISPATCH        │
   │  BH-FG/GP-FG  *-INT     bills     gate out       │
   └──────────────── BOARD 2 · HOD-B ─────────────────┘
                                      │
                                      ▼
                                  CUSTOMER
```

| | **Board 1 — Plan → Produce** | **Board 2 — Store → Deliver** |
|---|---|---|
| Owner | Supply-chain / Production HOD | Warehouse / Dispatch HOD |
| Question | *Can we make the plan, did we make it, what did it cost* | *Did it get stored, moved and shipped, what is stuck* |
| Modules | planning-purchase, sales-planning-requirement, stock-level, non-moving, production-execution, blowing, production-movement, GRPO, BOM requests | BST (in/out), warehouse transfer requests, FG stock, dispatch plans / pipeline / fulfilment / tracking, gate sales-dispatch, docking approvals, transporter |
| Warehouses | BH-PM, BH-BS, **BH-PC**, BH-PF, BH-WST, BH-LO | BH-PF (hand-over), BH-FG, GP-FG, BH-EC, `*-INT`, branch warehouses |

**BST sits on both boards on purpose.** It is the hand-over point, so both HODs see the same
entries through a different question:

- Board 1 asks **"did my output leave my hands?"** — entries still `DRAFT`/`SCANNING` at the
  producing end, short scans waiting on a partial-transfer approval, hand-over lag.
- Board 2 asks **"what is arriving and what must I receive today?"** — `IN_TRANSIT`,
  `AWAITING_GATE_IN`, `ARRIVED`, `RECEIVING`, and putaway.

That gives one number both HODs are measured on: **hand-over lag** — produced (`BH-PF`) →
BST created → gated out → received. It is the only metric that makes the two boards agree
rather than argue.

```
        HOD-A owns this ──────┐        ┌────── HOD-B owns this
                              ▼        ▼
  produced ──► BST created ──► gated out ──► in transit ──► received
   BH-PF        DRAFT/SCANNING   GATED_OUT     IN_TRANSIT     RECEIVED
     └──── lag A ────┘└─ lag B ─┘└──── lag C ────┘└─ lag D ─┘
              ▲                                        ▲
        HOD-A answers for A+B                 HOD-B answers for C+D
```

> **Assumption to confirm.** "BST (BH-PC)" is read here as **Branch Stock Transfer**, the
> `warehouse/bst/` module, with `BH-PC`/`BH-PF` naming the factory side of the move. If you
> meant instead *material issued into `BH-PC`* (the production-consumption warehouse — SAP
> `OINM` TransType 67 In-Qty), that is already the **PC Issue** node on the flow strip of
> Board 1 and needs no separate panel. See §11.

---

## 2. What already exists (reuse, do not rebuild)

Roughly 80% of the numbers below already have a working endpoint. This project is
**composition + two exception views + one report builder**, not new analytics.

| Need | Already there |
|---|---|
| Plan, requirement, producible, POs | `/planning-purchase/plans/...` — `PlanHeader.attainment_pct`, `RequirementMeta.shortage_count`, `ProducibleSku.covers_plan` |
| Forecast vs stock vs open PO | `/dashboards/sales-planning-requirement/report/` (already a materialised table + scheduler) |
| Stock vs benchmark | `/dashboards/stock/` + `/export/` |
| Dead stock | `/non-moving-rm/report/` |
| Output, OEE, downtime, waste, cost | `/production-execution/reports/analytics/*` |
| Warehouse position (opening/in/out/closing) | `/production-execution/reports/production-movement/` + `POSITION_WAREHOUSES` |
| Dispatched / backlog / trend / by customer | `/dispatch-plans/dashboard/summary/` + `/bills/` |
| Vehicle stage board | `/dispatch-plans/pipeline/` |
| BST + transfer requests | `/warehouse/bst/...`, `/warehouse/transfer-requests/...` including `/reconcile/` |
| Post-dispatch tracking | `/gate-core/dispatch-tracking/summary/` |
| UI primitives | `src/shared/components/dashboard/` (`SummaryCard`, `StatusOverviewGrid`, `KpiStat`, `accents.ts`), `recharts`, `xlsx` |
| Wall behaviour | `dashboards/dispatch/hooks/` (`useFullscreen`, `useAutoScroll`, `useNow`, day anchor with midnight roll-over + auto-return) |
| SAP-down handling | `dashboards/components/SAPUnavailableBanner.tsx` |

---

## 3. Screen anatomy (same for both boards)

Both boards use one layout so an HOD who learns one can read the other.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  HEADER    Plan → Produce   ·  JIVO OIL  ·  1–6 Sep  ·  [L ▾]  ·  ⟳ 60s  · ⛶  │
├────────────────────────────────────────────────────────────────────────────────┤
│  ZONE 1 · ANSWER ROW                                                            │
│  ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐                  │
│  │  86 %  ││ 4 SKU  ││ ₹18.2L ││  7 !   ││ 42.1kL ││ 2.4 %  │  each tile:      │
│  │attain- ││ can't  ││shortage││critical││ output ││ waste  │  value           │
│  │ ment   ││  run   ││  value ││ stock  ││ today  ││        │  + vs yesterday  │
│  │ ▲ 4pp  ││ ▼ 2    ││ ▲ ₹3L  ││ ▬ 0    ││ ▲ 8 %  ││ ▼0.3pp │  + click-through │
│  └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘                  │
├────────────────────────────────────────────────────────────────────────────────┤
│  ZONE 2 · FLOW STRIP        the physical chain, one node per warehouse          │
│   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌─────────┐                      │
│   │BH-PM │──►│BH-BS │──►│BH-PC │──►│BH-PF │──►│ BST out │                      │
│   │ 12.4k│   │  8.1k│   │ 41.9k│   │ 40.2k│   │  6 open │                      │
│   │      │   │      │   │ ▲ 3d │   │      │   │  2 late │   ▲ = piling up      │
│   └──────┘   └──────┘   └──▲───┘   └──────┘   └─────────┘   (3 days rising)    │
├───────────────────────────────────────────┬────────────────────────────────────┤
│  ZONE 3 · EXCEPTION QUEUES                │  ZONE 4 · TREND + BREAKDOWN        │
│  ┌───────────────────────────────────┐    │   plan vs produced, 14 days        │
│  │ Shortages to order          12 ●  │    │   ▁▃▅█▆▄▅█▇▅▃▄▆█                   │
│  │ ├ OVERDUE      3   ₹6.1L    ›     │    │   ─── waste %  (right axis)        │
│  │ ├ ORDER NOW    5   ₹8.4L    ›     │    │                                    │
│  │ └ NO LEAD TIME 4   ₹3.7L    ›     │    │   output by line   ▓▓▓▓▓▓░░        │
│  ├───────────────────────────────────┤    │   downtime pareto  ▓▓▓▓░░░░        │
│  │ POs not moving               4 ●  │    │   shortage by vendor ▓▓▓░░         │
│  │ Dead capital            ₹9.8L     │    │                                    │
│  │ Blocking next run            2 ●  │    │                                    │
│  │ Hand-over not done           6 ●  │    │                                    │
│  └───────────────────────────────────┘    │                                    │
├───────────────────────────────────────────┴────────────────────────────────────┤
│  ZONE 5 · REPORT      filters in scope  →  [ Build report ⤓ ]  multi-sheet XLSX │
└────────────────────────────────────────────────────────────────────────────────┘
```

Two rules that make it an HOD screen rather than a report page:

1. **Every panel is a variance or an exception, never a raw count.** A HOD does not need
   "142 transfers"; they need "6 transfers stuck > 24 h, ₹18 L". Raw lists stay in the
   existing module pages, one click away.
2. **Ranked by consequence.** Every queue sorts by age or by value, worst first, and shows
   its own count so a queue that is empty is visibly empty rather than absent.

---

## 4. Board 1 — **Plan → Produce**

Route `/dashboards/plan-to-produce` · permission `hod_dashboards.can_view_plan_produce_board`

### Zone 1 — Answer row

| # | Tile | Reads | Source |
|---|---|---|---|
| 1 | **Plan attainment** MTD | `planned_litres` vs `produced_litres`, `attainment_pct` | `GET /planning-purchase/plans/{absId}/` |
| 2 | **Can we run tomorrow** | count of plan SKUs with `covers_plan === false`; top `limited_by` component named on the tile | `.../plans/{absId}/producible/` |
| 3 | **Material shortage** | `shortage_count` split PM/RM, `estimated_purchase_value`; sub-chip `no_lead_time_count` (the reference-data gap nobody owns) | `.../plans/{absId}/requirement/` |
| 4 | **Stock health** | `critical_stock_count` / `low_stock_count` / `total_items`, scoped to `BH-BS, BH-PM, BH-PC` (the existing default) | `/dashboards/stock/` |
| 5 | **Today's output & yield** | output in litres/cases, yield %, plus the App-vs-SAP `BH-PF` reconciliation state | production board hooks + `/reports/yield/` |
| 6 | **Waste % & cost/litre** | waste % and conversion cost, with the existing **RM/PM include-material switch** so months compare on conversion cost only | `/reports/analytics/waste/`, `/costs/analytics/` |

### Zone 2 — Flow strip (the make chain)

Reuse `PRODUCTION_FLOW_ROUTES` and `POSITION_WAREHOUSES` verbatim:

```
  BH-PM  ──►  BH-BS  ──►  BH-PC  ──►  BH-PF  ──►  [ BST out ]
 PM store    basement    PC issue    produced      hand-over
    │           │           │           │              │
    └─ opening + received − issued = closing ──────────┘
       (one bar per node, amber when closing rises 3 days straight)
```

Each node shows **opening + received − issued = closing** for the range, from
`/production-execution/reports/production-movement/`. A node turns amber when its closing
balance grows for 3 consecutive days — that is material piling up, and it is the single most
useful thing on this board because it localises the blockage to one warehouse.

### Zone 3 — Exception queues

| Queue | Ranked by | Source |
|---|---|---|
| **Shortages to order** | `urgency`: `OVERDUE` → `ORDER_NOW` → `NO_LEAD_TIME` → `SCHEDULED`; then `estimated_value` | requirement rows |
| **POs not moving** | `status_counts`: `FAILED` first (a failed SAP post stalls the whole chain), then `DRAFT` age, then `APPROVED` unposted | `/planning-purchase/purchase-orders/` |
| **Dead capital** | non-moving RM value, top items by value × age | `/non-moving-rm/report/` |
| **Blocking the next run** | line clearance pending + machine checklists pending | `/production-execution/line-clearance/`, `/machine-checklists/` |
| **Waste approvals** | pending at engineer / AM / store / HOD — shows *which* signature is missing | `/production-execution/waste/` |
| **Store owes production** | BOM requests approved but not issued, by age | `/warehouse/bom-requests/` |
| **Hand-over not done** | BST in `DRAFT`/`SCANNING` > 4 h; short scans awaiting partial-transfer approval | `/warehouse/bst/`, `/warehouse/bst/partial-transfers/` |

### Zone 4 — Trend + breakdown

- 14/30-day bars: **planned vs produced litres**, waste % on the right axis.
- Breakdowns: output by line, downtime Pareto by cause, shortage value by vendor.

---

## 5. Board 2 — **Store → Deliver**

Route `/dashboards/store-to-deliver` · permission `hod_dashboards.can_view_store_deliver_board`

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  HEADER    Store → Deliver  ·  ALL COMPANIES (3)  ·  Today  ·  ⟳ 60s  ·  ⛶     │
├────────────────────────────────────────────────────────────────────────────────┤
│  ZONE 1 · ANSWER ROW                                                            │
│  ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐                  │
│  │ 18 trk ││ 42 bill││  91 %  ││  5 !   ││ 9 BST  ││ 3 pend ││                 │
│  │ ₹1.2Cr ││ backlog││fulfil- ││ stuck  ││in tran-││transfer││                 │
│  │ 312 kL ││ ₹86L   ││  ment  ││>SLA    ││  sit   ││ 1 FAIL ││                 │
│  │ ▲ vs 14││ oldest ││ ▼ 3pp  ││ DOCKED ││ 2 gate ││        ││                 │
│  │  avg 15││  9 days││        ││   3h+  ││   -in  ││        ││                 │
│  └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘                  │
├────────────────────────────────────────────────────────────────────────────────┤
│  ZONE 2 · FLOW STRIP                                                            │
│  BH-PF ─► BST/xfer ─► FG stores ─► BOOKED ─► DOCKED ─► GATEPASS ─► DISPATCHED   │
│   40.2k     9 open    BH-FG 121k    22       8 ▲3h      5           18          │
│                       GP-FG  87k              ▲                                 │
│                       BH-EC  14k         stuck badge                            │
├───────────────────────────────────────────┬────────────────────────────────────┤
│  ZONE 3 · EXCEPTION QUEUES                │  ZONE 4 · TREND + BREAKDOWN        │
│  ┌───────────────────────────────────┐    │  dispatched value, 14 days         │
│  │ Ageing backlog  (oldest first)    │    │  ▃▅█▆▄▅█▇▅▃▄▆█▅                    │
│  │ ├ INV-4471  9d  ₹4.2L  Delhi   ›  │    │  ─── on-time %  (right axis)       │
│  │ ├ INV-4460  8d  ₹2.1L  Jaipur  ›  │    │                                    │
│  │ └ INV-4455  7d  ₹6.8L  Indore  ›  │    │  top customers    ▓▓▓▓▓▓░░         │
│  ├───────────────────────────────────┤    │  transporters     ▓▓▓▓░░░░         │
│  │ Vehicles past SLA            5 ●  │    │  destinations     ▓▓▓░░░░░         │
│  │ Awaiting receive             4 ●  │    │  company split    ▓▓░░░░░░         │
│  │ Short scans (approve)        2 ●  │    │                                    │
│  │ Stock in limbo (*-INT)  ₹31L      │    │                                    │
│  │ App-vs-SAP drift        1 crit ●  │    │                                    │
│  │ Overdue trucks               3 ●  │    │                                    │
│  └───────────────────────────────────┘    │                                    │
├───────────────────────────────────────────┴────────────────────────────────────┤
│  ZONE 5 · REPORT      filters in scope  →  [ Build report ⤓ ]  multi-sheet XLSX │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Zone 1 — Answer row

| # | Tile | Reads | Source |
|---|---|---|---|
| 1 | **Dispatched today** | trucks / bills / value / weight / litres / boxes, with vs-yesterday and vs-average chips | `/dispatch-plans/dashboard/summary/` (`DispatchedTotals`) |
| 2 | **Open backlog** | `count` / `amount` / `weight`, split by status; **age of the oldest bill** on the tile | same, `BacklogTotals` + `by_status` |
| 3 | **Fulfilment %** | billed vs planned vs dispatched — "did the truck take everything the invoice said" | `BillRow.fulfillment_rate` |
| 4 | **Stuck in pipeline** | vehicles past SLA in their stage (e.g. `DOCKED` > 2 h, `READY_FOR_GATEPASS` > 1 h) | `/dispatch-plans/pipeline/` |
| 5 | **BST in transit** | in-transit count / boxes / value; awaiting gate-in; awaiting receive | `/warehouse/bst/`, `/bst/incoming/`, `/bst/gate/expected-inwards/` |
| 6 | **Transfers** | pending approval · `IN_TRANSIT` (leg-2 unposted) · `FAILED` posting | `/transfer-requests/pending/`, `/in-transit/` |

### Zone 2 — Flow strip (the deliver chain)

Nodes 4–7 map straight onto the existing `PipelineStage` enum, so the strip is a compressed
read of the pipeline board with a stuck-count badge per stage:

```
 BOOKED ─► EMPTY_IN ─► READY_TO_DOCK ─► DOCKED ─► PHOTO_ATTACHED ─►
 READY_FOR_GATEPASS ─► GATEPASS_PRINTED ─► PRINT_COMMITTED ─► DISPATCHED
```

### Zone 3 — Exception queues

| Queue | Ranked by | Source |
|---|---|---|
| **Ageing backlog** | oldest first — the API already takes `order: 'oldest'` and `filled: true`, which drops the abandoned plan stubs that would otherwise crowd out real bills | `/dispatch-plans/dashboard/bills/` |
| **Vehicles past SLA** | time in current stage | pipeline board |
| **Awaiting receive** | BST `ARRIVED`/`RECEIVING` by age; accepted vs rejected boxes | `/warehouse/bst/incoming/` |
| **Short scans** | partial-transfer requests `PENDING`, with `scanned_qty` vs `expected_qty` | `/warehouse/bst/partial-transfers/` |
| **Stock in limbo** | `*-INT` in-transit warehouses — value sitting between two branches, by age | `/transfer-requests/in-transit/` |
| **App-vs-SAP drift** | reconcile findings, `critical` before `warning` | `/warehouse/transfer-requests/reconcile/` |
| **Overdue trucks** | post-dispatch, late / not delivered | `/gate-core/dispatch-tracking/summary/` |
| **Approvals waiting on you** | docking scan-skip + partial-dispatch | `docking_admin` endpoints |

### Zone 4 — Trend + breakdown

- 14/30-day bars: dispatched value + trucks; on-time % as a line.
- Breakdowns: top 10 customers, transporters, destinations (`place_of_supply`), company split.

---

## 6. The report side ("HOD makes the report")

Seeing is half of it; both HODs must be able to hand a number to someone else.

```
   filter bar (in the URL)              one click
   ┌──────────────────────┐            ┌────────────────────────────────┐
   │ 1–6 Sep · JIVO OIL   │  ────────► │  HOD_PlanProduce_2026-09-06.xlsx│
   │ line: all · unit: L  │            ├────────────────────────────────┤
   └──────────────────────┘            │ Sheet 1  Summary (KPI + filters)│
              │                        │ Sheet 2  Shortages              │
              │ every panel title      │ Sheet 3  POs not moving         │
              ▼ opens its rows         │ Sheet 4  Warehouse position     │
   ┌──────────────────────┐            │ Sheet 5  Runs / output          │
   │ row-level table      │            │ Sheet 6  Hand-over pending      │
   └──────────────────────┘            └────────────────────────────────┘
```

- **One filter bar governs the whole board** — date range, company, and (board 1) line /
  warehouse, (board 2) customer / transporter. Filters live in the URL, so an HOD can send a
  colleague the exact screen.
- **Every panel has a table behind it.** Click the panel title → a sheet opens with the rows
  that produced the number. This is what stops "the tile says 6, prove it".
- **One "Build report" button** produces a multi-sheet XLSX with `xlsx` (already a
  dependency): sheet 1 = the KPI row as labelled rows with the filter context stamped on it,
  then one sheet per panel currently in scope.
- Where a server-side export already exists (`/dashboards/stock/export/`,
  `.../requirement/export/`), call it rather than re-serialising client-side — those already
  handle the row volumes that break a browser.
- **Later phase, not now:** a scheduled morning email of the same workbook.

## 7. Wall mode

The existing boards (dispatch, production, gate, factory-expense) are *wall* screens. These
two are **desk** screens — an HOD filters, drills and exports, which a wall screen must never
do. So: normal scrollable page, plus a **⛶ Wall mode** toggle that reuses `useFullscreen` +
`useAutoScroll` + the day-anchor hook, hides the filter bar and creeps the queues past. Same
component tree, one flag.

---

## 8. Architecture

### 8.1 One endpoint per board — this is the load-bearing decision

Assembling either board client-side means 12–15 parallel queries, several of which go out to
SAP Service Layer or HANA. On a screen that polls, that will melt. Follow the rule already
written into `docs/DASHBOARD_MODULE_PLAN.md`: **the server aggregates.**

```
  BROWSER                    DJANGO                        SOURCES
  ┌──────────────┐   1 call  ┌────────────────────┐
  │ PlanProduce  │──────────►│ hod_dashboards     │
  │ DashboardPage│           │  services/         │        ┌───────────────┐
  │              │◄──────────│   plan_produce.py  │───────►│ planning_     │
  └──────────────┘  1 payload│   store_deliver.py │        │  purchase svc │
                             │                    │        ├───────────────┤
   { kpis, flow,             │  compose only —    │───────►│ stock_dashbd  │
     queues, trend,          │  NO new logic      │        ├───────────────┤
     breakdown,              │                    │───────►│ production_   │
     meta:{ asOf,            │  cache tiers:      │        │  execution    │
       degraded[],           │   live  30–60 s    │        ├───────────────┤
       refreshedAt } }       │   warm  5 min      │───────►│ dispatch_plans│
                             │   heavy snapshot   │        ├───────────────┤
                             └────────┬───────────┘───────►│ warehouse/bst │
                                      │                    └───────────────┘
                                      ▼
                            ┌──────────────────────┐
                            │ hod_supply_snapshot  │◄── APScheduler refresh
                            │ (heavy SAP tier)     │    (run_scheduler MUST run)
                            └──────────────────────┘
```

```
GET /api/v1/dashboards/hod/plan-produce/?from=&to=&company=&unit=&sections=
GET /api/v1/dashboards/hod/store-deliver/?from=&to=&company=&unit=&sections=

{ "kpis": [...], "flow": [...], "queues": {...}, "trend": [...],
  "breakdown": {...}, "meta": { "asOf", "company", "range", "degraded": [...] } }
```

`sections` lets the header and KPI row paint immediately while the heavy sections arrive.

### 8.2 Backend: compose, never re-derive

New Django app `hod_dashboards`, two service modules that **call the existing service
layers** — `planning_purchase.services`, `stock_dashboard`, `production_execution` report
services, `dispatch_plans.dashboard_service`, `warehouse.services.bst_service`,
`non_moving_rm`. No new business logic.

This matters more than it looks: the day the HOD board's "dispatched value" disagrees with
the Dispatch Fulfilment dashboard's, both boards lose their credibility permanently. Add
**contract tests** that assert the board's figure equals the source dashboard's figure for
the same range — that test is the whole reason to compose rather than re-query.

> App-label trap: pick a label that does **not** already exist as an orphan in the live DB.
> `production_planning` is poisoned exactly this way — Django saw its `0001_initial` as
> already applied and silently created neither tables nor permissions.

### 8.3 Cost tiers and caching

| Tier | Contents | Cache | Poll |
|---|---|---|---|
| Live | dispatched today, pipeline stages, BST/transfer queues, gate | 30–60 s | 60 s |
| Warm | production output, waste, movement/position, stock health | 5 min | on focus |
| Heavy | requirement explosion, producible, forecast-vs-stock | **snapshot table** | read Postgres |

For the heavy tier, copy the `sales_planning_requirement` pattern — a materialised table
refreshed by an APScheduler command. **`run_scheduler` must actually be running**, or the
board silently shows yesterday; put the snapshot's `refreshed_at` on the board face so a
stale snapshot is visible rather than believed.

### 8.4 SAP outage

Reuse the production wall's rule: app-sourced numbers keep working; SAP-sourced panels empty
with the reason on their own face, not a blank board. Carry `meta.degraded: ["requirement",
"producible"]` and render `SAPUnavailableBanner` per panel.

### 8.5 Frontend file layout

Follow the per-dashboard folder pattern exactly:

```
src/modules/dashboards/plan-produce/
  api/{plan-produce.api.ts, plan-produce.queries.ts, index.ts}
  components/{AnswerRow.tsx, FlowStrip.tsx, QueuePanel.tsx, TrendPanel.tsx, ReportButton.tsx, index.ts}
  constants/plan-produce.constants.ts      // SLA thresholds, poll intervals, accents
  hooks/{useBoardRange.ts, useBoardUnit.ts}
  pages/PlanProduceDashboardPage.tsx
  types/plan-produce.types.ts
src/modules/dashboards/store-deliver/      // same shape
```

`FlowStrip`, `QueuePanel` and the report builder are generic and shared between the two —
put them in `dashboards/components/` next to `SAPUnavailableBanner.tsx`.

> Naming trap: the frontend `.gitignore` silently swallows any source file named
> `*presentation*`. Do not name a component `...Presentation.tsx`.

---

## 9. Permissions & navigation

Two new codenames in `src/config/permissions/dashboards.permissions.ts`:

```ts
VIEW_PLAN_PRODUCE_BOARD:  'hod_dashboards.can_view_plan_produce_board',
VIEW_STORE_DELIVER_BOARD: 'hod_dashboards.can_view_store_deliver_board',
```

Three things that will otherwise bite:

1. **Add both to the PARENT `/dashboards` navigation entry** in
   `dashboards/module.config.tsx`, not just to the child routes. A permission missing from
   the parent hides the entire Dashboards menu from that HOD.
2. **Route permission ≠ panel permission.** The board permission opens the route; each panel
   is *additionally* gated on the owning module's view permission. So an HOD without
   `production_execution.can_view_reports` sees the board without the cost panel, rather than
   being refused the board or being shown cost they should not see.
3. If a hard-coded permission-count test exists for the dashboards module (the QC module has
   one in `qc.permissions.test.ts`), update it.

Also add both boards to `DashboardsLandingPage.tsx` and `ModuleDirectoryGrid`, at the top.

---

## 10. Data traps to encode (each is a real wrong number waiting to happen)

1. **Quantities are PIECES.** `INV1.Quantity` is single bottles, `NumInSale = 1`. The
   "20 PCS" in an item name is carton configuration only — multiplying by it inflates volume
   ~20×. Litres and cases are derived; carry all three per row as the plan types already do
   and let one board-level toggle pick.
2. **Never sum `buildable_qty` across SKUs.** Each is a standalone maximum that assumes the
   SKU gets the whole warehouse. They are alternatives, not addends — a "total producible"
   tile would be nonsense. Show *count of SKUs not covered* plus the binding component.
3. **The same `ItemCode` is a different product across the Oil and Mart SAP databases.** Any
   cross-company item-level aggregate must key on item name + company, never on code alone.
4. **`ON_HAND` vs `FREE` stock basis.** Most components here are over-committed, so `FREE`
   reads as "you can make nothing". Default to `ON_HAND` and show the basis on the panel.
5. **Backlog stubs.** `status_counts` includes abandoned plan rows with no value and no
   quantity; use `filled_counts` / `filled: true` or the backlog tile overstates.
6. **Production UOM mismatch.** App output is in cases; SAP `InQty` into `BH-PF` is in the
   item's inventory UOM. Convert before calling a per-day difference a mismatch.
7. **Wastage is not posted to SAP yet.** SAP `BH-WST` will usually read 0 (`PENDING_SYNC`).
   Label the app side as the app side rather than showing a comparison that always fails.
8. **`variety` splits** must come from `OITM.U_TYPE` / `U_Sub_Group`, never item-name
   matching, and combo packs must be stated both ways when quoted.
9. Board 2 is naturally cross-company (the dispatch board already is); Board 1 is naturally
   single-company. Make that the default and show the company count on the header.

---

## 11. Decisions I need from you

1. **"BST (BH-PC)"** — Branch Stock Transfer (the `warehouse/bst/` module), or material
   issued into the `BH-PC` production-consumption warehouse? The plan above assumes the
   former; the latter is already the *PC Issue* node on Board 1's flow strip.
2. **Board names.** "Plan → Produce" and "Store → Deliver" are proposed. Alternatives:
   "Production Control" / "Distribution Control".
3. **Cross-permission visibility.** Should HOD-A see dispatch value, and HOD-B see
   production cost?
4. **Company scope** for each board — single company or all companies by default.
5. **SLA thresholds** for "stuck": hours in `DOCKED`, in `SCANNING`, in `*-INT`, before red.

---

## 12. Phasing

```
 Phase 0  decisions + metric sign-off        ▓
 Phase 1  backend: 2 compose endpoints         ▓▓▓▓
 Phase 2  shell + answer row (SHIPPABLE)           ▓▓▓▓
 Phase 3  flow strip + queues   (SHIPPABLE)            ▓▓▓▓
 Phase 4  trend + report XLSX   (SHIPPABLE)                ▓▓▓
 Phase 5  snapshot + wall mode + SLA config                   ▓▓▓
 Phase 6  scheduled email (optional)                             ▓▓
```

| Phase | Deliverable | Depends on |
|---|---|---|
| **0** | Decisions in §11 locked; metric list signed off by both HODs; permission codenames created | — |
| **1** | Backend: two composition endpoints, read-only, no new logic. Contract tests asserting parity with the source dashboards | 0 |
| **2** | Frontend shell: routes, permissions (incl. parent nav), landing cards, filter bar, unit toggle, Zone 1 answer row with drill-through | 1 |
| **3** | Zone 2 flow strips + Zone 3 exception queues, with SLA colouring | 2 |
| **4** | Zone 4 trend + breakdowns; Zone 5 report builder (multi-sheet XLSX) | 3 |
| **5** | Heavy-tier snapshot table + scheduler; wall mode; SLA thresholds configurable | 4 |
| **6** *(optional)* | Scheduled morning email of each board's workbook | 5 |

Phases 2–4 are each independently shippable — an HOD gets a usable board at the end of
phase 2 and a better one at each step.

## 13. Risks

| Risk | Mitigation |
|---|---|
| SAP latency makes the board feel broken | tier the endpoint; snapshot the heavy tier; show `refreshed_at` |
| Board numbers disagree with existing dashboards | compose from the same service layer + contract tests |
| New permission hides the whole Dashboards menu | add it to the parent nav entry (§9.1) |
| Scheduler not running → stale snapshot believed as live | stamp `refreshed_at` on the board face and alarm past a threshold |
| Cross-company item-code collision | key item-level aggregates on name + company |
| Board becomes a wall of numbers nobody reads | every panel is a variance or an exception, ranked worst-first (§3) |
