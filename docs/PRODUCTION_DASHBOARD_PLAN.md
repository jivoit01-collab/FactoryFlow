# Production Dashboard — Deep Plan & Metric Report

> **Status:** Planning only. No implementation in this document.
> **Goal:** A **company-aware** Production dashboard — when the selected company is **Oil** it shows the Oil production view, when **Beverages** it shows the Beverages view — that exposes production economics and performance from the **smallest unit (per bottle / per case)** up to **plant / company level**, with everything drillable.

---

## 1. The core ask, restated

You want one production dashboard that:
1. **Switches by company** — Oil → oil dashboard, Beverages → beverages dashboard (same shell, different emphasis/products/benchmarks).
2. Shows **deep, granular economics** — the headline example is **per-bottle cost**, and generally "small-to-small and big-to-big": drill from a single unit → a run → a line → a day → a month → the whole plant.
3. Collects **every meaningful signal** the production system already captures (cost, OEE, downtime, waste, yield, quality, resources, manpower, plan adherence).

This report defines **what to show**, **where each number comes from**, the **per-bottle costing model** (and the one prerequisite it needs), the **Oil vs Beverages** differences, the **dashboard structure**, and the **gaps** to close.

---

## 2. Company-aware behaviour (Oil vs Beverages)

**How the app knows the company** (already in place):
- `useAuth().currentCompany` → `{ company_id, company_name, company_code, role, is_default, is_active }`.
- Every API call is auto-scoped by the `Company-Code` header (api client injects `currentCompany.company_code`).
- On switch, `queryClient.clear()` runs → all company-scoped queries refetch automatically. The header company switcher and `CompanySelectionPage` drive this.

**How the dashboard branches** — there is **no hardcoded company registry today**, so we introduce one config:
```
COMPANY_VARIANT: Record<company_code, {
  key: 'oil' | 'beverages' | 'generic',
  label, accent, unitNoun ('bottle' | 'pack' | 'unit'),
  benchmarks: { targetOee, targetCostPerUnit, targetWastePct, ... },
  featured: which panels/KPIs to emphasise
}>
```
- Read `currentCompany.company_code` → pick the variant → the **same dashboard shell** renders with variant-specific product framing, unit noun (bottle vs pack), colour, and benchmark lines.
- **Important reality:** in the data model, Oil vs Beverages is **not a typed field** — it's implicit in the `product` string, the `line`, and the SAP item. So the variant config is a *presentation + benchmark* layer; the underlying data is already company-filtered by the header. No backend company flag is needed.

---

## 3. The metric hierarchy — "small to small, big to big"

The dashboard is organised as a **drill ladder**. Each level rolls up from the one below and every KPI links down.

```
Level 0 — PER UNIT        per bottle / per case: cost, resource use, waste, yield  ← the deepest view
Level 1 — PER RUN         one ProductionRun: output, OEE, cost breakdown, QC, downtime
Level 2 — PER LINE/SHIFT  a line on a day/shift: throughput, OEE, cost/unit, manpower
Level 3 — PER DAY         all runs that day: production, avg OEE, cost/unit, waste
Level 4 — PER MONTH       monthly rollup: trend of OEE, cost/unit, waste, plan adherence
Level 5 — PLANT / COMPANY the whole company: totals, benchmarks, best/worst lines & SKUs
```

The dashboard **opens at Level 5** (company summary) and lets you drill to Level 0 (a single unit's economics).

---

## 4. Per-unit / Per-bottle economics (the headline)

### 4.1 What exists today
- Output is measured in **cases** (`ProductionRun.total_production`, `ProductionSegment.produced_cases`, `rated_speed` in cases/hr).
- `ProductionRunCost` already stores **`per_unit_cost = total_cost / total_production`** — i.e. **cost per case**, plus the full category breakdown: `raw_material_cost`, `labour_cost`, `machine_cost`, `electricity_cost`, `water_cost`, `gas_cost`, `compressed_air_cost`, `overhead_cost`.

### 4.2 The per-BOTTLE gap (must decide)
There is **no `units_per_case` / case-pack field** anywhere in the models, and no bottle/litre normalisation. So **"per bottle" is not directly available** — only per case. To get per-bottle we need **bottles = cases × units_per_case**. Options to source `units_per_case`:
- **(a) From the SAP BOM** — the bottle/pre-form component's `PlannedQty` per case in the production order BOM (WOR1) implies units per case. Derivable but needs a rule per product.
- **(b) Add a config field** — extend `LineSkuConfig` (which already has `sku_code`, `sku_name`, `rated_speed`) with `units_per_case`. Cleanest, explicit, per-SKU.
- **(c) A product master** — a small SKU master mapping item_code → pack size (bottle ml, units/case). Best long-term.

**Recommendation:** add `units_per_case` (and optional `unit_volume_ml`) to `LineSkuConfig` / a light SKU master. Then:
```
cost_per_bottle   = per_unit_cost (per case) / units_per_case
bottles_produced  = total_production (cases) × units_per_case
cost_per_litre    = total_cost / (bottles × unit_volume_ml / 1000)   // if volume known
```

### 4.3 The per-bottle cost card (what it shows)
A single **"Per bottle" panel** decomposing the unit cost into a waterfall / stacked bar:

| Component | Source | Notes |
|---|---|---|
| Raw material / concentrate | `ProductionRunCost.raw_material_cost` | ⚠ see gap §9 — currently ~0 unless material `unit_cost` populated |
| Packing (bottle, cap, label, carton) | part of raw_material via BOM | separate if BOM components are categorised |
| Labour | `labour_cost` (ResourceLabour: workers×hours×rate) | |
| Machine | `machine_cost` (ResourceMachineCost: hours×rate) | |
| Electricity | `electricity_cost` (units×rate) | |
| Water | `water_cost` (volume×rate) | beverages-heavy |
| Gas | `gas_cost` | |
| Compressed air | `compressed_air_cost` | filler/capper |
| Overhead | `overhead_cost` (flat amounts) | |
| **= Total per bottle** | `total_cost / bottles` | headline number |

Plus, on the same panel: **per-bottle resource intensity** (ml water / bottle, Wh electricity / bottle, g scrap / bottle) — all derivable from the Resource* consumption fields divided by bottles.

---

## 5. Full metric catalogue (by domain)

Everything below is **already captured** in the data model unless flagged. Grouped by theme; each is a candidate KPI/chart.

### 5.1 Output & throughput
- Cases produced, **bottles produced** (×units_per_case), planned vs actual (`required_qty` / SAP `PlannedQty` vs `total_production`), **achievement %** (from plan-vs-production report).
- Throughput = cases/hr actual vs `rated_speed`; **speed-loss %**.
- Runs count, completed vs in-progress/draft (`status`).

### 5.2 Cost (the depth you asked for)
- **Per bottle / per case cost** (total + each of the 8 categories) — from `ProductionRunCost`.
- **Cost distribution** (% split across the 8 categories) — cost-analysis report `cost_distribution`.
- Cost/unit **trend** (daily, monthly) — cost-analysis `trend`, monthly-summary `cost_per_unit`.
- Cost/unit **by line** and **by SKU** — cost-analysis `by_line`; SKU via `product`/`LineSkuConfig`.
- **Resource cost per case** — resource-consumption report `cost_per_case`, `avg_cost_per_case`.
- Best vs worst run/line/SKU by cost/unit (benchmark vs company target).

### 5.3 OEE & downtime
- **OEE** and its three factors **Availability / Performance / Quality** — computed (oee, oee-trend, per_run_oee).
- OEE **trend** (daily/weekly/monthly) and **by line** — oee-trend report.
- **Downtime Pareto** by cause/category, by machine — downtime-pareto report.
- **MTBF / MTTR** — downtime-pareto summary.
- Breakdown count, total breakdown minutes, unrecovered breakdowns (`is_unrecovered`).
- ⚠ Available time is a **hardcoded 720 min/run** — flag; ideally shift/planned-time based (§9).

### 5.4 Waste & scrap
- Waste qty by material, by reason, by approval status — waste-trend report.
- **Waste vs production %** — waste-trend summary.
- Approval funnel (Engineer → AM → Store → HOD) and approval rate (`wastage_approval_status`).
- Material-usage wastage = opening + issued − closing (`ProductionMaterialUsage.wastage_qty`).
- **Scrap per bottle** (waste qty / bottles).

### 5.5 Quality
- **First-pass yield / quality %** = (total_production − rejected_qty) / total_production.
- Rejected & reworked qty (`rejected_qty`, `reworked_qty`).
- **In-process QC** pass/fail by parameter (`InProcessQCCheck`: parameter, min/max, actual, result).
- **Final QC** result (PASS/FAIL/CONDITIONAL) + parameter table (`FinalQCCheck.parameters` JSON).
- **Line clearance** status & checkpoint pass rate (`LineClearance` / `LineClearanceItem`).
- Machine checklist compliance (`MachineChecklistEntry` OK/NOT_OK).

### 5.6 Resources (consumption intensity)
- Electricity units, water volume, gas, compressed air, labour hours, machine hours — Resource* models.
- **Per-bottle intensity** for each (ml/bottle, Wh/bottle …) — the "small-to-small" resource view.
- Daily resource consumption trend — resource-consumption report `daily_data`.

### 5.7 Manpower & time
- Worker count, supervisor, engineer by shift (`ProductionManpower`, shifts MORNING/AFTERNOON/NIGHT).
- **Labour productivity** = bottles / labour-hour; manpower cost / bottle.
- Running minutes vs breakdown minutes split (`total_running_minutes` / `total_breakdown_time`).

### 5.8 Plan adherence & materials
- Plan vs production per SAP order (planned, actual, variance, achievement %, status).
- **Procurement vs planned vs consumed** per BOM component (procurement-vs-planned report).
- SAP sync status of receipts (`sap_sync_status`, `sap_receipt_doc_entry`) — how much production is posted to SAP.

---

## 6. Oil vs Beverages — what each variant emphasises

Same shell, different featured panels / benchmarks / unit noun:

| Aspect | **Oil** | **Beverages** |
|---|---|---|
| Unit noun | bottle / pouch / tin (from pack size) | bottle / can / pack |
| Cost drivers to feature | **raw material (oil)** dominates → feature material cost/bottle & yield | **water + packing + energy** → feature water cost, ml-water/bottle, energy/bottle |
| Resource panel | electricity, machine, overhead | **water & compressed air** prominent (filling/carbonation) |
| Waste focus | oil wastage (high value) | packaging scrap, fill-loss |
| Throughput unit | cases/hr, kg or litres filled | cases/hr, bottles/hr |
| Benchmarks | oil cost/bottle target, yield target | cost/bottle, water-per-bottle, OEE target |

The **variant config** (§2) holds these choices; the metrics themselves come from the same endpoints, filtered by the selected company.

---

## 7. Dashboard structure (proposed layout)

**Route:** `/dashboards/production` (a new company-aware page in the Dashboards module), plus keep the existing `/production/execution/reports/*` deep reports as drill targets.

**Header** — title + company badge (Oil/Beverages) + a **date-range** control (reuse `useGlobalDateRange` + `DateRangePicker`) + line/SKU filter. Live-ish (poll or refetch).

**Tier 1 — Company summary (opens here):**
- KPI strip (`KpiStat`): **Cost / bottle**, **OEE %**, **Bottles produced**, **Plan achievement %**, **Waste %**, **Quality (FPY) %**.
- Each KPI vs its variant **benchmark** (target line / delta).

**Tier 2 — Economics (the per-bottle depth):**
- **Per-bottle cost waterfall / stacked bar** (8 categories) with the total.
- **Cost/unit trend** (line) + **cost distribution** (donut) + **cost/unit by line & by SKU** (bars).
- Per-bottle **resource intensity** tiles (water, electricity, scrap per bottle).

**Tier 3 — Performance:**
- **OEE trend** + A/P/Q breakdown; **OEE by line** (bars).
- **Downtime Pareto** + MTBF/MTTR; breakdown by machine.

**Tier 4 — Quality & waste:**
- FPY %, rejections/rework; QC pass-rate by parameter; line-clearance status.
- Waste trend by material/reason; waste-vs-production %; approval funnel.

**Tier 5 — Plan & material:**
- Plan vs production (planned/actual/variance) per SAP order.
- Procurement vs planned vs consumed per component; SAP-post coverage.

**Tier 6 — Drill tables:**
- Runs table (date, line, SKU, output, OEE, cost/bottle, waste, QC) → click a run → run detail (existing `runs/:runId`, `yield`, cost).
- **SKU league table**: cost/bottle, OEE, waste per SKU — best/worst.

Reuse `KpiStat` + `ACCENTS` + **recharts** (the production report pages currently use CSS bars — this dashboard should use recharts, matching the dispatch dashboards).

---

## 8. Data-source map (metric → where it comes from)

All endpoints under `api/v1/production-execution/`, all auto company-scoped. (No new backend needed except the per-bottle prerequisite in §9.)

| Panel | Endpoint / model | Key fields |
|---|---|---|
| Cost/bottle, category split, distribution | `reports/analytics/cost-analysis/` + `ProductionRunCost` | `per_unit_cost`, 8 category costs, `cost_distribution`, `avg_per_unit` |
| Cost/unit monthly trend | `reports/analytics/monthly-summary/` | `months[].cost_per_unit`, category breakdown |
| Resource per case + trend | `reports/analytics/resource-consumption/` | `daily_data[]`, `cost_per_case`, `avg_cost_per_case` |
| OEE + A/P/Q + per run | `reports/analytics/oee/`, `oee-trend/` | `per_run_oee[]`, `trend[]`, `by_line[]` |
| Downtime Pareto, MTBF/MTTR | `reports/analytics/downtime-pareto/` | `pareto[]`, `by_machine[]`, `summary.mtbf/mttr` |
| Waste | `reports/analytics/waste-trend/` | `by_material[]`, `by_reason[]`, `by_approval_status[]`, `waste_vs_production_pct` |
| Plan vs actual | `reports/analytics/plan-vs-production/` | `planned_qty`, `actual_production`, `variance`, `achievement_pct` |
| Procurement vs planned | `reports/analytics/procurement-vs-planned/` | BOM `planned/procured/consumed` |
| Output totals / availability | `reports/analytics/` | `total_runs`, `total_production`, breakdown mins, availability |
| Runs list | `reports/daily-production/` | run rows |
| Run yield / detail | `reports/yield/<run_id>/`, `runs/<run_id>/cost/`, `.../qc/*` | materials, runtimes, manpower, QC |
| Bottles = cases × pack | **new** `units_per_case` (see §9) | derive bottles from cases |

Existing frontend hooks to reuse: `useCostAnalysisReport`, `useMonthlySummaryReport`, `useResourceConsumptionReport`, `useOEETrendReport`, `useDowntimeParetoReport`, `useWasteTrendReport`, `usePlanVsProductionReport`, `useProcurementVsPlannedReport`, `useDailyProductionReport`, `useYieldReport` (all in `execution/api/execution.queries.ts`).

---

## 9. Gaps & prerequisites (must address for true depth)

1. **Per-bottle needs `units_per_case`** — not stored. Add to `LineSkuConfig` or a SKU master (§4.2). Until then, the dashboard shows **cost/case** and labels it honestly, with per-bottle as "case ÷ pack" once configured.
2. **Raw-material cost is effectively ₹0 today** — `recalculate_run_cost` reads `unit_cost`/`total_cost` off `ProductionMaterialUsage`, but those fields **don't exist** on the model. So material cost (the biggest driver, especially for Oil) is missing. Fix: add `unit_cost` to material usage (or pull material rates from SAP) so `raw_material_cost` is real. **This is the single most important fix for a costing dashboard.**
3. **OEE available time is hardcoded 720 min/run** — availability is distorted for non-720-min shifts. Ideally derive from planned/shift time.
4. **No pre-aggregation** — all analytics compute on request. For a heavy company-wide dashboard, either lean on the persisted `ProductionRunCost` + run summary fields, or add a materialized daily rollup + refresh (mirror the pattern used elsewhere) for speed.
5. **Product/SKU identity is a free-text string** (`ProductionRun.product`) — SKU league tables and Oil/Beverages splits are only as clean as that string. A light SKU master (item_code → name, category oil/beverage, pack size) would make company variants and SKU analytics robust.

---

## 10. Phased delivery

| Phase | Scope |
|---|---|
| **0. Contracts & variant config** | Company-code → variant map (Oil/Beverages: unit noun, accent, benchmarks); confirm per-bottle source (`units_per_case`). |
| **1. Company summary (Tier 1)** | KPI strip from existing endpoints (cost/unit, OEE, output, plan %, waste %, FPY), company-branched. Fast — reuses hooks. |
| **2. Economics (Tier 2)** | Per-bottle cost waterfall + distribution + cost/unit trend + by line/SKU + resource intensity. Needs §9.1–9.2 for real per-bottle. |
| **3. Performance + Quality + Waste (Tiers 3–4)** | OEE trend/Pareto/MTBF, FPY/QC, waste trend — reuse reports. |
| **4. Plan/material + drill tables (Tiers 5–6)** | Plan vs actual, procurement, runs & SKU league tables → drill to run detail. |
| **5. Backend depth fixes** | Real raw-material cost, `units_per_case`, shift-based OEE time, optional daily materialization. |

---

## 11. Open questions (decide before building)

1. **Per-bottle source:** add `units_per_case` to `LineSkuConfig`, or derive from BOM, or build a SKU master? (Recommend SKU master for clean Oil/Beverages + pack sizes.)
2. **Raw-material cost:** where do material rates come from — SAP item cost, GRPO cost, or a manual `unit_cost`? (Blocks a truthful cost/bottle.)
3. **Variant identification:** map by `company_code` only, or also split SKUs into oil/beverage categories within a company?
4. **Freshness:** how live must it be — on-demand per date range, or polled? Do we need a materialized daily rollup for speed?
5. **Bottle vs litre vs kg:** for Oil, is the meaningful unit a bottle, a tin, or kg/litre filled? (Affects the unit noun and per-unit maths.)
6. **OEE time base:** keep 720 min, or move to real shift/planned time?

---

## 12. Summary

- **Company-aware** is easy structurally (branch on `currentCompany.company_code`; data is already company-scoped) — it's a **presentation + benchmark** variant, since Oil/Beverages isn't a typed field.
- The system **already captures almost everything** for a deep dashboard: full **cost breakdown + per-unit cost**, OEE/A/P/Q, downtime Pareto/MTBF/MTTR, waste, yield, QC, resources, manpower, plan adherence — exposed through a rich set of **existing report endpoints** you can reuse directly.
- The **"per bottle"** headline needs **one prerequisite** (`units_per_case`) and, for it to be *true*, the **raw-material cost fix** (§9.2) — without which cost/bottle understates the biggest driver.
- Structure it as a **drill ladder** (company → month → day → line → run → unit) opening at company summary, with a dedicated **per-bottle economics** panel as the centrepiece.
- **Start with:** the variant config + Tier-1 KPI strip (reusing existing hooks), then the per-bottle economics once `units_per_case` and material cost are sorted.
