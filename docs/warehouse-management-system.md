# Warehouse Management System (WMS) - Implementation Plan

## 1. Overview

The Warehouse Management System is a new module for FactoryFlow that provides inventory visibility, stock movements, and warehouse operations for Jivo Wellness factories. The system integrates with SAP Business One (which already manages warehouse master data, stock levels, and inventory transactions) and extends it with factory-floor-level operational workflows.

### 1.1 Goals

- Provide real-time inventory visibility across all warehouses
- Enable stock transfer requests and execution between warehouses
- Support goods issue workflows for production and other consumption
- Enable stock counting (cycle counts & physical inventory)
- Track inbound putaway after GRPO completion
- Support outbound picking and dispatch preparation
- Maintain full audit trail of all warehouse movements
- Integrate with SAP for authoritative stock data while enabling offline-capable operations

### 1.2 What SAP Already Manages

| Capability | SAP Level | FactoryFlow Role |
|---|---|---|
| Warehouse master data (codes, names) | Full — OITW table | Read-only sync via HANA |
| Item master data | Full — OITM table | Read-only sync via HANA |
| Stock quantities (on-hand, committed, ordered) | Full — OITW table | Read & display |
| Goods Receipt PO (GRPO) | Full — via Service Layer | Already implemented (grpo module) |
| Inventory transfers | Supported — Stock Transfer API | FactoryFlow initiates, SAP records |
| Goods Issue | Supported — Goods Issue API | FactoryFlow initiates, SAP records |
| Inventory counting | Supported — Inventory Counting API | FactoryFlow initiates, SAP records |
| Bin locations | Unknown — needs investigation | TBD based on SAP config |
| Batch/serial tracking | Unknown — needs investigation | TBD based on SAP config |

> **Action Item:** Investigate SAP B1 configuration to determine:
> 1. Are bin locations enabled in any warehouse?
> 2. Is batch management enabled for any items?
> 3. Is serial number management used?
> 4. What inventory counting documents exist?
> 5. Are stock transfer requests vs stock transfers both used?

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────┐
│                   FactoryFlow WMS                    │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Frontend  │  │ Backend  │  │  SAP Integration  │  │
│  │ (React)   │←→│ (Django) │←→│  HANA + SL        │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│                      ↕                               │
│               ┌──────────┐                           │
│               │PostgreSQL│                           │
│               └──────────┘                           │
└─────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Philosophy

**SAP is the source of truth** for stock quantities and financial inventory.

FactoryFlow handles:
- **Operational workflows** (who requested what, approvals, task assignment)
- **Real-time tracking** (where is the forklift operator, what's been picked)
- **Factory-specific logic** (custom validations, notifications, dashboards)

**Pattern:**
1. User initiates action in FactoryFlow (e.g., stock transfer request)
2. FactoryFlow validates, routes approvals, tracks execution
3. On completion, FactoryFlow posts the transaction to SAP via Service Layer
4. SAP updates authoritative stock levels
5. FactoryFlow reads back updated stock from HANA for display

### 2.3 Module Structure

```
Backend: factory_app_v2/
├── warehouse/                    # NEW Django app
│   ├── models.py                # Warehouse operations models
│   ├── views.py                 # API views
│   ├── urls.py                  # URL routing
│   ├── services.py              # Business logic
│   ├── serializers.py           # DRF serializers
│   ├── permissions.py           # Module permissions
│   ├── hana_reader.py           # SAP HANA queries for stock data
│   ├── sap_writer.py            # SAP Service Layer writers
│   └── admin.py                 # Django admin

Frontend: src/modules/warehouse/  # NEW module
├── module.config.tsx            # Module registration
├── api/
│   ├── warehouse.api.ts         # API client functions
│   └── warehouse.queries.ts     # React Query hooks
├── components/                  # Shared warehouse components
├── constants/                   # Warehouse constants
├── schemas/                     # Zod validation schemas
├── types/                       # TypeScript types
└── pages/
    ├── dashboard/               # Warehouse overview dashboard
    ├── inventory/               # Stock visibility & search
    ├── transfers/               # Stock transfer workflows
    ├── goods-issue/             # Goods issue workflows
    ├── counting/                # Stock counting / cycle counts
    ├── putaway/                 # Inbound putaway tasks
    └── picking/                 # Outbound picking tasks
```

---

## 3. Feature Breakdown

### 3.1 Warehouse Dashboard

**Purpose:** Single-screen overview of warehouse health and activity.

**Data Sources:**
- Stock levels → SAP HANA (OITW)
- Pending tasks → PostgreSQL (FactoryFlow)
- Recent movements → PostgreSQL + SAP HANA

**Components:**
| Component | Description | Source |
|---|---|---|
| Warehouse selector | Switch between warehouses | SAP HANA (OITW → distinct warehouses) |
| Stock summary cards | Total items, total value, item count by group | SAP HANA |
| Pending tasks widget | Open transfers, counts, putaways, picks | PostgreSQL |
| Recent movements | Last N stock movements | PostgreSQL |
| Alerts | Low stock, aging inventory, pending approvals | SAP HANA + PostgreSQL |
| Quick actions | New transfer, new count, search inventory | Navigation |

**API Endpoints:**
```
GET /api/v1/warehouse/dashboard/summary/
    ?warehouse_code=WH01
    Response: { stock_summary, pending_tasks, alerts, recent_movements }
```

---

### 3.2 Inventory Visibility

**Purpose:** Search, browse, and view stock across all warehouses.

**This extends the existing dashboard modules** (inventory-age, stock-level, non-moving) with an operational focus rather than analytical focus.

**Features:**
- Search items by code, name, group
- View stock by warehouse with drill-down
- View item detail: on-hand, committed, ordered, available
- View item movement history
- Filter by item group, warehouse, stock status
- Export to Excel

**Data Sources:**
- All stock data from SAP HANA (OITM, OITW, OITB tables)
- Movement history from SAP HANA (OINM — Inventory Audit table) + PostgreSQL

**API Endpoints:**
```
GET /api/v1/warehouse/inventory/
    ?search=&warehouse=&item_group=&page=&page_size=
    Response: { results: [...items], meta: { total, page, ... } }

GET /api/v1/warehouse/inventory/{item_code}/
    Response: { item_detail, warehouse_breakdown: [...], movement_history: [...] }

GET /api/v1/warehouse/inventory/{item_code}/movements/
    ?from_date=&to_date=&warehouse=
    Response: { movements: [...] }
```

**SAP HANA Queries:**
```sql
-- Item stock across warehouses
SELECT T0."ItemCode", T0."ItemName", T0."ItmsGrpCod",
       T1."WhsCode", T1."OnHand", T1."IsCommited", T1."OnOrder"
FROM "{schema}"."OITM" T0
JOIN "{schema}"."OITW" T1 ON T0."ItemCode" = T1."ItemCode"
WHERE T1."OnHand" > 0
  AND T1."WhsCode" = :warehouse_code  -- optional filter

-- Movement history (if OINM is accessible)
SELECT "ItemCode", "Warehouse", "InQty", "OutQty", "TransType", "CreateDate"
FROM "{schema}"."OINM"
WHERE "ItemCode" = :item_code
ORDER BY "CreateDate" DESC
```

---

### 3.3 Stock Transfers

**Purpose:** Request, approve, and execute inventory transfers between warehouses.

**Workflow:**
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│ REQUEST  │────→│ APPROVAL │────→│ PICKING  │────→│ IN-TRANSIT│────→│ RECEIVED │
│ (Store)  │     │(Manager) │     │(Operator)│     │           │     │(Dest WH) │
└──────────┘     └──────────┘     └──────────┘     └───────────┘     └──────────┘
                      │                                                    │
                      │ Reject                                             │
                      ↓                                                    ↓
                 ┌──────────┐                                     ┌──────────────┐
                 │ REJECTED │                                     │ POST TO SAP  │
                 └──────────┘                                     │(Stock Xfer)  │
                                                                  └──────────────┘
```

**Statuses:** `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `PICKING` → `IN_TRANSIT` → `RECEIVED` → `POSTED_TO_SAP`

Also: `REJECTED`, `CANCELLED`

**Models (PostgreSQL):**
```python
class StockTransferRequest(models.Model):
    transfer_number       # Auto-generated (e.g., STR-2026-0001)
    from_warehouse_code   # SAP warehouse code
    from_warehouse_name
    to_warehouse_code
    to_warehouse_name
    status                # Workflow status
    requested_by          # FK → User
    approved_by           # FK → User (nullable)
    picked_by             # FK → User (nullable)
    received_by           # FK → User (nullable)
    request_date
    approval_date
    pick_date
    transit_date
    receive_date
    sap_doc_entry         # SAP Stock Transfer doc entry (after posting)
    sap_doc_num           # SAP Stock Transfer doc number
    notes
    company               # FK → Company
    created_at
    updated_at

class StockTransferLine(models.Model):
    transfer_request      # FK → StockTransferRequest
    item_code             # SAP item code
    item_name
    requested_qty
    picked_qty            # May differ from requested
    received_qty          # May differ from picked (damages, etc.)
    uom                   # Unit of measure
    from_available_qty    # Snapshot at request time
    notes
```

**SAP Integration:**
- On `RECEIVED` status → POST to SAP Service Layer:
  ```
  POST /b1s/v2/StockTransfers
  {
    "FromWarehouse": "WH01",
    "ToWarehouse": "WH02",
    "StockTransferLines": [
      {
        "ItemCode": "RM001",
        "Quantity": 100,
        "FromWarehouseCode": "WH01",
        "ToWarehouseCode": "WH02"
      }
    ]
  }
  ```

**API Endpoints:**
```
GET    /api/v1/warehouse/transfers/                    # List transfers
POST   /api/v1/warehouse/transfers/                    # Create transfer request
GET    /api/v1/warehouse/transfers/{id}/               # Transfer detail
PATCH  /api/v1/warehouse/transfers/{id}/               # Update draft
POST   /api/v1/warehouse/transfers/{id}/submit/        # Submit for approval
POST   /api/v1/warehouse/transfers/{id}/approve/       # Approve
POST   /api/v1/warehouse/transfers/{id}/reject/        # Reject
POST   /api/v1/warehouse/transfers/{id}/start-pick/    # Begin picking
POST   /api/v1/warehouse/transfers/{id}/complete-pick/ # Picking done
POST   /api/v1/warehouse/transfers/{id}/dispatch/      # Mark in-transit
POST   /api/v1/warehouse/transfers/{id}/receive/       # Receive at destination
POST   /api/v1/warehouse/transfers/{id}/post-to-sap/   # Post to SAP
DELETE /api/v1/warehouse/transfers/{id}/               # Cancel draft
```

**Permissions:**
```python
warehouse.can_request_transfer
warehouse.can_approve_transfer
warehouse.can_pick_transfer
warehouse.can_receive_transfer
warehouse.can_post_transfer_to_sap
warehouse.can_view_transfers
```

---

### 3.4 Goods Issue

**Purpose:** Issue materials from warehouse for production, maintenance, or other consumption.

**Types:**
1. **Production Issue** — Materials for production orders (links to production_execution module)
2. **Maintenance Issue** — Spare parts for maintenance
3. **General Issue** — Ad-hoc consumption (cleaning, samples, etc.)

**Workflow:**
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────┐
│ REQUEST  │────→│ APPROVAL │────→│ ISSUED   │────→│ POST TO SAP  │
│          │     │(Manager) │     │(Store)   │     │(Goods Issue) │
└──────────┘     └──────────┘     └──────────┘     └──────────────┘
```

**Statuses:** `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `ISSUED` → `POSTED_TO_SAP`

Also: `REJECTED`, `CANCELLED`

**Models (PostgreSQL):**
```python
class GoodsIssueRequest(models.Model):
    issue_number          # Auto-generated (e.g., GI-2026-0001)
    issue_type            # PRODUCTION, MAINTENANCE, GENERAL
    warehouse_code        # Source warehouse
    warehouse_name
    status
    requested_by          # FK → User
    approved_by           # FK → User
    issued_by             # FK → User (store keeper)
    production_run        # FK → ProductionRun (nullable, for production issues)
    department            # FK → Department (for maintenance/general)
    reason                # Text description
    sap_doc_entry
    sap_doc_num
    company               # FK → Company
    created_at
    updated_at

class GoodsIssueLine(models.Model):
    issue_request         # FK → GoodsIssueRequest
    item_code
    item_name
    requested_qty
    issued_qty
    uom
    available_qty         # Snapshot at request time
    cost_center           # SAP cost center (if applicable)
    notes
```

**SAP Integration:**
- On `ISSUED` status → POST to SAP Service Layer:
  ```
  POST /b1s/v2/InventoryGenExits
  {
    "DocumentLines": [
      {
        "ItemCode": "RM001",
        "Quantity": 50,
        "WarehouseCode": "WH01",
        "CostingCode": "CC001"  // optional cost center
      }
    ]
  }
  ```

**API Endpoints:**
```
GET    /api/v1/warehouse/goods-issue/                  # List
POST   /api/v1/warehouse/goods-issue/                  # Create
GET    /api/v1/warehouse/goods-issue/{id}/             # Detail
PATCH  /api/v1/warehouse/goods-issue/{id}/             # Update draft
POST   /api/v1/warehouse/goods-issue/{id}/submit/      # Submit for approval
POST   /api/v1/warehouse/goods-issue/{id}/approve/     # Approve
POST   /api/v1/warehouse/goods-issue/{id}/reject/      # Reject
POST   /api/v1/warehouse/goods-issue/{id}/issue/       # Execute issue
POST   /api/v1/warehouse/goods-issue/{id}/post-to-sap/ # Post to SAP
```

**Permissions:**
```python
warehouse.can_request_goods_issue
warehouse.can_approve_goods_issue
warehouse.can_execute_goods_issue
warehouse.can_post_goods_issue_to_sap
warehouse.can_view_goods_issue
```

---

### 3.5 Stock Counting (Cycle Count & Physical Inventory)

**Purpose:** Verify physical stock matches system records, reconcile discrepancies.

**Types:**
1. **Cycle Count** — Periodic count of a subset of items (by group, warehouse, ABC class)
2. **Physical Inventory** — Full warehouse count (typically annual)

**Workflow:**
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────────┐
│ PLANNED  │────→│ COUNTING │────→│ REVIEW   │────→│ APPROVED  │────→│ POST TO SAP  │
│(Manager) │     │(Operator)│     │(Manager) │     │           │     │(Inv Count)   │
└──────────┘     └──────────┘     └──────────┘     └───────────┘     └──────────────┘
```

**Statuses:** `PLANNED` → `IN_PROGRESS` → `PENDING_REVIEW` → `APPROVED` → `POSTED_TO_SAP`

Also: `CANCELLED`

**Models (PostgreSQL):**
```python
class StockCount(models.Model):
    count_number          # Auto-generated (e.g., SC-2026-0001)
    count_type            # CYCLE_COUNT, PHYSICAL_INVENTORY
    warehouse_code
    warehouse_name
    status
    planned_by            # FK → User
    counted_by            # FK → User
    reviewed_by           # FK → User
    planned_date
    count_date
    review_date
    item_group_filter     # Optional — only count specific group
    notes
    sap_doc_entry
    sap_doc_num
    company               # FK → Company
    created_at
    updated_at

class StockCountLine(models.Model):
    stock_count           # FK → StockCount
    item_code
    item_name
    system_qty            # Quantity per SAP at count time
    counted_qty           # Physical count
    variance_qty          # counted_qty - system_qty (computed)
    variance_pct          # Percentage variance
    uom
    notes                 # Operator notes for discrepancies
    counted_at            # Timestamp of count
```

**SAP Integration:**
- On `APPROVED` → POST to SAP Service Layer:
  ```
  POST /b1s/v2/InventoryCountings
  {
    "CountDate": "2026-04-01",
    "InventoryCountingLines": [
      {
        "ItemCode": "RM001",
        "WarehouseCode": "WH01",
        "CountedQuantity": 95
      }
    ]
  }
  ```
  > **Note:** SAP may use Inventory Posting for adjustments instead. Verify which API is available in the SAP B1 instance.

**API Endpoints:**
```
GET    /api/v1/warehouse/counting/                     # List counts
POST   /api/v1/warehouse/counting/                     # Plan new count
GET    /api/v1/warehouse/counting/{id}/                # Count detail
POST   /api/v1/warehouse/counting/{id}/start/          # Begin counting
PATCH  /api/v1/warehouse/counting/{id}/lines/{line_id}/ # Record count for a line
POST   /api/v1/warehouse/counting/{id}/submit/         # Submit for review
POST   /api/v1/warehouse/counting/{id}/approve/        # Approve
POST   /api/v1/warehouse/counting/{id}/post-to-sap/   # Post to SAP
GET    /api/v1/warehouse/counting/{id}/variance-report/ # Variance analysis
```

**Permissions:**
```python
warehouse.can_plan_stock_count
warehouse.can_execute_stock_count
warehouse.can_review_stock_count
warehouse.can_post_stock_count_to_sap
warehouse.can_view_stock_count
```

---

### 3.6 Putaway (Post-GRPO)

**Purpose:** After GRPO is posted, guide warehouse operators to put received materials in the correct location/warehouse.

**This connects to the existing GRPO module.** When a GRPO is posted successfully, a putaway task is automatically created.

**Workflow:**
```
┌────────────┐     ┌──────────┐     ┌───────────┐
│ GRPO Posted│────→│ PUTAWAY  │────→│ COMPLETED │
│ (Auto)     │     │(Operator)│     │           │
└────────────┘     └──────────┘     └───────────┘
```

**Statuses:** `PENDING` → `IN_PROGRESS` → `COMPLETED`

**Models (PostgreSQL):**
```python
class PutawayTask(models.Model):
    task_number           # Auto-generated
    grpo_posting          # FK → GRPOPosting (from grpo module)
    warehouse_code        # Target warehouse
    warehouse_name
    status
    assigned_to           # FK → User (nullable)
    started_at
    completed_at
    company               # FK → Company
    created_at
    updated_at

class PutawayLine(models.Model):
    putaway_task          # FK → PutawayTask
    item_code
    item_name
    quantity
    uom
    put_away              # Boolean — has this line been put away?
    put_away_at
    notes
```

**API Endpoints:**
```
GET    /api/v1/warehouse/putaway/                      # List putaway tasks
GET    /api/v1/warehouse/putaway/{id}/                 # Task detail
POST   /api/v1/warehouse/putaway/{id}/start/           # Start putaway
PATCH  /api/v1/warehouse/putaway/{id}/lines/{line_id}/ # Mark line as put away
POST   /api/v1/warehouse/putaway/{id}/complete/        # Complete putaway
```

**Permissions:**
```python
warehouse.can_view_putaway
warehouse.can_execute_putaway
```

---

### 3.7 Picking (Outbound Preparation)

**Purpose:** Pick items from warehouse for outbound dispatch, production consumption, or other purposes.

**This connects to the outbound_dispatch module** (already exists in backend) and the goods issue workflow.

**Workflow:**
```
┌────────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│ PICK LIST  │────→│ PICKING  │────→│ STAGED   │────→│ DISPATCHED│
│ (Auto/Man) │     │(Operator)│     │(Ready)   │     │           │
└────────────┘     └──────────┘     └──────────┘     └───────────┘
```

**Statuses:** `PENDING` → `IN_PROGRESS` → `STAGED` → `DISPATCHED`

**Models (PostgreSQL):**
```python
class PickList(models.Model):
    pick_number           # Auto-generated
    source_type           # DISPATCH, GOODS_ISSUE, TRANSFER
    source_id             # Generic FK to source document
    warehouse_code
    warehouse_name
    status
    assigned_to           # FK → User
    priority              # HIGH, MEDIUM, LOW
    started_at
    completed_at
    company               # FK → Company
    created_at
    updated_at

class PickLine(models.Model):
    pick_list             # FK → PickList
    item_code
    item_name
    requested_qty
    picked_qty
    uom
    picked                # Boolean
    picked_at
    notes
```

**API Endpoints:**
```
GET    /api/v1/warehouse/picking/                      # List pick lists
GET    /api/v1/warehouse/picking/{id}/                 # Pick list detail
POST   /api/v1/warehouse/picking/{id}/start/           # Start picking
PATCH  /api/v1/warehouse/picking/{id}/lines/{line_id}/ # Record pick
POST   /api/v1/warehouse/picking/{id}/complete/        # Complete picking
POST   /api/v1/warehouse/picking/{id}/stage/           # Mark as staged
```

**Permissions:**
```python
warehouse.can_view_picking
warehouse.can_execute_picking
warehouse.can_manage_picking
```

---

## 4. SAP Integration Map

### 4.1 SAP HANA (Read-Only)

| Feature | SAP Table/Procedure | Purpose |
|---|---|---|
| Warehouse list | OITW (distinct WhsCode) | Dropdown, filters |
| Item master | OITM | Item search, details |
| Item groups | OITB | Filtering |
| Stock by warehouse | OITW | On-hand, committed, ordered |
| Movement history | OINM | Inventory audit trail |
| Open POs | OPOR, POR1 | Expected inbound |
| Production orders | OWOR, WOR1 | Expected consumption |
| Inventory value | SP_INVENTORYAGEVALUE | Already used by inventory_age module |

### 4.2 SAP Service Layer (Write)

| Feature | SAP API Endpoint | When |
|---|---|---|
| Stock Transfer | POST /b1s/v2/StockTransfers | Transfer received at destination |
| Goods Issue | POST /b1s/v2/InventoryGenExits | Materials issued from warehouse |
| Goods Receipt (non-PO) | POST /b1s/v2/InventoryGenEntries | Ad-hoc receipts |
| Inventory Counting | POST /b1s/v2/InventoryCountings | Stock count approved |
| Inventory Posting | POST /b1s/v2/InventoryPostings | Adjustment after counting |

### 4.3 Integration Points with Existing Modules

```
Gate Module ──────→ Vehicle arrives with materials
                        │
                        ↓
QC Module ────────→ Materials inspected & approved
                        │
                        ↓
GRPO Module ──────→ Goods receipt posted to SAP
                        │
                        ↓
┌───────────────────────────────────────────────┐
│              WAREHOUSE MODULE                  │
│                                                │
│  Putaway ←── GRPO triggers putaway task        │
│  Inventory ── View stock across warehouses     │
│  Transfers ── Move stock between warehouses    │
│  Goods Issue ── Issue to production/maint      │
│  Counting ─── Verify physical vs system        │
│  Picking ──── Prepare outbound orders          │
│                                                │
└───────────────────────────────────────────────┘
                        │
                        ↓
Production Module ─→ Consumes issued materials
Outbound Module ───→ Dispatches picked goods
Dashboards ────────→ Displays warehouse analytics
```

---

## 5. Frontend Pages & Navigation

### 5.1 Sidebar Navigation

```
Warehouse                          (icon: Warehouse)
├── Dashboard                      /warehouse
├── Inventory                      /warehouse/inventory
├── Stock Transfers                /warehouse/transfers
│   ├── All Transfers              /warehouse/transfers
│   ├── Pending Approval           /warehouse/transfers?status=pending_approval
│   └── Create Transfer            /warehouse/transfers/new
├── Goods Issue                    /warehouse/goods-issue
│   ├── All Issues                 /warehouse/goods-issue
│   └── Create Issue               /warehouse/goods-issue/new
├── Stock Counting                 /warehouse/counting
│   ├── All Counts                 /warehouse/counting
│   └── Plan Count                 /warehouse/counting/new
├── Putaway Tasks                  /warehouse/putaway
└── Pick Lists                     /warehouse/picking
```

### 5.2 Page Inventory

| Page | Route | Description |
|---|---|---|
| Warehouse Dashboard | `/warehouse` | Overview with KPIs, pending tasks, alerts |
| Inventory Browser | `/warehouse/inventory` | Search & browse stock |
| Item Detail | `/warehouse/inventory/:itemCode` | Item stock details & history |
| Transfer List | `/warehouse/transfers` | List with filters & status tabs |
| Create Transfer | `/warehouse/transfers/new` | Multi-step form |
| Transfer Detail | `/warehouse/transfers/:id` | View & action transfer |
| Goods Issue List | `/warehouse/goods-issue` | List with filters & status tabs |
| Create Goods Issue | `/warehouse/goods-issue/new` | Form with item selection |
| Goods Issue Detail | `/warehouse/goods-issue/:id` | View & action issue |
| Stock Count List | `/warehouse/counting` | List with filters |
| Plan Stock Count | `/warehouse/counting/new` | Select warehouse, items, schedule |
| Stock Count Detail | `/warehouse/counting/:id` | Count entry & variance review |
| Variance Report | `/warehouse/counting/:id/variance` | Discrepancy analysis |
| Putaway List | `/warehouse/putaway` | Pending & completed putaways |
| Putaway Detail | `/warehouse/putaway/:id` | Line-by-line putaway |
| Pick List | `/warehouse/picking` | Pending & active pick lists |
| Pick Detail | `/warehouse/picking/:id` | Line-by-line picking |

---

## 6. Permissions

### 6.1 Permission Codenames

```python
# Inventory
warehouse.can_view_inventory

# Stock Transfers
warehouse.can_view_transfers
warehouse.can_request_transfer
warehouse.can_approve_transfer
warehouse.can_pick_transfer
warehouse.can_receive_transfer
warehouse.can_post_transfer_to_sap

# Goods Issue
warehouse.can_view_goods_issue
warehouse.can_request_goods_issue
warehouse.can_approve_goods_issue
warehouse.can_execute_goods_issue
warehouse.can_post_goods_issue_to_sap

# Stock Counting
warehouse.can_view_stock_count
warehouse.can_plan_stock_count
warehouse.can_execute_stock_count
warehouse.can_review_stock_count
warehouse.can_post_stock_count_to_sap

# Putaway
warehouse.can_view_putaway
warehouse.can_execute_putaway

# Picking
warehouse.can_view_picking
warehouse.can_execute_picking
warehouse.can_manage_picking

# Dashboard
warehouse.can_view_warehouse_dashboard
```

### 6.2 Role-Permission Mapping (Suggested)

| Permission | Store Keeper | Store Manager | Warehouse Operator | Admin |
|---|---|---|---|---|
| view_inventory | x | x | x | x |
| view_warehouse_dashboard | x | x | x | x |
| request_transfer | x | x | | x |
| approve_transfer | | x | | x |
| pick_transfer | x | | x | x |
| receive_transfer | x | x | | x |
| post_transfer_to_sap | | x | | x |
| request_goods_issue | x | x | | x |
| approve_goods_issue | | x | | x |
| execute_goods_issue | x | | x | x |
| post_goods_issue_to_sap | | x | | x |
| plan_stock_count | | x | | x |
| execute_stock_count | x | | x | x |
| review_stock_count | | x | | x |
| post_stock_count_to_sap | | x | | x |
| execute_putaway | x | | x | x |
| execute_picking | x | | x | x |
| manage_picking | | x | | x |

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Backend:**
- [ ] Create `warehouse` Django app with models, migrations
- [ ] Implement HANA reader for stock queries (OITM, OITW, OINM)
- [ ] Implement inventory list & detail API endpoints
- [ ] Implement warehouse dashboard summary endpoint
- [ ] Set up permissions

**Frontend:**
- [ ] Create warehouse module structure with module.config.tsx
- [ ] Implement warehouse dashboard page
- [ ] Implement inventory browser page with search & filters
- [ ] Implement item detail page with warehouse breakdown
- [ ] Register module in app registry

### Phase 2: Stock Transfers (Week 3-4)

**Backend:**
- [ ] Stock transfer models & migrations
- [ ] Transfer CRUD endpoints
- [ ] Transfer workflow (submit → approve → pick → transit → receive)
- [ ] SAP Service Layer writer for StockTransfers
- [ ] Post-to-SAP endpoint
- [ ] Notification triggers (approval needed, transfer received)

**Frontend:**
- [ ] Transfer list page with status tabs
- [ ] Create transfer form (multi-step: select warehouses → add items → review)
- [ ] Transfer detail page with action buttons per status
- [ ] Approval flow UI

### Phase 3: Goods Issue (Week 5-6)

**Backend:**
- [ ] Goods issue models & migrations
- [ ] Goods issue CRUD endpoints
- [ ] Issue workflow (submit → approve → issue)
- [ ] SAP Service Layer writer for InventoryGenExits
- [ ] Link to production_execution module (production issues)
- [ ] Notification triggers

**Frontend:**
- [ ] Goods issue list page
- [ ] Create goods issue form (select type → warehouse → items → review)
- [ ] Goods issue detail page with actions
- [ ] Production issue shortcut from production module

### Phase 4: Stock Counting (Week 7-8)

**Backend:**
- [ ] Stock count models & migrations
- [ ] Count planning endpoint (auto-populate items from HANA)
- [ ] Count execution endpoints (record counts per line)
- [ ] Variance calculation logic
- [ ] SAP posting (InventoryCountings or InventoryPostings)
- [ ] Variance report endpoint

**Frontend:**
- [ ] Stock count list page
- [ ] Plan count form
- [ ] Count execution page (mobile-friendly line-by-line entry)
- [ ] Variance report page with discrepancy highlighting

### Phase 5: Putaway & Picking (Week 9-10)

**Backend:**
- [ ] Putaway models & auto-creation hook on GRPO posting
- [ ] Putaway task endpoints
- [ ] Pick list models & creation from transfers/dispatch/goods-issue
- [ ] Pick list execution endpoints

**Frontend:**
- [ ] Putaway task list & detail pages
- [ ] Pick list & detail pages
- [ ] Mobile-optimized interfaces for operators

### Phase 6: Polish & Integration (Week 11-12)

- [ ] End-to-end testing of all SAP integrations
- [ ] Notification setup for all workflows
- [ ] Dashboard refinement with real data
- [ ] Cross-module navigation (GRPO → Putaway, Production → Goods Issue)
- [ ] Excel export for inventory & reports
- [ ] Error handling & edge cases
- [ ] Permission testing

---

## 8. Open Questions & Investigation Needed

1. **SAP Bin Locations:** Are bin locations enabled in any SAP warehouse? If yes, the putaway and picking workflows need bin-level tracking.

2. **SAP Batch Management:** Are any items batch-managed? If yes, transfers, issues, and counts need batch selection.

3. **SAP Serial Numbers:** Are serial numbers used for any items? Impacts counting and transfers.

4. **SAP Stock Transfer Request vs Transfer:** Does the factory use Stock Transfer Requests (approval in SAP) or direct Stock Transfers? This affects whether we post a request or a completed transfer.

5. **Cost Centers:** Are cost centers required for goods issues? Need to know which cost centers map to which departments.

6. **Approval Hierarchy:** Who approves transfers and goods issues? Single approver or multi-level? Does it vary by value/quantity?

7. **Outbound Integration:** How does the existing `outbound_dispatch` module work? Does it need to trigger pick lists?

8. **Warehouse Zones:** Are there logical zones within warehouses (e.g., raw material zone, finished goods zone, quarantine zone)?

9. **Minimum Stock Levels:** Are reorder points and minimum stock levels maintained in SAP? Should we surface alerts?

10. **Barcode/QR Scanning:** Will warehouse operators use barcode scanners for item identification? This affects the mobile UI design.

---

## 9. Technical Notes

### 9.1 Follows Existing Patterns

- **Backend:** APIView + Service + HANA Reader + SL Writer (same as GRPO)
- **Frontend:** Module config + lazy pages + React Query + Zod schemas (same as all modules)
- **Auth:** JWT + Company-Code header + Django permissions (existing system)
- **SAP:** CompanyContext + registry-based multi-company support (existing infrastructure)

### 9.2 New HANA Reader Methods Needed

```python
class HanaWarehouseReader:
    def get_warehouses(self) -> list          # Already exists
    def get_item_stock(self, filters) -> list  # New
    def get_item_detail(self, item_code) -> dict  # New
    def get_movement_history(self, item_code, filters) -> list  # New
    def get_items_for_counting(self, warehouse, item_group) -> list  # New
```

### 9.3 New SAP Service Layer Writers Needed

```python
class StockTransferWriter:
    def create(self, payload) -> dict  # POST /b1s/v2/StockTransfers

class GoodsIssueWriter:
    def create(self, payload) -> dict  # POST /b1s/v2/InventoryGenExits

class InventoryCountingWriter:
    def create(self, payload) -> dict  # POST /b1s/v2/InventoryCountings

class InventoryPostingWriter:
    def create(self, payload) -> dict  # POST /b1s/v2/InventoryPostings
```

### 9.4 Notifications

Leverage existing FCM infrastructure:
- Transfer needs approval → notify manager
- Transfer approved → notify requester
- Putaway task created → notify warehouse operators
- Stock count planned → notify assigned counter
- Goods issue approved → notify store keeper
- SAP posting failed → notify manager + store keeper
