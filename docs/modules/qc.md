# QC Module

The Quality Control module manages inspections of received materials through a multi-role approval workflow.

## Overview

After an arrival slip is created in the gate module, QC inspectors create inspections against it. Inspections go through a three-role approval chain: Inspector → QA Chemist → QA Manager. The QA Manager sets the final status (Accepted, Rejected, or Hold).

## Approval Workflow

```
Create Inspection (Inspector)
        ↓
      DRAFT
        ↓
    SUBMITTED ──────── Inspector submits for review
        ↓
QA_CHEMIST_APPROVED ── Chemist reviews and approves
        ↓
  QAM_APPROVED ──────── Manager reviews, sets final status
        ↓
    COMPLETED

Final Status: ACCEPTED | REJECTED | HOLD
```

## Module Structure

```
src/modules/qc/
├── module.config.tsx          # 7 routes, role-based permissions
├── api/
│   ├── arrivalSlip/           # Arrival slip lookup for QC
│   ├── inspection/            # Inspection CRUD + approval actions
│   ├── materialType/          # Material type CRUD
│   └── qcParameter/           # QC parameter definitions
├── components/
│   └── MaterialTypeSelect.tsx # Material type dropdown with create dialog
├── constants/
│   └── qc.constants.ts       # Workflow configs, parameter type labels
├── hooks/
│   └── useInspectionPermissions.ts  # Role-based permission logic
├── pages/
│   ├── QCDashboardPage.tsx
│   ├── PendingInspectionsPage.tsx
│   ├── InspectionDetailPage.tsx    # Create + view + edit
│   ├── ApprovalQueuePage.tsx
│   └── masterdata/
│       ├── MaterialTypesPage.tsx
│       └── QCParametersPage.tsx
└── types/
    └── qc.types.ts
```

## Routes & Permissions

| Route | Permission | Description |
|---|---|---|
| `/qc` | `inspection.view` or `arrival_slip.view` | Dashboard |
| `/qc/pending` | `inspection.view` | Pending inspections |
| `/qc/inspections/:slipId/new` | `inspection.create` | Create inspection |
| `/qc/inspections/:id` | `inspection.view` | View/edit inspection |
| `/qc/approvals` | `approve_as_chemist` or `approve_as_qam` | Approval queue |
| `/qc/master/material-types` | `manage_material_types` | Material types |
| `/qc/master/parameters` | `manage_qc_parameters` | QC parameters |

## Parameter Types

QC parameters can be one of four types:

| Type | Description | Example |
|---|---|---|
| `NUMERIC` | Single numeric value | pH: 7.2 |
| `TEXT` | Free-text result | Color: "Clear" |
| `BOOLEAN` | Pass/Fail | Odor test: Pass |
| `RANGE` | Value within min/max spec | Moisture: 2.5% (spec: 1-3%) |

## Constants Architecture

QC has both **module-internal** and **cross-module** constants:

- **Internal** (in `qc/constants/`): `WORKFLOW_STATUS`, `WORKFLOW_STATUS_CONFIG`, `FINAL_STATUS_CONFIG`, `PARAMETER_TYPE_LABELS`
- **Shared** (in `@/config/constants/`): `FINAL_STATUS`, `ARRIVAL_SLIP_STATUS` — used by gate and grpo too

See [Module Boundaries](../architecture/module-boundaries.md) for why this split exists.

## Local Documentation

See also: [`src/modules/qc/docs/README.md`](../../src/modules/qc/docs/README.md)

## Related

- [Modules Overview](./overview.md)
- [Gate Module](./gate.md) - Creates arrival slips that QC inspects
- [GRPO Module](./grpo.md) - Shows QC status on receipt items
