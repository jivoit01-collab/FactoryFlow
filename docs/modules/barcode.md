# Barcode Module — Requirements & Design

> Full-fledged barcode system for FactoryFlow. Built in parallel with WMS.
> Every WMS operation (counting, transfers, picking, putaway) depends on this being accurate.
> Date: 2026-04-18

---

## Why This Exists

Without barcoding, every WMS operation is manual data entry — prone to typos, wrong items, wrong quantities. Counting is the most critical: if you can't trust what's scanned, you can't trust the count. This module is the **reliability layer** underneath the entire WMS.

---

## 1. Barcode Hierarchy

Jivo's physical packaging follows this hierarchy:

```
Item (SAP: OITM.ItemCode)
  └── Batch (SAP: OBTN.DistNumber — e.g., "L1001732 042617 01")
       └── Pallet (our app — collection of boxes, labeled with pallet barcode)
            └── Box/Carton (our app — individual unit, labeled with box barcode)
```

### What Gets a Barcode

| Entity | Barcode Type | When Generated | Who Generates | Contains |
|--------|-------------|---------------|---------------|----------|
| **Box/Carton** | 1D Barcode or QR | During production (inline) | Barcode operator | Item code, batch, box sequence, mfg date, expiry |
| **Pallet** | 1D Barcode or QR | When pallet is assembled (production floor) | Barcode operator | Pallet ID, item code, batch, box count, total qty |
| **Bin Location** | 1D Barcode (fixed) | When bin is created in app | Admin/warehouse setup | Warehouse code, zone, bin code |
| **Warehouse** | 1D Barcode (fixed) | One-time setup | Admin | Warehouse code |

### Barcode Format Options

| Format | Use Case | Pros | Cons |
|--------|----------|------|------|
| **Code 128** | Box/pallet/bin labels | Universal, compact, all scanners support | Limited data capacity |
| **QR Code** | Box/pallet labels | More data (batch, expiry, qty), smartphone scannable | Slightly larger print area |
| **GS1-128 (EAN-128)** | Industry standard for logistics | Structured data (GTIN, batch, expiry), supply chain compatible | More complex to generate |
| **Interleaved 2 of 5** | Simple numeric sequences | Very compact | Numeric only |

**Recommendation:** QR Code for boxes and pallets (encodes item + batch + expiry + qty in one scan), Code 128 for bin/warehouse labels (simple location scan).

---

## 2. Core Features

### 2.1 Label Generation & Printing

#### Box Label
Generated inline during production. One label per carton.

**Data encoded:**
```
{
  "type": "BOX",
  "item_code": "FG0000047",
  "batch": "L4000019 042617 01",
  "box_seq": 1,
  "qty": 20,
  "uom": "PCS",
  "mfg_date": "2026-04-17",
  "exp_date": "2028-04-16",
  "line": "L4",
  "run_id": 1234
}
```

**Printed label layout:**
```
┌────────────────────────────────────┐
│  JIVO WELLNESS                     │
│  MUSTARD PAKKI GHANI 1L 20 PCS    │
│  Item: FG0000047                   │
│  Batch: L4000019 042617 01         │
│  Qty: 20 PCS                       │
│  MFG: 17-04-2026  EXP: 16-04-2028 │
│                                    │
│  ┌──────────────┐                  │
│  │  [QR CODE]   │   Box: 0001     │
│  │              │   Line: L4       │
│  └──────────────┘                  │
└────────────────────────────────────┘
```

#### Pallet Label
Generated when boxes are stacked onto a pallet.

**Data encoded:**
```
{
  "type": "PALLET",
  "pallet_id": "PLT-20260417-L4-001",
  "item_code": "FG0000047",
  "batch": "L4000019 042617 01",
  "box_count": 50,
  "total_qty": 1000,
  "uom": "PCS",
  "mfg_date": "2026-04-17",
  "exp_date": "2028-04-16",
  "line": "L4"
}
```

**Printed label layout (larger, visible from distance):**
```
┌──────────────────────────────────────────┐
│  ████████  PALLET  ████████              │
│  MUSTARD PAKKI GHANI 1L 20 PCS          │
│  Item: FG0000047                         │
│  Batch: L4000019 042617 01               │
│  Boxes: 50 | Total: 1,000 PCS           │
│  MFG: 17-04-2026  EXP: 16-04-2028       │
│                                          │
│  ┌──────────────────┐                    │
│  │                  │                    │
│  │    [QR CODE]     │  PLT-20260417-     │
│  │                  │  L4-001            │
│  │                  │                    │
│  └──────────────────┘                    │
└──────────────────────────────────────────┘
```

#### Bin Location Label (Fixed)
Printed once, attached to physical bin/shelf/rack.

```
┌──────────────────────┐
│  BH-PC / A01-R03-S02 │
│  ┌────────────┐      │
│  │ [BARCODE]  │      │
│  └────────────┘      │
│  Bhakharpur Prod     │
│  Aisle A, Rack 3     │
└──────────────────────┘
```

### 2.2 Reprinting

Labels get damaged, fall off, or are illegible. Reprinting must be:
- **Audited** — who reprinted, when, why
- **Same data** — reprint with identical barcode, not a new one
- **Searchable** — find the original label by box sequence, pallet ID, item code, batch, or date range

| Reprint Trigger | Flow |
|----------------|------|
| Damaged label | Operator searches by pallet/box ID → selects → reprints → system logs reprint |
| Label fell off (unknown box) | Operator scans a sibling box on same pallet → system shows pallet contents → identifies missing label → reprints |
| Wrong data printed | Supervisor voids old label → creates corrected label → system tracks correction |

### 2.3 Pallet Operations

#### Create Pallet
```
Operator on production floor:
  1. Scan item barcode (or select item + batch)
  2. System generates pallet ID (auto-incrementing per line per day)
  3. Scan/enter box count
  4. Print pallet label
  5. Pallet registered in system with: item, batch, box count, qty, line, timestamp
```

#### Move Pallet
Transfer a pallet from one warehouse/location to another.
```
Operator:
  1. Scan pallet barcode
  2. System shows pallet details (item, batch, qty, current location)
  3. Scan destination warehouse/bin barcode (or select from list)
  4. Confirm move
  5. System updates pallet location
  6. If SAP-synced: creates stock transfer in SAP (OWTR)
```

#### Pallet Transfer (Between Godowns)
Same as move but specifically for the production → godown flow:
```
BH-PF (Production Finished)
  ├──► GP-FG (Gupta Godown) — General Transport
  ├──► BH-EC (Basement) — E-Commerce
  └──► BH-FG (Finished Basement) — Other
```

The transfer team scans pallets at source, scans at destination. System creates SAP stock transfer.

#### Clear Pallet
Remove all items from a pallet (pallet is now empty and can be reused).
```
Operator:
  1. Scan pallet barcode
  2. System shows current contents
  3. Confirm clear — all boxes disassociated from pallet
  4. Pallet status → CLEARED
  5. Boxes retain their individual barcodes (they're just not on this pallet anymore)
```

#### Split Pallet
Break a pallet into two (e.g., half goes to GP-FG, half to BH-EC).
```
Operator:
  1. Scan pallet barcode
  2. Select boxes to split off (by count or specific boxes)
  3. System creates new pallet with split boxes
  4. Print new pallet label
  5. Original pallet qty updated
```

### 2.4 Box Operations

#### Box Transfer
Move individual boxes between locations (not full pallet).
```
Operator:
  1. Scan box barcode(s) — can scan multiple
  2. Scan destination warehouse/bin
  3. Confirm transfer
  4. If boxes were on a pallet, pallet qty auto-decremented
```

#### Box Lookup
Scan any box → see full history:
- Item, batch, qty, mfg/exp dates
- Production run and line it came from
- Which pallet it's on (or unpalletized)
- Current warehouse/bin location
- All movements (when, from, to, by whom)

### 2.5 Scanning Operations (How Barcode Feeds Other Modules)

| WMS Operation | Scan Workflow | Barcode Role |
|--------------|---------------|-------------|
| **Receiving (GRPO)** | Scan item at gate → qty confirmed → GRPO posted | Verify item code matches PO line |
| **Putaway** | Scan item/pallet → scan destination bin → placed | Confirms item + location pairing |
| **Stock Transfer** | Scan pallet at source → scan at destination → transfer logged | Proves physical movement happened |
| **Picking** | Scan item from pick list → scan picked qty → confirm | Validates right item picked |
| **Counting** | Scan every item/box in a zone → system tallies → compare to expected | **Core accuracy mechanism** — scan, don't type |
| **Shipping** | Scan items/pallets loaded onto truck → delivery note confirmed | Validates what was actually shipped |
| **Returns** | Scan returned item → system looks up original delivery → return logged | Traceability |

### 2.6 Counting (Barcode-Driven)

This is the most barcode-dependent operation. The flow:

```
Cycle Count Scheduled (by warehouse, zone, or item group)
  │
  ├── Generate count sheet (expected items + qty from SAP OITW + our bin stock)
  │
  ├── Operator starts count on mobile device
  │   │
  │   ├── SCAN each box/pallet in the zone
  │   │   ├── System auto-identifies: item, batch, qty
  │   │   ├── Running total displayed
  │   │   └── Duplicate scan detection (same box scanned twice → warning)
  │   │
  │   ├── Unscanned items → flagged as "expected but not found"
  │   ├── Unexpected scans → flagged as "found but not expected"
  │   │
  │   └── Submit count
  │
  ├── Count Review
  │   ├── Perfect match → auto-approve
  │   ├── Variance within tolerance → auto-approve, log variance
  │   └── Material variance → manager review required
  │       ├── Approve → adjust bin stock, optionally post GR/GI to SAP
  │       └── Recount → send back to operator
  │
  └── Audit Trail: who counted, when, what was scanned, variances
```

**Why scanning matters for counting:**
- Typing "FG0000047" vs "FG0000074" → one digit transposition, wrong item counted
- Scanning a QR code → guaranteed correct item + batch + qty
- Duplicate detection → impossible with manual entry
- Speed → scan 50 boxes in 2 minutes vs typing 50 entries

---

## 3. Data Models (Django — App-Only)

All barcode data lives in our PostgreSQL, not SAP.

### Core Models

```
Pallet
  - id (UUID)
  - pallet_id (string, unique — e.g., "PLT-20260417-L4-001")
  - barcode_data (JSON — encoded in the QR)
  - item_code (string — SAP item code)
  - item_name (string)
  - batch_number (string — SAP batch)
  - box_count (int)
  - total_qty (decimal)
  - uom (string)
  - mfg_date, exp_date (date)
  - production_run (FK → ProductionRun, nullable)
  - production_line (string)
  - current_warehouse (string — SAP warehouse code)
  - current_bin (FK → Bin, nullable)
  - status: ACTIVE | CLEARED | SPLIT | VOID
  - created_by, created_at
  - company (FK)

Box
  - id (UUID)
  - box_barcode (string, unique — e.g., "BOX-20260417-L4-0001")
  - barcode_data (JSON)
  - item_code, item_name, batch_number
  - qty (decimal), uom
  - mfg_date, exp_date
  - pallet (FK → Pallet, nullable — null if unpalletized)
  - production_run (FK → ProductionRun, nullable)
  - production_line (string)
  - current_warehouse (string)
  - current_bin (FK → Bin, nullable)
  - status: ACTIVE | VOID
  - created_by, created_at
  - company (FK)

LabelPrintLog
  - id
  - label_type: BOX | PALLET | BIN | WAREHOUSE
  - reference_id (UUID — points to Box.id, Pallet.id, or Bin.id)
  - reference_code (string — the barcode string)
  - print_type: ORIGINAL | REPRINT
  - reprint_reason (string, nullable)
  - printed_by (FK → User)
  - printed_at (datetime)
  - printer_name (string, nullable)
  - company (FK)

PalletMovement
  - id
  - pallet (FK → Pallet)
  - movement_type: CREATE | MOVE | TRANSFER | CLEAR | SPLIT | VOID
  - from_warehouse (string, nullable)
  - to_warehouse (string, nullable)
  - from_bin (FK → Bin, nullable)
  - to_bin (FK → Bin, nullable)
  - sap_transfer_doc_entry (int, nullable — if stock transfer posted)
  - quantity (decimal)
  - performed_by (FK → User)
  - performed_at (datetime)
  - notes (string, nullable)
  - company (FK)

BoxMovement
  - id
  - box (FK → Box)
  - movement_type: CREATE | MOVE | TRANSFER | PALLETIZE | DEPALLETIZE | VOID
  - from_warehouse, to_warehouse (string, nullable)
  - from_bin, to_bin (FK → Bin, nullable)
  - from_pallet, to_pallet (FK → Pallet, nullable)
  - performed_by (FK → User)
  - performed_at (datetime)
  - company (FK)

ScanLog
  - id
  - scan_type: RECEIVE | PUTAWAY | PICK | COUNT | TRANSFER | SHIP | RETURN | LOOKUP
  - barcode_raw (string — what was actually scanned)
  - barcode_parsed (JSON — decoded data)
  - entity_type: BOX | PALLET | BIN | ITEM | UNKNOWN
  - entity_id (UUID, nullable)
  - scan_result: SUCCESS | NOT_FOUND | DUPLICATE | ERROR
  - context_ref_type (string, nullable — e.g., "count_session", "pick_list", "transfer")
  - context_ref_id (int, nullable)
  - scanned_by (FK → User)
  - scanned_at (datetime)
  - device_info (string, nullable)
  - company (FK)
```

---

## 4. Integration with Other Modules

### 4.1 Production → Barcode (Inline Labeling)

```
Production Module                    Barcode Module
─────────────────                    ──────────────

ProductionRun started
  └── Barcode operator pre-prepares labels
      (receives plan via group chat today → will be in-app)
      │
      ├── Generate box labels (batch of N)
      │   └── Box records created in DB
      │   └── Labels queued for printer
      │
      ├── As boxes come off line:
      │   └── Label applied to each box (inline)
      │
      └── When pallet full:
          └── Generate pallet label
          └── Pallet record created, linked to box records
          └── Pallet label printed and applied
```

**Key field:** `ProductionRun.id` → `Box.production_run`, `Pallet.production_run`

### 4.2 Barcode → WMS (Every Operation)

```
Barcode scans feed into every WMS workflow:

  RECEIVING:    Scan item → verify against PO → GRPO
  PUTAWAY:      Scan pallet → scan bin → location assigned
  TRANSFER:     Scan pallet at source → scan at destination → SAP transfer
  PICKING:      Scan items against pick list → validate
  COUNTING:     Scan all items in zone → compare to expected
  SHIPPING:     Scan items onto truck → delivery note
```

### 4.3 Barcode → QC

```
QC needs to trace back to production:
  Scan box → see batch, production run, line
  Scan pallet → see all boxes, batch, run
  
If QC rejects a batch:
  → All pallets/boxes with that batch flagged
  → WMS quarantine triggered
```

### 4.4 Barcode → Dashboards

New dashboard views powered by barcode data:
- **Pallet tracker:** Where is every pallet right now
- **Production labeling rate:** Labels printed vs production output
- **Movement heatmap:** Which routes (warehouse pairs) have most pallet traffic
- **Pallet age:** How long pallets have been sitting in a location
- **Reprint frequency:** Flag items/lines with high reprint rates (packaging quality issue?)

---

## 5. Hardware & Printing

### Printer Options

| Printer Type | Use Case | Protocol |
|-------------|----------|----------|
| **Zebra thermal printer** | Box/pallet labels on production floor | ZPL (Zebra Programming Language) over TCP/USB |
| **Brother label printer** | Bin/location labels | ESC/P or Brother SDK |
| **Any network printer** | Backup / office printing | PDF via browser print |

### Scanner Options

| Device | Use Case |
|--------|----------|
| **Handheld barcode scanner (Zebra/Honeywell)** | Production floor inline scanning, warehouse ops |
| **Mobile phone camera** | Backup scanning, QC lookups, counting |
| **Tablet + built-in camera** | Counting operations, dashboard on warehouse floor |

### Printing Architecture

```
FactoryFlow App (browser/mobile)
  │
  ├── Generate label data (JSON)
  │
  ├── Option A: Browser Print (PDF)
  │   └── Generate PDF with barcode image → browser print dialog → any printer
  │
  ├── Option B: Direct Print (ZPL)
  │   └── Backend generates ZPL commands → sends to Zebra printer over network
  │       └── Fastest, no dialog, production-floor friendly
  │
  └── Option C: Print Server
      └── Backend queues print jobs → print server routes to correct printer
          └── Supports multiple printers, floor-specific routing
```

**Recommendation:** Start with Option A (PDF/browser print) for simplicity. Add Option B (ZPL direct) for production floor printers where speed matters.

---

## 6. API Endpoints

### Box & Pallet Management
```
POST   /api/v1/barcode/boxes/generate/          — Bulk generate box labels for a production run
GET    /api/v1/barcode/boxes/                    — List boxes (filterable by item, batch, pallet, warehouse, date)
GET    /api/v1/barcode/boxes/{id}/               — Box detail + full movement history
POST   /api/v1/barcode/boxes/{id}/void/          — Void a box (damaged, lost)

POST   /api/v1/barcode/pallets/create/           — Create pallet (link boxes)
GET    /api/v1/barcode/pallets/                   — List pallets (filterable)
GET    /api/v1/barcode/pallets/{id}/              — Pallet detail + boxes + movements
POST   /api/v1/barcode/pallets/{id}/move/         — Move pallet to new warehouse/bin
POST   /api/v1/barcode/pallets/{id}/clear/        — Clear pallet (disassociate boxes)
POST   /api/v1/barcode/pallets/{id}/split/        — Split pallet into two
POST   /api/v1/barcode/pallets/{id}/void/         — Void pallet
POST   /api/v1/barcode/pallets/{id}/add-boxes/    — Add boxes to existing pallet
POST   /api/v1/barcode/pallets/{id}/remove-boxes/  — Remove specific boxes from pallet
```

### Printing & Reprinting
```
POST   /api/v1/barcode/print/box/{id}/           — Print/reprint box label
POST   /api/v1/barcode/print/pallet/{id}/        — Print/reprint pallet label
POST   /api/v1/barcode/print/bin/{id}/           — Print bin location label
POST   /api/v1/barcode/print/bulk/               — Bulk print (list of IDs + type)
GET    /api/v1/barcode/print/history/             — Print/reprint audit log
```

### Scanning
```
POST   /api/v1/barcode/scan/                     — Process a scan (decode barcode, log, return entity details)
POST   /api/v1/barcode/scan/batch/               — Process multiple scans (for counting sessions)
GET    /api/v1/barcode/scan/history/              — Scan audit log
```

### Box/Pallet Transfers
```
POST   /api/v1/barcode/transfers/pallet/         — Transfer pallet(s) between warehouses
POST   /api/v1/barcode/transfers/box/            — Transfer box(es) between warehouses/pallets
GET    /api/v1/barcode/transfers/                 — Transfer history
```

### Lookup
```
GET    /api/v1/barcode/lookup/{barcode_string}/  — Scan any barcode → get full details regardless of type
```

---

## 7. Frontend Pages

```
/barcode
  ├── /barcode/dashboard              — Overview: today's labels, active pallets, recent scans
  ├── /barcode/generate               — Generate box/pallet labels (select run, item, batch, qty)
  ├── /barcode/pallets                — Pallet list (search, filter by warehouse/item/batch/status)
  │   └── /barcode/pallets/{id}       — Pallet detail (boxes, location, movement history)
  ├── /barcode/boxes                  — Box list (search, filter)
  │   └── /barcode/boxes/{id}         — Box detail (pallet, location, history)
  ├── /barcode/move                   — Move pallet/boxes (scan source → scan destination)
  ├── /barcode/transfer               — Godown transfer (bulk pallet transfer between warehouses)
  ├── /barcode/clear                  — Clear pallet (scan pallet → confirm clear)
  ├── /barcode/split                  — Split pallet (scan pallet → select boxes → new pallet)
  ├── /barcode/reprint                — Reprint labels (search → select → reprint with reason)
  ├── /barcode/scan                   — General scan/lookup (scan anything → see details)
  └── /barcode/print-history          — Print/reprint audit log
```

---

## 8. Parallel Build with WMS

Barcode and WMS are built simultaneously. Here's the dependency map:

```
WEEK 1-2: Foundation (no dependencies)
  ├── BARCODE: Django models, box/pallet CRUD, label generation (PDF)
  └── WMS: Django bin models, warehouse zone setup

WEEK 3-4: Core Operations
  ├── BARCODE: Pallet create/move/clear, scan endpoint, print endpoint
  └── WMS: Stock transfer integration (reads SAP OWTR), transfer request flow

WEEK 5-6: Integration
  ├── BARCODE + WMS: Putaway (scan pallet → scan bin → assigned)
  ├── BARCODE + WMS: Transfer (scan pallet → scan destination → SAP transfer posted)
  └── BARCODE + PRODUCTION: Inline labeling from production run

WEEK 7-8: Counting & Picking
  ├── BARCODE + WMS: Counting (scan-based inventory count)
  ├── BARCODE + WMS: Picking (scan items against pick list)
  └── WMS: Pick list integration with SAP OPKL

WEEK 9+: Outbound & Reports
  ├── BARCODE + WMS: Shipping (scan pallets onto truck → delivery note)
  ├── BARCODE: Reprint management, void flows, audit reports
  └── DASHBOARDS: Pallet tracker, movement heatmap, reprint frequency
```

### What Blocks What

| Feature | Blocked By |
|---------|-----------|
| Counting | Barcode scan + box/pallet models |
| Putaway | Barcode scan + WMS bin models |
| Pallet transfer | Barcode pallet models + SAP stock transfer |
| Picking | Barcode scan + SAP pick list read |
| Shipping | Barcode scan + SAP delivery note write |
| FG receipt with location | Barcode pallet + WMS bin |

---

## 9. SAP Touchpoints (Barcode Module Itself)

The barcode module is **mostly app-only**, but it triggers SAP operations:

| Barcode Operation | SAP Interaction |
|------------------|-----------------|
| Pallet transfer between warehouses | `POST /b1s/v2/StockTransfers` |
| Box transfer between warehouses | `POST /b1s/v2/StockTransfers` |
| Count variance adjustment | `POST /b1s/v2/InventoryGenEntries` (surplus) or `InventoryGenExits` (shortage) |
| Item/batch lookup | HANA read: OITM, OBTN |

The barcode, pallet, box, scan log, and print log data all live in PostgreSQL. SAP only gets called when a barcode operation results in a stock movement.
