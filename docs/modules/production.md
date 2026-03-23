# Production Module

The Production module manages the end-to-end production lifecycle at the factory — from sales projection-based planning and material acquisition through manufacturing, quality control, and post-production activities (barcoding, godown transfer). It also covers maintenance, labour management, wastage tracking, and reporting.

## Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION MODULE                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  1. Planning              Sales Projection → Weekly/Monthly Plans → MO            │
│  2. Material Acquisition  BOM-based material issue from Store via SAP             │
│  3. Pre-Production        Purging + Line Clearance (mandatory before start)       │
│  4. Production            Manufacturing execution on production lines             │
│  5. QC (In-Process)       Regular checks, hourly sampling, hold/reject process    │
│  6. Return & Wastage      Material return, wastage verification, yield reporting  │
│  7. Post Production       Barcoding (inline), FG transfer to Godowns              │
│  8. Maintenance           Preventive (Sunday), predictive & breakdown             │
│  9. Labour                Fixed per SKU, contractor management                    │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Sub-Modules

| # | Sub-Module             | Description                                                     | Status   |
|---|------------------------|-----------------------------------------------------------------|----------|
| 1 | Planning               | Sales projection → Monthly/Weekly plan → MO creation            | Core     |
| 2 | Material Acquisition   | BOM-based material issue from Store via SAP                     | Core     |
| 3 | Pre-Production         | Purging & Line Clearance documents (mandatory)                  | Core     |
| 4 | Production             | Manufacturing execution, changeovers, line operations           | Core     |
| 5 | QC (In-Process)        | In-line quality checks, hold/reject workflow                    | Core     |
| 6 | Return & Wastage       | Material return, wastage verification, yield calculation        | Core     |
| 7 | Post Production        | Inline barcoding & Godown transfer (PF/BC/Gupta)               | Core     |
| 8 | Maintenance            | Preventive (Sunday), predictive, breakdown maintenance          | Core     |
| 9 | Labour                 | SKU-wise fixed labor allocation, contractor management          | Core     |

---

## Production Flow

The complete end-to-end production flow with responsible personnel:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            PRODUCTION FLOW                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────────────────┐                                                     │
│  │  1. SALES PROJECTION     │──── Head Office (Sales Managers)                    │
│  │     (Planning Input)     │     Previous year sales + current orders             │
│  └──────────┬───────────────┘     Advance payment required before order            │
│             │                                                                     │
│             ├──► Monthly Projection (week-wise split)                              │
│             ├──► Weekly Planning                                                   │
│             └──► Order-wise Planning                                               │
│             │                                                                     │
│             ▼                                                                     │
│  ┌──────────────────────────┐                                                     │
│  │  2. PRODUCTION PLAN      │──── Arshpreet (Planning) / Raju VJ (Budget)         │
│  │     (MO Creation)        │     Bulk liters → SKU conversion by production      │
│  └──────────┬───────────────┘     Currently Excel, moving to SAP (MRP)            │
│             │                                                                     │
│             ▼                                                                     │
│  ┌──────────────────────────┐                                                     │
│  │  3. MATERIAL PURCHASE    │──► Store ──► Kulbir VJ ──► 30% RM/PM buffer         │
│  │     (Pre-Production)     │     Physical verification weekly                     │
│  └──────────┬───────────────┘     Shortage → Purchase Dept → Vendor                │
│             │                                                                     │
│             ├──► Stock Report (PM Godown + RM Godown)                              │
│             ├──► SAP: BOM check (what's needed vs what's in stock)                 │
│             │                                                                     │
│             ▼                                                                     │
│  ┌──────────────────────────┐                                                     │
│  │  4. MATERIAL ISSUE       │──► Shahrukh (Store Team)                            │
│  │     (BOM-based Issue)    │     SAP request → Approve → Issue                    │
│  └──────────┬───────────────┘     Tomorrow's requirement sent today                │
│             │                                                                     │
│             ▼                                                                     │
│  ┌──────────────────────────┐                                                     │
│  │  5. PRE-PRODUCTION       │──► Quality Department                                │
│  │     (Line Preparation)   │     Purging Document (oil variety/color check)       │
│  │                          │     Line Clearance Document (no foreign particles)   │
│  └──────────┬───────────────┘     ~1 hour for both documents                       │
│             │                                                                     │
│             ▼                                                                     │
│  ┌──────────────────────────┐                                                     │
│  │  6. PRODUCTION           │──► Vicky VJ (Oil) / Raju VJ (Bottling + Budget)     │
│  │     (Manufacturing)      │     Changeover: 30–45 min per SKU switch             │
│  │                          │     Target: 1 SKU per day                            │
│  └──────────┬───────────────┘                                                     │
│             │                                                                     │
│             ├──► QC: Regular line checks + hourly chemist samples                  │
│             ├──► Barcoding: Inline (box + pallet level)                            │
│             │                                                                     │
│             ▼                                                                     │
│  ┌──────────────────────────┐                                                     │
│  │  7. RETURN / WASTAGE     │──► Jasmeet VJ (Wastage Verification)                │
│  │                          │     Weigh → Excel → SAP Entry → Approve              │
│  └──────────┬───────────────┘                                                     │
│             │                                                                     │
│             ├──► Yield Report (% loss calculation)                                 │
│             ├──► RCA & CAPA (for rejections/breakdowns)                            │
│             │                                                                     │
│             ▼                                                                     │
│  ┌──────────────────────────┐                                                     │
│  │  8. POST PRODUCTION      │──► Godown Transfer (separate team)                   │
│  │     (FG Storage)         │                                                     │
│  │                          │     ┌──► PF Godown (Production Floor)               │
│  │                          │     │     Pouch + Tin, Day Storage                   │
│  │                          │     ├──► BC Godown (Basement) — E-commerce           │
│  │                          │     └──► Gupta Godown — GT (General Transport)      │
│  └──────────────────────────┘                                                     │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Department Responsibilities

| Department               | Responsible Person(s)       | System        | Notes                                         |
|--------------------------|-----------------------------|---------------|-----------------------------------------------|
| Planning (Projection)    | Arshpreet                   | Excel → SAP   | Receives HO projection, approves plans        |
| Planning (Budget)        | Raju VJ                     | FactoryFlow   | All budgets, payments, cost approvals         |
| Pre-Production (Store)   | Kulbir VJ                   | SAP           | Material purchase, 30% buffer, stock reports  |
| Store Issue              | Shahrukh                  | SAP           | BOM-based store issue, daily stock            |
| Production (Oil)         | Vicky VJ                    | FactoryFlow   | Oil sourcing, backend oil monitoring          |
| Production (Bottling)    | Raju VJ                     | FactoryFlow   | Bottling process, production planning         |
| Production Clearance     | Vicky VJ                    | FactoryFlow   | Line clearance, changeovers                   |
| Quality (Pre-Production) | Quality Department          | FactoryFlow   | Purging & Line Clearance documents            |
| Quality (In-Process)     | Quality Chemist + Line Team | FactoryFlow   | Hourly samples, regular line checks           |
| Return / Wastage         | Jasmeet VJ                 | SAP           | Wastage verify, weigh, Excel, SAP entry       |
| Maintenance              | Abhimanyu / Sanjay          | FactoryFlow   | Electrical, mechanical, PM schedule           |
| Consumables              | Store (4th Floor)           | SAP           | Ink, lubrication, make-up, wash solution      |
| Labour (Planning)        | Raman Maan                  | FactoryFlow   | SKU-wise labor sheet, per-point allocation    |
| Labour (Contractors)     | Gautam / Vicky VJ           | FactoryFlow   | Contractor management, external labor         |

---

## Sub-Module Details

### 1. Planning

Production planning is driven by sales projections from Head Office.

**Planning Input Sources:**
1. **Sales Projection** — Monthly projection from HO (sales managers), split week-wise
2. **Previous Year Sales** — Same month from previous year used as baseline
3. **Current Orders** — Active orders with advance payment confirmed

**Planning Types:**
- **Monthly Planning** — Full month projection received from HO
- **Weekly Planning** — Week-wise breakdown of monthly plan
- **Order-wise Planning** — Specific customer order-based planning

**How Quantity Works:**
- HO specifies bulk quantity in liters (e.g., "1 lakh liter Mustard Oil")
- Production team converts bulk liters into SKU/bottle breakdown
- Plus/minus adjustments allowed during conversion

**Flow:**
```
Head Office (Sales Managers)
        │
        ├──► Sales Projection (monthly, week-wise split)
        ├──► Previous year same-month sales data
        └──► Current orders (advance payment confirmed)
        │
        ▼
Factory Planning Team (Arshpreet)
        │
        ├──► Approve weekly/monthly plan
        ├──► Convert bulk liters → SKU breakdown
        └──► Distribute plan to production team
        │
        ▼
Manufacturing Order (MO) ──► Production Line
```

**Current State:** Excel-based. Moving toward SAP integration where MRP (Material Requirements Planning) will auto-run and check RM, PM, and FG stock levels against BOM.

**Responsible:** Arshpreet (Planning approval), Raju VJ (Budget), Vicky VJ (Oil procurement)

---

### 2. Material Acquisition (Pre-Production)

BOM-based material procurement and issue from Store.

**Inventory Buffer Rules:**
- **RM/PM Buffer:** Minimum 30% inventory always maintained
- **FG Buffer:** 10% inventory maintained (also 3–5 days FG buffer for sales continuity)
- **Material Lead Buffer:** 15 days buffer (accounts for delivery lead times)
- As 30% buffer is consumed, remaining 70% is purchased based on demand

**Flow:**
```
Production Plan (approved)
        │
        ▼
Store Team (Kulbir VJ)
        │
        ├──► Check current stock report (PM Godown + RM Godown)
        ├──► SAP BOM check: what's needed vs what's in stock
        ├──► Weekly physical verification (system vs actual)
        │
        ├──► If short ──► Purchase Dept ──► Vendor ──► Material arrives
        │
        ▼
Stock Ready for Issue
```

**Physical Verification:**
- Weekly physical stock count by store team (Kulbir VJ)
- Resolves system vs physical stock mismatches
- Reports shortages to Purchase Department

**SAP Integration:**
- BOM auto-calculates material requirements (pre-forms, caps, labels, etc.)
- Stock levels checked in SAP before purchase
- Purchase requisitions created in SAP
- All material movements recorded in SAP

**Responsible:**
- Material Purchase & Stock: Kulbir VJ
- Physical Verification: Store team (under Kulbir VJ)

---

### 3. Material Issue (Store to Production)

Daily material issue from store to production line.

**Flow:**
```
Production Team
        │
        ├──► Send tomorrow's requirement today (via SAP)
        │
        ▼
Store Team (Shatrughna)
        │
        ├──► Receive SAP request
        ├──► Approve request
        ├──► Issue material from store
        └──► Record in SAP
```

**Key Points:**
- Daily stock taken
- Next day's production requirement charged one day in advance
- SAP request → Approval → Material issue
- Every material movement recorded in SAP

**Responsible:** Shatrughna (Store Team)

---

### 4. Pre-Production (Line Preparation)

Two mandatory documents must be signed before any production line starts. Line will NOT run until both are cleared.

**Document 1: Purging**
- Oil variety/color check
- Verifies the correct oil type is loaded
- Color match verification (very rare to have mismatches)
- Signed by production + quality

**Document 2: Line Clearance**
- No abrasive particles, dust, or foreign material on the line
- No material from previous product remaining on line
- Only the current product's materials should be present
- Signed by production + quality

**Time Required:** ~1 hour for Purging + Line Clearance combined.
- Lighter oil transitions (e.g., Pomace → Sunflower) take less time as both are "light" oils.

**Quality Gate:** Quality chemist checks sample after line clearance; line does not start until quality gives "OK."

**Responsible:** Quality Department (records under quality), Production team (execution)

---

### 5. Production (Manufacturing)

Core manufacturing execution on production lines.

**Key Roles:**
- **Vicky VJ** — Oil side: monitors oil coming from backend, checks oil availability against projection, handles oil procurement decisions
- **Raju VJ** — Bottling process, production planning, budget control for entire line (maintenance, labor, material costs). End control authority for all payments and approvals.

**Changeover Management:**
- Target: 1 SKU per day to minimize changeovers
- Changeover time: 30–45 minutes per SKU switch
- Small → large bottle changeover takes less time
- Frequent switching causes machine idle time (minimize)
- **Changeover Matrix** report tracks actual changeover times

**Production Lines:**
- Oil has 4-5 active lines
- Each line has defined labor and machine requirements
- SKU determines labor count, machine settings, and material requirements

**In-house Manufacturing:**
- **Bottle blowing:** 26g and 52g pre-forms blown in-house (formerly beverage blowing machine, now used for oil)
- Store issues pre-forms → blowing → bottles → store records in SAP
- **External purchases:** Pre-forms, caps, labels, cartons

**Daily SAP Entries (Sequence):**
1. Material purchase entry
2. Material issue request → approval → issue
3. Production entry (after 7 PM)
4. Wastage entry
5. Material return entry

**Responsible:** Vicky VJ (Oil), Raju VJ (Bottling + Budget + Approvals)

---

### 6. QC — In-Process Quality Control

Quality checks happen at three stages during production, plus a detailed hold/reject workflow.

**Three-Stage Quality Check:**

| Stage | When | What's Checked |
|-------|------|----------------|
| 1. Tanker Unloading | When oil unloaded from tanker | Oil quality, contamination |
| 2. Bottle Filling | During bottle fill on line | Color, fill level, seal quality |
| 3. Carton Packing | Final check when petti packed | Barcode, labeling, physical integrity |

**No forward movement to store without QC "OK" at each stage.**

**Continuous In-Line Monitoring:**
- Quality team stationed on the line for regular visual checking
- **Quality chemist takes sample every hour** (mandatory, fixed schedule)
- Random observations by chemist in between hourly checks

**Hold/Reject Process (detailed):**

```
Issue Detected (e.g., color variation, foreign particles)
        │
        ├──► Check bottle timestamps to determine when variation started
        ├──► Isolate: 2 pallets before + 2 pallets after the issue point
        ├──► Stop production (morning stoppage for the specific product)
        ├──► Tag and isolate pallets with proper labels
        │
        ▼
1st Inspection — 24 hours after hold
        │
        ├──► If OK ──► Release from hold, resume production
        ├──► If uncertain ──► Keep on inspection, decision pending
        │
        ▼
2nd Inspection — 72 hours after hold
        │
        ├──► If OK ──► Release with clarification
        └──► If still problematic ──► ENTIRE LOT REJECTED
                │
                ├──► Oil: filtered and returned to tank (reusable)
                ├──► Bottles: all become waste
                ├──► RCA (Root Cause Analysis) created
                └──► CAPA (Corrective & Preventive Action) created
```

**Oil Tank Operations:**
- Tanker oil stored in tanks (~2,000–3,000 liters per tank)
- If production stops mid-tank, remaining oil stays in tank
- If oil itself is bad: drained into 200-liter drums (not bottled, to avoid wasting bottles)
- If only bottles are affected: oil filtered and returned

**Common Hold Reasons:**
- Sticker/label color difference
- Foreign particles (e.g., insects — previous incident led to hold, oil returned after filtering, bottles wasted)
- Color variation in oil

**Responsible:** Quality Chemist (sampling), Quality Line Team (continuous checks)

---

### 7. Return & Wastage

After production, two types of material flow back: returns (unused material) and wastage.

**Return:** Material remaining on the production line after manufacturing is returned to store.

**Wastage:** Material lost/damaged during production.

**Wastage Verification Process:**
```
Production Line (wastage collected)
        │
        ▼
Jasmeet VJ (Wastage Boss)
        │
        ├──► Verify wastage
        ├──► Weigh all wastage
        ├──► Create Excel report
        ├──► Send Excel to production team
        │
        ▼
SAP Entry
        │
        └──► Jasmeet VJ approves wastage in SAP
```

**Yield Report:**
- Calculates percentage loss against input material
- Shows: material received for production, actual production output, wastage quantity
- Generated per production batch

**Wastage Percentage (Oil):**
- **NOT yet defined** for oil (unlike beverage where it's pre-defined)
- Expected ~4–5% for bottle wastage
- Needs to be formally defined (working in progress)
- Causes of bottle wastage: dents from supplier, quality issues, handling damage
- Company debits vendor for supplier-caused damage, but control is limited

**For Lot Rejections (from QC Hold):**
- RCA (Root Cause Analysis) — documents why the rejection happened
- CAPA (Corrective & Preventive Action) — documents what actions to take to prevent recurrence
- Both mandatory for any significant wastage event

**SAP Entries:**
- Wastage entry in SAP
- Material return entry in SAP
- FG (Finished Goods) entry in SAP

**Responsible:** Jasmeet VJ (verification, Excel, SAP approval)

---

### 8. Post Production (Barcoding & Godown Transfer)

**Barcoding:**
- Done **inline during production** (not after)
- Barcode person receives production plan via team group chat
- Pre-prepares barcodes for the day's production
- **Two levels of barcoding:**
  - Each individual box (carton)
  - Each pallet (collection of boxes)

**Godown Structure — Three Storage Locations:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    FINISHED GOODS STORAGE                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Production Output                                                            │
│        │                                                                      │
│        ├──► PF Godown (Production Floor) ── Day Storage                       │
│        │       │                                                              │
│        │       ├──► Pouch (250ml, 700ml, 750ml, 1L)                          │
│        │       └──► Tin                                                       │
│        │       All pouch billing happens from PF Godown                       │
│        │                                                                      │
│        ├──► BC Godown (Basement) ── E-commerce                                │
│        │       All e-commerce orders fulfilled from here                      │
│        │                                                                      │
│        └──► Gupta Godown ── GT (General Transport)                            │
│                All general transport shipments from here                      │
│                                                                               │
│  Beverage (separate):                                                         │
│        └──► All goes to BC Godown (basement)                                  │
│             No e-commerce for beverage, only general                          │
│             Upar = Day Storage only (temporary staging)                       │
│                                                                               │
│  Transfer: Separate team handles movement from production to godowns          │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**FG Categories:**

| Code | Name             | Storage Location | Description                                   |
|------|------------------|------------------|-----------------------------------------------|
| PF   | Packed Finished  | PF Godown        | Pouch + Tin products, all pouch billing here  |
| BC   | B-C Godown       | Basement         | E-commerce fulfillment                         |
| GT   | General Transport| Gupta Godown     | All general transport shipments                |

**Pouch Sizes (PF Godown):** 250ml, 700ml, 750ml, 1 Liter

**Responsible:** Barcode team (inline), Separate transfer team (godown distribution)

---

### 9. Maintenance

Covers all maintenance activities — electrical, mechanical, consumables, spare parts, and scheduling.

**Maintenance Types:**

| Type                 | Description                                    | Schedule           | Lead Time    |
|----------------------|------------------------------------------------|--------------------|--------------|
| Preventive (PM)      | Regular machine checks (oil, parts, general)   | Every Sunday       | Weekly       |
| Predictive/Scheduled | Planned replacement of wear parts (seals, etc.)| Pre-planned        | 1 month      |
| Breakdown            | Reactive maintenance on machine failure         | Unplanned          | Immediate    |

**Preventive Maintenance (Sunday):**
- Production stops every Sunday for PM
- Maintenance team checks every machine: oil, parts, general condition
- **Daily Preventive Maintenance Sheet** filled before/after running machines

**Breakdown Maintenance:**
- Unplanned breakdowns disrupt the production schedule
- Buffer stock absorbs impact (FG: 3–5 days buffer)
- Material ordered immediately for breakdown repair
- Budget approved by Raju VJ

**Spare Parts — Two Categories:**
1. **Predictive/Scheduled:** Rubber parts, seals, high-wear consumable parts — ordered 1 month in advance, kept in stock
2. **Breakdown/Instant:** Parts needed immediately due to unexpected failure — ordered at time of breakdown

**Consumables (NOT spare parts):**
- Ink, lubrication, make-up, wash solution, cloth/kapda
- Machine parts are NOT consumables
- Stored on 4th floor main store
- Record maintained by store team

**Electricity:**
- Tracked by maintenance team
- Readings noted from first machine start to last machine stop
- Maintenance team records and signs off (Abhimanyu, Sanjay)

**Budget & Cost Control:**
- All maintenance budgets go through Raju VJ
- Monthly cost tracking for: maintenance, spare parts, breakdown costs
- Raju VJ has end control for all payments and approvals

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           MAINTENANCE                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Preventive (Sunday) ──► Maintenance Team ──► Abhimanyu / Sanjay             │
│                                                                               │
│  Electricity ──► Maintenance Team ──► Abhimanyu / Sanjay                     │
│                                                                               │
│  Consumables ──► Store (4th Floor)                                            │
│  (Ink / Lubrication / Make-up / Wash Solution / Cloth)                       │
│                                                                               │
│  Spare Parts ──┬──► Predictive (1 month advance, seals/rubber)               │
│                └──► Breakdown (immediate, reactive)                           │
│                                                                               │
│  Budget ──► Raju VJ (end control for all costs & approvals)                  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Responsible:** Abhimanyu, Sanjay (maintenance execution), Raju VJ (budget approval)

---

### 10. Labour Management

Labour allocation is fixed per SKU and defined in a labor sheet.

**Labour Structure:**
- Company has ~53 permanent workers
- Per shift: 25–30 workers
- Mostly single-shift operation
- Overflow: extra shift or overtime (rare)

**SKU-wise Fixed Labour (Examples):**

| Line/SKU | Configuration | Workers Required |
|----------|---------------|------------------|
| First Line — 5L Clear Pack | Standard | 17 workers |
| First Line — 5L with Sticker (Tikki) | With sticker | 22 workers |

- Labour is **fixed per SKU** — not variable
- Every machine point, every line has defined worker count
- Labour sheet defines: how many workers per point, per machine, per line
- Sheet available for sharing

**Contractor Labour:**
- External contractors managed by Gautam VJ and Vicky VJ
- Used when multiple lines run simultaneously and internal workers insufficient
- Contractor budget also goes through Raju VJ

**Labour Planning:** Raman Maan

**Responsible:** Raman Maan (planning), Gautam / Vicky VJ (contractor management), Raju VJ (budget)

---

## Reports

Production module generates the following reports:

### Operational Reports

| Report | Full Name | What It Tracks | Generated By | Status |
|--------|-----------|----------------|--------------|--------|
| ME | Mechanical Efficiency | Machine-level: first machine start to last machine stop, machine utilization | Maintenance | Core |
| PE | Plant Efficiency | Plant-level: first person in to last person out, labor + resource utilization | Production | Core |
| DPR | Daily Production Report | Daily production qty, material used, wastage | Production | Core |
| Yield | Yield Report | Material in vs production out, % loss, wastage breakdown | Production | Core |

### Quality & Compliance Reports

| Report | Full Name | What It Tracks | Generated By | Status |
|--------|-----------|----------------|--------------|--------|
| RCA | Root Cause Analysis | Why breakdowns/rejections occurred | Production/QC | Core |
| CAPA | Corrective & Preventive Action | Actions to prevent recurrence | Production/QC | Core |
| Purging | Purging Report | Oil variety/color verification before line start | Quality Dept | Core |
| Line Clearance | Line Clearance Report | No foreign particles on line before start | Quality Dept | Core |
| SOP | Standard Operating Procedure | Step-by-step flow-chart for every operation, every area | Each Area | Pending |

### Maintenance & Equipment Reports

| Report | Full Name | What It Tracks | Generated By | Status |
|--------|-----------|----------------|--------------|--------|
| DPM | Daily Preventive Maintenance | Machine checks before/after operation | Maintenance | Core |
| EUR | Equipment Utilization Report | Equipment utilization rates | Maintenance | Pending |
| Changeover Matrix | Changeover Matrix | Time taken per SKU changeover | Production | Core |
| Power Consumption | Power Consumption Report | Electricity usage per shift/day | Maintenance | Core |

### Other Reports

| Report | Full Name | What It Tracks | Generated By | Status |
|--------|-----------|----------------|--------------|--------|
| Labour Sheet | Labour Allocation Sheet | Workers per point, per machine, per line, per SKU | Labour (Raman Maan) | Core |
| Maintenance Report | Maintenance Daily Report | Daily maintenance activities, issues | Maintenance | Core |
| Quality Inspection | Quality Inspection Report | QC check results at all 3 stages | Quality | Core |

**Daily Reports sent to Head Office (evening):** DPR, Power Consumption, Maintenance Report, Quality Inspection Report

**Report Responsibilities:**
- **Quality Department:** Purging, Line Clearance records
- **Maintenance (Abhimanyu, Sanjay):** EUR, Preventive Maintenance, Electricity, Power Consumption
- **Production:** ME, PE, Yield, DPR, Changeover Matrix
- **Each Area:** Own SOP (Standard Operating Procedure)

**Report Interdependencies:**
- Reports are linked to each other for cross-validation
- ME report linked to Purging (time between product stop and next start shows if purging happened)
- If one report has an error, another report's data will contradict it (built-in audit trail)
- QC reports linked to production reports for hold/reject traceability

---

## Finished Goods (FG) Structure

Production output is categorized into Finished Goods types and stored across three godowns:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      FINISHED GOODS (FG)                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Production ──► Barcoding (inline) ──► Godown Transfer                       │
│                                           │                                   │
│        ┌──────────────────────────────────┼──────────────────────────┐        │
│        │                                  │                          │        │
│        ▼                                  ▼                          ▼        │
│  ┌──────────────┐               ┌──────────────┐           ┌──────────────┐  │
│  │  PF Godown   │               │  BC Godown   │           │ Gupta Godown │  │
│  │ (Prod Floor) │               │  (Basement)  │           │  (General)   │  │
│  ├──────────────┤               ├──────────────┤           ├──────────────┤  │
│  │ Pouch:       │               │ E-commerce   │           │ GT (General  │  │
│  │  250ml       │               │ orders       │           │  Transport)  │  │
│  │  700ml       │               │              │           │              │  │
│  │  750ml       │               │ Beverage     │           │              │  │
│  │  1 Liter     │               │ (all general)│           │              │  │
│  │ Tin          │               │              │           │              │  │
│  │              │               │              │           │              │  │
│  │ All pouch    │               │              │           │              │  │
│  │ billing here │               │              │           │              │  │
│  └──────────────┘               └──────────────┘           └──────────────┘  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Buffer Stock Rules

| Material Type | Buffer Level | Purpose |
|---------------|-------------|---------|
| RM/PM (Raw Material / Packaging Material) | 30% minimum always in stock | Absorb demand fluctuations |
| Finished Goods (FG) | 10% or 3–5 days | Ensure sales continuity during breakdowns |
| Material (lead time) | 15 days | Account for vendor delivery lead times |

---

## SAP Integration Points

The Production module interfaces with SAP at multiple critical points:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SAP INTEGRATION                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. Material Purchase                                                         │
│     FactoryFlow ──► SAP                                                       │
│     - Material purchase requisition (PO required)                             │
│     - BOM check (what's needed vs what's in stock)                            │
│     - Stock levels and availability                                           │
│                                                                               │
│  2. Material Issue (Store → Production)                                       │
│     FactoryFlow ──► SAP                                                       │
│     - Daily requirement request (tomorrow's req sent today)                   │
│     - Request → Approve → Issue                                               │
│     - BOM-based material consumption recording                               │
│     - Inventory deduction                                                     │
│                                                                               │
│  3. Production Entry                                                          │
│     FactoryFlow ──► SAP                                                       │
│     - Production output recording (after 7 PM daily)                          │
│     - Finished Goods entry                                                    │
│                                                                               │
│  4. Wastage & Returns                                                         │
│     FactoryFlow ──► SAP                                                       │
│     - Wastage entry (after verification by Jasmeet VJ)                       │
│     - Material return entry (unused material back to store)                   │
│                                                                               │
│  5. In-house Manufacturing                                                    │
│     FactoryFlow ──► SAP                                                       │
│     - Pre-form issue from store to blowing                                    │
│     - Bottle production entry in SAP (by store team)                          │
│                                                                               │
│  6. QC Records                                                                │
│     FactoryFlow ──► SAP                                                       │
│     - Quality check records                                                   │
│                                                                               │
│  Future: MRP Integration                                                      │
│     - Sales projection in SAP → auto MRP run                                 │
│     - Auto BOM-based material requirement calculation                        │
│     - Currently Excel-based, transition planned                              │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Business Rules

1. **Advance Payment:** Orders are only accepted after advance payment from customers
2. **Planning Source:** Based on previous year same-month sales + current orders + HO sales projection
3. **Bulk to SKU:** HO provides bulk liters; production team converts to SKU/bottle breakdown
4. **Material Buffer:** Store maintains minimum 30% buffer stock for RM/PM at all times
5. **FG Buffer:** 10% FG inventory maintained (3–5 days buffer for sales continuity)
6. **Material Lead Buffer:** 15 days material buffer to account for vendor delivery times
7. **Physical Verification:** Weekly physical stock count to reconcile system vs actual
8. **Purging Mandatory:** Purging document must be signed before any product changeover
9. **Line Clearance Mandatory:** Line clearance document must be signed before production start (no foreign particles)
10. **Pre-Production Time:** ~1 hour for Purging + Line Clearance combined
11. **Changeover Target:** 1 SKU per day; changeover takes 30–45 minutes
12. **QC Hold:** 1st inspection at 24 hours, 2nd at 72 hours; rejection after 72 hours → full lot waste
13. **Hourly Sampling:** Quality chemist must take sample every hour during production (mandatory)
14. **Labour Fixed per SKU:** Worker count is fixed per SKU per line (not variable)
15. **Sunday PM:** Preventive Maintenance every Sunday, production stops
16. **Wastage Percentage:** Not yet defined for oil (~4–5% expected for bottles), needs formal definition
17. **SAP Recording:** All material movements, production entries, wastage, and returns must be recorded in SAP
18. **Budget Authority:** Raju VJ has end control for all production costs, payments, and approvals
19. **Barcoding Inline:** Barcodes applied during production (box + pallet level), not after
20. **Report Cross-Validation:** Reports are linked to each other; one report's data can validate/contradict another

---

## SOP (Standard Operating Procedure)

SOP is required at every step and every area — not just production.

**What is SOP?**
A flow-chart/sequence document that defines the exact steps for any operation.

**Example SOP Flow (Material Receipt):**
```
1. PO (Purchase Order) must exist
2. PO entered in SAP
3. Material picked up at gate by store
4. Material moved from gate to production
5. ... (full step-by-step sequence)
```

**SOP Coverage Areas:**
- Gate operations
- Store operations
- Each production machine
- Each production step
- Quality checks
- Maintenance procedures

**Current Status:** SOPs need to be formally deployed across all floors. Not yet properly displayed/enforced at all stations.

---

## Integration with Existing Modules

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    MODULE INTEGRATION MAP                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Gate Module ──────────► Production Module                                    │
│  (RM/PM Entry)           (Material available in Store)                        │
│                          (Gate → QC → Store → Production)                     │
│                                                                               │
│  Production Module ────► QC Module                                            │
│  (In-process samples)    (Quality inspection at 3 stages)                     │
│  (Hold/Reject workflow)  (Hourly chemist samples)                             │
│                                                                               │
│  Production Module ────► GRPO Module                                          │
│  (FG to Godowns)         (Goods receipt posting)                              │
│                                                                               │
│  Production Module ◄───► SAP                                                  │
│  (Material purchase, issue, production entry, wastage, returns)              │
│                                                                               │
│  Note: Cross-module communication via shared state (Redux)                    │
│  and API-level data sharing. No direct module imports.                        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Structure (Proposed)

```
src/modules/production/
├── pages/
│   ├── ProductionDashboardPage.tsx          # Main production dashboard
│   ├── planningPages/                       # Planning sub-module
│   │   ├── PlanningDashboardPage.tsx        # Monthly/weekly plan overview
│   │   ├── CreatePlanPage.tsx               # Create new production plan
│   │   ├── ManufacturingOrderPage.tsx       # MO creation and management
│   │   └── PlanDetailPage.tsx               # Plan detail view
│   ├── materialPages/                       # Material acquisition sub-module
│   │   ├── MaterialDashboardPage.tsx        # Material overview & stock
│   │   ├── MaterialRequisitionPage.tsx      # BOM-based material request
│   │   ├── MaterialIssuePage.tsx            # Issue to production line
│   │   └── StockReportPage.tsx              # Stock level reports
│   ├── productionPages/                     # Manufacturing execution
│   │   ├── LineClearancePage.tsx            # Line clearance form
│   │   ├── PurgingPage.tsx                  # Purging verification form
│   │   ├── ProductionEntryPage.tsx          # Production data entry
│   │   ├── ProductionClearancePage.tsx      # Production clearance sign-off
│   │   ├── ChangeOverPage.tsx              # Changeover tracking
│   │   └── ProductionHistoryPage.tsx        # Production history
│   ├── postProductionPages/                 # Post-production sub-module
│   │   ├── BarcodingPage.tsx                # Barcode generation (box + pallet)
│   │   ├── GodownTransferPage.tsx           # FG transfer to godown
│   │   └── FGInventoryPage.tsx              # Finished goods inventory
│   ├── maintenancePages/                    # Maintenance sub-module
│   │   ├── MaintenanceDashboardPage.tsx     # Maintenance overview
│   │   ├── BreakdownEntryPage.tsx           # Log breakdown events
│   │   ├── PreventiveMaintenancePage.tsx    # Sunday PM schedule & records
│   │   ├── ScheduledMaintenancePage.tsx     # Predictive/scheduled tasks
│   │   ├── SparePartCostPage.tsx            # Spare part cost tracking
│   │   └── ConsumablesPage.tsx              # Consumable management
│   ├── returnWastagePages/                  # Return & wastage sub-module
│   │   ├── ReturnEntryPage.tsx              # Return material entry
│   │   ├── WastageEntryPage.tsx             # Wastage recording
│   │   └── YieldReportPage.tsx              # Yield analysis
│   ├── labourPages/                         # Labour sub-module
│   │   ├── LabourDashboardPage.tsx          # Labour overview
│   │   ├── LabourSheetPage.tsx              # SKU-wise labour allocation
│   │   └── ContractorManagementPage.tsx     # Contractor tracking
│   ├── qcPages/                             # QC (In-Process) sub-module
│   │   ├── QCCheckPage.tsx                  # In-process quality check entry
│   │   ├── HoldManagementPage.tsx           # Hold/reject workflow
│   │   └── RCACAPAPage.tsx                  # RCA & CAPA management
│   └── reportsPages/                        # Reports sub-module
│       ├── MEReportPage.tsx                 # Mechanical Efficiency
│       ├── PEReportPage.tsx                 # Plant Efficiency
│       ├── DPRPage.tsx                      # Daily Production Report
│       ├── YieldReportPage.tsx              # Yield Report
│       ├── LineClearanceReportPage.tsx       # Line Clearance Report
│       ├── PurgingReportPage.tsx            # Purging Report
│       ├── ChangeOverReportPage.tsx         # Changeover Matrix
│       ├── PowerConsumptionReportPage.tsx   # Power Consumption
│       └── MaintenanceReportPage.tsx        # Maintenance Report
├── components/
│   ├── planning/
│   │   ├── PlanCard.tsx
│   │   ├── MOSelect.tsx
│   │   ├── WeeklyBreakdownTable.tsx
│   │   └── BulkToSKUConverter.tsx
│   ├── material/
│   │   ├── BOMTable.tsx
│   │   ├── StockLevelCard.tsx
│   │   ├── MaterialIssueForm.tsx
│   │   └── PhysicalVerificationForm.tsx
│   ├── production/
│   │   ├── LineClearanceForm.tsx
│   │   ├── PurgingForm.tsx
│   │   ├── ProductionEntryForm.tsx
│   │   ├── ChangeOverForm.tsx
│   │   └── ProductionStatusCard.tsx
│   ├── postProduction/
│   │   ├── BarcodeGenerator.tsx
│   │   ├── GodownTransferForm.tsx
│   │   └── FGCategorySelect.tsx
│   ├── maintenance/
│   │   ├── BreakdownForm.tsx
│   │   ├── PreventiveMaintenanceForm.tsx
│   │   ├── ScheduleCalendar.tsx
│   │   ├── SparePartCostTable.tsx
│   │   └── ConsumableSelect.tsx
│   ├── qc/
│   │   ├── QCCheckForm.tsx
│   │   ├── HoldTagForm.tsx
│   │   ├── InspectionForm.tsx
│   │   └── RCACAPAForm.tsx
│   ├── labour/
│   │   ├── LabourSheetTable.tsx
│   │   └── ContractorForm.tsx
│   └── index.ts
├── api/
│   ├── planning.api.ts
│   ├── planning.queries.ts
│   ├── material.api.ts
│   ├── material.queries.ts
│   ├── production.api.ts
│   ├── production.queries.ts
│   ├── postProduction.api.ts
│   ├── postProduction.queries.ts
│   ├── maintenance.api.ts
│   ├── maintenance.queries.ts
│   ├── returnWastage.api.ts
│   ├── returnWastage.queries.ts
│   ├── qc.api.ts
│   ├── qc.queries.ts
│   ├── labour.api.ts
│   └── labour.queries.ts
├── hooks/
│   ├── usePlan.ts
│   ├── useLineClearance.ts
│   ├── usePurging.ts
│   ├── useProductionEntry.ts
│   ├── useYieldCalculation.ts
│   ├── useMaintenanceSchedule.ts
│   ├── useHoldManagement.ts
│   └── useLabourSheet.ts
├── schemas/
│   ├── planning.schema.ts
│   ├── material.schema.ts
│   ├── production.schema.ts
│   ├── postProduction.schema.ts
│   ├── maintenance.schema.ts
│   ├── returnWastage.schema.ts
│   ├── qc.schema.ts
│   └── labour.schema.ts
├── constants/
│   └── production.constants.ts
├── types/
│   └── production.types.ts
├── utils/
│   ├── yield.utils.ts
│   └── production.utils.ts
├── docs/
│   └── README.md
├── module.config.tsx
└── index.ts
```

---

## Route Structure (Proposed)

```
/production                                    → ProductionDashboardPage

# Planning
/production/planning                           → PlanningDashboardPage
/production/planning/new                       → CreatePlanPage
/production/planning/mo                        → ManufacturingOrderPage
/production/planning/:planId                   → PlanDetailPage

# Material Acquisition
/production/material                           → MaterialDashboardPage
/production/material/requisition               → MaterialRequisitionPage
/production/material/issue                     → MaterialIssuePage
/production/material/stock-report              → StockReportPage

# Manufacturing Execution
/production/manufacturing                      → ProductionHistoryPage
/production/manufacturing/purging              → PurgingPage
/production/manufacturing/line-clearance       → LineClearancePage
/production/manufacturing/entry                → ProductionEntryPage
/production/manufacturing/clearance            → ProductionClearancePage
/production/manufacturing/changeover           → ChangeOverPage

# QC (In-Process)
/production/qc                                 → QCCheckPage
/production/qc/hold                            → HoldManagementPage
/production/qc/rca-capa                        → RCACAPAPage

# Return & Wastage
/production/return-wastage                     → ReturnEntryPage
/production/return-wastage/wastage             → WastageEntryPage
/production/return-wastage/yield               → YieldReportPage

# Post Production
/production/post-production                    → BarcodingPage
/production/post-production/godown-transfer    → GodownTransferPage
/production/post-production/fg-inventory       → FGInventoryPage

# Labour
/production/labour                             → LabourDashboardPage
/production/labour/sheet                       → LabourSheetPage
/production/labour/contractors                 → ContractorManagementPage

# Maintenance
/production/maintenance                        → MaintenanceDashboardPage
/production/maintenance/breakdown              → BreakdownEntryPage
/production/maintenance/preventive             → PreventiveMaintenancePage
/production/maintenance/scheduled              → ScheduledMaintenancePage
/production/maintenance/spare-parts            → SparePartCostPage
/production/maintenance/consumables            → ConsumablesPage

# Reports
/production/reports/me                         → MEReportPage
/production/reports/pe                         → PEReportPage
/production/reports/dpr                        → DPRPage
/production/reports/yield                      → YieldReportPage
/production/reports/line-clearance             → LineClearanceReportPage
/production/reports/purging                    → PurgingReportPage
/production/reports/changeover                 → ChangeOverReportPage
/production/reports/power-consumption          → PowerConsumptionReportPage
/production/reports/maintenance                → MaintenanceReportPage
```

---

## Related Documentation

- [Modules Overview](./overview.md)
- [Gate Module](./gate.md) — Raw material entry feeds into Production
- [QC Module](./qc.md) — Quality control during/after production
- [GRPO Module](./grpo.md) — Goods receipt posting for finished goods
- [Architecture Overview](../architecture/overview.md)
- [Module Boundaries](../architecture/module-boundaries.md)
