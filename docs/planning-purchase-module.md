# Planning & Purchase — the built module

What ships, where it lives, and what is deliberately not in it. Companion to
[planning-purchase.md](planning-purchase.md), which holds the analysis and the
live-SAP findings (section 0 of that document is the important part — it records
two places the original proposal was wrong).

---

## 1. What it does

Two pages, one chain, all read live from SAP:

```
OFCT / FCT1          the monthly plan planners author in SAP
   |
   |  phase into day / week / month  (this module's arithmetic, marked derived)
   v
plan vs actual       OINM movement type 59 = what SAP says was produced
   |
   |  explode through OITT / ITT1, one level
   v
material requirement aggregated BY COMPONENT, split packaging / raw
   |
   |  net OITW on-hand minus IsCommited, minus open OPOR / POR1
   v
shortage             what actually has to be bought
   |
   v
purchase order       draft -> approve -> post to SAP
```

## 2. Where the code is

### Backend — `planning_purchase` (new app)

| File | What it holds |
|---|---|
| `hana_reader.py` | Every SAP read. Its module docstring is the reference for the four data traps: the plan's real home, the unit, the BOM base quantity, resource lines, and the price. |
| `services/calendar.py` | Day / week / month bucketing and the two spread policies. |
| `services/plan_service.py` | Plans, buckets, actuals, BOM explosion, availability, shortage. |
| `services/purchase_service.py` | Draft → approve → post, and the duplicate-post guard. |
| `models.py` | `PurchaseOrder`, `PurchaseOrderLine`, and the permission sentinel. The plan itself is **not** stored. |
| `views.py` / `urls.py` / `serializers.py` / `permissions.py` | The API. |
| `tests.py` | 64 tests, SQLite. |

Also: `sap_client/service_layer/purchase_order_writer.py` — the platform's first
outbound purchasing write. `config/settings.py` gains
`PLANNING_PURCHASE_SIMULATE_SAP`, `PLANNING_NON_WORKING_WEEKDAYS`,
`PLANNING_WEEK_START_DAY`. Mounted at `/api/v1/planning-purchase/`.

### Frontend — `src/modules/planning-purchase/`

| Route | Page |
|---|---|
| `/planning-purchase` | Plan list — every plan SAP holds, current one highlighted |
| `/planning-purchase/plans/:planId` | Plan detail — day/week/month toggle, spread-policy toggle, plan vs actual per SKU |
| `/planning-purchase/plans/:planId/purchase` | **The purchase page** — requirement, availability, shortage, select and raise orders |
| `/planning-purchase/purchase-orders` | Order list by status |
| `/planning-purchase/purchase-orders/:orderId` | Order detail — approve, post to SAP, per-line evidence |

Sidebar: **Planning & Purchase**, hidden from anyone with no
`planning_purchase.*` permission.

## 3. Permissions

| Codename | Grants |
|---|---|
| `can_view_production_plan` | plans, buckets, requirement, export |
| `can_create_purchase_order` | raise and edit a draft |
| `can_approve_purchase_order` | approve or reject |
| `can_post_purchase_order_to_sap` | create the real SAP document |

Three separate permissions for the last three on purpose: a buyer who holds all
three alone can commit the company's money with nobody else seeing the number.
The backend additionally **refuses to let the author approve their own order**,
because one person can hold two permissions.

Suggested groups: *Planner* (view), *Packaging Buyer* / *Oil Buyer* (view +
create), *Procurement HOD* (approve), *Finance or SAP Poster* (post).

## 4. The rules that matter

**The plan is never stored.** It is SAP's, read on every request. A local copy
would be a second answer to "what are we making this month".

**Every derived figure says so.** SAP holds one monthly number per SKU. Day and
week figures are this module's spread, flagged `derived` on the row and marked
`~` in the UI. `PERIOD_START` is available for anyone who wants only what SAP
actually said.

**The three grains always agree.** Day, week and month sum to the same total,
guaranteed by distributing the rounding remainder rather than rounding each
bucket. A 31-day month starting on a Saturday produces **six** week buckets — the
old design's "divide the month into four weeks" silently lost three days.

**Requirement is aggregated by component, not by SKU.** One cap runs across a
dozen SKUs; a per-SKU shortage list cannot be turned into a purchase order. Every
row keeps the SKUs that drive it, so the number can be checked.

**Shortage nets both stock and open POs.**
`required − (on hand − committed) − open PO qty`, floored at zero. Skipping the
open-PO netting re-orders the same material every cycle until it arrives.

**Resource lines are never purchasable.** `ITT1."Type" = 290` is a conversion
cost, not an item. They are listed so the plan's cost picture is complete.

**Costing uses the item master, never the last PO price.** `POR1."Price"` is in
the purchase unit. The vendor comes from the last PO; the price comes from
`OITM."LastPurPrc"`.

**Posting twice is impossible, not unlikely.** A per-company unique
`idempotency_key`, `select_for_update` across the state check and the post, and a
state machine that only accepts `APPROVED` or `FAILED`. A network timeout leaves
the order un-posted and says SAP may or may not have created it — auto-retrying
into a duplicate commitment is worse than a human check.

**Simulate is the default.** `PLANNING_PURCHASE_SIMULATE_SAP` defaults to
`DEBUG`, exactly as `MARKETPLACE_SIMULATE_SAP` does. A simulated post is recorded
as `simulated` on the row and badged in the UI, so nobody goes looking in SAP for
a document that was never created.

## 5. Verified

**64 backend tests**, SQLite, all passing:

```
python manage.py test planning_purchase --settings=config.sqlite_test_settings
```

They cover the sum invariant across all three grains, the six-week month, the
BOM base-quantity division, open-PO and committed-stock netting, MOQ rounding,
resource-line exclusion, the item-master price rule, the author-cannot-approve
rule, and posting twice.

**Frontend**: zero new type errors (150 before and after — the repo's pre-existing
baseline) and lints clean.

**Live read-only run** against `JIVO_OIL`, plan 43 "AUG PLANNING 26":

```
plans              43 AUG PLANNING 26  2026-08-01..2026-08-31  98 SKUs  3,126,479 PCS
attainment         produced 1,084,419 of 3,126,479 = 34.7%   (month two-thirds through)
no BOM             4 SKUs named  (FG0000442, FG0000448, FG0000451, FG0000452)
month buckets      1, derived=False
week buckets       6, total 3,126,479  -> matches plan
day buckets        26 working days, total 3,126,479 -> matches plan
requirement        247 components | 84 short (73 packaging, 11 raw)
                   5 sub-assemblies flagged | 1 resource line excluded
estimated spend    Rs 72.09 crore
worst shortage     RM0000003 MUSTARD LOOSE OIL
                   needed 1,406,774 LTR | free 11,977 | on PO 420 | short 1,394,377
                   at Rs 135.02/LTR = Rs 18.83 crore | AWL AGRI BUSINESS LIMITED
lead times         0 on file -> every shortage reports NO_LEAD_TIME
```

No SAP write path was exercised against a live company.

## 6. Not built

Stated plainly so nobody assumes otherwise.

- **Carry-forward.** Variance is per bucket; a week-1 shortfall does not roll into
  week 2's target. This is the highest-value next addition.
- **Measured yield.** Requirement uses the nominal BOM.
  `ProductionMaterialUsage` records what was really consumed; nothing reads it.
- **The 35% policy floor.** Availability compares against `OITW.MinStock`, which
  exists only in `BH-PM`. `SupplyChainPolicy.floor_percent` is not wired in.
- **Lead times and MOQ** are read from `supply_chain.MaterialLeadTime`, which has
  **zero rows**. Order-by dates are structurally inert until procurement returns
  that sheet.
- **Multi-level BOM.** One level only. Components that are themselves
  manufactured are flagged and not exploded further.
- **Capacity feasibility.** `supply_chain.capacity_check()` exists but is not run
  per bucket here.
- **Editing a draft's lines in the UI.** The API supports it (`PATCH`); the screen
  does not yet.
- **Plan snapshots.** Everything is read live, so "we hit 85% of plan" is measured
  against today's plan, not the plan as published.

## 7. Before this goes live

1. ~~Run the migration.~~ **Applied 2026-08-24.** Created
   `planning_purchase_purchaseorder`, `planning_purchase_purchaseorderline` and
   four permissions. Nothing existing was touched.

   **Why the app is called `planning_purchase` and not `production_planning`:**
   the deleted predecessor's app label is still live in the database — four
   tables (`production_planning_productionplan` and friends, 110 rows of real
   data between them), four recorded migrations and four content types. Django
   therefore saw this module's `0001_initial` as already applied and
   `migrate` reported "no planned migration operations", so its tables and
   permissions were silently never created — which is why the sidebar entry
   never appeared. Renaming the app was the fix; fake-zeroing the old history
   was not an option with live data attached to it.

   Those four orphan tables are still there. Cleaning them up is a separate
   decision that needs whoever owns that data.
2. **Create the groups** and assign the four permissions. Nobody sees the module
   until they hold at least one.
3. **Confirm the working calendar** with Production: Mon–Sat with Sunday off, and
   a Monday week start, are assumptions.
4. **Decide on Purchase Order vs Purchase Request** before turning simulate off.
   A Purchase Request needs a buyer to convert it, so a mistake costs a rejected
   request rather than a commitment to a supplier.
5. **Chase the lead-time sheet.** Every order-by date depends on it.
6. **Fix or retire `report_service.get_plan_vs_production()`** — it compares cases
   against pieces and its variance numbers are wrong today. This module's
   attainment view supersedes it.
