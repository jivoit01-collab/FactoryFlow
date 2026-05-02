# Backend Database Migration/Table Audit

Backend repo audited: `../factory_app_v2`

Audit date: 2026-05-01

Database: configured PostgreSQL database from backend `.env`

Command context: `DEBUG=False` override was used because backend `.env` has `DEBUG=release`, which is not a valid boolean for `python-decouple`.

## Executive Summary

Repair completed on 2026-05-01.

Resolved schema issues:

- `barcode_box` was recreated from the current Django `barcode.Box` model.
- `production_execution_lineclearance.production_incharge_sign` was added from the current Django `LineClearance` model.
- Current Django model audit now reports no missing managed model tables and no missing managed model columns.
- Barcode read endpoints verified with HTTP 200: boxes, active boxes, pallets, active pallets, loose stock, scan history, and print history.

Remaining historical data issue:

- The recreated `barcode_box` table has `0` rows because the original table data was already gone.
- Surviving child rows still reference missing historical boxes: `barcode_boxmovement.box_id` has `1063` orphan rows, `barcode_loosestock.source_box_id` has `1` orphan row, and `barcode_loosestock.repacked_into_box_id` has `1` orphan row.
- Restored child foreign keys were added as `NOT VALID`, so new writes are protected while old orphaned rows remain available for audit/recovery decisions.

Restored during the previous repair:

- `accounts_user`
- `accounts_department`
- `accounts_user_groups`
- `accounts_user_user_permissions`
- `auth_permission`
- `auth_group`
- `auth_group_permissions`

Auth/account state after repair:

- `auth_permission`: 414 rows
- `auth_group`: 23 rows
- `auth_group_permissions`: 423 rows
- `accounts_user`: 3 rows after requested user creation
- `accounts_department`: 0 rows

## Migration State Summary

All migrations in the audited apps are marked applied:

| App | Applied | Total | Latest migration |
|---|---:|---:|---|
| accounts | 6 | 6 | 0006_cleanup_stale_permissions |
| admin | 3 | 3 | 0003_logentry_add_action_flag_choices |
| auth | 12 | 12 | 0012_alter_user_first_name_max_length |
| barcode | 4 | 4 | 0004_box_g_weight_box_n_weight |
| company | 3 | 3 | 0003_alter_usercompany_role |
| construction_gatein | 11 | 11 | 0011_constructiongateentry_updated_at |
| contenttypes | 2 | 2 | 0002_remove_content_type_name |
| daily_needs_gatein | 12 | 12 | 0012_dailyneedgateentry_updated_at |
| driver_management | 6 | 6 | 0006_alter_vehicleentry_status |
| gate_core | 5 | 5 | 0005_gateattachment |
| grpo | 11 | 11 | 0011_populate_po_receipts_m2m |
| maintenance_gatein | 9 | 9 | 0009_maintenancegateentry_updated_at |
| notifications | 5 | 5 | 0005_alter_notification_notification_type |
| person_gatein | 7 | 7 | 0007_entrylog_actual_entry_time |
| production_execution | 17 | 17 | 0016_update_line_config_add_name_remove_unique |
| quality_control | 21 | 21 | 0021_alter_productionqcsession_options_and_more |
| raw_material_gatein | 13 | 13 | 0012_merge_20260415_1350 |
| security_checks | 3 | 3 | 0003_alter_securitycheck_vehicle_entry |
| sessions | 1 | 1 | 0001_initial |
| stock_dashboard | 1 | 1 | 0001_initial |
| token_blacklist | 12 | 12 | 0013_alter_blacklistedtoken_options_and_more |
| vehicle_management | 6 | 6 | 0006_alter_vehicle_vehicle_type |
| warehouse | 1 | 1 | 0001_initial |
| weighment | 2 | 2 | 0002_alter_weighment_vehicle_entry |

## Current Expected Model Table Audit

Status is based on current Django model state, including auto-created many-to-many tables.

| App | Model/table | Table | Status |
|---|---|---|---|
| accounts | Department | `accounts_department` | Exists, restored |
| accounts | User | `accounts_user` | Exists, restored |
| accounts | User groups M2M | `accounts_user_groups` | Exists, restored |
| accounts | User permissions M2M | `accounts_user_user_permissions` | Exists, restored |
| auth | Group | `auth_group` | Exists, restored |
| auth | Group permissions M2M | `auth_group_permissions` | Exists, restored |
| auth | Permission | `auth_permission` | Exists, restored |
| barcode | Box | `barcode_box` | Exists, restored |
| barcode | BoxMovement | `barcode_boxmovement` | Exists |
| barcode | LabelPrintLog | `barcode_labelprintlog` | Exists |
| barcode | LooseStock | `barcode_loosestock` | Exists |
| barcode | Pallet | `barcode_pallet` | Exists |
| barcode | PalletMovement | `barcode_palletmovement` | Exists |
| barcode | ScanLog | `barcode_scanlog` | Exists |
| company | Company | `company_company` | Exists |
| company | UserCompany | `company_usercompany` | Exists |
| company | UserRole | `company_userrole` | Exists |
| construction_gatein | ConstructionGateEntry | `construction_gatein_constructiongateentry` | Exists |
| construction_gatein | ConstructionMaterialCategory | `construction_gatein_constructionmaterialcategory` | Exists |
| daily_needs_gatein | CategoryList | `daily_needs_gatein_categorylist` | Exists |
| daily_needs_gatein | DailyNeedGateEntry | `daily_needs_gatein_dailyneedgateentry` | Exists |
| driver_management | Driver | `driver_management_driver` | Exists |
| driver_management | VehicleEntry | `driver_management_vehicleentry` | Exists |
| gate_core | GateAttachment | `gate_core_gateattachment` | Exists |
| gate_core | UnitChoice | `gate_core_unitchoice` | Exists |
| grpo | GRPOAttachment | `grpo_grpoattachment` | Exists |
| grpo | GRPOLinePosting | `grpo_grpolineposting` | Exists |
| grpo | GRPOPosting | `grpo_grpoposting` | Exists |
| grpo | GRPOPosting PO receipts M2M | `grpo_grpoposting_po_receipts` | Exists |
| maintenance_gatein | MaintenanceGateEntry | `maintenance_gatein_maintenancegateentry` | Exists |
| maintenance_gatein | MaintenanceType | `maintenance_gatein_maintenancetype` | Exists |
| notifications | Notification | `notifications_notification` | Exists |
| notifications | UserDevice | `notifications_userdevice` | Exists |
| person_gatein | Contractor | `person_gatein_contractor` | Exists |
| person_gatein | EntryLog | `person_gatein_entrylog` | Exists |
| person_gatein | Gate | `person_gatein_gate` | Exists |
| person_gatein | Labour | `person_gatein_labour` | Exists |
| person_gatein | PersonType | `person_gatein_persontype` | Exists |
| person_gatein | Visitor | `person_gatein_visitor` | Exists |
| production_execution | BreakdownCategory | `production_execution_breakdowncategory` | Exists |
| production_execution | FinalQCCheck | `production_execution_finalqccheck` | Exists |
| production_execution | InProcessQCCheck | `production_execution_inprocessqccheck` | Exists |
| production_execution | LineClearance | `production_execution_lineclearance` | Exists, repaired |
| production_execution | LineClearanceItem | `production_execution_lineclearanceitem` | Exists |
| production_execution | LineSkuConfig | `production_execution_lineskuconfig` | Exists |
| production_execution | Machine | `production_execution_machine` | Exists |
| production_execution | MachineBreakdown | `production_execution_machinebreakdown` | Exists |
| production_execution | MachineChecklistEntry | `production_execution_machinechecklistentry` | Exists |
| production_execution | MachineChecklistTemplate | `production_execution_machinechecklisttemplate` | Exists |
| production_execution | MachineRuntime | `production_execution_machineruntime` | Exists |
| production_execution | ProductionLine | `production_execution_productionline` | Exists |
| production_execution | ProductionManpower | `production_execution_productionmanpower` | Exists |
| production_execution | ProductionMaterialUsage | `production_execution_productionmaterialusage` | Exists |
| production_execution | ProductionRun | `production_execution_productionrun` | Exists |
| production_execution | ProductionRun machines M2M | `production_execution_productionrun_machines` | Exists |
| production_execution | ProductionRunCost | `production_execution_productionruncost` | Exists |
| production_execution | ProductionSegment | `production_execution_productionsegment` | Exists |
| production_execution | ResourceCompressedAir | `production_execution_resourcecompressedair` | Exists |
| production_execution | ResourceElectricity | `production_execution_resourceelectricity` | Exists |
| production_execution | ResourceGas | `production_execution_resourcegas` | Exists |
| production_execution | ResourceLabour | `production_execution_resourcelabour` | Exists |
| production_execution | ResourceMachineCost | `production_execution_resourcemachinecost` | Exists |
| production_execution | ResourceOverhead | `production_execution_resourceoverhead` | Exists |
| production_execution | ResourceWater | `production_execution_resourcewater` | Exists |
| production_execution | WasteLog | `production_execution_wastelog` | Exists |
| quality_control | ArrivalSlipAttachment | `quality_control_arrivalslipattachment` | Exists |
| quality_control | InspectionParameterResult | `quality_control_inspectionparameterresult` | Exists |
| quality_control | MaterialArrivalSlip | `quality_control_materialarrivalslip` | Exists |
| quality_control | MaterialType | `quality_control_materialtype` | Exists |
| quality_control | ProductionQCResult | `quality_control_productionqcresult` | Exists |
| quality_control | ProductionQCSession | `quality_control_productionqcsession` | Exists |
| quality_control | QCParameterMaster | `quality_control_qcparametermaster` | Exists |
| quality_control | RawMaterialInspection | `quality_control_rawmaterialinspection` | Exists |
| raw_material_gatein | POItemReceipt | `raw_material_gatein_poitemreceipt` | Exists |
| raw_material_gatein | POReceipt | `raw_material_gatein_poreceipt` | Exists |
| security_checks | SecurityCheck | `security_checks_securitycheck` | Exists |
| sessions | Session | `django_session` | Exists |
| stock_dashboard | StockAlertLog | `stock_dashboard_stockalertlog` | Exists |
| token_blacklist | BlacklistedToken | `token_blacklist_blacklistedtoken` | Exists |
| token_blacklist | OutstandingToken | `token_blacklist_outstandingtoken` | Exists |
| vehicle_management | Transporter | `vehicle_management_transporter` | Exists |
| vehicle_management | Vehicle | `vehicle_management_vehicle` | Exists |
| vehicle_management | VehicleType | `vehicle_management_vehicletype` | Exists |
| warehouse | BOMRequest | `warehouse_bomrequest` | Exists |
| warehouse | BOMRequestLine | `warehouse_bomrequestline` | Exists |
| warehouse | FinishedGoodsReceipt | `warehouse_finishedgoodsreceipt` | Exists |
| weighment | Weighment | `weighment_weighment` | Exists |

## Missing Expected Tables

None after repair.

## Column Drift

No missing current-model columns after repair.

Current DB still has an extra column on the same table:

- `production_execution_lineclearance.all_checks_passed`

This extra column is not in the current model. Extra columns are less urgent than missing columns because they do not break Django reads/writes.

## Historical Migration Tables Missing But Not Current Problems

These show as missing if we naively list every `CreateModel` operation ever, but they are not expected by the current model state.

| App | Migration-created table | Why missing is okay |
|---|---|---|
| auth | `auth_user` | Project uses custom user model `accounts.User`; Django auth `User` create operation is a no-op. |
| production_execution | `production_execution_productionlog` | Created in `production_execution.0001_initial`, deleted in `production_execution.0005_remove_machinebreakdown_type_and_more`. |
| quality_control | `quality_control_qcinspection` | Created in early QC migrations, deleted in `quality_control.0009_remove_qcinspection`. |
| stock_dashboard | `stock_dashboard_stockdashboardpermission` | Model is `managed=False` and exists only as a permission sentinel; no DB table should be created. |
| vehicle_management | `vehicle_management_vehicleentry` | Created in `vehicle_management.0001_initial`, deleted in `vehicle_management.0003_delete_vehicleentry`; current vehicle entry table is `driver_management_vehicleentry`. |

## Tables Restored In Previous Repair

These tables had been missing and were recreated:

| Table | Source |
|---|---|
| `accounts_user` | `accounts.0001_initial` |
| `accounts_user_groups` | `accounts.0001_initial` |
| `accounts_user_user_permissions` | `accounts.0001_initial` |
| `accounts_department` | `accounts.0002_department` |
| `auth_permission` | `auth.0001_initial` |
| `auth_group` | `auth.0001_initial` |
| `auth_group_permissions` | `auth.0001_initial` |

Related restoration work:

- Regenerated Django permissions.
- Replayed app group creation/update migrations.
- Ran `setup_production_groups`.
- Recreated requested users.

## Repair Performed

Narrow repair was performed instead of resetting migration state:

1. Recreated `barcode_box` from the current Django model.
2. Added `production_execution_lineclearance.production_incharge_sign`.
3. Restored child foreign key constraints from `barcode_boxmovement` and `barcode_loosestock` to `barcode_box` as `NOT VALID` because historical child rows refer to missing box records.
4. Verified current-model schema alignment and barcode list endpoints.

## Current Risk

The live schema now matches the current Django managed models, but the DB was previously partially damaged or restored from an inconsistent dump. Historical `barcode_box` data was not recoverable from the table itself, and orphaned child rows remain until a source backup or business cleanup rule is chosen.
