# QC Module

Quality Control — manages inspections of received materials through a multi-role approval workflow.

## Routes

| Route | Page | Permission |
|---|---|---|
| `/qc` | QCDashboardPage | `inspection.view` or `arrival_slip.view` |
| `/qc/pending` | PendingInspectionsPage | `inspection.view` |
| `/qc/inspections/:slipId/new` | InspectionDetailPage (create) | `inspection.create` |
| `/qc/inspections/:inspectionId` | InspectionDetailPage (view/edit) | `inspection.view` |
| `/qc/approvals` | ApprovalQueuePage | `approve_as_chemist` or `approve_as_qam` |
| `/qc/master/material-types` | MaterialTypesPage | `manage_material_types` |
| `/qc/master/parameters` | QCParametersPage | `manage_qc_parameters` |

## Structure

```
qc/
├── module.config.tsx
├── api/
│   ├── arrivalSlip/         # Arrival slip queries for QC
│   ├── inspection/          # Inspection CRUD + approvals
│   ├── materialType/        # Material type CRUD
│   └── qcParameter/         # QC parameter definitions
├── components/
│   ├── MaterialTypeSelect.tsx
│   └── index.ts
├── constants/
│   └── qc.constants.ts     # Workflow status configs, parameter types
├── hooks/
│   └── useInspectionPermissions.ts
├── pages/
│   ├── QCDashboardPage.tsx
│   ├── PendingInspectionsPage.tsx
│   ├── InspectionDetailPage.tsx
│   ├── ApprovalQueuePage.tsx
│   └── masterdata/
│       ├── MaterialTypesPage.tsx
│       └── QCParametersPage.tsx
└── types/
    └── qc.types.ts
```

## Approval Workflow

```
                    Create Inspection
                          ↓
    ┌──────────────── DRAFT ──────────────────┐
    │                    ↓                     │
    │              SUBMITTED                   │
    │                    ↓                     │
    │         QA_CHEMIST_APPROVED              │
    │                    ↓                     │
    │            QAM_APPROVED                  │
    │                    ↓                     │
    │              COMPLETED                   │
    └──────────────────────────────────────────┘

    Final Status: ACCEPTED | REJECTED | HOLD
```

Three roles participate:
1. **Inspector** — Creates inspection, enters parameter results
2. **QA Chemist** — Reviews and approves/rejects
3. **QA Manager (QAM)** — Final approval, sets final status (accepted/rejected/hold)

## Key Types

- `Inspection` — Full inspection record with workflow_status, final_status, parameter_results
- `ParameterResult` — Individual QC parameter test result (numeric, text, boolean, range)
- `MaterialType` — Material classification (code + name)
- `QCParameter` — Parameter definition with spec limits and type

## QC-Internal vs Shared Constants

Constants used **only within QC** live in `qc/constants/`:
- `WORKFLOW_STATUS` (DRAFT, SUBMITTED, QA_CHEMIST_APPROVED, QAM_APPROVED, COMPLETED)
- `WORKFLOW_STATUS_CONFIG` (labels, colors, icons)
- `FINAL_STATUS_CONFIG` (labels, colors, icons)
- `PARAMETER_TYPE_LABELS`

Constants used **across modules** live in `@/config/constants/status.constants.ts`:
- `FINAL_STATUS` (PENDING, ACCEPTED, REJECTED, HOLD)
- `ARRIVAL_SLIP_STATUS` (DRAFT, SUBMITTED, REJECTED)

## Dependencies

- `@/config/constants` — FINAL_STATUS, ARRIVAL_SLIP_STATUS
- `@/shared/components` — SearchableSelect, UI primitives
- `@/core/api` — API client
- `@/core/auth` — Permission hooks
- No other module imports
