# Permission-Ownership Audit

**Status:** Report-first — findings only, **no fixes applied** in this pass. Fixes to be decided in a follow-up phase after review.
**Date:** 2026-07-10
**Scope:** Both repos — FactoryFlow (frontend gates) + factory_app (backend enforcement).

## Why this exists

The production→warehouse/gate/dashboards/QC fix exposed a recurring bug class: a module's **gate** references a Django permission owned by a *different* module, so users holding only that "foreign" permission get the wrong module's visibility or access. This audit sweeps every module for that class (**Class A**) and the related backend gap where the frontend gates a feature the backend doesn't actually enforce (**Class B**).

## Definitions

- **Gate surface (by leak risk):** top-level sidebar `modulePrefix`/`permissions` = **highest** (whole module leaks) → route `permissions` = medium (direct-URL only) → child nav `permissions` = low-medium → in-page `Authorized`/`usePermission` = low (control visibility inside an already-visible page).
- **Class A (frontend ownership leak):** a gate references permission `P` whose `app_label` ∉ the module's owning-app set. A *real leak* only if holding **only** `P` (no core perm of the module) exposes the module to a role it's not meant for. Verified against real groups where risk is non-trivial.
- **Class B (backend enforcement gap):** frontend gates a feature on `P`, but the backend view(s) enforce nothing (`[IsAuthenticated, HasCompanyContext]` only) → direct-API bypass.
- **Class C (cross-module data-dependency 403):** a page the user *is* allowed to see calls **another module's API** that the user isn't entitled to → 403. **Only occurs when that endpoint is *enforced***; a call to an open endpoint doesn't 403 (that's a Class B concern instead). Also avoided when the call is `enabled`-gated on the user's own permission.
- **Severity:** Critical (real leak, top-level, real members) / High / Medium / Low / Info.

## Module → owning app(s)

| Module | Owning app(s) |
|---|---|
| gate | gate_core + person/raw_material/daily_needs/maintenance/construction/fixed_asset _gatein + labour_count + labour_gate |
| dispatch | dispatch_plans (+ grpo, + gate_core sales-dispatch — aggregation) |
| production | production_planning + production_execution |
| qc | quality_control |
| maintenance | maintenance |
| warehouse | warehouse |
| wms | wms |
| dashboards | sap_plan_dashboard, stock_dashboard, inventory_age, non_moving_rm, sales_planning_requirement, dispatch_plans |
| vehicle-management | vehicle_management, driver_management |
| barcode | barcode |
| marketplace | marketplace |
| grpo | grpo |
| labour | labour_gate |
| admin | docking_admin |
| notifications | notifications |

---

## Master findings

| ID | Module | Class | Gate location | Foreign perm → owner | Members affected | Severity | Status |
|---|---|---|---|---|---|---|---|
| A1 | dashboards | A | top-level nav | production_execution.can_view_reports | — | High | **FIXED** |
| A2 | warehouse/wms | A | top-level nav + routes | production_execution.* (BOM/FG) | — | High | **FIXED** |
| A3 | gate | A | job-work routes + nav | production_execution.view/add_productionrun | — | High | **FIXED** |
| A4 | qc | A | top-level nav | quality_control production-QC/line-clearance (leaked to production) | — | High | **FIXED** |
| A5 | gate | A | **top-level nav** | barcode.can_view_barcode_dispatch_reports → barcode | **7** (barcode group) | **Medium** | OPEN |
| A6 | gate | A | top-level nav | returnable_items.can_gate_in/out_returnable → returnable_items | 0 | Low | OPEN |
| A7 | dispatch | A | top-level nav | grpo.* + gate_core sales-dispatch | grpo 2 / sales 11 | Low (intentional?) | OPEN |
| A8 | gate | A | route-only | warehouse.can_gate_bst → warehouse | 6 (BST Gate) | Low | OPEN |
| A9 | vehicle-management | A | route-only (redirect) | dispatch_plans.can_link_dispatch_vehicle | — | Low | OPEN |
| A10 | maintenance | A | child nav (parent-gated) | gate_core.* (Gate Material In, Repair Movement) | — | Low (intentional) | OPEN |
| A11 | dispatch, gate, vehicle-management | A | in-page checks | grpo/gate/dashboards/admin/dispatch cross-refs | — | Low | OPEN |
| R1 | gate (BST) | reachability | route-only, no nav entry | warehouse.can_gate_bst | 6 (BST Gate) | Medium | OPEN |
| B1 | barcode | B | — | all views open; ~12 barcode perms gated on frontend only | 7+ | **High** | OPEN |
| B2 | notifications | B | — | views `[IsAuthenticated]` only; verify SEND enforces can_send_notification | — | Medium | OPEN |
| B3 | docking_admin | B | — | approve enforced; list/view open | — | Low-Med | OPEN |
| B4 | dispatch_plans | B | — | mostly enforced (custom perm classes) | — | Info | OK |
| B5 | marketplace | B | — | enforced via `MpBaseView` read_perms/write_perms | — | Info | OK (not a gap) |
| B6 | gate_core (gate) | B | — | many gate views open; job-work + sales-dispatch-lock enforced | — | Med (large surface) | OPEN |

---

## Per-module detail

### Already-fixed (Class A) — re-verify after this audit
- **dashboards / warehouse / wms / gate-job-work / qc**: the production-split shipped. `jp@jivo.in` (production_execution group) verified to no longer match these gates. Keep as regression checks.

### gate  — the biggest module (10 apps, 150+ perms)
- **A5 (Medium):** `GATE_NAVIGATION_PERMISSIONS` ([gate/module.config.tsx:184](../modules/gate/module.config.tsx#L184)) includes `BARCODE_PERMISSIONS.VIEW_DISPATCH_REPORTS` = `barcode.can_view_barcode_dispatch_reports`. Held by the **barcode group (7 members)** → those barcode users see the whole **Gate** module in the sidebar (to reach a single "Barcode Dispatch Reports" child). Recommend: surface that report under Barcode/Dispatch, and drop the barcode perm from the gate nav gate.
- **A6 (Low):** returnable gate in/out entry types feed `GATE_ENTRY_VIEW_PERMISSIONS` → gate nav gate, valued `returnable_items.can_gate_*_returnable`. Held by returnable_gate/admin (0 members). Gate-tile filtering means a returnable user would see only returnable tiles — intentional-ish; low priority.
- **A8 / R1:** `GATE_PERMISSIONS.BST_OUT.*` = `warehouse.can_gate_bst` is used **only on routes** `/gate/bst-out*` ([gate/module.config.tsx:811-822](../modules/gate/module.config.tsx#L811)), not in the nav gate. The **BST Gate** group (6 members) holds `can_gate_bst` and nothing else gate-side, so they likely **cannot reach BST-out from the sidebar** (Gate module hidden for them). `setup_bst_group.py` says they "see only the gate BST Out submodule" — verify this is actually reachable; if not, add a nav entry gated on `can_gate_bst`.

### dispatch  — aggregation module
- **A7:** top-level nav gate ([dispatch/module.config.tsx:285](../modules/dispatch/module.config.tsx#L285)) bundles `dispatch_plans.*` + `grpo.*` (Service GRPO) + `gate_core.can_*_sales_dispatch_out` (Docking). This is by design (Dispatch is the fulfilment hub). Consequence: `grpo` group (2) and `gate_core`/`Sales Dispatch Out` (11) see the Dispatch module. Decide whether that's intended; if Service-GRPO/Docking should be their own sub-audience, split the gate.

### vehicle-management — essentially clean
- Top-level nav gates on `vehicle_management.view_vehicle` (own app). ✓ The `dispatch_plans.can_link_dispatch_vehicle` foreign ref (**A9**) is only on a **redirect route** `/vehicle-management/dispatch-linking → /dispatch/vehicle-linking`; not in the sidebar. In-page checks in `DispatchVehicleLinkingPage`/`InsideVehicleManagerPage` use dispatch perms but those pages are dispatch features (low risk, **A11**).

### maintenance — child leak is parent-gated (no real leak)
- **A10:** children "Gate Material In" and "Repair Movement" ([maintenance/module.config.tsx:321-335](../modules/maintenance/module.config.tsx#L321)) gate on `gate_core.*`. The Maintenance top-level gates on `modulePrefix: 'maintenance'`, so a gate-only user never sees the module, and a maintenance user only sees these children if they also hold the gate perm. Intentional surfacing, correctly gated. No action required beyond confirming intent.

### Single-app modules — Class A clean
- **barcode, marketplace, grpo, labour, wms, admin, notifications, production, qc, warehouse** all gate their top-level sidebar on their own app's permissions (verified in the constants inventory). No top-level foreign refs remain except those listed above.
- **finance**: still **unregistered** in `moduleRegistry` and **fully ungated** (nav + routes carry no permissions). Not live; flagged so it isn't registered without adding gates first.

---

## Class B — backend enforcement matrix

| App (frontend gates it) | Backend enforcement | Notes |
|---|---|---|
| production_execution | ✅ Enforced | custom `BasePermission` per view |
| quality_control | ✅ Enforced | custom perm classes |
| warehouse | ✅ Enforced | added in production-split |
| returnable_items | ✅ Enforced | custom perm classes |
| dispatch_plans | ✅ Mostly | service-GRPO/bilty views use custom classes ([dispatch_plans/views.py:468-735](../../../../factory_app/dispatch_plans/views.py)); spot-verify dashboard/inside-vehicle views |
| gate_core | ⚠️ Mixed (**B6**) | job-work (our fix) + sales-dispatch-lock enforced; most gate-entry views open — large surface, own sub-audit |
| docking_admin | ⚠️ Partial (**B3**) | approve/review use `HasRequiredDjangoPermission`; list/view open |
| maintenance | ⚠️ Partial | some `CanViewMaintenanceModule`; verify per-endpoint |
| notifications | ❌ Open (**B2**) | views `[IsAuthenticated]` only; confirm SEND requires `can_send_notification` |
| barcode | ❌ Open (**B1**) | **every** view `[IsAuthenticated, HasCompanyContext]`; ~12 gated frontend perms unenforced |
| marketplace | ✅ Enforced | `MpBaseView.get_permissions()` applies `read_perms`/`write_perms` → `marketplace.*` classes ([marketplace/permissions.py](../../../../factory_app/marketplace/permissions.py)) |

---

## Class C — cross-module data-dependency 403s

A page the user can access calls another module's **enforced** API without holding that permission. Swept all cross-module `@/modules/*/api` hook imports; traced each to its backend endpoint + `permission_classes`; verified enforcement in code and audience against real groups. **Key result: the tracer's first pass massively over-reported — most cross-module calls hit OPEN endpoints (no 403) or are correctly `enabled`-gated.** After backend verification, the real Class C set is narrow and centered on the *enforced* maintenance endpoints.

| ID | Calling page (module) | Cross-module call → endpoint | Endpoint enforced? | Fires | Verdict |
|---|---|---|---|---|---|
| C1 | RunDetailPage (production) | `useMaintenanceAssets` → `/maintenance/assets/` (`AssetViewSet`→`CanViewAsset`) | ✅ enforced | **eager, unconditional** | **Real 403 — confirmed (the screenshot).** Production audience lacks maintenance perm. |
| C2 | Step3Page (gate maintenance-in) | `useMaintenanceAssets/Options/Spares/WorkOrders` → `/maintenance/*` | ✅ enforced (`CanViewAsset`/`CanViewSpare`) | eager | **Likely 403.** `maintenance_gatein` group (7 members) has no `maintenance.*` perms. Verify exact codename. |
| C3 | RejectedQCReturnItemsPage (gate) | `useReturnToVendorInspections` → `/quality-control/inspections/return-to-vendor/` | ❓ verify | eager | Verify endpoint enforcement + whether gate rejected-material audience holds a QC perm. |

**Confirmed NOT Class C (tracer false positives, corrected via backend read):**
- barcode pages + stock-level dashboard → `/warehouse/wms/warehouses|item-groups/` — **OPEN** ([views_wms.py:273,290](../../../../factory_app/warehouse/views_wms.py)); no 403 (it's a Class B open-endpoint concern instead).
- gate BST pages → `/warehouse/bst/{id}/` detail + mark-out — **OPEN** ([views_bst.py:130](../../../../factory_app/warehouse/views_bst.py)); the enforced `bst/gate/expected-outwards/` (`can_gate_bst`) is only called by `can_gate_bst` holders.
- **GateDashboardPage → `useBSTGateOutwards`** — correctly `enabled: isVisible('bst-out')` ([GateDashboardPage.tsx:454](../modules/gate/pages/GateDashboardPage.tsx#L454)); fires only for `can_gate_bst` holders. **This is the model pattern.**
- vehicle-management → gate vehicle/transporter/driver endpoints — **OPEN**.
- RunDetailPage → `useWarehouses` (`/po/warehouses/`, OPEN + lazy), QC sessions (production holds the perm), warehouse BOM/FG (production holds the perms after the split).
- SalesDispatchBarcodeScanPage → docking by-dispatch — **OPEN**.

**Fix framework (per finding):** ① resolve server-side & delete the client fetch (best — used for C1: the backend already resolves machine→asset, so the `useMaintenanceAssets` fetch is redundant); ② expose a minimal read endpoint owned by the calling module, gated on its own perm; ③ OR-permission on the shared endpoint. Always add `enabled` guards (the GateDashboard pattern) and degrade 403s quietly.

## Prioritized recommendations (for the fix phase)

1. **B1 — barcode backend enforcement (High).** ~50 endpoints open; add permission classes mapping to the existing `barcode.*` perms the frontend already gates on. Largest authorization gap.
2. **A5 — gate leaks to barcode users (Medium).** Remove `barcode.can_view_barcode_dispatch_reports` from `GATE_NAVIGATION_PERMISSIONS`; relocate the report.
3. **R1 — BST Gate reachability (Medium).** Ensure the 6 BST-Gate users can reach `/gate/bst-out` (add a `can_gate_bst`-gated nav entry, or confirm existing reachability).
4. **B2 — notifications SEND (Medium).** Enforce `can_send_notification`/`can_send_bulk_notification` on the send endpoints; add `HasCompanyContext`.
5. **B6 — gate_core enforcement sub-audit (Medium).** Many gate-entry write endpoints are open; scope a dedicated pass (mirrors the job-work fix).
6. **A7 / A6 — dispatch & gate aggregation (Low, decision).** Confirm whether Service-GRPO / Docking / returnable-gate audiences should see the whole Dispatch/Gate module, or be split out.
7. **C1 — RunDetail maintenance-assets 403 (High, confirmed).** Delete the redundant `useMaintenanceAssets` client fetch + mandatory asset selection; the breakdown-create backend already resolves machine→asset server-side. Frontend-only, no new perms.
8. **C2 — gate maintenance-in dropdowns 403 (Medium).** Step3Page fetches enforced `/maintenance/*` for a `maintenance_gatein` audience. Serve those options via a gate-owned endpoint gated on the gate-maintenance perm, or `enabled`-guard + graceful-degrade; verify codename first.
9. **B3, C3, maintenance — verify per-endpoint (Low-Med).** Confirm docking list/view, QC return-to-vendor enforcement, and maintenance per-endpoint. (dispatch_plans and marketplace confirmed enforced.)

## Verification notes
- Group membership counts above were pulled live via Django shell against the current DB (e.g. barcode group = 7, BST Gate = 6, gate_core+Sales Dispatch Out = 11, maintenance_gatein = 7). Re-run before fixing.
- Class C enforcement was confirmed by reading actual `permission_classes` in the backend (the tracer agent's enforcement column was unreliable — WMS/vehicle/BST-detail/docking are OPEN, not enforced).
- No code, migrations, or commits were made for this report.
