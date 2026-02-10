# GRPO Module

Goods Receipt Posted Out — handles posting received materials into the ERP system after gate entry is completed.

## Routes

| Route | Page | Permission |
|---|---|---|
| `/grpo` | GRPODashboardPage | `VIEW_PENDING` |
| `/grpo/pending` | PendingEntriesPage | `VIEW_PENDING` |
| `/grpo/preview/:vehicleEntryId` | GRPOPreviewPage | `PREVIEW` |
| `/grpo/history` | GRPOHistoryPage | `VIEW_HISTORY` |
| `/grpo/history/:postingId` | GRPOHistoryDetailPage | `VIEW_POSTING` |

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
