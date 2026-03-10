# Production Execution Module - Design Document

> Sub-module of: **Production**
> Module path: `src/modules/production/execution/`
> Depends on: Production Planning module (for Production Orders)

---

## 1. Overview

The Production Execution module covers everything that happens **after** a production plan/order is created — from line clearance before production begins, through hourly production logging, material consumption tracking, machine runtime, breakdowns, maintenance checklists, waste management, and manpower tracking. The system auto-generates Daily Production Reports and Yield Reports.

This module is split into **3 layers**:

| Layer | Scope | Sub-Modules |
|-------|-------|-------------|
| **Level 1** — Master Data | Machines, Production Lines, Checklist Templates | Managed in Settings/Admin |
| **Level 2** — Transactions | Production Runs, Hourly Logs, Material Consumption, Breakdowns, Machine Runtime, Manpower | Core daily operations |
| **Level 3** — Quality & Maintenance | Line Clearance, Machine Checklists, Waste Approval | Pre/post production checks |

---

## 2. User Roles & Permissions

| Role | Permissions |
|------|------------|
| Production Operator | Create/edit production logs, material usage, breakdown entries |
| Shift Incharge | All operator permissions + approve line clearance, view reports |
| Production Engineer | All incharge permissions + machine checklists, breakdown analysis |
| Production HOD | All permissions + waste approval, report sign-off |
| QA Officer | Line clearance QA approval |
| Store Incharge | Material issue/receipt, wastage store sign-off |
| AM (Area Manager) | Wastage approval sign-off |

**Permissions (Django format):**

```
# Line Clearance
production.can_view_line_clearance
production.can_create_line_clearance
production.can_approve_line_clearance_qa

# Production Execution
production.can_view_production_run
production.can_create_production_run
production.can_edit_production_log
production.can_view_production_log

# Breakdowns
production.can_view_breakdown
production.can_create_breakdown
production.can_edit_breakdown

# Material Consumption
production.can_view_material_usage
production.can_create_material_usage
production.can_edit_material_usage

# Machine Runtime
production.can_view_machine_runtime
production.can_create_machine_runtime

# Maintenance Checklists
production.can_view_machine_checklist
production.can_create_machine_checklist
production.can_manage_checklist_template

# Waste Management
production.can_view_waste_log
production.can_create_waste_log
production.can_approve_waste_engineer
production.can_approve_waste_am
production.can_approve_waste_store
production.can_approve_waste_hod

# Manpower
production.can_view_manpower
production.can_create_manpower

# Reports
production.can_view_reports
production.can_sign_report
```

---

## 3. Data Model

### 3.1 Master Data (Level 1)

#### Production Line

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | e.g., "Line-1", "Line-2" |
| description | string | Optional description |
| is_active | boolean | Active status |

#### Machine

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | e.g., "10-Head Filler", "Tapping Machine" |
| machine_type | enum | FILLER, CAPPER, CONVEYOR, LABELER, CODING, SHRINK_PACK, STICKER_LABELER, TAPPING_MACHINE |
| line_id | FK(Line) | Assigned production line |
| is_active | boolean | Active status |

#### Machine Checklist Template

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| machine_type | enum | Machine type this template applies to |
| task | string | e.g., "Clean oil storage tank", "Check belt condition" |
| frequency | enum | DAILY, WEEKLY, MONTHLY |
| sort_order | integer | Display order |

### 3.2 Transaction Data (Level 2)

#### Production Run

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| production_order_id | FK(ProductionPlan) | Links to planning module |
| run_number | integer | Run 1, 2, 3 within a day |
| date | date | Production date |
| line_id | FK(Line) | Production line used |
| brand | string | e.g., "Extra Light" |
| pack | string | e.g., "1L x 12" |
| sap_order_no | string | SAP Production Order number |
| rated_speed | decimal | Rated speed (units/min) |
| total_production | integer | Total cases produced |
| total_minutes_pe | integer | Total production equipment minutes |
| total_minutes_me | integer | Total machine efficiency minutes |
| total_breakdown_time | integer | Total breakdown minutes |
| line_breakdown_time | integer | Line-specific breakdown minutes |
| external_breakdown_time | integer | External breakdown minutes |
| unrecorded_time | integer | Unaccounted minutes |
| status | enum | DRAFT, IN_PROGRESS, COMPLETED |
| created_by | FK(User) | Creator |
| created_at | datetime | Creation timestamp |

#### Production Log (Hourly Entry)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| production_run_id | FK(Run) | Parent run |
| time_slot | string | e.g., "07:00-08:00" |
| time_start | time | Slot start time |
| time_end | time | Slot end time |
| produced_cases | integer | Cases produced in this hour |
| machine_status | enum | RUNNING, IDLE, BREAKDOWN, CHANGEOVER |
| recd_minutes | integer | Recorded minutes of production |
| breakdown_detail | string | Brief breakdown note for this slot |
| remarks | string | Additional notes |

#### Machine Breakdown

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| production_run_id | FK(Run) | Parent run |
| machine_id | FK(Machine) | Machine that broke down |
| start_time | datetime | Breakdown start |
| end_time | datetime | Breakdown end |
| breakdown_minutes | integer | Duration in minutes |
| type | enum | LINE, EXTERNAL |
| is_unrecovered | boolean | Whether time was recovered |
| reason | string | e.g., "sticker change", "air pressure issue", "power cut", "lunch break" |
| remarks | string | Additional details |

#### Production Material Usage (Yield Data)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| production_run_id | FK(Run) | Parent run |
| material_id | FK(Material) | Material from BOM |
| material_name | string | e.g., "Bottle (500gm)", "Cap", "Front Label" |
| opening_qty | decimal | Opening quantity |
| issued_qty | decimal | Quantity issued from store |
| closing_qty | decimal | Closing quantity |
| wastage_qty | decimal | Calculated: opening + issued - closing - produced_equivalent |
| uom | string | Unit of measure |
| batch_number | integer | Batch/shift identifier (1, 2, 3) |

**Standard Materials tracked:**
- Bottle (with gram weight)
- Cap
- Front Label
- Back Label
- Tikki
- Shrink
- Carton

#### Machine Runtime

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| production_run_id | FK(Run) | Parent run |
| machine_id | FK(Machine) | Machine |
| machine_type | enum | Machine type |
| runtime_minutes | integer | Actual running time |
| downtime_minutes | integer | Downtime |
| remarks | string | Notes |

**Standard Machines tracked per run:**
- Filler
- Capper
- Conveyor
- Labeler
- Coding
- Shrink Pack
- Sticker Labeler (Glass)
- Tapping Machine

#### Production Manpower

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| production_run_id | FK(Run) | Parent run |
| shift | enum | MORNING, AFTERNOON, NIGHT |
| worker_count | integer | Number of workers |
| supervisor | string | Supervisor name |
| engineer | string | Engineer name |
| remarks | string | Notes |

### 3.3 Quality & Maintenance (Level 3)

#### Line Clearance Header

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| date | date | Clearance date |
| line_id | FK(Line) | Production line |
| production_order_id | FK(ProductionPlan) | Associated production order |
| verified_by | FK(User) | Person who verified |
| qa_approved | boolean | QA officer approval |
| qa_approved_by | FK(User) | QA officer |
| qa_approved_at | datetime | QA approval timestamp |
| production_supervisor_sign | string | Production supervisor signature |
| production_incharge_sign | string | Production incharge signature |
| status | enum | DRAFT, SUBMITTED, CLEARED, NOT_CLEARED |
| document_id | string | e.g., "PRD-OIL-FRM-15-00-00-04" |
| created_at | datetime | Creation timestamp |

#### Line Clearance Checklist Item

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| clearance_id | FK(Clearance) | Parent clearance |
| checkpoint | string | Checklist item text |
| sort_order | integer | Display order |
| result | enum | YES, NO, NA |
| remarks | string | Notes |

**Standard Checklist Items (from PRD-OIL-FRM-15-00-00-04):**
1. Previous product, labels and packaging materials removed
2. Machine/equipment cleaned and free from product residues
3. Utensils, scoops and accessories cleaned and available
4. Packaging area free from previous batch coding material
5. Work area (tables, conveyors, floor) cleaned and sanitized
6. Waste bins emptied and cleaned
7. Required packaging material verified against BOM
8. Coding machine updated with correct product/batch details
9. Environmental conditions (temperature/humidity) within limits

#### Machine Checklist Entry

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| machine_id | FK(Machine) | Machine |
| machine_type | enum | Machine type |
| date | date | Entry date |
| month | integer | Month (for monthly view) |
| year | integer | Year |
| task_id | FK(Template) | Checklist template task |
| task_description | string | Task text (denormalized) |
| frequency | enum | DAILY, WEEKLY, MONTHLY |
| status | enum | OK, NOT_OK, NA |
| operator | string | Operator name |
| shift_incharge | string | Shift incharge sign-off |
| remarks | string | Notes |

**Machine-Specific Checklist Items:**

*Tin Filler Machine (Daily):*
1. Clean oil storage tank
2. Machine cleaning (all dust particles and abrasive particles)
3. Clean chain
4. Clean all sensors with dry cloth (infeed & outfeed sensors)
5. Clean all nozzle
6. Check oil leakage
7. Clean filler outfeed conveyor
8. Clean all body frame and structure
9. Check any abnormal sound in machine
10. Clean all solenoid valve and coil
11. Clean all cylinder
12. Clean strip machine
13. Clean all guides
14. Calibrate tare weight
15. Clean panel
16. Check motor voltage and cutter

*10-Head Filler Machine (Weekly):*
1. Check oil leakage from tank to filler
2. Check all air regulators
3. Lubrication of machine (gear & height adjustment unit)
4. Clean panel cooling fans, filters, drive
5. Check alignment of all grippers
6. Tight all nuts and bolts
7. Clean FRL unit

*10-Head Filler Machine (Monthly):*
1. Check any physical damage
2. Check and clean filling valve, seal & solenoid coil
3. Clean panel and tighten loose connections
4. Check motor voltage, earthing & current
5. Maintain inventory of solenoid valve and coil

*Tapping Machine (Daily):*
1. Clean dust from all machines
2. Check belt condition
3. Check all rollers
4. Check cutter sharpness

*Tapping Machine (Weekly):*
1. Check loose wiring
2. Tight all nuts and bolts

*Tapping Machine (Monthly):*
1. Check current & voltage of motor

#### Waste Log

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| production_run_id | FK(Run) | Parent run |
| material_id | FK(Material) | Material wasted |
| material_name | string | Material name |
| wastage_qty | decimal | Quantity wasted |
| uom | string | Unit of measure |
| reason | string | Reason for wastage |
| engineer_sign | string | Engineer approval |
| engineer_signed_at | datetime | Timestamp |
| am_sign | string | AM approval |
| am_signed_at | datetime | Timestamp |
| store_sign | string | Store approval |
| store_signed_at | datetime | Timestamp |
| hod_sign | string | HOD approval |
| hod_signed_at | datetime | Timestamp |
| wastage_approval_status | enum | PENDING, PARTIALLY_APPROVED, FULLY_APPROVED |
| created_at | datetime | Creation timestamp |

---

## 4. Database Relationships

```
ProductionPlan (from Planning module)
   |
   +-- Production Run (1 plan can have multiple runs per day)
   |       |
   |       +-- Production Logs (hourly entries per run)
   |       |
   |       +-- Machine Breakdowns (breakdown events per run)
   |       |
   |       +-- Material Usage (material consumption per run)
   |       |
   |       +-- Machine Runtime (per machine per run)
   |       |
   |       +-- Manpower (workers per shift per run)
   |       |
   |       +-- Waste Logs (wastage records per run)
   |
   +-- Line Clearance (pre-production check per order)
           |
           +-- Clearance Checklist Items

Machine
   |
   +-- Machine Checklist Entries (daily/weekly/monthly)

Machine Checklist Template (master)
   |
   +-- Machine Checklist Entries (linked tasks)
```

---

## 5. Pages & Routes

### 5.1 Route Structure

```
/production/execution                              - Production Execution Dashboard
/production/execution/runs                          - Active Production Runs list
/production/execution/runs/start                    - Start New Production Run
/production/execution/runs/:runId                   - Production Run Detail (hourly entry)
/production/execution/runs/:runId/yield             - Yield Report for run

/production/execution/line-clearance                - Line Clearance list
/production/execution/line-clearance/new            - Create Line Clearance
/production/execution/line-clearance/:clearanceId   - View/Edit Line Clearance

/production/execution/breakdowns                    - Breakdown log list
/production/execution/breakdowns/:runId             - Breakdowns for a run

/production/execution/machine-checklists            - Machine Checklist Dashboard
/production/execution/machine-checklists/:machineId - Checklist entries for a machine
/production/execution/machine-checklists/templates  - Manage checklist templates

/production/execution/waste                         - Waste Log & Approval
/production/execution/waste/:runId                  - Waste for a run

/production/execution/reports                       - Reports Dashboard
/production/execution/reports/daily-production      - Daily Production Report
/production/execution/reports/yield                 - Yield Report
/production/execution/reports/line-clearance        - Line Clearance Report
```

### 5.2 Pages

#### A. Production Execution Dashboard (`ExecutionDashboardPage`)

Overview page showing today's production status across all lines.

- **Summary Cards:**
  - Today's Production (total cases)
  - Active Runs
  - Total Breakdown Time (minutes)
  - Line Efficiency (%)
- **Active Runs Table:** Run ID, Line, Brand/Pack, Status, Hourly Progress mini-chart
- **Quick Actions:** Start New Run, Line Clearance, Enter Breakdown, View Reports
- **Alerts:** Pending line clearances, unapproved waste logs, overdue checklists

#### B. Start Production Run (`StartRunPage`)

Form to begin a new production run.

- **Fields:**
  - Production Order (searchable select from planning module)
  - Line (dropdown of production lines)
  - Run Number (auto-incremented: Run 1, Run 2, Run 3)
  - Date (defaults to today)
  - Brand (auto-filled from order)
  - Pack (auto-filled from order)
  - SAP Order No. (text input)
  - Rated Speed (number input)
  - Manpower count, Supervisor, Engineer
- **Pre-check:** System checks if Line Clearance exists for this order+line. If not, shows warning with link to create one.

#### C. Production Run Detail — Hourly Entry (`RunDetailPage`)

The core data entry page matching the Daily Production Report format.

- **Run Header:** Brand, Pack, Line, Date, SAP Order No, Status
- **Summary Row:** Total Production, Total PE Minutes, Total ME Minutes, Total Breakdown, Manpower
- **Hourly Production Grid (main content):**

| TIME | PROD (CASES) | MACHINE STATUS | RECD MINS | BREAKDOWN DETAIL |
|------|-------------|----------------|-----------|-----------------|
| 07:00 - 08:00 | 90 | Running | 55 | Sticker changeover |
| 08:00 - 09:00 | 78 | Running | 50 | Tappi |
| 09:00 - 10:00 | 125 | Running | 60 | — |
| 10:00 - 11:00 | 97 | Running | 58 | — |
| 11:00 - 12:00 | 118 | Running | 60 | — |
| 12:00 - 13:00 | 149 | Running | 60 | Lunch break |
| 13:00 - 14:00 | 138 | Running | 60 | — |
| 14:00 - 15:00 | 45 | Breakdown | 25 | Power cut |
| 15:00 - 16:00 | 141 | Running | 60 | — |
| 16:00 - 17:00 | — | Idle | 0 | Man power |
| 17:00 - 18:00 | 130 | Running | 60 | — |
| 18:00 - 19:00 | — | — | — | — |

- **Time slots:** Pre-defined 7:00-19:00 (12 slots), each row is inline-editable
- **Auto-calculations:**
  - Total Production = sum of all PROD columns
  - Total Breakdown = sum of breakdown minutes
  - Speed = Total Production / (Total Minutes - Breakdown)
  - Efficiency = (Actual Speed / Rated Speed) x 100

- **Runs Tabs:** If multiple runs (Run 1, Run 2, Run 3), show as tabs at top
- **Action Buttons:** Save Draft, Complete Run, View Yield Report
- **Signature Section:** Associate sign, Engineer sign, HOD sign

#### D. Yield Report Page (`YieldReportPage`)

Material consumption and machine time for a completed run.

- **Machine Time Section:**

| MACHINE | TIME (min) |
|---------|-----------|
| Filler | 420 |
| Capper | 415 |
| Conveyor | 430 |
| Labeler | 400 |
| Coding | 425 |
| Shrink Pack | 410 |
| Sticker Labeler | 380 |
| Tapping Machine | 420 |

- **Material Consumption Table (repeats per batch/shift):**

| MATERIAL | OPENING QTY | ISSUE QTY | CLOSING QTY | WASTAGE QTY |
|----------|------------|-----------|-------------|-------------|
| Bottle (500gm) | 5000 | 2000 | 4800 | 200 |
| Cap | 5000 | 2000 | 4850 | 150 |
| Front Label | 5000 | 2000 | 4900 | 100 |
| Back Label | 5000 | 2000 | 4880 | 120 |
| Tikki | 5000 | 2000 | 4950 | 50 |
| Shrink | 1000 | 500 | 900 | 100 |
| Carton | 500 | 200 | 480 | 20 |

- **Additional Fields:** Manpower, Material cost, Utility cost, Total cost
- **Signature Section:** Engineer, AM, Store, Wastage Approval, HOD

#### E. Line Clearance Page (`LineClearancePage`)

Pre-production checklist form.

- **Header:** Date, Line, Production Order (searchable select), Document ID
- **Checklist Table:**

| # | CHECKPOINT | YES | NO | N/A | REMARKS |
|---|-----------|-----|-----|-----|---------|
| 1 | Previous product, labels and packaging materials removed | (radio) | (radio) | (radio) | (text) |
| 2 | Machine/equipment cleaned and free from product residues | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... |
| 9 | Environmental conditions (temperature/humidity) within limits | ... | ... | ... | ... |

- **Authorization Section:**
  - Production Supervisor signature
  - Production Incharge signature
  - QA Officer signature
- **Decision:** Cleared for Production / Not Cleared (radio)
- **Actions:** Save Draft, Submit for QA Approval

#### F. Machine Checklist Dashboard (`MachineChecklistPage`)

Monthly calendar view of machine checklist entries.

- **Filter Bar:** Machine type dropdown, Line dropdown, Month/Year picker
- **Calendar Grid:** Days as columns, checklist tasks as rows
  - Cells show OK (green check), NOT_OK (red X), or empty
  - Click cell to mark status
- **Separate sections for:** Daily items, Weekly items, Monthly items
- **Signature row:** Operator, Shift Incharge per day

#### G. Waste Management Page (`WasteManagementPage`)

Waste log with multi-level approval workflow.

- **Waste Log Table:**

| Material | Wastage Qty | Reason | Engineer | AM | Store | HOD | Status |
|----------|------------|--------|----------|-----|-------|-----|--------|
| Bottle | 200 | Dented | Signed | Signed | Pending | Pending | Partially Approved |
| Cap | 150 | Damaged | Signed | Pending | — | — | Pending |

- **Approval Flow:** Engineer → AM → Store → HOD (sequential)
- **Each approver sees:** Pending items with Approve/Reject buttons
- **Approval action:** Sign button opens confirmation with remarks field

#### H. Reports Dashboard (`ReportsPage`)

Auto-generated reports with print/export capability.

- **Daily Production Report:** Mirrors the paper form exactly
- **Yield Report:** Material consumption + machine time
- **Line Clearance Report:** Clearance status summary
- **Analytics Cards:**
  - OEE (Overall Equipment Effectiveness)
  - Line Efficiency (%)
  - Material Loss (%)
  - Machine Downtime (hours)
  - Production vs Plan (% achievement)

---

## 6. API Endpoints

```
# Master Data
GET    /api/v1/production/lines/                              - List production lines
GET    /api/v1/production/machines/                            - List machines
GET    /api/v1/production/machines/?type=FILLER&line=1         - Filter machines
GET    /api/v1/production/checklist-templates/                 - List checklist templates
POST   /api/v1/production/checklist-templates/                 - Create template
PATCH  /api/v1/production/checklist-templates/:id/             - Update template
DELETE /api/v1/production/checklist-templates/:id/             - Delete template

# Production Runs
GET    /api/v1/production/runs/                                - List runs (filter by date, line, status)
POST   /api/v1/production/runs/                                - Start new run
GET    /api/v1/production/runs/:runId/                         - Get run detail
PATCH  /api/v1/production/runs/:runId/                         - Update run
POST   /api/v1/production/runs/:runId/complete/                - Complete run

# Hourly Production Logs
GET    /api/v1/production/runs/:runId/logs/                    - Get hourly logs for run
POST   /api/v1/production/runs/:runId/logs/                    - Create/update hourly log
PATCH  /api/v1/production/runs/:runId/logs/:logId/             - Update single log entry

# Breakdowns
GET    /api/v1/production/runs/:runId/breakdowns/              - List breakdowns for run
POST   /api/v1/production/runs/:runId/breakdowns/              - Add breakdown
PATCH  /api/v1/production/runs/:runId/breakdowns/:id/          - Update breakdown
DELETE /api/v1/production/runs/:runId/breakdowns/:id/          - Delete breakdown

# Material Usage (Yield)
GET    /api/v1/production/runs/:runId/materials/               - Get material usage
POST   /api/v1/production/runs/:runId/materials/               - Add/update material entry
PATCH  /api/v1/production/runs/:runId/materials/:id/           - Update material entry

# Machine Runtime
GET    /api/v1/production/runs/:runId/machine-runtime/         - Get machine runtime
POST   /api/v1/production/runs/:runId/machine-runtime/         - Add machine runtime
PATCH  /api/v1/production/runs/:runId/machine-runtime/:id/     - Update machine runtime

# Manpower
GET    /api/v1/production/runs/:runId/manpower/                - Get manpower for run
POST   /api/v1/production/runs/:runId/manpower/                - Add manpower entry
PATCH  /api/v1/production/runs/:runId/manpower/:id/            - Update manpower

# Line Clearance
GET    /api/v1/production/line-clearance/                      - List clearances
POST   /api/v1/production/line-clearance/                      - Create clearance
GET    /api/v1/production/line-clearance/:id/                  - Get clearance detail
PATCH  /api/v1/production/line-clearance/:id/                  - Update clearance
POST   /api/v1/production/line-clearance/:id/submit/           - Submit for approval
POST   /api/v1/production/line-clearance/:id/approve/          - QA approve/reject

# Machine Checklists
GET    /api/v1/production/machine-checklists/                  - List entries (filter: machine, month, year)
POST   /api/v1/production/machine-checklists/                  - Create entry
PATCH  /api/v1/production/machine-checklists/:id/              - Update entry
POST   /api/v1/production/machine-checklists/bulk/             - Bulk create/update (calendar save)

# Waste Management
GET    /api/v1/production/waste/                               - List waste logs
POST   /api/v1/production/waste/                               - Create waste log
GET    /api/v1/production/waste/:id/                           - Get waste detail
POST   /api/v1/production/waste/:id/approve/engineer/          - Engineer approval
POST   /api/v1/production/waste/:id/approve/am/                - AM approval
POST   /api/v1/production/waste/:id/approve/store/             - Store approval
POST   /api/v1/production/waste/:id/approve/hod/               - HOD approval

# Reports
GET    /api/v1/production/reports/daily-production/            - Daily production report
GET    /api/v1/production/reports/yield/:runId/                - Yield report for run
GET    /api/v1/production/reports/line-clearance/              - Line clearance summary
GET    /api/v1/production/reports/analytics/                   - OEE, efficiency, etc.
GET    /api/v1/production/reports/analytics/oee/               - OEE breakdown
GET    /api/v1/production/reports/analytics/downtime/          - Downtime analysis
GET    /api/v1/production/reports/analytics/material-loss/     - Material loss analysis
```

---

## 7. Workflow: Production Day

The typical daily workflow:

```
1. Line Clearance
   └── Operator fills checklist → Supervisor signs → QA approves → "Cleared for Production"

2. Start Production Run
   └── Select Production Order → Select Line → Enter Run details → Start

3. Hourly Production Entry (core loop)
   └── Every hour: Enter cases produced, machine status, breakdown details
   └── System auto-calculates speed, efficiency in real-time

4. Log Breakdowns (as they occur)
   └── Record machine, start/end time, reason, type (line/external)

5. End of Run
   └── Enter material consumption (opening, issued, closing → wastage auto-calculated)
   └── Enter machine runtime per equipment
   └── Record manpower

6. Auto-Generate Reports
   └── Daily Production Report (from hourly logs + breakdowns)
   └── Yield Report (from material usage + machine runtime)

7. Waste Approval (if wastage exists)
   └── Engineer signs → AM signs → Store signs → HOD signs

8. Machine Checklists (parallel, daily)
   └── Operators fill daily checklist items
   └── Shift incharge signs off
```

---

## 8. Auto-Calculations

| Metric | Formula |
|--------|---------|
| Total Production | SUM(hourly_produced_cases) |
| Total Breakdown Time | SUM(breakdown_minutes) |
| Available Time | Total shift minutes - Planned downtime (lunch, etc.) |
| Operating Time | Available Time - Breakdown Time |
| Speed (actual) | Total Production / Operating Time |
| Performance | (Actual Speed / Rated Speed) x 100 |
| Availability | Operating Time / Available Time x 100 |
| OEE | Availability x Performance x Quality / 10000 |
| Line Efficiency | (Actual output / Theoretical max output) x 100 |
| Material Wastage | Opening + Issued - Closing - (Produced x BOM ratio) |
| Material Loss % | (Wastage Qty / Total Used) x 100 |

---

## 9. UI Structure

```
Production (sidebar section)
  ├── Dashboard (execution overview)
  ├── Production Orders (from planning)
  ├── Start Production Run
  ├── Hourly Production Entry
  ├── Material Usage / Yield
  ├── Breakdown Entry
  ├── Line Clearance
  ├── Machine Checklist
  ├── Waste Management
  └── Reports
       ├── Daily Production Report
       ├── Yield Report
       ├── Line Clearance Report
       └── Analytics (OEE, Efficiency)
```

---

## 10. Technical Notes

### Follows existing project conventions:
- Module structure: `src/modules/production/execution/`
  - `pages/` - Page components
  - `components/` - Module-specific components
  - `api/` - API functions + React Query hooks
  - `types/` - TypeScript interfaces
  - `schemas/` - Zod validation schemas
  - `constants/` - Module constants
  - `hooks/` - Custom hooks
  - `module.config.tsx` - Module registration
- Form validation: Zod + React Hook Form
- API layer: Axios + React Query (TanStack)
- Permissions: Django-format permission strings
- UI: Shadcn/ui + Tailwind CSS
- State: Redux Toolkit for local edits, React Query for server state

### Key Design Decisions:
- **Production Run as the central entity** — all hourly logs, breakdowns, material usage, machine runtime, and manpower attach to a Run
- **Time slots are pre-defined** (7:00-19:00) — operator fills in data per slot, not free-form
- **Material consumption uses batch pattern** — the yield report can have up to 3 material tables per run (for different batches/shifts)
- **Machine checklist uses calendar grid** — monthly view with days as columns, matching the paper format
- **Waste approval is sequential** — Engineer → AM → Store → HOD, each must approve before next
- **Reports auto-generate** — no manual report creation, system compiles from transaction data
