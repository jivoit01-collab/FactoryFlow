# GRPO Module — Frontend

> Location: `src/modules/warehouse/grpo/` (GRPO is a **submodule of Warehouse**)
> · Base route: `/warehouse/grpo/material/*`
>
> Paired backend doc: `C:/Users/gurpa/dev/factory_app/grpo/docs/README.md`

This describes the code as it is today (verified against `module.config.tsx`,
`api/grpo.api.ts`, `api/grpo.queries.ts`, `pages/*`, `components/*`, and
`src/config/permissions/grpo.permissions.ts`). An earlier version of this file
(paths under `src/modules/grpo/`, a `GRPODashboardPage`, `/grpo/*` routes) is
**stale** — GRPO moved under Warehouse and the dashboard was replaced by a
tabbed page.

---

## Overview — what it does & who uses it

GRPO is where operators post received goods to **SAP** after a gate entry is
complete. There are two distinct flows, and they are wired differently:

- **Material GRPO** — for a completed **raw-material** truck. Screens live in
  this folder and are routed under `/warehouse/grpo/material/*`. Used by
  **stores / GRPO operators**.
- **Service (Bilty) GRPO** — freight cost for a dispatched sale. The page
  components physically live here (`pages/ServiceGRPO*.tsx`) but are **routed by
  the Dispatch module** at `/dispatch/bilty-grpo/*` and gated by a *dispatch*
  permission. Used by **dispatch / logistics accounts**. Everything under
  `/warehouse/grpo/service/*` is just a redirect to those dispatch routes.

There is **no scanning and no offline mode** here (unlike BST). GRPO is an
online, SAP-backed posting flow: React Query caches reads, but posting needs
live connectivity, and the operator gets an explicit error if SAP is down.

---

## Key concepts & entities (frontend view)

- **Entry** — a `VehicleEntry` (truck). Carries one or more **bills**.
- **Bill** — a `PreviewPOReceipt` (one SAP PO on the truck). GRPO is *bill-based*:
  each bill posts (or fails) independently.
- **Merged GRPO** — several bills from the **same supplier** posted as one SAP
  document. The preview page enforces one-supplier selection client-side.
- **QC status** per item (`QCStatus`): `ACCEPTED` is the only postable state;
  `PENDING/HOLD/REJECTED/ARRIVAL_SLIP_PENDING/INSPECTION_PENDING/NO_ARRIVAL_SLIP`
  render as badges and (except legacy no-slip) block that bill.
- **GRPO status** (`GRPOStatus`): `PENDING / POSTED / FAILED / PARTIALLY_POSTED`
  → `GRPO_STATUS_CONFIG` (label + colours).
- **Attachment status** (`AttachmentStatus`): `PENDING / UPLOADED / LINKED /
  FAILED` → `ATTACHMENT_STATUS_CONFIG`.
- **Phase** (All-Entries only): `GATE / QC / DONE / CANCELLED` pills.

Types: `src/modules/warehouse/grpo/types/grpo.types.ts`. Status configs are
re-exported from `@/config/constants` via `constants/grpo.constants.ts`.

---

## End-to-end flows (user journeys)

### 1. Material GRPO — from truck to SAP

1. **Land on `MaterialGRPOPage`** (`/warehouse/grpo/material`). A tabbed page
   (`Pending · All · Gate · QC · Done · History`) driven by `?tab=`. It embeds
   the list pages rather than duplicating them.
2. **Pending tab** (`PendingEntriesPage`, embedded) — table of trucks that have
   at least one ready-and-unposted bill: entry no, supplier(s), PO chips,
   `pending/total POs`, status, PO date, entry time. Free-text search. Click a
   row → preview.
3. **Preview & post** (`GRPOPreviewPage`, `/material/preview/:vehicleEntryId`):
   - `readyPOs = unpostedPOs.filter(is_ready_for_grpo)`. Ready bills are grouped
     by supplier with checkboxes. Selecting bills from two suppliers sets
     `hasMixedSuppliers`, shows "Cannot merge POs from different suppliers", and
     disables the form.
   - Per item: **Accepted Qty** (defaults to received; rejected auto-computed),
     **Unit Price**, **Tax Code**, **G/L Account**, **Variety** — all prefilled
     from the SAP PO.
   - Shared fields: **Vendor Reference** (required), **Warehouse**
     (`WarehouseSelect`), **Posting / Due / Tax dates** (default = entry date),
     **Comments**, **Extra Charges** (`ExtraChargesSection`), **Attachments**
     (**at least one required**), and **Auto Round Off** (default on).
   - A live **Estimated Total** is computed client-side (qty × price + tax% from
     the tax code + charges).
   - **Post** → confirmation dialog → `usePostGRPO`. On success a **success
     dialog** shows the SAP Doc Num, total, per-attachment result (linked vs
     failed), and **Print** buttons for each item's QC inspection report.
   - Bills still in QC render read-only under "Awaiting QC — not ready to post".
     Already-posted bills render greyed under "Already Posted" with their SAP number.
4. **History** (`GRPOHistoryPage`) — `All / Posted / Failed` filter tabs +
   search. **Failed** hides `is_superseded` rows (a later success resolved them).
   Failed/partially-posted rows show a **Retry** button that jumps back to the
   preview. Click a row → detail.
5. **Detail** (`GRPOHistoryDetailPage`) — posting info, posted line items (each
   with a QC-report reprint button), timestamps, and — for `POSTED` GRPOs — the
   **Attachments** section (see the permission caveat below).

### 2. All / Gate / QC / Done tabs (`AllEntriesPage`)

Shows **every** non-cancelled raw-material entry, including ones still at gate or
in QC, with a **phase** pill. Expanding a row reveals per-bill `BillQCCard`s with
item-level QC verdicts (read-only) and a **Post GRPO** shortcut on bills that are
ready. This is the operator's "where is this truck?" view.

### 3. Service / Bilty GRPO

Reached from the **Dispatch** sidebar at `/dispatch/bilty-grpo` (dashboard →
pending → preview → post → history). The pages (`ServiceGRPODashboardPage`,
`ServiceGRPOPreviewPage`, `ServiceGRPOHistoryPage`,
`ServiceGRPOHistoryDetailPage`) live in this folder but are lazy-imported by
`src/modules/dispatch/module.config.tsx`. They call `grpoApi.getService*` /
`postService`, which hit `/dispatch/bilty-grpo/*`. The service post uses a
**5-minute timeout** (`SAP_SERVICE_GRPO_POST_TIMEOUT_MS`) because the SAP write
is slow.

The preview page also manages the **bilty attachment of record** on the dispatch
plan (`/dispatch/bilty-grpo/attachment/<planId>/` via
`getPlanBiltyAttachment` / `replacePlanBiltyAttachment` /
`deletePlanBiltyAttachment`): the vehicle-linking bilty is sometimes the wrong
document, so the operator can replace or delete it *before posting* — after
which the correction persists on the plan (unlike the form's one-off "Choose
Files" uploads, which live only in that form session). Every change is audited
server-side and the page shows the trail under "Attachment history". Once the
GRPO is POSTED the server refuses changes and the controls disappear.

---

## State, data fetching & offline behaviour

- **React Query** everywhere (`api/grpo.queries.ts`, keys in `GRPO_QUERY_KEYS`).
  List queries use `staleTime: 30s` + `refetchInterval: 60s` (Summary, Pending,
  All, Service Pending). Warehouses and service options are lazy (`enabled`) with
  a 5-minute `staleTime`. Preview/detail/history queries have no interval.
- **Mutations invalidate** the relevant keys on success (e.g. `usePostGRPO`
  invalidates pending, summary, that entry's preview, and history).
- **Posting transport.** `grpoApi.post` auto-selects **multipart/form-data**
  (JSON in a `data` part + `attachments` files) when files are present, else
  plain JSON. Material posting always has ≥1 file, so it is effectively always
  multipart.
- **No offline queue / no scanner.** Local component state holds the in-progress
  form (`mergedForm`); a page reload loses unsaved edits. There is no
  IndexedDB/service-worker posting queue — if the network or SAP is down, the
  post simply fails and must be retried.
- **Attachment lifecycle** (`AttachmentsSection`) is its own set of mutations
  (`useUploadGRPOAttachment` / `useDeleteGRPOAttachment` /
  `useRetryGRPOAttachment`) that each round-trip to SAP and invalidate the
  attachments + detail queries.

---

## Critical business rules & invariants (as enforced in the UI)

- **≥1 attachment to post material GRPO.** `validateMergedPost` blocks posting
  with "At least one attachment is required"; the backend also rejects (400).
- **Vendor Reference is required** ("Vendor reference is required").
- **At least one item must have accepted qty > 0**, and no negative quantities.
- **One supplier per merged post** — mixed-supplier selection disables the form
  (`hasMixedSuppliers`).
- **Only `ACCEPTED` bills are selectable.** `readyPOs = unpostedPOs.filter(is_ready_for_grpo)`;
  blocked and posted bills are shown but not postable.
- **Branch id** defaults to the PO's `branch_id`, falling back to
  `DEFAULT_BRANCH_ID` (`VITE_DEFAULT_BRANCH_ID`, default `2`).
- **Extra charges** each need a valid SAP expense code (`> 0`) and amount (`> 0`).
- **Tare weight is not collected here.** `PostGRPORequest` has an optional
  `tare_weight` field, but `GRPOPreviewPage` neither tracks nor sends it (there
  are unit tests asserting this), so tare stays server-side-optional.
- Note: `schemas/grpo.schema.ts` (Zod) models a single `po_receipt_id`; the
  merged preview page validates **manually** (`validateMergedPost`) and posts
  `po_receipt_ids[]` directly, so that schema is largely legacy.

---

## Integrations & cross-module boundaries

- **Backend material API:** `API_ENDPOINTS.GRPO.*` → `/grpo/*`
  (summary, all-entries, pending, preview, post, history, detail,
  inspection-report, attachments + retry).
- **Backend service API:** `API_ENDPOINTS.DISPATCH.BILTY_GRPO_*` →
  `/dispatch/bilty-grpo/*` (pending, options, preview, post, history, detail).
  Same `grpoApi` object, different backend app.
- **QC module** — item QC badges (`QCStatusBadge`), and QC inspection reports are
  fetched (`getInspectionReport`) and printed via `useQCReportPrint` /
  `QCInspectionReportPrint`. Types reuse `@/modules/qc/types`.
- **Warehouse module** — GRPO routes/nav are contributed into
  `warehouseModuleConfig` via `grpoRoutes` + `grpoNavChildren`.
- **Dispatch module** — owns the service-GRPO routing and permission.

---

## Real-world edge cases

**trigger → current behaviour → what the operator sees → risk/gap**

- **Partial truck / some bills still in QC.** Ready bills are postable; blocked
  bills sit under "Awaiting QC — not ready to post" (read-only, with QC badges
  and report links) → operator can post what's ready and comes back for the rest
  → *risk:* a bill left in HOLD/REJECTED is easy to forget.
- **SAP rejects the post (2000xx).** `usePostGRPO` throws; the confirm dialog
  closes and a red banner shows the SAP message; the attempt appears in
  **History → Failed** with a **Retry** button → operator fixes the data (branch,
  gross weight, item) and re-posts.
- **SAP down during posting.** 503 → same error banner ("SAP system is currently
  unavailable"); the entry stays in Pending; material lands in Failed. → operator
  retries later.
- **Attachment uploaded but SAP link failed.** Success dialog shows "N
  attachment(s) failed to upload to SAP. Files saved locally — retry from detail
  page." → the GRPO itself is posted; operator opens the detail page and clicks
  the **retry** icon on the failed attachment (which shows its
  `sap_error_message`) — **if** they can see the controls (see next item).
- **Attachment controls hidden despite posting rights.** The detail page gates
  upload/retry/delete on `GRPO_PERMISSIONS.MANAGE_ATTACHMENTS`
  (`grpo.can_manage_grpo_attachments`) via `useHasPermission`, but the **backend
  never defines that permission** (it enforces `grpo.add_grpoattachment`). So a
  normal operator sees the attachments list **read-only** — no upload/retry/delete
  buttons — even though the API would accept them; only a superuser passes the
  check → *gap:* fix by aligning the frontend constant with `grpo.add_grpoattachment`
  or adding a real backend permission.
- **Duplicate post attempt.** Re-posting an already-posted PO → backend 400
  "GRPO already posted … SAP Doc Num"; the bill also already renders in the
  greyed "Already Posted" group → no double document.
- **Re-scanned / stale preview.** Preview is cached; a **Refresh** button and the
  60 s refetch on the lists keep it current. Posting a bill that was posted in
  another tab yields the duplicate-post 400.
- **Cross-company / wrong company context.** Lists come back empty (backend
  scopes by company) → operator sees "No pending entries", not another company's
  trucks.
- **Missing weighbridge tare.** The preview/post has no tare field in the current
  material UI, so tare is simply not sent (optional server-side) — no blocker.
- **Permission missing.** A 403 on any query renders a dedicated **"Permission
  Denied"** panel (not the generic error), because pages check
  `apiError?.status === 403`.
- **Service GRPO failure.** The error toast is the *only* signal — the plan stays
  in the bilty pending queue and nothing is written to a Failed list (backend
  gap on the dispatch route). Operator must simply try again.

---

## Failure modes / what can break (operator-visible)

| Symptom on screen | Underlying cause |
|---|---|
| Red banner "SAP validation error: …" after Confirm | SAP `SBO_SP_TransactionNotification` rejected the doc (branch/item/weight rules). |
| "SAP system is currently unavailable. Please try again later." | SAP Service Layer / HANA down (503). |
| Success dialog with "N attachment(s) failed to upload to SAP" | SAP `Attachments2` folder/mount problem; retry from detail page. |
| Attachments list on the detail page has no upload/retry/delete buttons | Missing `grpo.can_manage_grpo_attachments` — a permission the backend never grants (superuser-only in the UI). |
| "Permission Denied" panel | Missing `grpo.*` (or `dispatch_plans.can_post_bilty_service_grpo`) permission. |
| Yellow "Failed to Load" with a retry icon | Non-403 load error (network, 5xx) on a list/detail query. |
| Empty "No pending entries" when work is expected | Wrong company context, or all bills still blocked by QC. |
| Service post spins for a long time then errors | Slow SAP service write (5-min client timeout) or SAP reject with no persisted trace. |

---

## Improvement opportunities & known gaps

- **Attachment controls gated on a non-existent permission.**
  `MANAGE_ATTACHMENTS = 'grpo.can_manage_grpo_attachments'` is checked with
  `useHasPermission` in `GRPOHistoryDetailPage`, but the backend never defines
  that codename (it enforces `grpo.add_grpoattachment`). Non-superusers see a
  read-only attachments list. Align the constant with `grpo.add_grpoattachment`
  (or add the real backend permission).
- **Service GRPO failures are invisible after the toast.** The dispatch post
  route persists no Failed row and sends no notification, so the UI has nothing
  to show in a "Failed" list and no retry affordance — the operator just retries
  the form. (Material GRPO does surface Failed + Retry.)
- **`PARTIALLY_POSTED` is rendered but never produced.** `GRPO_STATUS_CONFIG`
  handles it and History filters for it, but the backend never sets that status.
- **Legacy Zod schema drift.** `schemas/grpo.schema.ts` models a single
  `po_receipt_id`; the merged preview posts `po_receipt_ids[]` after a manual
  `validateMergedPost`, so the schema no longer reflects the real request.
- **No draft persistence.** `mergedForm` lives in component state only; a reload
  or accidental navigation loses in-progress accepted-qty / charge edits.

---

## Permissions & roles (nav gating)

Constants: `src/config/permissions/grpo.permissions.ts` (`GRPO_PERMISSIONS`).

| Permission | Grants |
|---|---|
| `grpo.can_view_pending_grpo` (`VIEW_PENDING`) | see the Warehouse → **Material GRPO** nav item, Pending/All/Dashboard |
| `grpo.can_preview_grpo` (`PREVIEW`) | open the preview/post screen |
| `grpo.add_grpoposting` (`POST`) | actually post to SAP |
| `grpo.can_view_grpo_history` (`VIEW_HISTORY`) | history list |
| `grpo.view_grpoposting` (`VIEW_POSTING`) | posting detail |
| `grpo.can_manage_grpo_attachments` (`MANAGE_ATTACHMENTS`) | render the attachment upload/delete/retry controls (checked via `useHasPermission`) — ⚠️ **not defined in the backend**; backend enforces `grpo.add_grpoattachment` instead, so these controls are effectively superuser-only |
| `dispatch_plans.can_post_bilty_service_grpo` (`DISPATCH_PERMISSIONS.POST_BILTY_GRPO`) | the whole service/bilty GRPO area |

**Route gating** is declared per route in `grpo/module.config.tsx`
(`ProtectedRoute`, via each route's `permissions`). **Nav gating**: the Warehouse
sidebar group appears if the user holds *any* of its children's permissions; the
single **"Material GRPO"** child (`grpoNavChildren`) is gated by `VIEW_PENDING`.
**Component gating**: the attachment upload/delete/retry controls only render when
`MANAGE_ATTACHMENTS` is held (see the caveat above). Legacy `/grpo/*` deep links
redirect to `/warehouse/grpo/*`; `/warehouse/grpo/service/*` redirects to
`/dispatch/bilty-grpo/*`.

---

## Developer file map

**Frontend (`src/modules/warehouse/grpo/`)**

- `module.config.tsx` — routes (`grpoRoutes`) + nav (`grpoNavChildren`); legacy & service redirects.
- `api/grpo.api.ts` — `grpoApi` (material `/grpo/*` + service `/dispatch/bilty-grpo/*`, multipart handling, 5-min service timeout).
- `api/grpo.queries.ts` — React Query hooks + `GRPO_QUERY_KEYS`.
- `types/grpo.types.ts` — all request/response/option types.
- `constants/grpo.constants.ts` — `DEFAULT_BRANCH_ID`, re-exported status configs.
- `schemas/grpo.schema.ts` — Zod (legacy single-PO shape).
- `pages/MaterialGRPOPage.tsx` — tabbed landing (embeds the lists).
- `pages/PendingEntriesPage.tsx` · `AllEntriesPage.tsx` (+ `BillQCCard`) · `GRPOPreviewPage.tsx` (the posting workhorse) · `GRPOHistoryPage.tsx` · `GRPOHistoryDetailPage.tsx`.
- `pages/ServiceGRPO*.tsx` — service/bilty pages (routed by Dispatch).
- `components/` — `WarehouseSelect`, `ExtraChargesSection`, `AttachmentsSection`, `QCStatusBadge`, `QCReportButton`, `QCInspectionReportPrint`, `useQCReportPrint`.

**Config**

- `src/config/permissions/grpo.permissions.ts`, `.../dispatch.permissions.ts`
- `src/config/constants/api.constants.ts` — `API_ENDPOINTS.GRPO.*`, `API_ENDPOINTS.DISPATCH.BILTY_GRPO_*`
- `src/modules/warehouse/module.config.tsx` — composes `grpoRoutes`/`grpoNavChildren`
- `src/modules/dispatch/module.config.tsx` — routes the service/bilty pages

---

## Related docs

- **Backend (paired):** `C:/Users/gurpa/dev/factory_app/grpo/docs/README.md`
- `docs/modules/overview.md`, `docs/modules/gate.md` (creates the entries GRPO
  consumes), `docs/modules/qc.md` (QC verdict drives bill readiness),
  `docs/modules/dispatch.md` (hosts the service/bilty GRPO screens).
