# Planning & Purchase — analysis and design

A **Planning & Purchase** section that takes the production plan authored in SAP,
phases it into days / weeks / months, compares it against what production
actually made, explodes it into packing- and raw-material requirement, checks
that requirement against live stock, and turns the shortfall into purchase
orders.

Grounded in the code as of 2026-08-24. Backend paths are relative to
`c:/Users/dev02/factory_app`; frontend paths to this repo.

> **Status: built.** Sections 1–10 are the original analysis and proposal. The
> module was then implemented as `production_planning` (backend) and
> `src/modules/planning-purchase/` (frontend) — see
> [planning-purchase-module.md](planning-purchase-module.md). Section 0 below
> records what querying the live company settled, including **two places this
> proposal was wrong**.

---

## 0. Verified against live SAP — and where this document was wrong

Read-only queries against `JIVO_OIL_HANADB` and `JIVO_BEVERAGES_HANADB`,
2026-08-24.

### The plan is `OFCT` / `FCT1`, not `OWOR`

Section 3 recommended production orders. **That was wrong.** Planners author the
monthly plan as a SAP **sales forecast**: `OFCT` is the header, `FCT1` the lines.
Every one of the 24 headers in the Oil company is named "OIL Monthly Production
Planning for the &lt;Month&gt; &lt;Year&gt;" — unbroken monthly since Nov 2024,
latest AbsID 43 "AUG PLANNING 26", 98 SKUs, 3,126,479 PCS. Beverages has its own
series ("BEVERAGE PLANNING AUGUST 2026"). `FormView` is `M` for monthly, `W` for
weekly.

`OWOR` production orders turned out to be the *record of what was made*, not a
forward plan: ~400–550 per month, created and closed the same day, and over
4,538 orders in twelve months **`StartDate` never once differs from `DueDate`**.
Worse, `Status IN ('P','R')` — the filter `sap_plan_dashboard` and
`get_open_production_orders()` both use — returns mostly abandoned stragglers
dating back to 2024. Building the plan reader on it would have shown planners
junk.

`JIVO_MART`'s configured schema (`TEST_MART_15122025`) does not exist on this
HANA host, so Mart is out of scope — consistent with `sales_planning_requirement`
supporting only Oil and Beverages.

### The unit is PCS, and the existing variance report is wrong

`FCT1.Quantity` and `OWOR.PlannedQty` are both in the item's `OITM.InvntryUom` —
**`PCS` for 97 of the 98 SKUs on the August plan** (one `DRM`). PCS means single
bottles or tins, **not cases**. `OITM.SalFactor2` is the pieces-per-case factor:
4, 12, 16, 20, 24, 70.

`ProductionRun.total_production` is in **cases**. So
`report_service.get_plan_vs_production()` compares cases against pieces with no
conversion — understating actual production by the case factor, 4× to 70×
depending on the SKU. Section 2.2 flagged this as probable; it is confirmed.

### Three more findings that changed the build

1. **`OITT."Qauntity"` is usually not 1.** 159 BOMs are per-1, but 44 are per-4,
   30 per-20, 29 per-16, 26 per-12. Component-per-unit is
   `ITT1."Quantity" / OITT."Qauntity"`; the division is now done in SQL so no
   caller can skip it.
2. **Not every BOM line is a material.** `ITT1."Type"` is 4 for an item and 290
   for a **resource**. There are 282 resource lines, none in `OITM`:
   `JWPL09240001` is "FILLING COST CANOLA AND OLIVE", `JWPL09240005` is "PET
   BOTTLE BLOWING CONVERSION COST". The first live run put a 2.5-million-unit
   "shortage" of a cost centre at the top of the purchase list. They are now
   listed separately and never offered for purchase.
3. **`POR1."Price"` is in the purchase unit, not the inventory unit.** Loose
   olive oil is bought by the metric ton at ~₹230,000 and consumed by the litre
   at ~₹278. Costing the requirement off the last PO price produced an estimated
   spend of **₹710 billion**; using `OITM."LastPurPrc"` gives ₹72 crore for the
   same plan. The vendor still comes from the last PO — the item master carries
   no preferred vendor for any of the 2,026 purchase items — but the price never
   does.

### Data readiness

| Check | Result |
|---|---|
| `OITM.IsCommited` populated | Yes — 346 of 1,916 items, 6.09 M committed. Net-available is meaningful. |
| Open PO due dates | Yes — 740 of 762 open lines carry `ShipDate`. |
| `OITW.MinStock` benchmark | **Only in `BH-PM`** (202 items). Everywhere else it is zero, so most rows have no floor and the UI says so. |
| Item groups for the PM/RM split | Clean: `PACKAGING MATERIAL` (875, all purchased), `RAW MATERIAL` (83, all purchased). The existing substring rule works. |
| `MaterialLeadTime` rows | **Zero.** Every shortage reports `NO_LEAD_TIME` and no order-by date can be computed. Chasing that sheet is still the highest-value follow-up. |
| Last purchase price | 780 of 875 PM, 68 of 83 RM. `AvgPrice` is zero throughout — use `LastPurPrc`. |
| Plan SKUs with no production BOM | 4 on the August plan. Reported by name, never treated as zero requirement. |

### Answers to the ten decisions

| # | Question | Answer |
|---|---|---|
| 1 | Where is the plan? | **`OFCT` + `FCT1`**, SAP's forecast object used as the production plan. Settled. |
| 2 | What unit? | **The item's `InvntryUom`, almost always PCS** (single bottles). Cases via `SalFactor2`. Settled. |
| 3 | Spread policy | Both built. `EVEN_WORKING_DAYS` is the default and every derived cell is marked; `PERIOD_START` invents nothing. |
| 4 | Factory calendar | Mon–Sat, Sunday off, Monday week start — `PLANNING_NON_WORKING_WEEKDAYS` / `PLANNING_WEEK_START_DAY`. **Still needs confirming with Production.** |
| 5 | Availability warehouses | All warehouses by default, with a per-request filter and the scope reported on every response. PM stock is spread across `BH-PM`, `BH-PP`, `BH-PC`, `BH-BS`; RM sits in `BH-LO`. |
| 6 | Floor rule | `OITW.MinStock` where it exists, which is only `BH-PM`. The 35% policy floor is **not** wired in yet. **Still open.** |
| 7 | Purchase Request or PO? | Built as a real **Purchase Order** (`/b1s/v1/PurchaseOrders`), behind `PLANNING_PURCHASE_SIMULATE_SAP` and a three-way permission split. **Confirm this is what the business wants before turning simulate off.** |
| 8 | Who approves? | A separate `can_approve_purchase_order` permission, and the backend refuses to let the author approve their own order. |
| 9 | Yield allowance | Nominal BOM. Measured yield is **not** built. |
| 10 | Companies | Oil and Beverages. Mart's schema does not exist on this host. |

---

## Contents

1. [The finding that shapes everything](#1-the-finding-that-shapes-everything)
2. [What already exists](#2-what-already-exists)
3. [Design — seven stages](#3-design--seven-stages)
4. [Data model](#4-data-model)
5. [API](#5-api)
6. [Permissions and frontend](#6-permissions-and-frontend)
7. [Implementation phases](#7-implementation-phases)
8. [Risks](#8-risks)
9. [Ideas worth the money](#9-ideas-worth-the-money)
10. [Decisions needed](#10-decisions-needed)

---

## 1. The finding that shapes everything

**Most of what you described is already in the codebase, spread across four apps
that do not know about each other.** The honest scope of this work is *connect
and complete*, not *build from scratch*.

| What you asked for | Status |
|---|---|
| Read the plan SAP users create | **Partly** — `ProductionOrderReader.get_open_production_orders()` reads `OWOR` Planned/Released |
| Split the plan into days / weeks / months | **Missing entirely** — nothing buckets anything by date |
| Compare plan vs actual production | **Partly** — `report_service.get_plan_vs_production()` exists, but per-order only, no date buckets, and the units look wrong |
| Explode the plan into PM + RM requirement | **Exists** — `WOR1`, `OITT`/`ITT1`, `bom_utils`, `live_trail_reader.bills_of_material()` |
| Check PM/RM availability against stock | **Exists** — `stock_dashboard` (`OITW` on-hand vs `MinStock`), and `live_trail` nets open POs |
| Suggest what to buy, when, in what quantity | **Exists** — `supply_chain.planning.material_alarms()` with lead time + MOQ + order-by date |
| Create the PO in SAP | **Missing entirely** — there is no purchase-order writer anywhere in `sap_client` |

Two things were also **deleted or orphaned** and sit directly in the way:

1. **The backend `production_planning` app is gone.** Removed by
   `production_execution/migrations/0004_remove_production_planning_fk.py`, whose
   own docstring says *"Production planning is now managed entirely in SAP — no
   local plan model needed."*
2. **The frontend planning module still ships.** `src/modules/production/planning/`
   (4 pages, api, queries, schemas, types) is routed at `/production/planning*`
   in [module.config.tsx](../src/modules/production/module.config.tsx) and calls
   `/api/v1/production-planning/…` — endpoints not mounted in the backend's
   `config/urls.py`. It is hidden from the sidebar, so nobody has noticed. Its
   `production_planning.*` permission strings can never be granted, because the
   app that would define them no longer exists.

So the frontend shell for Planning is already written. The decision is whether to
revive it as a **reader of the SAP plan** (recommended) or delete it.

### The pipeline in one picture

```
      SAP (authored by planners)                 FactoryFlow
      -------------------------                  -----------
 (1)  OWOR / OFCT  ---------------------->  ingest + snapshot the plan
                                                    |
 (2)                                        phase into day / week / month
                                                    |
                    +-------------------------------+-----------------------+
                    v                               v                       v
 (3) OWOR.CmpltQty              (4) BOM explosion            (5) availability
     OINM TransType 59              WOR1 / OITT+ITT1             OITW OnHand
     ProductionRun.total_prod       split PM vs RM               - IsCommited
             |                          |                        + open PO due
             v                          v                             |
     plan vs actual              requirement per bucket --------------+
     variance + carry-forward                                         |
                                                                      v
                                                    (6) time-phased shortage
                                                                      |
                                                                      v
                                                    (7) requisition -> PO
                                                        lead time, MOQ,
                                                        supplier, order-by
                                                                      |
                                                              NEW WRITE PATH
                                                                      v
                                                    SAP PurchaseRequest / PO
```

Stages 3–7 all exist in some form. **Stage 2 exists nowhere** and is the piece
that turns four separate reports into the system you are describing. Stage 7's
last hop (the SAP write) is the only genuinely new integration.

---

## 2. What already exists

### 2.1 The plan side

**The backend planning app was deleted.** There is no `production_planning` entry
in `config/settings.py::INSTALLED_APPS` and no `api/v1/production-planning/`
route in `config/urls.py`.

**The frontend planning module is still shipping:**

| Artefact | Path |
|---|---|
| Pages (4) | `src/modules/production/planning/pages/` — `PlanningDashboardPage`, `CreatePlanPage`, `PlanDetailPage`, `BulkImportPage` |
| API client | [planning.api.ts](../src/modules/production/planning/api/planning.api.ts) |
| Types | [planning.types.ts](../src/modules/production/planning/types/planning.types.ts) — `ProductionPlan`, `WeeklyPlan`, `DailyProductionEntry`, `BOMResponse`, `PlanStatus`, `SAPPostingStatus` |
| Routes | [module.config.tsx](../src/modules/production/module.config.tsx) — `/production/planning`, `/create`, `/:planId`, `/:planId/edit`, `/bulk-import` |
| Endpoints | [api.constants.ts:406-427](../src/config/constants/api.constants.ts#L406-L427) — 18 paths under `/production-planning/` |
| Permissions | [production.permissions.ts](../src/config/permissions/production.permissions.ts) — `production_planning.can_*` |

The types already model exactly what you are asking for — `WeeklyPlan`,
`DailyProductionEntry`, `BOMComponent.shortage_qty`, `SAPPostingStatus`. The old
design doc ([docs/production-planning/design-doc.md](production-planning/design-doc.md))
even specifies monthly-to-weekly auto-division. Its flaw: it splits every month
into exactly **4 weeks**, which silently loses 3 days in a 31-day month.

**What SAP-side plan data is already readable** —
`production_execution/services/sap_reader.py::ProductionOrderReader`:

| Method | Reads | Notes |
|---|---|---|
| `get_open_production_orders()` | `OWOR` where `Status IN ('P','R')`, remaining > 0 | remaining = `PlannedQty - CmpltQty - RjctQty`; ordered by `DueDate` |
| `get_released_production_orders()` | same, `Status = 'R'` only | |
| `get_production_order_detail(doc_entry)` | `OWOR` header + `WOR1` lines | `WOR1` gives `PlannedQty`, `IssuedQty` per component |
| `get_production_orders_by_entries([...])` | batch header fetch | used by plan-vs-production |
| `get_bom_by_item_code(item_code)` | `OITT` / `ITT1` | the master recipe |
| `get_pieces_per_case_map([...])` | `OITM.SalFactor2` | the cases-to-bottles factor |

`OWOR` carries `StartDate`, `DueDate`, `Warehouse`, `Status`, `PlannedQty` — i.e.
**everything needed to bucket a plan by date already comes back from SAP.**
Nothing consumes those dates today.

**A write path for production orders exists but is unused.**
`sap_client/service_layer/production_order_writer.py` posts to
`/b1s/v2/ProductionOrders`; `SAPClient.create_production_order()` wraps it. No
view or service calls it. If planning ever needs to push a plan back into SAP,
half that work is done.

### 2.2 The actuals side

Three independent sources of "what was actually produced":

| Source | Where | Unit | Granularity |
|---|---|---|---|
| App-entered | `ProductionRun.total_production` | **cases** (field help text: "Total cases produced") | run, day, line, shift |
| SAP order progress | `OWOR.CmpltQty` | SAP's own unit | per order, no date |
| SAP movements | `OINM` `InQty` where `TransType = 59` | SAP's own unit | per posting date — **the date-accurate SAP truth** |

`production_execution/services/reconciliation_reader.py` already reads all three
movement types: **59** = Goods Receipt (FG produced), **67** with `InQty` = Stock
Transfer (material into the production warehouse `BH-PC`, wastage into `BH-WST`).

**The existing plan-vs-production report has two defects.**
`report_service.get_plan_vs_production()` (line 364) groups completed runs by
`sap_doc_entry`, batch-fetches the matching `OWOR` rows, and reports
`planned_qty`, `actual_production`, `variance`, `achievement_pct`. Exposed at
`GET /api/v1/production-execution/reports/analytics/plan-vs-production/`, with a
page at `/production/execution/reports/plan-vs-production`.

1. **No date buckets.** It aggregates over a `date_from`/`date_to` window and
   groups by order. No day, week or month dimension — exactly the thing you are
   asking for.
2. **Probable unit mismatch.** `total_production` is documented as cases;
   `OWOR.PlannedQty` is whatever unit the order was raised in. The comparison is
   raw:

   ```python
   planned = float(sap.get('PlannedQty', 0))
   variance = actual - planned
   ```

   By contrast `compute_run_oee()` in the same file *does* convert:
   `bottles = total_cases * float(pieces_per_case or 1)`. The codebase knows the
   conversion exists and this report skips it. **Verify against one real order
   before trusting any variance number on that screen today.** Same class of bug
   as the Flipkart reconciliation, where litres and pieces were being compared.

`get_procurement_vs_planned(company_code, sap_doc_entry)` (line 446) compares
`WOR1` BOM planned qty against procurement receipts and actual consumption for
**one** order at a time — useful, but not aggregatable across a plan.

### 2.3 `stock_dashboard` — the benchmark methods you referred to

`stock_dashboard/hana_reader.py::HanaStockDashboardReader` (32 KB) is a **live
pass-through** to HANA, no caching:

```sql
FROM OITW w JOIN OITM m ON w.ItemCode = m.ItemCode
LEFT JOIN OITB grp ON m.ItmsGrpCod = grp.ItmsGrpCod
LEFT JOIN (last-consumption subquery on OINM)
```

Returns `ItemCode`, `ItemName`, `WhsCode`, `OnHand`, `MinStock`, `InvntryUom`,
`LastConsumptionDate`, `DaysSinceLastConsumption`.

| Method | Purpose |
|---|---|
| `get_stock_levels(filters, page, page_size)` | flat per-warehouse rows |
| `get_grouped_stock_levels(...)` | aggregated across warehouses when 2+ selected — `SUM(OnHand)`, **`SUM(MinStock)`** |
| `get_item_warehouses(item_code, warehouses)` | per-warehouse breakdown for one item |
| `get_as_of_stock_levels(filters, as_of_date)` | historical on-hand reconstructed from `OINM` |
| `get_stock_stats` / `get_grouped_stock_stats` | counts over the whole filtered set |
| `get_warehouses()` | distinct `OITW` warehouse codes |

Health rules in `stock_dashboard/services.py`:

| Condition | Status |
|---|---|
| `MinStock <= 0` | `unset` |
| `OnHand >= MinStock` | `healthy` |
| `OnHand >= 0.6 * MinStock` | `low` |
| otherwise | `critical` |
| last consumption > 30 days ago | `none` — **overrides everything above** |

Two behaviours to inherit deliberately or not at all:

- **Slow-moving overrides health.** An item unconsumed for 30+ days reports
  `none` and drops out of low/critical counts. For *planned* requirement this is
  backwards: a component not consumed for 40 days is exactly what a new plan
  needs in quantity. The Planning view must not adopt this rule.
- **Grouped `MinStock` is summed** across warehouses, so the benchmark changes
  meaning between single- and multi-warehouse views.

Frontend counterpart: `src/modules/dashboards/stock-level/` — api, queries,
`StockLevelTable`, `StockLevelFilters`, `StockLevelMetaCards`,
`StockItemDetailPanel`. Directly reusable for the availability drill-down.

### 2.4 `sales_planning_requirement` — the closest thing to the full chain

Calls the HANA stored procedure `"SALES PLANNING VS REQUIREMENT_WEEKLY"` and
materialises the result into Postgres (`SalesPlanningRequirementRow`). Per item:
demand, `min_stock` (the floor), `stock_in_hand`, `base_required_qty` (the
exploded requirement), `open_po_qty`, `net_shortage_qty`, plus the raw procedure
row in a JSONB `raw_payload`.

Reads are Postgres-fast; the refresh is a heavy `CALL` guarded by a partial
unique index (one running refresh per company) and a 4-hour stale reaper. Only
`JIVO_BEVERAGES` and `JIVO_OIL` are configured.

**It already solves open-PO netting**, which the August brief never mentioned.
The catch: the procedure is a black box we cannot edit, it is *forecast*-driven
rather than *plan*-driven, and the snapshot refreshes monthly by default — so
planners can be looking at month-old numbers.

### 2.5 `supply_chain` — lead time, MOQ, capacity, alarms, Live Trail

New in August 2026 (`factory_app/docs/SUPPLY_CHAIN_MODULE.md`), mounted at
`/api/v1/supply-chain/`. It deliberately does **not** re-implement demand, floor,
FG gap, BOM explosion or material requirement — it reads
`sales_planning_requirement` rows and adds the two steps that were missing.

Reference data (owned by departments, not in the ERP):

| Model | Fields that matter here |
|---|---|
| `MaterialLeadTime` | `material_code`, `material_type` (PACKAGING / RAW), `supplier_name`, `lead_time_days`, `moq`, `unit` |
| `MachineCapacity` | `output_per_hour`, `shift_hours`, `shifts_per_day`, `working_days_per_month`, `changeover_minutes` — capacity is **derived**, never stored |
| `MaterialMachineMap` | `sku_code`, `primary_machine_id`, `alternate_machine_ids`, `output_on_primary` |
| `SupplyChainPolicy` | `floor_percent` (35), `floor_basis`, `urgency_window_days`, `use_net_of_open_po`, `apply_moq_rounding`, `include_changeover_in_capacity` |
| `SalesTrend` | 3 months of actual sales per item (CSV-loaded today, not ERP-pulled) |
| `MonitoredSku` | `sku_code`, **`plan_quantity`**, `working_days_left` — a hand-entered plan quantity already exists here |
| `AlarmSubscription` / `AlarmDispatch` | who gets told, and send fingerprinting so a standing condition is not re-sent nightly |

Services:

- `planning.material_alarms()` — shortage, lead time, and therefore the
  **order-by date**; states `OVERDUE` / `ORDER_NOW` / `SCHEDULED` /
  `NO_LEAD_TIME` / `COVERED`, MOQ-rounded, most urgent first.
- `planning.capacity_check()` — line hours required vs usable, **in hours not
  units**, changeover charged once per SKU scheduled; unmapped SKUs force
  `feasible: false` rather than being dropped.
- `live_trail.py` — the whole order book in one pass: `ORDR`/`RDR1` demand (Oil +
  Mart books, intercompany netted out) to `OITW` stock to `OWOR` open work orders
  to `OITT`/`ITT1` BOMs to `OPOR`/`POR1` open POs to `PDN1` **measured** lead
  times, with `ORSC` resources and an overdue-PO summary.
- `live_trail_actions.py` — routes each issue to one of Production / Packaging
  Procurement / Raw Procurement / Infrastructure / Finance, with severity
  `CRITICAL` / `PLAN` / `WATCH`, one accountable owner each.
- `template_import.py` — reads the three-sheet reference workbook, skipping grey
  italic example rows and blank rows carrying filled-down formulas.

Frontend: `src/modules/supply-chain/` — `SupplyChainDashboardPage`,
`SupplyChainDailyRunPage`, plus `ProcurementTable`, `CapacityPanel`,
`SupplyChainHeadline` and eight Live Trail components.

**PM vs RM classification already has a rule.**
`live_trail_actions._material_department()` matches the SAP item group:
`"PACKAG"` goes to Packaging, `"RAW"` or `"OIL"` to Raw, everything else defaults
to Packaging **with the group named** so a mis-route is visible rather than
silent.

Known gaps stated in its own docs: WIP is not netted off the FG gap; sales trend
is CSV not ERP; required-by is the plan period start for every material (no real
staging); **every row on the circulated Lead Times sheet is still an example — the
real lead times have never been returned.**

### 2.6 `sap_plan_dashboard` — deleted, and it was the closest match of all

Removed 2026-08-05. Its recorded purpose
(`factory_app/docs/dashboards_overview.md`):

> "For every open production order, which BOM components will fall short of
> stock, and what must I buy?"

It joined `OWOR` to `WOR1` to `OITM`, forced `Status IN ('P','R')`,
`WOR1.ItemType = 4`, `OITM.InvntItem = 'Y'`, and served `summary/`, `details/`,
`procurement/`, `sku/<doc_entry>/`. The `procurement/` endpoint aggregated
shortfall **by component across all orders**, computed `suggested_purchase_qty`,
listed `related_prod_orders`, and sorted worst-first.

It defined the terms worth keeping:

- **Net available** = `OnHand - IsCommited`
- **Component remaining** = `PlannedQty - IssuedQty`
- **Shortfall** = `max(0, component_remaining - net_available)`
- Per-line `stock_status` of `sufficient` / `partial` / `stockout`

Its docs survive in this repo: [sap-plan-dashboard.md](modules/sap-plan-dashboard.md)
and [sap-plan-dashboard-frontend.md](modules/sap-plan-dashboard-frontend.md). It
was deleted for being an unpaginated live query, not for being wrong.

### 2.7 The purchase side

**There is no purchase-order writer.** `sap_client/service_layer/` contains
writers for AP invoice, delivery note, goods issue, GRPO, attachment, production
order and returns. A grep for `PurchaseOrders`, `PurchaseRequests`, `OPRQ` and
`PRQ1` across the whole backend returns **nothing**. This is the one part of your
request with no foundation at all.

What *is* readable:

| Reader | Reads |
|---|---|
| `sap_client/hana/po_reader.py::HanaPOReader` | open POs by supplier / PO number / doc entry |
| `live_trail_reader.open_purchase_lines(codes)` | `OPOR` + `POR1` open lines per item — quantity and due date |
| `live_trail_reader.last_vendors(codes)` | last supplier per item from `POR1`/`OPOR` |
| `live_trail_reader.measured_lead_times(codes)` | actual PO-date to GRPO-date from `OPOR`/`PDN1` |
| `live_trail_reader.overdue_purchase_summary()` | count and value of overdue POs |
| `grpo` app | the whole goods-receipt-against-PO flow, already live |

So the *inputs* to a purchase suggestion are all available. Only the write is
missing.

**The platform's own precedent for a risky write:** `marketplace` posts delivery
notes and goods issues to SAP behind `MARKETPLACE_SIMULATE_SAP`, which defaults
to `DEBUG` so production posts for real and development does not. `ProductionRun`
carries `sap_receipt_doc_entry`, `sap_sync_status` and `sap_sync_error` with a
retry endpoint. **Any PO write should copy both patterns exactly.**

### 2.8 Platform facts that constrain the design

- **Company means HANA schema.** Every request carries a `Company-Code` header;
  `company.permissions.HasCompanyContext` resolves it and
  `sap_client/registry.py::COMPANY_SAP_REGISTRY` maps it to a schema on a single
  HANA host. Codes: `JIVO_OIL`, `JIVO_MART`, `JIVO_BEVERAGES`.
- **The same item code is a different product across Oil and Mart.** Match by
  item name, or refuse — never join on code across those two databases.
- **Every HANA request opens and closes its own connection.** 15 s connect
  timeout, 60 s communication timeout, no pooling. A heavy multi-CTE query holds
  a gunicorn worker for its whole duration.
- **Error mapping is uniform:** `SAPConnectionError` to 503, `SAPDataError` to
  502, `SAPValidationError` to 400.
- **Permissions live on unmanaged sentinel models** with `managed = False`,
  `default_permissions = ()` and an explicit `permissions` list — see
  `stock_dashboard/models.py::StockDashboardPermission`.
- **Scheduled work runs under APScheduler** via long-running management commands.
  If the process is not running, the job silently never fires — the stock-alert
  job has already been bitten by this, and separately caps its scan at the first
  50 rows.
- **The default database is the live production DB.** Any test that writes must
  run against sqlite.

---

## 3. Design — seven stages

Guiding principle, taken from how `supply_chain` was built: **do not create a
second source of truth.** Where SAP or an existing app already computes a number,
read it. Only compute what nothing computes today — the date phasing, the
variance ledger, and the requisition.

### Stage 1 — Ingest the plan

The plan is authored by planners in SAP and must be read, not re-entered. Two
candidate homes, and the code already reads both:

| Candidate | Table | Carries | Read by |
|---|---|---|---|
| **Production orders** (recommended default) | `OWOR` + `WOR1` | item, `PlannedQty`, `StartDate`, `DueDate`, `Warehouse`, `Status`, and a **frozen component list** with `IssuedQty` | `ProductionOrderReader` |
| **Sales forecast** | `OFCT` + `FCT1` | per-period demand quantities, already weekly | `sales_planning_requirement/hana_reader.py` |

Recommend `OWOR` with `Status = 'P'` (Planned) as the plan and `Status = 'R'`
(Released) as the plan committed to the floor. Reasons:

1. It has dates. A forecast line has a period; an order has a `StartDate` and a
   `DueDate`, which is what makes bucketing honest rather than invented.
2. `WOR1` is the recipe **that order will actually consume**, with `IssuedQty`
   already netted. Re-exploding `OITT`/`ITT1` gives the master recipe, which may
   have changed since the order was raised.
3. `ProductionRun.sap_doc_entry` already links the app's actuals to `OWOR`, so
   plan-vs-actual needs no new join key.

Make the source **configurable** — `PLAN_SOURCE` of `SAP_PRODUCTION_ORDER` |
`SAP_FORECAST` | `MANUAL`.

**Snapshot, do not stream.** Reading `OWOR` live on every page load repeats the
mistake that got `sap_plan_dashboard` deleted. Follow the pattern that already
works in `sales_planning_requirement`:

- A refresh job pulls SAP and writes `PlanSnapshot` + `PlanLine` rows into
  Postgres inside one transaction. On failure the previous snapshot is left
  intact and serving.
- All reads hit Postgres and are fast.
- One running refresh per company, enforced by a **partial unique index**, not app
  logic. Reap stale `RUNNING` rows after N hours.
- Every response carries `refreshed_at` and the snapshot id.

Snapshots are **immutable and versioned**. A plan edited in SAP creates a new
snapshot; the old one stays. Without this, "we achieved 85% of plan" cannot be
audited, because the plan moved.

Must never happen: a plan number displayed without its snapshot timestamp; a
failed refresh blanking the table; joining item codes across Oil and Mart.

### Stage 2 — Phase the plan into days, weeks and months

**This is the new part.** Nothing in the codebase buckets anything by date today,
and it is the reason the four existing reports do not add up to a system.

One `PlanBucket` row per (`plan_line`, `bucket_type`, `bucket_start`), where
`bucket_type` is `DAY` / `WEEK` / `MONTH`. `DAY` rows are the grain; `WEEK` and
`MONTH` are sums of them. Storing all three rather than aggregating on read costs
almost nothing and makes the month total always equal the sum of its weeks — a
property that is very easy to lose when weeks straddle month boundaries.

**Three spread policies:**

| Policy | Rule | Use when |
|---|---|---|
| `DUE_DATE` **(default)** | the whole quantity lands in the `DueDate` bucket | SAP states only a due date. Invents nothing. |
| `EVEN_WORKING_DAYS` | spread evenly across working days from `StartDate` to `DueDate`, remainder to the earliest days | orders carry a real date range and planners want a daily target |
| `CAPACITY_WEIGHTED` | spread in proportion to the line's available hours per day, from `MachineCapacity` and `MaterialMachineMap` | two SKUs share a line and an even spread would be physically impossible |

Non-negotiable: **every spread number is flagged `derived: true` and names its
policy.** A derived daily target is a suggestion. Showing it as a commitment is
how a planner ends up defending a number no human ever set.

**The calendar.** Weeks and working days need a factory calendar; nothing in the
codebase has one.

- `week_start_day` configurable. ISO Monday by default, but many Indian factory
  weeks run Monday to Saturday with Sunday off, and that changes every weekly
  bucket boundary.
- A `NonWorkingDay` table for holidays and planned shutdowns.
- **Do not divide a month into 4 weeks.** The existing
  [production-planning design doc](production-planning/design-doc.md) does exactly
  that; a 31-day month has 5 partial weeks and the 4-week split silently loses 3
  days of plan. Bucket by real dates and let a month contain 4, 5 or 6 week rows.

**Units — settle this once, at ingest.** The single most likely source of wrong
numbers on every screen downstream.

| Number | Unit today |
|---|---|
| `ProductionRun.total_production` | cases |
| `OWOR.PlannedQty` | unverified |
| `OITM.SalFactor2` | pieces per case |
| Marketplace / Flipkart reconciliation | had to be redone in litres |

Rule: **convert everything to one canonical unit at ingest, store the factor used
on the row, and display in both.** Recommend pieces (bottles) as canonical
because `SalFactor2` is already resolved and snapshotted on every
`ProductionRun`, with cases as the display default because that is what the floor
speaks. Store `uom`, `pieces_per_case` and `litres_per_unit` on `PlanLine` so any
view can convert without another SAP round trip.

### Stage 3 — Plan vs actual production

**Three actual sources, all reported:**

| Source | Strength | Weakness |
|---|---|---|
| `ProductionRun.total_production` | day, line, shift, run, OEE, cost | app-entered, can lag or be wrong |
| `OINM` `InQty` where `TransType = 59` | **SAP truth, date-stamped by `DocDate`** | no line or shift dimension |
| `OWOR.CmpltQty` | authoritative per order | no date |

Show `OINM` 59 as the headline actual, because it is what finance and SAP agree
happened, and show the app figure beside it. **When they disagree, that gap is
itself the finding** — a run not posted, posted twice, or a number the goods
receipt does not support. A reconciliation column belongs on this screen, not
hidden in a separate report.

**The variance ledger**, per bucket, per SKU:

```
planned_qty        from PlanBucket
carried_in         shortfall carried from the previous bucket
effective_target   planned_qty + carried_in
actual_qty         canonical unit
variance           actual_qty - effective_target
attainment_pct     actual_qty / effective_target
carried_out        max(0, effective_target - actual_qty)
```

`carried_in` / `carried_out` is the difference between a report and a control.
Three weeks at 90% reads as fine; the same three weeks as a ledger show a month
that cannot recover.

Carry-forward needs one rule from the business: **does a shortfall carry forward,
or expire at the bucket boundary?** Default proposal: carry within the month,
reset at month end, since the plan is monthly. Make it a policy field.

Also expose overproduction (`variance > 0`) as a first-class case rather than a
negative shortfall — overproducing a SKU consumes material the next SKU needed,
which is a procurement event, not a win.

The screen must pivot by SKU, by line, by brand/category, and by day / week /
month over the same rows. `LineSkuConfig` and `ProductionLine` supply the line
dimension; SAP item master supplies brand and category.

### Stage 4 — Explode the plan into material requirement

| Plan source | Explode from | Why |
|---|---|---|
| `OWOR` | `WOR1` component lines | the frozen recipe for that order, with `IssuedQty` already consumed |
| `OFCT` forecast / manual | `OITT` + `ITT1` | no order exists yet |

Multi-level: `live_trail_reader.sub_bills_of_material()` already handles one more
level down. A bottle blown in-house from a preform is a `blowing` run, not a
purchase — so the explosion must stop at *purchased* items and treat manufactured
intermediates as a further production requirement. Decide per item using
`OITM.PrchseItem` / `MakeItem`, not a name convention.

```
requirement(component, bucket) =
    sum over SKUs of ( planned_qty(sku, bucket) x qty_per_unit(component, sku) )
    x (1 + scrap_allowance(component))
```

`qty_per_unit` has two candidates and **both should be shown**:

- **Nominal** — straight from the BOM.
- **Measured** — actual consumption per unit produced, derived from
  `ProductionMaterialUsage` over a trailing window. `get_procurement_vs_planned`
  already computes a `consumption_vs_planned_pct`, so the measurement exists.

Default to nominal, offer measured, always show the divergence. Buying to the
nominal BOM when the floor consistently uses 3% more is a guaranteed shortage
every cycle, and it is invisible today.

**PM vs RM split:** use `live_trail_actions._material_department()` — matches the
SAP **item group** (`OITB.ItmsGrpNam`), not the code prefix, because the group is
what SAP enforces. Do not duplicate the rule; lift it into a shared helper both
apps import. If the real item groups do not follow the pattern cleanly, the honest
fix is an explicit mapping table, not a longer list of substring guesses.

**Aggregate by component, not by SKU.** The per-SKU shortage list is unbuyable —
one cap runs across a dozen SKUs. The purchasable view aggregates by component
across all SKUs and all buckets in the horizon, carrying `related_skus` and
`related_orders` for the drill-down. This is what `sap_plan_dashboard`'s
`procurement/` endpoint did before it was deleted.

### Stage 5 — Availability

**Read where the Stock Benchmark reads.** Reuse `HanaStockDashboardReader` — same
`OITW` join, same `OITM`/`OITB` enrichment, same warehouse filter. Two deliberate
differences:

1. **Net available, not on hand.** Use `OnHand - IsCommited`, the term
   `sap_plan_dashboard` defined. Committed stock is already promised.
2. **Do not inherit the slow-moving override.** Read the same rows, apply the
   planning rule — a dormant component the new plan needs in quantity is
   precisely the one to flag.

Which warehouses count materially changes every number. Proposal: a configurable
warehouse set per company, defaulting to the production warehouses (`BH-PC` and
the FG warehouse), explicitly excluding marketplace godowns and wastage
(`BH-WST`).

**Time-phased balance.** Availability is not one number — it is a running balance
per component across buckets:

```
opening(b)   = closing(b-1)                       (b=0: net available today)
inbound(b)   = open PO lines due in b             (OPOR + POR1)
             + GRPO in progress                   (grpo app)
requirement(b) from Stage 4
closing(b)   = opening(b) + inbound(b) - requirement(b)
```

The first bucket where `closing < floor` is the **shortage date**, and the
shortage quantity is what must be bought. This is the number that makes the
system an alarm rather than a report: not "you are short", but "you go short on
the 14th, so order by the 2nd".

**Netting off open POs is mandatory, not optional.** The August brief omitted it
and the module doc names it as the most likely way a first version produces
confidently wrong alarms: without it, the same material is re-ordered every cycle
until it arrives. `live_trail_reader.open_purchase_lines()` already returns due
dates per line.

WIP must also be netted — released `OWOR` orders already consuming material
(`WOR1.IssuedQty`) are demand that has partly happened. `supply_chain`'s own docs
list WIP netting as still-not-built; this is the place to fix it.

**The floor.** Two floors exist and disagree:

| Floor | Source | Meaning |
|---|---|---|
| `OITW.MinStock` | SAP master data | the warehouse minimum, per warehouse |
| `floor_percent` (35%) of `SalesTrend` | `SupplyChainPolicy` | the business buffer rule from the brief |

`supply_chain.floor_audit()` already reports where they diverge, largest first,
and `floor_convention_audit()` settles whether the floor is additive or
subtractive with evidence. Use the policy floor when a `SalesTrend` exists and
`OITW.MinStock` otherwise — which is what `floor_source` already does — and
**show which floor produced each row**.

### Stage 6 — Turn shortage into a purchase suggestion

Per component, per shortage:

```
need_by        = the shortage-date bucket's start
lead_time_days = measured (OPOR to PDN1) if available, else MaterialLeadTime, else none
order_by       = need_by - lead_time_days                     (working days)
order_qty      = roundup_to_moq( roundup_to_pack_multiple( shortage ) )
supplier       = MaterialLeadTime.supplier_name, else last vendor from POR1/OPOR
value          = order_qty x last purchase price
state          = OVERDUE | ORDER_NOW | SCHEDULED | NO_LEAD_TIME | COVERED
```

`supply_chain.planning.material_alarms()` already produces exactly this shape,
including MOQ rounding and the deliberate decision to rank `NO_LEAD_TIME` above
`SCHEDULED` — a material that cannot be timed is a data gap to chase, not a
low-priority item. **Extend that service; do not write a second one.** The only
additions needed:

1. `need_by` from the Stage 5 shortage date instead of the plan period start.
   `supply_chain`'s docs already flag "required-by is the plan period start for
   every material" as a known limitation — this closes it, and is what lets caps
   be needed later than bottles.
2. `lead_time_days` preferring the **measured** figure, flagged when measured
   exceeds quoted.
3. Pack-multiple rounding alongside MOQ — you cannot buy 3.5 cartons.
4. A **freeze horizon**: if `order_by` is already past by more than the lead time,
   the bucket cannot be bought for at all. Label it `EXPEDITE_ONLY` rather than
   `OVERDUE`, because the action is a phone call, not a purchase order.

Route each line to one owner via `live_trail_actions.build_department_actions()`.

### Stage 7 — The requisition and the SAP write

The only genuinely new integration. Three gates; do not skip to the last.

**Step A — Requisition inside FactoryFlow, no SAP write.**
`PurchaseRequisition` + `PurchaseRequisitionLine`, created from selected
suggestion rows. States `DRAFT` to `SUBMITTED` to `APPROVED` / `REJECTED`. Excel
export using the pattern in `stock_dashboard/views.py::StockDashboardExportAPI`.
This alone delivers most of the value: procurement gets a reviewed, approved,
costed order list with dates and suppliers, and nothing can go wrong in SAP.

**Step B — Post as a SAP Purchase Request.** `/b1s/v1/PurchaseRequests` (`OPRQ` /
`PRQ1`). SAP's native "I need this" document: it appears in the buyer's queue and
a human converts it to a PO. The right first write because a mistake costs a
rejected request, not a commitment to a supplier.

**Step C — Post a real Purchase Order.** `/b1s/v1/PurchaseOrders` (`OPOR` /
`POR1`), only after Step B has been trusted for a cycle and only if the business
explicitly wants it.

**Rules for any of these writes** — copy the patterns the codebase already proved:

- **A simulate flag.** `PLANNING_PURCHASE_SIMULATE_SAP`, defaulting to `DEBUG`,
  exactly as `MARKETPLACE_SIMULATE_SAP` does. Development and demos must never
  reach SAP.
- **Sync fields on the row**, as `ProductionRun` has them: `sap_doc_entry`,
  `sap_doc_num`, `sap_posting_status` (`NOT_POSTED` / `POSTED` / `FAILED`),
  `sap_error_message`, plus a retry endpoint. A failed post must be visible and
  retryable, never silent.
- **Idempotency.** A DB unique constraint on (`requisition_line`,
  `sap_posting_status = POSTED`) plus a client-supplied idempotency key.
  **Posting the same requisition twice must be impossible**, not merely
  unlikely — a duplicated PO is a real financial commitment to a supplier.
- **Approval before post.** Separate permissions for create, approve and post.
  The person who raises it must not be the person who posts it.
- **Branch and series.** `BPL_IDAssignedToInvoice` is already resolved from
  `OWHS.BPLid` in `sap_writer.py`; the document series is a live-SAP
  configuration question for the SAP administrator.
- **The default database is live production data.** No write path is exercised
  against it without explicit authorisation, and no test writes anywhere but
  sqlite.

### What this design deliberately does not do

- **It does not author the plan.** SAP stays the system of record. The revived
  frontend planning module becomes a reader with a what-if overlay, not an editor
  that posts plans back. (`SAPClient.create_production_order()` exists if that
  changes later.)
- **It does not re-derive demand, floor, FG gap or open-PO netting.**
  `sales_planning_requirement` computes those in a HANA procedure. Recomputing
  them would create the second source of truth the whole August brief exists to
  end. Where both can answer a question, report both and show the divergence —
  what `floor_convention_audit()` already does.
- **It does not invent granularity.** If SAP states only a due date, the default
  puts the whole quantity on the due date. A daily number the business never set
  is worse than no daily number.
- **It does not schedule production.** Sequencing SKUs on lines, choosing among
  alternate machines and staging materials by hour is a much larger build.
  Capacity here is a **feasibility check** per bucket, not a schedule.
- **It does not replace the Stock Benchmark or the Live Trail.** It reuses their
  readers and links to their screens for drill-down.

---

## 4. Data model

### Where the code goes

| Concern | Home | New or extended |
|---|---|---|
| Plan ingest, bucketing, plan-vs-actual, requirement explosion | **`production_planning`** (new backend app, reviving the name the frontend already uses) | new |
| Availability, shortage, purchase suggestion, requisition, SAP write | **`supply_chain`** (existing) | extended |
| `PurchaseRequestWriter` / `PurchaseOrderWriter` | **`sap_client/service_layer/`** | new files |
| Plan & Purchase screens | **`src/modules/planning-purchase/`** | new, reusing existing api layers |

Reviving the `production_planning` app label is not cosmetic — the frontend's
`production_planning.can_*` permission strings and its
`/api/v1/production-planning/` endpoint constants already exist and would
otherwise have to be rewritten or deleted.

```
/api/v1/production-planning/     -> production_planning.urls   (new)
/api/v1/supply-chain/            -> supply_chain.urls          (existing, extended)
```

All models are company-scoped by `company_code` (string, as `stock_dashboard`,
`supply_chain` and `sales_planning_requirement` all do) rather than an FK, so a
HANA-sourced row never depends on a local `Company` row existing.

### `PlanSnapshot` — an immutable version of the plan

| Field | Type | Notes |
|---|---|---|
| `company_code` | char, indexed | |
| `source` | enum | `SAP_PRODUCTION_ORDER` / `SAP_FORECAST` / `MANUAL` |
| `source_ref` | char | forecast id/name, blank for orders |
| `horizon_from` / `horizon_to` | date | the window pulled |
| `status` | enum | `RUNNING` / `SUCCESS` / `FAILED` |
| `version` | int | monotonic per company |
| `line_count` | int | |
| `error_message` | text | |
| `refreshed_by` | char | |
| `started_at` / `finished_at` | datetime | |

Partial unique index on (`company_code`) where `status = 'RUNNING'` — one refresh
at a time, enforced by the database; a second concurrent refresh gets an
`IntegrityError` mapped to **409**, as `sales_planning_requirement` does. Plus a
stale-`RUNNING` reaper, defaulting to 2 hours. Reads always target the latest
`SUCCESS` snapshot unless a version is named.

### `PlanLine` — one SKU on one plan

| Field | Type | Notes |
|---|---|---|
| `snapshot` | FK cascade | |
| `sap_doc_entry` / `sap_doc_num` | int, null | `OWOR` identity; null for forecast/manual |
| `item_code` / `item_name` | char | |
| `item_group` | char | from `OITB`, drives the PM/RM split |
| `brand` / `category` / `sub_category` | char | SAP master, for grouping |
| `warehouse_code` | char | the order's production warehouse |
| `planned_qty` | decimal | **canonical unit** |
| `source_qty` / `source_uom` | decimal / char | exactly as SAP stated it |
| `pieces_per_case` | int, null | `OITM.SalFactor2`, snapshotted |
| `litres_per_unit` | decimal, null | for litre-based reporting |
| `start_date` / `due_date` | date | |
| `sap_status` | char | `P` / `R` |
| `completed_qty_at_snapshot` | decimal | `OWOR.CmpltQty` when pulled |
| `raw_payload` | JSONB | the whole SAP row, for audit |

`source_qty` + `source_uom` + the conversion factors kept beside `planned_qty` is
what makes a unit dispute settleable later without re-reading SAP.

### `PlanBucket` — the new piece

| Field | Type | Notes |
|---|---|---|
| `plan_line` | FK cascade | |
| `bucket_type` | enum | `DAY` / `WEEK` / `MONTH` |
| `bucket_start` | date, indexed | day, week's first day, or month's 1st |
| `planned_qty` | decimal | canonical unit |
| `derived` | bool | **false only when SAP stated this exact bucket** |
| `spread_policy` | enum | `DUE_DATE` / `EVEN_WORKING_DAYS` / `CAPACITY_WEIGHTED` |

Unique together: (`plan_line`, `bucket_type`, `bucket_start`).

Invariant worth a test: for any `plan_line`, the sum of `DAY` rows equals the sum
of `WEEK` rows equals the sum of `MONTH` rows equals `planned_qty`. Weeks
straddling a month boundary are where this breaks.

### `FactoryCalendar` and `NonWorkingDay`

| Model | Fields |
|---|---|
| `FactoryCalendar` | `company_code` (unique), `week_start_day` (0-6), `working_days_per_week`, `shifts_per_day`, `carry_forward_scope` (`BUCKET` / `MONTH` / `HORIZON`) |
| `NonWorkingDay` | `company_code`, `date`, `reason`, unique together |

Nothing in the platform has a calendar today. Every weekly boundary, every
working-day spread and every `order_by` date depends on it.

### `PlanAttainment` — the variance ledger

Materialised rather than computed on read, because carry-forward is inherently
sequential and recomputing the chain on every request gets expensive fast.

| Field | Type |
|---|---|
| `company_code`, `snapshot`, `item_code` | |
| `bucket_type`, `bucket_start` | |
| `planned_qty`, `carried_in`, `effective_target` | decimal |
| `actual_qty_app` | decimal — from `ProductionRun.total_production`, converted |
| `actual_qty_sap` | decimal — from `OINM` `TransType = 59` |
| `actual_variance` | decimal — the app-vs-SAP gap, a finding in its own right |
| `variance`, `attainment_pct`, `carried_out` | |
| `line_id` | FK null — `ProductionLine`, when attributable |
| `computed_at` | datetime |

### `MaterialRequirement`

| Field | Type | Notes |
|---|---|---|
| `company_code`, `snapshot` | | |
| `bucket_type`, `bucket_start` | | |
| `component_code` / `component_name` | char | |
| `component_group` | char | `OITB` group name |
| `material_type` | enum | `PACKAGING` / `RAW` / `OTHER`, derived from the group |
| `uom` | char | |
| `qty_per_unit_nominal` | decimal | from `WOR1` / `ITT1` |
| `qty_per_unit_measured` | decimal, null | from `ProductionMaterialUsage` |
| `basis_used` | enum | `NOMINAL` / `MEASURED` |
| `scrap_allowance_pct` | decimal | |
| `required_qty` | decimal | |
| `related_item_codes` | JSONB | the SKUs that drive it |
| `related_doc_entries` | JSONB | the `OWOR` orders that drive it |
| `is_purchased` | bool | `OITM.PrchseItem`; false means it explodes further |

Aggregating by `component_code` across a horizon is the procurement view; keeping
`related_*` makes the drill-down possible without a second query.

### `MaterialAvailability` — the running balance

| Field | Notes |
|---|---|
| `company_code`, `snapshot`, `component_code` | |
| `bucket_type`, `bucket_start` | |
| `opening_qty` | previous bucket's closing; bucket 0 is `OnHand - IsCommited` |
| `on_hand_qty`, `committed_qty` | raw `OITW` values, for transparency |
| `inbound_po_qty` | open `OPOR`/`POR1` lines due in this bucket |
| `inbound_grpo_qty` | receipts in progress |
| `wip_issued_qty` | `WOR1.IssuedQty` already consumed |
| `required_qty` | from `MaterialRequirement` |
| `closing_qty` | |
| `floor_qty`, `floor_source` | `OITW_MINSTOCK` / `POLICY_PERCENT` / `NONE` |
| `shortage_qty` | `max(0, floor_qty - closing_qty)` |
| `is_shortage_bucket` | true on the first bucket that breaches the floor |
| `warehouse_scope` | JSONB — which warehouses were counted |

Storing `warehouse_scope` on the row is what stops the perennial argument about
whether a shortage is real.

### `PurchaseRequisition` (in `supply_chain`)

| Field | Notes |
|---|---|
| `company_code` | |
| `requisition_number` | app-generated, unique per company |
| `snapshot` | FK to `PlanSnapshot`, null for ad-hoc |
| `need_by_from` / `need_by_to` | the horizon covered |
| `status` | `DRAFT` / `SUBMITTED` / `APPROVED` / `REJECTED` / `POSTED` / `PARTIALLY_POSTED` / `CANCELLED` |
| `created_by`, `submitted_at`, `approved_by`, `approved_at`, `rejection_reason` | |
| `total_value` | |
| `sap_document_type` | `PURCHASE_REQUEST` / `PURCHASE_ORDER` |
| `simulated` | bool — true when posted under the simulate flag |

### `PurchaseRequisitionLine`

| Field | Notes |
|---|---|
| `requisition` | FK cascade |
| `component_code` / `component_name` / `material_type` | |
| `shortage_qty` | what the pipeline computed |
| `order_qty` | after MOQ and pack-multiple rounding |
| `uom` | |
| `moq_applied`, `pack_multiple_applied` | decimal, null — show why `order_qty` differs from `shortage_qty` |
| `supplier_code` / `supplier_name` | |
| `lead_time_days`, `lead_time_source` | `MEASURED` / `TEMPLATE` / `NONE` |
| `need_by_date`, `order_by_date`, `alarm_state` | |
| `unit_price`, `line_value`, `price_source` | |
| `sap_doc_entry`, `sap_doc_num`, `sap_line_num` | |
| `sap_posting_status` | `NOT_POSTED` / `POSTED` / `FAILED` |
| `sap_error_message` | |
| `idempotency_key` | char, unique — the duplicate-post guard |
| `related_item_codes`, `related_doc_entries` | JSONB, the evidence trail |

Constraints: `idempotency_key` unique per company; a partial unique index on
(`requisition`, `component_code`) where `sap_posting_status = 'POSTED'`; and the
application rule that a line may only be posted from an `APPROVED` requisition.

### Policy — extend `SupplyChainPolicy`

Prefer extending it over a new model: it already exists, already returns an
unsaved default from `for_company()` so screens work before configuration, and
already holds every neighbouring decision.

| New field | Default | Question it settles |
|---|---|---|
| `plan_source` | `SAP_PRODUCTION_ORDER` | decision 1 |
| `canonical_unit` | `PIECES` | decision 2 |
| `spread_policy` | `DUE_DATE` | decision 3 |
| `carry_forward_scope` | `MONTH` | whether a shortfall expires |
| `availability_warehouses` | JSONB, empty = all | decision 5 |
| `requirement_basis` | `NOMINAL` | decision 9 |
| `scrap_allowance_pct` | 0 | |
| `freeze_horizon_days` | 0 = derive from shortest lead time | |
| `sap_purchase_document` | `PURCHASE_REQUEST` | decision 7 |
| `require_approval_before_post` | `True` | decision 8 |

---

## 5. API

All endpoints require `IsAuthenticated` + `HasCompanyContext` + an app
permission, and map errors the platform way: `SAPConnectionError` to **503**,
`SAPDataError` to **502**, `SAPValidationError` / bad params to **400**,
concurrent refresh to **409**.

Every list endpoint **paginates** (`page`, `page_size`, default 50, hard max
200). Not optional — unpaginated live queries are what got `sap_plan_dashboard`
deleted, and are the top item on the dashboards improvement list.

### Plan — `/api/v1/production-planning/`

| Method | Path | Purpose |
|---|---|---|
| GET | `snapshots/` | list snapshots: version, source, horizon, status, line count |
| POST | `snapshots/refresh/` | pull SAP into a new snapshot; **409** if one is running |
| GET | `snapshots/latest/` | the current successful snapshot + freshness |
| GET | `plan/` | plan lines; filters `snapshot`, `item_code`, `brand`, `category`, `warehouse`, `status`, `search` |
| GET | `plan/calendar/` | **the day/week/month view.** `bucket_type`, `date_from`, `date_to`, `group_by=sku\|line\|brand\|category`; returns buckets + a totals row + `derived` flags |
| GET | `plan/<line_id>/` | one plan line with its buckets and its `WOR1` components |
| GET | `attainment/` | plan vs actual per bucket: planned, carried-in, effective target, actual (app), actual (SAP), variance, attainment %, carried-out |
| GET | `attainment/summary/` | headline tiles: MTD attainment, buckets behind, carried shortfall, app-vs-SAP gap |
| GET | `attainment/export/` | Excel, all filtered rows |
| GET | `requirement/` | material requirement per bucket; filters `material_type`, `bucket_type`, date range, `component_code` |
| GET | `requirement/aggregate/` | **by component across the horizon** — the procurement view, with `related_skus` |
| GET | `requirement/export/` | Excel |
| GET, PUT | `calendar/` | factory calendar and non-working days |
| GET | `dropdown/items/` | SAP item search (already implemented once for the dead module) |
| GET | `dropdown/warehouses/` | |

### Purchase — `/api/v1/supply-chain/`

| Method | Path | Purpose |
|---|---|---|
| GET | `availability/` | time-phased balance per component per bucket: opening, inbound PO, WIP, requirement, closing, floor, shortage |
| GET | `availability/<component_code>/` | one component's full balance chain + per-warehouse breakdown |
| GET | `purchase-suggestions/` | the action list: shortage, order qty, MOQ, supplier, lead time (and source), need-by, order-by, alarm state, value; most urgent first |
| GET | `purchase-suggestions/export/` | Excel |
| POST | `requisitions/` | create a requisition from selected suggestion lines |
| GET | `requisitions/` | list, filter by status |
| GET, PATCH | `requisitions/<id>/` | detail; edit lines while `DRAFT` |
| POST | `requisitions/<id>/submit/` | `DRAFT` to `SUBMITTED` |
| POST | `requisitions/<id>/approve/` | `SUBMITTED` to `APPROVED`, or reject with a reason |
| POST | `requisitions/<id>/post-to-sap/` | post approved lines; idempotent; honours the simulate flag |
| POST | `requisitions/<id>/lines/<line_id>/retry-sap/` | retry one failed line |
| GET | `requisitions/<id>/export/` | Excel |

Existing `supply_chain` endpoints (`dashboard/`, `live-trail/`, `procurement/`,
`capacity/`, `policy/`, `floors/`, `alarms/*`, `reference/*`) stay as they are.
`capacity/` gains an optional `bucket_type` + date range so feasibility can be
checked per week rather than per month.

**Response conventions:** mirror `stock_dashboard` — `{ "data": [...], "meta":
{...} }`, with `meta` carrying `page`, `page_size`, `total_pages`, totals, and —
for anything derived from a snapshot — `snapshot_version`, `refreshed_at`, and a
`reconstruction_note`-style string naming the policy used. `stock_dashboard`'s
as-of endpoint already does exactly this and it is the right habit: **a derived
number always says how it was derived.**

---

## 6. Permissions and frontend

### Permissions

Django permissions on unmanaged sentinel models, following
`stock_dashboard/models.py::StockDashboardPermission`.

**`production_planning`**

| Codename | Grants |
|---|---|
| `can_view_production_plan` | plan, calendar, attainment, requirement |
| `can_refresh_production_plan` | trigger a SAP pull |
| `can_manage_planning_calendar` | edit calendar, non-working days, spread policy |
| `can_export_production_plan` | Excel exports |

The frontend already declares `production_planning.can_view_production_plan`,
`can_create_production_plan`, `can_edit_production_plan`,
`can_delete_production_plan`, `can_post_plan_to_sap` and
`can_manage_weekly_plan`. Since SAP authors the plan, the create/edit/delete/post
ones have no meaning in the read-only design — **either drop them from
[production.permissions.ts](../src/config/permissions/production.permissions.ts)
or keep only `can_post_plan_to_sap`** for a possible future write-back. Leaving
ungrantable permission strings in the config is how a route silently becomes
unreachable.

**`supply_chain`** (new, alongside the existing two)

| Codename | Grants |
|---|---|
| `can_view_purchase_planning` | availability, suggestions |
| `can_create_purchase_requisition` | create and submit |
| `can_approve_purchase_requisition` | approve or reject |
| `can_post_purchase_to_sap` | the SAP write |

Deliberately separate: **create, approve and post must be three permissions**, so
one person cannot raise and commit spend alone. Suggested groups: *Planner*
(view + refresh + export), *Packaging Buyer* / *Oil Buyer* (view + create +
submit), *Procurement HOD* (approve), *Finance* (view + approve above a value
threshold), *SAP Poster* (post).

### Frontend module

New module `src/modules/planning-purchase/`, following the established shape
(`api/`, `components/`, `constants/`, `pages/`, `types/`, `module.config.tsx`),
with TanStack Query hooks in `*.queries.ts` and endpoint constants added to
`src/config/constants/api.constants.ts`.

| Route | Page | Content |
|---|---|---|
| `/planning-purchase` | `PlanningPurchaseLandingPage` | five headline tiles: plan attainment MTD, buckets behind, components short, needs ordering today, plan value. Each coloured only when it needs action, so a healthy month reads quiet — the convention `SupplyChainHeadline` already uses. |
| `/planning-purchase/plan` | `PlanCalendarPage` | day / week / month toggle; rows by SKU (or line / brand); columns are buckets; derived cells visibly marked; snapshot freshness banner |
| `/planning-purchase/attainment` | `PlanVsProductionPage` | the variance ledger with carry-forward; app-vs-SAP actual reconciliation column; drill to `ProductionRun` |
| `/planning-purchase/requirement` | `MaterialRequirementPage` | PM / RM tabs; per-bucket requirement; toggle nominal vs measured basis with divergence shown |
| `/planning-purchase/availability` | `AvailabilityPage` | time-phased balance per component; shortage bucket highlighted; expand to per-warehouse rows |
| `/planning-purchase/purchase` | `PurchaseSuggestionPage` | the action list, urgent first; multi-select to build a requisition; MOQ shown whenever order qty differs from shortage |
| `/planning-purchase/requisitions` | `RequisitionListPage` | list + status |
| `/planning-purchase/requisitions/:id` | `RequisitionDetailPage` | lines, approve/reject, post to SAP, per-line SAP status and retry |

Nav: one sidebar section **Planning & Purchase** with those children, gated on
`can_view_production_plan` OR `can_view_purchase_planning`.

**Reuse rather than rebuild:**

| Need | Reuse |
|---|---|
| Stock drill-down by warehouse | `src/modules/dashboards/stock-level/` — `StockItemDetailPanel`, api, queries |
| Lead time / MOQ / policy / capacity | `src/modules/supply-chain/api/supply-chain.api.ts` |
| Actual production drill-down | production execution reports api |
| Urgency pills, department grouping | `src/modules/supply-chain/components/live-trail/TrailPill.tsx`, `TrailDepartments.tsx` |
| Headline tile pattern | `SupplyChainHeadline.tsx` |
| Excel export | `xlsx` is already a dependency; server-side export mirrors `StockDashboardExportAPI` |
| Charts | `recharts` is already a dependency |

**The existing planning module** — decide explicitly:

- **Recommended:** retarget it. `PlanDetailPage` and `PlanningDashboardPage` are
  close to what the plan reader needs; `WeeklyPlanForm` and `DailyEntryForm`
  become read-only bucket views. Move it under the new module and delete the
  create/edit/post-to-SAP paths.
- **Or:** delete it, its 18 endpoint constants and the six ungrantable permission
  strings. Leaving it is the one option with no upside — routed pages that 404
  against a backend that no longer exists.

---

## 7. Implementation phases

Each phase is shippable and useful on its own. That matters because phase 0 may
turn up facts that change phases 4–6.

### Phase 0 — Verify, before writing anything

Half a day, and it can invalidate parts of this design. Do not skip it.

| # | Check | How | Why it matters |
|---|---|---|---|
| 1 | **Where is the plan in SAP?** | Ask Planning for one plan they created last month and the document it produced. Then read that document. | If it is not `OWOR`, the ingest stage changes shape entirely. |
| 2 | **What unit is `OWOR.PlannedQty`?** | Take one completed order: compare `PlannedQty`, `CmpltQty`, the `ProductionRun.total_production` for it, and `OITM.SalFactor2`. | Decides the canonical unit, and tells you whether the existing plan-vs-production screen is currently lying. |
| 3 | **Do plans carry a date range?** | Check whether `StartDate` differs from `DueDate` on real orders, and whether one order spans weeks. | If every order is single-day, bucketing is trivial. If orders span a month, the spread policy is the whole design. |
| 4 | **Do item groups classify PM vs RM cleanly?** | `SELECT DISTINCT ItmsGrpNam FROM OITB` and check the `PACKAG` / `RAW` / `OIL` rule against reality. | If not, an explicit mapping table is needed instead of substring guesses. |
| 5 | **Is `IsCommited` populated?** | Compare `OnHand` and `IsCommited` on components with open orders. | Net-available is meaningless if the field is always zero. |
| 6 | **Do open POs carry usable due dates?** | Sample `POR1` open lines. | Inbound phasing depends on it; without dates, netting is horizon-wide only. |
| 7 | **Does `ProductionMaterialUsage` have enough history?** | Count rows over the last 90 days per component. | Decides whether measured yield is available now or later. |
| 8 | **Do lead times exist yet?** | `MaterialLeadTime.objects.count()` per company. | `supply_chain`'s own verification run found **zero real rows** — every line on the circulated template was still an example. Order-by dates are inert without them. |

All reads. The default database is the **live** production DB, so run queries
read-only and run any test that writes against sqlite. Output: answers to
decisions 1–6 and a one-page note confirming or correcting this design. Phases
4–6 should not be scoped until it exists.

### Phase 1 — Plan ingest and the calendar

`PlanSnapshot`, `PlanLine`, `FactoryCalendar`, `NonWorkingDay`, a refresh
service, `GET snapshots|plan|calendar`. Reuse `ProductionOrderReader`; add only
what is missing (item group, brand, category from `OITM`/`OITB`). Refresh inside
`transaction.atomic()`. Partial unique index for the one-running-refresh rule.
Canonical-unit conversion at ingest, keeping `source_qty` and `source_uom`.

**Ships:** a plan list with real SAP data, its freshness, and a manual refresh.

**Tests:** conversion correctness for every unit combination; a failed refresh
preserving the old snapshot; concurrent refresh returning 409; a zero-line
snapshot not being mistaken for success.

### Phase 2 — Bucketing: the day / week / month view

`PlanBucket`, the three spread policies, `GET plan/calendar/`,
`PlanCalendarPage`. Start with `DUE_DATE` only — it invents nothing and is right
whatever phase 0 found. Add `EVEN_WORKING_DAYS` next, honouring the calendar.
`CAPACITY_WEIGHTED` last, and only if orders genuinely span ranges. Mark
`derived` on every spread cell and surface it as a visible distinction, not a
tooltip.

**Ships:** the day-wise / week-wise / month-wise plan you asked for.

**Tests:** the sum invariant (day = week = month = line total) including weeks
straddling a month end; a 31-day month producing 5 or 6 week buckets, never 4;
deterministic remainder distribution; non-working days receiving zero; a due date
landing on a non-working day.

### Phase 3 — Plan vs actual

`PlanAttainment`, the carry-forward chain, `GET attainment/` and
`attainment/summary/`, `PlanVsProductionPage`. Both actual sources —
`ProductionRun.total_production` (converted) and `OINM` `TransType = 59` —
reported with the gap. Carry-forward per `carry_forward_scope`.

**Fix `report_service.get_plan_vs_production()`** rather than leaving a second
contradictory screen: convert units, or deprecate it in favour of the new
endpoint. Two screens giving different variance for the same order is worse than
either alone.

**Ships:** day-wise and week-wise attainment with carry-forward.

**Tests:** carry-forward across three consecutive buckets; overproduction
reducing the next carry-in to zero and not going negative; a run with no
`sap_doc_entry` not silently vanishing from actuals; app-vs-SAP divergence
surfacing rather than being averaged away; month-boundary reset.

### Phase 4 — Requirement explosion

`MaterialRequirement`, `GET requirement/` and `requirement/aggregate/`,
`MaterialRequirementPage`. `WOR1` when the plan came from orders, `OITT`/`ITT1`
otherwise. PM/RM split from the item group via a helper shared with
`supply_chain` — one implementation, imported twice. Nominal basis first,
measured behind `requirement_basis` with divergence shown. Stop at purchased
items. Aggregate-by-component from day one.

**Ships:** how much PM and how much RM the plan consumes, per day / week / month.

**Tests:** a component shared by several SKUs aggregating once with all
`related_skus` listed; a missing BOM reported explicitly, never treated as zero
requirement; `IssuedQty` netting for released orders; scrap allowance applied
once, not compounded per level; a two-level BOM (preform to bottle to filled SKU)
not double-counting.

### Phase 5 — Availability and shortage

`MaterialAvailability`, `GET availability/`, `AvailabilityPage`. Reuses
`HanaStockDashboardReader`. Net available, not on hand. Do not inherit the
slow-moving override. Inbound from open `OPOR`/`POR1` by due date plus GRPO in
progress. WIP netting from `WOR1.IssuedQty` — closing a gap `supply_chain`'s own
docs list as unbuilt. Floor from policy where a `SalesTrend` exists,
`OITW.MinStock` otherwise, with `floor_source` on the row. Warehouse scope from
policy, recorded on every row.

**Ships:** how much PM and RM is available, and the date each component runs
short.

**Tests:** the running balance chaining correctly across buckets; an open PO
arriving mid-horizon removing a later shortage but not an earlier one; two
warehouses configured in and one out; a zero `MinStock` falling back to the policy
floor and not to "healthy"; a component with requirement and no stock record at
all.

### Phase 6 — Purchase suggestions

Extends `supply_chain.planning.material_alarms()`. `GET purchase-suggestions/`,
`PurchaseSuggestionPage`. `need_by` from the shortage bucket. Measured lead time
preferred over template, divergence flagged. MOQ and pack-multiple rounding, both
shown. Freeze horizon as `EXPEDITE_ONLY`. Supplier from template, else last
vendor. Value from last purchase price. Department routing via
`build_department_actions()`.

**Ships:** what to buy, how much, from whom, by when, with Excel export. **This
is the point at which the system replaces the spreadsheets, without ever writing
to SAP.** Let it run for a full planning cycle before phase 7.

**Tests:** MOQ rounding a 10-unit shortage up to a 500 MOQ; a material with no
lead time ranking above `SCHEDULED`; measured exceeding quoted being flagged; an
order-by date skipping non-working days; a shortage already covered by an open PO
producing no suggestion.

### Phase 7 — Requisition and the SAP write

Three gates, each a separate release.

- **7a — Requisition, no SAP.** `PurchaseRequisition` + lines, create / submit /
  approve / reject / export. Three permissions: create, approve, post.
- **7b — Post as SAP Purchase Request.** New
  `sap_client/service_layer/purchase_request_writer.py` posting to
  `/b1s/v1/PurchaseRequests`, behind `PLANNING_PURCHASE_SIMULATE_SAP` (defaulting
  to `DEBUG`, as `MARKETPLACE_SIMULATE_SAP` does). Per-line `sap_posting_status`
  / `sap_error_message` / retry, exactly as `ProductionRun` does for goods
  receipts.
- **7c — Post a real Purchase Order.** `purchase_order_writer.py` to
  `/b1s/v1/PurchaseOrders`, only if the business asks and only after 7b has been
  trusted for a cycle.

**Tests:** posting the same requisition twice creating exactly one SAP document
(unique index + idempotency key, tested concurrently); a `DRAFT` or `SUBMITTED`
requisition being refused; one failing line not rolling back the successful ones;
retry after a failure not duplicating; the simulate flag producing synthetic
document numbers and making zero network calls; the approver being a different
user from the creator.

Nothing in 7b or 7c touches the live SAP company until an authorised person says
so, in writing, for that specific company.

### Non-functional work, not optional

| Item | Why |
|---|---|
| **Pagination on every list endpoint** | `sap_plan_dashboard` was deleted for being an unpaginated live query |
| **Snapshot rather than live-query** | Every HANA request opens its own connection, 60 s timeout, no pooling. A heavy query holds a gunicorn worker and the whole app feels slow. |
| **Scheduler registration** | Plan refresh, attainment recompute and alarm send need APScheduler entries. If `runapscheduler` is not running, jobs silently never fire — this has already bitten stock alerts and returnable items. |
| **No implicit page caps in jobs** | The stock-alert job calls its service with no filters and so silently inspects only the worst 50 rows. Any job here must page through the whole set explicitly. |
| **Sanitised error detail** | `inventory_age` leaked raw HANA exception text into API responses. Use the generic messages the other apps use. |
| **Indexes** | `(company_code, snapshot, bucket_type, bucket_start)` on every bucketed table — these are the only access patterns |
| **Company isolation** | Every query scoped by the `Company-Code` header. Never join item codes across `JIVO_OIL` and `JIVO_MART`. |

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **The plan is not in `OWOR`** | Medium | Phase 0 check 1. `plan_source` is a policy field, so the ingest reader is swappable without touching phases 2–6. |
| **Units are wrong somewhere** | **High** — one instance is already in the code | Convert once at ingest, store the factor, display both, make the conversion a tested pure function. |
| **Lead times still do not exist** | **High** — `supply_chain`'s own run found zero real rows | `NO_LEAD_TIME` already ranks above `SCHEDULED` by design. Phases 1–5 work without lead times; only phase 6's dates need them. Chase the sheet in parallel. |
| **Derived daily numbers get treated as commitments** | High | `derived` flag on the row, visible in the UI, plus `DUE_DATE` as the default so no spreading happens unless asked for. |
| **Two screens giving different plan-vs-actual** | High | Fix or deprecate `get_plan_vs_production()` in phase 3. Do not ship a second contradictory number. |
| **Duplicate PO posted to SAP** | Low likelihood, **severe** impact | DB unique constraint plus idempotency key, tested concurrently. Purchase Request before Purchase Order. Simulate flag. Approval separate from posting. |
| **Snapshot goes stale and planners act on old numbers** | Medium | Freshness on every response, a visible banner past a threshold, a scheduled refresh. This exact failure is already documented for `sales_planning_requirement`. |
| **HANA slow or down** | Medium | Snapshots mean reads survive an outage; only refresh fails. 503/502 mapping and the existing "SAP unavailable" banner. |
| **Requirement explodes into thousands of rows** | Medium | Pagination, aggregate-by-component as the default view, `EXPORT_MAX_ROWS`-style caps with the cap disclosed. |
| **Scope creep into scheduling** | High | Stated non-goal. Capacity is a feasibility check per bucket, never a schedule. |

---

## 9. Ideas worth the money

You asked for ideas. In order:

1. **Carry-forward, not just variance.** Missing 2,000 cases in week 1 does not
   disappear — it lands on week 2. Show `plan + carried shortfall` as the real
   week-2 target. Without this, weeks 1–3 each look "90% fine" and the month
   misses by 30%.
2. **Measured yield, not nominal BOM.** `ProductionMaterialUsage` already records
   what was really consumed per run. Explode the plan at *measured* consumption
   per unit and show the two side by side. This is the single biggest source of
   "we bought exactly the BOM and still ran out".
3. **Measured lead time, not quoted lead time.**
   `live_trail_reader.measured_lead_times()` already computes PO-date to
   GRPO-date from `OPOR`/`PDN1`. Order-by dates should use the measured figure and
   flag suppliers whose real lead time exceeds what the reference template claims.
4. **A freeze horizon.** Any bucket closer than the shortest lead time cannot be
   bought for — only expedited. Mark those buckets *frozen* so planners stop
   raising orders that arrive after the line has already run.
5. **Capacity gate before the plan is accepted.** `supply_chain.capacity_check()`
   already converts SKUs to line hours including changeover. Run it per week
   bucket and refuse to publish a plan no line can physically run — say which
   week overflows and by how many hours.
6. **Immutable plan snapshots.** SAP plans get edited. If you compare today's
   actuals to today's plan, "we hit 85% of plan" is unfalsifiable. Snapshot the
   plan at publish, version it, always report against the snapshot.
7. **Shared-component view.** One 26 mm cap runs across a dozen SKUs. Per-SKU
   shortage lists are unbuyable; the aggregated per-component view is the one
   procurement acts on. `_aggregate_procurement` in the deleted
   `sap_plan_dashboard` did exactly this — worth resurrecting.
8. **Route every shortage to one owner.** `live_trail_actions.py` already routes
   issues to Packaging / Raw / Production / Infrastructure / Finance with one
   accountable owner each. Reuse it rather than emitting an ownerless alert list.
9. **The cash number.** Requirement × last purchase price gives Finance the spend
   the plan implies, per week. Nothing in the system tells Finance this today,
   and it is one multiplication away.
10. **What-if on a bucket.** Let a planner change one week's quantity and see the
    purchase list move before committing. That is what makes the screen a tool
    rather than a report.

---

## 10. Decisions needed

The first two are blocking — nothing can be built without them. The rest have
defaults proposed above.

| # | Question | Why it matters |
|---|---|---|
| 1 | **Where in SAP does the plan live?** `OWOR` production orders in Planned status? An `OFCT`/`FCT1` forecast? A user-defined table? | The entire ingest stage. One document number or table name is enough to settle it. |
| 2 | **What unit is the plan quantity in** — cases, bottles/pieces, or litres? | Production is entered in **cases**; the unit of `OWOR.PlannedQty` is unverified. Comparing the two without converting is the current bug. |
| 3 | Bucket spread policy: due-date-only, even across working days, or capacity-weighted? | Changes every daily number. Default proposed: due-date-only, with even-spread opt-in. |
| 4 | Factory calendar: week start day, holidays, working days per month? | The old design split a month into exactly 4 weeks — wrong for any 5-week month. |
| 5 | Which warehouses count as *available* PM/RM? Factory only, or marketplace godowns too? | Changes every shortage number. |
| 6 | Floor rule: `OITW.MinStock`, or the 35% policy floor in `SupplyChainPolicy`? And is 35% of the 3-month *total* or the *monthly average*? | The two floor sources disagree today, and the 35% basis is a **3x difference** still unsettled from the August brief. |
| 7 | Does FactoryFlow post to SAP as a **Purchase Request** (a buyer converts it) or a real **Purchase Order**? Or export-only? | Determines whether a write path is built at all. Strong recommendation: Purchase Request first. |
| 8 | Who approves a requisition before it reaches SAP? | Approval chain and permissions. |
| 9 | Yield allowance: nominal BOM, or measured from `ProductionMaterialUsage`? | Changes requirement by the real scrap rate. |
| 10 | Companies in scope — `JIVO_OIL` only, or `JIVO_MART` / `JIVO_BEVERAGES` too? | The same item code is a **different product** across the Oil and Mart databases; they must never be joined on code. |
