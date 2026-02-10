# GRPO Module

The GRPO (Goods Receipt Posted Out) module handles posting received materials into the ERP system after gate entries are completed.

## Overview

When a raw material gate entry reaches "Completed" status, it appears in the GRPO pending list. Users review the receipt items, select a warehouse, and post to the ERP. Posted entries are tracked in the history.

## Workflow

```
Gate Entry Completed
        ↓
GRPO Pending List (/grpo/pending)
        ↓
Preview & Post (/grpo/preview/:vehicleEntryId)
  ├── Review PO receipt items
  ├── Set accepted quantities
  ├── Select branch & warehouse
  └── Post to ERP
        ↓
Posting History (/grpo/history)
  └── Detail View (/grpo/history/:postingId)
```

## Module Structure

```
src/modules/grpo/
├── module.config.tsx         # 5 routes, permission-gated
├── api/
│   ├── grpo.api.ts           # API calls (pending, preview, post, history)
│   ├── grpo.queries.ts       # React Query hooks + GRPO_QUERY_KEYS
│   └── index.ts
├── components/
│   └── WarehouseSelect.tsx   # Warehouse dropdown (uses SearchableSelect)
├── constants/
│   └── grpo.constants.ts     # DEFAULT_BRANCH_ID, permissions, module prefix
├── pages/
│   ├── GRPODashboardPage.tsx
│   ├── PendingEntriesPage.tsx
│   ├── GRPOPreviewPage.tsx   # Main posting interface
│   ├── GRPOHistoryPage.tsx
│   └── GRPOHistoryDetailPage.tsx
├── schemas/
│   └── grpo.schema.ts       # Post request validation (Zod)
└── types/
    └── grpo.types.ts         # PendingGRPOEntry, PreviewPOReceipt, etc.
```

## Routes & Permissions

| Route | Permission | Description |
|---|---|---|
| `/grpo` | `VIEW_PENDING` | Dashboard |
| `/grpo/pending` | `VIEW_PENDING` | Pending entries list |
| `/grpo/preview/:id` | `PREVIEW` | Preview & post interface |
| `/grpo/history` | `VIEW_HISTORY` | Posting history |
| `/grpo/history/:id` | `VIEW_POSTING` | Single posting detail |

## Key Types

```typescript
interface PendingGRPOEntry {
  vehicle_entry_id: number
  entry_no: string
  vehicle_number: string
  supplier_name: string
  status: string
  // ...
}

interface PostGRPORequest {
  vehicle_entry_id: number
  po_receipt_id: number
  items: { po_item_receipt_id: number; accepted_qty: number }[]
  branch_id: number
  warehouse_code?: string
  comments?: string
}
```

## Local Documentation

See also: [`src/modules/grpo/docs/README.md`](../../src/modules/grpo/docs/README.md)

## Related

- [Modules Overview](./overview.md)
- [Gate Module](./gate.md) - Creates the entries that GRPO processes
- [QC Module](./qc.md) - QC status appears on GRPO preview items
