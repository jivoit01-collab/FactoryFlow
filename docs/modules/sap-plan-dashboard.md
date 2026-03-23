# SAP Plan Dashboard — Full Design & Implementation Document

## Overview

The SAP Plan Dashboard provides a real-time view of all **planned production orders** from SAP B1, their exploded BOM components, current inventory levels, and calculated purchase requirements. It answers the question: **"For everything we plan to produce, what do we have and what do we need to buy?"**

---

## 1. Business Requirements

| # | Requirement |
|---|-------------|
| 1 | Show all **Planned / Released Production Orders** from SAP B1 |
| 2 | For each order, show the **Finished Good (SKU)** and its **BOM components** |
| 3 | Show the **in-stock quantity** of every BOM component (per warehouse or total) |
| 4 | Show the **already-committed / issued** quantity for each component |
| 5 | Calculate the **net required quantity** across all open production orders |
| 6 | Calculate the **shortfall** = Required − Available (net of committed) |
| 7 | Indicate **what to purchase** and the suggested purchase quantity |
| 8 | Support filtering by Date Range, SKU, Status, Warehouse |

---

## 2. SAP B1 Data Model

### 2.1 Tables Used

#### `OWOR` — Production Orders (Work Orders)

Primary table for all production orders.

| Column | Type | Description |
|--------|------|-------------|
| `DocEntry` | INT | Internal unique key (PK) |
| `DocNum` | INT | User-visible document number |
| `ItemCode` | VARCHAR(50) | Finished Good / SKU item code |
| `ItemName` | VARCHAR(100) | Finished Good name |
| `PlannedQty` | DECIMAL | Total planned production quantity |
| `CmpltQty` | DECIMAL | Already completed quantity |
| `RjctQty` | DECIMAL | Rejected quantity |
| `Status` | CHAR(1) | `P`=Planned, `R`=Released, `L`=Closed, `C`=Cancelled |
| `DueDate` | DATE | Target completion date |
| `PostDate` | DATE | Document posting date |
| `Warehouse` | VARCHAR(8) | Default warehouse for the order |
| `Priority` | TINYINT | Order priority |
| `Comments` | VARCHAR(254) | Free-text remarks |
| `Project` | VARCHAR(20) | Project code (if used) |

**Filter for dashboard:** `Status IN ('P', 'R')` — Planned and Released only.

---

#### `WOR1` — Production Order Component Lines

BOM components as expanded in each production order.

| Column | Type | Description |
|--------|------|-------------|
| `DocEntry` | INT | FK → `OWOR.DocEntry` |
| `LineNum` | INT | Line sequence number |
| `ItemCode` | VARCHAR(50) | Component item code |
| `ItemName` | VARCHAR(100) | Component item name |
| `PlannedQty` | DECIMAL | Total planned qty of this component for the order |
| `IssuedQty` | DECIMAL | Qty already issued to production floor |
| `Warehouse` | VARCHAR(8) | Source warehouse for this component |
| `BaseQty` | DECIMAL | Qty per unit of parent (from BOM) |
| `UoM` | VARCHAR(20) | Unit of measure |
| `ItemType` | CHAR(1) | `I`=Item, `4`=Resource |

**Key calculation:**
```
Remaining Required Qty = PlannedQty - IssuedQty
```

---

#### `OITM` — Item Master Data

Stock levels and item attributes.

| Column | Type | Description |
|--------|------|-------------|
| `ItemCode` | VARCHAR(50) | Item code (PK) |
| `ItemName` | VARCHAR(100) | Item description |
| `OnHand` | DECIMAL | Total on-hand quantity (all warehouses) |
| `IsCommited` | DECIMAL | Committed to existing orders (all WH) |
| `OnOrder` | DECIMAL | On purchase order (incoming) |
| `InvntItem` | CHAR(1) | `Y`=Inventory tracked item |
| `ItemType` | CHAR(1) | `I`=Item, `S`=Service, `R`=Resource |
| `BuyUnitMsr` | VARCHAR(20) | Purchase unit of measure |
| `SalUnitMsr` | VARCHAR(20) | Sales unit of measure |
| `InvntUoM` | VARCHAR(20) | Inventory UoM |
| `MinLevel` | DECIMAL | Minimum stock level (reorder point) |
| `MaxLevel` | DECIMAL | Maximum stock level |
| `LeadTime` | INT | Vendor lead time (days) |
| `CardCode` | VARCHAR(15) | Default vendor code |

**Available stock formula:**
```
Net Available = OnHand - IsCommited
```

---

#### `OITW` — Item Warehouse Stock

Per-warehouse stock breakdown.

| Column | Type | Description |
|--------|------|-------------|
| `ItemCode` | VARCHAR(50) | Item code (FK → OITM) |
| `WhsCode` | VARCHAR(8) | Warehouse code |
| `OnHand` | DECIMAL | On-hand in this warehouse |
| `IsCommited` | DECIMAL | Committed from this warehouse |
| `OnOrder` | DECIMAL | On order for this warehouse |
| `MinLevel` | DECIMAL | Min level for this warehouse |
| `MaxLevel` | DECIMAL | Max level for this warehouse |

Use this table when users want **per-warehouse** availability breakdown.

---

#### `OITT` — BOM Header

Defines which items have a Bill of Materials.

| Column | Type | Description |
|--------|------|-------------|
| `Code` | VARCHAR(50) | Parent item code (FK → OITM) |
| `Name` | VARCHAR(100) | BOM name / description |
| `Type` | CHAR(1) | `P`=Production, `S`=Sales, `T`=Template |

---

#### `ITT1` — BOM Component Lines

The static BOM definition (independent of production orders).

| Column | Type | Description |
|--------|------|-------------|
| `Code` | VARCHAR(50) | Parent item code (FK → OITT) |
| `ItemCode` | VARCHAR(50) | Component item code |
| `Quantity` | DECIMAL | Quantity per parent unit |
| `Warehouse` | VARCHAR(8) | Default source warehouse |
| `UoM` | VARCHAR(20) | Unit of measure |
| `IssueMethod` | CHAR(1) | `M`=Manual, `B`=Backflush |
| `Comment` | VARCHAR(254) | Line comment |

> **Note:** `WOR1` is the *live* BOM explosion (actual production order lines). `ITT1` is the *master* BOM. Use `WOR1` for actuals, `ITT1` for theoretical planning.

---

#### `OCRD` — Business Partners (for vendor info)

| Column | Type | Description |
|--------|------|-------------|
| `CardCode` | VARCHAR(15) | Vendor/BP code |
| `CardName` | VARCHAR(100) | Vendor name |
| `CardType` | CHAR(1) | `S`=Supplier |

---

### 2.2 Entity Relationship Diagram

```
OWOR (Production Orders)
  │  DocEntry, ItemCode, PlannedQty, Status, DueDate
  │
  ├──< WOR1 (Order Components)
  │      DocEntry → OWOR.DocEntry
  │      ItemCode → OITM.ItemCode
  │      PlannedQty, IssuedQty
  │
  └── OITM (Finished Good / SKU)
        ItemCode
        OnHand, IsCommited, OnOrder
        └──< OITW (per-warehouse stock)

OITT (BOM Header)
  Code → OITM.ItemCode
  └──< ITT1 (BOM Lines)
         ItemCode → OITM.ItemCode
```

---

## 3. SAP B1 Service Layer API

The backend (Django) calls SAP B1 Service Layer REST API. All calls are authenticated with a session cookie obtained via `POST /Login`.

**Base URL:** `https://{SAP_B1_SERVER}:50000/b1s/v1`

---

### 3.1 Authentication

```http
POST /b1s/v1/Login
Content-Type: application/json

{
  "CompanyDB": "COMPANY_DB_NAME",
  "UserName": "manager",
  "Password": "password"
}
```

Response sets a `B1SESSION` cookie. Pass it in all subsequent requests.

---

### 3.2 Endpoint: Get All Planned/Released Production Orders

```http
GET /b1s/v1/ProductionOrders
  ?$filter=ProductionOrderStatus eq 'boposPlanned' or ProductionOrderStatus eq 'boposReleased'
  &$select=AbsoluteEntry,DocumentNumber,ItemNo,ProductDescription,PlannedQuantity,CompletedQuantity,RejectedQuantity,ProductionOrderStatus,DueDate,PostingDate,Warehouse,Priority
  &$orderby=DueDate asc
  &$top=200
```

**Service Layer Status enum values:**
| Enum Value | Meaning |
|---|---|
| `boposPlanned` | Planned (P) |
| `boposReleased` | Released (R) |
| `boposClosed` | Closed (L) |
| `boposCancelled` | Cancelled (C) |

**Response shape:**
```json
{
  "value": [
    {
      "AbsoluteEntry": 1234,
      "DocumentNumber": 56,
      "ItemNo": "FG-001",
      "ProductDescription": "Protein Bar 30g",
      "PlannedQuantity": 500,
      "CompletedQuantity": 0,
      "RejectedQuantity": 0,
      "ProductionOrderStatus": "boposPlanned",
      "DueDate": "2026-03-20T00:00:00Z",
      "PostingDate": "2026-03-13T00:00:00Z",
      "Warehouse": "WH-01",
      "Priority": 2
    }
  ]
}
```

---

### 3.3 Endpoint: Get Production Order with Component Lines

```http
GET /b1s/v1/ProductionOrders({AbsoluteEntry})
  ?$expand=ProductionOrderLines
  &$select=AbsoluteEntry,DocumentNumber,ItemNo,ProductDescription,PlannedQuantity,ProductionOrderStatus,DueDate,ProductionOrderLines
```

**`ProductionOrderLines` fields:**
```json
{
  "ProductionOrderLines": [
    {
      "LineNumber": 0,
      "ItemNo": "RM-042",
      "ItemDescription": "Oat Flour",
      "PlannedQuantity": 125.0,
      "IssuedQuantity": 0.0,
      "Warehouse": "RM-WH",
      "UoM": "KG",
      "BaseQuantity": 0.25
    }
  ]
}
```

---

### 3.4 Endpoint: Get All Planned Orders with Lines (Batch)

To avoid N+1 calls, use OData `$expand` with filtering:

```http
GET /b1s/v1/ProductionOrders
  ?$filter=ProductionOrderStatus eq 'boposPlanned' or ProductionOrderStatus eq 'boposReleased'
  &$expand=ProductionOrderLines($select=LineNumber,ItemNo,ItemDescription,PlannedQuantity,IssuedQuantity,Warehouse,UoM,BaseQuantity)
  &$select=AbsoluteEntry,DocumentNumber,ItemNo,ProductDescription,PlannedQuantity,CompletedQuantity,ProductionOrderStatus,DueDate,Warehouse
  &$top=200
```

> **Tip:** SAP B1 Service Layer default page size is 20. Use `$top` and `$skip` for pagination, or set `odata-maxpagesize` in the `Prefer` header.

---

### 3.5 Endpoint: Get Item Stock Levels

For a batch of item codes, use `$filter` with `in` operator (SL v10+) or multiple `or` conditions:

```http
GET /b1s/v1/Items
  ?$filter=ItemCode eq 'RM-042' or ItemCode eq 'RM-043' or ItemCode eq 'PKG-001'
  &$select=ItemCode,ItemName,QuantityOnStock,CommittedQuantity,OrderedQuantity,MinInventory,MaxInventory,LeadTime,DefaultVendor,PurchaseUnit
```

**For large batches**, prefer a Direct SQL query (see Section 3.7).

**Response shape:**
```json
{
  "value": [
    {
      "ItemCode": "RM-042",
      "ItemName": "Oat Flour",
      "QuantityOnStock": 300.0,
      "CommittedQuantity": 80.0,
      "OrderedQuantity": 200.0,
      "MinInventory": 50.0,
      "LeadTime": 7,
      "DefaultVendor": "V-001",
      "PurchaseUnit": "KG"
    }
  ]
}
```

**Field mapping to OITM:**
| Service Layer | OITM Column | Meaning |
|---|---|---|
| `QuantityOnStock` | `OnHand` | Total on hand |
| `CommittedQuantity` | `IsCommited` | Committed/reserved |
| `OrderedQuantity` | `OnOrder` | On incoming PO |
| `DefaultVendor` | `CardCode` | Default vendor |

---

### 3.6 Endpoint: Per-Warehouse Stock

```http
GET /b1s/v1/ItemWarehouseInfoCollection
  ?$filter=ItemCode eq 'RM-042'
  &$select=ItemCode,WarehouseCode,InStock,Committed,Ordered
```

Or use the SQLQuery approach for bulk queries (see below).

---

### 3.7 Direct SQL Query via Service Layer (Recommended for Bulk)

For the dashboard's main data fetch, a single SQL query is far more efficient than multiple REST calls. SAP B1 Service Layer supports custom SQL queries:

```http
POST /b1s/v1/SQLQueries('dashboard_plan_query')/List
Content-Type: application/json

{}
```

Or use an ad-hoc cross join query:

```http
POST /b1s/v1/QueryService_GetList
Content-Type: application/json

{
  "SqlText": "SELECT ... FROM OWOR ... "
}
```

> **Preferred approach in the backend:** Use the `QueryService` endpoint or a pre-registered `SQLQueries` object. This allows fetching all data in 1–2 round trips.

---

#### SQL Query 1 — Production Order BOM Requirements

Returns all component requirements from open production orders.

```sql
SELECT
    -- Production Order
    T0.DocEntry         AS ProdOrderEntry,
    T0.DocNum           AS ProdOrderNum,
    T0.ItemCode         AS SKUCode,
    T0.ItemName         AS SKUName,
    T0.PlannedQty       AS SKUPlannedQty,
    T0.CmpltQty         AS SKUCompletedQty,
    T0.Status           AS ProdOrderStatus,
    T0.DueDate          AS DueDate,
    T0.PostDate         AS PostDate,
    T0.Warehouse        AS ProdWarehouse,
    T0.Priority         AS Priority,

    -- BOM Component Line
    T1.LineNum          AS ComponentLine,
    T1.ItemCode         AS ComponentCode,
    T1.ItemName         AS ComponentName,
    T1.PlannedQty       AS ComponentPlannedQty,
    T1.IssuedQty        AS ComponentIssuedQty,
    (T1.PlannedQty - T1.IssuedQty) AS ComponentRemainingQty,
    T1.Warehouse        AS ComponentWarehouse,
    T1.BaseQty          AS BaseQty,
    T1.UomCode          AS UoM,

    -- Component Stock
    T2.OnHand           AS StockOnHand,
    T2.IsCommited       AS StockCommitted,
    T2.OnOrder          AS StockOnOrder,
    (T2.OnHand - T2.IsCommited) AS NetAvailable,
    T2.LeadTime         AS VendorLeadTime,
    T2.CardCode         AS DefaultVendor

FROM OWOR T0
INNER JOIN WOR1 T1 ON T0.DocEntry = T1.DocEntry
LEFT JOIN  OITM T2 ON T1.ItemCode  = T2.ItemCode

WHERE
    T0.Status IN ('P', 'R')          -- Planned and Released only
    AND T1.ItemType = 'I'            -- Items only (exclude resources)
    AND T2.InvntItem = 'Y'           -- Inventory-tracked items only

ORDER BY
    T0.DueDate ASC,
    T0.DocNum ASC,
    T1.LineNum ASC
```

---

#### SQL Query 2 — Aggregated Purchase Requirements (Summary View)

Aggregates across all open production orders to show consolidated shortfall per component.

```sql
SELECT
    T1.ItemCode                         AS ComponentCode,
    T2.ItemName                         AS ComponentName,
    T2.InvntUoM                         AS UoM,
    SUM(T1.PlannedQty - T1.IssuedQty)  AS TotalRequiredQty,
    MAX(T2.OnHand)                      AS StockOnHand,
    MAX(T2.IsCommited)                  AS StockCommitted,
    MAX(T2.OnOrder)                     AS StockOnOrder,
    (MAX(T2.OnHand) - MAX(T2.IsCommited)) AS NetAvailable,
    CASE
        WHEN (MAX(T2.OnHand) - MAX(T2.IsCommited)) >=
             SUM(T1.PlannedQty - T1.IssuedQty)
        THEN 0
        ELSE SUM(T1.PlannedQty - T1.IssuedQty)
             - (MAX(T2.OnHand) - MAX(T2.IsCommited))
    END                                 AS ShortfallQty,
    MAX(T2.CardCode)                    AS DefaultVendor,
    MAX(T3.CardName)                    AS VendorName,
    MAX(T2.LeadTime)                    AS LeadTimeDays,
    STRING_AGG(CAST(T0.DocNum AS VARCHAR), ', ')
                                        AS RelatedProdOrders

FROM OWOR T0
INNER JOIN WOR1 T1  ON T0.DocEntry = T1.DocEntry
LEFT JOIN  OITM T2  ON T1.ItemCode = T2.ItemCode
LEFT JOIN  OCRD T3  ON T2.CardCode = T3.CardCode
                    AND T3.CardType = 'S'

WHERE
    T0.Status IN ('P', 'R')
    AND T1.ItemType = 'I'
    AND T2.InvntItem = 'Y'
    AND (T1.PlannedQty - T1.IssuedQty) > 0   -- Only lines with remaining work

GROUP BY
    T1.ItemCode,
    T2.ItemName,
    T2.InvntUoM

ORDER BY
    ShortfallQty DESC,          -- Worst shortfalls first
    TotalRequiredQty DESC
```

---

#### SQL Query 3 — SKU Summary (Top-Level View)

One row per planned SKU with its overall status.

```sql
SELECT
    T0.DocEntry                 AS ProdOrderEntry,
    T0.DocNum                   AS ProdOrderNum,
    T0.ItemCode                 AS SKUCode,
    T0.ItemName                 AS SKUName,
    T0.PlannedQty               AS PlannedQty,
    T0.CmpltQty                 AS CompletedQty,
    T0.Status                   AS Status,
    T0.DueDate                  AS DueDate,
    T0.Priority                 AS Priority,
    T0.Warehouse                AS Warehouse,
    COUNT(T1.LineNum)           AS TotalComponents,
    SUM(CASE
        WHEN (T2.OnHand - T2.IsCommited) <
             (T1.PlannedQty - T1.IssuedQty)
        THEN 1 ELSE 0
    END)                        AS ComponentsWithShortfall,
    SUM(T1.PlannedQty - T1.IssuedQty) AS TotalRemainingComponentQty

FROM OWOR T0
INNER JOIN WOR1 T1 ON T0.DocEntry = T1.DocEntry
LEFT JOIN  OITM T2 ON T1.ItemCode = T2.ItemCode

WHERE
    T0.Status IN ('P', 'R')
    AND T1.ItemType = 'I'
    AND T2.InvntItem = 'Y'

GROUP BY
    T0.DocEntry, T0.DocNum, T0.ItemCode, T0.ItemName,
    T0.PlannedQty, T0.CmpltQty, T0.Status,
    T0.DueDate, T0.Priority, T0.Warehouse

ORDER BY
    T0.DueDate ASC
```

---

## 4. Backend API Design (Django)

The frontend calls the Django backend which handles SAP B1 authentication and data aggregation.

### 4.1 Proposed Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/v1/sap/plan-dashboard/summary/` | SKU-level summary of all open production orders |
| `GET` | `/api/v1/sap/plan-dashboard/details/` | Full BOM explosion with stock levels |
| `GET` | `/api/v1/sap/plan-dashboard/procurement/` | Aggregated shortfall / purchase requirements |
| `GET` | `/api/v1/sap/plan-dashboard/sku/{doc_entry}/` | Single production order detail with all components |

### 4.2 Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `planned\|released\|all` | Filter by production order status (default: `all`) |
| `due_date_from` | `YYYY-MM-DD` | Filter orders due after this date |
| `due_date_to` | `YYYY-MM-DD` | Filter orders due before this date |
| `warehouse` | `string` | Filter by warehouse code |
| `sku` | `string` | Filter by SKU item code |
| `show_shortfall_only` | `bool` | Return only components with shortfall |

---

### 4.3 Response Schemas

#### `/summary/` Response

```json
{
  "data": [
    {
      "prod_order_entry": 1234,
      "prod_order_num": 56,
      "sku_code": "FG-001",
      "sku_name": "Protein Bar 30g",
      "planned_qty": 500,
      "completed_qty": 0,
      "status": "planned",
      "due_date": "2026-03-20",
      "priority": 2,
      "warehouse": "WH-01",
      "total_components": 8,
      "components_with_shortfall": 3
    }
  ],
  "meta": {
    "total_orders": 12,
    "orders_with_shortfall": 5,
    "fetched_at": "2026-03-13T10:30:00Z"
  }
}
```

#### `/procurement/` Response

```json
{
  "data": [
    {
      "component_code": "RM-042",
      "component_name": "Oat Flour",
      "uom": "KG",
      "total_required_qty": 625.0,
      "stock_on_hand": 300.0,
      "stock_committed": 80.0,
      "stock_on_order": 200.0,
      "net_available": 220.0,
      "shortfall_qty": 405.0,
      "suggested_purchase_qty": 405.0,
      "default_vendor": "V-001",
      "vendor_name": "Agro Supplies Ltd",
      "lead_time_days": 7,
      "related_prod_orders": ["PO-56", "PO-57", "PO-60"]
    }
  ],
  "meta": {
    "total_components": 45,
    "components_with_shortfall": 12,
    "fetched_at": "2026-03-13T10:30:00Z"
  }
}
```

---

## 5. Frontend Dashboard Architecture

### 5.1 Module Location

```
src/modules/sap-plan-dashboard/
├── api/
│   ├── sap-plan-dashboard.api.ts
│   ├── sap-plan-dashboard.queries.ts
│   └── index.ts
├── components/
│   ├── PlanDashboardHeader.tsx
│   ├── PlanDashboardFilters.tsx
│   ├── SKUSummaryTable.tsx
│   ├── SKUDetailDrawer.tsx
│   ├── BOMComponentTable.tsx
│   ├── StockBadge.tsx
│   ├── ShortfallBadge.tsx
│   ├── ProcurementTable.tsx
│   └── index.ts
├── constants/
│   ├── status.constants.ts
│   └── index.ts
├── pages/
│   ├── PlanDashboardPage.tsx
│   └── index.ts
├── types/
│   ├── sap-plan-dashboard.types.ts
│   └── index.ts
└── index.ts
```

### 5.2 Pages & Views

#### Main Page — `PlanDashboardPage`

Layout:
```
┌─────────────────────────────────────────────────────────┐
│  SAP Plan Dashboard                    [Filters] [Refresh]│
├───────────────────┬─────────────────────────────────────┤
│ SUMMARY CARDS     │                                     │
│ Total Orders: 12  │  Total SKUs: 8                      │
│ Orders w/ Shortfall: 5 │  Components to Buy: 12         │
├───────────────────┴─────────────────────────────────────┤
│ TABS: [SKU View] [Procurement View]                     │
├─────────────────────────────────────────────────────────┤
│ SKU VIEW:                                               │
│ ┌────────────┬──────────┬────────┬──────┬─────────────┐ │
│ │ Order #    │ SKU      │ Qty    │ Due  │ Components  │ │
│ ├────────────┼──────────┼────────┼──────┼─────────────┤ │
│ │ PO-56      │ FG-001   │ 500    │ 3/20 │ 8 (3 short) │ │
│ │            │ [Expand] │        │      │             │ │
│ │  ↳ RM-042 Oat Flour  125kg  | OnHand: 300 | Need: 0 │ │
│ │  ↳ RM-043 Whey Pro   50kg   | OnHand: 20  | Need: 30│ │
│ └────────────┴──────────┴────────┴──────┴─────────────┘ │
├─────────────────────────────────────────────────────────┤
│ PROCUREMENT VIEW:                                       │
│ ┌──────────┬──────────┬─────────┬──────────┬──────────┐ │
│ │ Item     │ Required │ On Hand │ Shortfall│ Vendor   │ │
│ ├──────────┼──────────┼─────────┼──────────┼──────────┤ │
│ │ RM-043   │ 250 KG   │ 20 KG   │ 230 KG   │ Vendor X │ │
│ └──────────┴──────────┴─────────┴──────────┴──────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Key Components

#### `StockBadge`
Visual indicator for stock health:
- **Green**: Net Available ≥ Required (Sufficient)
- **Amber**: Net Available > 0 but < Required (Partial)
- **Red**: Net Available ≤ 0 (Out of Stock / Shortfall)

#### `BOMComponentTable`
Expandable row showing:
- Component Code & Name
- Planned Qty | Issued Qty | Remaining Qty
- On Hand | Committed | Net Available
- Shortfall (highlighted in red if > 0)
- UoM

#### `ProcurementTable`
Aggregated view for purchasing team:
- Sortable by Shortfall Qty
- Export to CSV/Excel
- Suggested Purchase Qty = Shortfall + Safety Buffer (configurable)

---

## 6. Calculation Reference

| Field | Formula |
|-------|---------|
| Remaining Required | `WOR1.PlannedQty − WOR1.IssuedQty` |
| Net Available Stock | `OITM.OnHand − OITM.IsCommited` |
| Shortfall | `MAX(0, Remaining Required − Net Available)` |
| Suggested Purchase | `Shortfall + Safety Buffer` |
| Total Required (across orders) | `SUM(Remaining Required)` per ItemCode |
| Consolidated Shortfall | `MAX(0, Total Required − Net Available)` |

> **Safety Buffer:** Configurable per item via `OITM.MaxLevel` or a fixed percentage (e.g., 10%).

---

## 7. Data Flow

```
User Opens Dashboard
        │
        ▼
Frontend (React Query)
  GET /api/v1/sap/plan-dashboard/summary/
  GET /api/v1/sap/plan-dashboard/procurement/
        │
        ▼
Django Backend
  1. Check SAP B1 session cache (or login)
  2. Execute SQL Query 1 (BOM Requirements) via QueryService
  3. Execute SQL Query 2 (Aggregated Procurement) via QueryService
  4. Transform & serialize response
        │
        ▼
SAP B1 Service Layer
  POST /b1s/v1/QueryService_GetList
  (Returns raw rows)
        │
        ▼
Django Backend
  Aggregate, calculate shortfalls, format
        │
        ▼
Frontend
  Render SKU table, BOM rows, procurement table
  Color-code by shortfall severity
```

---

## 8. Implementation Phases

### Phase 1 — Backend (Django)
- [ ] SAP B1 Service Layer client (session management, retry)
- [ ] `QueryService` integration for custom SQL
- [ ] `/sap/plan-dashboard/summary/` endpoint
- [ ] `/sap/plan-dashboard/procurement/` endpoint
- [ ] `/sap/plan-dashboard/details/` endpoint
- [ ] Caching layer (Redis, 5-minute TTL for SAP data)
- [ ] Unit tests for calculation logic

### Phase 2 — Frontend Module Scaffold
- [ ] Module directory structure
- [ ] TypeScript types
- [ ] API client functions
- [ ] React Query hooks

### Phase 3 — UI Components
- [ ] `SKUSummaryTable` with expandable BOM rows
- [ ] `ProcurementTable` with sort/filter
- [ ] `StockBadge` and `ShortfallBadge`
- [ ] `PlanDashboardFilters` (date range, status, warehouse, SKU)
- [ ] Summary stat cards

### Phase 4 — Integration & Polish
- [ ] Export to CSV/Excel
- [ ] Print-friendly view for procurement team
- [ ] Real-time refresh (configurable interval)
- [ ] Permission guard (`sap_plan_dashboard.view`)

---

## 9. Permissions

| Permission String | Description |
|---|---|
| `sap_plan_dashboard.view` | View the dashboard |
| `sap_plan_dashboard.export` | Export procurement list |

---

## 10. Open Questions / Decisions Needed

1. **Warehouse scope**: Should stock availability consider all warehouses combined (`OITM.OnHand`) or only the component's designated warehouse (`OITW`)?
2. **Safety buffer**: Fixed percentage (e.g., +10%) or use `OITM.MaxLevel`?
3. **Sub-components**: Should BOM explosion be single-level only (direct components of SKU) or multi-level (components of components)?
4. **Caching TTL**: How frequently should SAP data refresh? (Suggested: 5 minutes for dashboard, on-demand for details)
5. **Purchase Order creation**: Should the dashboard have a "Create PO" action that posts a draft PO back to SAP B1?
6. **Access control**: Is this dashboard visible to all roles or restricted to procurement/planning teams?
