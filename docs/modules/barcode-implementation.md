# Barcode Module Implementation Guide

This document explains the barcode section as it exists on branch `feature/wms2`
as of 2026-05-06. The older `docs/modules/barcode.md` describes broader
requirements and future WMS plans; this file focuses on the implemented code,
tables, APIs, pages, and current limitations.

## Purpose

The barcode module is the app-level traceability layer for finished goods
boxes, pallets, label printing, scanning, movement history, dismantling, and
repacking.

It answers questions like:

- Which box or pallet does this scanned code represent?
- Which item, batch, quantity, warehouse, and production run belong to it?
- Which boxes are currently on a pallet?
- Where did a box or pallet move over time?
- Who printed or reprinted a label?
- What loose stock came from a dismantled box, and what box was created by
  repacking it?

It does not replace SAP/HANA stock. Barcode rows are stored in the application
database and track physical labels and app-managed movement history. SAP/HANA
stock still comes from SAP tables such as `OITW` for warehouse quantities.

## Code Locations

| Area | Location | What it does |
| --- | --- | --- |
| Backend app | `factory_app/barcode/` | Django models, services, serializers, views, URLs |
| Backend route mount | `factory_app/config/urls.py` | Mounts barcode APIs at `/api/v1/barcode/` |
| Frontend module | `FactoryFlow/src/modules/barcode/` | Pages, components, hooks, API client, types |
| Frontend API constants | `FactoryFlow/src/config/constants/api.constants.ts` | Relative barcode endpoint paths |
| Frontend permissions | `FactoryFlow/src/config/permissions/barcode.permissions.ts` | Maps barcode UI permissions to production permissions |
| Existing design doc | `FactoryFlow/docs/modules/barcode.md` | Broader requirements/design notes |

## Data Ownership

All barcode module tables are Django app tables in the application database.
There is no custom `db_table`, so Django uses the default names.

| Django model | Database table | Meaning |
| --- | --- | --- |
| `Box` | `barcode_box` | Individual carton/box label and current app location |
| `Pallet` | `barcode_pallet` | Collection of boxes with a pallet label |
| `LabelPrintLog` | `barcode_labelprintlog` | Print and reprint audit trail |
| `BoxMovement` | `barcode_boxmovement` | Box movement and palletization audit trail |
| `PalletMovement` | `barcode_palletmovement` | Pallet movement audit trail |
| `LooseStock` | `barcode_loosestock` | Quantity dismantled from boxes and available for repack |
| `ScanLog` | `barcode_scanlog` | Audit log for scanned barcodes |

Every model is scoped by `company`, so service methods always filter by the
current company code.

## Relation To SAP/HANA Stock

Barcode stores `current_warehouse`, `current_bin`, `qty`, `box_count`, and
`total_qty` in the app database for the labels it generated. This is useful for
traceability, but SAP remains the source of truth for company inventory.

For actual stock by warehouse, the existing WMS/HANA code reads SAP tables:

- `OITW`: item warehouse stock. Important fields are `ItemCode`, `WhsCode`,
  `OnHand`, `IsCommited`, and `OnOrder`.
- `Available` stock is calculated in code as `OnHand - IsCommited`.
- `OWHS`: warehouse master data, used for warehouse names/codes.
- `OBTN` and `OBTQ`: batch and expiry visibility, used by the WMS batch expiry
  reader.

Relevant backend code:

- `factory_app/warehouse/services/warehouse_service.py`
- `factory_app/warehouse/services/wms_hana_reader.py`
- `factory_app/stock_dashboard/hana_reader.py`

Important distinction:

- Barcode table quantity answers: "What quantity is represented by the boxes
  and pallets generated in this app?"
- SAP/HANA stock answers: "How much quantity does SAP say is in each warehouse?"

## Core Entities

### Box

Backend model: `barcode.models.Box`

A box represents one generated carton label. Important fields:

- `box_barcode`: unique app barcode, for example `BOX-20260417-L4-0001`
- `barcode_data`: JSON payload intended for QR scanning
- `item_code`, `item_name`, `batch_number`
- `qty`, `uom`, `g_weight`, `n_weight`
- `mfg_date`, `exp_date`
- `pallet`: nullable FK to `Pallet`
- `production_run`: nullable FK to `ProductionRun`
- `production_line`
- `current_warehouse`
- `current_bin`: app-managed bin string. SAP bins are not enabled here.
- `status`: `ACTIVE`, `PARTIAL`, `DISMANTLED`, or `VOID`

### Pallet

Backend model: `barcode.models.Pallet`

A pallet is a collection of boxes. Important fields:

- `pallet_id`: unique app barcode, for example `PLT-20260417-L4-001`
- `barcode_data`: JSON payload intended for QR scanning
- `item_code`, `item_name`, `batch_number`
- `box_count`, `total_qty`, `uom`
- `mfg_date`, `exp_date`
- `production_run`, `production_line`
- `current_warehouse`
- `current_bin`: app-managed bin string
- `status`: `ACTIVE`, `CLEARED`, `SPLIT`, or `VOID`

### Movement Tables

`BoxMovement` and `PalletMovement` are audit tables. They store:

- movement type
- source and destination warehouse/bin
- source and destination pallet for box movements
- user who performed the action
- timestamp
- notes for pallet movements
- optional `sap_transfer_doc_entry` on pallet movements

### Print And Scan Logs

`LabelPrintLog` records every original print and reprint request. Reprints keep
the same barcode value and add a `reprint_reason`.

`ScanLog` records scan attempts from `POST /scan/`, including raw barcode text,
parsed data, entity type, entity ID, result, user, timestamp, and device info.

`GET /lookup/{barcode}/` performs a lookup without creating a scan log.

## Barcode Values

### Box ID Format

Generated in `BarcodeService.generate_boxes()`.

```text
BOX-YYYYMMDD-LINE-0001
```

Example:

```text
BOX-20260417-L4-0001
```

Rules:

- Date comes from `mfg_date`.
- Line comes from `production_line`.
- Spaces in the line are replaced with `_`.
- If line is empty, `XX` is used.
- Sequence is 4 digits and increments per date plus line prefix.

### Pallet ID Format

Generated in `BarcodeService.create_pallet()` and related split/create flows.

```text
PLT-YYYYMMDD-LINE-001
```

Example:

```text
PLT-20260417-L4-001
```

Rules:

- Date comes from the first box `mfg_date`.
- Line comes from the pallet or box production line.
- Sequence is 3 digits and increments per date plus line prefix.

### Repack Box Format

Repacked boxes use line key `RP`.

```text
BOX-YYYYMMDD-RP-0001
```

## QR Payloads And Printed Codes

The backend builds JSON payloads in `barcode_data`. Example box payload:

```json
{
  "type": "BOX",
  "box_barcode": "BOX-20260417-L4-0001",
  "item_code": "FG0000047",
  "batch": "L4000019",
  "qty": "20.00",
  "uom": "PCS",
  "mfg_date": "2026-04-17",
  "exp_date": "2028-04-16",
  "line": "L4",
  "warehouse": "BH-FG"
}
```

Example pallet payload:

```json
{
  "type": "PALLET",
  "pallet_id": "PLT-20260417-L4-001",
  "item_code": "FG0000047",
  "batch": "L4000019",
  "box_count": 50,
  "total_qty": "1000.00",
  "uom": "PCS",
  "mfg_date": "2026-04-17",
  "exp_date": "2028-04-16",
  "line": "L4",
  "warehouse": "BH-FG"
}
```

Current frontend label components print QR codes from `qr_payload` through
`qrcode.react`. The QR contains the JSON payload returned by the backend, so a
scan can directly identify whether the label is a box or pallet and can carry
item, batch, quantity, date, line, and warehouse metadata.

The label also prints the human-readable box or pallet ID below/beside the QR
code so operators can manually read or type the ID if needed.

The older Code 128/1D lookup path is still supported by the backend scanner for
legacy labels. Those values use:

- Box legacy value: `B` plus the box barcode with non-alphanumeric characters
  removed.
- Pallet legacy value: `P` plus the pallet ID with non-alphanumeric characters
  removed.

The backend scan parser accepts:

- JSON QR payloads with `type: BOX`
- JSON QR payloads with `type: PALLET`
- raw app IDs starting with `BOX-`
- raw app IDs starting with `PLT-`
- legacy printed 1D values starting with `BBOX`
- legacy printed 1D values starting with `PPLT`

Important: `barcode_data.warehouse` is the warehouse value when the payload was
built. If a box or pallet later moves, use the live `current_warehouse` field on
the `Box` or `Pallet` row, not the old warehouse value embedded in a printed
payload.

## Backend Services

### `BarcodeService`

File: `factory_app/barcode/services/barcode_service.py`

This is the main business service. It handles:

- bulk box generation
- box list, detail, and void
- pallet creation
- pallet list, detail, void, move, clear, split
- adding/removing boxes from pallets
- transferring selected boxes
- dismantling pallets
- dismantling boxes into loose stock
- repacking loose stock into a new box
- recalculating pallet `box_count` and `total_qty`

### `LabelService`

File: `factory_app/barcode/services/label_service.py`

This service returns label data for the frontend to render and logs print
requests.

It handles:

- box label data
- pallet label data
- bulk label data
- print and reprint audit logs
- print history filters

### `ScanService`

File: `factory_app/barcode/services/scan_service.py`

This service parses a scanned string, resolves it to a box or pallet, optionally
logs the scan, and returns normalized entity data.

It handles:

- scan parsing
- scan logging
- lookup without logging
- scan history filters

### `ProductionBarcodeIntegration`

File: `factory_app/barcode/services/production_integration_service.py`

This connects production runs to barcode operations. It can:

- generate box labels for a production run
- create a pallet from boxes linked to a production run

### `BarcodeSAPIntegration`

File: `factory_app/barcode/services/sap_integration_service.py`

This service currently validates and logs the intent to create a SAP stock
transfer. The actual SAP client call is deferred until SAP network integration
is wired.

So today:

- it validates source and destination warehouse
- it validates item data
- it logs that a transfer was prepared
- it returns `None`
- it does not post stock transfer documents into SAP yet

## Main Workflows

### 1. Generate Box Labels

Frontend page:

- `/barcode/generate`
- `LabelGeneratePage.tsx`

Backend endpoint:

```text
POST /api/v1/barcode/boxes/generate/
```

Request:

```json
{
  "item_code": "FG0000047",
  "item_name": "Mustard Oil 1L",
  "batch_number": "L4000019",
  "qty": 20,
  "box_count": 50,
  "uom": "PCS",
  "g_weight": 22.5,
  "n_weight": 20,
  "mfg_date": "2026-04-17",
  "exp_date": "2028-04-16",
  "warehouse": "BH-FG",
  "production_line": "L4",
  "production_run_id": 123
}
```

What happens:

1. Backend generates unique `BOX-...` IDs.
2. Backend creates `Box` records.
3. Backend stores QR-style `barcode_data`.
4. Backend creates `BoxMovement` records with movement type `CREATE`.
5. Frontend can request printable label data separately.

### 2. Create A Pallet

Frontend pages:

- `/barcode/pallets`
- `/barcode/pallets/:palletId`
- pallet creation actions from generate/detail flows

Backend endpoint:

```text
POST /api/v1/barcode/pallets/create/
```

Request:

```json
{
  "box_ids": [101, 102, 103],
  "warehouse": "BH-FG",
  "production_line": "L4",
  "production_run_id": 123
}
```

Rules:

- All boxes must exist in the same company.
- All boxes must be `ACTIVE`.
- All boxes must be unpalletized.
- All boxes must have the same `item_code` and `batch_number`.

What happens:

1. Backend creates a unique `PLT-...` ID.
2. Backend creates a `Pallet` row.
3. Backend links selected boxes to the pallet.
4. Backend updates each box `current_warehouse`.
5. Backend logs `BoxMovement` as `PALLETIZE`.
6. Backend logs `PalletMovement` as `CREATE`.

### 3. Print Or Reprint Labels

Frontend pages/components:

- `/barcode/reprint`
- `/barcode/print-history`
- `BoxLabel.tsx`
- `PalletLabel.tsx`
- `PrintableLabel.tsx`
- `Barcode1D.tsx` for legacy Code 128 rendering support

Backend endpoints:

```text
POST /api/v1/barcode/print/box/{box_id}/
POST /api/v1/barcode/print/pallet/{pallet_id}/
POST /api/v1/barcode/print/bulk/
GET  /api/v1/barcode/print/history/
```

Request for single print:

```json
{
  "print_type": "REPRINT",
  "reprint_reason": "Old label damaged",
  "printer_name": "Zebra-Line-4"
}
```

What happens:

1. Backend returns label data.
2. Backend creates `LabelPrintLog`.
3. Frontend renders the label and uses browser print.

The current implementation renders QR labels. The backend returns `qr_payload`,
and the frontend prints that value as the QR code. Each label is sized at
60 mm x 40 mm, and print actions lay labels in three columns on a single A4
PDF/print page so generated batches do not waste one page per barcode.

### 4. Scan Or Lookup

Frontend page/component:

- `/barcode/scan`
- `BarcodeScanner.tsx`
- `useScanner.ts`

Input methods:

- handheld scanner in keyboard/HID mode
- manual text entry
- camera scanning through `html5-qrcode`

Backend endpoints:

```text
POST /api/v1/barcode/scan/
GET  /api/v1/barcode/lookup/{barcode_string}/
GET  /api/v1/barcode/scan/history/
```

Scan request:

```json
{
  "barcode_raw": "BBOX20260417L40001",
  "scan_type": "LOOKUP",
  "context_ref_type": "",
  "context_ref_id": null,
  "device_info": "Line 4 Android scanner"
}
```

Scan response:

```json
{
  "scan_id": 987,
  "result": "SUCCESS",
  "entity_type": "BOX",
  "entity_id": "101",
  "entity_data": {
    "id": 101,
    "box_barcode": "BOX-20260417-L4-0001",
    "item_code": "FG0000047",
    "batch_number": "L4000019",
    "qty": "20.00",
    "status": "ACTIVE",
    "current_warehouse": "BH-FG",
    "pallet_id": "PLT-20260417-L4-001"
  },
  "barcode_raw": "BBOX20260417L40001",
  "barcode_parsed": {
    "entity_type": "BOX",
    "barcode": "BBOX20260417L40001"
  }
}
```

Use `POST /scan/` when you want an audit log. Use `GET /lookup/.../` when you
only need lookup data and do not want to record a scan.

### 5. Move A Pallet

Frontend page:

- `/barcode/move`

Backend endpoint:

```text
POST /api/v1/barcode/pallets/{pallet_id}/move/
```

Request:

```json
{
  "to_warehouse": "GP-FG",
  "notes": "Shifted from production to godown"
}
```

Rules:

- Pallet must be `ACTIVE`.
- Destination warehouse must be different from current warehouse.

What happens:

1. Pallet `current_warehouse` is updated.
2. Active and partial boxes on the pallet are updated to the same warehouse.
3. Backend logs `BoxMovement` as `MOVE`.
4. Backend logs `PalletMovement` as `MOVE`.

### 6. Transfer Selected Boxes

Frontend page:

- `/barcode/transfer`

Backend endpoint:

```text
POST /api/v1/barcode/transfers/box/
```

Request:

```json
{
  "box_ids": [101, 102],
  "to_warehouse": "BH-EC",
  "to_pallet_id": null
}
```

Rules:

- Boxes must be `ACTIVE` or `PARTIAL`.
- If `to_pallet_id` is supplied, the target pallet must be `ACTIVE`.
- If no target pallet is supplied and a box was on a pallet, it is removed from
  its old pallet.

What happens:

1. Boxes move to the destination warehouse.
2. Pallet links are adjusted if needed.
3. Affected pallets are recalculated.
4. Backend logs `BoxMovement` as `TRANSFER`.

### 7. Split, Clear, Add, Or Remove Boxes

Backend endpoints:

```text
POST /api/v1/barcode/pallets/{pallet_id}/split/
POST /api/v1/barcode/pallets/{pallet_id}/clear/
POST /api/v1/barcode/pallets/{pallet_id}/add-boxes/
POST /api/v1/barcode/pallets/{pallet_id}/remove-boxes/
```

Split:

- Select some boxes from an active pallet.
- Backend creates a new pallet.
- Selected boxes move to the new pallet.
- Original pallet count and quantity are recalculated.
- You cannot split all boxes. Use move pallet instead.

Clear:

- Removes all active/partial boxes from the pallet.
- Sets pallet status to `CLEARED`.
- Sets pallet `box_count` and `total_qty` to zero.

Add boxes:

- Adds active/partial unpalletized boxes to an active pallet.
- Boxes must match the pallet item and batch.

Remove boxes:

- Removes selected active/partial boxes from a pallet.
- Recalculates the pallet.
- Logs a pallet `DISMANTLE` movement.

### 8. Dismantle And Repack

Frontend pages:

- `/barcode/dismantle`
- `/barcode/loose`
- `/barcode/repack`

Backend endpoints:

```text
POST /api/v1/barcode/pallets/{pallet_id}/dismantle/
POST /api/v1/barcode/boxes/{box_id}/dismantle/
GET  /api/v1/barcode/loose/
GET  /api/v1/barcode/loose/{loose_id}/
POST /api/v1/barcode/repack/
```

Dismantle pallet request:

```json
{
  "box_ids": [101, 102],
  "reason": "REPACK",
  "reason_notes": "Selected boxes removed for repack"
}
```

If `box_ids` is omitted or `null`, all active boxes are removed from the pallet.
This does not create loose stock; it only depalletizes boxes.

Dismantle box request:

```json
{
  "qty": 5,
  "reason": "DAMAGED",
  "reason_notes": "Leakage found"
}
```

What happens:

- Backend creates a `LooseStock` row.
- If full box quantity is dismantled, the box becomes `DISMANTLED` with qty `0`.
- If partial quantity is dismantled, the box becomes `PARTIAL` and qty is
  reduced.
- If the box is on a pallet, the pallet is recalculated.

Repack request:

```json
{
  "loose_ids": [11, 12],
  "qty_per_loose": {
    "11": "2.5",
    "12": "3"
  },
  "warehouse": "BH-FG"
}
```

Rules:

- Loose records must be `ACTIVE`.
- All loose records must have the same item and batch.
- Repack creates a new `BOX-YYYYMMDD-RP-0001` style box.
- Consumed loose quantity is deducted.
- Fully consumed loose rows become `REPACKED`.

### 9. Production Integration

Backend endpoints:

```text
POST /api/v1/barcode/production/{run_id}/generate-labels/
POST /api/v1/barcode/production/{run_id}/create-pallet/
```

Production label request:

```json
{
  "qty_per_box": 20,
  "box_count": 50,
  "batch_number": "L4000019",
  "warehouse": "BH-FG"
}
```

Production pallet request:

```json
{
  "box_ids": [101, 102, 103],
  "warehouse": "BH-FG"
}
```

The integration service reads `ProductionRun`, uses run/product/line data, and
creates barcode records linked back to the production run.

## API Reference

The frontend constants are relative to the API base. The backend mounts them
under `/api/v1/barcode/`.

### Boxes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/boxes/generate/` | Bulk-generate boxes |
| `GET` | `/boxes/` | List boxes |
| `GET` | `/boxes/{box_id}/` | Box detail with movement and trace data |
| `POST` | `/boxes/{box_id}/void/` | Void a box |

Box list filters:

- `status`
- `item_code`
- `batch_number`
- `warehouse`
- `pallet_id`
- `unpalletized`
- `search`

### Pallets

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/pallets/create/` | Create pallet from boxes |
| `GET` | `/pallets/` | List pallets |
| `GET` | `/pallets/{pallet_id}/` | Pallet detail with boxes and movement history |
| `POST` | `/pallets/{pallet_id}/void/` | Void a pallet |
| `POST` | `/pallets/{pallet_id}/move/` | Move pallet to another warehouse |
| `POST` | `/pallets/{pallet_id}/clear/` | Clear all boxes from a pallet |
| `POST` | `/pallets/{pallet_id}/split/` | Split selected boxes into a new pallet |
| `POST` | `/pallets/{pallet_id}/add-boxes/` | Add boxes to a pallet |
| `POST` | `/pallets/{pallet_id}/remove-boxes/` | Remove boxes from a pallet |

Pallet list filters:

- `status`
- `item_code`
- `batch_number`
- `warehouse`
- `search`

### Transfers

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/transfers/box/` | Move selected boxes to a warehouse and optional target pallet |

There is no implemented `/transfers/pallet/` endpoint in this branch; pallet
movement is handled by `/pallets/{id}/move/`.

### Print

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/print/box/{box_id}/` | Return box label data and log print |
| `POST` | `/print/pallet/{pallet_id}/` | Return pallet label data and log print |
| `POST` | `/print/bulk/` | Return multiple label payloads |
| `GET` | `/print/history/` | List print/reprint audit log |

Print history filters:

- `label_type`
- `print_type`
- `search` on frontend, sent as `reference_code` in backend filtering

### Dismantle, Loose Stock, Repack

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/pallets/{pallet_id}/dismantle/` | Remove all or selected boxes from a pallet |
| `POST` | `/boxes/{box_id}/dismantle/` | Convert full/partial box qty into loose stock |
| `GET` | `/loose/` | List loose stock |
| `GET` | `/loose/{loose_id}/` | Loose stock detail |
| `POST` | `/repack/` | Create a new box from loose stock |

Loose stock filters:

- `status`
- `item_code`
- `warehouse`
- `reason`
- `search`

### Scan

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/scan/` | Parse scan, resolve entity, and log scan |
| `GET` | `/scan/history/` | List scan history |
| `GET` | `/lookup/{barcode_string}/` | Resolve entity without logging scan |

Scan history filters:

- `scan_type`
- `scan_result`
- `entity_type`

### Production

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/production/{run_id}/generate-labels/` | Generate boxes for a production run |
| `POST` | `/production/{run_id}/create-pallet/` | Create pallet for a production run |

## Frontend Routes

Configured in `FactoryFlow/src/modules/barcode/module.config.tsx`.

| Route | Page | Purpose |
| --- | --- | --- |
| `/barcode` | `BarcodeDashboardPage` | Barcode overview |
| `/barcode/pallets` | `PalletListPage` | Search/filter pallets |
| `/barcode/pallets/:palletId` | `PalletDetailPage` | Pallet boxes and movement history |
| `/barcode/boxes` | `BoxListPage` | Search/filter boxes |
| `/barcode/boxes/:boxId` | `BoxDetailPage` | Box details, movement, dismantle/repack trace |
| `/barcode/generate` | `LabelGeneratePage` | Generate box labels |
| `/barcode/reprint` | `ReprintPage` | Reprint labels |
| `/barcode/print-history` | `PrintHistoryPage` | Print/reprint audit log |
| `/barcode/scan` | `ScanPage` | General scanner and lookup |
| `/barcode/move` | `PalletMovePage` | Move a pallet to another warehouse |
| `/barcode/transfer` | `PalletTransferPage` | Transfer selected boxes |
| `/barcode/split` | `PalletSplitPage` | Split a pallet |
| `/barcode/dismantle` | `DismantlePage` | Dismantle pallet or box |
| `/barcode/loose` | `LooseStockPage` | View loose stock |
| `/barcode/repack` | `RepackPage` | Repack loose stock into a new box |

## Frontend Components

| Component | Purpose |
| --- | --- |
| `BarcodeScanner.tsx` | Manual/HID scanner input plus camera scanner toggle |
| `useScanner.ts` | Camera scanner wrapper around `html5-qrcode` |
| `Barcode1D.tsx` | Legacy helper for Code 128 rendering |
| `BoxLabel.tsx` | Printable box label |
| `PalletLabel.tsx` | Printable pallet label |
| `PrintableLabel.tsx` | Print wrapper around rendered labels |
| `labelPrint.ts` | Shared A4 grid print style for 60 mm x 40 mm labels |

Frontend barcode dependencies:

- `html5-qrcode`: camera scanning
- `qrcode.react`: QR rendering on printed box and pallet labels
- `jsbarcode`: legacy 1D barcode rendering helper

## Permissions

Barcode frontend permissions currently map to production permissions:

| Barcode permission | Mapped permission |
| --- | --- |
| `VIEW_PALLET` | `production_execution.can_view_production_run` |
| `CREATE_PALLET` | `production_execution.can_create_production_run` |
| `MANAGE_PALLET` | `production_execution.can_view_material_usage` |
| `VIEW_BOX` | `production_execution.can_view_production_run` |
| `CREATE_BOX` | `production_execution.can_create_production_run` |
| `MANAGE_BOX` | `production_execution.can_view_material_usage` |

## Business Rules

- Box and pallet IDs are globally unique.
- Pallets can only be created from boxes with the same item and batch.
- Boxes must be active and unpalletized before they can be added to a new pallet.
- Active pallets cannot be moved to the same warehouse they already occupy.
- Moving a pallet also moves its active/partial boxes.
- Splitting a pallet creates a new pallet; it cannot split all boxes.
- Clearing a pallet depalletizes boxes and sets pallet quantity to zero.
- Dismantling a pallet removes boxes from a pallet but does not create loose
  stock.
- Dismantling a box creates loose stock and reduces or clears box quantity.
- Repack creates a new box from active loose stock.
- Pallet totals are recalculated from active/partial boxes after operations
  that change pallet contents.
- Print/reprint is audited in `LabelPrintLog`.
- `POST /scan/` is audited in `ScanLog`; `GET /lookup/` is not.

## Current Limitations And Watch Points

- SAP stock transfer posting is not wired. `BarcodeSAPIntegration` validates and
  logs the intent only.
- Current box and pallet labels print QR codes. Legacy 1D lookup support remains
  in the scanner for old labels.
- `current_bin` is a string field managed by the app. It is not connected to SAP
  bin management.
- `ScanType` includes WMS events such as `COUNT`, `PICK`, `SHIP`, and
  `PUTAWAY`, but this module only parses/logs scans. Full WMS workflows must
  consume those scans separately.
- 1D lookup strips the `B` or `P` prefix and compares against normalized stored
  barcodes by iterating records. For very high volume, store an indexed
  normalized barcode value.
- The frontend `BoxMovementType` type should be checked before using it for
  strict rendering because the backend can return `DISMANTLE`.
- Warehouse inside `barcode_data` can become stale after movement. Use
  `current_warehouse` from the live entity row for current location.

## Quick Debug Checklist

When a scan or label is not working:

1. Check if the scanned value is raw app ID, legacy 1D value, or JSON QR payload.
2. For boxes, verify the value maps to `barcode_box.box_barcode`.
3. For pallets, verify the value maps to `barcode_pallet.pallet_id`.
4. Use `GET /api/v1/barcode/lookup/{barcode}/` for lookup without log noise.
5. Use `POST /api/v1/barcode/scan/` when you need a `ScanLog` record.
6. Check `barcode_labelprintlog` for print/reprint audit.
7. Check `barcode_boxmovement` and `barcode_palletmovement` for movement
   history.
8. For SAP warehouse quantity, check WMS/HANA code that reads `OITW`, not
   barcode tables.
