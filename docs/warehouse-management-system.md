# Warehouse Management System (WMS) - Implementation Plan

## 1. Overview

The Warehouse Management System is a new module for FactoryFlow that provides inventory visibility, stock movements, and warehouse operations for Jivo Wellness factories. The system integrates with SAP Business One (which already manages warehouse master data, stock levels, and inventory transactions) and extends it with factory-floor-level operational workflows.

### 1.1 Goals

- Provide real-time inventory visibility across all warehouses
- Enable stock transfer requests and execution between warehouses
- Support goods issue workflows for production and other consumption
- Enable stock counting (cycle counts & physical inventory)
- Track inbound putaway after GRPO completion with location assignment (bins/aisles)
- Support outbound picking and dispatch preparation
- Maintain full audit trail of all warehouse movements
- Enforce FIFO using batch codes
- Track non-moving finished goods with company-specific expiry thresholds
- Support returns workflow (gate returns + warehouse returns with return notes)
- Enforce variety-wise capacity locking in FG warehouses
- Capture transport/receiving images (driver, truck)
- Integrate gatepass with weighbridge verification
- Track dispatch status post-invoice (dispatched vs. not dispatched with reasons)
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
    ├── inward/                  # Inbound receiving (post-GRPO putaway + location assignment)
    ├── transfers/               # Stock transfer workflows
    ├── goods-issue/             # Goods issue workflows
    ├── counting/                # Stock counting / audit
    ├── picking/                 # Outbound picking tasks (unified)
    ├── dispatch-tracking/       # Post-invoice dispatch status tracking
    ├── returns/                 # Returns workflow (gate + warehouse)
    └── non-moving/              # Non-moving / expiry tracking (FG focus)
```

---

## 3. Feature Breakdown

### 3.1 Warehouse Dashboard

**Purpose:** Single-screen overview of warehouse health and activity. Key KPI cards as specified by factory team.

**Primary KPI Cards:**
| Card | Description | Source |
|---|---|---|
| **Inward** | Today's/period inward receipts count & value | PostgreSQL (InwardReceipt) |
| **Bill** | Invoices generated, pending dispatch | PostgreSQL (DispatchTracking) |
| **Dispatched** | Completed dispatches | PostgreSQL (DispatchTracking) |
| **Not Dispatched** | Invoiced but not yet dispatched (with reasons) | PostgreSQL (DispatchTracking) |

**Additional Components:**
| Component | Description | Source |
|---|---|---|
| Warehouse selector | Switch between warehouses | SAP HANA (OWHS) |
| Stock summary cards | Total items, total value, item count by group | SAP HANA |
| Pending tasks widget | Open transfers, counts, putaways, picks | PostgreSQL |
| Non-moving FG alerts | Items approaching expiry thresholds | SAP HANA + config |
| Low stock alerts | Items below MinStock level | SAP HANA (OITW) |
| Capacity alerts | FG warehouses approaching variety-wise limits | PostgreSQL |
| Quick actions | New transfer, new count, search inventory | Navigation |

**API Endpoints:**
```
GET /api/v1/warehouse/dashboard/summary/
    ?warehouse_code=WH01
    Response: { kpi_cards, stock_summary, pending_tasks, alerts, non_moving_alerts }
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

### 3.7 Picking (Unified Picking Service)

**Purpose:** Centralized picking service for all outbound operations — dispatch shipments, goods issues, and stock transfers.

**This replaces the `outbound_dispatch` module's built-in `PickTask` model.** The warehouse module owns all picking logic. The dispatch module calls warehouse services to create and manage picks.

#### 3.7.1 Why Full Integration

The `outbound_dispatch` module (on `dispatch` branch) currently has its own `PickTask` model with pick assignment, barcode scanning, short-pick handling, and quantity tracking. Rather than duplicating this for transfers and goods issues, we consolidate picking into the warehouse module so:
- One UI for warehouse operators (they don't care if the pick is for dispatch vs. a transfer)
- Consistent barcode scanning, short-pick handling, and quantity tracking across all pick sources
- Single dashboard view of all active picks in the warehouse

#### 3.7.2 Integration Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  outbound_dispatch   │     │  warehouse (transfers)│     │  warehouse (GI)      │
│  ShipmentOrder       │     │  StockTransferRequest │     │  GoodsIssueRequest   │
└─────────┬───────────┘     └─────────┬───────────┘     └─────────┬───────────┘
          │                           │                           │
          │  service call             │  service call             │  service call
          ↓                           ↓                           ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                     warehouse.services.PickingService                        │
│                                                                              │
│  create_pick_list(source_type, source_id, items, warehouse, company)        │
│  start_pick(pick_list_id, user)                                              │
│  record_pick(pick_line_id, actual_qty, barcode, user)                       │
│  complete_pick(pick_list_id)                                                 │
│  get_picks_for_source(source_type, source_id)                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Cross-module call pattern** (follows existing architecture — service-layer calls, same as `gate_completion` calling `quality_control.services.rules`):

```python
# outbound_dispatch/services/outbound_service.py (MODIFIED)
from warehouse.services.picking_service import PickingService

class OutboundService:
    def generate_picks(self, shipment_id, user):
        shipment = ShipmentOrder.objects.get(id=shipment_id)
        items = [
            {"item_code": i.item_code, "item_name": i.item_name,
             "quantity": i.ordered_qty, "uom": i.uom,
             "batch_number": i.batch_number,
             "warehouse_code": i.warehouse_code,
             "source_line_id": i.id}
            for i in shipment.items.all()
        ]
        pick_list = PickingService.create_pick_list(
            source_type="DISPATCH",
            source_id=shipment.id,
            items=items,
            warehouse_code=shipment.items.first().warehouse_code,
            company=shipment.company,
            user=user,
        )
        shipment.status = "PICKING"
        shipment.save()
        return pick_list
```

**Notification via signals** (follows existing pattern — signals only for notifications):
```python
# warehouse/signals.py
@receiver(post_save, sender=PickList)
def notify_on_pick_complete(sender, instance, **kwargs):
    if instance.status == "COMPLETED":
        # Notify the source module that picking is done
        NotificationService.send_notification_by_auth_group(...)
```

#### 3.7.3 Workflow

```
┌────────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│ PICK LIST  │────→│ PICKING  │────→│ COMPLETED│────→│ Source     │
│ (Created   │     │(Operator)│     │          │     │ continues │
│  by source)│     │          │     │          │     │ workflow   │
└────────────┘     └──────────┘     └──────────┘     └───────────┘
```

**Statuses:** `PENDING` → `IN_PROGRESS` → `COMPLETED` → `CANCELLED`

Note: `STAGED` and `DISPATCHED` are **not** picking statuses — those belong to the dispatch module's `ShipmentOrder` status. Once picking is `COMPLETED`, control returns to the source module.

#### 3.7.4 Models (PostgreSQL — owned by warehouse module)

```python
class PickList(models.Model):
    pick_number           # Auto-generated (e.g., PL-2026-0001)
    source_type           # DISPATCH, GOODS_ISSUE, TRANSFER
    source_id             # ID of the source document (ShipmentOrder, GoodsIssueRequest, etc.)
    warehouse_code
    warehouse_name
    status                # PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    assigned_to           # FK → User (nullable)
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
    picked_qty            # Actual qty picked (may be less = short pick)
    uom
    batch_number          # For batch-managed items (nullable)
    warehouse_code        # Specific warehouse for this line
    source_line_id        # ID of the source line (ShipmentOrderItem, GoodsIssueLine, etc.)
    status                # PENDING, IN_PROGRESS, PICKED, SHORT
    scanned_barcode       # Barcode recorded during pick (nullable)
    picked_by             # FK → User (nullable)
    picked_at
    notes
```

#### 3.7.5 Changes to outbound_dispatch Module

The following changes are needed on the `dispatch` branch:

| Current (dispatch owns) | After integration (warehouse owns) |
|---|---|
| `outbound_dispatch.PickTask` model | **Removed** — replaced by `warehouse.PickList` + `warehouse.PickLine` |
| `OutboundService.generate_pick_tasks()` | Calls `PickingService.create_pick_list(source_type="DISPATCH", ...)` |
| `OutboundService.update_pick_task()` | Calls `PickingService.record_pick()` |
| `OutboundService.record_scan()` | Calls `PickingService.record_scan()` |
| `OutboundService.confirm_pack()` | Reads `PickList.status == COMPLETED`, then proceeds with pack |
| Pick task API endpoints in dispatch | **Removed** — use `/api/v1/warehouse/picking/` endpoints instead |
| `PickTaskList` frontend component | Rewritten as shared warehouse component, used by dispatch detail page |

**Dispatch keeps ownership of:** ShipmentOrder statuses (RELEASED → PICKING → PACKED → STAGED → LOADING → DISPATCHED), dock assignment, vehicle linking, trailer inspection, loading, goods issue posting.

#### 3.7.6 API Endpoints

```
GET    /api/v1/warehouse/picking/                      # List all pick lists (filterable by source_type)
GET    /api/v1/warehouse/picking/{id}/                 # Pick list detail with lines
POST   /api/v1/warehouse/picking/{id}/start/           # Start picking (assign user, PENDING → IN_PROGRESS)
PATCH  /api/v1/warehouse/picking/{id}/lines/{line_id}/ # Record pick (qty, barcode, status)
POST   /api/v1/warehouse/picking/{id}/lines/{line_id}/scan/ # Record barcode scan
POST   /api/v1/warehouse/picking/{id}/complete/        # Complete picking (validates all lines picked/short)
POST   /api/v1/warehouse/picking/{id}/cancel/          # Cancel pick list
GET    /api/v1/warehouse/picking/by-source/            # Get picks by source_type + source_id
```

#### 3.7.7 Permissions

```python
warehouse.can_view_picking
warehouse.can_execute_picking       # Start, record picks, scan, complete
warehouse.can_manage_picking        # Cancel, reassign
```

---

### 3.8 Inward / Receiving (Enhanced Putaway)

**Purpose:** After GRPO is posted, track the physical inward process — assign storage locations (bins/aisles), capture transport images, and confirm putaway. This replaces the simpler "Putaway" concept from the original design with a fuller inward workflow.

**Unique Identifier:** Each inward receipt is tracked by **batch code** (printed on bottles/packages). Batch code is the primary identifier throughout the warehouse.

**Workflow:**
```
┌────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────┐
│ GRPO Posted│────→│ ASSIGN       │────→│ PUTAWAY      │────→│ COMPLETED │
│ (Auto)     │     │ LOCATION     │     │ (Operator)   │     │           │
│            │     │(Bin/Aisle)   │     │              │     │           │
└────────────┘     └──────────────┘     └──────────────┘     └───────────┘
```

**Statuses:** `PENDING` → `LOCATION_ASSIGNED` → `IN_PROGRESS` → `COMPLETED`

**Models (PostgreSQL):**
```python
class InwardReceipt(models.Model):
    receipt_number        # Auto-generated (e.g., INW-2026-0001)
    grpo_posting          # FK → GRPOPosting (from grpo module)
    warehouse_code        # Target warehouse
    warehouse_name
    status
    assigned_to           # FK → User (nullable)
    location_details      # Text — bin/aisle/isle description (free-text, no formal bin model)
    driver_image          # ImageField — photo of driver (nullable)
    truck_image           # ImageField — photo of truck (nullable)
    started_at
    completed_at
    company               # FK → Company
    created_at
    updated_at

class InwardReceiptLine(models.Model):
    inward_receipt        # FK → InwardReceipt
    item_code
    item_name
    quantity
    batch_number          # Batch code from the item (key identifier)
    uom
    location_details      # Per-line location if different items go to different spots
    put_away              # Boolean — has this line been put away?
    put_away_at
    notes
```

**Receiving Captures:**
- Image of driver (uploaded via mobile/tablet)
- Image of truck (uploaded via mobile/tablet)
- These are stored on the InwardReceipt and serve as an audit trail for transport verification

**API Endpoints:**
```
GET    /api/v1/warehouse/inward/                       # List inward receipts
GET    /api/v1/warehouse/inward/{id}/                  # Detail
POST   /api/v1/warehouse/inward/{id}/assign-location/  # Assign bin/aisle location
POST   /api/v1/warehouse/inward/{id}/start/            # Start putaway
PATCH  /api/v1/warehouse/inward/{id}/lines/{line_id}/  # Mark line as put away
POST   /api/v1/warehouse/inward/{id}/complete/         # Complete inward
POST   /api/v1/warehouse/inward/{id}/upload-images/    # Upload driver/truck images
```

**Permissions:**
```python
warehouse.can_view_inward
warehouse.can_execute_inward
```

---

### 3.9 Dispatch Tracking (Post-Invoice)

**Purpose:** After an invoice/bill is generated (from SAP Sales Order flow), track whether the goods have actually been physically dispatched or not. This provides visibility into the gap between invoicing and physical dispatch.

**Key requirement from factory team:** "After invoice, should be an option to show if dispatch is done or not."

**Workflow:**
```
┌──────────────┐     ┌─────────────────┐     ┌────────────┐
│ Invoice/Bill │────→│ PENDING         │────→│ DISPATCHED │
│ (from SAP)   │     │ DISPATCH        │     │            │
└──────────────┘     └────────┬────────┘     └────────────┘
                              │
                              │ (if blocked)
                              ↓
                     ┌─────────────────┐
                     │ NOT DISPATCHED  │
                     │ (with reason)   │
                     └─────────────────┘
```

**Statuses:** `PENDING_DISPATCH` → `DISPATCHED` | `NOT_DISPATCHED`

**Models (PostgreSQL):**
```python
class DispatchTracking(models.Model):
    tracking_number       # Auto-generated
    shipment_order        # FK → ShipmentOrder (from outbound_dispatch, nullable)
    sap_invoice_doc_entry # SAP invoice reference
    sap_invoice_doc_num
    customer_code
    customer_name
    status                # PENDING_DISPATCH, DISPATCHED, NOT_DISPATCHED
    dispatch_date         # When actually dispatched (nullable)
    dispatched_by         # FK → User (nullable)
    not_dispatched_reason # Text — reason if not dispatched (nullable)
    gatepass_number       # Gatepass reference (nullable)
    gatepass_weight       # Weight recorded at gatepass weighbridge
    expected_weight       # Weight expected from bill
    weight_variance       # gatepass_weight - expected_weight (computed)
    company               # FK → Company
    created_at
    updated_at
```

**Gatepass-Weighbridge Verification:**
- When a dispatch is marked as complete, the gatepass weight is compared against the expected weight from the bill
- If variance exceeds a threshold, an alert is raised
- "Gatepass weighbridge should match"

**Dashboard Integration:**
Dashboard KPI cards pull directly from this model:
- **Inward** count
- **Bill** count (total invoices)
- **Dispatched** count
- **Not Dispatched** count (with drill-down to see reasons)

**API Endpoints:**
```
GET    /api/v1/warehouse/dispatch-tracking/                    # List with filters
GET    /api/v1/warehouse/dispatch-tracking/{id}/               # Detail
POST   /api/v1/warehouse/dispatch-tracking/{id}/mark-dispatched/  # Mark as dispatched
POST   /api/v1/warehouse/dispatch-tracking/{id}/mark-not-dispatched/  # Mark with reason
GET    /api/v1/warehouse/dispatch-tracking/summary/            # Dashboard KPI summary
```

**Permissions:**
```python
warehouse.can_view_dispatch_tracking
warehouse.can_manage_dispatch_tracking
```

---

### 3.10 Returns

**Purpose:** Handle goods returned at the gate or from within the warehouse. Issue a return note when quantity received back is less than what's on the bill.

**Two return types:**
1. **Gate Return** — Customer/transport returns goods at the gate (connects to gate module)
2. **Warehouse Return** — Internal return of issued materials back to warehouse

**Workflow:**
```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌───────────┐
│ RETURN   │────→│ INSPECT  │────→│ RETURN NOTE  │────→│ RESTOCKED │
│ RECEIVED │     │ & COUNT  │     │ (if short)   │     │ / SCRAPPED│
└──────────┘     └──────────┘     └──────────────┘     └───────────┘
```

**Statuses:** `RECEIVED` → `INSPECTED` → `COMPLETED`

**Models (PostgreSQL):**
```python
class ReturnOrder(models.Model):
    return_number         # Auto-generated (e.g., RET-2026-0001)
    return_type           # GATE_RETURN, WAREHOUSE_RETURN
    original_doc_type     # DISPATCH, GOODS_ISSUE, TRANSFER
    original_doc_id       # ID of the original document
    original_doc_number   # Human-readable reference
    warehouse_code
    warehouse_name
    status                # RECEIVED, INSPECTED, COMPLETED
    received_by           # FK → User
    inspected_by          # FK → User (nullable)
    return_reason         # Text
    has_shortage          # Boolean — true if return qty < original qty
    company               # FK → Company
    created_at
    updated_at

class ReturnLine(models.Model):
    return_order          # FK → ReturnOrder
    item_code
    item_name
    batch_number
    original_qty          # Quantity on the original bill
    returned_qty          # Quantity actually returned
    shortage_qty          # original_qty - returned_qty (computed)
    uom
    condition             # GOOD, DAMAGED, EXPIRED
    disposition           # RESTOCK, SCRAP, QUARANTINE
    notes

class ReturnNote(models.Model):
    """Generated automatically when returned_qty < original_qty (issue return note)."""
    return_order          # OneToOne → ReturnOrder
    note_number           # Auto-generated
    generated_at
    generated_by          # FK → User
    shortage_lines        # JSON or FK → ReturnLine (lines with shortage)
    notes
```

**API Endpoints:**
```
GET    /api/v1/warehouse/returns/                      # List returns
POST   /api/v1/warehouse/returns/                      # Create return
GET    /api/v1/warehouse/returns/{id}/                 # Detail
POST   /api/v1/warehouse/returns/{id}/inspect/         # Record inspection
POST   /api/v1/warehouse/returns/{id}/complete/        # Complete return
GET    /api/v1/warehouse/returns/{id}/return-note/     # Get return note (if shortage)
```

**Permissions:**
```python
warehouse.can_view_returns
warehouse.can_create_return
warehouse.can_inspect_return
warehouse.can_complete_return
```

---

### 3.11 Non-Moving / Expiry Tracking (Finished Goods)

**Purpose:** Track finished goods that are approaching or past their expiry/critical age thresholds. Different companies have different thresholds.

**Company-Specific Thresholds:**

| Company | Item Type | Critical Age | Notes |
|---|---|---|---|
| Jivo Oil | Tin | 30 days | Show expiry date |
| Jivo Oil | Box | 60 days | Show expiry date |
| Jivo Beverages | Water | 60 days | Show expiry date |
| Jivo Beverages | Others | 20 days | Show expiry date |

**Key Features:**
- Track days since batch was received in FG warehouse
- Alert when approaching critical age threshold
- Show expiry date (derived from manufacturing date + shelf life, or from SAP batch expiry)
- Drill-down to see which batches are at risk
- Extends existing `non_moving_rm` module pattern but focused on FG warehouses

**Models (PostgreSQL):**
```python
class ExpiryThresholdConfig(models.Model):
    """Configurable per-company, per-item-type thresholds."""
    company               # FK → Company
    item_type             # e.g., TIN, BOX, WATER, OTHER (or item group from SAP)
    item_group_code       # SAP item group code (nullable, for matching)
    critical_age_days     # Number of days before item is considered critical
    warehouse_filter      # Optional — only apply to specific FG warehouses
    is_active
    created_at
    updated_at
```

**Data Sources:**
- Batch receipt dates from SAP HANA (`OIBT` table — batch details with admission date)
- Item expiry dates from SAP (`OIBT.ExpDate` if populated, or computed from `MnfDate` + shelf life)
- Current stock from OITW
- Thresholds from PostgreSQL config

**API Endpoints:**
```
GET    /api/v1/warehouse/non-moving/                   # Non-moving FG report
GET    /api/v1/warehouse/non-moving/alerts/            # Items past critical threshold
GET    /api/v1/warehouse/non-moving/config/            # Threshold config
POST   /api/v1/warehouse/non-moving/config/            # Create/update threshold
```

**Permissions:**
```python
warehouse.can_view_non_moving
warehouse.can_manage_non_moving_config
```

---

### 3.12 Variety-Wise Capacity Locking (FG Warehouses)

**Purpose:** Prevent receiving more than a configured maximum quantity of a specific variety/item in finished goods warehouses.

**Key requirement from factory team:** "Locking variety wise — cannot receive more than a certain amount in FG."

**How it works:**
1. Admin configures max capacity per variety per FG warehouse
2. When an inward receipt is being processed for an FG warehouse, the system checks current stock + incoming qty against the limit
3. If it would exceed the limit, the inward is blocked with an alert

**Models (PostgreSQL):**
```python
class VarietyCapacityLimit(models.Model):
    warehouse_code        # SAP warehouse code (FG warehouse)
    warehouse_name
    item_code             # SAP item code (or item group for broader rules)
    item_name
    variety               # Variety identifier (from SAP U_Variety field)
    max_quantity          # Maximum allowed quantity
    uom
    is_active
    company               # FK → Company
    created_at
    updated_at
```

**Validation Logic (in InwardService):**
```python
def validate_capacity(self, warehouse_code, item_code, incoming_qty):
    limit = VarietyCapacityLimit.objects.filter(
        warehouse_code=warehouse_code, item_code=item_code, is_active=True
    ).first()
    if limit:
        current_stock = self.hana_reader.get_item_stock_in_warehouse(item_code, warehouse_code)
        if current_stock + incoming_qty > limit.max_quantity:
            raise CapacityExceededError(...)
```

**API Endpoints:**
```
GET    /api/v1/warehouse/capacity-limits/              # List limits
POST   /api/v1/warehouse/capacity-limits/              # Create limit
PATCH  /api/v1/warehouse/capacity-limits/{id}/         # Update limit
DELETE /api/v1/warehouse/capacity-limits/{id}/         # Remove limit
GET    /api/v1/warehouse/capacity-limits/check/        # Check if a receipt would exceed limits
```

**Permissions:**
```python
warehouse.can_view_capacity_limits
warehouse.can_manage_capacity_limits
```

---

### 3.13 FIFO Enforcement

**Purpose:** Ensure first-in-first-out is maintained using batch codes. Older batches should be picked/issued before newer ones.

**How it works:**
- Every item entering the warehouse has a **batch code** (the unique identifier mentioned on bottles)
- Batch admission date is tracked in SAP (`OIBT.InDate`)
- When generating pick lists or goods issues, the system **sorts available batches by admission date (oldest first)** and suggests/enforces picking the oldest batch
- Operators can override with a reason (but it's logged)

**Implementation:**
- No separate model needed — FIFO is a **service-layer rule** applied during:
  - Pick list generation (Section 3.7) — sort batches by `OIBT.InDate` ASC
  - Goods issue item selection (Section 3.4) — suggest oldest batch first
  - Stock transfer picking — same logic
- HANA reader method: `get_available_batches(item_code, warehouse_code)` returns batches sorted by admission date
- UI: When selecting items for picking/issuing, batch dropdown is ordered oldest-first with admission date shown

**HANA Query:**
```sql
SELECT "ItemCode", "BatchNum", "Quantity", "InDate", "ExpDate"
FROM "{schema}"."OIBT"
WHERE "ItemCode" = :item_code
  AND "WhsCode" = :warehouse_code
  AND "Quantity" > 0
ORDER BY "InDate" ASC
```

---

### 3.14 Daily Audit (Stock Reconciliation)

**Purpose:** Support daily physical audits — compare physical count with SAP and app records. Track stock vs. in/out movements.

**Key requirement from factory team:** "Per day physical, compare with SAP and app. Stock vs in/out. (Until barcoding not present)"

**This is a simplified daily version of the full stock counting (Section 3.5),** designed for quick daily checks rather than formal inventory counts.

**Workflow:**
```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ START    │────→│ RECORD       │────→│ VARIANCE     │
│ AUDIT    │     │ PHYSICAL     │     │ REPORT       │
│          │     │ COUNTS       │     │              │
└──────────┘     └──────────────┘     └──────────────┘
```

**Key difference from Section 3.5 (formal stock counting):**
- Daily audit does NOT post to SAP — it's an internal reconciliation tool
- Compares: physical count vs. SAP stock vs. app-tracked in/out for the day
- Lighter workflow — no approval chain, just record and report

**Models (PostgreSQL):**
```python
class DailyAudit(models.Model):
    audit_date            # Date of audit
    warehouse_code
    warehouse_name
    audited_by            # FK → User
    status                # IN_PROGRESS, COMPLETED
    notes
    company               # FK → Company
    created_at
    updated_at

class DailyAuditLine(models.Model):
    daily_audit           # FK → DailyAudit
    item_code
    item_name
    batch_number          # Nullable
    sap_qty               # Quantity per SAP at audit time
    app_inward_qty        # Total inward recorded in app for the day
    app_outward_qty       # Total outward recorded in app for the day
    expected_qty          # sap_qty + app_inward_qty - app_outward_qty
    physical_qty          # Actual physical count
    variance_qty          # physical_qty - expected_qty
    notes
```

**API Endpoints:**
```
GET    /api/v1/warehouse/audit/                        # List audits
POST   /api/v1/warehouse/audit/                        # Start new daily audit
GET    /api/v1/warehouse/audit/{id}/                   # Detail
PATCH  /api/v1/warehouse/audit/{id}/lines/{line_id}/   # Record physical count
POST   /api/v1/warehouse/audit/{id}/complete/          # Complete audit
GET    /api/v1/warehouse/audit/{id}/variance-report/   # Variance report
```

**Permissions:**
```python
warehouse.can_view_audit
warehouse.can_execute_audit
```

---

## 4. SAP Integration Map

### 4.1 SAP HANA (Read-Only)

| Feature | SAP Table/Procedure | Purpose |
|---|---|---|
| Warehouse list | OWHS | Dropdown, filters |
| Item master | OITM | Item search, details, ManBtchNum flag |
| Item groups | OITB | Filtering |
| Stock by warehouse | OITW | On-hand, committed, ordered, MinStock |
| Movement history | OINM | Inventory audit trail |
| Batch details | OIBT | Batch stock, admission date (FIFO), expiry date |
| Open POs | OPOR, POR1 | Expected inbound |
| Production orders | OWOR, WOR1 | Expected consumption |
| Inventory value | SP_INVENTORYAGEVALUE | Already used by inventory_age module |
| Sales orders / invoices | ORDR, OINV | Dispatch tracking source |

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
┌───────────────────────────────────────────────────────────┐
│                    WAREHOUSE MODULE                        │
│                                                            │
│  Inward ←─────── GRPO triggers inward receipt + putaway    │
│  Inventory ───── View stock across warehouses              │
│  Transfers ───── Move stock between warehouses             │
│  Goods Issue ─── Issue to production/maint                 │
│  Counting ────── Verify physical vs system                 │
│  Daily Audit ─── Quick daily physical reconciliation       │
│  Picking ─────── Unified picking for ALL sources:          │
│      ├── outbound_dispatch (shipment picks)                │
│      ├── stock transfers (transfer picks)                  │
│      └── goods issues (issue picks)                        │
│  Dispatch Track ─ Post-invoice dispatch status             │
│  Returns ──────── Gate + warehouse returns                 │
│  Non-Moving ───── FG expiry/aging alerts                   │
│  Capacity Lock ── Variety-wise FG limits                   │
│  FIFO ─────────── Batch-based first-in-first-out           │
│                                                            │
└───────────────────────────────────────────────────────────┘
          │                              ↑
          ↓                              │
Production Module ─→ Consumes materials  │
Dashboards ────────→ Warehouse analytics │
                                         │
Outbound Dispatch ───────────────────────┘
  (calls PickingService to create picks,
   owns shipment workflow after pick complete)
```

---

## 5. Frontend Pages & Navigation

### 5.1 Sidebar Navigation

```
Warehouse                          (icon: Warehouse)
├── Dashboard                      /warehouse
├── Inventory                      /warehouse/inventory
├── Inward                         /warehouse/inward
├── Stock Transfers                /warehouse/transfers
│   ├── All Transfers              /warehouse/transfers
│   ├── Pending Approval           /warehouse/transfers?status=pending_approval
│   └── Create Transfer            /warehouse/transfers/new
├── Goods Issue                    /warehouse/goods-issue
│   ├── All Issues                 /warehouse/goods-issue
│   └── Create Issue               /warehouse/goods-issue/new
├── Pick Lists                     /warehouse/picking
├── Dispatch Tracking              /warehouse/dispatch-tracking
├── Returns                        /warehouse/returns
├── Stock Counting                 /warehouse/counting
│   ├── All Counts                 /warehouse/counting
│   └── Plan Count                 /warehouse/counting/new
├── Daily Audit                    /warehouse/audit
├── Non-Moving FG                  /warehouse/non-moving
└── Settings                       /warehouse/settings
    ├── Expiry Thresholds          /warehouse/settings/expiry-config
    └── Capacity Limits            /warehouse/settings/capacity-limits
```

### 5.2 Page Inventory

| Page | Route | Description |
|---|---|---|
| Warehouse Dashboard | `/warehouse` | KPIs: Inward, Bill, Dispatched, Not Dispatched + alerts |
| Inventory Browser | `/warehouse/inventory` | Search & browse stock by warehouse |
| Item Detail | `/warehouse/inventory/:itemCode` | Stock breakdown, batches, movement history |
| Inward List | `/warehouse/inward` | Pending & completed inward receipts |
| Inward Detail | `/warehouse/inward/:id` | Line-by-line putaway with location assignment |
| Transfer List | `/warehouse/transfers` | List with filters & status tabs |
| Create Transfer | `/warehouse/transfers/new` | Multi-step form |
| Transfer Detail | `/warehouse/transfers/:id` | View & action transfer |
| Goods Issue List | `/warehouse/goods-issue` | List with filters & status tabs |
| Create Goods Issue | `/warehouse/goods-issue/new` | Form with item selection |
| Goods Issue Detail | `/warehouse/goods-issue/:id` | View & action issue |
| Pick List | `/warehouse/picking` | All active pick lists (dispatch, transfer, GI) |
| Pick Detail | `/warehouse/picking/:id` | Line-by-line picking with barcode scan |
| Dispatch Tracking | `/warehouse/dispatch-tracking` | Post-invoice dispatch status list |
| Dispatch Detail | `/warehouse/dispatch-tracking/:id` | Mark dispatched / not dispatched |
| Returns List | `/warehouse/returns` | Gate + warehouse returns |
| Return Detail | `/warehouse/returns/:id` | Inspect, count, generate return note |
| Stock Count List | `/warehouse/counting` | Formal stock counts list |
| Plan Stock Count | `/warehouse/counting/new` | Select warehouse, items, schedule |
| Stock Count Detail | `/warehouse/counting/:id` | Count entry & variance review |
| Variance Report | `/warehouse/counting/:id/variance` | Discrepancy analysis |
| Daily Audit List | `/warehouse/audit` | Daily physical reconciliation list |
| Daily Audit Detail | `/warehouse/audit/:id` | Record counts, see variance |
| Non-Moving FG | `/warehouse/non-moving` | Aging report with expiry alerts |
| Expiry Config | `/warehouse/settings/expiry-config` | Company-specific thresholds |
| Capacity Limits | `/warehouse/settings/capacity-limits` | Variety-wise FG limits |

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

# Inward / Putaway
warehouse.can_view_inward
warehouse.can_execute_inward

# Picking
warehouse.can_view_picking
warehouse.can_execute_picking
warehouse.can_manage_picking

# Dispatch Tracking
warehouse.can_view_dispatch_tracking
warehouse.can_manage_dispatch_tracking

# Returns
warehouse.can_view_returns
warehouse.can_create_return
warehouse.can_inspect_return
warehouse.can_complete_return

# Non-Moving / Expiry
warehouse.can_view_non_moving
warehouse.can_manage_non_moving_config

# Capacity Limits
warehouse.can_view_capacity_limits
warehouse.can_manage_capacity_limits

# Daily Audit
warehouse.can_view_audit
warehouse.can_execute_audit

# Dashboard
warehouse.can_view_warehouse_dashboard
```

### 6.2 Role-Permission Mapping (Suggested)

| Permission | Store Keeper | Store Manager | Warehouse Operator | Admin |
|---|---|---|---|---|
| view_inventory | x | x | x | x |
| view_warehouse_dashboard | x | x | x | x |
| view_inward | x | x | x | x |
| execute_inward | x | | x | x |
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
| execute_picking | x | | x | x |
| manage_picking | | x | | x |
| view_dispatch_tracking | x | x | x | x |
| manage_dispatch_tracking | | x | | x |
| create_return | x | x | | x |
| inspect_return | x | x | | x |
| complete_return | | x | | x |
| view_non_moving | x | x | | x |
| manage_non_moving_config | | x | | x |
| manage_capacity_limits | | x | | x |
| execute_audit | x | | x | x |

---

## 7. Implementation Phases

### Phase 1: Foundation + Inventory (Week 1-2)

**Backend:**
- [ ] Create `warehouse` Django app with permission models, migrations
- [ ] Implement HANA reader for stock queries (OITM, OITW, OINM, OIBT, OWHS)
- [ ] Implement inventory list & detail API endpoints (with batch breakdown)
- [ ] Implement filter options API (warehouses, item groups)
- [ ] Implement dashboard summary endpoint
- [ ] Set up all permissions
- [ ] FIFO batch query: `get_available_batches()` from OIBT sorted by InDate

**Frontend:**
- [ ] Create warehouse module structure with module.config.tsx
- [ ] Register module in app registry, permissions config, API constants
- [ ] Implement warehouse dashboard page (KPI cards: Inward, Bill, Dispatched, Not Dispatched)
- [ ] Implement inventory browser page with search, warehouse & item group filters
- [ ] Implement item detail page with warehouse breakdown & batch stock view

### Phase 2: Inward + Picking (Week 3-4)

**Backend:**
- [ ] InwardReceipt models & migrations (replaces simpler Putaway concept)
- [ ] Auto-creation hook on GRPO posting → creates InwardReceipt
- [ ] Inward endpoints (assign location, start, mark lines, complete)
- [ ] Image upload endpoints for driver/truck photos
- [ ] PickList + PickLine models & migrations (unified picking)
- [ ] PickingService: create_pick_list(), record_pick(), complete_pick()
- [ ] FIFO enforcement in pick generation (oldest batch first from OIBT)
- [ ] Barcode scan endpoint for pick lines

**Frontend:**
- [ ] Inward list & detail pages with location assignment
- [ ] Image capture/upload UI for driver & truck
- [ ] Pick list page (all sources: dispatch, transfer, GI)
- [ ] Pick detail page with line-by-line picking, barcode scan input
- [ ] Batch selection UI ordered by FIFO (oldest first, admission date shown)

### Phase 3: Stock Transfers + Goods Issue (Week 5-6)

**Backend:**
- [ ] Stock transfer models & migrations
- [ ] Transfer CRUD + workflow endpoints (submit → approve → pick → transit → receive)
- [ ] SAP Service Layer writer for StockTransfers
- [ ] Transfer triggers PickingService for pick generation
- [ ] Goods issue models & migrations
- [ ] Goods issue CRUD + workflow endpoints (submit → approve → issue)
- [ ] SAP Service Layer writer for InventoryGenExits
- [ ] Link to production_execution module (production issues)
- [ ] Notification triggers for both workflows
- [ ] Variety-wise capacity limit model + validation on inward

**Frontend:**
- [ ] Transfer list, create form (multi-step), detail page with status actions
- [ ] Goods issue list, create form, detail page with actions
- [ ] Capacity limit settings page

### Phase 4: Dispatch Tracking + Returns (Week 7-8)

**Backend:**
- [ ] DispatchTracking model & migrations
- [ ] Sync/create tracking records from SAP invoices or post-dispatch
- [ ] Mark dispatched / not dispatched endpoints (with reason)
- [ ] Gatepass weight verification logic
- [ ] Dashboard KPI summary endpoint
- [ ] ReturnOrder + ReturnLine + ReturnNote models & migrations
- [ ] Return CRUD + workflow endpoints (receive → inspect → complete)
- [ ] Auto-generate return note when returned_qty < original_qty
- [ ] Notification triggers

**Frontend:**
- [ ] Dispatch tracking list with status filters
- [ ] Dispatch detail page (mark dispatched, record reason if not)
- [ ] Weight variance display (gatepass vs bill)
- [ ] Returns list, create form, detail page
- [ ] Return note view/print
- [ ] Dashboard KPI cards now fully wired

### Phase 5: Counting + Daily Audit + Non-Moving (Week 9-10)

**Backend:**
- [ ] StockCount models & migrations
- [ ] Count planning endpoint (auto-populate items from HANA)
- [ ] Count execution endpoints (record counts per line)
- [ ] Variance calculation logic
- [ ] SAP posting (InventoryCountings or InventoryPostings)
- [ ] DailyAudit models & migrations
- [ ] Daily audit endpoints (lighter workflow, no SAP posting)
- [ ] ExpiryThresholdConfig model & migrations
- [ ] Non-moving FG report endpoint (batch age from OIBT vs thresholds)
- [ ] Expiry alert endpoint for dashboard

**Frontend:**
- [ ] Stock count list, plan form, count execution page (mobile-friendly)
- [ ] Variance report page with discrepancy highlighting
- [ ] Daily audit list & detail pages (record counts, see variance)
- [ ] Non-moving FG report page with expiry alerts
- [ ] Expiry threshold config page (per-company, per-item-type)

### Phase 6: Dispatch Integration + Polish (Week 11-12)

- [ ] Integrate warehouse PickingService with `outbound_dispatch` module
- [ ] Remove dispatch's `PickTask` model, wire to warehouse `PickList`
- [ ] End-to-end testing of all SAP integrations
- [ ] Notification setup for all workflows
- [ ] Cross-module navigation (GRPO → Inward, Production → Goods Issue, Dispatch → Picking)
- [ ] Excel export for inventory, counts, audit, & reports
- [ ] Error handling & edge cases
- [ ] Permission testing
- [ ] Mobile optimization for operator-facing pages (inward, picking, audit)

---

## 8. Open Questions & Investigation Needed

### Resolved

**Via HANA queries (2026-04-04):**

Queried production DB (`JIVO_OIL_HANADB`) and test DBs (`TEST_MART_15122025`, `TEST_BEVERAGES_15122025`).

| # | Question | Finding | Design Decision |
|---|---|---|---|
| 1 | **SAP Bin Locations** | **Not enabled.** 0 of 100 warehouses across all 3 companies have bins activated (`OWHS.BinActivat`). | Skip SAP bin logic. Use free-text `location_details` field on inward receipts for bin/aisle tracking within our app. |
| 2 | **SAP Batch Management** | **Yes, heavily used.** ~27-32% of items are batch-managed (`OITM.ManBtchNum = 'Y'`). Jivo Oil: 570/2102, Mart: 406/1278, Beverages: 537/2135. | **Must include** `batch_number` on all line models. Batch code is the unique identifier (mentioned on bottles). Query `OIBT` for available batches. FIFO enforced via batch admission date. |
| 3 | **SAP Serial Numbers** | **Not used.** 0 serial-managed items across all companies (`OITM.ManSerNum`). | Skip serial number logic entirely. |
| 9 | **Minimum Stock Levels** | **Partially used.** Jivo Oil: 224 items, Mart: 0 items, Beverages: 95 items have `OITW.MinStock` set. | Add low-stock alerts widget on warehouse dashboard. |

**Via factory team input (2026-04-04):**

| # | Question | Resolution | Design Decision |
|---|---|---|---|
| 4 | **SAP Transfer Request vs Transfer** | FactoryFlow handles all approvals internally. | Post direct `StockTransfer` to SAP after all approvals complete. |
| 7 | **Outbound Integration** | Dispatch module has its own `PickTask`. Need unified picking. | Full integration — warehouse owns all picking via `PickList`/`PickLine`. Dispatch's `PickTask` removed, replaced with service calls to `PickingService`. See Section 3.7. |
| 8 | **Warehouse Zones** | No formal zones. Informal zones change frequently. | Skip zone model. Use free-text location on inward receipts. |
| 10 | **Barcode/QR Scanning** | Factory already has separate barcoding software (details unknown). Batch code on bottles is the key identifier. | Design all UIs with prominent search input (supports hardware scanners via keystroke). Integration with barcoding software TBD when we learn more about it. |
| 11 | **FIFO** | Maintained using batch codes. | Enforce FIFO in pick generation and goods issue by sorting batches from `OIBT.InDate` ASC. See Section 3.13. |
| 12 | **Non-Moving FG Thresholds** | Oil: 30 days tin, 60 days box. Beverages: 60 days water, 20 days others. Must show expiry date. | Configurable per-company thresholds via `ExpiryThresholdConfig`. See Section 3.11. |
| 13 | **Capacity Locking** | Variety-wise locking in FG — cannot receive more than a certain amount. | `VarietyCapacityLimit` model with validation on inward. See Section 3.12. |
| 14 | **Returns** | Gate returns + warehouse returns. Issue return note if qty < bill qty. | `ReturnOrder` + `ReturnNote` models. See Section 3.10. |
| 15 | **Receiving Images** | Need driver and truck images on transport/receiving. | `driver_image` and `truck_image` fields on `InwardReceipt`. See Section 3.8. |
| 16 | **Gatepass/Weighbridge** | Gatepass weighbridge weight should match bill weight. | Weight verification on `DispatchTracking` with variance alerting. See Section 3.9. |
| 17 | **Daily Audit** | Per day physical audit, compare SAP vs app. Stock vs in/out. Until barcoding not present. | `DailyAudit` model — lightweight daily reconciliation without SAP posting. See Section 3.14. |
| 18 | **Dispatch Tracking** | Dashboard needs: Inward, Bill, Dispatched, Not Dispatched, Reason. | `DispatchTracking` model with dashboard KPI cards. See Section 3.9. |

### Still Open

5. **Cost Centers:** Are cost centers required for goods issues? Need to know which cost centers map to which departments. **Plan:** Add as optional field, query `OPRC` for dropdown, don't enforce until confirmed.

6. **Approval Hierarchy:** Who approves transfers and goods issues? Single approver or multi-level? Does it vary by value/quantity? **Plan:** Start with single-approver (anyone with `can_approve_*` permission), same as GRPO module pattern.

19. **Picklist Generation:** How are picklists currently generated in SAP? Who generates them? **Action:** Ask factory team members who handle picklist generation. This affects whether we generate picks from SAP Sales Orders or from our own internal logic.

20. **Barcoding Software Details:** What barcoding software does the factory use? What data does it produce? Can we integrate via API or file export? **Action:** Learn more about the software in upcoming sessions.

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
    def get_warehouses(self) -> list                    # Already exists (OWHS)
    def get_item_stock(self, filters) -> list           # OITM + OITW with search/filters
    def get_item_detail(self, item_code) -> dict        # OITM + OITW per warehouse
    def get_movement_history(self, item_code, filters) -> list  # OINM
    def get_items_for_counting(self, warehouse, item_group) -> list  # OITW + OITM
    def get_available_batches(self, item_code, warehouse) -> list  # OIBT sorted by InDate (FIFO)
    def get_batch_expiry_report(self, warehouse, thresholds) -> list  # OIBT with age calc
    def get_item_min_stock_alerts(self, warehouse) -> list  # OITW where OnHand < MinStock
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
- Inward receipt created (post-GRPO) → notify warehouse operators
- Stock count planned → notify assigned counter
- Goods issue approved → notify store keeper
- SAP posting failed → notify manager + store keeper
- Capacity limit approaching/exceeded → notify store manager
- Non-moving FG past critical threshold → notify store manager
- Return received → notify store keeper
- Dispatch not completed (reason logged) → notify store manager

### 9.5 Reference: OpenWMS (org.openwms)

Explored the enterprise-grade OpenWMS codebase at `D:\Test_CompanyJivo\org.openwms` as reference. Key patterns and features considered:

**Architecture patterns adopted:**
- **Business-domain packaging** — our warehouse module groups by business capability (inward, picking, transfers), not technical layers. Matches OpenWMS approach.
- **Service-layer orchestration** — domain logic in services, views stay thin. Same as our existing pattern.
- **Event publishing after transaction** — OpenWMS uses `@FireAfterTransaction` for domain events. We use Django signals for notifications only (same principle: side-effects after commit).

**Features inspired by OpenWMS that we included:**
- **Capacity management per location** — OpenWMS tracks max weight/quantity per location with locking. We adopted this as variety-wise capacity locking for FG warehouses (Section 3.12).
- **FIFO via batch tracking** — OpenWMS enforces FIFO at location level using receipt dates. We enforce via `OIBT.InDate` sorting (Section 3.13).
- **Returns with disposition** — OpenWMS has return inspection with RESTOCK/SCRAP/QUARANTINE outcomes. We adopted this pattern (Section 3.10).
- **Audit trail** — OpenWMS uses Hibernate Envers for full audit. We use Django's audit fields + daily audit model for reconciliation (Section 3.14).

**Features NOT adopted (not applicable to our context):**
- Microservice architecture — our backend is a Django monolith, appropriate for our scale.
- TransportUnit / pallet hierarchy — factory doesn't track pallets as entities.
- Automated material flow control (TMS) — no warehouse automation/PLCs.
- RabbitMQ messaging — our modules communicate via service calls + Django signals.
- Multi-tenant isolation — we handle multi-company via CompanyContext, not tenant isolation.
