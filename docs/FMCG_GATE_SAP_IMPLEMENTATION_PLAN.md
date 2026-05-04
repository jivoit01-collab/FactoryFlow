# FMCG Gate SAP Implementation Plan

Source reference: `docs/FMCG_SAP_Reference_Guide_v3.docx`

Backend reference repo: `../factory_app_v2`

## Decision

Do not create a separate business module for SAP integration.

SAP integration remains distributed across the owning business modules:

- Gate owns physical entry, vehicle, challan, e-way bill, weighment, QC decision handoff, and movement intent.
- GRPO owns Purchase Delivery Note posting for accepted inward material.
- Barcode is the local source of truth for goods identity, stock units, containers, pallets, tanks/lots, and movement traceability.
- WMS should be built as a full working WMS in the `feature/wms2` branches of frontend and backend, integrated tightly with barcode first.
- Warehouse owns local WMS/barcode movement workflows and, where approved, inventory movement documents such as goods issue, goods receipt, stock transfer, quarantine/rejected stock, and repair stock movement.
- Production consumes SAP production orders as read-only planning/source documents. People at the company already maintain production orders in SAP GUI, so the app should not create or edit production orders in this phase.
- Finance/accounting SAP postings are out of scope for this app. AP Credit Memo, AR Credit Memo, AP Invoice, and Journal Entry should remain SAP GUI/finance-team processes. The app may store manual SAP document references and operational statuses only.

The existing `sap_client` backend app should stay as a reusable adapter layer for HANA reads and Service Layer writes. It should not become the user-facing "SAP module" or the place where business workflows live.

## Build Sequence Direction

The implementation order should be barcode-led:

1. Build barcode as the central goods identity and movement layer.
2. Build full WMS on top of barcode in `feature/wms2`.
3. Add dispatch and gate-out flows on top of WMS/barcode movements.
4. Add production-module integration points where production consumes or produces barcode-tracked goods.
5. Add gate-in/out reverse and exception flows such as rejected material, empty vehicle out, labour in/out, repair movement, finished goods out, BST, and job-work arrivals.
6. Add SAP write integrations only where the owning operational module needs them and the SAP process is confirmed.

This means gate should not become the stock ledger. Gate records physical arrival/departure; barcode/WMS records the controlled stock identity and movement.

## Existing SAP Integration Pattern

The backend already uses two SAP access paths.

### HANA Reads

Examples:

- `sap_client/hana/po_reader.py` reads open purchase orders from `OPOR` and `POR1`.
- `sap_client/hana/warehouse_reader.py` reads warehouses.
- `sap_client/hana/vendor_reader.py` reads vendors.
- `warehouse/services/wms_hana_reader.py` reads stock, movement, billing, and warehouse summaries.
- `production_execution/services/sap_reader.py` reads production orders, BOM, and item master.

Pattern:

1. Get company from `request.company.company.code`.
2. Build `SAPClient(company_code=...)` or `CompanyContext`.
3. Query company-specific HANA schema from `COMPANY_DB`.
4. Return normalized DTO/dict response to the owning module endpoint.

### Service Layer Writes

Examples:

- `grpo/services.py` posts GRPO to `/b1s/v2/PurchaseDeliveryNotes`.
- `warehouse/services/warehouse_service.py` posts material issue to `/b1s/v2/InventoryGenExits`.
- `warehouse/services/warehouse_service.py` posts finished goods receipt to `/b1s/v2/InventoryGenEntries`.
- `sap_client/service_layer/production_order_writer.py` posts production orders to `/b1s/v2/ProductionOrders`.

Pattern:

1. Owning feature service validates business state.
2. Owning feature creates or updates local tracking record.
3. Service logs into Service Layer using company config.
4. Service posts payload to SAP.
5. Local model stores `sap_doc_entry`, `sap_doc_num`, status, error, posted user/time.
6. Failed postings remain visible and retryable from the same business module.

This is the pattern all new implementation should follow.

## SAP HANA Feasibility Findings

Checked on 2026-05-01 using the backend `.env` HANA settings. This was a read-only check against the configured company databases. Credentials, host, and schema names are intentionally not documented here.

### Summary

Most proposed integration points are technically feasible because the required SAP B1 tables exist and have data. The main exceptions/caveats are:

- Inventory Posting exists but is not being used in any checked company database: `OIQR/IQR1` has 0 rows everywhere. Do not prioritize Inventory Posting integration unless the SAP team confirms they want to start using it.
- Dedicated rejected/quarantine/repair warehouses are not clearly configured by name/code. JIVO_OIL has in-transit/job-worker warehouses, but no obvious rejected/quarantine/repair/returns warehouse pattern was found. JIVO_MART and JIVO_BEVERAGES did not show obvious candidate warehouses by name/code pattern.
- Goods Return/Purchase Return exists, but lines based directly on GRPO are almost unused: JIVO_OIL has 3 such lines, JIVO_MART has 1, and JIVO_BEVERAGES has 0. The Goods Return integration is still feasible, but must be validated carefully with the SAP team because current SAP usage may be mostly standalone or manually linked.
- Production-order-based goods issue/receipt is actively used in JIVO_OIL and JIVO_BEVERAGES. JIVO_MART has only minimal production usage and no currently released production orders with remaining quantity.
- Production orders are already maintained in SAP. A read-only production order approach is supported by DB evidence: JIVO_OIL has 4910 production orders with latest post date 2026-04-20, and JIVO_BEVERAGES has 1028 production orders. JIVO_MART has only 7 historical production orders and no 2026 production orders.
- Finance documents exist and are heavily used in SAP, but they should not be posted from this app. The app should only capture operational status and manual SAP references for finance follow-up.

### Document Usage By Company

| SAP object | JIVO_OIL | JIVO_MART | JIVO_BEVERAGES | Feasibility |
|---|---:|---:|---:|---|
| Purchase Order `OPOR/POR1` | 2898 / 7205 | 1285 / 10892 | 864 / 2278 | High |
| GRPO `OPDN/PDN1` | 7682 / 16469 | 1713 / 9897 | 2806 / 4473 | High |
| Goods Return `ORPD/RPD1` | 50 / 66 | 47 / 486 | 21 / 33 | Medium |
| AP Credit Memo `ORPC/RPC1` | 1120 / 1945 | 501 / 2065 | 179 / 328 | High |
| AP Invoice `OPCH/PCH1` | 11073 / 26563 | 2512 / 13322 | 2181 / 6637 | High |
| Inventory Transfer `OWTR/WTR1` | 6741 / 26886 | 839 / 5255 | 1315 / 3719 | High |
| Goods Issue `OIGE/IGE1` | 4969 / 33293 | 43 / 241 | 974 / 4857 | High |
| Standalone Goods Receipt `OIGN/IGN1` | 5073 / 11122 | 49 / 219 | 1050 / 2501 | High |
| Sales Return `ORDN/RDN1` | 1450 / 6747 | 1290 / 9768 | 133 / 243 | High |
| AR Credit Memo `ORIN/RIN1` | 4997 / 11991 | 3399 / 21671 | 269 / 572 | High |
| Production Order `OWOR/WOR1` | 4910 / 32515 | 7 / 8 | 1028 / 5335 | High for Oil/Beverages, Low for Mart |
| Journal Entry `OJDT/JDT1` | 94665 / 368110 | 41391 / 228607 | 14606 / 53482 | High, finance-controlled |
| Delivery `ODLN/DLN1` | 2623 / 23247 | 4116 / 41292 | 291 / 781 | High |
| Sales Order `ORDR/RDR1` | 10654 / 54817 | 5579 / 25561 | 3180 / 11243 | High |
| Inventory Posting `OIQR/IQR1` | 0 / 0 | 0 / 0 | 0 / 0 | Not currently used |

Values are header row count / line row count.

### Current Open Signals

| Signal | JIVO_OIL | JIVO_MART | JIVO_BEVERAGES |
|---|---:|---:|---:|
| Open PO lines | 640 | 803 | 497 |
| Released production orders with remaining quantity | 26 | 0 | 24 |
| Open sales order lines | 7560 | 1089 | 2234 |

### Production Order Read-Only Confirmation

| Company | Total production orders | Latest production order post date | Released | Closed | Planned | 2026 orders |
|---|---:|---|---:|---:|---:|---:|
| JIVO_OIL | 4910 | 2026-04-20 | 89 | 4758 | 43 | 36 |
| JIVO_MART | 7 | 2025-09-15 | 1 | 5 | 0 | 0 |
| JIVO_BEVERAGES | 1028 | 2025-12-13 | 164 | 791 | 44 | 0 |

Conclusion: production orders should be read-only in the app for this phase. Use HANA readers for selection/status/BOM/component data. Do not use the app to create SAP production orders unless the company later changes the operating process.

### Base Document Usage

| Linkage checked | JIVO_OIL | JIVO_MART | JIVO_BEVERAGES | Meaning |
|---|---:|---:|---:|---|
| GRPO lines based on PO | 8789 | 8963 | 2005 | Existing GRPO flow is feasible and already used |
| Purchase return lines based on GRPO | 3 | 1 | 0 | Needs SAP process validation |
| AP credit memo lines based on purchase return | 49 | 281 | 16 | SAP object is used; app should store references only |
| AP invoice lines based on GRPO | 14450 | 8947 | 3797 | SAP object is used; app should store references only |
| Sales return lines based on delivery | 1344 | 3295 | 39 | Customer return flow is feasible |
| AR credit memo lines based on sales return | 6900 | 16477 | 124 | SAP object is used; app should store references only |
| Goods issue lines based on production order | 30905 | 7 | 4743 | Production issue is actively used in Oil/Beverages |
| Goods receipt lines based on production order | 5757 | 6 | 1039 | Production receipt is actively used in Oil/Beverages |

### Master Data Gaps

Dedicated warehouses need SAP master-data confirmation before the rejected-material and repair flows can go live:

- Rejected / quarantine warehouse
- Returns warehouse
- Repair-in-progress warehouse
- Rework warehouse
- Scrapping / damaged warehouse if business wants a staging location before goods issue

The app can support these fields now, but posting must be blocked until the selected warehouse exists in SAP `OWHS`.

## Current Gate Coverage

Current gate already covers the inward raw material path:

- Vehicle/driver/transporter entry.
- PO selection from SAP open POs.
- PO item receipt.
- Arrival slip with invoice/challan/e-way bill fields.
- Weighment.
- QC inspection status.
- Accepted/rejected quantity fields on `POItemReceipt`.
- GRPO posting through the separate GRPO feature.

Main gap: the app does not yet fully model the post-QC, post-GRPO, and outbound gate flows from the FMCG reference guide: vendor rejection, quarantine, vendor-refused returns, debit notes, scrapping, empty vehicle exit, labour in/out, finished goods out, BST/customer returns, repair parts, and outsourced refining/job work gate entry.

## Gate Submodules To Add

These are gate submodules because they represent physical movement through the gate. Their SAP posting should still be performed by the owning module/service responsible for the document type.

### 1. Rejected Material / Vendor Return

Route idea:

- Frontend: `/gate/rejected-materials`
- Backend owner: `raw_material_gatein` plus `grpo` and `warehouse` support

Purpose:

- Track material rejected by QC.
- Decide whether rejected quantity is returned to vendor, held in quarantine, reworked, scrapped, or disputed.
- Track vendor-refused returns coming back to the factory.

Required backend additions:

- Add a rejection case model under `raw_material_gatein`, for example `RejectedMaterialCase`.
- Link it to `VehicleEntry`, `POReceipt`, `POItemReceipt`, optional `GRPOPosting`, optional `GRPOLinePosting`.
- Store rejected quantity, accepted quantity, reason, current decision, quarantine warehouse, return vehicle/challan, vendor response, dispute status, and SAP document references.
- Add endpoints under `raw-material-gatein` or `gate-core`, not under a new SAP module.

SAP document points:

- `grpo`: accepted quantity already posts to `PurchaseDeliveryNotes`.
- `warehouse`: move rejected material to quarantine using `StockTransfers` or receive vendor-refused return using `InventoryGenEntries`.
- `warehouse`: scrap using `InventoryGenExits`.
- finance/accounting follow-up remains in SAP GUI. The app should not post AP Credit Memo or Journal Entry.
- the app may store fields such as `finance_status`, `sap_ap_credit_memo_doc_num`, `sap_journal_entry_ref`, and `finance_remarks` as manually entered references after finance completes work in SAP.

Feasibility:

- High for quarantine transfer, standalone rejected goods receipt, and goods issue/scrap because the underlying SAP inventory objects are used.
- Medium for Goods Return based on GRPO because `ORPD/RPD1` exists, but current data shows almost no GRPO-based purchase return usage. Validate whether SAP users expect `BaseType=20` purchase returns or standalone/manual returns.
- AP credit memo and journal entry are SAP-feasible but intentionally out of scope for app posting.
- Requires SAP warehouse setup/confirmation for rejected/quarantine warehouses.

Frontend additions:

- New dashboard/list/detail pages under `src/modules/gate/pages/rejectedMaterialPages`.
- Actions: create return-to-vendor, receive vendor-refused material, move to quarantine, mark dispute pending, request debit note, request scrapping.
- Show SAP document references and failed/retry states from the owning backend records.

### 2. Back Store Transfer / Returns

Route idea:

- Frontend: `/gate/returns`
- Backend owner: new app can be `outbound_gatein`/`outbound_dispatch` extension if customer/branch returns belong there; otherwise add a focused gate return app.

Purpose:

- Track goods coming back from customer, retailer, distributor, branch, or store.
- Distinguish customer return, branch transfer, delivery-note return, and internal stock movement.
- Treat outbound BST as a finished-goods-out subtype, not as a disconnected gate module. Returns are inbound; BST dispatch is outbound.

Required backend additions:

- Add return gate entry model with customer/branch/store source, reference document, vehicle, challan, item lines, received quantity, condition, warehouse destination, and reason.
- Add HANA readers for delivery/sales return base document lookup if needed.

SAP document points:

- Customer/retailer return: operational return is captured in gate/WMS first. SAP Sales Return posting should stay manual/SAP GUI unless the business explicitly approves external posting later.
- Branch/store transfer: `StockTransfers`.
- Return into rejected/returns warehouse: `Returns` or `StockTransfers`, depending on ownership and direction.
- Customer credit: AR Credit Memo remains finance/SAP GUI only. The app can store manual credit memo references after finance completes it.

Feasibility:

- High for customer return data availability: sales returns and AR credit memos are actively used in SAP.
- High for branch/store transfer: inventory transfers are actively used.
- AR Credit Memo posting from the app is out of scope.
- Requires a confirmed returns warehouse if returned goods are staged separately before QC or resale.

Frontend additions:

- Return entry wizard: source party, reference document, vehicle/challan, item lines, condition/QC, target warehouse, review.
- Dashboard statuses: draft, received, WMS received, transfer posted where approved, manual SAP return referenced, credit pending, closed.
- If the movement is outbound BST, redirect/link the user into the Finished Goods Out flow with `movement_type=BST`.

### 3. Repair / Returnable Parts Movement

Route idea:

- Frontend: `/gate/repair-movement`
- Backend owner: `maintenance_gatein` plus `warehouse`

Purpose:

- Track company-owned parts going out for repair and coming back.
- Preserve audit trail while the material is outside the factory.
- Link repair-out movements back to the maintenance gate-in entry when the part/tool/spare originally entered through maintenance gate-in.

Required backend additions:

- Add repair movement model under `maintenance_gatein`, for example `RepairMovement`.
- Track part/item, serial/batch if applicable, asset/cost center, vendor/workshop, out date, expected return, in date, repair status, repair cost reference, and movement documents.
- Add nullable `source_maintenance_gate_entry` / `source_maintenance_item` fields so repair movement out can be created from an existing maintenance gate-in record.
- If a repair movement is created without a source maintenance entry, require manual item/asset details and mark it as `standalone_repair_movement`.

SAP document points:

- External repair: `StockTransfers` to repair-in-progress warehouse and service PO/AP invoice where needed.
- Internal workshop: `InventoryGenExits` or transfer to workshop warehouse/cost center.
- Successful return: `InventoryGenEntries` or transfer back to main warehouse.
- Failed return: receive into quarantine/rejected warehouse and follow scrap/rework decision.
- Repair service PO/AP Invoice remains SAP GUI/finance/procurement process. The app stores reference numbers only.

Feasibility:

- Medium. The inventory documents are feasible, but no obvious repair-in-progress warehouse was found by code/name pattern.
- Before implementation, SAP master data should define whether repair stock moves to a warehouse, a cost center, or remains in inventory with a user-defined status.
- Finance/service invoice posting is out of scope for the app.

Frontend additions:

- Outward repair form.
- Return confirmation form.
- Open repair list and overdue list.
- Links to maintenance entry and warehouse movement history.
- "Create Repair Out" action from maintenance gate-in detail for eligible items.

### 4. Job Work / Oil Refining Gate Entry

Route idea:

- Frontend: `/gate/job-work`
- Backend owner: `production_execution` plus `gate_core` or a gate job-work app

Purpose:

- Track outsourced refining/job work material arriving at gate.
- Link gate arrival to SAP Production Order.
- Capture refiner challan, e-way bill, tanker/vehicle, weighment, QC, accepted/partial/rejected result.
- Treat SAP production order as read-only. The production order is selected from SAP and used as the reference for job-work receipt/loss tracking.

Required backend additions:

- Add job-work gate entry model linked to SAP production order `DocEntry`.
- Reuse `production_execution/services/sap_reader.py` for production order search/detail.
- Store production order reference, refiner vendor, challan, e-way bill, material grade, challan quantity, weighment quantity, QC decision, accepted quantity, rejected quantity, and yield/loss notes.

SAP document points:

- Do not create production orders from the app in this phase. Production orders are already created in SAP GUI.
- Receipt of accepted refined oil: `InventoryGenEntries` based on production order `BaseType=202`, if the business approves app posting.
- Component issue to production/refiner: `InventoryGenExits` based on production order where required, preferably owned by WMS/production flow after barcode/WMS is in place.
- Refiner service invoice: stays in SAP GUI. The app stores invoice/service PO references only if needed.
- Rejected/partial return: use rejected material flow operationally; finance/debit-note handling remains SAP GUI.

Feasibility:

- High for JIVO_OIL and JIVO_BEVERAGES: production orders, production-order-based goods issues, and production-order-based goods receipts are actively used.
- Low/limited for JIVO_MART unless production usage is expected to increase: only 7 production orders were found and no released production orders currently have remaining quantity.
- In-transit/job-worker warehouses exist in JIVO_OIL and can be candidates for outsourced job work, but warehouse mapping still needs SAP/business confirmation.
- Production order read-only is the recommended approach. DB evidence shows SAP production orders are already being maintained in SAP directly.

### Oil Refining Document Decision

If unrefined oil GRPO is already done when the oil reaches the refinery, then the refined oil received at the factory should not be posted as another GRPO for the same material purchase.

Recommended SAP treatment for outsourced refining:

1. Vendor purchase of unrefined oil: GRPO is posted when unrefined oil reaches the refinery/job-worker location. This receives company-owned unrefined oil into the appropriate SAP warehouse/location.
2. Refining process: SAP Production Order represents conversion of unrefined oil component into refined oil finished/semi-finished item.
3. Component consumption: unrefined oil is issued to the production order using Goods Issue `InventoryGenExits` with `BaseType=202`, if SAP users are not already doing this in SAP GUI.
4. Refined oil receipt at factory: receive refined oil using Goods Receipt from Production, i.e. `InventoryGenEntries` with `BaseType=202`, `BaseEntry=OWOR.DocEntry`, `BaseLine=0`.
5. Refiner service bill: AP Invoice/service PO remains in SAP GUI. The app does not post finance documents.

Only use another GRPO if the business is actually buying refined oil as a separate purchase item from the refiner/vendor. For job work/conversion of company-owned unrefined oil, use production-order goods receipt, not GRPO.

Refining tolerance rules:

- Refining process loss tolerance: 3% of unrefined input quantity.
- Factory unloading/transfer loss tolerance: 0.25% from refined-oil vehicle/tanker receipt into factory storage tank.
- These should be checked separately, not merged into one silent tolerance.

Suggested calculations:

- `expected_refined_qty = unrefined_input_qty * 0.97`
- `refining_loss_pct = ((unrefined_input_qty - refined_dispatch_qty) / unrefined_input_qty) * 100`
- `transfer_loss_pct = ((vehicle_arrival_net_qty - factory_tank_received_qty) / vehicle_arrival_net_qty) * 100`

Operational handling:

- If refining loss is `<= 3%`, allow normal production receipt and record the variance.
- If refining loss is `> 3%`, block automatic posting and mark as exception/dispute for production/commercial review.
- If transfer loss is `<= 0.25%`, allow factory tank receipt and record the loss.
- If transfer loss is `> 0.25%`, block automatic posting and require supervisor/QC/warehouse approval.
- Barcode/WMS should track the refined-oil lot/tank receipt. For bulk oil, barcode can represent batch/lot/tank movement rather than only carton/pallet units.

Frontend additions:

- Production order selector.
- Refiner/challan/e-way bill capture.
- Weighment and arrival slip style fields.
- QC decision page with accepted, partial, rejected handling.
- Links to production order and finished goods/warehouse receipt status.

### 5. Empty Vehicle Gate Out

Route idea:

- Frontend: `/gate/empty-vehicle-out`
- Backend owner: `gate_core` using existing vehicle/driver/gate-entry data

Purpose:

- Mark a vehicle as out when it brought material/persons into the factory but leaves without outbound goods.
- Covers RM/PM/assets, daily needs, maintenance, construction, job-work, and any future inward gate module.
- Keeps the physical vehicle lifecycle complete without forcing a fake dispatch or WMS movement.

Required backend additions:

- Add an empty vehicle gate-out model or a generic `GateExitEvent` linked to the original inward `VehicleEntry`.
- Store `company`, `vehicle_entry`, `vehicle`, `driver`, `out_time`, `security_name`, `remarks`, and `exit_type=EMPTY`.
- Prevent duplicate exit events for the same vehicle entry unless the original entry type explicitly supports multiple trips.
- Validate that the selected vehicle entry is not already closed/out and has no pending mandatory gate/QC steps that block exit.

SAP document points:

- No SAP posting. This is only physical gate control.
- If the same vehicle later carries outbound goods, that must be a separate finished goods/dispatch/repair/BST gate-out record.

Frontend additions:

- Dashboard/list of inward vehicles not yet marked out.
- User selects the inward vehicle, enters/selects out time, optional security name/remarks, and clicks `Mark Out`.
- Show `Out` status and out timestamp on the original gate entry detail.

### 6. Maintenance Gate In Department Link

Route idea:

- Frontend: existing `/gate/maintenance`
- Backend owner: `maintenance_gatein` plus shared department master

Purpose:

- Route maintenance spare parts/tools/consumables to the responsible factory department.
- Support later cost-center reporting and repair movement linkage.

Implementation options:

- Start with existing app department master as a required/optional `receiving_department` FK on maintenance gate-in.
- Add optional `requested_by`, `maintenance_ticket_no`, `machine/asset`, and `cost_center_code` fields.
- Later map factory departments to SAP cost centers if SAP-level cost reporting is required.

Open implementation question:

- Confirm whether the company wants department as an operational app department, an SAP cost center, or both. Recommended first step is app department FK plus optional SAP cost center text/reference.

SAP document points:

- No finance posting from gate.
- If a warehouse stock movement is later posted for maintenance consumption, the warehouse/maintenance module should own the SAP goods issue and use the department/cost-center reference.

### 7. Labour In / Labour Out

Route idea:

- Frontend: `/gate/labour`
- Backend owner: `person_gatein` or a focused `labour_gate` area under gate/person movement

Purpose:

- Track labour movement separately from visitor movement.
- Support contractor labour, daily labour count, individual worker details where needed, department/work area, in time, and out time.

Implementation options:

- Simple phase: one labour entry per contractor/department/day with `labour_count`, supervisor, work area, in time, out time, and remarks.
- Stronger control phase: individual labour lines with worker name/ID proof/pass number/photo and individual in/out timestamps.
- If biometric/attendance integration is expected later, keep gate labour as movement/security log and do not make it the payroll source of truth.

Frontend additions:

- Separate Labour In form.
- Labour Out screen listing currently inside labour entries.
- Dashboard cards for inside count, pending out, contractor-wise count, and department-wise count.

SAP document points:

- No SAP posting.
- Finance/payroll remains outside this flow unless a later HR/payroll module is approved.

### 8. Finished Goods Out

Route idea:

- Frontend: `/gate/finished-goods-out`
- Backend owner: dispatch/WMS plus `gate_core`

Purpose:

- Gate verification for finished goods leaving the factory.
- Link outbound vehicle exit to WMS/barcode picking/staging and dispatch documents.
- Avoid letting gate become the stock ledger; WMS/dispatch remains responsible for goods identity and quantities.

Required backend additions:

- Add finished goods gate-out record linked to dispatch/shipment/load plan, WMS staged goods, vehicle, driver, transporter, challan/invoice/e-way bill, gate-out time, and security verification.
- Store movement type: customer dispatch, branch transfer, BST, sample, replacement, or other approved outbound reason.
- Require WMS/dispatch status to be ready before final gate out.

SAP document points:

- Delivery, invoice, and finance documents remain SAP GUI/manual unless separately approved.
- Stock transfer for branch/BST can be posted by WMS/dispatch where approved, not directly by gate.
- Gate stores manual SAP delivery/invoice/transfer references when those are created outside the app.

Frontend additions:

- Select staged dispatch/load or scan vehicle/load barcode.
- Verify vehicle, driver, documents, item/pallet summary, and seal number.
- Mark gate-out with timestamp/security name.
- Dashboard statuses: ready at gate, out, blocked, document pending.

### 9. BST Linked With Finished Goods Out

Route idea:

- Frontend: `/gate/finished-goods-out?movement_type=BST` or a BST shortcut card that opens FG Out in BST mode.
- Backend owner: dispatch/WMS plus `gate_core`

Purpose:

- Handle Back Store Transfer as a finished-goods outbound movement.
- Ensure BST does not duplicate dispatch/gate-out logic.

Required backend additions:

- Add `bst_request` / `stock_transfer_request` reference on finished goods gate-out.
- Store from warehouse, to branch/store/warehouse, WMS picked/staged goods, vehicle, documents, and SAP stock transfer reference where app posting is approved.
- Final gate out closes the physical movement; WMS/dispatch closes the stock movement.

SAP document points:

- Internal branch/store transfer: `StockTransfers`, owned by WMS/dispatch service where approved.
- If SAP transfer is done manually, store manual transfer document reference.

Frontend additions:

- BST dashboard/list can exist, but its `Send Out` action should open Finished Goods Out with BST prefilled.
- Finished Goods Out should display BST-specific source/destination warehouse and transfer status.

## Other Modules To Change

### `sap_client`

Keep as a shared technical adapter.

Add only reusable low-level readers/writers here:

- `PurchaseReturnWriter` for `/b1s/v2/PurchaseReturns`.
- `InventoryGoodsReceiptWriter` for `/b1s/v2/InventoryGenEntries`.
- `InventoryGoodsIssueWriter` for `/b1s/v2/InventoryGenExits`.
- `StockTransferWriter` for `/b1s/v2/StockTransfers`.
- HANA readers for delivery documents, sales return base docs, item stock by warehouse, production orders, BOM/components, and AP/AR settlement status if needed.

Do not prioritize an `InventoryPostingWriter` yet. `OIQR/IQR1` exists but has no rows in the checked company databases, so Inventory Posting is not currently part of the observed SAP operating process.

Do not add finance writers in this phase:

- No `PurchaseCreditNoteWriter`
- No `PurchaseInvoiceWriter`
- No `ARCreditMemoWriter`
- No `JournalEntryWriter`

The existing `ProductionOrderWriter` should not be used for normal production/job-work flow in this phase. Production orders are read-only from SAP because the company already creates and maintains them in SAP GUI.

Do not add business workflow models or user-facing endpoints here unless they are generic SAP lookup endpoints like current `/po/open-pos/`, `/po/vendors/`, and `/po/warehouses/`.

### `raw_material_gatein`

Add rejected-material lifecycle fields/models:

- QC rejection decision.
- Return-to-vendor attempt.
- Vendor acceptance/refusal.
- Quarantine/rejected warehouse.
- Debit note required/created.
- Scrap/rework/hold final disposition.

Use existing `POReceipt` and `POItemReceipt` SAP fields:

- `sap_doc_entry` as PO base entry.
- `sap_line_num` as PO base line.
- `accepted_qty` and `rejected_qty`.
- `warehouse_code`, `gl_account`, `tax_code`, `unit_price`, `variety`.

### `grpo`

Extend history and preview data so downstream rejection flows can base documents on GRPO:

- Expose `GRPOPosting.sap_doc_entry`, `sap_doc_num`, `GRPOLinePosting` line references, posted quantity, and source `POItemReceipt`.
- Add a relationship from rejected cases to the GRPO line that received the accepted quantity.
- For partial acceptance, ensure rejected quantity remains available for rejected-material flow even though only accepted quantity posts to GRPO.

### `quality_control`

Current final statuses are `PENDING`, `ACCEPTED`, `REJECTED`, `HOLD`.

Add action-oriented disposition fields, either in inspection or linked rejection case:

- `ACCEPTED`
- `PARTIALLY_ACCEPTED`
- `REJECTED_RETURN_TO_VENDOR`
- `REJECTED_QUARANTINE`
- `REJECTED_REWORK`
- `REJECTED_SCRAP`
- `HOLD_DISPUTE`

Do not overload QC with SAP posting. QC should decide quality and disposition; warehouse/GRPO should post approved operational inventory documents, while finance documents remain SAP GUI/manual references.

### `warehouse`

This module should become the full WMS in the `feature/wms2` branch, built on top of barcode.

Barcode/WMS responsibilities:

- Barcode creates and tracks stock identities: box, pallet, loose stock, lot, batch, tank, or other container/unit.
- WMS controls putaway, bin/tank location, stock transfer, picking, dispatch staging, quarantine, rejected stock, and repair/rework stock.
- Gate, dispatch, production, and QC should consume WMS/barcode movements instead of maintaining separate stock ledgers.

This module should own inventory movement postings that are not GRPO, but only after the barcode/WMS movement is valid:

- Stock transfer for BST, quarantine, rejected, repair, rework, and branch/store transfer.
- Standalone goods receipt for vendor-refused return or non-PO receipt.
- Goods issue for scrapping/write-off and internal consumption.
- Stock availability checks before posting.

Follow the existing `BOMRequest` and `FinishedGoodsReceipt` pattern:

- Local document model.
- Status field.
- SAP doc reference field.
- Error field.
- Post/retry endpoint.

### `production_execution`

Use SAP production orders as read-only source documents:

- Add job-work/refiner metadata on production run or a linked job-work record.
- Reuse SAP production order reader for gate selection.
- Do not create or edit SAP production orders from the app in this phase.
- Post finished/refined material receipt using the existing `InventoryGenEntries` pattern only after barcode/WMS and business approval are in place.
- Track yield/loss variance and rejected/refiner-liable quantity.
- Integrate production consumption/output with barcode/WMS so raw material issue, WIP, finished goods receipt, rejected goods, and rework are traceable.

### Finance / Accounting Touchpoints

Do not create a SAP finance module and do not post finance documents from this app.

Out of scope for app posting:

- AP Credit Memo / vendor debit note
- AR Credit Memo / customer credit note
- AP Invoice / vendor or refiner service invoice
- Journal Entry / write-off accounting adjustment

Allowed in the app:

- Operational status such as `FINANCE_PENDING`, `DEBIT_NOTE_REQUIRED`, `FINANCE_COMPLETED`.
- Manual SAP reference fields after finance completes the document in SAP GUI.
- Read-only HANA lookups later if finance wants visibility, not posting.

Reason:

- Finance SAP entries are high-risk and should remain under SAP GUI controls, approvals, and the finance team's normal process.

## Suggested Backend Model Additions

### RejectedMaterialCase

Owner: `raw_material_gatein`

Core fields:

- `company`
- `vehicle_entry`
- `po_receipt`
- `po_item_receipt`
- `grpo_posting` nullable
- `item_code`, `item_name`, `uom`
- `rejected_qty`
- `reason`
- `disposition`
- `status`
- `quarantine_warehouse`
- `return_challan_no`
- `vendor_response`
- `sap_purchase_return_doc_entry`
- `sap_stock_transfer_doc_entry`
- `sap_rejected_receipt_doc_entry`
- `sap_goods_issue_doc_entry`
- `finance_status`
- `finance_manual_sap_reference`
- `sap_error`
- audit fields

### GateReturnEntry

Owner: gate/outbound area

Core fields:

- `company`
- source type: customer, retailer, distributor, branch, store
- source party code/name
- vehicle, driver, transporter
- reference document type/number
- return reason
- target warehouse
- status
- SAP stock transfer references where app posting is approved
- manual SAP sales return / AR credit memo references where finance/sales completes them in SAP GUI

### RepairMovement

Owner: `maintenance_gatein`

Core fields:

- `company`
- `source_maintenance_gate_entry` nullable
- `source_maintenance_item` nullable
- `is_standalone_repair_movement`
- item/asset identifiers
- department / cost center reference
- vendor/workshop
- movement type: external repair, internal repair
- out quantity/date
- expected return date
- return quantity/date
- result: repaired, unrepaired, scrap, reattempt
- SAP transfer/goods issue/goods receipt references
- manual service PO/AP invoice references, if finance/procurement needs them displayed

### JobWorkGateEntry

Owner: gate/production boundary

Core fields:

- `company`
- `sap_production_order_doc_entry`
- `sap_production_order_doc_num`
- refiner/vendor code/name
- vehicle/tanker details
- challan number/date
- e-way bill
- input/output item details
- challan quantity
- weighment quantity
- accepted quantity
- rejected quantity
- QC result/disposition
- SAP production receipt reference if app posting is approved
- manual service invoice / finance references

### EmptyVehicleGateOut / GateExitEvent

Owner: `gate_core`

Core fields:

- `company`
- `vehicle_entry`
- `vehicle`
- `driver`
- `exit_type`: empty, dispatch, repair, BST, visitor/labour, other
- `out_time`
- `security_name`
- `remarks`
- `created_by`
- uniqueness rule for one active empty exit per inward gate entry

### MaintenanceGateEntry Additions

Owner: `maintenance_gatein`

Core fields to add or confirm:

- `receiving_department`
- `requested_by`
- `maintenance_ticket_no`
- `machine_or_asset`
- `cost_center_code` optional/manual until SAP mapping is confirmed
- linkable item lines so repair movement out can reference the exact spare/tool/asset

### LabourGateMovement

Owner: `person_gatein` or gate/person area

Core fields:

- `company`
- contractor/vendor
- department/work area
- movement date
- in time
- out time
- labour count for simple phase
- optional worker lines: name, phone, ID proof, pass number, photo, individual in/out time
- supervisor/security names
- status: inside, partly out, completed, cancelled

### FinishedGoodsGateOut

Owner: dispatch/WMS plus `gate_core`

Core fields:

- `company`
- dispatch/load/staging reference
- movement type: customer dispatch, branch transfer, BST, sample, replacement
- vehicle, driver, transporter
- challan/invoice/e-way bill/seal number
- WMS/barcode picked/staged item or pallet summary
- gate out time/security name
- manual SAP delivery/invoice/transfer references
- status: ready, blocked, out, cancelled

### BSTGateOut Link

Owner: dispatch/WMS plus `gate_core`

Core fields:

- `finished_goods_gate_out`
- BST/stock transfer request reference
- from warehouse
- to branch/store/warehouse
- SAP stock transfer doc reference where app posting is approved
- manual SAP transfer reference if posted in SAP GUI

## API Plan

Keep endpoints under feature modules.

Examples:

- `GET /raw-material-gatein/rejected-cases/`
- `POST /raw-material-gatein/rejected-cases/`
- `POST /raw-material-gatein/rejected-cases/{id}/return-to-vendor/`
- `POST /raw-material-gatein/rejected-cases/{id}/receive-vendor-refused/`
- `POST /raw-material-gatein/rejected-cases/{id}/mark-finance-follow-up/`
- `POST /raw-material-gatein/rejected-cases/{id}/scrap/`
- `GET /warehouse/stock/check/`
- `POST /warehouse/stock-transfers/`
- `POST /warehouse/goods-receipts/`
- `POST /warehouse/goods-issues/`
- `GET /gate/returns/`
- `POST /gate/returns/`
- `POST /gate/returns/{id}/record-manual-sap-return/`
- `GET /gate-core/empty-vehicle-outs/eligible-entries/`
- `POST /gate-core/empty-vehicle-outs/`
- `POST /gate-core/empty-vehicle-outs/{id}/mark-out/`
- `POST /maintenance-gatein/repair-movements/`
- `POST /maintenance-gatein/maintenance-entries/{id}/create-repair-movement/`
- `POST /maintenance-gatein/repair-movements/{id}/send-out/`
- `POST /maintenance-gatein/repair-movements/{id}/receive-back/`
- `POST /person-gatein/labour/in/`
- `GET /person-gatein/labour/inside/`
- `POST /person-gatein/labour/{id}/out/`
- `GET /dispatch/finished-goods-gate-outs/`
- `POST /dispatch/finished-goods-gate-outs/`
- `POST /dispatch/finished-goods-gate-outs/{id}/mark-out/`
- `GET /dispatch/bst/`
- `POST /dispatch/bst/{id}/create-finished-goods-out/`
- `GET /production-execution/sap/orders/`
- `POST /gate/job-work/`
- `POST /gate/job-work/{id}/validate-tolerance/`
- `POST /gate/job-work/{id}/post-production-receipt/` only if app-side SAP receipt posting is approved

## Frontend Plan

Update the gate module without creating a SAP module.

Add routes in `src/modules/gate/module.config.tsx`:

- `/gate/rejected-materials`
- `/gate/returns`
- `/gate/repair-movement`
- `/gate/job-work`
- `/gate/empty-vehicle-out`
- `/gate/labour`
- `/gate/finished-goods-out`
- `/gate/bst` as a shortcut/list only; final send-out should use Finished Goods Out in BST mode

Add navigation cards in `GateDashboardPage.tsx`.

Add permissions in `src/config/permissions/gate.permissions.ts` for the gate-facing pages. Use module-specific backend permissions for actions:

- rejected material actions from `raw_material_gatein`
- repair movement actions from `maintenance_gatein`
- return/BST actions from gate/outbound app
- job-work actions from gate/production app
- warehouse post/retry actions from `warehouse`

Add API clients under the owning frontend modules:

- `src/modules/gate/api/rejectedMaterial`
- `src/modules/gate/api/returns`
- `src/modules/gate/api/jobWork`
- `src/modules/gate/api/repairMovement`
- `src/modules/gate/api/emptyVehicleOut`
- `src/modules/gate/api/labour`
- `src/modules/gate/api/finishedGoodsOut`
- extend `src/modules/warehouse/api` for stock transfers, goods receipts, goods issues
- extend `src/modules/grpo/api` only for GRPO downstream references
- extend `src/modules/production/...` only for production order/job-work lookups if not already exposed
- extend dispatch/WMS frontend APIs for finished goods out and BST source documents once dispatch/WMS is built

## Implementation Phases

### Phase 0: Branch And Barcode Foundation

- Move implementation work to the `feature/wms2` branches of frontend and backend.
- Build barcode as the central identity layer for goods and containers.
- Support barcode identities for boxes, pallets, loose goods, batches/lots, and bulk tank lots.
- Ensure every movement has from-location, to-location, actor, timestamp, reason, and source business document.
- Do not build WMS, dispatch, gate-out, or production movement features before barcode identity and scan history are stable.

### Phase 1: Full WMS On Barcode

- Build WMS stock ledger on barcode movements.
- Add receiving, putaway, location/bin/tank assignment, internal movement, stock status, quarantine/rejected status, picking, dispatch staging, and stock audit.
- Add SAP stock reads for reconciliation, but keep barcode/WMS as the local operational traceability layer.
- Add warehouse master-data confirmation for rejected, quarantine, returns, repair, rework, and scrap staging locations.

### Phase 2: Dispatch And Gate Out

- Build dispatch on WMS/barcode picking and staging.
- Build gate-out on dispatch handoff, vehicle verification, document checks, and final exit.
- Add empty vehicle gate-out for inward vehicles leaving without outbound goods.
- Add finished goods gate-out as the physical exit layer for staged dispatch loads.
- Add BST as a finished-goods-out movement type so branch/store transfers reuse the same gate-out controls.
- Keep SAP delivery/invoice/finance posting outside scope unless separately approved.

### Phase 3: Production Integration Points

- Read SAP production orders from HANA.
- Link production runs/job-work to SAP production orders without creating or editing SAP production orders.
- Issue/consume barcode-tracked raw material from WMS into production.
- Receive barcode-tracked finished goods/refined oil lots back into WMS.
- Add tolerance checks for production/job-work loss before any SAP inventory posting.

### Phase 4: SAP Operational Posting Foundation

- Add shared Service Layer writer helpers in `sap_client` for the missing document endpoints.
- Add consistent exception handling using `SAPConnectionError`, `SAPDataError`, and `SAPValidationError`.
- Add local status/doc reference conventions across new models.
- Add HANA readers only for needed lookups.
- Confirm SAP warehouse master data for rejected, quarantine, returns, repair, rework, and scrap staging before enabling posting actions.
- Defer Inventory Posting integration unless SAP users confirm it is intentionally being adopted.
- Do not add finance document writers.

### Phase 5: Rejected Material Flow

- Extend raw material/QC/GRPO data to support rejected case creation.
- Build rejected material dashboard and detail.
- Add return-to-vendor, quarantine, vendor-refused receipt, finance follow-up status, and scrap actions.
- Wire SAP postings through the owning services.

### Phase 6: Warehouse Inventory Movements

- Add stock transfer, standalone goods receipt, and goods issue models/endpoints in `warehouse`.
- Add retry/error tracking.
- Add frontend pages/components for movement history and posting status.

### Phase 7: BST / Returns

- Add gate return entry workflow.
- Implement WMS/barcode return receiving and stock transfer posting where approved.
- Store manual SAP sales return / AR credit memo references if sales/finance completes those in SAP GUI.
- Keep outbound BST linked to Finished Goods Out. The BST page can manage/prepare transfers, but the vehicle exit should happen through the finished goods gate-out flow.

### Phase 8: Repair Movement

- Add maintenance repair outward/return flow.
- Link repair outward movement to the maintenance gate-in entry/item when the item entered through maintenance gate-in.
- Post warehouse movement documents as needed.
- Track open, overdue, repaired, unrepaired, and scrapped statuses.
- Keep service PO/AP invoice in SAP GUI and store manual references only.

### Phase 8A: Labour Movement

- Add separate labour in/out screens apart from visitor movement.
- Start with contractor/department/count-level tracking if individual labour identity is not finalized.
- Add individual labour pass/ID tracking later if required by security or compliance.
- Keep labour movement separate from payroll/finance.

### Phase 9: Job Work / Refining

- Add job-work gate entry linked to SAP production order.
- Reuse production order HANA reader.
- Add production receipt posting for accepted refined oil only if approved; otherwise record operational receipt and manual SAP reference.
- Add rejected/partial handling through rejected material flow.
- Add 3% refining loss tolerance and 0.25% factory unloading/transfer loss tolerance.
- Add service invoice reference tracking only as manual references.

### Phase 10: Hardening

- Add idempotency checks to prevent duplicate SAP documents.
- Add retry endpoints for every SAP posting action.
- Add audit history for every business action.
- Add permission tests and service tests.
- Add frontend tests for route visibility, action states, and failed/retry status.

## Key Rules

- Frontend never calls SAP directly.
- SAP business actions live in the feature module where the business event happens.
- `sap_client` provides reusable low-level SAP access only.
- Barcode/WMS is the local movement backbone; gate, dispatch, and production should consume barcode/WMS movements.
- Production orders are read-only from SAP in this phase.
- Every SAP write must have a local tracking record before or during posting.
- Every SAP write must store success doc references or failure error.
- Empty vehicle out should never create stock movement or SAP documents.
- Repair movement out should link to maintenance gate-in whenever the source item came through maintenance gate-in.
- Finished Goods Out is the gate exit for dispatch/BST; BST should not create a parallel vehicle-exit flow.
- Labour movement is a gate/security attendance log, not payroll or finance source of truth unless a later module explicitly adopts it.
- Every failed SAP write must be retryable or explicitly cancellable.
- Do not post finance documents from this app. AP Credit Memo, AR Credit Memo, AP Invoice, and Journal Entry remain SAP GUI processes.
