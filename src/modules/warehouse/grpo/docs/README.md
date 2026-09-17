# GRPO (Warehouse submodule)

Goods Receipt Posted Out — handles posting received materials into the ERP system after gate entry is completed.

GRPO is a **submodule of Warehouse**: it lives under `src/modules/warehouse/grpo/` and contributes
its routes (`grpoRoutes`) and a sidebar child item (`grpoNavChildren`) to `warehouseModuleConfig`.
It is not registered as a standalone module. Its routes are nested under `/warehouse/grpo/*`; a
legacy `/grpo/*` route redirects old links to the new prefix. The backend API is unchanged
(`/api/v1/grpo/...`).

## Routes

| Route | Page | Permission |
|---|---|---|
| `/warehouse/grpo/material` | MaterialGRPOPage | `VIEW_PENDING` |
| `/warehouse/grpo/material/pending` | PendingEntriesPage | `VIEW_PENDING` |
| `/warehouse/grpo/material/all-entries` | AllEntriesPage | `VIEW_PENDING` |
| `/warehouse/grpo/material/preview/:vehicleEntryId` | GRPOPreviewPage | `PREVIEW` |
| `/warehouse/grpo/material/history` | GRPOHistoryPage | `VIEW_HISTORY` |
| `/warehouse/grpo/material/history/:postingId` | GRPOHistoryDetailPage | `VIEW_POSTING` |
| `/grpo/*` | → redirect to `/warehouse/grpo/*` | — |

## Structure

```
grpo/
├── module.config.tsx
├── api/
│   ├── grpo.api.ts
│   ├── grpo.queries.ts
│   └── index.ts
├── components/
│   ├── WarehouseSelect.tsx
│   └── index.ts
├── constants/
│   └── grpo.constants.ts
├── pages/
│   ├── GRPODashboardPage.tsx
│   ├── PendingEntriesPage.tsx
│   ├── GRPOPreviewPage.tsx
│   ├── GRPOHistoryPage.tsx
│   └── GRPOHistoryDetailPage.tsx
├── schemas/
│   └── grpo.schema.ts
└── types/
    └── grpo.types.ts
```

## Workflow

```
Gate Entry Completed → Appears in GRPO Pending List
                              ↓
                     Preview items + select warehouse
                              ↓
                     Post to ERP (branch, warehouse, quantities)
                              ↓
                     Appears in GRPO History
```

## Printing a Goods Receipt Note

`GRPOPrintButton` shows on POSTED rows in **History** and on the posting detail
sheet, and prints SAP's own "Goods Receipt Note" — the note the stores and the
vendor already hold, not a redesign of it. Nothing renders for a draft or a
failed posting: there is no SAP document to print.

- The note is read on click (`grpoApi.getPrint`) and never cached — SAP can
  still amend a receipt after we post it, and printing a stale copy is an error
  nobody catches until the vendor does.
- `GRPOGoodsReceiptNotePrint` draws the sheet in points on an A4 page, measured
  off a SAP-generated PDF's own vector geometry. Its docstring records that
  geometry, the oddities reproduced on purpose (the literal `9` in "Top 3
  Price", the empty "Reff. Po Date", "Contact Persion") and the two Crystal
  drawing artifacts deliberately left out.
- Every row of the sheet is cut from the same 13 columns; the component's test
  asserts that, because a row that adds up to 12 or 14 shifts its rules off the
  item grid's and the result reads as a different document.

## Printing a Purchase Order

`POPrintButton` shows on every PO in Material GRPO — the **Pending Entries**
rows (each PO number is its own print button), the **All Entries** bill rows,
each PO card on the **Preview** page, and the posting detail sheet beside
"Print GRN". It prints SAP's own "Purchase Order", again reproduced rather than
redesigned. Unlike the goods receipt it needs nothing posted first: the order
exists in SAP before anything arrives, so the button works on a pending entry
and on a QC-blocked one.

- Read on click (`grpoApi.getPOPrint`) and never cached, for the same reason as
  the receipt: SAP can still amend or cancel an order after the gate receives
  against it.
- `POPurchaseOrderPrint` draws the sheet in points on A4, measured off a
  SAP-generated PDF's own vector geometry. Its docstring records that geometry,
  the labels SAP prints with nothing behind them ("Packing Slip No.", "Payment
  Due Date", the ship-to contact lines) and the Crystal artifacts left out.
- Three sets of vertical rules run down the sheet and **do not line up** — the
  item grid's, the grid total row's, and the money rows' (x 371 and x 492.5).
  One table draws all three off the union of their edges, and the component's
  test asserts every row still totals 11 columns.
- The elastic row is *inside* the item grid, not below the totals: SAP pins the
  totals a fixed distance off the bottom of the frame, so a one-item order —
  most of them — must leave its empty space above them. A geometry test pins
  that, because getting it backwards floats the totals 65pt too high.
- The masthead banner ("ONLY FOR BEVERAGES") is Crystal text, not data, and is
  keyed per company. Only Beverages has a printed sheet to copy, so only
  Beverages carries one.

## Key Types

- `PendingGRPOEntry` — Vehicle entry awaiting GRPO posting
- `PreviewPOReceipt` — PO receipt with items and quantities for preview
- `PostGRPORequest` — Request body for posting (vehicle_entry_id, po_receipt_id, items, branch, warehouse)
- `GRPOHistoryEntry` — Posted GRPO record with status

## Dependencies

- `@/config/constants` — FINAL_STATUS, GRPO_STATUS
- `@/shared/components` — SearchableSelect, UI primitives
- `@/core/api` — API client
- No other module imports
