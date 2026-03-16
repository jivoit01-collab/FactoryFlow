# SAP Plan Dashboard Module

Read-only dashboard that displays production order data from SAP, showing order summaries, component details, and procurement needs.

## Structure

```
dashboards/sap-plan/
├── api/
│   ├── sap-plan.api.ts            # Axios calls to /sap/plan-dashboard/
│   └── sap-plan.queries.ts        # React Query hooks with SAP_PLAN_QUERY_KEYS
├── components/
│   ├── SummaryCards.tsx            # Order count cards (planned, released)
│   ├── OrdersTable.tsx            # Filterable/sortable order list
│   ├── OrderDetailDialog.tsx      # Modal with BOM component breakdown
│   ├── ProcurementTable.tsx       # Procurement needs with shortfall highlighting
│   └── SKUDetailPage.tsx          # Deep-dive into single SKU's components
├── constants/
│   └── sap-plan.constants.ts      # Status colors, table column configs
├── pages/
│   └── SAPPlanDashboard.tsx       # Main dashboard page (default export)
├── types/
│   └── sap-plan.types.ts          # SummaryOrder, DetailOrder, ProcurementItem, BOMComponent
└── docs/
    └── README.md                  # This file
```

## Pages

### SAP Plan Dashboard (`/dashboards/sap-plan`)

Three-tab view:
1. **Summary** — Order counts by status (planned/released), top-level metrics
2. **Details** — Full order list with BOM components, filterable by status, searchable by SKU
3. **Procurement** — Component shortfall analysis with vendor info and lead times

### SKU Detail (`/dashboards/sap-plan/sku/:docEntry`)

Deep-dive view for a single production order showing all BOM components with stock availability and shortfall indicators.

## API Endpoints

| Endpoint | Description | Hook |
|----------|-------------|------|
| `GET /sap/plan-dashboard/summary/` | Order summary counts | `useSAPPlanSummary()` |
| `GET /sap/plan-dashboard/details/` | Full order list with components | `useSAPPlanDetails()` |
| `GET /sap/plan-dashboard/procurement/` | Procurement needs | `useSAPPlanProcurement()` |
| `GET /sap/plan-dashboard/sku/:docEntry/` | Single order detail | `useSAPPlanSKUDetail(docEntry)` |

## Key Types

```typescript
SummaryOrder {
  prod_order_entry, prod_order_num: number
  sku_code, sku_name: string
  planned_qty, completed_qty: number
  status: 'planned' | 'released'
  total_components, components_with_shortfall: number
}

ProcurementItem {
  component_code, component_name: string
  total_required_qty, stock_on_hand: number
  shortfall_qty, suggested_purchase_qty: number
  default_vendor: string
  vendor_lead_time: number
}

BOMComponent {
  component_code, component_name: string
  component_planned_qty, component_remaining_qty: number
  stock_on_hand, net_available, shortfall_qty: number
  stock_status: 'sufficient' | 'partial' | 'stockout'
}
```

## Dependencies

- `@/config/constants` — API endpoints
- `@/shared/components` — UI primitives, DashboardHeader
- `@/core/api` — API client
- `@/core/auth` — Permission hooks
- No cross-module imports

## Related Documentation

- [SAP Plan Dashboard Design](../../../docs/modules/sap-plan-dashboard.md)
- [API Endpoints](../../../docs/api/endpoints.md#sap-plan-dashboard)
- [Data Models](../../../docs/architecture/data-models.md)
