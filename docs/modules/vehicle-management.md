# Vehicle & Transporter Management — Frontend

Module folder: `C:/Users/gurpa/dev/FactoryFlow/src/modules/vehicle-management`
Config: `module.config.tsx` (routes + nav gating)

> Backend companion doc: `C:/Users/gurpa/dev/factory_app/vehicle_management/docs/README.md`

---

## Overview — what it does & who uses it

Two distinct jobs share this folder:

1. **Masters cockpit** (`/vehicle-management/*`) — browse + create screens for **Vehicles,
   Transporters, Drivers**, plus a **Vehicle Entries** viewer. Used by gate/office staff to keep
   the master lists clean and to review what came through the gate.
2. **Dispatch integration screens** — **Dispatch Vehicle Linking** and **Inside Vehicle Manager**.
   These *files live here* but are **routed under `/dispatch/*`** and gated on **dispatch**
   permissions (they are dispatch features that reuse this module's vehicle picker). Used by
   **planning/dispatch** to attach transport to bills and to fix loads on trucks already inside.

The module is deliberately thin: the actual **master CRUD dialogs and query hooks are reused from
`@/modules/gate`** — this module mostly composes them into browse pages and owns the dispatch-
linking UI. There is **no offline queue and no barcode scanning here** (box scanning belongs to
the gate/docking module).

---

## Key concepts & entities (frontend types)

- **Vehicle / Transporter / Driver** — masters, typed in `@/modules/gate/api/vehicle/*`.
  `Vehicle` carries a nested `vehicle_type` and `transporter`.
- **Vehicle Entry** — a gate record (`vehicleEntry.api.ts`): `entry_no`, `entry_type`, `status`,
  `entry_time`, nested `vehicle`/`driver`, `qc_final_status` (raw-material only).
- **`DispatchBill`** (`@/modules/dashboards/dispatch-plans/types`) — a SAP invoice + its
  `plan` (`booking_status`, `vehicle_id`, `linked_vehicle_entry_id`, `is_vehicle_link_locked`,
  `dispatch_date`, SAP transport hints). The unit both dispatch screens operate on.
- **`DispatchLinkingFilters` / `…Response`** (`types/dispatch-linking.types.ts`) — bucket
  (`today|overdue|upcoming|all`), `date`, `booking_status`, `search`, `limit`; the response carries
  `data` + a `meta` count block for the bucket chips.
- **`DispatchVehicleLinkPayload`** — the full plan-update body sent when linking (invoice +
  transport snapshot + `vehicle_id`/`transporter_id` + `booking_status` + optional
  `linked_invoice_doc_entries` for batch link).
- **`InsideDispatchVehicle` / `InsideVehicleBill`** (`@/modules/gate/api`) — one live dispatch
  gate-in and its covered bills; bills carry `removable`, `not_removable_reason`, `duplicate_on[]`.
- **`VehicleGroup`** (local to `InsideVehicleManagerPage`) — physical-truck grouping: folds every
  per-company gate-in that shares one `arrival` into **one card**.

---

## End-to-end flows (user journeys)

### 1. Browse / create a master
`VehiclesPage` · `TransportersPage` · `DriversPage`
1. Page loads all rows via the gate hook (`useVehicles` / `useTransporters` / `useDrivers`) and
   filters **client-side** with the search box.
2. "New …" opens the gate module's `CreateVehicleDialog` / `CreateTransporterDialog` /
   `CreateDriverDialog`. The button is **disabled unless** the user has the matching
   `change_*` permission (`canManage`).
3. There is **no inline edit/delete** on these pages — editing is done in Django admin or via the
   gate dialogs. Rows are display-only.

### 2. Review vehicle entries
`VehicleEntriesPage`
1. Filters: From/To dates (default last 30 days), Type (Raw Material / Construction / Daily Needs /
   Maintenance / **Docking** = `SALES_DISPATCH`), Status, and a free-text search.
2. Type = **All** fans out **one request per entry-type** via `Promise.allSettled` and merges
   results; a partial failure is tolerated (only throws if *every* type request rejects).
3. Rows show entry no/remarks, vehicle, driver, type, status, entry time. Read-only.

### 3. Dispatch Vehicle Linking (`/dispatch/vehicle-linking`)
`DispatchVehicleLinkingPage` + `DispatchLinkingTable` + `DispatchLinkingSheet`
1. `useDispatchLinkingPlans` calls `dispatchLinkingApi.getPlans`, which fetches a **wide source
   window** (`−365 … +90 days`, `limit: 2000` by default) of bills once, then **buckets
   client-side** into today/overdue/upcoming/all. Bucket chips show live counts from `meta`;
   **Overdue turns red** when non-zero. The query key includes `currentCompany.company_id`, so
   switching the active company refetches.
2. Operator clicks **Link** on a row (or multi-selects rows via checkboxes and links them together
   — one vehicle for several invoices).
3. The **Sheet** opens. It:
   - Loads vehicle names (`useVehicleNames`) and, if SAP already named a plate, **auto-selects the
     matching master vehicle** (normalised plate compare); picking a vehicle auto-fills transporter
     name/GSTIN/contact/mobile from the master.
   - If SAP's plate has **no master vehicle**, shows an **amber warning** + an **"Add Vehicle"**
     shortcut (`CreateVehicleDialog` seeded with the SAP plate + SAP transporter details).
   - For a **batch link** (`activeBills.length > 1`) hides per-invoice fields and shows a totals
     table (litres / weight / amount) over the selected invoices.
4. **Save** → `useLinkDispatchVehicle` → `dispatchLinkingApi.linkVehicle` →
   `dispatchPlansApi.updatePlan(docEntry, payload)` with `booking_status: 'BOOKED'` and
   `linked_invoice_doc_entries` = all selected. `invoice_weight` is rounded to **3 decimals**
   (`invoiceWeightForPayload`) to fit the backend `DecimalField`. Success toast; sheet closes;
   queries invalidated (`dispatch-linking`, `dispatch-plans`, `salesDispatchGateOuts`).
5. **Unlink** (single, unlocked, already-linked bill only — `canUnlink`) → `useUnlinkDispatchVehicle`
   resets the plan to `PENDING` and nulls vehicle/transporter/driver/`linked_vehicle_entry_id`.

### 4. Inside Vehicle Manager (`/dispatch/inside-vehicles`)
`InsideVehicleManagerPage` — the **correction console** for trucks already inside.
1. `useInsideDispatchVehicles` loads live dispatch gate-ins **across all the user's companies**;
   `buildVehicleGroups` folds gate-ins sharing an `arrival` into **one truck card** with a
   **per-company panel** underneath.
2. `useDispatchBills({ all_companies: true, limit: 500, date_from: −30d, date_to: +7d })` loads a
   recent cross-company bill feed for the "add a bill" pickers.
3. Per-company panel actions (each gated by its own permission):
   - **Add Bill** — pick a booked/pending, not-yet-linked bill for *that company*
     (`useAddBillToInsideVehicle`). A **by-number lookup** (`useLookupDispatchBill`, scoped to the
     panel's `company_code`) finds bills older than the 500-row feed.
   - **Unlink All** — remove every removable bill (`useUnlinkAllBills`); committed bills are skipped.
   - **Remove** / **Move** (per bill) — `useRemoveBillFromInsideVehicle` /
     `useMoveBillBetweenVehicles` (move to any *other* inside truck). Disabled when
     `!bill.removable`, with `not_removable_reason` as the tooltip.
4. Truck-level **"Add other bill"** — add a bill for a company that has **no gate-in on this truck
   yet** (`useAddBillToTruck`), creating a new per-company gate-in under the same arrival. The
   company dropdown lists only the user's companies not already on the truck.
5. **Mark Out** — navigates to `/gate/empty-vehicle-out/new?entry=<vehicle_entry_id>` (uses the
   **first** entry's `vehicle_entry_id`) to send the truck to the empty-out flow. **This is the
   only action that actually retires the gate-in and sends the truck out** — Remove/Unlink-All do
   not (see edge cases).
6. Destructive actions (remove / unlink-all / move) route through a **confirm dialog** with
   explicit copy before mutating.

---

## Critical business rules & invariants (frontend-visible)

- **Dispatch screens are dispatch-permissioned, not vehicle-permissioned.**
  `/vehicle-management/dispatch-linking` is only a **redirect** to `/dispatch/vehicle-linking`;
  the real routes and nav live in `@/modules/dispatch/module.config.tsx`. (The redirect stub is
  gated on `VEHICLE_MANAGEMENT_PERMISSIONS.DISPATCH_VEHICLE_LINKING`, which maps to the same
  `dispatch_plans.can_link_dispatch_vehicle` codename.)
- **Link is blocked when `plan.is_vehicle_link_locked`.** The row's action becomes a **"Locked"**
  button (disabled) with a tooltip to do an empty-vehicle-out first; the checkbox is also disabled.
  Unlink is hidden for locked or batch selections.
- **A vehicle must resolve to a master `vehicle_id` before save.** Submitting with only a SAP plate
  string shows a red error: *"Vehicle X is coming from SAP but is not linked to Vehicle Master…"*
  and blocks.
- **Batch link = one vehicle, many invoices.** The sheet hides per-invoice fields and shows a
  totals table; `linked_invoice_doc_entries` carries all selected `doc_entry`s. (The backend
  rejects invoices from different SAP branches.)
- **A bill is addable only if** not already linked **and** `booking_status ∈ {PENDING, BOOKED}`
  (`isBillAddable`). Adding is **blocked once the truck photo is taken at docking** (backend
  enforces; the picker's helper text states it).
- **Invoice weight is rounded to 3 decimals** before send (`invoiceWeightForPayload`).
- **Masters "New" buttons require the `change_*` permission**; the browse tables only require
  `VIEW`.

---

## Integrations & cross-module boundaries

- **`@/modules/gate`** — supplies master query hooks (`useVehicles/useTransporters/useDrivers/
  useVehicleNames/useVehicleById`), the create dialogs, the `vehicleEntry.api`, **and** all the
  inside-vehicle mutation hooks (`useAddBillToInsideVehicle`, `useAddBillToTruck`,
  `useRemoveBillFromInsideVehicle`, `useMoveBillBetweenVehicles`, `useUnlinkAllBills`,
  `useInsideDispatchVehicles`). This module is a **consumer** of gate.
- **`@/modules/dashboards/dispatch-plans`** — `dispatchPlansApi.getBills/updatePlan`,
  `useDispatchBills`, `useLookupDispatchBill`, `DispatchBill` types; the linking layer is a thin
  wrapper (`dispatch-linking.api.ts`).
- **Backend endpoints** — masters under `/vehicle-management/{vehicles,vehicles/names,
  vehicle-types,vehicle-entries,…}` and `/driver-management/drivers/`; linking write path
  `PUT /dispatch-plans/bills/<doc_entry>/plan/`; the inside-vehicle console under
  `/gate-core/inside-dispatch-vehicles/{,add-bill,add-bill-to-truck,remove-bill,move-bill,unlink-all}`.
- **SAP** — surfaced read-only as "SAP Hints" (transporter/plate/bilty) and seeds the add-vehicle
  dialog; **linking itself never posts to SAP**.

---

## Real-world edge cases

Each: **trigger → current behaviour → what the operator sees → risk/gap.**

1. **SAP plate not in Vehicle Master.** → Sheet can't set `vehicle_id`. → Amber banner "SAP shows
   vehicle X, not linked to Master" + "Add Vehicle" button; save is blocked with a red form error.
   → Risk: operators create near-duplicate masters from plate typos.

2. **Vehicle already inside, planner tries to link a new bill.** → Backend guard rejects. →
   `getErrorMessage` surfaces the exact toast: *"…is already inside — add bills from the 'Add Bills
   to Inside Vehicle' page."* → Correct redirect, but only if they know the console exists.

3. **Link is locked (empty-in completed).** → Row shows a disabled **Locked** button + tooltip. →
   Operator can't edit until an empty-vehicle-out is done. → Expected.

4. **Duplicate cover (same bill on two gate-ins).** → Inside card shows a red **"Duplicate cover
   (n)"** badge (hover lists the other entries). → Operator removes the wrong copy. → This is the
   console's reason to exist.

5. **Bill already loading/dispatched.** → `removable=false`; **Remove/Move disabled**, showing
   "Locked — <reason>". → Operator can't pull a committed bill. → Prevents data drift vs. the
   physical truck.

6. **Remove / Unlink All / Move empties a truck's company panel.** → The bills disappear from the
   panel, but the **truck card stays** and the vehicle is still "inside" on the linking board. →
   Operator expects the truck to be released and is confused when it isn't. → **Gap (backend):**
   emptying a gate-in from the console does **not** retire it — the truck is only freed by **Mark
   Out** (empty-vehicle-out). Tell operators: reset the load *then* Mark Out.

7. **Bill older than the 500-row feed.** → Typing the full bill number triggers
   `useLookupDispatchBill` (scoped to the panel's company) and folds the result into the picker. →
   The bill becomes selectable. → If the number is mistyped, it just won't appear.

8. **Multi-company / partial-load truck.** → One card, multiple company panels; "Add other bill"
   adds a company not yet on the truck. → Operator sees every company's bills on one physical
   truck. → Mark-Out uses the *first* entry's `vehicle_entry_id`; the empty-out flow handles the
   rest of the trip.

9. **Plans feed fails to load (linking board).** → `plansQuery.error` renders a red banner
   *"Failed to load dispatch plans."* instead of the table. → No partial data shown.

10. **Vehicle-Entries "All" type with one failing type.** → `Promise.allSettled` keeps the
    successful types; only a total failure throws. → Some rows may be missing silently if one
    entry-type endpoint errors. → Risk: silent partial data.

11. **Wrong litres on a bill.** → No numeric override field; the sheet asks the operator to note the
    correct litres in **Transport Remarks** ("If the Total Litres above looks wrong, note the
    correct litres here."). → Downstream must read remarks. → Gap: free-text, not structured.

12. **Cross-company data appears "blank."** → The inside console explicitly passes
    `all_companies: true`; the masters are global. → Data shows regardless of the active company
    tab. → If a future screen forgets `all_companies`, sibling-company trucks vanish.

---

## Failure modes / what can break

| Trigger | UI behaviour | What the user sees |
|---|---|---|
| Link/unlink mutation rejected | `toast.error(getErrorMessage(...))` | Backend guard message (e.g. "already inside"); sheet stays open |
| Save without a master vehicle | inline form error, scroll-to-error | Red box: "…not linked to Vehicle Master…" |
| Batch link across SAP branches | `toast.error` from backend | "Selected invoices must belong to the same SAP branch." |
| Plans query error | error banner replaces table | "Failed to load dispatch plans." |
| Inside-vehicles query empty/loading | `EmptyState` | "No dispatch vehicles are currently inside." / "Loading inside vehicles…" |
| Add/remove/move bill rejected | `toast.error` | e.g. "Failed to add the bill" + backend reason (photo-locked, committed) |
| Unlink-All succeeds but truck stays inside | success toast, card remains | Truck still shows "inside" — must Mark Out to release it |
| Missing `change_*` permission | "New …" button disabled | Can browse but not create |
| Missing dispatch permission | route/nav hidden | Linking / Inside-Vehicle pages not in sidebar |
| No dispatch date on a bill | filtered out of buckets | Bill silently absent from the linking board |

---

## Improvement opportunities & known gaps

- **Emptying a gate-in from the console doesn't release the truck** (backend detach doesn't
  retire) — the UI should either call Mark Out automatically once the last bill is removed, or make
  the "reset then Mark Out" sequence explicit in the copy.
- **Client-side bucketing over a −365/+90-day fetch** (`getPlans`, `limit: 2000`) is heavy for
  high-volume companies; consider server-side date filtering.
- **Masters pages are create-only** — no edit/deactivate UI; users drop to Django admin.
- **Partial-failure silence** on the "All" vehicle-entries fan-out can hide missing rows.
- **Litres correction is free-text remarks**, not a structured field.
- **Duplicate-master prevention is manual** — no fuzzy plate matching when adding from SAP (only an
  exact normalised-plate auto-match).

---

## Permissions & roles (nav gating)

Masters (`module.config.tsx`, `VEHICLE_MANAGEMENT_PERMISSIONS`):
| Screen | View gate | Action gate |
|---|---|---|
| Vehicle Management dashboard + sidebar parent | `vehicle_management.view_vehicle` | — |
| Vehicles | `view_vehicle` OR `change_vehicle` | New Vehicle → `change_vehicle` |
| Transporters | `view_vehicle` OR `change_transporter` | New Transporter → `change_transporter` |
| Drivers | `view_vehicle` OR `change_driver` (`driver_management`) | New Driver → `change_driver` |
| Vehicle Entries | `view_vehicle` | read-only |

Dispatch screens (`@/modules/dispatch/module.config.tsx`, `DISPATCH_PERMISSIONS`):
| Screen / action | Permission codename |
|---|---|
| Vehicle Linking page (route + nav) | `dispatch_plans.can_link_dispatch_vehicle` |
| Inside Vehicle Manager (view) | `dispatch_plans.can_view_inside_vehicle_manager` |
| Add Bill / Add other bill | `dispatch_plans.can_add_bill_inside_vehicle` |
| Remove Bill | `dispatch_plans.can_remove_bill_inside_vehicle` |
| Move Bill | `dispatch_plans.can_move_bill_inside_vehicle` |
| Unlink All | `dispatch_plans.can_unlink_bills_inside_vehicle` |
| Mark Out | `dispatch_plans.can_mark_out_inside_vehicle` |

Each Inside-Vehicle button is gated **independently**, so an "add-only" SCM operator sees the page
but only the Add actions. Permission codenames: `@/config/permissions/{vehicle-management,dispatch}.permissions.ts`.

---

## Developer file map

**This module — `src/modules/vehicle-management/`**
- `module.config.tsx` — masters routes + sidebar (dispatch-linking route is a redirect)
- `pages/VehicleManagementDashboardPage.tsx` — permission-filtered card grid
- `pages/VehiclesPage.tsx` · `TransportersPage.tsx` · `DriversPage.tsx` — browse + create
- `pages/VehicleEntriesPage.tsx` — gate-entry viewer (multi-type `Promise.allSettled` fan-out)
- `pages/DispatchVehicleLinkingPage.tsx` — linking board (routed at `/dispatch/vehicle-linking`)
- `pages/InsideVehicleManagerPage.tsx` — correction console (routed at `/dispatch/inside-vehicles`)
- `components/DispatchLinkingTable.tsx` — the bill table (row colours, lock state, multi-select)
- `components/DispatchLinkingSheet.tsx` — link sheet + `DispatchVehicleSelect` (SAP auto-match, add-vehicle, batch totals)
- `api/dispatch-linking.api.ts` — `getPlans` (source window + client-side bucketing), `linkVehicle`, `unlinkVehicle`
- `api/dispatch-linking.queries.ts` — react-query hooks + cache invalidation
- `types/dispatch-linking.types.ts` — linking types

**Reused from other modules**
- `@/modules/gate/api/vehicle/*` + `driver/*` — master hooks + APIs, `vehicleEntry.api`
- `@/modules/gate/api` — inside-vehicle hooks (`useInsideDispatchVehicles`, add/remove/move/unlink/add-to-truck)
- `@/modules/gate/components` — `CreateVehicleDialog/CreateTransporterDialog/CreateDriverDialog`
- `@/modules/dashboards/dispatch-plans/*` — `dispatchPlansApi`, `useDispatchBills`, `useLookupDispatchBill`, `DispatchBill`
- `@/modules/dispatch/module.config.tsx` — where the two dispatch screens are actually routed
- `@/config/permissions/{vehicle-management,dispatch}.permissions.ts`

---

## Related docs

- **Backend companion:** `C:/Users/gurpa/dev/factory_app/vehicle_management/docs/README.md`
- `C:/Users/gurpa/dev/FactoryFlow/docs/gate.md` — gate flows (master CRUD dialogs, empty-vehicle)
- `C:/Users/gurpa/dev/FactoryFlow/docs/dispatch.md` — dispatch module (where these screens route)
- `C:/Users/gurpa/dev/FactoryFlow/docs/sales-dispatch-docking.md` — docking / box-scan / gatepass
- `C:/Users/gurpa/dev/FactoryFlow/docs/sap-plan-dashboard-frontend.md` — dispatch plans board
