# SAP B1 WMS Integration Points for FactoryFlow

> **Purpose:** Map every SAP integration point for the WMS, and clearly distinguish what syncs to SAP vs what lives only in our app.
> **Updated:** 2026-04-18 (verified against PRODUCTION SAP HANA — JIVO_OIL_HANADB)
> **SAP Version:** SAP Business One 10.0 (HANA), Service Layer v2
> **Connection:** HANA direct (reads) + Service Layer REST (writes) — existing pattern from factory_app_v2

---

## Key Principle: SAP-Synced vs App-Only

Some WMS features are **synced with SAP** (stock transfers, batch tracking, picking, etc.). Others are **managed entirely in our app** because SAP is not configured for them (bin locations, serial numbers, inventory counting). Both are real features in FactoryFlow — the difference is where the source of truth lives.

| Marker | Meaning |
|--------|---------|
| **SAP** | Reads from / writes to SAP. SAP is the source of truth. |
| **APP** | Lives in our Django models + PostgreSQL only. Our app is the source of truth. |
| **HYBRID** | Our app manages the workflow, SAP records the result. |

---

## Table of Contents

1. [Production SAP Reality](#1-production-sap-reality)
2. [Already Built](#2-already-built)
3. [What to Build — SAP-Synced Features](#3-sap-synced-features)
4. [What to Build — App-Only Features](#4-app-only-features)
5. [SAP Tables Reference](#5-sap-tables-reference)
6. [SAP Service Layer Endpoints](#6-sap-service-layer-endpoints)
7. [Stock Transfers & Movements (SAP)](#7-stock-transfers--movements)
8. [Batch Tracking & FEFO (SAP)](#8-batch-tracking--fefo)
9. [Picking & Packing (SAP)](#9-picking--packing)
10. [Shipping & Delivery (SAP)](#10-shipping--delivery)
11. [Returns (SAP)](#11-returns)
12. [Bin Location Management (APP)](#12-bin-location-management)
13. [Putaway Logic (APP)](#13-putaway-logic)
14. [Inventory Counting (APP)](#14-inventory-counting)
15. [Reporting & Analytics Queries](#15-reporting--analytics-queries)
16. [Integration Architecture](#16-integration-architecture)

---

## 1. Production SAP Reality

Verified 2026-04-18 against JIVO_OIL_HANADB production database.

### Branches

| ID | Name | Location |
|----|------|---------|
| 1 | DELHI | Sales/distribution hub |
| 2 | FACTORY | Bhakharpur, Haryana — main production site |
| 3 | PUNJAB | C&F / distribution |
| 4-8 | HIMACHAL, HARYANA SALES, DELHI ISD/INFO, HARYANA INFO | Satellite branches |

### Active Warehouses (46 total, top by stock)

| Code | Name | Branch | Stock Qty |
|------|------|--------|----------|
| BH-BS | Bhakharpur Basement | Factory | 4,867,034 |
| BH-PM | Packaging Materials 1st Floor | Factory | 2,836,691 |
| BH-NM | Non-Moving | Factory | 1,363,631 |
| BH-PC | Production Consumption | Factory | 546,838 |
| BH-CRUDE | Gujarat Crude | Factory | 472,083 |
| GP-FG | Gupta Godown Finished | Factory | 429,698 |
| BH-FG | Finished Basement | Factory | 377,366 |
| GP-NM | Gupta Non-Moving | Factory | 369,427 |
| BH-LO | Loose Oil | Factory | 355,905 |
| BH-EC | E-Commerce Finished | Factory | 285,947 |
| BH-PF | Production Finished 1st Floor | Factory | 76,549 |
| BH-GR | Goods Receipt | Factory | 46,195 |
| BH-WST | Wastage | Factory | 21,618 |
| PB-ST | Punjab Sai Trading C&F | Punjab | 35,552 |
| DL-J3 | Rajouri Garden | Delhi | 159,172 |

### Document Volumes

| Document | SAP Table | Count | Date Range |
|----------|----------|-------|-----------|
| Stock Transfers | OWTR | 9,675 | Sep 2024 — Apr 2026 |
| Transfer Requests | OWTQ | 1,114 | Oct 2024 — Apr 2026 |
| Pick Lists | OPKL | 3,584 | Oct 2024 — Feb 2026 |
| Delivery Notes | ODLN | 2,717 | Oct 2024 — Apr 2026 |
| Goods Issues | OIGE | 6,526 | Sep 2024 — Apr 2026 |
| Goods Receipts | OIGN | 6,647 | Sep 2024 — Apr 2026 |
| GRPO | OPDN | 9,451 | Sep 2024 — Apr 2026 |
| Sales Orders | ORDR | 13,062 (2,468 open) | Oct 2024 — Apr 2026 |
| Production Orders | OWOR | 6,445 (158 released) | Oct 2024 — Apr 2026 |
| Customer Returns | ORDN | 1,816 | Oct 2024 — Apr 2026 |
| Purchase Returns | ORPD | 78 | Oct 2024 — Apr 2026 |

### Item Configuration

| Config | Count |
|--------|-------|
| Batch-managed items (ManBtchNum='Y') | 572 |
| Non-batch items | 1,212 |
| Batch records in system (OBTN) | 14,819 |
| Serial-managed items | 0 |
| Serial records (OSRN) | 0 |

### Batch Expiry Status (items with stock)

| Status | Items | Batches | Quantity |
|--------|-------|---------|----------|
| EXPIRED | 10 | 12 | 16,904 |
| Within 90 days | 3 | 3 | 250 |
| OK | 154 | 577 | 712,357 |

### What SAP Does NOT Have

| Feature | SAP Status | Our Approach |
|---------|-----------|-------------|
| Bin locations | BinActivat='N' on all 46 warehouses, 0 OBIN records | **Build in app only** |
| Serial numbers | 0 items configured, 0 OSRN records | **Build in app only** (future) |
| Inventory counting | 0 OINC records | **Build in app only** |

---

## 2. Already Built

| Feature | Backend | SAP Integration | Marker |
|---------|---------|----------------|--------|
| BOM Request Workflow | warehouse/models.py | WOR1 (read BOM) | HYBRID |
| Material Issue | warehouse/services.py | `POST InventoryGenExits` | SAP |
| FG Receipt | warehouse/services.py | `POST InventoryGenEntries` | SAP |
| Stock Queries | warehouse/wms_hana_reader.py | OITW, OITM | SAP |
| WMS Dashboard | warehouse/views_wms.py | OITW, OITM, OITB, OINM, OWHS | SAP |
| Warehouse List | sap_client/hana/warehouse_reader.py | OWHS | SAP |
| Vendor List | sap_client/hana/vendor_reader.py | OCRD | SAP |
| Purchase Orders | sap_client/hana/po_reader.py | OPOR/POR1 | SAP |
| GRPO | grpo/services.py | `POST PurchaseDeliveryNotes` | SAP |
| Production Orders | production_execution/ | OWOR/WOR1, `POST ProductionOrders` | SAP |
| Movement History | warehouse/wms_hana_reader.py | OINM | SAP |
| Billing Reconciliation | warehouse/views_wms.py | OPDN/PDN1, OPCH/PCH1 | SAP |

---

## 3. SAP-Synced Features (To Build)

These read from and/or write to SAP. SAP is the system of record for the resulting documents.

| Feature | Read From (HANA) | Write To (Service Layer) | Priority |
|---------|-----------------|-------------------------|----------|
| **Stock Transfers** | OWTR/WTR1 | `POST StockTransfers` | High |
| **Transfer Requests** | OWTQ/WTQ1 | `POST StockTransferRequests` | High |
| **Batch Tracking & FEFO** | OBTN/OBTQ | (batch info in document payloads) | High |
| **Expiry Alerts** | OBTN/OBTQ | — (read only) | High |
| **Pick Lists** | OPKL/PKL1 | `POST/PATCH PickLists` | High |
| **Delivery Notes** | ODLN/DLN1 | `POST DeliveryNotes` | High |
| **Sales Order Backlog** | ORDR/RDR1 | — (read only) | High |
| **Customer Returns** | ORDN/RDN1 | `POST Returns` | Medium |
| **Purchase Returns** | ORPD/RPD1 | `POST PurchaseReturns` | Medium |
| **Reorder Alerts** | OITW, OITM (MinLevel) | — (read only) | Medium |
| **Slow/Dead Stock** | OITW, OINM | — (read only) | Medium |

---

## 4. App-Only Features (To Build)

These live entirely in our Django models and PostgreSQL. SAP doesn't know about them.

| Feature | Why App-Only | Data Model Location | Priority |
|---------|-------------|-------------------|----------|
| **Bin Locations** | SAP bins not enabled (BinActivat='N') | New Django models | High |
| **Putaway Tasks** | No SAP putaway; our logic assigns bins | New Django models | High |
| **Inventory Counting** | SAP OINC unused; we manage our own counts | New Django models | Medium |
| **Count Variance Tracking** | Compare our count vs SAP OITW.OnHand | Read SAP, store diff in app | Medium |
| **Serial Number Tracking** | SAP serials not configured | New Django models (future) | Low |

**Important:** For app-only features, SAP's OITW stock numbers remain the financial source of truth. Our bin/location tracking adds a layer of physical location detail on top of SAP's warehouse-level totals. If there's a discrepancy, SAP wins for accounting — our app tells you *where in the warehouse* the stock physically is.

---

## 5. SAP Tables Reference

### Warehouse & Items (SAP — already used)

| Table | Purpose | Already Queried |
|-------|---------|----------------|
| **OWHS** | Warehouse master | Yes |
| **OITM** | Item master | Yes |
| **OITW** | Stock per warehouse | Yes |
| **OITB** | Item groups | Yes |
| **OINM** | Movement audit trail | Yes |
| **ITM1** | Item prices | No |

### Batch Numbers (SAP — to add)

| Table | Purpose |
|-------|---------|
| **OBTN** | Batch master (item, batch number, expiry, mfg date, status) |
| **OBTQ** | Batch qty per warehouse |
| **OIBT** | Batch transactions per document line |

### Stock Transfers (SAP — to add)

| Table | Purpose |
|-------|---------|
| **OWTR** | Transfer header (9,675 docs in production) |
| **WTR1** | Transfer lines (item, qty, from-wh, to-wh) |
| **OWTQ** | Transfer request header (1,114 docs) |
| **WTQ1** | Transfer request lines |

### Picking (SAP — to add)

| Table | Purpose |
|-------|---------|
| **OPKL** | Pick list header (3,584 docs, all from Sales Orders) |
| **PKL1** | Pick list lines (item, released qty, picked qty, status) |

### Delivery & Shipping (SAP — to add)

| Table | Purpose |
|-------|---------|
| **ODLN** | Delivery note header (2,717 docs) |
| **DLN1** | Delivery lines |

### Returns (SAP — to add)

| Table | Purpose |
|-------|---------|
| **ORDN** | Customer returns header (1,816 docs) |
| **RDN1** | Customer return lines |
| **ORPD** | Vendor returns header (78 docs) |
| **RPD1** | Vendor return lines |

### Sales Orders (SAP — to add for outbound)

| Table | Purpose |
|-------|---------|
| **ORDR** | Sales order header (2,468 open) |
| **RDR1** | Sales order lines (4.7M open qty) |

### Goods Issue/Receipt (SAP — already used)

| Table | Purpose | Already Used |
|-------|---------|-------------|
| **OIGE/IGE1** | Goods issue (6,526 docs) | Yes — material issue |
| **OIGN/IGN1** | Goods receipt (6,647 docs) | Yes — FG receipt |
| **OPDN/PDN1** | GRPO (9,451 docs) | Yes |

### Production (SAP — already used)

| Table | Purpose | Already Used |
|-------|---------|-------------|
| **OWOR** | Production order header (6,445 docs) | Yes |
| **WOR1** | Production BOM components | Yes |

---

## 6. SAP Service Layer Endpoints

### Already Integrated

| Method | Endpoint | SAP Object | Module |
|--------|----------|-----------|--------|
| POST | `/b1s/v2/Login` | Session | All |
| POST | `/b1s/v2/PurchaseDeliveryNotes` | OPDN | GRPO |
| POST | `/b1s/v2/InventoryGenEntries` | OIGN | FG Receipt |
| POST | `/b1s/v2/InventoryGenExits` | OIGE | Material Issue |
| POST | `/b1s/v2/ProductionOrders` | OWOR | Production |
| POST | `/b1s/v2/Attachments2` | ATC1 | GRPO |
| PATCH | `/b1s/v2/Attachments2({id})` | ATC1 | GRPO |
| PATCH | `/b1s/v2/PurchaseDeliveryNotes({id})` | OPDN | GRPO |

### To Add — Stock Transfers (SAP)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/StockTransfers` | Create transfer (OWTR) |
| GET | `/b1s/v2/StockTransfers` | List transfers |
| GET | `/b1s/v2/StockTransfers({DocEntry})` | Get specific transfer |
| POST | `/b1s/v2/StockTransfers({DocEntry})/Cancel` | Cancel transfer |
| POST | `/b1s/v2/StockTransferRequests` | Create request (OWTQ) |
| GET | `/b1s/v2/StockTransferRequests` | List requests |
| POST | `/b1s/v2/StockTransferRequests({DocEntry})/Close` | Close request |

### To Add — Picking (SAP)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/PickLists` | Create pick list |
| GET | `/b1s/v2/PickLists` | List pick lists |
| GET | `/b1s/v2/PickLists({AbsEntry})` | Get specific pick list |
| PATCH | `/b1s/v2/PickLists({AbsEntry})` | Update picked quantities |
| POST | `/b1s/v2/PickLists({AbsEntry})/Close` | Close pick list |

### To Add — Delivery & Shipping (SAP)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/DeliveryNotes` | Create delivery |
| GET | `/b1s/v2/DeliveryNotes` | List deliveries |
| GET | `/b1s/v2/DeliveryNotes({DocEntry})` | Get delivery detail |
| POST | `/b1s/v2/DeliveryNotes({DocEntry})/Cancel` | Cancel delivery |
| POST | `/b1s/v2/DeliveryNotes({DocEntry})/Close` | Close delivery |

### To Add — Returns (SAP)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/Returns` | Create customer return (ORDN) |
| GET | `/b1s/v2/Returns` | List returns |
| POST | `/b1s/v2/PurchaseReturns` | Return to vendor (ORPD) |
| GET | `/b1s/v2/PurchaseReturns` | List vendor returns |

### To Add — Batch Details (SAP — read only via HANA)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/b1s/v2/BatchNumberDetails` | List batch numbers |
| GET | `/b1s/v2/BatchNumberDetails({DocEntry})` | Batch detail |

### Not Needed (SAP not configured)

| Endpoint | Why Skipped |
|----------|------------|
| `/b1s/v2/BinLocations` | Bins managed in app only |
| `/b1s/v2/InventoryCountings` | Counts managed in app only |
| `/b1s/v2/InventoryPostings` | Count adjustments via Goods Receipt/Issue instead |
| `/b1s/v2/SerialNumberDetails` | Serials managed in app only |

---

## 7. Stock Transfers & Movements (SAP)

The most active SAP operation — 32,144 movement entries in the last 90 days.

### Real Transfer Routes (Production Data, Last 90 Days)

```
INBOUND FLOW:
  BH-PM (Packaging) ──1,222──> BH-BS (Basement Storage)
  BH-LO (Loose Oil) ───358──> BH-PC (Production)
  BH-NM (Non-Moving) ──147──> BH-PC (Production)

PRODUCTION FLOW:
  BH-BS (Basement) ──2,524──> BH-PC (Production Consumption)  <-- HIGHEST VOLUME
  BH-PC ──────────────321──> BH-PP (Production Process)

WASTE FLOW:
  BH-PC ────────────1,595──> BH-WST (Wastage)
  BH-WST ─────────────231──> BH-PP (recyclable, back to production)

FINISHED GOODS FLOW:
  BH-PF (Prod Finished) ──586──> GP-FG (Gupta Godown FG)
  BH-PF ───────────────────365──> BH-EC (E-Commerce)

INTER-BRANCH:
  DL-INT ──175──> DL-PS (Delhi)
  PB-INT ──169──> PB-SP (Punjab)
  DL-PS  ──167──> BH-INT (back to factory)
```

### Warehouse-to-Warehouse Transfer

```json
POST /b1s/v2/StockTransfers
{
    "DocDate": "2026-04-18",
    "Comments": "Transfer RM from basement to production",
    "StockTransferLines": [
        {
            "ItemCode": "RM0000007",
            "Quantity": 5510,
            "FromWarehouseCode": "BH-LO",
            "WarehouseCode": "BH-PC",
            "UnitPrice": 0
        }
    ]
}
```

### Transfer Request (Approval Workflow)

```json
POST /b1s/v2/StockTransferRequests
{
    "DocDate": "2026-04-18",
    "Comments": "Replenishment request for production",
    "StockTransferLines": [
        {
            "ItemCode": "RM0000007",
            "Quantity": 5510,
            "FromWarehouseCode": "BH-LO",
            "WarehouseCode": "BH-PC"
        }
    ]
}
```

Fulfill the request by referencing it:

```json
POST /b1s/v2/StockTransfers
{
    "StockTransferLines": [
        {
            "BaseType": 1250000001,
            "BaseEntry": 1234,
            "BaseLine": 0,
            "ItemCode": "RM0000007",
            "Quantity": 5510,
            "FromWarehouseCode": "BH-LO",
            "WarehouseCode": "BH-PC"
        }
    ]
}
```

### HANA Query — Recent Stock Movements

```sql
SELECT
    T0."ItemCode", T1."ItemName", T0."Warehouse",
    T0."InQty", T0."OutQty", T0."TransType",
    CASE T0."TransType"
        WHEN 13 THEN 'AR Invoice'
        WHEN 15 THEN 'Delivery'
        WHEN 16 THEN 'Return'
        WHEN 20 THEN 'GRPO'
        WHEN 21 THEN 'Goods Return'
        WHEN 59 THEN 'Goods Receipt'
        WHEN 60 THEN 'Goods Issue'
        WHEN 67 THEN 'Stock Transfer'
        WHEN 202 THEN 'Production Order'
        ELSE CAST(T0."TransType" AS VARCHAR)
    END AS movement_type,
    T0."DocDate", T0."CreatedBy"
FROM "{schema}"."OINM" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
WHERE T0."DocDate" >= ADD_DAYS(CURRENT_DATE, -30)
ORDER BY T0."DocDate" DESC
```

---

## 8. Batch Tracking & FEFO (SAP)

572 batch-managed items, 14,819 batch records. Critical for Jivo's food/wellness products.

### Batch Numbers in Documents

When creating GRPO/Stock Transfer/Goods Issue for batch-managed items:

```json
POST /b1s/v2/PurchaseDeliveryNotes
{
    "CardCode": "V001",
    "DocumentLines": [
        {
            "ItemCode": "RM0000025",
            "Quantity": 1000,
            "WarehouseCode": "BH-PC",
            "BatchNumbers": [
                {
                    "BatchNumber": "BATCH-2026-04-001",
                    "Quantity": 1000,
                    "ExpiryDate": "2027-04-17",
                    "ManufacturingDate": "2026-04-10",
                    "AddmisionDate": "2026-04-18"
                }
            ]
        }
    ]
}
```

### FEFO Query (First Expiry First Out)

```sql
SELECT
    T0."ItemCode", T1."ItemName",
    T0."DistNumber" AS batch_number,
    T0."ExpDate", Q."WhsCode", Q."Quantity",
    DAYS_BETWEEN(CURRENT_DATE, T0."ExpDate") AS days_to_expiry,
    CASE
        WHEN DAYS_BETWEEN(CURRENT_DATE, T0."ExpDate") < 0 THEN 'EXPIRED'
        WHEN DAYS_BETWEEN(CURRENT_DATE, T0."ExpDate") < 30 THEN 'CRITICAL'
        WHEN DAYS_BETWEEN(CURRENT_DATE, T0."ExpDate") < 90 THEN 'WARNING'
        ELSE 'OK'
    END AS expiry_status
FROM "{schema}"."OBTN" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
JOIN "{schema}"."OBTQ" Q ON T0."AbsEntry" = Q."MdAbsEntry" AND T0."ItemCode" = Q."ItemCode"
WHERE Q."Quantity" > 0
ORDER BY T0."ExpDate" ASC
```

### Batch Stock by Warehouse

```sql
SELECT
    T0."ItemCode", T1."ItemName",
    T0."DistNumber" AS batch_number,
    T0."ExpDate", T0."MnfDate", T0."Status",
    Q."WhsCode", Q."Quantity"
FROM "{schema}"."OBTN" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
JOIN "{schema}"."OBTQ" Q ON T0."AbsEntry" = Q."MdAbsEntry" AND T0."ItemCode" = Q."ItemCode"
WHERE Q."Quantity" > 0
ORDER BY T0."ExpDate" ASC
```

---

## 9. Picking & Packing (SAP)

3,584 pick lists in production, all sourced from Sales Orders.

### Create Pick List from Sales Order

```json
POST /b1s/v2/PickLists
{
    "Jointable": "RDR1",
    "PickDate": "2026-04-18",
    "PickListsLines": [
        {
            "OrderEntry": 150,
            "OrderRowID": 0,
            "ReleasedQuantity": 100
        }
    ]
}
```

`Jointable` values: `RDR1` = Sales Order, `WTQ1` = Transfer Request

### Confirm Picked Quantities

```json
PATCH /b1s/v2/PickLists(4742)
{
    "PickListsLines": [
        {
            "PickEntry": 4742,
            "OrderEntry": 150,
            "OrderRowID": 0,
            "PickedQuantity": 95,
            "PickStatus": "ps_Picked"
        }
    ]
}
```

### HANA Query — Open Pick Lists

```sql
SELECT
    P."AbsEntry", P."PickDate", P."Name" AS picker_name,
    L."OrderEntry", L."ItemCode", I."ItemName",
    L."ReleasedQty", L."PickedQty", L."PickStatus"
FROM "{schema}"."OPKL" P
JOIN "{schema}"."PKL1" L ON P."AbsEntry" = L."AbsEntry"
JOIN "{schema}"."OITM" I ON L."ItemCode" = I."ItemCode"
WHERE P."Status" = 'N'
ORDER BY P."PickDate" ASC
```

---

## 10. Shipping & Delivery (SAP)

2,717 delivery notes. Open sales orders: 2,468 with 4.7M open qty.

### Open Sales Orders by Warehouse (Production Data)

| Warehouse | Open Orders | Open Qty |
|-----------|------------|----------|
| GP-FG | 1,172 | 2,697,696 |
| BH-FG | 669 | 1,214,622 |
| PB-ST | 329 | 333,544 |
| PB-SP | 317 | 197,585 |
| BH-FU | 200 | 181,663 |

### Create Delivery Note (from Sales Order)

```json
POST /b1s/v2/DeliveryNotes
{
    "CardCode": "C001",
    "DocDate": "2026-04-18",
    "DocumentLines": [
        {
            "ItemCode": "FG0000047",
            "Quantity": 95,
            "WarehouseCode": "GP-FG",
            "BaseType": 17,
            "BaseEntry": 150,
            "BaseLine": 0,
            "BatchNumbers": [
                {
                    "BatchNumber": "L4000019 042617 01",
                    "Quantity": 95
                }
            ]
        }
    ]
}
```

**BaseType values:** `17` = Sales Order, `1250000001` = Transfer Request

### HANA Query — Pending Deliveries

```sql
SELECT
    T0."DocEntry", T0."DocNum", T0."CardCode", T0."CardName",
    T0."DocDate", T0."DocStatus",
    T0."Address" AS ship_to, T0."TrackNo",
    SUM(T1."Quantity") AS total_items
FROM "{schema}"."ODLN" T0
JOIN "{schema}"."DLN1" T1 ON T0."DocEntry" = T1."DocEntry"
WHERE T0."DocStatus" = 'O'
GROUP BY T0."DocEntry", T0."DocNum", T0."CardCode", T0."CardName",
         T0."DocDate", T0."DocStatus", T0."Address", T0."TrackNo"
ORDER BY T0."DocDate" ASC
```

---

## 11. Returns (SAP)

1,816 customer returns + 78 vendor returns in production.

### Customer Return (Goods Back In)

```json
POST /b1s/v2/Returns
{
    "CardCode": "C001",
    "DocDate": "2026-04-18",
    "Comments": "Damaged goods returned",
    "DocumentLines": [
        {
            "ItemCode": "FG0000047",
            "Quantity": 10,
            "WarehouseCode": "BH-GR",
            "BaseType": 15,
            "BaseEntry": 1234,
            "BaseLine": 0
        }
    ]
}
```

**BaseType 15** = Delivery Note (ODLN).

### Vendor Return (Goods Back Out)

```json
POST /b1s/v2/PurchaseReturns
{
    "CardCode": "V001",
    "DocDate": "2026-04-18",
    "Comments": "Defective raw material returned",
    "DocumentLines": [
        {
            "ItemCode": "RM0000025",
            "Quantity": 50,
            "WarehouseCode": "BH-WST",
            "BaseType": 20,
            "BaseEntry": 5678,
            "BaseLine": 0
        }
    ]
}
```

**BaseType 20** = Goods Receipt PO (OPDN).

---

## 12. Bin Location Management (APP)

SAP bins are NOT enabled (0 records, BinActivat='N' everywhere). We build this entirely in our app.

### Django Model Design

Bin locations live in PostgreSQL, not SAP. Structure follows standard warehouse hierarchy:

```
Warehouse (SAP: OWHS.WhsCode)
  └── Zone (app model — e.g., "Aisle A", "Cold Storage")
       └── Bin (app model — e.g., "A01-R03-S02")
            └── Bin Stock (app model — item + qty + batch in this bin)
```

### What This Gives Us

- Physical location tracking within each SAP warehouse
- Operator knows exactly which shelf/rack to go to
- Putaway suggestions (see next section)
- Bin utilization reporting
- Bin-level stock lookups

### Reconciliation with SAP

SAP's `OITW.OnHand` for a warehouse = sum of all our bin quantities for that warehouse. If they drift, SAP is the financial truth — our bins tell you the physical layout.

---

## 13. Putaway Logic (APP)

No SAP integration — entirely our logic.

### Putaway Strategy Options

| Strategy | Logic | When to Use |
|----------|-------|-------------|
| **Default Zone** | Route to preconfigured zone for item group | Default for most items |
| **Same Item Bin** | Place near existing stock of same item | Consolidate similar items |
| **Least Full Bin** | Pick bin with most available capacity | Balance storage utilization |
| **FEFO Aware** | Group bins by expiry range | Batch-managed FG items |
| **Manual Override** | Operator chooses bin | Exceptions, oversized items |

### Trigger Points

| Event | Creates Putaway Task |
|-------|---------------------|
| GRPO posted (GRPO_POSTED notification) | Yes — inbound raw material |
| FG Receipt posted to SAP | Yes — production output |
| Stock transfer received at destination WH | Yes — inter-warehouse movement |
| Return received | Yes — returned goods to inspection area |

---

## 14. Inventory Counting (APP)

SAP has 0 counting records. We manage cycle counts entirely in our app.

### Flow

```
Schedule count (our app — by zone, warehouse, or item group)
  └── Generate count sheet
       ├── Expected qty: read from SAP OITW.OnHand
       └── Expected bin qty: read from our bin stock models
            └── Operator counts (mobile input)
                 └── Compare: counted vs expected
                      ├── Match → mark as counted
                      └── Variance → flag for review
                           └── Approved variance → adjust our bin stock
                                └── If material, post Goods Receipt/Issue to SAP
                                     to align SAP OITW with reality
```

**Key:** Small variances we adjust in our app. Material variances that need SAP alignment use existing `POST InventoryGenEntries` (surplus) or `POST InventoryGenExits` (shortage) — endpoints we already have.

---

## 15. Reporting & Analytics Queries

### Slow-Moving / Dead Stock

```sql
SELECT
    T0."ItemCode", T1."ItemName", T0."WhsCode", T0."OnHand",
    (SELECT MAX(M."DocDate") FROM "{schema}"."OINM" M
     WHERE M."ItemCode" = T0."ItemCode" AND M."Warehouse" = T0."WhsCode") AS last_movement,
    DAYS_BETWEEN(
        (SELECT MAX(M."DocDate") FROM "{schema}"."OINM" M
         WHERE M."ItemCode" = T0."ItemCode" AND M."Warehouse" = T0."WhsCode"),
        CURRENT_DATE
    ) AS days_idle
FROM "{schema}"."OITW" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
WHERE T0."OnHand" > 0
ORDER BY days_idle DESC
```

### Stock Reorder Alerts

```sql
SELECT
    T0."ItemCode", T1."ItemName", T0."WhsCode", W."WhsName",
    T0."OnHand", T0."IsCommited",
    (T0."OnHand" - T0."IsCommited") AS available,
    T1."MinLevel" AS reorder_point, T1."ReorderQty"
FROM "{schema}"."OITW" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
JOIN "{schema}"."OWHS" W ON T0."WhsCode" = W."WhsCode"
WHERE T1."MinLevel" > 0
    AND (T0."OnHand" - T0."IsCommited") <= T1."MinLevel"
ORDER BY (T0."OnHand" - T0."IsCommited") / NULLIF(T1."MinLevel", 0) ASC
```

### Warehouse Utilization (APP — bin level)

This query runs against our PostgreSQL, not SAP:

```sql
-- Against our Django models
SELECT
    b.warehouse_code,
    COUNT(b.id) AS total_bins,
    SUM(CASE WHEN bs.total_qty > 0 THEN 1 ELSE 0 END) AS occupied_bins,
    ROUND(SUM(CASE WHEN bs.total_qty > 0 THEN 1.0 ELSE 0 END) / COUNT(b.id) * 100, 1) AS utilization_pct
FROM wms_bin b
LEFT JOIN (
    SELECT bin_id, SUM(quantity) AS total_qty
    FROM wms_binstock GROUP BY bin_id
) bs ON b.id = bs.bin_id
WHERE b.is_active = true
GROUP BY b.warehouse_code
```

---

## 16. Integration Architecture

### Connection Pattern

| What | Where | Why |
|------|-------|-----|
| Read SAP master data | HANA SQL | Flexible queries, no pagination |
| Read SAP stock/movements | HANA SQL | Complex joins, aggregations |
| Read SAP batches | HANA SQL | FEFO queries, expiry reports |
| Write SAP documents | Service Layer REST | SAP validation, posting rules, journal entries |
| Read/write bin locations | PostgreSQL (Django) | SAP bins not enabled |
| Read/write putaway tasks | PostgreSQL (Django) | App-only workflow |
| Read/write inventory counts | PostgreSQL (Django) | SAP counting not used |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  FactoryFlow (React)                  │
│  Gate | QC | GRPO | Production | Warehouse | WMS     │
└────────────────────────┬────────────────────────────┘
                         │ REST API
┌────────────────────────┴────────────────────────────┐
│              factory_app_v2 (Django)                  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │         WMS Module                              │  │
│  │  SAP-synced:          App-only:                 │  │
│  │  - Transfers          - Bin locations            │  │
│  │  - Picking            - Putaway tasks            │  │
│  │  - Deliveries         - Inventory counts         │  │
│  │  - Returns            - Bin stock tracking       │  │
│  │  - Batch/FEFO         - Serial tracking          │  │
│  └────────┬─────────────────────┬─────────────────┘  │
│           │                     │                     │
│  ┌────────┴────────┐   ┌───────┴──────────┐         │
│  │  sap_client      │   │  PostgreSQL       │         │
│  │  HANA + SL REST  │   │  Django models    │         │
│  └────────┬────────┘   └──────────────────┘         │
└───────────┼─────────────────────────────────────────┘
            │ SQL (30015) + HTTPS (50000)
┌───────────┴─────────────────────────────────────────┐
│                  SAP B1 HANA Server                   │
│  Databases: JIVO_OIL_HANADB                          │
│             JIVO_MART_HANADB                         │
│             JIVO_BEVERAGES_HANADB                    │
└─────────────────────────────────────────────────────┘
```

### Multi-Company Flow

```python
# Existing pattern — every request scoped by company
company_code = request.headers.get('X-Company-Code', 'JIVO_OIL')
config = get_company_config(company_code)
client = SAPClient(config)  # SAP-synced features

# App-only features use company FK on Django models
bins = Bin.objects.filter(company=request.company)
```

---

## Summary: Feature → Integration Type

| Feature | Type | SAP Read | SAP Write | App DB |
|---------|------|----------|-----------|--------|
| Stock Transfers | **SAP** | OWTR/WTR1 | `StockTransfers` | — |
| Transfer Requests | **SAP** | OWTQ/WTQ1 | `StockTransferRequests` | — |
| Batch Tracking | **SAP** | OBTN/OBTQ | (in doc payloads) | — |
| Expiry/FEFO Alerts | **SAP** | OBTN/OBTQ | — | — |
| Pick Lists | **SAP** | OPKL/PKL1 | `PickLists` | — |
| Delivery Notes | **SAP** | ODLN/DLN1 | `DeliveryNotes` | — |
| Sales Order Backlog | **SAP** | ORDR/RDR1 | — | — |
| Customer Returns | **SAP** | ORDN/RDN1 | `Returns` | — |
| Vendor Returns | **SAP** | ORPD/RPD1 | `PurchaseReturns` | — |
| Reorder Alerts | **SAP** | OITW, OITM | — | — |
| Bin Locations | **APP** | — | — | Django models |
| Putaway Tasks | **APP** | — | — | Django models |
| Inventory Counting | **APP** | OITW (expected qty) | GR/GI (variance adjust) | Django models |
| Count Variance | **HYBRID** | OITW (compare) | GR/GI (if material) | Django models |
| Serial Tracking | **APP** | — | — | Django models (future) |
| Bin Utilization | **APP** | — | — | Django models |
