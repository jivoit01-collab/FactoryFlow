# FactoryFlow — Complete System Flowchart

**Jivo Wellness Pvt. Ltd.**
**Purpose:** Visual guide for management — how materials flow through the factory system

---

## 1. The Big Picture — End-to-End Factory Flow

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                        FACTORYFLOW SYSTEM                               │
  │              (From Production Plan to Gate Out)                          │
  └─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │  PRODUCTION   │  Plan what to produce (SKU, quantity, timeline)
  │  PLANNING     │  System calculates material requirements
  └──────┬───────┘
         │  Plan created → material needs calculated
         ▼
  ┌──────────────┐
  │  PURCHASE     │  Dashboard shows: What material is SHORT
  │  DASHBOARD    │  Plan Demand vs Benchmark vs In-Stock = What to Buy
  │  (Report)     │  (Purchase team uses this to procure externally)
  └──────┬───────┘
         │  Material procured externally, vehicle arrives
         ▼
  ┌──────────────┐
  │  GATE IN      │  Vehicle arrives → Security logs entry
  │  (Security)   │  Records driver, vehicle, weighment → Auto Creates arrival slip
  └──────┬───────┘
         │  Material is inside the factory
         ▼
  ┌──────────────┐
  │  QUALITY      │  QC team inspects raw material
  │  CHECK (QC)   │  Inspection → Approve/Reject
  └──────┬───────┘
         │  Material approved by QC
         ▼
  ┌──────────────┐
  │  GRPO         │  Goods Receipt — approved material officially
  │  (Warehouse   │  enters the warehouse and inventory system
  │   Inward)     │
  └──────┬───────┘
         │  Material is now warehouse stock
         ▼
  ┌──────────────┐
  │  WAREHOUSE    │  Stock stored by category (Oil, Beverage, etc.)
  │               │  Track quantities, space, benchmarks
  └──────┬───────┘
         │  Material issued to production floor
         ▼
  ┌──────────────────────────────────────────────────────┐
  │  PRODUCTION                                           │
  │  ┌─────────────┐  ┌──────────┐  ┌────────────────┐  │
  │  │  Planning    │→ │ Execution │→ │ Daily Reports   │  │
  │  │  (What to    │  │ (Actually │  │ (What was       │  │
  │  │   produce)   │  │  making)  │  │  produced)      │  │
  │  └─────────────┘  └──────────┘  └────────────────┘  │
  └──────┬───────────────────────────────────────────────┘
         │  Finished product comes off the line
         ▼
  ┌──────────────┐
  │  QUALITY      │  QA team inspects finished product
  │  ASSURANCE    │  Pass / Fail / Hold → Labels applied
  │  (Post-Prod)  │
  └──────┬───────┘
         │  Product approved and labeled
         ▼
  ┌──────────────┐
  │  FINISHED     │  F.G. stored in warehouse
  │  GOODS (F.G.) │  FIFO system, barcode tracking
  └──────┬───────┘
         │  Order received, ready to ship
         ▼
  ┌──────────────┐
  │  DISPATCH     │  Challan created (what's being sent)
  │               │  Kandi count + weight recorded
  └──────┬───────┘
         │  Challan ready, vehicle loaded
         ▼
  ┌──────────────┐
  │  GATE OUT     │  Security verifies challan + weighment
  │  (Security)   │  Vehicle exits factory
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  SCRAP        │  Waste/scrap from production tracked
  │  MANAGEMENT   │  Categorized, disposed, reported
  └──────────────┘
```

---

## 2. Detailed Module Flowcharts

---

### 2A. PURCHASE DASHBOARD (Plan vs Purchase Report)

```
WHO: Purchase Team / Management

  ┌────────────────────┐
  │ Production Plan     │
  │ exists with target  │
  │ quantities (SKUs)   │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ System calculates   │
  │ material needs from │
  │ BOM (Bill of        │
  │ Materials)          │
  └────────┬───────────┘
           ▼
  ┌──────────────────────────────────────────────────┐
  │          PURCHASE DASHBOARD                       │
  │                                                   │
  │  For each raw material:                           │
  │                                                   │
  │  ┌─────────┐   ┌──────────┐   ┌───────────┐     │
  │  │ DEMAND  │ - │BENCHMARK │ - │ IN-STOCK  │     │
  │  │ (From   │   │ (Safety  │   │ (Current  │     │
  │  │  Plan)  │   │  Stock)  │   │  Qty in   │     │
  │  │         │   │          │   │  Warehouse│     │
  │  └────┬────┘   └──────────┘   └───────────┘     │
  │       │                                           │
  │       ▼                                           │
  │  ┌──────────────────────────┐                     │
  │  │ SHORTAGE = What to Buy   │                     │
  │  │ (Demand - Benchmark -    │                     │
  │  │  InStock = Purchase Qty) │                     │
  │  └──────────────────────────┘                     │
  │                                                   │
  │  View by: Category (Oil, Beverage, etc.)          │
  │  View by: Material / SKU                          │
  └──────────────────────────────────────────────────┘
           │
           │  Purchase team uses this info to
           │  procure material externally
           │  (outside the system)
           ▼
     Material arrives at gate
```

---

### 2B. GATE IN MODULE

```
WHO: Security Guard

  Vehicle Arrives at Factory Gate
           │
           ▼
  ┌────────────────────────────────────────────┐
  │          WHAT TYPE OF ENTRY?                │
  ├────────────┬──────────┬───────────┬────────┤
  │            │          │           │        │
  ▼            ▼          ▼           ▼        ▼
┌──────┐  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Raw   │  │ Daily  │ │ Maint- │ │ Const- │ │Visitor/│
│Mater- │  │ Needs  │ │ enance │ │ ruction│ │Labour  │
│ ial   │  │        │ │        │ │        │ │        │
└──┬───┘  └────────┘ └────────┘ └────────┘ └────────┘
   │
   ▼  (Raw Material Gate Entry — Main Flow)
  ┌────────────────────┐
  │ Step 1: Vehicle     │
  │ • Vehicle number    │
  │ • Transporter name  │
  │ • Driver details    │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Step 2: Material    │
  │ • Vendor info       │
  │ • Material details  │
  │ • Expected items &  │
  │   quantities        │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Step 3: Weighment   │
  │ • Gross weight      │
  │ • Tare weight       │
  │ • Net weight        │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Create Arrival Slip │
  │ • Material details  │
  │ • Batch/Lot number  │
  │ • Supplier info     │
  │ • Quantity received │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Step 4: Attachments │
  │ • Photos of vehicle │
  │ • Documents         │
  │ • Invoice copies    │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Gate Entry Created  │
  │ → Sent to QC Team   │
  └────────────────────┘
```

---

### 2C. QUALITY CHECK (INCOMING RAW MATERIAL)

```
WHO: QC Team (Chemist, QA Manager)

  Gate Entry Received
           │
           ▼
  ┌────────────────────┐
  │ Start Inspection    │
  │ • Check parameters  │
  │   (color, smell,    │
  │    pH, moisture,    │
  │    purity, etc.)    │
  │ • Record test       │
  │   results           │
  └────────┬───────────┘
           ▼
  ┌─────────────────────────────────────┐
  │     3-ROLE APPROVAL PROCESS         │
  │                                     │
  │  Inspector fills results            │
  │         ↓                           │
  │  Chemist reviews & approves         │
  │         ↓                           │
  │  QA Manager final approval          │
  └────────┬────────────────────────────┘
           ▼
  ┌────────────────────────────────────┐
  │         DECISION                    │
  ├──────────────┬─────────────────────┤
  │              │                     │
  ▼              ▼                     ▼
┌──────┐   ┌──────────┐         ┌──────────┐
│APPROVE│   │ REJECT   │         │ ON HOLD  │
│       │   │          │         │          │
│ → GRPO│   │ → Return │         │ → Retest │
│       │   │  to      │         │   Later  │
│       │   │  Vendor  │         │          │
└──────┘   └──────────┘         └──────────┘
```

---

### 2D. GRPO (GOODS RECEIPT)

```
WHO: Warehouse Team

  QC Approved Material
           │
           ▼
  ┌────────────────────┐
  │ Pending GRPO List   │
  │ (All approved items │
  │  waiting to be      │
  │  received)          │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Preview GRPO        │
  │ • Verify quantities │
  │ • Check PO match    │
  │ • Review details    │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Post GRPO           │
  │ • Material added to │
  │   warehouse stock   │
  │ • Posted to SAP     │
  │ • Attachments added │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ GRPO History        │
  │ (Record of all past │
  │  goods receipts)    │
  └────────────────────┘
```

---

### 2E. WAREHOUSE MODULE

```
WHO: Warehouse Team

  ┌──────────────────────────────────────────────────┐
  │              WAREHOUSE DASHBOARD                  │
  │                                                   │
  │  Stock by Category:                               │
  │  ┌──────┐  ┌──────────┐  ┌──────┐  ┌──────────┐ │
  │  │ Oil  │  │ Beverage │  │ Food │  │ Packaging│ │
  │  │ 500L │  │ 200 units│  │ 1T   │  │ 5000 pcs │ │
  │  └──────┘  └──────────┘  └──────┘  └──────────┘ │
  └──────────────────────────────────────────────────┘
           │
           ├──── View stock levels by benchmark
           │
           ├──── Track warehouse space/area usage
           │
           └──── Transfer material to production
                      │
                      ▼
              ┌────────────────────┐
              │ Material Transfer   │
              │ Request             │
              │ • Select material   │
              │ • Enter quantity    │
              │ • Select prod. line │
              │ • Issue to floor    │
              └────────────────────┘
```

---

### 2F. PRODUCTION MODULE

```
WHO: Production Team, Production Manager

  ════════════════════════════════════════════════════
  PART 1: PRODUCTION PLANNING
  ════════════════════════════════════════════════════

  ┌────────────────────┐
  │ Create Monthly Plan │
  │ • Select product    │
  │   (SKU from SAP)    │
  │ • Set target qty    │
  │ • Add materials     │
  │   (BOM data from SAP)│
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Weekly Breakdown    │
  │ • Auto-divide into  │
  │   4 weekly targets  │
  │ • Adjust manually   │
  │   if needed         │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐         ┌──────────────────┐
  │ Publish Plan        │────────→│ Bulk Import      │
  │ (DRAFT → PUBLISHED) │         │ (Upload CSV with │
  │                     │         │  multiple plans)  │
  └────────┬───────────┘         └──────────────────┘
           ▼
  Plan is ready → Execution begins


  ════════════════════════════════════════════════════
  PART 2: PRODUCTION EXECUTION
  ════════════════════════════════════════════════════

  ┌────────────────────┐
  │ PRE-PRODUCTION      │
  │ CHECKS              │
  └────────┬───────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
  ┌──────────┐ ┌──────────────┐
  │ Line     │ │ Machine      │
  │Clearance │ │ Checklist    │
  │          │ │              │
  │Clean the │ │Check all     │
  │line from │ │machines are  │
  │previous  │ │working before│
  │product   │ │starting      │
  │          │ │              │
  │QA must   │ │Operator fills│
  │approve   │ │checklist     │
  └──────────┘ └──────────────┘
           │
           ▼
  ┌────────────────────┐
  │ START PRODUCTION    │
  │ RUN                 │
  │ • Select product    │
  │ • Select line       │
  │ • Assign operators  │
  │ • Set shift         │
  └────────┬───────────┘
           ▼
  ┌───────────────────────────────────────────────────┐
  │             DURING PRODUCTION                      │
  │                                                    │
  │  ┌─────────────┐  ┌─────────────┐                 │
  │  │ Hourly Log   │  │ Breakdowns  │                 │
  │  │              │  │             │                  │
  │  │ Every hour:  │  │ If machine  │                 │
  │  │ • Output qty │  │ breaks:     │                 │
  │  │ • Good units │  │ • Log time  │                 │
  │  │ • Reject qty │  │ • Cause     │                 │
  │  │ • Remarks    │  │ • Duration  │                 │
  │  └─────────────┘  │ • Resolution│                 │
  │                    └─────────────┘                 │
  │  ┌─────────────┐  ┌─────────────┐                 │
  │  │ Material    │  │ Manpower    │                  │
  │  │ Usage       │  │ Tracking    │                  │
  │  │             │  │             │                  │
  │  │ Track raw   │  │ How many    │                  │
  │  │ material    │  │ workers on  │                  │
  │  │ consumed    │  │ each line   │                  │
  │  │ vs output   │  │ per shift   │                  │
  │  └─────────────┘  └─────────────┘                 │
  │                                                    │
  │  ┌─────────────┐  ┌─────────────┐                 │
  │  │ Machine     │  │ Waste       │                  │
  │  │ Runtime     │  │ Management  │                  │
  │  │             │  │             │                  │
  │  │ Track each  │  │ Any wasted  │                  │
  │  │ machine's   │  │ material:   │                  │
  │  │ uptime and  │  │ 4 approvals │                  │
  │  │ downtime    │  │ needed      │                  │
  │  └─────────────┘  └─────────────┘                 │
  └──────────┬────────────────────────────────────────┘
             ▼
  ┌────────────────────┐
  │ COMPLETE RUN        │
  │ • Final output qty  │
  │ • Yield calculated  │
  │ • Efficiency %      │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ DAILY PRODUCTION    │
  │ REPORT              │
  │ • What was produced │
  │ • Line-wise output  │
  │ • Shift-wise data   │
  │ • Breakdown summary │
  └────────────────────┘


  ════════════════════════════════════════════════════
  WASTE APPROVAL FLOW (4-Step)
  ════════════════════════════════════════════════════

  Waste Entry Created by Operator
           │
           ▼
  ┌────────────────────┐
  │ 1. Engineer Review  │  ← Production Engineer
  │    Approve/Reject   │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ 2. AM Review        │  ← Assistant Manager
  │    Approve/Reject   │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ 3. Store Review     │  ← Store Manager
  │    Approve/Reject   │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ 4. HOD Final        │  ← Head of Department
  │    Approve/Reject   │
  └────────┬───────────┘
           ▼
     Waste Recorded & Tracked
```

---

### 2G. QUALITY ASSURANCE (POST-PRODUCTION)

```
WHO: QA Team

  Finished Product from Production Line
           │
           ▼
  ┌────────────────────┐
  │ QA Inspection       │
  │ • Check product     │
  │   quality           │
  │ • Test parameters   │
  │ • Record results    │
  └────────┬───────────┘
           ▼
  ┌────────────────────────────────────┐
  │         DECISION                    │
  ├──────────────┬─────────────────────┤
  │              │                     │
  ▼              ▼                     ▼
┌──────┐   ┌──────────┐         ┌──────────┐
│ PASS │   │  FAIL    │         │  HOLD    │
│      │   │          │         │          │
│Label │   │ Send back│         │ Keep for │
│applied│  │ to prod. │         │ recheck  │
│      │   │ or scrap │         │          │
└──┬───┘   └──────────┘         └──────────┘
   │
   ▼
  Move to Finished Goods Warehouse
```

---

### 2H. FINISHED GOODS + BARCODE

```
WHO: Warehouse Team / F.G. Team

  QA-Approved Product
           │
           ▼
  ┌────────────────────┐
  │ F.G. Inward         │
  │ • Receive from      │
  │   production        │
  │ • Record batch,     │
  │   quantity, date    │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Barcode Generation  │
  │ • Product barcode   │
  │ • Batch barcode     │
  │ • Scan to look up   │
  │   product details   │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ F.G. Warehouse      │
  │ • FIFO: First In,   │
  │   First Out          │
  │ • Stock levels       │
  │ • Batch tracking     │
  │ • Ready to dispatch  │
  └────────────────────┘
```

---

### 2I. DISPATCH + GATE OUT

```
WHO: Dispatch Team → Security Guard

  Order Received / Ready to Ship
           │
           ▼
  ┌────────────────────┐
  │ Create Dispatch     │
  │ Challan             │
  │ • Select products   │
  │ • Kandi count       │
  │   (bundle count)    │
  │ • Record weight     │
  │ • Category          │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Load Vehicle        │
  │ • Match challan to  │
  │   loaded goods      │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ GATE OUT            │
  │ • Security checks   │
  │   challan details   │
  │ • Final weighment   │
  │ • Security sign-off │
  │ • Vehicle exits     │
  └────────┬───────────┘
           ▼
     ┌──────────────┐
     │   DELIVERED   │
     └──────────────┘
```

---

### 2J. SCRAP MANAGEMENT

```
WHO: Production Team / Store Manager

  Waste generated during production
  (or rejected by QA)
           │
           ▼
  ┌────────────────────┐
  │ Create Scrap Entry  │
  │ • Type of scrap     │
  │ • Quantity           │
  │ • Category           │
  │ • Source (which line,│
  │   which product)     │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Track Disposal      │
  │ • How was it        │
  │   disposed?         │
  │ • Sale to scrap     │
  │   dealer?           │
  │ • Recycled?         │
  └────────┬───────────┘
           ▼
  ┌────────────────────┐
  │ Scrap Reports       │
  │ • Total scrap by    │
  │   category           │
  │ • Scrap trends       │
  │ • Cost impact        │
  └────────────────────┘
```

---

## 3. Who Does What — Department Responsibility Map

```
┌──────────────────────────────────────────────────────────────────┐
│                    DEPARTMENT RESPONSIBILITIES                    │
├──────────────────┬───────────────────────────────────────────────┤
│                  │                                               │
│  PURCHASE TEAM   │  View shortage dashboard → Procure externally │
│                  │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│  SECURITY        │  Gate In → Log Vehicle → Weighment → Gate Out │
│  (Gate)          │                                               │
│                  │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│  QC TEAM         │  Arrival Slip → Inspect Raw Material →       │
│                  │  Approve/Reject (3-role approval)             │
│                  │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│  QA TEAM         │  Inspect Finished Goods → Pass/Fail/Hold →   │
│                  │  Apply Labels                                 │
│                  │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│  WAREHOUSE TEAM  │  Receive (GRPO) → Store → Track Stock →      │
│                  │  Transfer to Production → Receive F.G.        │
│                  │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│  PRODUCTION TEAM │  Plan → Line Clearance → Start Run →         │
│                  │  Hourly Logs → Breakdowns → Waste → Complete  │
│                  │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│  PRODUCTION MGR  │  View Reports → Approve Waste →              │
│                  │  Plan vs Actual → Efficiency Tracking         │
│                  │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│  DISPATCH TEAM   │  Create Challan → Record Count/Weight →      │
│                  │  Coordinate Gate Out                          │
│                  │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│  MANAGEMENT      │  Dashboards → All Reports → Oversight        │
│                  │                                               │
└──────────────────┴───────────────────────────────────────────────┘
```

---

## 4. Reports Available to Management

```
┌──────────────────────────────────────────────────────────────────┐
│                     MANAGEMENT REPORTS                            │
├─────────────────────────┬────────────────────────────────────────┤
│ Plan vs Production      │ Did we produce what we planned?        │
│                         │ Target quantity vs actual output        │
├─────────────────────────┼────────────────────────────────────────┤
│ Plan vs Purchase        │ Demand → Benchmark → In Stock →        │
│                         │ How much to buy?                        │
├─────────────────────────┼────────────────────────────────────────┤
│ Purchase Shortage       │ What material is short against plan?    │
│ Dashboard               │ Demand vs Benchmark vs In-Stock         │
├─────────────────────────┼────────────────────────────────────────┤
│ Warehouse Stock         │ Current stock by category               │
│                         │ (Oil, Beverage, Food, Packaging)        │
├─────────────────────────┼────────────────────────────────────────┤
│ Space/Area Report       │ Warehouse space used vs available       │
├─────────────────────────┼────────────────────────────────────────┤
│ Daily Production        │ Hour-by-hour output per line            │
├─────────────────────────┼────────────────────────────────────────┤
│ Wastage Report          │ How much wasted, where, and why         │
├─────────────────────────┼────────────────────────────────────────┤
│ Labour Report           │ Workers per line per shift               │
├─────────────────────────┼────────────────────────────────────────┤
│ Machine Report          │ Uptime, breakdowns, utilization %       │
├─────────────────────────┼────────────────────────────────────────┤
│ Breakdown Summary       │ Total downtime, causes, frequency       │
└─────────────────────────┴────────────────────────────────────────┘
```

---

## 5. System Status — What's Ready vs What's Coming

```
STATUS MAP:

  ███ = Built & Working        ░░░ = Being Built        ··· = Coming Soon

  ███ Login & User Accounts         (Ready)
  ███ Gate In                        (Ready)
  ███ Quality Check (Incoming)       (Ready)
  ███ GRPO (Goods Receipt)           (Ready)
  ███ Production Planning            (Ready)
  ░░░ Production Execution           (Built, being polished — Week 1)
  ███ Notifications                  (Ready)
  ··· Purchase Dashboard (Shortage)   (Week 2)
  ··· Warehouse                      (Weeks 2–3)
  ··· Reports                        (Week 3)
  ··· Quality Assurance (Post-Prod)  (Week 4)
  ··· Finished Goods + Barcode       (Weeks 4–5)
  ··· Dispatch + Scrap               (Weeks 5–6)
  ··· Gate Out                       (Weeks 6–7)

  Target: Everything complete by April 24, 2026
```

---

## 6. How It All Connects — Data Flow Summary

```
  PRODUCTION PLAN ─────→ calculates ────→ PURCHASE DASHBOARD
       │                                  (shortage report)
       │
       │  Material procured externally
       │
       │              GATE IN ENTRY
       │                    │
       │                    ▼
       │              QC INSPECTION
       │                    │
       │                    ▼
       └──── plan needs ──────────────→ GRPO (quantity verified)
                                               │
                                               ▼
                                        WAREHOUSE STOCK
                                               │
                                    ┌──────────┴──────────┐
                                    ▼                     ▼
                             Material Transfer      Stock Reports
                                    │
                                    ▼
                             PRODUCTION RUN
                              ┌────┼────┐
                              ▼    ▼    ▼
                           Output Waste Breakdowns
                              │    │
                              ▼    └──→ Scrap Management
                         QA INSPECTION
                              │
                         ┌────┴────┐
                         ▼         ▼
                      F.G. Stock   Reject/Scrap
                         │
                         ▼
                      DISPATCH
                      (Challan)
                         │
                         ▼
                      GATE OUT
```

---

*This document is a visual guide for understanding the FactoryFlow system. For technical details, refer to the docs/ folder in the project.*