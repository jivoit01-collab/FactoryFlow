# Gate Module

The largest module — manages all vehicle and material entries at the factory gate.

## Entry Types

| Type | Route Prefix | Wizard Steps |
|---|---|---|
| Raw Materials | `/gate/raw-materials` | 6 (Vehicle, Security, PO, Arrival Slip, Weighment, Review) |
| Daily Needs | `/gate/daily-needs` | 4 (Vehicle, Security, Details, Review) |
| Maintenance | `/gate/maintenance` | 4 (Vehicle, Security, Details, Review) |
| Construction | `/gate/construction` | 4 (Vehicle, Security, Details, Review) |
| Person Gate-In | `/gate/visitor-labour` | Single-page entry + dashboard |

## Structure

```
gate/
├── module.config.tsx          # 43 routes
├── api/                       # 13 API feature groups
│   ├── arrivalSlip/
│   ├── construction/
│   ├── dailyNeed/
│   ├── department/
│   ├── driver/
│   ├── gateEntryFullView/
│   ├── maintenance/
│   ├── personGateIn/
│   ├── po/
│   ├── securityCheck/
│   ├── transporter/
│   ├── vehicle/
│   └── weighment/
├── components/
│   ├── forms/                 # VehicleDriverFormShell
│   ├── personGateIn/          # Visitor/Labour components
│   ├── VehicleSelect.tsx
│   ├── DriverSelect.tsx
│   ├── TransporterSelect.tsx
│   ├── CategorySelect.tsx
│   ├── DepartmentSelect.tsx
│   └── VendorSelect.tsx
├── constants/
│   └── entryFlowConfig.ts    # Config-driven entry flow definitions
├── pages/
│   ├── shared/                # SharedStep1Page (vehicle/driver + security), etc.
│   ├── rawMaterialPages/
│   ├── dailyNeedsPages/
│   ├── constructionPages/
│   ├── maintenancePages/
│   └── personGateInPages/
├── hooks/
├── schemas/
└── utils/
```

## Key Patterns

### Config-Driven Wizards

The first step is shared across all 4 entry types via `SharedStep1Page`, which collects vehicle, driver, and security-check details together (the former separate Security Check step was merged into it). Each entry type passes a config object:

```typescript
// entryFlowConfig.ts
export const RAW_MATERIALS_FLOW: EntryFlowConfig = {
  entryType: 'RAW_MATERIAL',
  routePrefix: '/gate/raw-materials',
  headerTitle: 'Raw Material Entry',
  totalSteps: 6,
}
```

Step3, ReviewPage, and domain-specific pages remain separate since their logic differs per entry type.

### SearchableSelect Components

All Select components (Vehicle, Driver, Transporter, Category, Department, Vendor) use the shared `SearchableSelect` from `@/shared/components`. Each wraps it with module-specific API hooks and rendering.

### Entry Status Flow

```
DRAFT → IN_PROGRESS → QC_COMPLETED → COMPLETED
  ↓         ↓                            ↓
CANCELLED  REJECTED ←───────────────────┘
```

## API Groups

Each API group follows the pattern: `{feature}.api.ts` (Axios calls) + `{feature}.queries.ts` (React Query hooks).

| API Group | Purpose |
|---|---|
| vehicle | Vehicle CRUD, vehicle types, names |
| driver | Driver CRUD, names |
| transporter | Transporter CRUD, names |
| po | Purchase orders, vendors |
| arrivalSlip | Arrival slip CRUD |
| securityCheck | Security check CRUD |
| weighment | Weighment CRUD |
| gateEntryFullView | Full entry view, entry completion |
| construction | Construction entry details |
| dailyNeed | Daily needs details, categories |
| maintenance | Maintenance details |
| department | Department lookup |
| personGateIn | Visitor/labour entries, gates, contractors |

## BST Out (warehouse-driven)

The gate hosts a **BST Out** submodule (`/gate/bst-out`, sidebar → Gate → BST Out)
for the warehouse Branch Stock Transfer flow: it lists transfers approved by the
warehouse and awaiting gate-out, lets the gate person verify the warehouse
approval + bill/scanned quantities, and mark the vehicle out (→ In Transit). It is
a thin gate view over the `warehouse` module's BST API — see
[`src/docs/bst_flow.md`](../../../docs/bst_flow.md). (An older gate-initiated BST —
`gate_core` `BSTGateOut/In/Return` + the empty-vehicle "BST" reason — has been
superseded and its dormant UI removed.)

## Dependencies

- `@/config/constants` — Status constants, entry types, vehicle constants
- `@/shared/components` — SearchableSelect, UI primitives
- `@/shared/hooks` — useScrollToError, useFormErrors, useBoxScanQueue
- `@/core/api` — API client
- `@/core/auth` — Permission hooks
- `@/modules/warehouse` — BST Out submodule reuses the warehouse BST API + `BSTBillTable`
