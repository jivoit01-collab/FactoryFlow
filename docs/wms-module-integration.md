# WMS — Inter-Module Integration Map

> How the Warehouse Management System connects to every other FactoryFlow module.
> Date: 2026-04-17

---

## The Full Picture

```
                          ┌──────────────────┐
                          │    ERP (SAP B1)   │
                          └────────┬─────────┘
                                   │
    ┌──────────────────────────────┼──────────────────────────────────┐
    │                              │                                  │
    ▼                              ▼                                  ▼
┌────────┐  items move   ┌──────────────────┐   items move   ┌────────────┐
│  GATE  │ ───────────►  │       WMS        │  ───────────►  │  DISPATCH  │
│  (in)  │               │  (storage/stock) │               │   (out)    │
└───┬────┘               └───────┬──────────┘               └────────────┘
    │                        ▲       │
    ▼                        │       ▼
┌────────┐              ┌────┴───────────┐
│   QC   │              │   PRODUCTION   │
│(accept/│              │ (consume raw,  │
│ reject)│              │  produce FG)   │
└────────┘              └────────────────┘
```

Every physical item that enters the factory, moves between locations, gets consumed, gets produced, or leaves the factory — the WMS is involved.

---

## 1. GATE → WMS (Inbound Receiving)

### What happens today
Gate creates a `VehicleEntry` with `POReceipt` and `POItemReceipt` records. After QC approval, GRPO posts to SAP and stock appears in SAP's OITW table. The WMS dashboard reads OITW to show stock levels. But there is **no explicit handoff** — GRPO posts directly and WMS just reads SAP.

### What WMS needs from Gate

| Data from Gate | Used by WMS for | Current Source |
|---------------|-----------------|----------------|
| Item code, quantity received | Putaway — what arrived, how much | `POItemReceipt.received_qty` |
| Accepted quantity (post-QC) | Actual stock to allocate bins for | `POItemReceipt.accepted_qty` |
| Rejected quantity | Route to rejection warehouse | `POItemReceipt.rejected_qty` |
| Warehouse code | Target warehouse for putaway | `POItemReceipt.warehouse_code` |
| Supplier batch/lot number | Batch tracking, FEFO | `MaterialArrivalSlip.supplier_batch_lot_no` |
| GRPO SAP doc entry | Link WMS receipt to SAP document | `GRPOPosting.sap_doc_entry` |
| Vehicle entry ID | Traceability back to gate | `VehicleEntry.id` |

### Integration Points

```
Gate Module                          WMS Module
─────────                            ──────────

VehicleEntry arrives
  └─ POReceipt created
     └─ POItemReceipt created
        └─ QC Inspection ──────►  (no WMS touch yet)
           └─ QC Approved
              └─ GRPO Posted ─────►  TRIGGER: Putaway Task Created
                                     │
                                     ├─ Item: from POItemReceipt
                                     ├─ Qty: accepted_qty
                                     ├─ Target WH: warehouse_code
                                     ├─ Batch: supplier_batch_lot_no
                                     └─ Suggest bin location
```

### New WMS features triggered by Gate

| WMS Feature | Trigger | Data Needed |
|------------|---------|-------------|
| **Putaway task** | GRPO posted successfully | item_code, accepted_qty, warehouse_code, batch_no |
| **Bin assignment** | Putaway task created | warehouse bins, item group, current bin occupancy |
| **Receiving log** | GRPO posted | full GRPO details for receiving history |
| **Rejected material routing** | QC rejected/partially rejected | rejected_qty, item_code → route to rejection WH |

### Notification flow
- `GRPO_POSTED` notification already exists → WMS warehouse operator should receive this to start putaway

---

## 2. QC → WMS (Quality Decisions Affect Stock)

### What happens today
QC inspections result in `final_status`: ACCEPTED, REJECTED, or HOLD. This status feeds into GRPO — only accepted quantities get posted. But the WMS doesn't act on rejections or holds independently.

### What WMS needs from QC

| Data from QC | Used by WMS for | Source |
|-------------|-----------------|--------|
| Final status (ACCEPTED/REJECTED/HOLD) | Decide stock placement | `RawMaterialInspection.final_status` |
| Accepted qty | Putaway into designated warehouse | `POItemReceipt.accepted_qty` |
| Rejected qty | Move to rejection warehouse | `POItemReceipt.rejected_qty` |
| Hold status | Quarantine in QC hold area | Inspection still pending |
| Batch/lot details | Batch-level status tracking | `MaterialArrivalSlip.supplier_batch_lot_no` |

### Integration Points

```
QC Module                            WMS Module
─────────                            ──────────

Inspection submitted
  └─ Chemist approves
     └─ QAM approves
        ├─ ACCEPTED ──────────►  Stock → designated warehouse
        ├─ REJECTED ──────────►  Stock → rejection warehouse (WH-REJ)
        └─ HOLD ──────────────►  Stock → quarantine area (WH-QC)
                                 │
                                 └─ Tracks items by QC status in WMS
```

### New WMS features triggered by QC

| WMS Feature | Trigger | Data Needed |
|------------|---------|-------------|
| **Quarantine hold** | QC status = HOLD | item, qty, hold reason |
| **Rejection warehouse routing** | QC status = REJECTED | item, rejected_qty |
| **Release from hold** | QC status changes HOLD → ACCEPTED | item, qty → move from QC-hold to designated WH |
| **Stock status tagging** | Any QC decision | item + batch → tag as ACCEPTED/REJECTED/ON_HOLD |

### Production QC → WMS

```
Production QC Module                 WMS Module
────────────────────                 ──────────

ProductionQCSession
  └─ IN_PROCESS check
     └─ PASS ─────────────────►  (no WMS action — production continues)
     └─ FAIL ─────────────────►  WMS: rework/scrap decision pending
  └─ FINAL check
     └─ PASS ─────────────────►  WMS: FG ready for receipt into FG warehouse
     └─ FAIL ─────────────────►  WMS: reject/rework to rejection area
     └─ CONDITIONAL ──────────►  WMS: conditional hold pending disposition
```

---

## 3. PRODUCTION → WMS (Material Consumption & FG Output)

This is the **heaviest integration point**. Production both consumes from WMS (raw materials) and feeds into WMS (finished goods).

### What happens today
- Production creates `BOMRequest` → Warehouse approves line-by-line → Material issued to SAP (`InventoryGenExits`)
- Production completes → `FinishedGoodsReceipt` created → Warehouse receives → Posts to SAP (`InventoryGenEntries`)

### 3A. Production → WMS: Material Request (BOM Request)

```
Production Module                    WMS Module
─────────────────                    ──────────

ProductionRun created (DRAFT)
  └─ Start Run requested
     └─ BOMRequest created ────►  WMS: BOM Request appears in queue
        │                            │
        │ BOMRequestLine[]           ├─ Check stock availability (OITW)
        │ (item, qty, warehouse)     ├─ Approve/Partially Approve/Reject per line
        │                            ├─ Set approved_qty per line
        │                            │
        │◄─────────────────────────  └─ Status → APPROVED / PARTIALLY_APPROVED / REJECTED
        │
        ├─ If APPROVED/PARTIAL ──►  WMS: Issue Materials
        │     └─ POST InventoryGenExits to SAP
        │     └─ Update issued_qty per line
        │     └─ material_issue_status → FULLY_ISSUED / PARTIALLY_ISSUED
        │
        └─ If REJECTED ──────────►  ProductionRun.warehouse_approval_status = REJECTED
                                    (Production cannot proceed)
```

**Key fields bridging the modules:**

| Production Field | WMS Field | Purpose |
|-----------------|-----------|---------|
| `ProductionRun.id` | `BOMRequest.production_run` (FK) | Links request to run |
| `ProductionRun.sap_doc_entry` | `BOMRequest.sap_doc_entry` | SAP production order reference |
| `ProductionRun.required_qty` | `BOMRequest.required_qty` | Scaling factor for BOM |
| `ProductionRun.warehouse_approval_status` | Set by WMS on approve/reject | Gates production start |
| WOR1 components (SAP) | `BOMRequestLine` items | BOM fetched from SAP on request creation |

### 3B. Production → WMS: Finished Goods Receipt

```
Production Module                    WMS Module
─────────────────                    ──────────

ProductionRun completed
  │
  ├─ FinalQCCheck.overall_result
  │  = PASS
  │
  └─ FinishedGoodsReceipt ────►  WMS: FG Receipt appears in queue
     created (PENDING)               │
     │                               ├─ Verify qty (produced, good, rejected)
     │                               ├─ Mark as RECEIVED
     │                               ├─ Post to SAP (InventoryGenEntries)
     │                               │   └─ BaseType=202 (Production Order)
     │                               └─ Status → SAP_POSTED
     │
     │◄──────────────────────────  sap_receipt_doc_entry returned
     │
     └─ ProductionRun.sap_receipt_doc_entry updated
        ProductionRun.sap_sync_status = 'SYNCED'
```

**Key fields bridging the modules:**

| Production Field | WMS Field | Purpose |
|-----------------|-----------|---------|
| `ProductionRun.id` | `FinishedGoodsReceipt.production_run` (FK) | Links receipt to run |
| `ProductionRun.product` | `FinishedGoodsReceipt.item_code` | What was produced |
| `FinalQCCheck.overall_result` | Condition for FG receipt | Only PASS triggers receipt |
| `ProductionRun.sap_receipt_doc_entry` | Set by WMS after SAP posting | Closes the loop |

### 3C. Production → WMS: Material Usage Tracking

```
Production Module                    WMS Module
─────────────────                    ──────────

During production run:
  ProductionMaterialUsage
    - opening_qty                    WMS can reconcile:
    - issued_qty                     - issued_qty should match BOMRequest issued_qty
    - closing_qty                    - wastage_qty feeds into variance reports
    - wastage_qty (calculated)       - Compare actual vs planned consumption
```

### 3D. Production → WMS: Waste Management

```
Production Module                    WMS Module
─────────────────                    ──────────

WasteLog created
  └─ Multi-step approval:
     engineer → AM → store → HOD
     │
     └─ Store approval step ────►  This IS a WMS touchpoint:
                                    warehouse/store person signs off
                                    that waste quantity is correct
                                    and material is accounted for
```

---

## 4. WMS → DASHBOARDS (Analytics & Reporting)

### What happens today
Multiple dashboard modules read SAP HANA directly for analytics. WMS dashboard is one of them.

### Data WMS provides to Dashboards

| Dashboard | Data from WMS / SAP | Current Module |
|-----------|-------------------|----------------|
| **WMS Dashboard** | KPIs, stock health, top items, recent movements | `warehouse/views_wms.py` |
| **Stock Benchmark** | Stock levels vs min/max across warehouses | `stock_dashboard/` |
| **Inventory Age** | How long items have been sitting in warehouse | `inventory_age/` |
| **Non-Moving RM** | Raw materials with no movement for X days | `non_moving_rm/` |
| **SAP Plan Dashboard** | Procurement vs planned production | `sap_plan_dashboard/` |

### New dashboard data WMS should provide

| New Dashboard View | Source Data |
|-------------------|-------------|
| **Warehouse utilization** | Bin occupancy rates per warehouse |
| **Putaway pending** | Items received but not yet assigned bins |
| **Pick efficiency** | Pick lists completed vs pending, time per pick |
| **Transfer activity** | Inter-warehouse movements volume/frequency |
| **Expiry tracker** | Items approaching expiry (FEFO) |
| **Receiving throughput** | Daily/weekly receiving volumes by warehouse |

---

## 5. WMS → NOTIFICATIONS (Alerts & Triggers)

### Existing notification types relevant to WMS

| Type | When | Who receives |
|------|------|-------------|
| `GRPO_POSTED` | GRPO posted to SAP | Store team |
| `GRPO_FAILED` | GRPO posting failed | Store team |
| `STOCK_ALERT` | Stock falls below min level | Store/purchase team |

### New notification types WMS should add

| Type | When | Who receives |
|------|------|-------------|
| `PUTAWAY_TASK_CREATED` | New goods received, needs bin assignment | Warehouse operator |
| `BOM_REQUEST_CREATED` | Production requests materials | Warehouse manager |
| `BOM_REQUEST_APPROVED` | Materials approved for issue | Production team |
| `BOM_REQUEST_REJECTED` | Materials rejected | Production team |
| `MATERIAL_ISSUED` | Goods issue posted to SAP | Production + warehouse |
| `FG_RECEIPT_PENDING` | Production completed, FG awaiting receipt | Warehouse operator |
| `FG_RECEIPT_POSTED` | FG posted to SAP | Production + warehouse |
| `STOCK_TRANSFER_CREATED` | Inter-warehouse transfer initiated | Both warehouse teams |
| `EXPIRY_ALERT` | Batch approaching/past expiry | Warehouse + QC |
| `PICK_LIST_ASSIGNED` | New pick task assigned | Picker |
| `INVENTORY_COUNT_SCHEDULED` | Cycle count due | Warehouse team |

---

## 6. Complete Data Flow — End to End

### Flow A: Raw Material → Warehouse (Inbound)

```
Step  Module        Action                              WMS Involvement
────  ──────        ──────                              ───────────────
 1    GATE          Vehicle arrives, entry created       —
 2    GATE          PO receipts selected, items logged   —
 3    GATE          Security check, weighment            —
 4    QC            Arrival slip created                 —
 5    QC            Inspection: parameters tested        —
 6    QC            Chemist → QAM approval chain         —
 7    QC            Final status: ACCEPTED               Status feeds GRPO
 8    GRPO          GRPO posted to SAP                   ► TRIGGER: Putaway task
 9    WMS           Putaway task created                 Suggest bin, operator assigns
10    WMS           Material placed in bin               Stock + bin updated in SAP
11    WMS           Stock visible in dashboards          KPIs updated
```

### Flow B: Warehouse → Production (Material Issue)

```
Step  Module        Action                              WMS Involvement
────  ──────        ──────                              ───────────────
 1    PRODUCTION    Run created, BOM request sent        ► WMS receives request
 2    WMS           Check stock availability             Query OITW per line
 3    WMS           Approve/reject per line              Set approved_qty
 4    WMS           Issue materials to SAP               POST InventoryGenExits
 5    WMS           Pick from bins (if bin-enabled)      Update bin stock
 6    PRODUCTION    Materials received on floor          ProductionRun starts
 7    PRODUCTION    Track consumption (MaterialUsage)    WMS reconciles issued vs used
```

### Flow C: Production → Warehouse (FG Receipt)

```
Step  Module        Action                              WMS Involvement
────  ──────        ──────                              ───────────────
 1    PRODUCTION    Run completed                        —
 2    QC            Final QC check: PASS                 —
 3    PRODUCTION    FG receipt created (PENDING)         ► WMS receives notification
 4    WMS           Verify qty, mark RECEIVED            Warehouse operator confirms
 5    WMS           Post to SAP (InventoryGenEntries)    FG stock appears in SAP
 6    WMS           Putaway task for FG                  Assign bin in FG warehouse
 7    WMS           Stock visible in dashboards          FG inventory updated
 8    PRODUCTION    sap_receipt_doc_entry set             Loop closed
```

### Flow D: Warehouse → Outbound (Shipping) — NEW

```
Step  Module        Action                              WMS Involvement
────  ──────        ──────                              ───────────────
 1    (SAP/ERP)     Sales order created                  —
 2    WMS           Pick list generated                  Items, qtys, source bins
 3    WMS           Picker picks items                   Confirm picked qty per bin
 4    WMS           Packing / staging                    Move to dispatch area
 5    WMS           Delivery note created in SAP         POST DeliveryNotes
 6    WMS           Shipping confirmation                Track number, vehicle
 7    DASHBOARDS    Outbound metrics updated             Throughput, on-time %
```

### Flow E: Internal Warehouse Movements — NEW

```
Step  Module        Action                              WMS Involvement
────  ──────        ──────                              ───────────────
 1    WMS           Transfer request created             From-WH, To-WH, items
 2    WMS           Request approved (if needed)         Manager approves
 3    WMS           Transfer executed                    POST StockTransfers to SAP
 4    WMS           Bin updates (if bin-enabled)         From-bin decremented, to-bin incremented
 5    DASHBOARDS    Movement logged in OINM              Shows in movement history
```

---

## 7. Shared Data Entities

These entities are used across multiple modules. WMS must read/write them consistently.

| Entity | Owner Module | Used By | How WMS Uses It |
|--------|-------------|---------|-----------------|
| `VehicleEntry` | Gate | QC, GRPO, WMS | Trace receiving back to gate entry |
| `POItemReceipt` | Gate | QC, GRPO, WMS | Source of received qty, item details |
| `MaterialArrivalSlip` | QC | GRPO, WMS | Batch/lot info for tracking |
| `RawMaterialInspection` | QC | GRPO, WMS | Accept/reject decisions → stock routing |
| `GRPOPosting` | GRPO | WMS | Trigger for putaway, receiving log |
| `ProductionRun` | Production | WMS | Source of BOM requests and FG receipts |
| `BOMRequest` | WMS | Production | Material approval status gates production |
| `FinishedGoodsReceipt` | WMS | Production | FG receipt closes production loop |
| `WasteLog` | Production | WMS | Store approval step is a WMS touchpoint |
| `Notification` | Notifications | All | WMS publishes and subscribes to events |

---

## 8. Summary: WMS Feature ↔ Module Map

| WMS Feature | Connects To | Direction | Integration Type |
|------------|------------|-----------|-----------------|
| **Putaway** | Gate/GRPO | Gate → WMS | GRPO_POSTED triggers putaway task |
| **Putaway** | Production | Prod → WMS | FG receipt triggers FG putaway |
| **BOM Request Approval** | Production | Prod ↔ WMS | Production sends request, WMS approves/rejects |
| **Material Issue** | Production | WMS → Prod | WMS issues to SAP, production run unblocked |
| **FG Receipt** | Production | Prod → WMS | Production completes, WMS receives and posts |
| **Quarantine/Hold** | QC | QC → WMS | QC HOLD status → quarantine area |
| **Rejection Routing** | QC | QC → WMS | QC REJECTED → rejection warehouse |
| **Stock Queries** | All dashboards | WMS → Dashboards | Stock levels, movements, health |
| **Waste Store Approval** | Production | Prod ↔ WMS | Store person approves waste log |
| **Picking** | Outbound/Sales | ERP → WMS | Sales order triggers pick list |
| **Shipping** | Outbound | WMS → ERP | Delivery note posted to SAP |
| **Stock Transfers** | Internal | WMS standalone | Inter-warehouse movements |
| **Inventory Counting** | Internal | WMS standalone | Cycle counts, post variances |
| **Expiry Tracking** | QC + Dashboards | WMS → both | FEFO alerts, batch status |
| **Reorder Alerts** | Purchasing | WMS → Notifications | Low stock triggers alert to purchase team |
| **Receiving Log** | Gate/GRPO | Gate → WMS | Historical receiving records |
