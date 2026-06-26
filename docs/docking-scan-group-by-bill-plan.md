# Plan: Group Docking "Items to Scan" by Bill / Invoice

**Branch (both repos):** `feat/docking-scan-group-by-bill`
**Repos:** `factory_app` (Django backend) · `FactoryFlow` (React/TS frontend)

## Problem

On the Docking box-scan page (`/dispatch/docking/new/barcode-scan`, rendered by
`SalesDispatchBarcodeScanPage`), the **Items to Scan** table lists every dispatch
line in one flat list. A single docking entry can cover **multiple bills/invoices**
(the vehicle is loaded per invoice), so the *same item code appears on several lines*
— one per bill — with no indication of which bill each line belongs to. This is
confusing and is the norm for almost every docking entry.

## Goal

Restructure **Items to Scan** so the data is grouped **by bill/invoice**:

- Each invoice is a **collapsible dropdown** (header = bill number + customer + roll-up
  totals/status).
- Inside each dropdown, show the **same table we have today** (Item Code, Item,
  Invoice Qty, Boxes, Weight, Scanned, Status) but limited to that bill's lines.
- Add a **Bill Number** column / surface the bill number prominently.

Per the product decision, **scanned-box counts must be attributed to the correct
bill** even when the same item code is split across bills. Box scans currently carry
no bill reference, so this requires a small backend change.

---

## Current state (verified)

### Frontend
- Page: `src/modules/gate/pages/customerSalesFlow/SalesDispatchBarcodeScanPage.tsx`
  - `ItemsToScanCard` (≈ line 865) renders the flat table.
  - `buildItemScanSummary(entry, scans)` (≈ line 1132) builds the rows. It aggregates
    scans into `scansByItem` keyed **by `item_code` only** (line ~1137), so when an
    item is in two bills, both lines resolve to the *same* scan stats — the core bug
    this work fixes.
  - `getExpectedItems(entry)` (≈ line 1181) flattens `entry.documents[].items` into one
    list, discarding the bill grouping.
- Helpers: `salesDispatchBoxCounts.ts` already has `getExpectedDocumentBoxes(document)`
  and `getExpectedItemBoxes(item)` — reuse for per-bill box roll-ups.
- Types: `src/modules/gate/api/salesDispatch/salesDispatch.api.ts`
  - `SalesDispatchGateOut.documents?: SalesDispatchGateOutDocument[]` — **the bills.**
  - `SalesDispatchGateOutDocument` has `sap_doc_num`, `customer_name`, `total_*`,
    `items?: SalesDispatchItem[]`.
  - `SalesDispatchItem` has `document?: number` and `document_sap_doc_num?: string`.
  - `SalesDispatchBoxScan` (line 151) has `item_code` but **no `document` reference.**
- Box scans on this page come from `useSalesDispatchBoxScans(entry.id)`
  (`salesDispatch.queries.ts:145`) → `GET .../box-scans/`.

### Backend (`factory_app`)
- Models (`gate_core/models/sales_dispatch.py`):
  - `SalesDispatchGateOut` (130), `SalesDispatchGateOutDocument` (533),
    `SalesDispatchGateOutItem` (603, has `document` FK + `document_sap_doc_num`),
    `SalesDispatchBoxScan` (651) — **has `sales_dispatch` FK + `item_code` but NO
    document/bill FK.**
- Serializers (`gate_core/serializers_sales_dispatch.py`):
  - `SalesDispatchBoxScanSerializer` (178) — does not expose any bill reference.
  - `SalesDispatchGateOutItemSerializer` (78) — already exposes `document` +
    `document_sap_doc_num`.
- Views (`gate_core/views_sales_dispatch.py`):
  - Manual single-box scan: `SalesDispatchBoxScanListCreateView.post` (1345) →
    `SalesDispatchBoxScan.objects.get_or_create` (1390).
  - Barcode-module import: `SalesDispatchBarcodeScansImportView.post` (1612), which
    iterates **per matched session** (each session has `bill_number` / `sap_doc_num` /
    `sap_doc_entry`) — so the bill is known at import time. `get_or_create` at 1667.
  - Session→entry matching helpers: `find_barcode_dispatch_sessions` (1487),
    `_sales_dispatch_doc_keys` (1465).

---

## Design

### A. Backend — attribute box scans to a bill

1. **Model:** add to `SalesDispatchBoxScan`
   ```python
   document = models.ForeignKey(
       SalesDispatchGateOutDocument,
       on_delete=models.SET_NULL, null=True, blank=True,
       related_name="box_scans",
   )
   ```
   + migration. Nullable so existing rows and ambiguous scans stay valid.

2. **Helper** (new, in `views_sales_dispatch.py`): `resolve_box_scan_document(entry, *, item_code=None, sap_doc_num=None, sap_doc_entry=None, bill_number=None)`
   - If a SAP doc identifier is given (import path), return the entry document whose
     `sap_doc_num`/`sap_doc_entry` matches.
   - Else (manual path) match by `item_code`: if **exactly one** of the entry's
     documents contains that item code, return it; if zero or more than one
     (ambiguous), return `None`.

3. **Populate on write:**
   - Manual scan (`SalesDispatchBoxScanListCreateView.post`, ~1390/1413): set
     `document=resolve_box_scan_document(entry, item_code=box.item_code)`.
   - Import (`SalesDispatchBarcodeScansImportView.post`, ~1652): resolve the document
     **once per session** from `session.sap_doc_num` / `bill_number` / `sap_doc_entry`
     and set it on each created/reactivated scan.

4. **Serializer:** add `document` and a read-only `document_sap_doc_num`
   (`source="document.sap_doc_num"`) to `SalesDispatchBoxScanSerializer`.

5. **Backfill (optional, one-off):** data migration to set `document` on existing
   active scans using the unique-item-code rule. Safe to skip — frontend degrades
   gracefully on `null` (see C4).

### B. Frontend — types & data

1. `SalesDispatchBoxScan`: add `document?: number | null;` and
   `document_sap_doc_num?: string | null;`.
2. New pure helper `buildBillScanGroups(entry, scans)` (new file
   `salesDispatchBillGroups.ts`, or extend `salesDispatchBoxCounts.ts`):
   - Iterate `entry.documents` (fallback: synthesize a single pseudo-bill from
     `entry.items` / `entry.item_summary` when `documents` is empty, preserving today's
     behavior for single-bill entries).
   - For each bill, build the existing `ItemScanRow[]` from **that bill's items**.
   - Attribute scans to a bill by `scan.document_sap_doc_num` (preferred) →
     fallback to unique-item-code match → else an **"Unassigned"** bucket surfaced as
     its own group so nothing is hidden.
   - Return `{ bills: BillGroup[], unassignedScans, unplannedScanCount }` where each
     `BillGroup` has `{ billNumber, customerName, rows, expectedBoxes, scannedBoxes,
     totalWeight, status }`.

### C. Frontend — UI

1. Replace `ItemsToScanCard`'s single table with a list of **collapsible bill
   sections** (reuse the existing `ChevronDown`/`ChevronRight` + `useState<Set>` toggle
   pattern already in `BarcodeScansDialog`).
2. **Bill header** (always visible): bill number, customer name, roll-up badges
   (`N open` / `N scanned` / overall `Complete|Partial|Open`), expected boxes & weight.
   Default-expand when there is only one bill (preserve current single-bill UX).
3. **Inside each section:** the existing items table verbatim, now with a **Bill
   Number** column (or rendered in the section header — see open question Q1), scoped to
   that bill's rows.
4. **Unassigned group:** if any scans can't be attributed, render a clearly-labelled
   group so counts always reconcile with the global "Scanned" total.
5. Keep the existing top-level badges (`open` / `scanned` / `outside list`) computed
   across all bills so the page summary is unchanged.

### D. Verify
- `SalesDispatchBarcodeScanPage` is also reused by other docking routes via
  `dispatch/module.config.tsx` (dashboard/new/detail/etc. all import the same
  customer-sales-flow pages). This change is contained to the scan page component, so
  no routing changes are needed — but smoke-test the docking flow and the customer
  sales-dispatch flow since they share the component.
- Backend: unit-test `resolve_box_scan_document` for (a) unique item, (b) duplicate
  item across bills (→ null on manual, correct doc on import), (c) import by
  bill_number vs sap_doc_num.

---

## Open questions

- **Q1 — Bill number placement:** a dedicated **Bill Number column** in the per-bill
  table is redundant once rows are grouped under a bill header. Recommend showing the
  bill number in the **section header** and keeping the table columns as-is. Confirm
  whether a literal column is still wanted (the request mentioned "show the bill number
  column").
- **Q2 — Backfill:** run the one-off backfill migration for existing in-progress
  docking entries, or only attribute scans created from now on? (Recommend backfill;
  it's low-risk with the unique-item-code rule.)

## Touch list

**Backend (`factory_app`)**
- `gate_core/models/sales_dispatch.py` — add `document` FK to `SalesDispatchBoxScan`.
- `gate_core/migrations/` — new migration (+ optional backfill).
- `gate_core/views_sales_dispatch.py` — `resolve_box_scan_document` helper; set
  `document` in manual-scan create/reactivate and in barcode import (per session).
- `gate_core/serializers_sales_dispatch.py` — expose `document` +
  `document_sap_doc_num` on `SalesDispatchBoxScanSerializer`.

**Frontend (`FactoryFlow`)**
- `src/modules/gate/api/salesDispatch/salesDispatch.api.ts` — add `document` /
  `document_sap_doc_num` to `SalesDispatchBoxScan`.
- `src/modules/gate/pages/customerSalesFlow/salesDispatchBoxCounts.ts` (or new
  `salesDispatchBillGroups.ts`) — `buildBillScanGroups` helper.
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchBarcodeScanPage.tsx` —
  replace `ItemsToScanCard` internals with grouped collapsible bill sections; rewire
  `buildItemScanSummary` usage to the new grouping.
