# API Endpoints Reference

Complete reference of all API endpoints used in the Factory Management System. All endpoints are defined in `src/config/constants/api.constants.ts`.

**Base URL:** Configured via `VITE_API_BASE_URL` environment variable (default: `http://localhost:3000/api/v1`)

---

## Authentication & Accounts

### Auth

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| POST | `/accounts/login/` | User login with email/password | `AUTH.LOGIN` |
| POST | `/accounts/logout/` | Invalidate current session | `AUTH.LOGOUT` |
| POST | `/accounts/token/refresh/` | Refresh JWT access token | `AUTH.REFRESH` |
| GET | `/accounts/me/` | Get current user profile and permissions | `AUTH.ME` |
| POST | `/accounts/change-password/` | Change user password | `AUTH.CHANGE_PASSWORD` |

### Accounts

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/accounts/departments` | List all departments | `ACCOUNTS.DEPARTMENTS` |
| GET | `/accounts/users/` | List all users | `ACCOUNTS.USERS` |

**Types:** `User`, `UserCompany`, `LoginCredentials`, `LoginResponse`, `RefreshTokenResponse` — see `src/core/auth/types/auth.types.ts`

---

## Gate Entry Management

### Vehicle Management

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/vehicle-management/transporters/` | List all transporters (paginated) | `VEHICLE.TRANSPORTERS` |
| GET | `/vehicle-management/transporters/names/` | Transporter name dropdown | `VEHICLE.TRANSPORTER_NAMES` |
| GET/PUT/DELETE | `/vehicle-management/transporters/:id/` | Single transporter CRUD | `VEHICLE.TRANSPORTER_BY_ID(id)` |
| GET | `/vehicle-management/vehicle-types/` | List vehicle types | `VEHICLE.VEHICLE_TYPES` |
| GET | `/vehicle-management/vehicles/` | List all vehicles (paginated) | `VEHICLE.VEHICLES` |
| GET | `/vehicle-management/vehicles/names/` | Vehicle name dropdown | `VEHICLE.VEHICLE_NAMES` |
| GET/PUT/DELETE | `/vehicle-management/vehicles/:id/` | Single vehicle CRUD | `VEHICLE.VEHICLE_BY_ID(id)` |
| GET | `/vehicle-management/vehicle-entries/` | List all vehicle entries | `VEHICLE.VEHICLE_ENTRIES` |
| GET/PUT | `/vehicle-management/vehicle-entries/:id/` | Single vehicle entry | `VEHICLE.VEHICLE_ENTRY_BY_ID(id)` |
| GET | `/vehicle-management/vehicle-entries/count/` | Entry count by status | `VEHICLE.VEHICLE_ENTRIES_COUNT` |
| GET | `/vehicle-management/vehicle-entries/list-by-status/` | Filter entries by status | `VEHICLE.VEHICLE_ENTRIES_BY_STATUS` |

### Driver Management

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/driver-management/drivers/` | List all drivers (paginated) | `DRIVER.DRIVERS` |
| GET | `/driver-management/drivers/names/` | Driver name dropdown | `DRIVER.DRIVER_NAMES` |
| GET/PUT/DELETE | `/driver-management/drivers/:id/` | Single driver CRUD | `DRIVER.DRIVER_BY_ID(id)` |

### Security Checks

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| POST | `/security-checks/gate-entries/:entryId/security/` | Create security check | `SECURITY.GATE_ENTRY_SECURITY(entryId)` |
| GET | `/security-checks/gate-entries/:entryId/security/view` | View security check | `SECURITY.GATE_ENTRY_SECURITY_VIEW(entryId)` |
| POST | `/security-checks/security/:securityId/submit/` | Submit security check | `SECURITY.SUBMIT(securityId)` |

### Purchase Orders

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/po/open-pos/` | List open POs (optional `?supplier_code=`) | `PO.OPEN_POS(supplierCode?)` |
| GET | `/po/warehouses/` | List warehouses | `PO.WAREHOUSES` |
| GET | `/po/vendors/` | List vendors/suppliers | `PO.VENDORS` |

### Raw Material Gate In

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| POST | `/raw-material-gatein/gate-entries/:entryId/po-receipts/` | Create PO receipt for entry | `RAW_MATERIAL_GATEIN.PO_RECEIPTS(entryId)` |
| GET | `/raw-material-gatein/gate-entries/:entryId/po-receipts/view` | View PO receipt | `RAW_MATERIAL_GATEIN.PO_RECEIPTS_VIEW(entryId)` |

### Weighment

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| POST | `/weighment/gate-entries/:entryId/weighment/` | Create/update weighment | `WEIGHMENT.CREATE(entryId)` |
| GET | `/weighment/gate-entries/:entryId/weighment/view` | View weighment data | `WEIGHMENT.GET(entryId)` |

### Daily Needs Gate In

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/daily-needs-gatein/gate-entries/daily-need/categories/` | List daily need categories | `DAILY_NEEDS_GATEIN.CATEGORIES` |
| GET | `/daily-needs-gatein/gate-entries/:entryId/daily-need/` | Get daily need details | `DAILY_NEEDS_GATEIN.GET(entryId)` |
| POST | `/daily-needs-gatein/gate-entries/:entryId/daily-need/` | Create daily need entry | `DAILY_NEEDS_GATEIN.CREATE(entryId)` |
| GET | `/gate-core/daily-need-gate-entry/:entryId/` | Full view of daily need entry | `DAILY_NEEDS_GATEIN.FULL_VIEW(entryId)` |
| POST | `/daily-needs-gatein/gate-entries/:entryId/complete/` | Complete daily need entry | `DAILY_NEEDS_GATEIN.COMPLETE(entryId)` |

### Gate Core

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/gate-core/raw-material-gate-entry/:entryId/` | Full view of raw material entry | `GATE_CORE.FULL_VIEW(entryId)` |
| POST | `/raw-material-gatein/gate-entries/:entryId/complete/` | Complete raw material entry | `GATE_CORE.COMPLETE(entryId)` |

### Gate Attachments

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/gate-core/gate-attachments/:entryId/` | List/upload attachments for entry | `GATE_ATTACHMENTS.BY_ENTRY(entryId)` |

---

## Quality Control (V2)

### Arrival Slips

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/quality-control/arrival-slips/` | List all arrival slips | `QUALITY_CONTROL_V2.ARRIVAL_SLIP_LIST` |
| POST | `/quality-control/po-items/:poItemReceiptId/arrival-slip/` | Create arrival slip | `QUALITY_CONTROL_V2.ARRIVAL_SLIP_CREATE(id)` |
| GET | `/quality-control/po-items/:poItemReceiptId/arrival-slip/` | Get arrival slip by PO item | `QUALITY_CONTROL_V2.ARRIVAL_SLIP_GET(id)` |
| GET/PUT/DELETE | `/quality-control/arrival-slips/:slipId/` | Single arrival slip CRUD | `QUALITY_CONTROL_V2.ARRIVAL_SLIP_BY_ID(id)` |
| POST | `/quality-control/arrival-slips/:slipId/submit/` | Submit arrival slip | `QUALITY_CONTROL_V2.ARRIVAL_SLIP_SUBMIT(id)` |
| POST | `/quality-control/arrival-slips/:slipId/send-back/` | Send back arrival slip to gate | `QUALITY_CONTROL_V2.ARRIVAL_SLIP_SEND_BACK(id)` |

### Material Types

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/quality-control/material-types/` | List material types | `QUALITY_CONTROL_V2.MATERIAL_TYPES` |
| GET/PUT/DELETE | `/quality-control/material-types/:id/` | Single material type CRUD | `QUALITY_CONTROL_V2.MATERIAL_TYPE_BY_ID(id)` |
| GET | `/quality-control/material-types/:id/parameters/` | Parameters for material type | `QUALITY_CONTROL_V2.MATERIAL_TYPE_PARAMETERS(id)` |

### QC Parameters

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/PUT/DELETE | `/quality-control/parameters/:id/` | Single QC parameter CRUD | `QUALITY_CONTROL_V2.QC_PARAMETER_BY_ID(id)` |

### Inspections

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/quality-control/inspections/` | List all inspections | `QUALITY_CONTROL_V2.INSPECTIONS_LIST` |
| GET | `/quality-control/inspections/pending/` | Pending inspections | `QUALITY_CONTROL_V2.PENDING_INSPECTIONS` |
| GET | `/quality-control/inspections/draft/` | Draft inspections | `QUALITY_CONTROL_V2.DRAFT_INSPECTIONS` |
| GET | `/quality-control/inspections/actionable/` | Actionable inspections | `QUALITY_CONTROL_V2.ACTIONABLE_INSPECTIONS` |
| GET | `/quality-control/inspections/awaiting-chemist/` | Awaiting QA chemist review | `QUALITY_CONTROL_V2.AWAITING_CHEMIST` |
| GET | `/quality-control/inspections/awaiting-qam/` | Awaiting QA manager review | `QUALITY_CONTROL_V2.AWAITING_QAM` |
| GET | `/quality-control/inspections/completed/` | Completed inspections | `QUALITY_CONTROL_V2.COMPLETED_INSPECTIONS` |
| GET | `/quality-control/inspections/rejected/` | Rejected inspections | `QUALITY_CONTROL_V2.REJECTED_INSPECTIONS` |
| GET | `/quality-control/inspections/counts/` | Inspection count by status | `QUALITY_CONTROL_V2.INSPECTION_COUNTS` |
| GET/PUT | `/quality-control/inspections/:id/` | Single inspection detail/update | `QUALITY_CONTROL_V2.INSPECTION_BY_ID(id)` |
| GET | `/quality-control/arrival-slips/:slipId/inspection/` | Inspection for arrival slip | `QUALITY_CONTROL_V2.INSPECTION_FOR_SLIP(id)` |
| GET/POST | `/quality-control/inspections/:id/parameters/` | Inspection parameter results | `QUALITY_CONTROL_V2.INSPECTION_PARAMETERS(id)` |
| POST | `/quality-control/inspections/:id/submit/` | Submit inspection | `QUALITY_CONTROL_V2.INSPECTION_SUBMIT(id)` |

### Approvals

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| POST | `/quality-control/inspections/:id/approve/chemist/` | QA chemist approval | `QUALITY_CONTROL_V2.APPROVE_CHEMIST(id)` |
| POST | `/quality-control/inspections/:id/approve/qam/` | QA manager approval | `QUALITY_CONTROL_V2.APPROVE_QAM(id)` |
| POST | `/quality-control/inspections/:id/reject/` | Reject inspection | `QUALITY_CONTROL_V2.REJECT_INSPECTION(id)` |

**Types:** `ArrivalSlipStatus`, `InspectionWorkflowStatus`, `InspectionFinalStatus`, `MaterialType`, `QCParameter`, `ParameterResult` — see `src/modules/qc/types/qc.types.ts`

---

## GRPO (Goods Receipt Purchase Order)

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/grpo/pending/` | Pending GRPO entries | `GRPO.PENDING` |
| GET | `/grpo/preview/:vehicleEntryId/` | Preview GRPO for vehicle entry | `GRPO.PREVIEW(vehicleEntryId)` |
| POST | `/grpo/post/` | Post GRPO to SAP | `GRPO.POST` |
| GET | `/grpo/history/` | GRPO posting history | `GRPO.HISTORY` |
| GET | `/grpo/:postingId/` | GRPO detail | `GRPO.DETAIL(postingId)` |
| GET/POST | `/grpo/:postingId/attachments/` | List/upload GRPO attachments | `GRPO.ATTACHMENTS(postingId)` |
| DELETE | `/grpo/:postingId/attachments/:attachmentId/` | Delete attachment | `GRPO.ATTACHMENT_DELETE(postingId, attachmentId)` |
| POST | `/grpo/:postingId/attachments/:attachmentId/retry/` | Retry failed SAP attachment upload | `GRPO.ATTACHMENT_RETRY(postingId, attachmentId)` |

**Types:** `GRPOHistoryEntry`, `PreviewPOReceipt`, `GRPOAttachment` — see `src/modules/grpo/types/grpo.types.ts`

---

## Notifications

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/notifications/` | List notifications | `NOTIFICATIONS.LIST` |
| GET | `/notifications/:id/` | Notification detail | `NOTIFICATIONS.DETAIL(id)` |
| GET | `/notifications/unread-count/` | Unread notification count | `NOTIFICATIONS.UNREAD_COUNT` |
| POST | `/notifications/mark-read/` | Mark notifications as read | `NOTIFICATIONS.MARK_READ` |
| GET/PUT | `/notifications/preferences/` | Notification preferences | `NOTIFICATIONS.PREFERENCES` |
| POST | `/notifications/test/` | Send test notification | `NOTIFICATIONS.TEST` |
| POST | `/notifications/send/` | Send notification to users | `NOTIFICATIONS.SEND` |
| POST | `/notifications/devices/register/` | Register FCM device token | `NOTIFICATIONS.DEVICES.REGISTER` |
| POST | `/notifications/devices/unregister/` | Unregister device token | `NOTIFICATIONS.DEVICES.UNREGISTER` |

**Types:** `SendNotificationRequest`, `CompanyUser` — see `src/modules/notifications/types/sendNotification.types.ts`

---

## Production Planning

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/production-planning/` | List production plans | `PRODUCTION_PLANNING.LIST` |
| POST | `/production-planning/` | Create production plan | `PRODUCTION_PLANNING.CREATE` |
| GET | `/production-planning/summary/` | Planning summary/dashboard data | `PRODUCTION_PLANNING.SUMMARY` |
| GET/PUT/DELETE | `/production-planning/:planId/` | Single plan CRUD | `PRODUCTION_PLANNING.DETAIL(planId)` |
| POST | `/production-planning/:planId/post-to-sap/` | Post plan to SAP | `PRODUCTION_PLANNING.POST_TO_SAP(planId)` |
| POST | `/production-planning/:planId/close/` | Close production plan | `PRODUCTION_PLANNING.CLOSE(planId)` |
| GET/POST | `/production-planning/:planId/materials/` | Plan materials (BOM) | `PRODUCTION_PLANNING.MATERIALS(planId)` |
| DELETE | `/production-planning/:planId/materials/:materialId/` | Delete plan material | `PRODUCTION_PLANNING.MATERIAL_DELETE(planId, materialId)` |
| GET/POST | `/production-planning/:planId/weekly-plans/` | Weekly plan breakdown | `PRODUCTION_PLANNING.WEEKLY_PLANS(planId)` |
| GET/PUT | `/production-planning/:planId/weekly-plans/:weekId/` | Single weekly plan | `PRODUCTION_PLANNING.WEEKLY_PLAN_DETAIL(planId, weekId)` |
| GET/POST | `/production-planning/weekly-plans/:weekId/daily-entries/` | Daily entries for week | `PRODUCTION_PLANNING.DAILY_ENTRIES(weekId)` |
| GET/PUT/DELETE | `/production-planning/weekly-plans/:weekId/daily-entries/:entryId/` | Single daily entry | `PRODUCTION_PLANNING.DAILY_ENTRY_DETAIL(weekId, entryId)` |
| GET | `/production-planning/daily-entries/` | All daily entries (cross-week) | `PRODUCTION_PLANNING.DAILY_ENTRIES_ALL` |
| GET | `/production-planning/dropdown/items/` | Item dropdown | `PRODUCTION_PLANNING.DROPDOWN_ITEMS` |
| GET | `/production-planning/dropdown/uom/` | UOM dropdown | `PRODUCTION_PLANNING.DROPDOWN_UOM` |
| GET | `/production-planning/dropdown/warehouses/` | Warehouse dropdown | `PRODUCTION_PLANNING.DROPDOWN_WAREHOUSES` |
| GET | `/production-planning/dropdown/bom/` | BOM dropdown | `PRODUCTION_PLANNING.DROPDOWN_BOM` |

**Types:** `ProductionPlan`, `PlanMaterial`, `WeeklyPlan`, `DailyProductionEntry`, `BOMComponent` — see `src/modules/production/planning/types/planning.types.ts`

---

## SAP Plan Dashboard

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/sap/plan-dashboard/summary/` | Dashboard summary with order counts | `SAP_PLAN_DASHBOARD.SUMMARY` |
| GET | `/sap/plan-dashboard/details/` | Detailed order list with components | `SAP_PLAN_DASHBOARD.DETAILS` |
| GET | `/sap/plan-dashboard/procurement/` | Procurement needs and shortfalls | `SAP_PLAN_DASHBOARD.PROCUREMENT` |
| GET | `/sap/plan-dashboard/sku/:docEntry/` | SKU detail for specific order | `SAP_PLAN_DASHBOARD.SKU_DETAIL(docEntry)` |

**Types:** `SummaryOrder`, `DetailOrder`, `ProcurementItem`, `BOMComponent` — see `src/modules/dashboards/sap-plan/types/sap-plan.types.ts`

---

## Production Execution

### Production Lines & Machines

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/production-execution/lines/` | List production lines | `PRODUCTION_EXECUTION.LINES` |
| GET | `/production-execution/lines/:lineId/` | Line detail | `PRODUCTION_EXECUTION.LINE_DETAIL(lineId)` |
| GET | `/production-execution/machines/` | List machines | `PRODUCTION_EXECUTION.MACHINES` |
| GET | `/production-execution/machines/:machineId/` | Machine detail | `PRODUCTION_EXECUTION.MACHINE_DETAIL(machineId)` |

### Checklist Templates

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/production-execution/checklist-templates/` | List checklist templates | `PRODUCTION_EXECUTION.CHECKLIST_TEMPLATES` |
| GET | `/production-execution/checklist-templates/:templateId/` | Template detail | `PRODUCTION_EXECUTION.CHECKLIST_TEMPLATE_DETAIL(templateId)` |

### Production Runs

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/production-execution/runs/` | List/create production runs | `PRODUCTION_EXECUTION.RUNS` |
| GET/PUT | `/production-execution/runs/:runId/` | Run detail/update | `PRODUCTION_EXECUTION.RUN_DETAIL(runId)` |
| POST | `/production-execution/runs/:runId/complete/` | Complete a production run | `PRODUCTION_EXECUTION.RUN_COMPLETE(runId)` |

### Hourly Production Logs

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/production-execution/runs/:runId/logs/` | List/add hourly logs | `PRODUCTION_EXECUTION.RUN_LOGS(runId)` |
| GET/PUT/DELETE | `/production-execution/runs/:runId/logs/:logId/` | Single log CRUD | `PRODUCTION_EXECUTION.RUN_LOG_DETAIL(runId, logId)` |

### Machine Breakdowns

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/production-execution/runs/:runId/breakdowns/` | List/add breakdowns | `PRODUCTION_EXECUTION.RUN_BREAKDOWNS(runId)` |
| GET/PUT/DELETE | `/production-execution/runs/:runId/breakdowns/:breakdownId/` | Single breakdown CRUD | `PRODUCTION_EXECUTION.RUN_BREAKDOWN_DETAIL(runId, breakdownId)` |

### Materials (Yield Tracking)

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/production-execution/runs/:runId/materials/` | List/add material usage | `PRODUCTION_EXECUTION.RUN_MATERIALS(runId)` |
| GET/PUT/DELETE | `/production-execution/runs/:runId/materials/:materialId/` | Single material CRUD | `PRODUCTION_EXECUTION.RUN_MATERIAL_DETAIL(runId, materialId)` |

### Machine Runtime

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/production-execution/runs/:runId/machine-runtime/` | List/add machine runtime | `PRODUCTION_EXECUTION.RUN_MACHINE_RUNTIME(runId)` |
| GET/PUT/DELETE | `/production-execution/runs/:runId/machine-runtime/:runtimeId/` | Single runtime CRUD | `PRODUCTION_EXECUTION.RUN_MACHINE_RUNTIME_DETAIL(runId, runtimeId)` |

### Manpower

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/production-execution/runs/:runId/manpower/` | List/add manpower records | `PRODUCTION_EXECUTION.RUN_MANPOWER(runId)` |
| GET/PUT/DELETE | `/production-execution/runs/:runId/manpower/:manpowerId/` | Single manpower CRUD | `PRODUCTION_EXECUTION.RUN_MANPOWER_DETAIL(runId, manpowerId)` |

### Line Clearance

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/production-execution/line-clearance/` | List/create clearance records | `PRODUCTION_EXECUTION.LINE_CLEARANCE` |
| GET/PUT | `/production-execution/line-clearance/:clearanceId/` | Single clearance CRUD | `PRODUCTION_EXECUTION.LINE_CLEARANCE_DETAIL(clearanceId)` |
| POST | `/production-execution/line-clearance/:clearanceId/submit/` | Submit clearance | `PRODUCTION_EXECUTION.LINE_CLEARANCE_SUBMIT(clearanceId)` |
| POST | `/production-execution/line-clearance/:clearanceId/approve/` | Approve clearance | `PRODUCTION_EXECUTION.LINE_CLEARANCE_APPROVE(clearanceId)` |

### Machine Checklists

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/production-execution/machine-checklists/` | List/create checklist entries | `PRODUCTION_EXECUTION.MACHINE_CHECKLISTS` |
| GET/PUT | `/production-execution/machine-checklists/:entryId/` | Single checklist entry | `PRODUCTION_EXECUTION.MACHINE_CHECKLIST_DETAIL(entryId)` |
| POST | `/production-execution/machine-checklists/bulk/` | Bulk create checklists | `PRODUCTION_EXECUTION.MACHINE_CHECKLISTS_BULK` |

### Waste Management

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET/POST | `/production-execution/waste/` | List/create waste records | `PRODUCTION_EXECUTION.WASTE` |
| GET/PUT | `/production-execution/waste/:wasteId/` | Single waste record | `PRODUCTION_EXECUTION.WASTE_DETAIL(wasteId)` |
| POST | `/production-execution/waste/:wasteId/approve/engineer/` | Engineer approval | `PRODUCTION_EXECUTION.WASTE_APPROVE_ENGINEER(wasteId)` |
| POST | `/production-execution/waste/:wasteId/approve/am/` | Area manager approval | `PRODUCTION_EXECUTION.WASTE_APPROVE_AM(wasteId)` |
| POST | `/production-execution/waste/:wasteId/approve/store/` | Store approval | `PRODUCTION_EXECUTION.WASTE_APPROVE_STORE(wasteId)` |
| POST | `/production-execution/waste/:wasteId/approve/hod/` | HOD approval | `PRODUCTION_EXECUTION.WASTE_APPROVE_HOD(wasteId)` |

### Reports

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| GET | `/production-execution/reports/daily-production/` | Daily production report | `PRODUCTION_EXECUTION.REPORTS_DAILY` |
| GET | `/production-execution/reports/yield/:runId/` | Yield report for run | `PRODUCTION_EXECUTION.REPORTS_YIELD(runId)` |
| GET | `/production-execution/reports/analytics/` | Production analytics | `PRODUCTION_EXECUTION.REPORTS_ANALYTICS` |

**Types:** `ProductionRun`, `ProductionLine`, `Machine`, `ProductionLog`, `MachineBreakdown`, `LineClearance`, `MachineChecklist`, `WasteManagement` — see `src/modules/production/execution/types/execution.types.ts`

---

## Legacy Endpoints

### Quality Control (V1) — Deprecated

| Method | Endpoint | Description | Constants Key |
|--------|----------|-------------|---------------|
| POST | `/quality-control/po-items/:poItemId/qc/` | Create QC record | `QUALITY_CONTROL.CREATE(poItemId)` |
| GET | `/quality-control/po-items/:poItemId/qc/view` | View QC record | `QUALITY_CONTROL.GET(poItemId)` |

> **Note:** V1 endpoints are superseded by `QUALITY_CONTROL_V2`. Use V2 for all new development.

---

## API Configuration

```typescript
// src/config/constants/api.constants.ts
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,    // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,  // 1 second
};
```

## HTTP Status Codes

| Code | Constant | Description |
|------|----------|-------------|
| 200 | `HTTP_STATUS.OK` | Success |
| 201 | `HTTP_STATUS.CREATED` | Resource created |
| 204 | `HTTP_STATUS.NO_CONTENT` | Success, no response body |
| 400 | `HTTP_STATUS.BAD_REQUEST` | Validation error |
| 401 | `HTTP_STATUS.UNAUTHORIZED` | Token expired/invalid |
| 403 | `HTTP_STATUS.FORBIDDEN` | Insufficient permissions |
| 404 | `HTTP_STATUS.NOT_FOUND` | Resource not found |
| 500 | `HTTP_STATUS.INTERNAL_SERVER_ERROR` | Server error |

## Authentication Headers

All authenticated requests include:
- `Authorization: Bearer <access_token>` — JWT access token
- `Company-Code: <company_code>` — Multi-tenant company identifier

See [API Overview](./overview.md) for client architecture and React Query patterns.
See [Authentication](./authentication.md) for token flow and permission system.
