# Warehouse Ops (bin-level WMS) — Frontend

> Module folder: `FactoryFlow/src/modules/wms` · routes under **`/warehouse-ops`**
> Backend companion doc: [`factory_app/wms/docs/README.md`](../../../factory_app/wms/docs/README.md)
> Absolute path: `C:/Users/gurpa/dev/factory_app/wms/docs/README.md`

> **This doc replaces earlier content that described a different "WMS".** The file
> previously held the *SAP stock-analytics* integration notes (OITW/OITM dashboards,
> BOM requests, FG receipts). That subsystem is the older **`warehouse`** module and
> still lives in `FactoryFlow/src/docs/WMS_ARCHITECTURE.md` / `WMS_API_REFERENCE.md`.
> **This doc is about the self-contained, bin-level Warehouse Ops module at
> `src/modules/wms`** — a browser-designed warehouse (grid → cells → pallets → stock)
> that persists through the thin `wms` Django app. Two different things share the
> "WMS" name; don't conflate them.

---

## Overview — what it does & who uses it

Warehouse Ops is a **frontend-driven** warehouse management system. An admin
designs the whole warehouse in the browser — grid dimensions, areas, zones, cell
purposes, naming scheme — and operators then run scan-based workflows against it:
receive & put away, transfer, pick, take out (with a mandatory audit), and cycle
count. A live map colours every bin by occupancy, and reports/labels round it out.

All logic (layout generation, occupancy, putaway ranking, move validation, pick
strategy, the audit, stock math) runs **in the client**. The backend (`wms` app)
is a dumb JSON store — see the [backend doc](../../../factory_app/wms/docs/README.md).
Persistence is now **exclusively the backend REST API**; the old browser-local
(IndexedDB/localStorage) adapters have been removed (`storage/createAdapter.ts`
returns a single shared `ApiAdapter`). **There is no offline mode** — every action
is an immediate API call.

Two independent gates decide what a user sees:
1. **Django permissions** (`wms.*`, via the `WMS Admin`/`WMS Operator` groups) — gate the sidebar and routes.
2. **The master enable flag** (`settings.masterEnabled`, default **off**) — when off, every WMS surface disappears and the host app behaves exactly as before.

Audience: warehouse **operators** (scan workflows) and **admins/managers**
(design, settings, approvals, data cleanup).

---

## Key concepts & entities

Record shapes live in `types/wms.types.ts`; builders in `services/factories.ts`.

- **Warehouse** — `type: 'OWN'` (an internal grid of `columns × rows × levels` cells, the normal case) or `'SAP'` (external, no internal cells). Carries a `namingScheme`, optional `areas`, and an optional `sapWarehouseCode` used only for the barcode/SAP bridge.
- **Area** (`WarehouseArea`) — a rectangle of the grid with its own numbering origin and code `prefix`. Cells outside every area are **"outside"**: no code, excluded from occupancy, moves, and putaway. Areas sharing a `groupId` are numbered continuously.
- **Zone** — a tinted, classified group of cells (BULK/PICK/RECEIVING…), optional temperature class.
- **Cell purpose** (`CellPurpose`) — what a cell *is* (storage / walkable path / damaged goods / obstacle…). The behavioural flag is `holdsStock`: non-storage cells are excluded from occupancy and rejected as move/putaway destinations. `purposeId === null` ⇒ ordinary storage (so old layouts need no migration).
- **Location** (`WarehouseLocation`, a.k.a. "block/bin") — one cell: `code`, `barcode`, coords, `capacity` (max pallets/units/weight/volume), `materialRules`, `reservation`, `status` (ACTIVE/BLOCKED/DAMAGED/MAINTENANCE/RESERVED), `enabled`.
- **Material** (`MaterialWarehouseProfile`) — warehouse profile for an item: UoM, units/box, temp/hazmat class, and `trackLot`/`trackExpiry`/`trackSerial` flags that drive which fields Receive asks for.
- **Pallet** — a license plate: item, `boxCount`, `lotNumber`, `expiryDate`, `currentLocationId`, `status` (ACTIVE/PARTIAL/EMPTY/PICKED/SHIPPED/ON_HOLD).
- **InventoryRecord** — stock of an item at a location, optionally `palletId`-linked, with lot/serial/qty/uom/weight/volume/expiry.
- **MovementLogEntry** — the append-only audit trail (RECEIVE/PUTAWAY/TRANSFER/PICK/OUTBOUND/ADJUSTMENT/AUDIT/CYCLE_COUNT), with `discrepancy`/`auditConfirmed` flags.
- **LayoutTemplate** — a saved blueprint that spawns new warehouses.
- **WmsSettings** — the singleton (`wms-settings`): `masterEnabled`, `putawayMode` (DIRECTED/MANUAL/HYBRID), `pickStrategy` (FIFO/LIFO/FEFO), `mandatoryOutboundAudit`, `capacityViolation`/`materialRuleViolation` (BLOCK/WARN), `allowNegativeStock`, `forceLocationOnTransfer`, and `role` (ADMIN/OPERATOR).

**Derived, never stored:** occupancy %, display status/colour, utilization — recomputed by `services/occupancy.ts` from inventory + capacity.

**Occupancy nuance worth knowing:** `occupancyPct` is the max of the ratios that
have a configured maximum. A bin with only `maxPallets` set (default) and loose
units reports **0%**. "Is this bin empty?" is therefore measured from *actual* stock
present (`isEmptyDestination` in `services/emptyLocations.ts`), not from the percentage.

---

## End-to-end flows (numbered)

State plumbing (all flows): screens read collections reactively through
`store/useWmsStore.ts` (`useWmsCollection`) and mutate through `store/wmsStore.ts`,
which calls the `ApiAdapter` and then **reloads the affected collection(s)** so the
cache can't drift from the server.

### 1. Design a warehouse (admin)
`WmsDesignerPage` → set grid + naming (`services/layout.ts` generates the cells,
capped at **5,000** locations) → `WmsWarehouseEditorPage` paints areas, zones,
purposes, and per-cell properties. Saved as a bundle via
`wmsStore.saveWarehouseBundle` / `replaceWarehouseBundle` (a **minimal diff** — only
changed records are upserted, only removed ones deleted, scoped to that warehouse).
Warehouses can be cloned, exported/imported as JSON, built from CSV, or spawned from
a template (`WmsWarehousesPage`, `services/warehouseIO.ts`).

### 2. Receive & put away (operator) — `WmsReceivePage`
1. Scan an item code or a pallet plate. A known plate pre-fills its item; a known item code pulls name/UoM/units-per-box from its `Material` profile and shows **only** the tracked fields (lot/expiry).
2. Enter boxes (+ optional pallet plate, lot, expiry).
3. Pick a destination: the **putaway engine** (`services/putaway.ts`) ranks every *legal* bin (it runs `validateMove` first, then scores by consolidation, temperature, allowed-type, headroom, pick position). Top 3 get a ★. Empty bins are grouped by section; you can also scan a bin.
4. The validation panel shows errors (block) / warnings. Confirm → `wmsStore.receiveStock` creates the pallet (if any) + inventory (loose stock **merges** into a matching line; pallet stock gets its own) + a `PUTAWAY` movement. A QR label for the new pallet is offered for print.

### 3. Transfer / move (operator) — `WmsTransferPage`
Scan a source (location, item, or pallet) → choose the subject and quantity (or a
whole pallet) → scan/choose a destination → `validateMove` → confirm. Item moves
call `moveInventory` (splits/merges lines, follows the pallet if it fully leaves);
whole-pallet moves call `movePallet` (stock follows) **and best-effort mirror the
move back to the barcode backend** (`useSyncPalletToBarcode`).

### 4. Pick (operator) — `WmsPickPage`
Enter item + qty → `planPicks` (`services/picking.ts`) allocates across stock in the
configured **FIFO/LIFO/FEFO** order and directs the operator stop-by-stop. Each stop
requires scanning the **location** and the **item** (and a qty ≤ available) before
`Confirm`. A stop that consumes a **whole pallet** triggers the outbound audit
(below) before it leaves. Short picks warn ("only N available").

### 5. Take a pallet out (operator) — `WmsOutboundPage`
Scan a pallet plate, or scan a location and pick a pallet from it. The **mandatory
audit dialog** (`PalletAuditDialog`) shows item + box count prominently; the operator
confirms a match or logs a corrected box count. A **large discrepancy** (>20% of
boxes, min 5) needs supervisor approval — and **only an admin** (`useWmsRole().isAdmin`)
can toggle that approval. Confirm → `shipPallet`: removes the pallet's stock, marks
it `SHIPPED`, writes an `OUTBOUND` movement (+ an `ADJUSTMENT` flagged as a
discrepancy if the count was corrected). A `SHIPPED` label is offered for print.

### 6. Cycle count (operator) — `WmsCountPage`
Scan a location → adjust the counted qty per line and/or add "found" items → Post →
`postCycleCount` sets each line to its counted figure (removing emptied lines),
creates found items, and writes a `CYCLE_COUNT` movement (flagged discrepancy) for
every change.

### 7. Monitor & maintain
`WmsOverviewPage` (KPIs + "scan anything" locator + quick actions), `WmsMapPage`
(colour-coded live grid + moves), `WmsReportsPage` (where-is-item, utilization,
stock-by-location, movement history, replenishment, expiry — all pure queries in
`services/reports.ts`), `WmsLabelsPage` (QR labels via `qrcode.react`, TSC DA310
100×40 mm). `WmsAdminPage` browses/bulk-deletes raw records; `WmsSettingsPage` holds
config + maintenance (reconcile links, clear stock data).

---

## Critical business rules & invariants

- **Master flag is the top gate.** `useWmsEnabled()` (from the `settings.masterEnabled`) — when off, every page renders `WmsDisabledNotice` and `validateMove` fails with `feature_off`. `WmsEnabledGate` wraps any WMS surface injected into other screens.
- **Move validation is centralised** (`services/validation.ts`, `validateMove`) and shared by transfer, putaway ranking, and pick. Order of checks: feature on → qty > 0 → destination usable (outside-area / non-storage / disabled / blocked / maintenance) → reservation match → capacity (4 dims) → allowed/restricted type → mixing → single-lot → temperature → hazmat → FEFO expiry warning → sufficient source stock → lot/serial existence. **Capacity and material-rule violations are errors *or* warnings** per `capacityViolation`/`materialRuleViolation` settings.
- **Non-storage & outside-area cells are never valid destinations** (rejected in validation and excluded from suggestions/empty-bin pickers).
- **The outbound audit cannot be skipped when `mandatoryOutboundAudit` is on**, and large-discrepancy approval is **admin-only**.
- **Pick strategy** (FIFO/LIFO/FEFO) orders stock allocation; FEFO sorts by earliest expiry then creation.
- **Movements are append-only** — the frontend never edits them (matches the backend rule).
- **Two role systems coexist:** Django `wms.*` group perms (real access control) and the in-app `settings.role` ADMIN/OPERATOR switch (a soft UI toggle that hides designer/settings/approvals). They are independent — see Permissions below.

---

## Integrations & cross-module boundaries

- **Backend `wms` app** — the sole persistence path (`storage/apiAdapter.ts`, BASE `/wms`, i.e. `/api/v1/wms/...`). Company scoping rides on the `Company-Code` header that `core/api/client.ts` attaches from the selected company.
- **`barcode` module — bidirectional pallet bridge** (gated on an `OWN` warehouse whose `sapWarehouseCode` matches, and a bin whose code matches):
  - **barcode → WMS** (`store/usePalletMirror.ts`): the barcode module's `PalletMovePage`, `PalletTransferPage`, and `BoxTransferPage` call `useWmsPalletMirror` / `useWmsPalletSync` after a move, so a pallet moved in the barcode app appears on the WMS map/reports. `syncExternalPalletPlacement` relocates/creates; `reconcileExternalPallet` also reconciles box/qty; `removeExternalPallet` unplaces a pallet that left WMS-managed space.
  - **WMS → barcode** (`barcode/hooks/useSyncPalletToBarcode.ts`, called from `WmsTransferPage`): a whole-pallet WMS move is pushed to `barcodeApi.movePallet` so both datasets agree. **Best-effort** — failures are swallowed (the WMS move already succeeded).
- **Scanning** — `WmsScanButton` wraps the barcode module's `ScanSearchButton` (camera + manual entry, `expectedType="ANY"`, returns the raw code). Handheld scanners type into the focused input and submit on Enter.
- **No direct SAP posting** from this module (unlike the older `warehouse`/SAP "WMS"). SAP is reached only indirectly, via the barcode bridge above.
- **Host app** — routes/nav are contributed via `module.config.tsx` (`wmsModuleConfig`); the module is otherwise self-contained.

---

## Real-world edge cases

Each: **trigger → current behaviour → operator-visible symptom → risk/gap.**

- **Scanner offline / network down mid-action.**
  Trigger: no offline queue exists; a scan-confirm fires an API call that fails.
  Behaviour: the mutation throws; `notifyFail` shows a red toast ("Receive failed." / "Move failed." / "Ship failed."); nothing is persisted, and the cache stays truthful (it only updates on a successful reload).
  Symptom: the action visibly fails; the operator must retry when back online.
  Risk/gap: **all work requires connectivity** — there is no store-and-forward.

- **Duplicate / re-scanned pallet plate.**
  Trigger: Receive a plate that already exists.
  Behaviour: `receiveStock` always creates a **new** pallet row (no plate-uniqueness check), even though the scan can pre-fill the item from the existing one.
  Symptom: two pallets with the same plate; outbound/transfer resolves whichever is found first (`p.status !== 'SHIPPED'`), leaving a phantom.
  Risk/gap: no client- or server-side plate uniqueness.

- **Partial multi-write failure (e.g. ship).**
  Trigger: `shipPallet`/`receiveStock`/`moveInventory` issue several API calls; a later one fails.
  Behaviour: no cross-request transaction — the earlier writes stick.
  Symptom: stock on the map with **"no pallet"**, a `SHIPPED` pallet whose stock lingers, or a movement with no matching stock change.
  Risk/gap: repair only via **Settings → Reconcile pallet & stock links** (`reconcilePalletLinks`: follows stock to relocate pallets, re-links unambiguous stranded pallets) or the Admin console. `palletsLocatedAt` also papers over drift by showing a pallet wherever its stock actually is.

- **Barcode move that never appears in WMS.**
  Trigger: a pallet is moved in the barcode module into a warehouse whose WMS record has no matching `sapWarehouseCode`, or into a bin code that doesn't match any WMS location.
  Behaviour: `useWmsPalletMirror` silently returns `{mirrored:false, reason:'not-own-warehouse'|'location-not-found'}` — a deliberate no-op.
  Symptom: the pallet exists in the barcode app but is missing from the WMS map.
  Risk/gap: the mapping is silent; a mis-typed `sapWarehouseCode` or bin code just drops the mirror.

- **Stale data across devices / users.**
  Trigger: operator A receives into a bin; operator B is on another device.
  Behaviour: the store only reloads collections **it** mutated — there is no push/poll/websocket.
  Symptom: B still sees the bin empty until they re-navigate/reload; capacity is validated against B's stale view.
  Risk/gap: possible double-putaway; the map lags reality between refreshes.

- **Master flag flipped off mid-shift.**
  Trigger: an admin disables the module in Settings.
  Behaviour: `useWmsEnabled` flips false everywhere; pages swap to `WmsDisabledNotice`; `validateMove` returns `feature_off`.
  Symptom: operators mid-task are blocked instantly, app-wide.
  Risk/gap: no warning/confirmation about the blast radius.

- **In-app role switch is global, and not real security.**
  Trigger: someone flips the Overview role switch to Operator (or Admin).
  Behaviour: `role` is stored in the **shared** `settings` singleton, so it changes for **everyone in the company**, and it does **not** alter Django permissions.
  Symptom: designer/settings/approvals disappear from the nav for all users until switched back; a user without the perms still can't actually write regardless of the switch.
  Risk/gap: it's a convenience toggle masquerading as a role; easy to misread as per-user security.

- **Capacity never configured.**
  Trigger: bins keep the default `maxPallets: 1`, no unit/weight/volume max.
  Behaviour: capacity checks skip null dimensions; occupancy shows 0% until a pallet lands.
  Symptom: loose stock can pile into a bin the map still paints "empty-ish."
  Risk/gap: occupancy colour can under-represent real fill.

- **Company switch without cache reset.**
  Trigger: user switches company (`switchCompany`).
  Behaviour: `wmsStore` is a module singleton; `wmsStore.reset()` is only called in tests, not on company change.
  Symptom (potential): unless the switch remounts/reloads the app, previously-loaded warehouses/stock from the old company can linger in the cache.
  Risk/gap: confirm the app forces a reload on company switch; otherwise wire `wmsStore.reset()` into it.

---

## Failure modes / what can break

- **"Warehouse Ops is blank / won't load."** Usually the `Company-Code` header is missing/invalid (backend `403`), or the user has no `wms.*` permission (module hidden). Check group membership and company selection first.
- **"I can see stock but Save/Ship/Receive fails."** The user is an operator hitting a structural write, or lacks the operational perm → backend `403`, surfaced as a red toast.
- **Orphaned pallets / "stock here but no pallet."** A partial multi-write. Fix with Settings → *Reconcile pallet & stock links*.
- **Map/occupancy looks wrong or lags.** Stale cross-device cache, or capacity not configured (see edge cases). A hard refresh reloads from the server.
- **Barcode and WMS disagree on a pallet.** The best-effort `WMS → barcode` push failed (swallowed), or the `barcode → WMS` mirror no-oped on a mapping miss.
- **No warehouses yet.** Receive/Overview show "Design a warehouse first" — the operator can't do anything until an admin designs one and the master flag is on.
- **Label won't print correctly.** Labels target a TSC DA310 at 100×40 mm; wrong printer/driver = misfit output.

---

## Improvement opportunities & known gaps

- **No offline support.** A store-and-forward queue would make scan flows resilient on flaky warehouse Wi-Fi.
- **No live sync between devices.** Polling/websockets (or at least a manual "refresh") would cut stale-cache putaway errors.
- **Composite operations aren't atomic** (client-side multi-call). A transactional backend endpoint would kill the partial-failure class.
- **Business-key uniqueness** (license plate, location code) is unchecked on both tiers.
- **The `role` toggle is global and non-authoritative** — consider per-user role, or drop it in favour of Django perms only.
- **Silent cross-module mirror** — surface a toast when a barcode move can't be mirrored (mapping miss) so it isn't lost.
- **Stale module-local README** (`src/modules/wms/README.md`) still describes the removed IndexedDB/localStorage adapters and "Step 1 only" — it should be updated or pointed at this doc.

---

## Permissions & roles (nav gating)

Defined in `src/config/permissions/wms.permissions.ts`, applied in `module.config.tsx`.

- **Module visibility:** the sidebar entry keys off `modulePrefix: 'wms'` — a user holding **no** `wms.*` permission never sees Warehouse Ops at all.
- **`WMS_ACCESS`** (operator + admin) gates the operator pages: Overview, Map, Receive, Transfer, Pick, Outbound, Cycle Count, Reports, Labels. It is an **any-of** list that includes the operational write perms (`add/change/delete_pallet|inventory`, `add_movement`) **and** the `view_*` perms — so a `WMS Operator` (who has the write perms but **no `view_*`**) still passes.
- **`WMS_ADMIN_ACCESS`** (admin only) gates the structural pages: Warehouses, Warehouse Editor, Designer, Admin, Settings. Backed by `change/add_warehouse`, `change_template`, `change/add_settings` — a `WMS Operator` fails these.
- **In-app role** (`settings.role`, `useWmsRole`) additionally hides Designer/Settings/approvals in the UI and gates who can approve a large outbound discrepancy (`isAdmin`). Remember it is **shared, global, and not a security boundary** (see edge cases).

| Capability | No `wms.*` | `WMS Operator` | `WMS Admin` |
|---|---|---|---|
| See the module in the sidebar | ❌ | ✅ | ✅ |
| Receive / Transfer / Pick / Outbound / Count / Reports / Map / Labels | ❌ | ✅ | ✅ |
| Warehouses / Designer / Editor / Admin / Settings | ❌ | ❌ (nav hidden; API `403`) | ✅ |
| Approve a large outbound discrepancy | — | ❌ (needs in-app ADMIN role) | ✅ |

---

## Developer file map

**Frontend (`C:/Users/gurpa/dev/FactoryFlow/src/modules/wms/`):**
- `module.config.tsx` — routes (`/warehouse-ops/*`), nav, permission gates.
- `types/wms.types.ts` — all record types + `DEFAULT_WMS_SETTINGS`.
- `storage/` — `adapter.types.ts` (contract + `WmsCollectionMap`), `apiAdapter.ts` (REST client), `createAdapter.ts` (the single active-adapter chooser — API only).
- `store/` — `wmsStore.ts` (cache + composite ops: `receiveStock`, `moveInventory`, `movePallet`, `pickInventory`, `shipPallet`, `postCycleCount`, `reconcilePalletLinks`, `clearStockData`, warehouse bundle diff/save, external-pallet bridges), `useWmsStore.ts` (`useWmsCollection`), `useWmsSettings.ts` (`useWmsEnabled`/`useWmsRole`), `useWarehouses.ts`, `usePalletMirror.ts` (barcode→WMS bridge).
- `services/` — `layout.ts` (grid gen), `factories.ts` (record builders), `validation.ts` (`validateMove`), `occupancy.ts`, `putaway.ts` (`suggestPutaway`), `picking.ts` (`planPicks`), `emptyLocations.ts`, `areas.ts`, `reports.ts`, `warehouseIO.ts`, `csv.ts`, `templates.ts`.
- `pages/` — `WmsOverviewPage`, `WmsWarehousesPage`, `WmsWarehouseEditorPage`, `WmsDesignerPage`, `WmsMapPage`, `WmsReceivePage`, `WmsTransferPage`, `WmsPickPage`, `WmsOutboundPage`, `WmsCountPage`, `WmsReportsPage`, `WmsLabelsPage`, `WmsAdminPage`, `WmsSettingsPage`.
- `components/` — `WmsScanButton`, `WmsEnabledGate`, `WmsDisabledNotice`, `PalletAuditDialog`, `WmsBarcode`, `WmsPrintLabel(Button)`, `WarehouseMapGrid`, `MapLegend`, `LocationDetailPanel`, `LocationPropertiesPanel`, area/zone/purpose dialogs.
- `src/config/permissions/wms.permissions.ts` — `WMS_ACCESS`, `WMS_ADMIN_ACCESS`, `WMS_MODULE_PREFIX`, `WMS_PERMISSIONS`.
- Cross-module: `src/modules/barcode/hooks/useSyncPalletToBarcode.ts`, `src/modules/barcode/pages/{PalletMovePage,PalletTransferPage,BoxTransferPage}.tsx`.
- Tests: `src/modules/wms/__tests__/*` (store ops, validation, putaway, picking, occupancy, external sync, warehouse-editor race + real-backend e2e).

**Backend (`C:/Users/gurpa/dev/factory_app/wms/`):** `models.py`, `views.py`, `permissions.py`, `urls.py`, `admin.py` — see the backend doc.

---

## Related docs

- **Backend companion:** [`factory_app/wms/docs/README.md`](../../../factory_app/wms/docs/README.md) — the JSON persistence contract, API surface, company scoping, permission rules, and server-side failure modes.
- **Stale / superseded:** `src/modules/wms/README.md` (module-local, "Step 1", describes removed local adapters) — do not trust its storage section.
- **A different "WMS" (SAP analytics):** `src/docs/WMS_ARCHITECTURE.md`, `src/docs/WMS_API_REFERENCE.md`, and the `warehouse` module — SAP OITW/OITM dashboards, BOM requests, FG receipts. Separate subsystem, same acronym.
