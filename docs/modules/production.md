# Production Module

The Production module manages the end-to-end production lifecycle at the factory — from monthly planning and material acquisition through manufacturing, quality control, and post-production activities (barcoding, godown transfer). It also covers maintenance and labour management.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION MODULE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Planning              Monthly/Weekly plans → Manufacturing Orders (MO)   │
│  2. Material Acquisition  BOM-based material issue from Store via SAP        │
│  3. Production            Manufacturing execution on production lines        │
│  4. QC                    In-process quality checks (may integrate QC module)│
│  5. Post Production       Barcoding, FG transfer to Godown                   │
│  6. Maintenance           Preventive, predictive & breakdown maintenance     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Sub-Modules

| # | Sub-Module             | Description                                            | Status   |
|---|------------------------|--------------------------------------------------------|----------|
| 1 | Planning               | Monthly plan → MO creation (weekly/monthly breakdown)  | Optional |
| 2 | Material Acquisition   | BOM-based material issue from Store via SAP            | Core     |
| 3 | Production             | Manufacturing execution, line clearance, changeovers   | Core     |
| 4 | QC                     | In-process quality control (may add to existing QC module) | TBD  |
| 5 | Post Production        | Barcoding & Godown (finished goods transfer)           | Core     |
| 6 | Maintenance            | Electrical, mechanical, spare parts, scheduling        | Core     |

---

## Production Flow

The complete end-to-end production flow with responsible personnel:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRODUCTION FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐                                                    │
│  │   1. MONTHLY PLAN    │──── MO (Manufacturing Order) ──► Prashit / Taran   │
│  └──────────┬───────────┘                                                    │
│             │                                                                │
│             ├──► Weekly Breakdown                                             │
│             └──► Monthly Breakdown                                            │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────────┐                                                │
│  │  2. MATERIAL PURCHASE    │──► Store ──► Kulbeer VJ ──► ~30% buffer        │
│  │     (Pre-Production)     │                                                │
│  └──────────┬───────────────┘                                                │
│             │                                                                │
│             ├──► Stock Report ──► PM Godown                                   │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────────┐                                                │
│  │  3. ISSUE TO STORE       │──► Shahrukh                                    │
│  │     (BOM-based Issue)    │                                                │
│  └──────────┬───────────────┘                                                │
│             │                                                                │
│             └──► SAP (Material Issue recorded)                                │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────────┐                                                │
│  │  4. PRODUCTION           │──► Vicky VJ (Oil) / Raju VJ (Plan)             │
│  │     (Manufacturing)      │                                                │
│  │                          │──► Production Clearance ──► Vicky               │
│  └──────────┬───────────────┘                                                │
│             │                                                                │
│             ├──► Line Clearance                                               │
│             ├──► Change Over Metrics                                          │
│             ├──► MEV (Manufacturing Equipment Validation)                     │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────────┐                                                │
│  │  5. RETURN / WASTAGE     │──► Jasmeet VJ                                  │
│  │                          │                                                │
│  └──────────┬───────────────┘                                                │
│             │                                                                │
│             └──► Yield Report                                                 │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────────┐                                                │
│  │  6. POST PRODUCTION      │──► Barcoding ──► Godown Transfer               │
│  │     (FG Processing)      │                                                │
│  └──────────────────────────┘                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Department Responsibilities

| Department              | Responsible Person(s)     | System        | Notes                        |
|-------------------------|---------------------------|---------------|------------------------------|
| Planning                | Prashit / Taran / Raju VG | FactoryFlow   | Monthly/Weekly plans, MO     |
| Pre-Production (Material)| Kulbeer                  | SAP           | Material purchase, 30% buffer|
| Issue (Material Issue)  | Shahrukh                  | SAP           | BOM-based store issue        |
| Production Clearance    | Vicky                     | FactoryFlow   | Line clearance, changeovers  |
| Production (Oil)        | Vicky VJ                  | FactoryFlow   | Oil production lines         |
| Production (Plan)       | Raju VJ                   | FactoryFlow   | Plan-based production lines  |
| Return / Wastage        | Jasmeet VG                | FactoryFlow   | Returns, wastage, yield      |
| Maintenance             | Sanjay Sharma             | FactoryFlow   | All maintenance activities   |
| Consumables             | Store (4th Floor)         | FactoryFlow   | Ink, Lub., Maker, etc.       |
| Labour                  | Gautam / Vicky            | FactoryFlow   | Labour management            |

---

## Finished Goods (FG) Structure

Production output is categorized into Finished Goods types:

```
┌─────────────────────────────────────────────────────────────────┐
│                   FINISHED GOODS (FG)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FG ─────┬──► PF (Packed Finished) ──┬──► Pouch                 │
│          │                           └──► Tin                    │
│          │                                                       │
│          ├──► FG → Base ──► EC (Export/Conversion)               │
│          │                                                       │
│          └──► GP (General Product) ──► GT (Goods Transfer)       │
│                                                                  │
│  Final Destination:                                              │
│  Production ──────────► Godown                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### FG Categories

| Code | Name             | Description                                     |
|------|------------------|-------------------------------------------------|
| PF   | Packed Finished  | Final packaged products (Pouch or Tin format)    |
| FG   | Finished Goods   | Base finished goods, can convert to EC           |
| EC   | Export/Conversion| Finished goods converted from FG Base            |
| GP   | General Product  | General products transferred via GT              |
| GT   | Goods Transfer   | Transfer mechanism for GP to warehouse/godown    |

---

## Sub-Module Details

### 1. Planning

Handles production planning at monthly and weekly levels.

**Flow:**
```
Monthly Plan ──► Manufacturing Order (MO) ──► Prashit / Taran
                      │
                      ├──► Weekly Plan Breakdown
                      └──► Monthly Plan Breakdown
```

**Key Features:**
- Monthly production plan creation
- Manufacturing Order (MO) generation
- Weekly and monthly breakdowns
- Production schedule management
- Capacity planning

**Responsible:** Prashit / Taran / Raju VG

---

### 2. Material Acquisition (Pre-Production)

BOM-based material procurement and issue from Store.

**Flow:**
```
MO / Production Plan
        │
        ▼
Material Purchase ──► Store ──► Kulbeer VJ
        │                          │
        │                          └──► ~30% buffer stock maintained
        │
        ├──► Stock Report ──► PM Godown
        │
        ▼
Issue to Store ──► Shahrukh ──► SAP (recorded)
```

**Key Features:**
- BOM (Bill of Materials) based material requirement
- Material purchase requisition
- Store inventory management (4th floor store)
- Stock reports with PM Godown visibility
- Material issue recording in SAP
- 30% buffer stock maintenance

**SAP Integration:**
- Pre-Production material entry recorded in SAP
- Material Issue to store recorded in SAP
- Stock levels synced with SAP

**Responsible:**
- Material Purchase: Kulbeer VJ
- Issue to Store: Shahrukh

---

### 3. Production (Manufacturing)

Core manufacturing execution on production lines.

**Flow:**
```
Materials Issued
        │
        ▼
Line Clearance ──► Production Start
        │
        ├──► Oil Production ──► Vicky VJ
        ├──► Plan Production ──► Raju VJ
        │
        ▼
Production Clearance ──► Vicky
        │
        ├──► Change Over Metrics (tracked)
        ├──► MEV (Manufacturing Equipment Validation)
        │
        ▼
Production Output (FG)
```

**Key Features:**
- Line clearance before production start
- Production execution tracking
- Change over metrics monitoring
- Manufacturing Equipment Validation (MEV)
- Production clearance sign-off
- Real-time production status

**Responsible:**
- Oil Production: Vicky VJ
- Plan Production: Raju VJ
- Production Clearance: Vicky

---

### 4. QC (Quality Control)

In-process quality control during production.

> **Note:** This may be integrated into the existing QC module (`src/modules/qc/`) rather than being a standalone sub-module within Production.

**Key Features:**
- In-process quality checks
- Parameter-based testing
- Pass/Fail determination
- Integration with existing QC approval workflow (Inspector → QA Chemist → QA Manager)

---

### 5. Post Production

Handles finished goods processing after manufacturing.

**Flow:**
```
Production Output (FG)
        │
        ▼
Barcoding ──► Label/Barcode generation
        │
        ▼
Godown Transfer ──► FG stored in Godown
        │
        ├──► PF (Pouch / Tin)
        ├──► FG Base ──► EC
        └──► GP ──► GT
```

**Key Features:**
- Barcode generation and labeling
- Finished goods categorization (PF, FG, GP)
- Godown transfer and storage
- FG type tracking (Pouch, Tin, Base, EC, GT)

---

### 6. Maintenance

Covers all maintenance activities — electrical, mechanical, spare parts, and scheduling.

**Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    MAINTENANCE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Electrical ──► Manit ──► Sanjay Sharma                         │
│                                                                  │
│  Consumables ──► Store                                           │
│  (Ink / Lub. / Maker / ...)                                      │
│                                                                  │
│  M/C Spare Part Cost ──┬──► Breakdown (reactive)                │
│                        │                                         │
│                        └──► Predictive / Scheduled               │
│                              └──► 3 Months before                │
│                                                                  │
│  Labour ──► Gautam / Vicky                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Maintenance Types:**

| Type                 | Description                                  | Lead Time    |
|----------------------|----------------------------------------------|--------------|
| Breakdown            | Reactive maintenance on machine failure       | Immediate    |
| Predictive/Scheduled | Planned maintenance based on schedules        | 3 months     |
| Preventive           | Regular preventive maintenance shop           | Scheduled    |

**Key Features:**
- Electrical maintenance tracking (Manit → Sanjay Sharma)
- Consumable management (Ink, Lubricant, Maker, etc.)
- Machine spare part cost tracking
- Breakdown maintenance logging
- Predictive/Scheduled maintenance (3 months in advance)
- Preventive Maintenance Shop
- Labour allocation (Gautam / Vicky)

---

## Reports

Production module generates the following reports:

| Report                       | Status      | Description                                 |
|------------------------------|-------------|---------------------------------------------|
| ME (Manufacturing Efficiency)| Done        | Overall manufacturing efficiency metrics     |
| PE (Production Efficiency)   | Done        | Production line efficiency tracking          |
| Yield Report                 | Done        | Material yield and wastage analysis          |
| RCA & KAPPA                  | Not Given   | Root Cause Analysis & KAPPA metrics          |
| Preventive Maintenance Shop  | In Progress | Preventive maintenance schedule & records    |
| Purging Reports              | In Progress | Line purging and cleaning records            |
| Line Clearance               | Done        | Line clearance verification records          |
| Change Over Metrics          | Done        | Machine/line changeover time tracking        |
| EUR (Equipment Utilization)  | Pending     | Equipment utilization rate reports            |
| SOP (Standard Operating Proc)| Pending     | Standard operating procedure compliance      |

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
│   │   ├── ProductionEntryPage.tsx          # Production data entry
│   │   ├── ProductionClearancePage.tsx      # Production clearance sign-off
│   │   ├── ChangeOverPage.tsx              # Changeover tracking
│   │   └── ProductionHistoryPage.tsx        # Production history
│   ├── postProductionPages/                 # Post-production sub-module
│   │   ├── BarcodingPage.tsx                # Barcode generation
│   │   ├── GodownTransferPage.tsx           # FG transfer to godown
│   │   └── FGInventoryPage.tsx              # Finished goods inventory
│   ├── maintenancePages/                    # Maintenance sub-module
│   │   ├── MaintenanceDashboardPage.tsx     # Maintenance overview
│   │   ├── BreakdownEntryPage.tsx           # Log breakdown events
│   │   ├── ScheduledMaintenancePage.tsx     # Predictive/scheduled tasks
│   │   ├── SparePartCostPage.tsx            # Spare part cost tracking
│   │   └── ConsumablesPage.tsx              # Consumable management
│   ├── returnWastagePages/                  # Return & wastage sub-module
│   │   ├── ReturnEntryPage.tsx              # Return material entry
│   │   ├── WastageEntryPage.tsx             # Wastage recording
│   │   └── YieldReportPage.tsx              # Yield analysis
│   └── reportsPages/                        # Reports sub-module
│       ├── MEReportPage.tsx                 # Manufacturing Efficiency
│       ├── PEReportPage.tsx                 # Production Efficiency
│       ├── YieldReportPage.tsx              # Yield Report
│       ├── LineClearanceReportPage.tsx       # Line Clearance Report
│       └── ChangeOverReportPage.tsx         # Change Over Metrics
├── components/
│   ├── planning/
│   │   ├── PlanCard.tsx
│   │   ├── MOSelect.tsx
│   │   └── WeeklyBreakdownTable.tsx
│   ├── material/
│   │   ├── BOMTable.tsx
│   │   ├── StockLevelCard.tsx
│   │   └── MaterialIssueForm.tsx
│   ├── production/
│   │   ├── LineClearanceForm.tsx
│   │   ├── ProductionEntryForm.tsx
│   │   ├── ChangeOverForm.tsx
│   │   └── ProductionStatusCard.tsx
│   ├── postProduction/
│   │   ├── BarcodeGenerator.tsx
│   │   ├── GodownTransferForm.tsx
│   │   └── FGCategorySelect.tsx
│   ├── maintenance/
│   │   ├── BreakdownForm.tsx
│   │   ├── ScheduleCalendar.tsx
│   │   ├── SparePartCostTable.tsx
│   │   └── ConsumableSelect.tsx
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
│   └── returnWastage.queries.ts
├── hooks/
│   ├── usePlan.ts
│   ├── useLineClearance.ts
│   ├── useProductionEntry.ts
│   ├── useYieldCalculation.ts
│   └── useMaintenanceSchedule.ts
├── schemas/
│   ├── planning.schema.ts
│   ├── material.schema.ts
│   ├── production.schema.ts
│   ├── postProduction.schema.ts
│   ├── maintenance.schema.ts
│   └── returnWastage.schema.ts
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
/production/manufacturing/line-clearance       → LineClearancePage
/production/manufacturing/entry                → ProductionEntryPage
/production/manufacturing/clearance            → ProductionClearancePage
/production/manufacturing/changeover           → ChangeOverPage

# Post Production
/production/post-production                    → BarcodingPage
/production/post-production/godown-transfer    → GodownTransferPage
/production/post-production/fg-inventory       → FGInventoryPage

# Return & Wastage
/production/return-wastage                     → ReturnEntryPage
/production/return-wastage/wastage             → WastageEntryPage
/production/return-wastage/yield               → YieldReportPage

# Maintenance
/production/maintenance                        → MaintenanceDashboardPage
/production/maintenance/breakdown              → BreakdownEntryPage
/production/maintenance/scheduled              → ScheduledMaintenancePage
/production/maintenance/spare-parts            → SparePartCostPage
/production/maintenance/consumables            → ConsumablesPage

# Reports
/production/reports/me                         → MEReportPage
/production/reports/pe                         → PEReportPage
/production/reports/yield                      → YieldReportPage
/production/reports/line-clearance             → LineClearanceReportPage
/production/reports/changeover                 → ChangeOverReportPage
```

---

## SAP Integration Points

The Production module interfaces with SAP at two critical points:

```
┌─────────────────────────────────────────────────────────────────┐
│                 SAP INTEGRATION                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Pre-Production (Material Purchase)                           │
│     FactoryFlow ──► SAP                                          │
│     - Material purchase requisition                              │
│     - Stock levels and availability                              │
│     - Purchase order reference                                   │
│                                                                  │
│  2. Issue to Store (Material Issue)                               │
│     FactoryFlow ──► SAP                                          │
│     - BOM-based material issue                                   │
│     - Material consumption recording                             │
│     - Inventory deduction                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Business Rules

1. **Planning**: Monthly plans must be broken down into weekly schedules before MO creation
2. **Material Buffer**: Store maintains ~30% buffer stock above planned requirement
3. **Line Clearance**: Production cannot start without line clearance sign-off
4. **BOM Issue**: Materials are issued strictly based on BOM (Bill of Materials)
5. **SAP Recording**: All material movements (purchase, issue) must be recorded in SAP
6. **Maintenance Scheduling**: Predictive/Scheduled maintenance must be planned 3 months in advance
7. **Yield Tracking**: All return/wastage must be recorded for yield report calculation
8. **FG Categorization**: All finished goods must be categorized (PF/FG/GP) before godown transfer
9. **Production Clearance**: Required sign-off before declaring a batch complete

---

## Integration with Existing Modules

```
┌─────────────────────────────────────────────────────────────────┐
│              MODULE INTEGRATION MAP                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Gate Module ──────────► Production Module                       │
│  (Raw Material Entry)    (Material available in Store)           │
│                                                                  │
│  Production Module ────► QC Module                               │
│  (In-process samples)    (Quality inspection)                    │
│                                                                  │
│  Production Module ────► GRPO Module                             │
│  (FG to Godown)          (Goods receipt posting)                 │
│                                                                  │
│  Note: Cross-module communication via shared state (Redux)       │
│  and API-level data sharing. No direct module imports.           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Modules Overview](./overview.md)
- [Gate Module](./gate.md) — Raw material entry feeds into Production
- [QC Module](./qc.md) — Quality control during/after production
- [GRPO Module](./grpo.md) — Goods receipt posting for finished goods
- [Architecture Overview](../architecture/overview.md)
- [Module Boundaries](../architecture/module-boundaries.md)
