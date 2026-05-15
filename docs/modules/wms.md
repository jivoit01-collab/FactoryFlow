# WMS — Module Integration & SAP Reality

> What SAP actually has, and how WMS connects to every other FactoryFlow module.
> Updated: 2026-04-18 (based on live PRODUCTION SAP HANA — JIVO_OIL_HANADB, confirmed same data across env changes)

---

## 1. What SAP Actually Has (Live Data)

### 1.1 Branches & Warehouse Layout

Jivo operates across **3 physical locations** with **40+ active warehouses**:

| Branch | Location | Key Warehouses |
|--------|----------|---------------|
| **Branch 2 — FACTORY (Bhakharpur, HR)** | Main production site | BH-PC (Production Consumption), BH-PM (Packaging Materials), BH-BS (Basement/storage), BH-PF (Production Finished), BH-FG (Finished Basement), BH-EC (E-Commerce), BH-LO (Loose Oil), BH-GR (Goods Receipt), BH-WST (Wastage), BH-NM (Non-Moving), BH-CRUDE (Gujarat Crude), BH-INT (Intransit), GP-FG (Gupta Godown FG), GP-PM (Gupta Godown PM) |
| **Branch 1 — DELHI** | Sales/distribution | DL-FG (Finished), DL-EC (E-Commerce), DL-PS (Preshit Samagam), DL-INT (Intransit), DL-GR (Goods Receipt) |
| **Branch 3 — PUNJAB** | C&F / distribution | PB-ST (Sai Trading C&F), PB-SP (Sangrur), PB-JP (Jagraon C&F), PB-INT (Intransit) |

### 1.2 What IS Configured

| Feature | Status | Data |
|---------|--------|------|
| **Multiple warehouses** | Active | 40+ active warehouses across 3 branches |
| **Stock transfers** | Heavily used | 9,675 transfers total, 32,144 movement entries in last 90 days |
| **Transfer requests** | Used | 1,114 requests |
| **Batch tracking** | Active | 14,819 batch records, 572 batch-managed items |
| **Batch expiry dates** | Active on FG items | Expiry tracked, 10 items already expired, 3 expiring within 90 days |
| **Pick lists** | Used | 3,584 pick lists, all sourced from Sales Orders |
| **Delivery notes** | Active | 2,717 deliveries |
| **Sales orders** | Active | 2,466 open orders, 4.7M open qty |
| **Goods issues** | Active | 6,526 documents (material issue to production) |
| **Goods receipts** | Active | 6,647 documents (FG receipts, GRPO) |
| **Customer returns** | Active | 1,816 returns |
| **Purchase returns** | Light | 78 returns |
| **Production orders** | Active | 158 released, 6,234 closed |

### 1.3 What is NOT Configured

| Feature | Status | Implication |
|---------|--------|------------|
| **Bin locations** | NOT enabled | 0 records in OBIN, BinActivat='N' on all warehouses. No sub-warehouse location tracking. |
| **Serial numbers** | NOT used | 0 records in OSRN. No items configured for serial tracking. |
| **Inventory counting** | NOT used | 0 records in OINC. No cycle counts done through SAP. |

### 1.4 Real Material Flow (Top Transfer Routes — Last 90 Days)

```
INBOUND (Raw Materials)
  BH-GR (Goods Receipt) ──── receive from gate
       │
       ▼
  BH-PM (Packaging Materials) ──── 1,222 transfers ──► BH-BS (Basement Storage)
  BH-LO (Loose Oil) ─────────── 358 transfers ──► BH-PC (Production Consumption)
  BH-NM (Non-Moving) ─────────── 147 transfers ──► BH-PC
       │
       ▼
PRODUCTION
  BH-BS (Basement) ─────── 2,524 transfers ──► BH-PC (Production Consumption)
  BH-PC ───── consumed by production ────► BH-WST (Wastage) [1,595 transfers]
  BH-PC ──────────────────────────────► BH-PP (Production Process)
       │
       ▼
FINISHED GOODS
  BH-PF (Production Finished) ── 586 transfers ──► GP-FG (Gupta Godown FG)
  BH-PF ──────────────────────── 365 transfers ──► BH-EC (E-Commerce)
       │
       ▼
DISTRIBUTION
  GP-FG / BH-FG / BH-EC ──────── Sales Orders ──► Pick ──► Delivery ──► Customer
  BH-INT / DL-INT / PB-INT ──── Intransit between branches
```

---

## 2. WMS Integration with Each Module

### Overview

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

---

### 2.1 GATE → WMS (Inbound Receiving)

**Current state:** Gate creates `VehicleEntry` → `POReceipt` → `POItemReceipt`. After QC approval, GRPO posts to SAP. WMS dashboard reads SAP stock. No explicit handoff exists.

**What WMS needs from Gate:**

| Data | Source | WMS Purpose |
|------|--------|-------------|
| Item code, accepted qty | `POItemReceipt.accepted_qty` | Know what arrived and how much |
| Rejected qty | `POItemReceipt.rejected_qty` | Route to BH-WST or rejection area |
| Warehouse code | `POItemReceipt.warehouse_code` | Target warehouse (usually BH-GR or BH-PC) |
| Supplier batch/lot | `MaterialArrivalSlip.supplier_batch_lot_no` | Batch tracking for FEFO |
| GRPO SAP doc entry | `GRPOPosting.sap_doc_entry` | Link to SAP document |
| Vehicle entry ID | `VehicleEntry.id` | Full traceability |

**Integration flow:**

```
GRPO Posted (SAP doc created)
  │
  └──► WMS: Receiving record created
       ├── Log: what arrived, from whom, qty, batch
       ├── Stock now visible in warehouse (BH-GR → then transferred to BH-PC/BH-PM/BH-BS)
       └── Notification: GRPO_POSTED → warehouse team
```

**Note:** Since bins are NOT enabled in SAP, there's no "putaway task" needed. The material goes to the warehouse specified on the PO line. The real movement is the **stock transfer** from receiving warehouse (BH-GR) to storage/production warehouse — and this already happens via SAP stock transfers (9,675 total).

---

### 2.2 QC → WMS (Quality Decisions Affect Stock)

**Current state:** QC results in `final_status`: ACCEPTED / REJECTED / HOLD. Only accepted qty feeds into GRPO posting.

**Integration flow:**

```
QC Inspection
  ├── ACCEPTED ──► GRPO posts accepted qty → stock in designated warehouse
  ├── REJECTED ──► Rejected qty NOT posted to SAP
  │                WMS should track: what was rejected, route to BH-WST
  └── HOLD ──────► Material awaits disposition
                   WMS should track: item on hold, pending QC release
```

**What WMS needs from QC:**

| Trigger | WMS Action |
|---------|-----------|
| `final_status = ACCEPTED` | Normal receiving flow |
| `final_status = REJECTED` | Track rejected material, notify for return to vendor or wastage |
| `final_status = HOLD` | Track held material, alert when released |
| Production QC `FAIL` | Flag FG as not ready for receipt, may need rework |
| Production QC `PASS` | FG ready for warehouse receipt |

---

### 2.3 PRODUCTION ↔ WMS (Heaviest Integration — Already Partially Built)

This is bidirectional. Production **consumes** from warehouse and **feeds** finished goods back.

#### A. Material Request (Production → WMS)

Already built: `BOMRequest` model with line-level approval.

```
ProductionRun created
  └── BOMRequest created ──────► WMS: Request appears in approval queue
      │                              │
      │ BOMRequestLine[]             ├── Check stock in OITW
      │ (item, qty, warehouse)       ├── Approve/Partially Approve/Reject per line
      │                              ├── Set approved_qty
      │                              │
      │◄─────────────────────────    └── Status → APPROVED / PARTIALLY_APPROVED / REJECTED
      │
      ├── APPROVED ──► WMS issues material (POST InventoryGenExits)
      │                  └── SAP: stock moves from BH-PC/BH-BS → production consumption
      │                  └── material_issue_status → FULLY_ISSUED
      │
      └── REJECTED ──► ProductionRun.warehouse_approval_status = REJECTED
                       Production cannot start
```

**Key fields:**

| Production | WMS | Bridge |
|-----------|-----|--------|
| `ProductionRun.id` | `BOMRequest.production_run` | FK link |
| `ProductionRun.sap_doc_entry` | `BOMRequest.sap_doc_entry` | SAP production order |
| `ProductionRun.required_qty` | `BOMRequest.required_qty` | BOM scaling |
| `ProductionRun.warehouse_approval_status` | Set by WMS approve/reject | Gates production |

#### B. Finished Goods Receipt (Production → WMS)

Already built: `FinishedGoodsReceipt` model.

```
ProductionRun completed + Final QC PASS
  └── FinishedGoodsReceipt created (PENDING)
      │
      └──► WMS: FG receipt appears in queue
           ├── Verify qty (produced, good, rejected)
           ├── Mark as RECEIVED
           ├── Post to SAP (InventoryGenEntries, BaseType=202)
           │   └── Stock appears in BH-PF (Production Finished)
           └── Status → SAP_POSTED
               │
               └──► ProductionRun.sap_receipt_doc_entry set
                    Loop closed
```

After FG receipt, the real-world flow is: **BH-PF → GP-FG or BH-EC** via stock transfer (586 + 365 transfers in last 90 days).

#### C. Material Usage Tracking

```
During production:
  ProductionMaterialUsage
    - opening_qty        ─┐
    - issued_qty          ├── WMS can reconcile:
    - closing_qty         │   issued_qty should match BOMRequest.issued_qty
    - wastage_qty (calc) ─┘   wastage feeds variance reports
```

#### D. Waste Management

```
WasteLog (multi-step approval)
  └── engineer → AM → STORE → HOD
                        ▲
                        │
                  This is a WMS touchpoint:
                  Store/warehouse person verifies
                  waste quantity and material disposition
```

**SAP reality:** Waste goes to BH-WST warehouse (1,595 transfers from BH-PC → BH-WST in last 90 days). Some waste then transfers back: BH-WST → BH-PP (231 transfers) and BH-WST → BH-PC (recyclable waste).

---

### 2.4 WMS → OUTBOUND / DISPATCH (Picking & Shipping)

**SAP reality:** This flow already exists in SAP but NOT in FactoryFlow.

| SAP Object | Volume | Current Status in FactoryFlow |
|-----------|--------|------------------------------|
| Sales Orders (ORDR) | 2,466 open, 4.7M open qty | Not in app |
| Pick Lists (OPKL) | 3,584 total, all from Sales Orders | Not in app |
| Delivery Notes (ODLN) | 2,717 total | Not in app |

**Current flow (done directly in SAP):**

```
Sales Order (ORDR) ──► Pick List (OPKL) ──► Delivery Note (ODLN) ──► Customer
                                                     │
  Main outbound warehouses:                          │
  GP-FG  (2,696K open qty, 1,171 orders)            │
  BH-FG  (1,215K open qty, 668 orders)              │
  PB-ST  (334K open qty, 329 orders)                │
```

**WMS integration:** If we bring picking/dispatch into FactoryFlow:
- Read open Sales Orders from SAP
- Generate/manage pick lists
- Operator confirms picks on mobile
- Create delivery note in SAP
- Track shipment

---

### 2.5 WMS — Stock Transfers (Internal Movements)

**SAP reality:** This is the MOST active SAP operation — 32,144 movement entries in last 90 days.

**Current flow (done directly in SAP):**

```
INBOUND FLOW:
  BH-PM (Packaging) ──1,222──► BH-BS (Basement Storage)
  BH-LO (Loose Oil) ───358──► BH-PC (Production)
  BH-NM (Non-Moving) ──147──► BH-PC (Production)

PRODUCTION FLOW:
  BH-BS (Basement) ──2,524──► BH-PC (Production Consumption)  ← HIGHEST VOLUME
  BH-PC ──────────────321──► BH-PP (Production Process)

WASTE FLOW:
  BH-PC ────────────1,595──► BH-WST (Wastage)
  BH-WST ─────────────231──► BH-PP (back to production)

FINISHED GOODS FLOW:
  BH-PF (Prod Finished) ──586──► GP-FG (Gupta Godown FG)
  BH-PF ───────────────────365──► BH-EC (E-Commerce)

INTER-BRANCH:
  DL-INT ──175──► DL-PS (Delhi)
  PB-INT ──169──► PB-SP (Punjab)
  DL-PS  ──167──► BH-INT (back to factory)
```

**WMS integration:** If we bring transfers into FactoryFlow:
- Create/approve transfer requests
- Execute transfers (updates SAP via POST StockTransfers)
- Dashboard showing transfer volume and routes
- Alert for pending transfers

---

### 2.6 WMS → DASHBOARDS (Analytics)

**Already built:**

| Dashboard | Backend | What it reads |
|-----------|---------|--------------|
| WMS Dashboard | `warehouse/views_wms.py` | OITW, OITM, OITB, OINM, OWHS |
| Stock Benchmark | `stock_dashboard/` | OITW, OITM |
| Inventory Age | `inventory_age/` | OITW, OINM |
| Non-Moving RM | `non_moving_rm/` | OITW, OINM |

**New dashboards WMS should provide:**

| View | Data Source | Why |
|------|-----------|-----|
| **Expiry tracker** | OBTN/OBTQ | 10 items expired NOW, 3 more within 90 days — critical for food products |
| **Transfer activity** | OWTR/WTR1 | 32K movements in 90 days, need visibility |
| **Warehouse-to-warehouse flow** | OINM (TransType=67) | Visualize the material flow routes |
| **Open order backlog** | ORDR/RDR1 | 2,466 open orders, 4.7M pending qty |
| **Pick completion rate** | OPKL/PKL1 | Track picker efficiency |

---

### 2.7 WMS → NOTIFICATIONS

**Existing types relevant to WMS:**

| Type | Already Exists |
|------|---------------|
| `GRPO_POSTED` | Yes |
| `GRPO_FAILED` | Yes |
| `STOCK_ALERT` | Yes |

**New types WMS should add:**

| Type | Trigger | Recipient |
|------|---------|-----------|
| `BOM_REQUEST_CREATED` | Production requests materials | Warehouse manager |
| `BOM_REQUEST_APPROVED` | WMS approves | Production team |
| `BOM_REQUEST_REJECTED` | WMS rejects | Production team |
| `MATERIAL_ISSUED` | Goods issue posted | Production + warehouse |
| `FG_RECEIPT_PENDING` | Production complete, FG waiting | Warehouse operator |
| `FG_RECEIPT_POSTED` | FG posted to SAP | Production + warehouse |
| `EXPIRY_ALERT` | Batch within 30/90 days of expiry | Warehouse + QC |
| `STOCK_TRANSFER_CREATED` | Transfer initiated | Both warehouse teams |

---

## 3. Shared Data Entities Across Modules

| Entity | Owner | Used By | How WMS Uses It |
|--------|-------|---------|-----------------|
| `VehicleEntry` | Gate | QC, GRPO, WMS | Trace inbound receiving |
| `POItemReceipt` | Gate | QC, GRPO, WMS | Source qty, item details |
| `MaterialArrivalSlip` | QC | GRPO, WMS | Batch/lot info |
| `RawMaterialInspection` | QC | GRPO, WMS | Accept/reject → stock routing |
| `GRPOPosting` | GRPO | WMS | Trigger for receiving log |
| `ProductionRun` | Production | WMS | BOM requests + FG receipts |
| `BOMRequest` | WMS | Production | Approval status gates production |
| `FinishedGoodsReceipt` | WMS | Production | Closes production loop |
| `WasteLog` | Production | WMS | Store approval step |
| `Notification` | Notifications | All | WMS publishes + subscribes |

---

## 4. End-to-End Flows

### Flow A: Raw Material Inbound

```
Step  Module       Action                             WMS Touch
────  ──────       ──────                             ─────────
 1    GATE         Vehicle arrives, PO receipts       —
 2    GATE         Security check, weighment          —
 3    QC           Inspection + approval chain         —
 4    GRPO         GRPO posted to SAP                 ► Receiving logged, stock in BH-GR
 5    WMS          Transfer BH-GR → BH-PC/BH-PM      Stock in correct warehouse
 6    DASHBOARDS   Stock levels updated                KPIs refreshed
```

### Flow B: Material Issue to Production

```
Step  Module       Action                             WMS Touch
────  ──────       ──────                             ─────────
 1    PRODUCTION   Run created, BOM request           ► Request in WMS queue
 2    WMS          Check stock, approve per line       Stock availability check
 3    WMS          Issue to SAP (InventoryGenExits)   Stock out of BH-PC/BH-BS
 4    PRODUCTION   Materials on production floor       Run starts
 5    PRODUCTION   Track consumption (MaterialUsage)  WMS reconciles issued vs used
```

### Flow C: FG Receipt from Production

```
Step  Module       Action                             WMS Touch
────  ──────       ──────                             ─────────
 1    PRODUCTION   Run completed                      —
 2    QC           Final QC PASS                      —
 3    WMS          FG receipt verified + SAP posted    ► Stock in BH-PF
 4    WMS          Transfer BH-PF → GP-FG / BH-EC    FG in distribution warehouse
 5    PRODUCTION   sap_receipt_doc_entry set           Loop closed
```

### Flow D: Outbound / Dispatch (if built)

```
Step  Module       Action                             WMS Touch
────  ──────       ──────                             ─────────
 1    SAP          Sales order created                 —
 2    WMS          Pick list from open SO              ► Pick assigned
 3    WMS          Picker confirms picks               Qty confirmed
 4    WMS          Delivery note posted to SAP         Stock out of GP-FG / BH-FG
 5    WMS          Shipment tracking                  Vehicle, tracking no.
```

### Flow E: Internal Stock Transfers

```
Step  Module       Action                             WMS Touch
────  ──────       ──────                             ─────────
 1    WMS          Transfer request created            From-WH, To-WH, items
 2    WMS          Approved (if needed)                Manager approves
 3    WMS          Transfer posted to SAP              Stock moved in OITW
 4    DASHBOARDS   Movement in OINM                    Movement history updated
```

---

## 5. Summary: WMS Feature ↔ Module ↔ SAP

| WMS Feature | Connects To | SAP Object | SAP Volume | Status |
|------------|------------|-----------|-----------|--------|
| **BOM Request Approval** | Production | OITW (stock check) | — | Built |
| **Material Issue** | Production | InventoryGenExits (OIGE) | 6,526 docs | Built |
| **FG Receipt** | Production | InventoryGenEntries (OIGN) | 6,647 docs | Built |
| **Receiving Log** | Gate/GRPO | OPDN (GRPO) | — | Partially built |
| **Stock Dashboard** | Dashboards | OITW, OITM, OINM | — | Built |
| **Waste Store Approval** | Production | WasteLog model | — | Built |
| **Stock Transfers** | Internal | StockTransfers (OWTR) | 9,675 docs | Not in app |
| **Transfer Requests** | Internal | StockTransferRequests (OWTQ) | 1,114 docs | Not in app |
| **Batch/Expiry Tracking** | QC + Dashboards | OBTN/OBTQ | 14,819 batches | Not in app |
| **Picking** | Outbound | PickLists (OPKL) | 3,584 lists | Not in app |
| **Delivery/Shipping** | Outbound | DeliveryNotes (ODLN) | 2,717 docs | Not in app |
| **Sales Order Backlog** | Outbound | ORDR | 2,466 open | Not in app |
| **Customer Returns** | Returns | Returns (ORDN) | 1,816 docs | Not in app |
| **Purchase Returns** | Returns | PurchaseReturns (ORPD) | 78 docs | Not in app |
| **Rejection Routing** | QC | — (app-level) | — | Not in app |
| **QC Hold/Release** | QC | — (app-level) | — | Not in app |
| **Reorder Alerts** | Notifications | OITW min/max levels | — | Partially (STOCK_ALERT) |

### App-Only Features (not in SAP, built in our Django models + PostgreSQL)

| Feature | SAP Status | Our Approach |
|---------|-----------|-------------|
| **Bin locations** | BinActivat='N' on all 46 warehouses, 0 OBIN records | Django models — physical location layer on top of SAP warehouse-level stock |
| **Putaway tasks** | No SAP putaway | Django models — our logic assigns bins on GRPO/FG receipt |
| **Inventory counting** | 0 OINC records | Django models — cycle counts in app, material variances posted to SAP via existing GR/GI endpoints |
| **Serial tracking** | 0 items configured, 0 OSRN records | Django models (future) |

SAP's `OITW.OnHand` remains the financial source of truth. Our app adds the physical "where in the warehouse" detail. See [sap-wms-integration-points.md](../sap-wms-integration-points.md) for full SAP vs APP breakdown.
