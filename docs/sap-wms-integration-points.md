# SAP B1 WMS Integration Points for FactoryFlow

> **Purpose:** Map every SAP Business One table, Service Layer endpoint, and data structure relevant to building a full WMS for Jivo Wellness.
> **Date:** 2026-04-17
> **SAP Version:** SAP Business One 10.0 (HANA), Service Layer v2
> **Connection:** HANA direct (reads) + Service Layer REST (writes) — existing pattern from factory_app_v2

---

## Table of Contents

1. [Current State — What We Already Have](#1-current-state)
2. [SAP Tables — Complete WMS Reference](#2-sap-tables)
3. [SAP Service Layer Endpoints — Complete WMS Reference](#3-sap-service-layer-endpoints)
4. [Feature → SAP Mapping](#4-feature-to-sap-mapping)
5. [Multi-Warehouse Architecture in SAP B1](#5-multi-warehouse-architecture)
6. [Bin Location Management](#6-bin-location-management)
7. [Batch & Serial Number Tracking](#7-batch--serial-number-tracking)
8. [Stock Transfers & Movements](#8-stock-transfers--movements)
9. [Picking & Packing](#9-picking--packing)
10. [Shipping & Delivery](#10-shipping--delivery)
11. [Inventory Counting & Adjustments](#11-inventory-counting--adjustments)
12. [Putaway Logic](#12-putaway-logic)
13. [Returns & Reverse Logistics](#13-returns--reverse-logistics)
14. [Reporting & Analytics Queries](#14-reporting--analytics-queries)
15. [Integration Architecture](#15-integration-architecture)

---

## 1. Current State

### Already Built in factory_app_v2

| Feature | Backend Module | SAP Objects Used | Status |
|---------|---------------|-----------------|--------|
| **BOM Request Workflow** | warehouse/ | WOR1 (Production BOM) | Done |
| **Material Issue (Goods Issue)** | warehouse/ | `POST /b1s/v2/InventoryGenExits` (OIGE) | Done |
| **Finished Goods Receipt** | warehouse/ | `POST /b1s/v2/InventoryGenEntries` (OIGN) | Done |
| **Stock Queries** | warehouse/ | OITW, OITM | Done |
| **WMS Dashboard & Analytics** | warehouse/views_wms.py | OITW, OITM, OITB, OINM, OWHS, OPDN/PDN1 | Done |
| **Warehouse Master List** | sap_client/ | OWHS | Done |
| **Vendor Master** | sap_client/ | OCRD | Done |
| **Purchase Orders** | sap_client/ | OPOR/POR1 | Done |
| **GRPO (Goods Receipt PO)** | grpo/ | `POST /b1s/v2/PurchaseDeliveryNotes` (OPDN) | Done |
| **Production Orders** | production_execution/ | OWOR/WOR1, `POST /b1s/v2/ProductionOrders` | Done |
| **Stock Movement History** | warehouse/wms_hana_reader.py | OINM | Done |
| **Billing Reconciliation** | warehouse/views_wms.py | OPDN/PDN1, OPCH/PCH1 | Done |

### What We Need to Build

| Feature | Priority | SAP Objects Needed |
|---------|----------|-------------------|
| **Bin Location Management** | High | OBIN, OIBQ, OBBQ |
| **Stock Transfers (Warehouse to Warehouse)** | High | OWTR/WTR1 |
| **Stock Transfer Requests** | High | OWTQ/WTQ1 |
| **Picking** | High | OPKL/PKL1 |
| **Packing** | High | -- (custom or via Delivery) |
| **Putaway** | High | OBIN, OIBQ (bin allocation) |
| **Delivery Notes (Outbound)** | High | ODLN/DLN1 |
| **Inventory Counting** | Medium | OINC/INC1 |
| **Batch/Serial Tracking** | Medium | OBTN/OBTQ, OSRN/OSRI |
| **Returns (Inbound)** | Medium | ORPD/RPD1 |
| **Goods Return (Outbound)** | Medium | ORDN/RDN1 |
| **Inventory Revaluation** | Low | -- |

---

## 2. SAP Tables — Complete WMS Reference

### 2.1 Warehouse Master

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **OWHS** | Warehouses | Warehouse master data | WhsCode, WhsName, Inactive, BPLid, Street, Block, City, State, Country, EnableBinLocations, DefaultBin, ReceivingBinLocationsAbsEntry, DefaultBinAbsEntry |

**Already queried in:** `sap_client/hana/warehouse_reader.py`, `warehouse/services/wms_hana_reader.py`

### 2.2 Bin Locations

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **OBIN** | Bin Locations | Bin location master | AbsEntry, WhsCode, BinCode, Descr, Inactive, SL1Code-SL4Code (sublevel codes), MaxWeight, MaxQty, MinQty, ReceivingBinLocation |
| **OIBQ** | Item-Bin Quantities | Stock per item per bin | BinAbsEntry, ItemCode, WhsCode, OnHandQty, BatchNum, SysNumber |
| **OBBQ** | Batch-Bin Quantities | Batch stock per bin | BinAbsEntry, SnBMDAbs, ItemCode, WhsCode, OnHandQty |

### 2.3 Item Master & Stock

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **OITM** | Items | Item master data | ItemCode, ItemName, ItmsGrpCod, InvntItem, SellItem, PrchseItem, ManBtchNum, ManSerNum, FrgnName, AvgPrice, LastPurPrc, MinLevel, MaxLevel, ReorderQty |
| **OITW** | Item-Warehouse | Stock per warehouse | ItemCode, WhsCode, OnHand, IsCommited, OnOrder, MinStock, MaxStock |
| **OITB** | Item Groups | Item group definitions | ItmsGrpCod, ItmsGrpNam |
| **ITM1** | Item Prices | Price lists per item | ItemCode, PriceList, Price, Currency |

**Already queried in:** `warehouse/services/wms_hana_reader.py`, `stock_dashboard/hana_reader.py`

### 2.4 Batch & Serial Numbers

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **OBTN** | Batch Numbers | Batch master data | AbsEntry, ItemCode, DistNumber (batch number), MnfSerial, ExpDate, MnfDate, InDate, Status |
| **OBTQ** | Batch Quantities | Batch quantities per warehouse | ItemCode, SysNumber, MdAbsEntry, WhsCode, Quantity, CommitQty |
| **OSRN** | Serial Numbers | Serial number master | AbsEntry, ItemCode, DistNumber, MnfSerial, ExpDate, Status |
| **OSRI** | Serial Number Transactions | Serial tracking per document | ItemCode, SysSerial, IntrSerial, WhsCode, Status, BaseType, BaseEntry |
| **OIBT** | Item Batch/Serial Transactions | Batch/serial per document line | ItemCode, BatchNum, WhsCode, BaseType, BaseEntry, BaseLinNum, Quantity, Direction |

### 2.5 Inventory Movements

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **OINM** | Inventory Audit | All stock movements log | ItemCode, Warehouse, DocType, DocEntry, DocLineNum, InQty, OutQty, TransType, CreatedBy, DocDate, CalcPrice |
| **OIGE** | Goods Issue (Header) | Goods issue documents | DocEntry, DocNum, DocDate, DocStatus, CardCode |
| **IGE1** | Goods Issue (Lines) | Goods issue lines | DocEntry, LineNum, ItemCode, Quantity, WhsCode, AcctCode, BatchNum, SerialNum |
| **OIGN** | Goods Receipt (Header) | Goods receipt documents | DocEntry, DocNum, DocDate, DocStatus |
| **IGN1** | Goods Receipt (Lines) | Goods receipt lines | DocEntry, LineNum, ItemCode, Quantity, WhsCode, AcctCode, BatchNum |

**Already used:** `POST /b1s/v2/InventoryGenExits` (OIGE), `POST /b1s/v2/InventoryGenEntries` (OIGN)

### 2.6 Stock Transfers

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **OWTR** | Stock Transfer (Header) | Transfer documents | DocEntry, DocNum, DocDate, FromWarehouse, ToWarehouse, DocStatus |
| **WTR1** | Stock Transfer (Lines) | Transfer lines | DocEntry, LineNum, ItemCode, Quantity, FromWhsCod, WhsCode (to), BatchNum, SerialNum, BinAbsEntry, FromBinAbsEntry |
| **OWTQ** | Stock Transfer Request (Header) | Transfer requests | DocEntry, DocNum, DocDate, DocStatus |
| **WTQ1** | Stock Transfer Request (Lines) | Transfer request lines | DocEntry, LineNum, ItemCode, Quantity, FromWhsCod, WhsCode |

### 2.7 Picking & Packing

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **OPKL** | Pick Lists (Header) | Pick list documents | AbsEntry, PickDate, PickStatus (Y/N), OwnerCode |
| **PKL1** | Pick Lists (Lines) | Pick list lines | AbsEntry, PickEntry, OrderEntry, OrderRowID, ItemCode, ReleasedQty, PickedQty, PickStatus, BinAbsEntry, SerialAndBatchNumbersBaseLine |

### 2.8 Delivery & Shipping

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **ODLN** | Delivery Notes (Header) | Outbound delivery | DocEntry, DocNum, CardCode, CardName, DocDate, DocStatus, ShipToCode, Address, TrackNo |
| **DLN1** | Delivery Notes (Lines) | Delivery lines | DocEntry, LineNum, ItemCode, Quantity, WhsCode, BatchNum, SerialNum, BinAbsEntry, BaseType, BaseEntry |
| **ORDN** | Returns (Header) | Customer returns | DocEntry, DocNum, CardCode, DocDate |
| **RDN1** | Returns (Lines) | Return lines | DocEntry, LineNum, ItemCode, Quantity, WhsCode |

### 2.9 Purchase Related (Inbound)

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **OPOR** | Purchase Orders | PO header | DocEntry, DocNum, CardCode, CardName, DocDate, DocStatus |
| **POR1** | PO Lines | PO detail | DocEntry, LineNum, ItemCode, Quantity, OpenQty, WhsCode, BinAbsEntry |
| **OPDN** | Goods Receipt PO (Header) | GRPO header | DocEntry, DocNum, CardCode, DocDate |
| **PDN1** | Goods Receipt PO (Lines) | GRPO lines | DocEntry, LineNum, ItemCode, Quantity, WhsCode, BinAbsEntry, BatchNum |
| **ORPD** | Return to Vendor (Header) | Goods return | DocEntry, DocNum, CardCode, DocDate |
| **RPD1** | Return to Vendor (Lines) | Return lines | DocEntry, LineNum, ItemCode, Quantity, WhsCode |

### 2.10 Inventory Counting

| Table | Name | Purpose | Key Fields |
|-------|------|---------|------------|
| **OINC** | Inventory Counting (Header) | Count documents | DocEntry, DocNum, CountDate, CounterID, Status |
| **INC1** | Inventory Counting (Lines) | Count lines | DocEntry, LineNum, ItemCode, WhsCode, BinAbsEntry, CountedQty, InWarehouseQty (system qty), Variance, Counted (Y/N) |

### 2.11 Production (Already Integrated)

| Table | Name | Purpose |
|-------|------|---------|
| **OWOR** | Production Orders | Production order headers |
| **WOR1** | Production Order Components | BOM component lines |
| **IGN1** (with BaseType=202) | Production Receipt | Goods receipt linked to production |
| **IGE1** (with BaseType=202) | Production Issue | Goods issue linked to production |

---

## 3. SAP Service Layer Endpoints — Complete WMS Reference

### 3.1 Already Integrated

| Method | Endpoint | SAP Object | Module |
|--------|----------|-----------|--------|
| POST | `/b1s/v2/Login` | Session | All |
| POST | `/b1s/v2/PurchaseDeliveryNotes` | OPDN/PDN1 | GRPO |
| POST | `/b1s/v2/InventoryGenEntries` | OIGN/IGN1 | FG Receipt, Production |
| POST | `/b1s/v2/InventoryGenExits` | OIGE/IGE1 | Material Issue |
| POST | `/b1s/v2/ProductionOrders` | OWOR | Production |
| POST | `/b1s/v2/Attachments2` | ATC1 | GRPO |
| PATCH | `/b1s/v2/Attachments2({id})` | ATC1 | GRPO |
| PATCH | `/b1s/v2/PurchaseDeliveryNotes({id})` | OPDN | GRPO |

### 3.2 New Endpoints Needed for WMS

#### Warehouse Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/b1s/v2/Warehouses` | List all warehouses |
| GET | `/b1s/v2/Warehouses('WH01')` | Get specific warehouse |
| PATCH | `/b1s/v2/Warehouses('WH01')` | Update warehouse properties |
| GET | `/b1s/v2/BinLocations` | List all bin locations |
| GET | `/b1s/v2/BinLocations({AbsEntry})` | Get specific bin |
| POST | `/b1s/v2/BinLocations` | Create new bin location |
| PATCH | `/b1s/v2/BinLocations({AbsEntry})` | Update bin (activate/deactivate) |
| DELETE | `/b1s/v2/BinLocations({AbsEntry})` | Remove bin (if empty) |

#### Stock Transfers
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/StockTransfers` | Create stock transfer (OWTR) |
| GET | `/b1s/v2/StockTransfers` | List stock transfers |
| GET | `/b1s/v2/StockTransfers({DocEntry})` | Get specific transfer |
| PATCH | `/b1s/v2/StockTransfers({DocEntry})` | Update transfer (before posting) |
| POST | `/b1s/v2/StockTransfers({DocEntry})/Cancel` | Cancel transfer |
| POST | `/b1s/v2/StockTransferRequests` | Create transfer request (OWTQ) |
| GET | `/b1s/v2/StockTransferRequests` | List transfer requests |
| GET | `/b1s/v2/StockTransferRequests({DocEntry})` | Get specific request |
| POST | `/b1s/v2/StockTransferRequests({DocEntry})/Close` | Close request |

#### Picking
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/PickLists` | Create pick list (OPKL) |
| GET | `/b1s/v2/PickLists` | List pick lists |
| GET | `/b1s/v2/PickLists({AbsEntry})` | Get specific pick list |
| PATCH | `/b1s/v2/PickLists({AbsEntry})` | Update pick list (picked quantities) |
| POST | `/b1s/v2/PickLists({AbsEntry})/Close` | Close pick list |

#### Delivery Notes (Outbound Shipping)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/DeliveryNotes` | Create delivery (ODLN) |
| GET | `/b1s/v2/DeliveryNotes` | List deliveries |
| GET | `/b1s/v2/DeliveryNotes({DocEntry})` | Get specific delivery |
| PATCH | `/b1s/v2/DeliveryNotes({DocEntry})` | Update delivery |
| POST | `/b1s/v2/DeliveryNotes({DocEntry})/Cancel` | Cancel delivery |
| POST | `/b1s/v2/DeliveryNotes({DocEntry})/Close` | Close delivery |

#### Returns
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/Returns` | Create customer return (ORDN) |
| GET | `/b1s/v2/Returns` | List returns |
| POST | `/b1s/v2/PurchaseReturns` | Return to vendor (ORPD) |
| GET | `/b1s/v2/PurchaseReturns` | List vendor returns |

#### Inventory Counting
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/InventoryCountings` | Create inventory count (OINC) |
| GET | `/b1s/v2/InventoryCountings` | List counts |
| GET | `/b1s/v2/InventoryCountings({DocEntry})` | Get specific count |
| PATCH | `/b1s/v2/InventoryCountings({DocEntry})` | Update counted quantities |
| POST | `/b1s/v2/InventoryCountings({DocEntry})/Close` | Close count |
| POST | `/b1s/v2/InventoryPostings` | Post count discrepancies (auto goods receipt/issue) |

#### Batch & Serial Numbers
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/b1s/v2/BatchNumberDetails` | List batch numbers (OBTN) |
| GET | `/b1s/v2/BatchNumberDetails({DocEntry})` | Get specific batch |
| PATCH | `/b1s/v2/BatchNumberDetails({DocEntry})` | Update batch (expiry, status) |
| GET | `/b1s/v2/SerialNumberDetails` | List serial numbers (OSRN) |
| GET | `/b1s/v2/SerialNumberDetails({DocEntry})` | Get specific serial |

#### Item Master
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/b1s/v2/Items` | List items |
| GET | `/b1s/v2/Items('ITEM01')` | Get specific item |
| GET | `/b1s/v2/ItemGroups` | List item groups |

#### Queries & Cross-Cutting
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/b1s/v2/QueryService_PostQuery` | Execute custom SQL queries via SL |
| GET | `/b1s/v2/$crossjoin(...)` | Cross-join multiple entities |
| GET | Any endpoint + `?$filter=...&$select=...&$orderby=...&$top=...&$skip=...` | OData query parameters |

---

## 4. Feature → SAP Mapping

### 4.1 Inbound (Receiving) — ALREADY BUILT

```
PO in SAP (OPOR/POR1)
  → Gate In (our app records arrival)
    → QC Check (our app records quality)
      → GRPO (POST /b1s/v2/PurchaseDeliveryNotes → OPDN/PDN1)
        → Stock updated in OITW
        → Bin allocation if bins enabled (PDN1.BinAbsEntry)
```

### 4.2 Internal Movements — PARTIALLY BUILT

```
BOM Request (our Django model)
  → Approval (our workflow)
    → Material Issue (POST /b1s/v2/InventoryGenExits → OIGE/IGE1)     ✅ DONE
    → Stock Transfer (POST /b1s/v2/StockTransfers → OWTR/WTR1)         🔨 NEW
    → Bin-to-Bin Transfer (StockTransfer with BinAbsEntry fields)       🔨 NEW
```

### 4.3 Outbound (Picking → Packing → Shipping) — NEW

```
Sales Order in SAP (ORDR/RDR1)
  → Pick List (POST /b1s/v2/PickLists → OPKL/PKL1)
    → Pick confirmation (PATCH picked quantities)
      → Delivery Note (POST /b1s/v2/DeliveryNotes → ODLN/DLN1)
        → Shipment tracking
          → Stock reduced in OITW
```

### 4.4 Putaway — NEW

```
GRPO completed (OPDN) or Production Receipt (OIGN)
  → System suggests bin location (our logic)
    → Operator confirms/overrides bin
      → Stock Transfer to bin (POST /b1s/v2/StockTransfers with BinAbsEntry)
        → OIBQ updated (item-bin stock)
```

### 4.5 Inventory Management — PARTIALLY BUILT

```
Cycle Count Schedule (our app)
  → Generate count sheet (our app queries OITW/OIBQ for expected)
    → Operator counts (mobile app input)
      → Post count (POST /b1s/v2/InventoryCountings → OINC/INC1)
        → Post discrepancy (POST /b1s/v2/InventoryPostings)
          → Auto Goods Receipt or Issue for variance
```

### 4.6 Returns — NEW

```
Customer Return:
  Return received (our app)
    → QC inspection (our app)
      → POST /b1s/v2/Returns → ORDN/RDN1 (stock back in)

Vendor Return:
  Defective goods identified
    → POST /b1s/v2/PurchaseReturns → ORPD/RPD1 (stock out)
```

---

## 5. Multi-Warehouse Architecture in SAP B1

### Jivo Wellness Warehouse Setup

Jivo has a single factory site but multiple warehouses. In SAP B1:

```
OWHS (Warehouses)
├── WH-RM     Raw Material Warehouse
├── WH-PM     Packaging Material Warehouse
├── WH-FG     Finished Goods Warehouse
├── WH-QC     Quality Control / Quarantine
├── WH-REJ    Rejected Material Warehouse
├── WH-PROD   Production Floor (WIP)
└── WH-DISP   Dispatch / Shipping Area
```

### Key HANA Query — All Warehouses with Bin Status

```sql
SELECT 
    W."WhsCode",
    W."WhsName",
    W."Inactive",
    W."BPLid" AS branch_id,
    W."EnableBinLocations",
    W."DefaultBin",
    W."ReceivingBinLocationsAbsEntry",
    (SELECT COUNT(*) FROM "{schema}"."OBIN" B 
     WHERE B."WhsCode" = W."WhsCode" AND B."Disabled" = 'N') AS active_bins,
    (SELECT COALESCE(SUM(IW."OnHand"), 0) FROM "{schema}"."OITW" IW 
     WHERE IW."WhsCode" = W."WhsCode") AS total_stock_qty
FROM "{schema}"."OWHS" W
WHERE W."Inactive" = 'N'
ORDER BY W."WhsCode"
```

### Multi-Warehouse Stock Query

```sql
SELECT 
    T0."ItemCode",
    T1."ItemName",
    T0."WhsCode",
    W."WhsName",
    T0."OnHand",
    T0."IsCommited",
    T0."OnOrder",
    (T0."OnHand" - T0."IsCommited") AS available_qty,
    T0."MinStock",
    T0."MaxStock"
FROM "{schema}"."OITW" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
JOIN "{schema}"."OWHS" W ON T0."WhsCode" = W."WhsCode"
WHERE T0."OnHand" != 0 OR T0."IsCommited" != 0 OR T0."OnOrder" != 0
ORDER BY T0."ItemCode", T0."WhsCode"
```

---

## 6. Bin Location Management

### Bin Location Structure in SAP B1

SAP B1 supports up to **4 sublevel codes** for bin locations, creating a hierarchy:

```
Warehouse → Sublevel 1 (Aisle) → Sublevel 2 (Rack) → Sublevel 3 (Shelf) → Sublevel 4 (Position)

Example: WH-RM-A01-R03-S02-P01
         ├── Warehouse: WH-RM (Raw Material)
         ├── Aisle: A01
         ├── Rack: R03
         ├── Shelf: S02
         └── Position: P01
```

### Key HANA Queries

**List all bins with stock:**
```sql
SELECT 
    B."AbsEntry",
    B."BinCode",
    B."WhsCode",
    B."Descr",
    B."SL1Code", B."SL2Code", B."SL3Code", B."SL4Code",
    B."MaxWeight",
    B."MaxQty",
    B."MinQty",
    B."Disabled",
    B."ReceivingBinLocation",
    COALESCE(SUM(Q."OnHandQty"), 0) AS current_qty
FROM "{schema}"."OBIN" B
LEFT JOIN "{schema}"."OIBQ" Q ON B."AbsEntry" = Q."BinAbsEntry"
WHERE B."WhsCode" = ? AND B."Disabled" = 'N'
GROUP BY B."AbsEntry", B."BinCode", B."WhsCode", B."Descr", 
         B."SL1Code", B."SL2Code", B."SL3Code", B."SL4Code",
         B."MaxWeight", B."MaxQty", B."MinQty", B."Disabled", B."ReceivingBinLocation"
ORDER BY B."BinCode"
```

**Stock in specific bin:**
```sql
SELECT 
    Q."ItemCode",
    I."ItemName",
    Q."OnHandQty",
    Q."BatchNum",
    B."BinCode"
FROM "{schema}"."OIBQ" Q
JOIN "{schema}"."OITM" I ON Q."ItemCode" = I."ItemCode"
JOIN "{schema}"."OBIN" B ON Q."BinAbsEntry" = B."AbsEntry"
WHERE Q."BinAbsEntry" = ? AND Q."OnHandQty" > 0
```

### Service Layer — Create Bin Location

```
POST /b1s/v2/BinLocations
{
    "Warehouse": "WH-RM",
    "Sublevel1": "A01",
    "Sublevel2": "R03",
    "Sublevel3": "S02",
    "Sublevel4": "P01",
    "Description": "Raw Material Aisle A, Rack 3, Shelf 2, Position 1",
    "MaximumWeight": 500.0,
    "MaximumQty": 100.0,
    "MinimumQty": 0.0,
    "ReceivingBinLocation": "tNO"
}
```

### Service Layer — Bin-to-Bin Transfer

```
POST /b1s/v2/StockTransfers
{
    "DocDate": "2026-04-17",
    "StockTransferLines": [
        {
            "ItemCode": "RM-001",
            "Quantity": 50,
            "FromWarehouseCode": "WH-RM",
            "WarehouseCode": "WH-RM",
            "StockTransferLinesBinAllocations": [
                {
                    "BinAbsEntry": 10,
                    "Quantity": 50,
                    "BinActionType": "batFromWarehouse"
                },
                {
                    "BinAbsEntry": 25,
                    "Quantity": 50,
                    "BinActionType": "batToWarehouse"
                }
            ]
        }
    ]
}
```

---

## 7. Batch & Serial Number Tracking

### When to Use

| Tracking | SAP Field (OITM) | Use Case |
|----------|-----------------|----------|
| **Batch** | ManBtchNum = 'Y' | Raw materials, chemicals, food ingredients, bulk items |
| **Serial** | ManSerNum = 'Y' | Equipment, high-value items |
| **None** | Both = 'N' | Generic consumables, packaging |

### Batch Numbers in Documents

When creating a GRPO/Stock Transfer/Goods Issue for a batch-managed item, include batch info:

```
POST /b1s/v2/PurchaseDeliveryNotes
{
    "CardCode": "V001",
    "DocumentLines": [
        {
            "ItemCode": "RM-OIL-001",
            "Quantity": 1000,
            "WarehouseCode": "WH-RM",
            "BatchNumbers": [
                {
                    "BatchNumber": "BATCH-2026-04-001",
                    "Quantity": 1000,
                    "ManufacturerSerialNumber": "MFG-12345",
                    "ExpiryDate": "2027-04-17",
                    "ManufacturingDate": "2026-04-10",
                    "AddmisionDate": "2026-04-17"
                }
            ]
        }
    ]
}
```

### HANA Query — Batch Stock by Warehouse

```sql
SELECT 
    T0."ItemCode",
    T1."ItemName",
    T0."DistNumber" AS batch_number,
    T0."ExpDate" AS expiry_date,
    T0."MnfDate" AS manufacturing_date,
    T0."Status",
    Q."WhsCode",
    Q."Quantity" AS on_hand
FROM "{schema}"."OBTN" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
JOIN "{schema}"."OBTQ" Q ON T0."AbsEntry" = Q."MdAbsEntry" AND T0."ItemCode" = Q."ItemCode"
WHERE Q."Quantity" > 0
ORDER BY T0."ExpDate" ASC
```

### FEFO Query (First Expiry First Out — critical for food/wellness)

```sql
SELECT 
    T0."ItemCode",
    T1."ItemName",
    T0."DistNumber" AS batch_number,
    T0."ExpDate",
    Q."WhsCode",
    Q."Quantity",
    DAYS_BETWEEN(CURRENT_DATE, T0."ExpDate") AS days_to_expiry
FROM "{schema}"."OBTN" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
JOIN "{schema}"."OBTQ" Q ON T0."AbsEntry" = Q."MdAbsEntry" AND T0."ItemCode" = Q."ItemCode"
WHERE Q."Quantity" > 0 AND T0."Status" != 2
ORDER BY T0."ExpDate" ASC
```

---

## 8. Stock Transfers & Movements

### 8.1 Warehouse-to-Warehouse Transfer

```
POST /b1s/v2/StockTransfers
{
    "DocDate": "2026-04-17",
    "Comments": "Transfer RM from main to production floor",
    "StockTransferLines": [
        {
            "ItemCode": "RM-OIL-001",
            "Quantity": 500,
            "FromWarehouseCode": "WH-RM",
            "WarehouseCode": "WH-PROD",
            "UnitPrice": 0
        }
    ]
}
```

### 8.2 Transfer Request (Approval Workflow)

```
POST /b1s/v2/StockTransferRequests
{
    "DocDate": "2026-04-17",
    "Comments": "Replenishment request for production",
    "StockTransferLines": [
        {
            "ItemCode": "RM-OIL-001",
            "Quantity": 500,
            "FromWarehouseCode": "WH-RM",
            "WarehouseCode": "WH-PROD"
        }
    ]
}
```

Then fulfill the request by creating a StockTransfer referencing the request:

```
POST /b1s/v2/StockTransfers
{
    "StockTransferLines": [
        {
            "BaseType": 1250000001,
            "BaseEntry": {transfer_request_doc_entry},
            "BaseLine": 0,
            "ItemCode": "RM-OIL-001",
            "Quantity": 500,
            "FromWarehouseCode": "WH-RM",
            "WarehouseCode": "WH-PROD"
        }
    ]
}
```

### 8.3 HANA Query — Recent Stock Movements

```sql
SELECT 
    T0."ItemCode",
    T1."ItemName",
    T0."Warehouse",
    T0."InQty",
    T0."OutQty",
    T0."TransType",
    CASE T0."TransType"
        WHEN 18 THEN 'AP Invoice'
        WHEN 19 THEN 'AP Credit Memo'
        WHEN 20 THEN 'Goods Receipt PO'
        WHEN 21 THEN 'Goods Return'
        WHEN 59 THEN 'Goods Receipt'
        WHEN 60 THEN 'Goods Issue'
        WHEN 67 THEN 'Stock Transfer'
        WHEN 69 THEN 'WIP Issue (Production)'
        WHEN 202 THEN 'Production Order'
        ELSE CAST(T0."TransType" AS VARCHAR)
    END AS movement_type,
    T0."DocDate",
    T0."CreatedBy",
    T0."DocEntry"
FROM "{schema}"."OINM" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
WHERE T0."DocDate" >= ADD_DAYS(CURRENT_DATE, -30)
ORDER BY T0."DocDate" DESC, T0."CreateDate" DESC
```

---

## 9. Picking & Packing

### 9.1 Create Pick List from Sales/Production Order

```
POST /b1s/v2/PickLists
{
    "Jointable": "RDR1",
    "PickDate": "2026-04-17",
    "PickListsLines": [
        {
            "OrderEntry": 150,
            "OrderRowID": 0,
            "ReleasedQuantity": 100
        }
    ]
}
```

**Note:** `Jointable` determines the source document:
- `RDR1` = Sales Order lines
- `WTQ1` = Stock Transfer Request lines

### 9.2 Update Pick List (Confirm Picked Quantities)

```
PATCH /b1s/v2/PickLists({AbsEntry})
{
    "PickListsLines": [
        {
            "PickEntry": {AbsEntry},
            "OrderEntry": 150,
            "OrderRowID": 0,
            "PickedQuantity": 95,
            "PickStatus": "ps_Picked",
            "PickListsDocumentLines": [
                {
                    "ItemCode": "FG-001",
                    "Quantity": 95,
                    "WarehouseCode": "WH-FG",
                    "BinEntry": 42
                }
            ]
        }
    ]
}
```

### 9.3 HANA Query — Open Pick Lists

```sql
SELECT 
    P."AbsEntry",
    P."PickDate",
    P."Name" AS picker_name,
    L."OrderEntry",
    L."ItemCode",
    I."ItemName",
    L."ReleasedQty",
    L."PickedQty",
    L."PickStatus"
FROM "{schema}"."OPKL" P
JOIN "{schema}"."PKL1" L ON P."AbsEntry" = L."AbsEntry"
JOIN "{schema}"."OITM" I ON L."ItemCode" = I."ItemCode"
WHERE P."Status" = 'N'
ORDER BY P."PickDate" ASC
```

---

## 10. Shipping & Delivery

### 10.1 Create Delivery Note (from Sales Order)

```
POST /b1s/v2/DeliveryNotes
{
    "CardCode": "C001",
    "DocDate": "2026-04-17",
    "Comments": "Delivery for SO#150",
    "DocumentLines": [
        {
            "ItemCode": "FG-001",
            "Quantity": 95,
            "WarehouseCode": "WH-FG",
            "BaseType": 17,
            "BaseEntry": 150,
            "BaseLine": 0,
            "BatchNumbers": [
                {
                    "BatchNumber": "BATCH-2026-FG-001",
                    "Quantity": 95
                }
            ]
        }
    ]
}
```

**BaseType values:**
- `17` = Sales Order (RDR1)
- `1250000001` = Stock Transfer Request
- No base = Standalone delivery

### 10.2 Create Delivery Note (from Pick List)

After picking is complete, the delivery is typically auto-generated or manually created referencing the original Sales Order.

### 10.3 HANA Query — Pending Deliveries

```sql
SELECT 
    T0."DocEntry",
    T0."DocNum",
    T0."CardCode",
    T0."CardName",
    T0."DocDate",
    T0."DocStatus",
    T0."Address" AS ship_to_address,
    T0."TrnspCode" AS shipping_type,
    T0."TrackNo" AS tracking_number,
    SUM(T1."Quantity") AS total_items,
    COUNT(T1."LineNum") AS total_lines
FROM "{schema}"."ODLN" T0
JOIN "{schema}"."DLN1" T1 ON T0."DocEntry" = T1."DocEntry"
WHERE T0."DocStatus" = 'O'
GROUP BY T0."DocEntry", T0."DocNum", T0."CardCode", T0."CardName", 
         T0."DocDate", T0."DocStatus", T0."Address", T0."TrnspCode", T0."TrackNo"
ORDER BY T0."DocDate" ASC
```

---

## 11. Inventory Counting & Adjustments

### 11.1 Create Inventory Count

```
POST /b1s/v2/InventoryCountings
{
    "CountDate": "2026-04-17",
    "CounterID": 5,
    "Remarks": "Monthly cycle count - WH-RM",
    "InventoryCountingLines": [
        {
            "ItemCode": "RM-OIL-001",
            "WarehouseCode": "WH-RM",
            "BinEntry": 10,
            "Counted": "tYES",
            "CountedQuantity": 980
        },
        {
            "ItemCode": "RM-OIL-002",
            "WarehouseCode": "WH-RM",
            "Counted": "tYES",
            "CountedQuantity": 450
        }
    ]
}
```

### 11.2 Post Count Discrepancy (Auto Goods Receipt/Issue)

After counting, SAP can auto-generate inventory adjustments:

```
POST /b1s/v2/InventoryPostings
{
    "CountDate": "2026-04-17",
    "Remarks": "Adjustment from count #123",
    "InventoryPostingLines": [
        {
            "ItemCode": "RM-OIL-001",
            "WarehouseCode": "WH-RM",
            "CountedQuantity": 980
        }
    ]
}
```

SAP compares `CountedQuantity` with system `OnHand` and auto-generates:
- **Goods Receipt** if counted > system (surplus)
- **Goods Issue** if counted < system (shortage)

---

## 12. Putaway Logic

SAP B1 does **not** have a built-in putaway algorithm. We implement this ourselves using bin data from SAP.

### Putaway Strategy Options (Our Logic)

| Strategy | Description | Query |
|----------|-------------|-------|
| **Default Bin** | Use warehouse default receiving bin | `OWHS.ReceivingBinLocationsAbsEntry` |
| **Same Item Bin** | Put near existing stock of same item | Query `OIBQ` for bins already holding the item |
| **Least Full Bin** | Distribute evenly | Query `OBIN` for bins with most remaining capacity |
| **FEFO Aware** | Group by expiry for easy retrieval | Assign bins by expiry date range |
| **Zone-Based** | Assign by item group/category | Map `OITB.ItmsGrpCod` to bin sublevel codes |

### HANA Query — Suggested Bin (Same Item Strategy)

```sql
SELECT 
    B."AbsEntry" AS bin_abs_entry,
    B."BinCode",
    B."MaxQty",
    COALESCE(SUM(Q."OnHandQty"), 0) AS current_qty,
    (B."MaxQty" - COALESCE(SUM(Q."OnHandQty"), 0)) AS available_capacity
FROM "{schema}"."OBIN" B
LEFT JOIN "{schema}"."OIBQ" Q ON B."AbsEntry" = Q."BinAbsEntry"
WHERE B."WhsCode" = ?
    AND B."Disabled" = 'N'
    AND B."AbsEntry" IN (
        SELECT DISTINCT "BinAbsEntry" FROM "{schema}"."OIBQ" 
        WHERE "ItemCode" = ? AND "OnHandQty" > 0
    )
GROUP BY B."AbsEntry", B."BinCode", B."MaxQty"
HAVING (B."MaxQty" - COALESCE(SUM(Q."OnHandQty"), 0)) > 0
ORDER BY available_capacity DESC
```

---

## 13. Returns & Reverse Logistics

### 13.1 Customer Return (Goods Back In)

```
POST /b1s/v2/Returns
{
    "CardCode": "C001",
    "DocDate": "2026-04-17",
    "Comments": "Damaged goods returned",
    "DocumentLines": [
        {
            "ItemCode": "FG-001",
            "Quantity": 10,
            "WarehouseCode": "WH-QC",
            "BaseType": 15,
            "BaseEntry": {delivery_doc_entry},
            "BaseLine": 0
        }
    ]
}
```
**BaseType 15** = Delivery Note (ODLN). Returns go to QC warehouse for inspection.

### 13.2 Vendor Return (Goods Back Out)

```
POST /b1s/v2/PurchaseReturns
{
    "CardCode": "V001",
    "DocDate": "2026-04-17",
    "Comments": "Defective raw material returned",
    "DocumentLines": [
        {
            "ItemCode": "RM-OIL-001",
            "Quantity": 50,
            "WarehouseCode": "WH-REJ",
            "BaseType": 20,
            "BaseEntry": {grpo_doc_entry},
            "BaseLine": 0
        }
    ]
}
```
**BaseType 20** = Goods Receipt PO (OPDN).

---

## 14. Reporting & Analytics Queries

### 14.1 Warehouse Utilization (Bin-level)

```sql
SELECT 
    B."WhsCode",
    W."WhsName",
    COUNT(B."AbsEntry") AS total_bins,
    SUM(CASE WHEN Q."occupied" > 0 THEN 1 ELSE 0 END) AS occupied_bins,
    ROUND(SUM(CASE WHEN Q."occupied" > 0 THEN 1.0 ELSE 0 END) / COUNT(B."AbsEntry") * 100, 1) AS utilization_pct
FROM "{schema}"."OBIN" B
JOIN "{schema}"."OWHS" W ON B."WhsCode" = W."WhsCode"
LEFT JOIN (
    SELECT "BinAbsEntry", SUM("OnHandQty") AS "occupied" 
    FROM "{schema}"."OIBQ" GROUP BY "BinAbsEntry"
) Q ON B."AbsEntry" = Q."BinAbsEntry"
WHERE B."Disabled" = 'N'
GROUP BY B."WhsCode", W."WhsName"
```

### 14.2 Slow-Moving / Dead Stock

```sql
SELECT 
    T0."ItemCode",
    T1."ItemName",
    T0."WhsCode",
    T0."OnHand",
    (SELECT MAX(M."DocDate") FROM "{schema}"."OINM" M 
     WHERE M."ItemCode" = T0."ItemCode" AND M."Warehouse" = T0."WhsCode") AS last_movement_date,
    DAYS_BETWEEN(
        (SELECT MAX(M."DocDate") FROM "{schema}"."OINM" M 
         WHERE M."ItemCode" = T0."ItemCode" AND M."Warehouse" = T0."WhsCode"),
        CURRENT_DATE
    ) AS days_since_last_movement
FROM "{schema}"."OITW" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
WHERE T0."OnHand" > 0
ORDER BY days_since_last_movement DESC
```

### 14.3 Expiry Alert (for Jivo Wellness — food/health products)

```sql
SELECT 
    T0."ItemCode",
    T1."ItemName",
    T0."DistNumber" AS batch_number,
    T0."ExpDate",
    Q."WhsCode",
    Q."Quantity",
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

### 14.4 Stock Reorder Alerts

```sql
SELECT 
    T0."ItemCode",
    T1."ItemName",
    T0."WhsCode",
    W."WhsName",
    T0."OnHand",
    T0."IsCommited" AS committed,
    T0."OnOrder",
    (T0."OnHand" - T0."IsCommited") AS available,
    T1."MinLevel" AS reorder_point,
    T1."ReorderQty",
    T1."MaxLevel" AS max_level
FROM "{schema}"."OITW" T0
JOIN "{schema}"."OITM" T1 ON T0."ItemCode" = T1."ItemCode"
JOIN "{schema}"."OWHS" W ON T0."WhsCode" = W."WhsCode"
WHERE T1."MinLevel" > 0 
    AND (T0."OnHand" - T0."IsCommited") <= T1."MinLevel"
ORDER BY (T0."OnHand" - T0."IsCommited") / NULLIF(T1."MinLevel", 0) ASC
```

---

## 15. Integration Architecture

### Existing Pattern (factory_app_v2)

```
┌─────────────────────────────────────────────────────┐
│                  FactoryFlow (React)                  │
│  Gate │ QC │ GRPO │ Production │ Warehouse │ WMS     │
└────────────────────────┬────────────────────────────┘
                         │ REST API
┌────────────────────────┴────────────────────────────┐
│              factory_app_v2 (Django)                  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │            sap_client module                   │   │
│  │  ┌─────────────┐    ┌──────────────────────┐  │   │
│  │  │ HANA Reader │    │ Service Layer Writer  │  │   │
│  │  │ (hdbcli)    │    │ (requests/REST)       │  │   │
│  │  └──────┬──────┘    └──────────┬───────────┘  │   │
│  └─────────┼──────────────────────┼──────────────┘   │
└────────────┼──────────────────────┼──────────────────┘
             │ SQL (port 30015)     │ HTTPS (port 50000)
┌────────────┴──────────────────────┴──────────────────┐
│                  SAP B1 HANA Server                   │
│        103.89.45.192                                  │
│  ┌──────────────┐  ┌───────────────────────────────┐ │
│  │  HANA DB      │  │  Service Layer v2             │ │
│  │  (Read)       │  │  /b1s/v2/* (Read/Write)       │ │
│  └──────────────┘  └───────────────────────────────┘ │
│                                                       │
│  Databases: JIVO_OIL_HANADB                          │
│             TEST_MART_15122025                        │
│             TEST_BEVERAGES_15122025                   │
└───────────────────────────────────────────────────────┘
```

### Connection Pattern Per Operation

| Operation Type | Connection | Why |
|---------------|-----------|-----|
| **Read master data** (items, warehouses, vendors) | HANA SQL | Faster, more flexible queries, no pagination limits |
| **Read stock/inventory** (OITW, OIBQ, OINM) | HANA SQL | Complex joins, aggregations, analytics |
| **Read batch/serial** (OBTN, OBTQ) | HANA SQL | FEFO queries, expiry reports |
| **Write documents** (GRPO, GI, GR, transfers) | Service Layer REST | SAP business logic validation, posting rules, auto-journal entries |
| **Create master data** (bins) | Service Layer REST | SAP validation and numbering |

### Multi-Company Flow

```python
# Existing pattern — each request carries company context
company_code = request.headers.get('X-Company-Code', 'JIVO_OIL')
config = get_company_config(company_code)
client = SAPClient(config)
```

All WMS features must follow this pattern — every HANA query uses the company's schema, every Service Layer call logs in with the company's database.

---

## Summary: SAP Endpoints to Implement

### Phase 1 — Core WMS (High Priority)
| Feature | HANA Tables (Read) | Service Layer (Write) |
|---------|-------------------|----------------------|
| Multi-Warehouse Dashboard | OWHS, OITW, OITM, OINM | — |
| Bin Location Management | OBIN, OIBQ | `BinLocations` |
| Stock Transfers | OWTR, WTR1 | `StockTransfers` |
| Transfer Requests | OWTQ, WTQ1 | `StockTransferRequests` |
| Putaway (bin allocation) | OBIN, OIBQ, OITW | `StockTransfers` (with bin allocations) |
| Batch Tracking & FEFO | OBTN, OBTQ | (in document payloads) |
| Expiry Alerts | OBTN, OBTQ | — |

### Phase 2 — Outbound (High Priority)
| Feature | HANA Tables (Read) | Service Layer (Write) |
|---------|-------------------|----------------------|
| Pick Lists | OPKL, PKL1 | `PickLists` |
| Delivery Notes | ODLN, DLN1 | `DeliveryNotes` |
| Shipping Tracking | ODLN (TrackNo) | `DeliveryNotes` (PATCH) |

### Phase 3 — Inventory Control (Medium Priority)
| Feature | HANA Tables (Read) | Service Layer (Write) |
|---------|-------------------|----------------------|
| Inventory Counting | OINC, INC1 | `InventoryCountings` |
| Count Posting | — | `InventoryPostings` |
| Stock Reorder Alerts | OITW, OITM | — |
| Dead/Slow Stock Report | OITW, OINM | — |

### Phase 4 — Returns & Advanced (Lower Priority)
| Feature | HANA Tables (Read) | Service Layer (Write) |
|---------|-------------------|----------------------|
| Customer Returns | ORDN, RDN1 | `Returns` |
| Vendor Returns | ORPD, RPD1 | `PurchaseReturns` |
| Serial Number Tracking | OSRN, OSRI | (in document payloads) |
