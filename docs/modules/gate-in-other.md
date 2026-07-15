# Gate-In — Other Material Types (Frontend)

Daily Needs, Construction, Fixed Assets, Maintenance, and Visitor/Labour screens inside the **Gate** module.

> **Audience:** new frontend devs + technical managers.
> **Scope:** the parts of `src/modules/gate/` that cover the five "other" gate-in types — everything the gate does besides raw-material, empty-vehicle, dispatch, BST, returnable, and job-work.
> **Paired backend doc:** [`factory_app/docs/gate_in_other_materials.md`](../../../factory_app/docs/gate_in_other_materials.md).
> Trust this doc + the code over the older `src/modules/gate/docs/` files.

---

## Overview — what it does & who uses it

The **Gate** module (`/gate`) is one React module (`gateModuleConfig` in `module.config.tsx`) covering ~20 entry types. This doc covers the five that aren't raw-material or an outbound/return flow:

| Type | Route base | Shape | Operator |
|------|-----------|-------|----------|
| **Daily Needs** (food/consumables) | `/gate/daily-needs` | 3-step wizard | Gate / canteen |
| **Maintenance** (spares/tools) | `/gate/maintenance` | 3-step wizard | Gate / maintenance store |
| **Construction** (civil/building) | `/gate/construction` | 3-step wizard | Gate / site |
| **Fixed Assets** (capital/equipment) | `/gate/fixed-assets` | 3-step wizard | Gate / stores |
| **Visitor/Labour** (people) | `/gate/visitor-labour` | single-form + boards | Gate / security |

The four **material** wizards are **config-driven clones** of one shared engine (`SharedStep1Page`, `SharedAttachmentsPage`, `SharedDashboard`, `SharedAllPage`) parameterised by an `EntryFlowConfig`. The **Visitor/Labour** flow is bespoke: a "who is inside" board, a single-screen entry form, multiple gates, and visitor/labour/contractor master management — no vehicle wizard.

Each material type is its own **entry wizard**, but they share code; the person flow is deliberately different because people don't have a PO, a truck, or a weighbridge.

---

## Key concepts & entities

- **`EntryFlowConfig`** (`constants/entryFlowConfig.ts`) — the per-type descriptor: `entryType`, `routePrefix`, `headerTitle`, `totalSteps`, dashboard/all-page titles, and `attachmentsPreviousStep`. `DAILY_NEED_FLOW`, `MAINTENANCE_FLOW`, `CONSTRUCTION_FLOW`, `FIXED_ASSET_FLOW` all point one shared page component at a different backend.
- **`GATE_ENTRY_TYPES`** (`constants/gateEntryTypes.ts`) — the catalogue behind the dashboard tiles and the New-Entry picker: icon, colour, keywords (search), `viewPermissions`/`createPermissions`, `dashboardRoute`, `newEntryRoute`, `vehicleMode` (`vehicle` vs `non_vehicle`).
- **`GATE_PERMISSIONS`** (`@/config/permissions/gate.permissions.ts`) — string constants mirroring Django codenames; drive both route gating and tile visibility.
- **Wizard identity** — the material header (`VehicleEntry`) `id` flows through the URL as `:entryId` (edit mode) or `?entryId=` (create mode); `useEntryId()` reads it, `useEntryStepTracker()` records progress.
- **Person masters** — `Visitor`, `Labour` (belongs to a `Contractor`), `Gate`, `PersonType` (IDs hard-coded: `VISITOR=1`, `LABOUR=2` in `personGateIn.api.ts`), `EntryLog` (status `IN`/`OUT`/`CANCELLED`).

---

## End-to-end flows (user journeys)

### Flow A — Material wizard (daily/maintenance/construction/fixed-asset)

Routes per type: `…/new` → `…/new/step2` → `…/new/attachments` → `…/new/review`, mirrored under `…/edit/:entryId/…`.

1. **Step 1 — Vehicle, Driver & Security** (`SharedStep1Page` via each type's `Step1Page.tsx`). One combined form (`VehicleDriverSecurityFormShell`) picks/creates vehicle + driver and fills the security check.
   - On **Next** in create mode it generates `entry_no = GE-<year>-<last 4 digits of Date.now()>`, calls `useCreateVehicleEntry` (**once** — guarded by `createdEntryIdRef` so a retry never double-creates), then saves the security check, then navigates to **`/edit/:id/step2`** — i.e. it immediately switches into edit mode with the real server id.
2. **Step 2 — Material detail** (each type's `Step3Page.tsx`, shown at URL `…/step2`). The type-specific form:
   - **Daily needs:** category, supplier, receiving department, **1..n material line items** (add/remove), bill number, delivery challan, supervisor, remarks.
   - **Maintenance:** type, supplier, description, part no., qty/unit, invoice, equipment id, receiving department, urgency; optional asset/work-order/spare link.
   - **Construction:** project, contractor, category, description, qty/unit, challan/invoice, **`site_engineer`** and **`security_approval`** (operator-selected dropdown), remarks.
   - **Fixed assets:** supplier, invoice, remarks + **1..n asset line items** (`Step2Page.tsx`) with category/name/serial/qty/unit.
   - Saves via the type's `create`/upsert mutation, then navigates to Attachments.
3. **Attachments** (`SharedAttachmentsPage`). Upload the bill/invoice. For all four types a **required document label is passed**, so the page blocks **Next → Review** until at least one file is uploaded (`"Bill upload is required before review."`). Files POST to `/gate-core/gate-attachments/:id/`.
4. **Review** (each type's `ReviewPage.tsx`) reads the backend **FullView** (`useDailyNeedFullView` etc.) and shows a read-only summary. **Complete Entry** calls the type's `complete` mutation → backend locks the header → an animated success screen offers "Dashboard" / "Home". If already `COMPLETED`, the button reads "Entry Completed".

**Edit mode** re-enters any step via `…/edit/:entryId/stepN`. Fields are read-only until **Update** is clicked (and only while status ≠ `COMPLETED`). A "Fill Data" affordance appears if the detail 404s (header exists, detail never saved).

### Flow B — Dashboards & lists (material)
`SharedDashboard` (`/gate/<type>`) shows tiles/status counts; `SharedAllPage` (`/gate/<type>/all`) is the filterable list (date range + status) built on `VehicleEntry` list endpoints. Raw-materials, maintenance, construction, fixed-assets each have their own `*Dashboard.tsx`; daily-needs uses `DailyNeedsPage`/`DailyNeedsAllPage`.

### Flow C — Visitor/Labour (person)
- **Dashboard** `/gate/visitor-labour` (`PersonGateInDashboard`) — live counts (inside now, today's entries/exits, >8h-inside), gate-wise and person-type-wise breakdowns, recent entries.
- **New entry** `/gate/visitor-labour/new` (`NewEntryPage`) — toggle Visitor/Labour, searchable person select, entry gate, entry time, purpose, vehicle no. (validated against `VALIDATION_PATTERNS.vehicleNumber`), remarks → single `POST /entry/create/` → redirects to the entry detail.
- **Inside board** `/gate/visitor-labour/inside` (`InsideListPage`) — everyone currently `IN`, grouped visitor/labour, searchable, with per-row **Exit** (optional gate). Live duration is computed client-side.
- **Entry detail** `/gate/visitor-labour/entry/:entryId` — full record + exit/cancel/update.
- **Masters** — `/visitors`, `/labours`, `/contractors`, `/contractor/:id/labours` (CRUD + create dialogs `CreateVisitorDialog`/`CreateLabourDialog`). Bulk labour entry/exit is available through the contractor screens (`bulkCreateEntry`/`bulkExitEntry`).

---

## State / offline behaviour, scanning

- **Server state:** TanStack Query throughout (`*.queries.ts`). Mutations invalidate `['vehicleEntries']`, `['securityCheck']`, `['gateEntryFullView']`, `['dailyNeedFullView']`, etc. There is **no offline queue / service worker** for these flows — a dropped network surfaces as an error toast/inline message, and the operator retries.
- **Wizard state is per-page React state**, not a global store. The only cross-step handoff is the `entryId` in the URL; navigating away mid-wizard loses unsaved local edits (but the header/detail already saved server-side persist).
- **Idempotent header create:** `createdEntryIdRef` in `SharedStep1Page` ensures a failed navigation/retry re-uses the already-created `VehicleEntry` instead of minting a duplicate.
- **No barcode scanning** in these five flows — bill capture is a file upload (camera/photo/PDF via the OS file picker in `SharedAttachmentsPage`), not a scanner. (Barcode scanning lives in the dispatch/docking flows, not here.)
- **Forms post `multipart/form-data`** where files/photos are involved (daily-need create, visitor/labour photos, attachments).

---

## Critical business rules & invariants (frontend view)

- **Bill required before Review** — enforced client-side by passing `requiredDocumentLabel` to `SharedAttachmentsPage` for all four material types; also re-checked by the backend at Complete.
- **`entry_no` generated on the client** — `GE-<year>-<last4(Date.now())>` in `SharedStep1Page`. Uniqueness is only enforced by the server.
- **Header created at Step 1, not at the end** — leaving the wizard after Step 1 leaves a server-side `DRAFT` header.
- **Locked entries are read-only** — Review shows "Entry Completed"; edit steps stay read-only unless status ≠ `COMPLETED` and Update is pressed.
- **Construction approval is a form field** — `securityApproval` is a dropdown the same operator fills; the frontend requires a value and `site_engineer`, or the backend Complete will reject.
- **Person "already inside"** — the create call fails if the visitor/labour has an open entry; the UI surfaces the backend message.
- **Company header is implicit** — the app sends the active `Company-Code` on every request; person data is company-agnostic on the server, so the inside board mixes companies.

---

## Integrations & cross-module boundaries

- **Backend apps:** daily/construction/fixed-asset/maintenance detail endpoints under `/api/v1/<app>-gatein/…`; the shared header under `/vehicle-management/vehicle-entries/`; attachments + FullViews under `/gate-core/…`; person under `/person-gatein/…`. Endpoint constants live in `@/config/constants` (`API_ENDPOINTS.DAILY_NEEDS_GATEIN`, etc.); person endpoints are inline strings in `personGateIn.api.ts`.
- **Shared gate components:** `VehicleDriverSecurityFormShell`, `CategorySelect`/`DepartmentSelect`/`UnitSelect`, `GateStatusBadge`, `StepHeader`/`StepFooter`, `FillDataAlert`.
- **Maintenance ↔ maintenance module:** the maintenance detail can link an asset/work-order/spare and a `receiveSpare` call feeds the maintenance store (see `maintenance.api.ts`) — the gate side just captures the link.
- **No SAP, no weighbridge, no QC** on these screens (unlike raw-material). Managers: there's no SAP document or weight to wait on here.

---

## Real-world edge cases

Each: **trigger → current behaviour → what the operator sees → risk/gap.**

- **Two operators create at the same second.** → Both generate the same `GE-YYYY-XXXX`. → The second sees **"Failed to save gate entry"** on Step 1's Next. → Retrying works (new timestamp); rare but real because the id is client-side.
- **Skip the bill, then try to complete.** → `SharedAttachmentsPage` already blocks Next→Review with **"Bill upload is required before review."**; if reached via a stale/deep link, Review's Complete returns the backend **"Bill upload is required before completing…"** and nothing locks. → Operator uploads the bill and retries.
- **Construction can't be completed.** `security_approval` not set to Approved, or `site_engineer` blank. → Step 2 requires both, but if bypassed the Complete call returns **"Security approval is PENDING. Must be APPROVED…"**. → The truck is inside but the pass won't close. → No separate approver UI — the operator self-approves.
- **Abandon the wizard after Step 1.** → A `DRAFT` header (maybe with a security check, no material detail) is left server-side. → It shows on the dashboard/all-list as incomplete. → **No delete button exists** for these types; it lingers until cleaned in Django admin.
- **Re-open a completed entry to edit.** → Edit steps load read-only; Update is hidden once status is `COMPLETED`. → Operator sees a locked, view-only form. → Correct, but there's no re-open path if a genuine mistake was locked in.
- **Person left but wasn't marked out.** → Their `IN` row persists; re-admitting fails with **"Person already inside"**; the dashboard's >8h counter grows. → Operator must open the stale entry and Exit/Cancel it first. → No auto-exit.
- **Inside board shows other companies' people.** → Person data isn't company-scoped; switching `Company-Code` still lists the same persons. → The board mixes companies. → By design (one physical gate) but surprising.
- **Network drops mid-upload.** → `SharedAttachmentsPage` sets an inline error ("Failed to upload <file>"); already-uploaded files persist. → Operator re-picks the failed file (input auto-resets to allow re-selection). → No background retry queue.
- **Detail 404 in edit mode.** Header exists but the detail was never saved. → `FillDataAlert` appears with a "Fill Data" button that flips the read-only detail step into an editable create. → Clean recovery path.

---

## Failure modes / what can break

- **Header create fails (dup `entry_no` / validation):** "Failed to save gate entry" on Step 1.
- **Detail save validation:** field-level errors mapped back onto the form (including nested `items[i].field` for line items); a general failure shows a red banner.
- **Complete blocked:** friendly 400 messages surface verbatim (missing bill, construction approval, missing supplier/assets).
- **Server 5xx:** `isServerError`/`getServerErrorMessage` render a generic "try again later" message instead of leaking internals.
- **Person create/exit errors:** the backend returns `{error: …}`/`{detail: …}`; the API client normalises it and the page shows it (e.g. "Person already inside", "Already exited").
- **Permission gaps:** a user without the type's `view`/`create` permission never sees the tile or route (see below) — a 403 would only appear from a hand-typed URL.

---

## Improvement opportunities & known gaps

- **Move `entry_no` generation server-side** to kill the client collision window.
- **Add a cancel/delete for abandoned material `DRAFT` headers** (parity with raw-material).
- **Split construction approval** into a real approver action instead of an operator-filled dropdown.
- **The material types & Visitor/Labour aren't in the sidebar submenu** (only Dashboard / New Entry / Cross-Company Arrivals / BST Out / Barcode Reports are). They're reachable only via dashboard tiles or the New-Entry picker — easy to miss; consider surfacing frequently-used types directly.
- **No offline/queued capture** for gate operators on flaky Wi-Fi.
- **Stale-inside person cleanup** UI (bulk exit / auto-timeout) would help security.

---

## Permissions & roles (nav gating)

Routes are gated by `permissions` arrays in `module.config.tsx`; tiles/pickers by `viewPermissions`/`createPermissions` in `gateEntryTypes.ts`. Codenames from `@/config/permissions/gate.permissions.ts`:

| Type | View route needs | Create wizard needs |
|------|------------------|---------------------|
| Daily needs | `DAILY_NEEDS.VIEW` or `DAILY_NEEDS.VIEW_FULL` | `DAILY_NEEDS.CREATE` |
| Maintenance | `MAINTENANCE.VIEW` or `.VIEW_FULL` | `MAINTENANCE.CREATE` |
| Construction | `CONSTRUCTION.VIEW` or `.VIEW_FULL` | `CONSTRUCTION.CREATE` |
| Fixed assets | `FIXED_ASSET.VIEW` | `FIXED_ASSET.CREATE` |
| Visitor/Labour | `PERSON_GATE_IN.VIEW` | `PERSON_GATE_IN.CREATE` |

**Nav gating specifics:**
- The **Gate** sidebar item shows if the user holds any permission in `GATE_NAVIGATION_PERMISSIONS` (union of all view/create perms + BST-out). Its **submenu deliberately omits** the material types and Visitor/Labour — those are entered from the Gate **Dashboard** tiles or **New Entry** picker, both filtered by the same `viewPermissions`/`createPermissions`.
- The Gate **Dashboard** route itself is gated on `GATE_DASHBOARD_ACCESS_PERMISSIONS`, which includes `person_gatein.can_view_dashboard` (`DASHBOARD.VIEW`). Several unrelated gate flows also reuse `can_view_dashboard` as their permission — so toggling that one Django permission moves more than the person module. (See the backend doc + the "group perms vs frontend nav gating" note.)
- `fixed-assets` has no `VIEW_FULL` permission (list view only); the others expose a `gate_core.can_view_*_full_entry` used by the Review FullView.

---

## Developer file map

**Frontend (this repo — `C:/Users/gurpa/dev/FactoryFlow`), under `src/modules/gate/`:**
- Module wiring: `module.config.tsx` (routes, nav, permission arrays).
- Config: `constants/entryFlowConfig.ts`, `constants/gateEntryTypes.ts`, `constants/wizard.constants.ts`.
- Shared wizard: `pages/shared/SharedStep1Page.tsx`, `SharedAttachmentsPage.tsx`, `SharedDashboard.tsx`, `SharedAllPage.tsx`; hooks `hooks/useEntryId.ts`, `hooks/useEntryStepTracker.ts`.
- Daily needs: `pages/dailyNeedsPages/{Step1,Step3,Attachments,Review,DailyNeedsAllPage}.tsx`, `pages/DailyNeedsPage.tsx`, `api/dailyNeed/*`.
- Maintenance: `pages/maintenancePages/*`, `api/maintenance/*`.
- Construction: `pages/constructionPages/*`, `api/construction/*`.
- Fixed assets: `pages/fixedAssetsPages/{Step1,Step2,Attachments,Review,…}.tsx`, `api/fixedAssets/*`.
- Person: `pages/personGateInPages/{PersonGateInDashboard,PersonGateInAllPage,InsideListPage,NewEntryPage,EntryDetailPage,VisitorsPage,LaboursPage,ContractorsPage,ContractorLaboursPage}.tsx`, `components/personGateIn/*`, `api/personGateIn/*`.
- Shared form shells: `components/forms/VehicleDriverSecurityFormShell.tsx`.
- Permissions: `@/config/permissions/gate.permissions.ts`; endpoint constants: `@/config/constants` (`api.constants.ts`).

**Backend (`C:/Users/gurpa/dev/factory_app`):** see the paired doc's file map.

---

## Related docs
- **Paired backend doc:** [`factory_app/docs/gate_in_other_materials.md`](../../../factory_app/docs/gate_in_other_materials.md)
- Adjacent frontend docs: `docs/modules/gate.md` (whole Gate module), `docs/modules/vehicle-management.md`, `docs/modules/labour.md`, `docs/modules/maintenance.md`.
- In-module (older, partially stale): `src/modules/gate/docs/`.
