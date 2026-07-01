# Branch Stock Transfer (BST) — Flow & Architecture

Branch Stock Transfer moves **finished-goods** stock between two warehouses of the
**same company**, driven by the warehouse team and backed by a **SAP stock-transfer
document (OWTR)**. It is scan-based: the boxes/pallets being moved are scanned,
reviewed, approved, optionally passed through the gate on a vehicle, and then
scanned again by the destination warehouse to accept or reject them.

> **Scope decisions**
> - **Intra-company only.** A SAP stock transfer always moves between two
>   warehouses of one company, so BST never changes a box's company. True
>   cross-company moves (e.g. JIVO_OIL → JIVO_MART) use the separate
>   **intercompany transfer** flow in the barcode module.
> - **Finished goods only.** Only FG items are barcoded into boxes/pallets;
>   packaging/raw-material (PM/RM) transfers have nothing to scan.
> - **App-only.** Accepting stock moves the box's warehouse in our DB and writes
>   movement history; nothing is posted back to SAP yet (doc numbers are manual).

---

## Where the code lives

**Backend — `factory_app`, `warehouse` app**
- `warehouse/models_bst.py` — `BSTTransfer`, `BSTTransferItem`, `BSTBoxScan`
- `warehouse/services/bst_service.py` — `BSTService` (all business logic)
- `warehouse/serializers_bst.py`, `warehouse/views_bst.py`, urls in `warehouse/urls.py` (`/warehouse/bst/…`)
- `barcode/services/box_ownership.py` — shared ownership-move helper (used by the intercompany flow; BST receive only changes warehouse)
- Migrations: `0002` models · `0003` nullable vehicle/driver · `0004` drop `to_company` (intra-company) · `0005` model permissions · `0006` `scan_approved_*`
- Tests: `warehouse/tests.py` (`BSTSenderFlowTests`, `BSTReceiverFlowTests`, `BSTGateFlowTests`)

**Frontend — `FactoryFlow`**
- Warehouse pages: `src/modules/warehouse/pages/bst/` — `BSTDashboardPage`, `BSTNewPage`, `BSTScanPage`, `BSTReviewPage`, `BSTDetailPage`, `BSTReceivePage`
  - Shared bits: `BSTBillTable` (item bill + scan progress), `BoxScanCamera`, `bstStatus`, `bstFormat`
- Warehouse API/types: `src/modules/warehouse/api/bst.api.ts`, `bst.queries.ts`, `src/modules/warehouse/types/bst.types.ts`
- Gate pages: `src/modules/gate/pages/bstGate/` — `BSTGateOutListPage`, `BSTGateOutReviewPage`
- Shared scan hook: `src/shared/hooks/useBoxScanQueue.ts` (non-blocking queue, shared with sales-dispatch docking)
- Routes/nav: warehouse `module.config.tsx` (Warehouse sidebar → **Branch Transfer**), gate `module.config.tsx` (Gate sidebar → **BST Out**)

---

## Data model

- **`BSTTransfer`** (head) — one shipment. `company` (the single company), `entry_no`
  (`BST-YYYYMMDD-NNNN`), the SAP doc snapshot (`sap_doc_entry/num/date`,
  `sap_from_warehouse`, `sap_to_warehouse`, `sap_reference`), `invoice_no`,
  optional `vehicle`/`driver`, `requires_gate`, `status`, and audit stamps
  (`created_by`, `scan_approved_by/at`, `dispatched_by/at`, `gated_out_by/at`,
  `received_by/at`, `cancelled_*`).
- **`BSTTransferItem`** — a snapshot of each SAP line (item, quantity, uom,
  from/to warehouse). This is the "bill" the scanning is checked against.
- **`BSTBoxScan`** — one row per physical box, holding **both** the send state
  (`scanned_by/at`) and the receive state (`receive_status` PENDING/ACCEPTED/
  REJECTED, `reject_reason`, `received_by/at`, `is_unexpected`).

### Status lifecycle

```
DRAFT ─▶ SCANNING ─▶ (approve)
                        │
          requires_gate ├─ yes ─▶ AWAITING_GATE_OUT ─▶ (gate marks out) ─▶ IN_TRANSIT
                        └─ no  ─────────────────────────────────────────▶ IN_TRANSIT
                                                                              │
                                                        (receiver scans) ─▶ RECEIVING
                                                                              │
                                        ┌─ all accepted ──────────▶ RECEIVED
                                        └─ some rejected / short ─▶ PARTIALLY_RECEIVED
(any active state) ─▶ CANCELLED
```

> `AWAITING_GATE_IN`, `GATED_IN`, `ARRIVED`, `CLOSED` exist in the enum but are
> **dormant** — the current flow has no destination gate-in; gate-out goes
> straight to `IN_TRANSIT` (receivable).

---

## The flows

### 1. Create (warehouse) — `BSTNewPage`, `/warehouse/bst/new`

1. Search the **SAP stock transfer by its invoice / document number**
   (`GET /warehouse/bst/sap-transfers/?search=`; matches SAP DocNum / NumAtCard).
2. Select it — the from/to warehouse and line items come from the doc.
3. Optionally tick **"Leaves on a vehicle (needs gate-out)"** → capture
   **vehicle + driver**; this sets `requires_gate`. If left off it's an internal
   dock-to-dock move with no gate step.
4. Create (`POST /warehouse/bst/`) snapshots the SAP lines into `BSTTransferItem`
   and opens the transfer in **`SCANNING`**.

### 2. Scan (warehouse) — `BSTScanPage`, `/warehouse/bst/:id/scan`

- Scan boxes or pallets (camera or hardware/manual input). A **pallet scan
  expands to all its active boxes**. Uses the shared non-blocking
  `useBoxScanQueue` (success flash, failed-scan retry).
- Each scanned box is **validated** (`POST /warehouse/bst/:id/box-scans/`):
  - belongs to the company, is `ACTIVE`/`PARTIAL`, not dispatched,
  - it is **physically at the source warehouse** (`current_warehouse ==
    sap_from_warehouse`),
  - it isn't already committed to another active BST.
- **The transfer is not restricted to the SAP bill** — the warehouse may send
  items that aren't on the bill and any quantity. These deviations are **flagged,
  not blocked**: the page leads with the **bill** (`BSTBillTable`) where each SAP
  item shows Bill Qty vs live Scanned Qty / Boxes with an Open / Partial /
  Complete / **Over +N** status, off-bill items are appended as **"Not on bill"**
  rows, and off-bill boxes are badged in the scanned list.

### 3. Review & approve (warehouse) — `BSTReviewPage`, `/warehouse/bst/:id/review`

- Shows Bill vs Scanned per item + the vehicle/driver summary.
- **Approve** (`POST /warehouse/bst/:id/approve/`) is the warehouse's final action.
  It stamps `scan_approved_by/at` and then:
  - `requires_gate` → status **`AWAITING_GATE_OUT`** (handed to the gate),
  - otherwise → status **`IN_TRANSIT`** (dispatched, receivable).

### 4. Gate out (gate) — `/gate/bst-out`, `/gate/bst-out/:id`

Only for transfers that leave on a vehicle.
- **BST Out list** (`GET /warehouse/bst/gate/expected-outwards/`, date-filtered):
  transfers approved by the warehouse and awaiting gate-out.
- **Gate review**: the gate person verifies the **warehouse approval (who/when)**,
  the **vehicle/driver**, and **bill qty vs scanned qty**, then **Mark vehicle out**
  (`POST /warehouse/bst/:id/gate/mark-out/`) → status **`IN_TRANSIT`**
  (stamps `gated_out_*` and `dispatched_*`).

### 5. Receive (destination warehouse) — `BSTReceivePage`, `/warehouse/bst/incoming/:id`

- The destination sees the transfer under **Incoming**
  (`GET /warehouse/bst/incoming/`, and on the Warehouse home page).
- Scan arriving boxes to **accept** them; per-box **reject** (with a reason) is
  available; boxes the sender never dispatched are flagged **unexpected**
  (`POST /warehouse/bst/:id/receive-scans/`).
- **Finalize** (`POST /warehouse/bst/:id/receive/complete/`):
  - accepted boxes' `current_warehouse` moves to `sap_to_warehouse` and a
    `BoxMovement` `TRANSFER` is written (no company change — intra-company),
  - status becomes **`RECEIVED`** (all accepted) or **`PARTIALLY_RECEIVED`**
    (any rejected/short).

### 6. Cancel — `BSTDetailPage`

A red **Cancel transfer** action behind a confirmation dialog sets `CANCELLED`.
Blocked once any box has been accepted at the destination.

---

## API surface (`/warehouse/bst/…`)

| Method + path | Purpose |
|---|---|
| `GET  sap-transfers/` · `sap-transfers/<doc_entry>/` | Look up SAP stock transfers (by number) |
| `GET/POST  /` | List outgoing (date-filtered) / create |
| `GET/PUT  /<id>/` | Detail / edit while scanning |
| `POST  /<id>/box-scans/` · `/batch/` · `DELETE /<id>/box-scans/<scan_id>/` | Scan / batch scan / remove |
| `POST  /<id>/approve/` | Warehouse approval (→ gate or in-transit) |
| `POST  /<id>/cancel/` | Cancel |
| `GET  incoming/` · `incoming/<id>/` | Destination inbox (date-filtered) / detail |
| `POST  /<id>/receive-scans/` · `/<id>/receive/complete/` | Receive scan / finalize |
| `GET  gate/expected-outwards/` · `POST /<id>/gate/mark-out/` | Gate BST-Out list / mark vehicle out |

List endpoints honor the app-wide `?from_date=&to_date=` range (filtered on
`created_at`) so the screens stay light as volume grows.

---

## Permissions

- **Frontend** route gating: `WAREHOUSE_PERMISSIONS.VIEW_BST / CREATE_BST /
  MANAGE_BST` (mapped to the codenames warehouse users already hold), and
  `GATE_PERMISSIONS.BST_OUT.VIEW` for the gate submodule.
- **Backend**: dedicated model permissions exist on `BSTTransfer`
  (`warehouse.can_create_bst`, `can_scan_bst`, `can_dispatch_bst`,
  `can_receive_bst`, `can_gate_bst`) for future RBAC. They are **not yet enforced**
  in the views — consistent with the rest of the warehouse module, which currently
  gates only on company context. Enforcing them requires granting them to roles.

---

## Testing

Real SAP transfers and the barcode boxes don't share warehouses/items in the test
data, so aligned boxes/pallets are **seeded** against a chosen finished-goods
transfer (barcodes prefixed `BOX-BSTTEST…` / `BOX-BSTPLT…`, pallet
`PLT-BSTTEST-001`). Example test docs used during development: **626676579**
(loose boxes) and **626676578** (a pallet). Re-seed via a Django shell script that
reads an all-FG transfer's lines and creates boxes/pallets at its from-warehouse.

Run backend tests: `./.venv/Scripts/python.exe manage.py test warehouse.tests` (use
`--keepdb` if a stale `test_factory` DB blocks the drop).

---

## Relationship to the legacy gate BST

An older gate-initiated BST (`gate_core` `BSTGateOut/In/Return` models + gate
`bst*Pages`) predates this. Its dormant frontend pages, entry tiles, and the
Empty-Vehicle-In "BST" reason were removed; the `gate_core` BST **models remain**
for now (entangled with `EmptyVehicleGateIn`) and are slated for a separate full
removal once this flow is validated. The new BST above is a distinct, warehouse-
resident feature.
