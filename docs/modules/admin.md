# Admin — Docking Scan-Skip & Partial-Dispatch Approvals (frontend)

Module folder: `src/modules/admin/` · Routes under `/admin` · Sidebar entry **Admin**.

Paired backend doc: [`docking_admin/docs/README.md`](../../../factory_app/docking_admin/docs/README.md)
(absolute: `C:/Users/gurpa/dev/factory_app/docking_admin/docs/README.md`).

> Grounded in the code as of this writing. If an older description conflicts, trust the code.

---

## Overview — what it does & who uses it

The **Admin** module is the approver's side of the docking box-scan gate. During sales-dispatch
loading ("Docking"), an operator scans a barcode on every box. When they can't scan at all, or
can only scan part of the load, they raise a request from the scan page. This module gives
**admins/managers** two review queues to approve or reject those requests:

- **Docking Approvals** (`/admin/docking/scan-approvals`) — **scan-skip** requests (operator
  scanned **zero** boxes).
- **Partial Dispatch Approvals** (`/admin/docking/partial-dispatch-approvals`) — **partial-scan**
  requests (operator scanned **some but not all** boxes).

Approving a request unlocks the operator's **Continue** button on the scan step and lets the load
proceed to gatepass. The **request** side (raising a skip/partial request) lives in the **gate**
module's docking scan page — this admin module only **reviews** them. Both live count badges and
the queues are **scoped to the approver's active company**.

The module is intentionally thin: React Query hooks over a small REST surface, two table pages,
one dashboard, two sidebar badges. There is **no offline queue** here — approvals require a live
connection (unlike box scanning, which does queue offline in the gate module).

---

## Key concepts & entities

- **Docking entry / load** — one truck's sales-dispatch (`sales_dispatch` id on every request).
  A load can carry several bills; **one approval covers the whole load**, not a single bill.
- **Scan-skip request** (`DockingScanSkipRequest`, `api/dockingApproval.api.ts`) — the zero-scan
  case. Status `PENDING | APPROVED | REJECTED`.
- **Partial-scan request** (`DockingPartialScanRequest`, `api/partialScanApproval.api.ts`) — the
  some-but-not-all case; adds `scanned_boxes` / `expected_boxes` for the `3 / 10` count display.
- **Live count badge** — a red pill in the sidebar showing the number of **pending** requests for
  the approver's active company; hidden at zero or without view permission.
- **Review note** — free text attached to an approve (optional) or reject (**required**), stored
  as `review_notes` and surfaced back to the operator.

Both request types share an identical page layout, hook shape, and review dialog — the partial
page merely adds a **Scanned** column.

---

## End-to-end flows

### Flow 1 — Approve or reject from a queue (`DockingScanApprovalsPage` / `DockingPartialScanApprovalsPage`)

1. Approver opens **Admin → Docking Approvals** (or **Partial Dispatch Approvals**). The page
   defaults to the **Pending** tab (tabs: Pending / Approved / Rejected / All).
2. `useDockingScanSkipRequests({status})` / `useDockingPartialScanRequests({status})` fetch the
   list (`GET …/scan-skip-requests/?status=` etc.), `staleTime: 15s`.
3. Each row shows docking entry no + document type, vehicle, customer + SAP doc, reason (+ review
   note if any), requester + timestamp, a coloured status badge, and — for **pending** rows and
   only if the user `canApprove` — **Approve** / **Reject** buttons. Non-pending or
   non-approvers see "Awaiting approver" / "Reviewed".
4. Clicking Approve or Reject opens a dialog. **Reject requires a note** (client-side guard
   mirrors the server); Approve's note is optional.
5. Submit calls `useApprove…`/`useReject…` → `POST …/<id>/approve|reject/ {notes}`. On success a
   toast fires ("Scan skip request approved", etc.) and `invalidate…Approval` refetches the
   queue **and** the `['salesDispatch']` keys (so the operator's scan page/readiness updates).
6. On error the dialog shows the server message inline (via `getErrorMessage`) and stays open.

### Flow 2 — Operator raises the request (in the **gate** module, for context)

The requests these queues review are created in
`src/modules/gate/pages/customerSalesFlow/SalesDispatchBarcodeScanPage.tsx`:
- With **zero scans**, the `ScanSkipPanel` offers "request approval to skip scanning";
  `useCreateDockingScanSkipRequest` → `POST scan-skip-requests/`.
- With a **partial** scan (`isPartialScan`), the `PartialScanPanel` offers "request partial
  dispatch approval"; `useCreateDockingPartialScanRequest` → `POST partial-scan-requests/`.
- The page polls the latest request via `useDockingScanSkipRequestByDispatch(entry.id)` /
  `useDockingPartialScanRequestByDispatch(entry.id)` and hard-locks **Continue** until the
  gate is satisfied (`scanGateSatisfied`). Lock copy: *"Locked — box-scan skip is awaiting admin
  approval…"* / *"Locked — partial dispatch is awaiting admin approval…"*.

### Flow 3 — Live badge → queue

`DockingApprovalsBadge` / `PartialApprovalsBadge` call the same list hooks with `{status:'PENDING'}`
(enabled only if the user can view). Each renders as a red pill (`99+` cap): the **parent Admin**
nav item carries the **scan-skip** badge (`DockingApprovalsBadge`), and each child carries its own
(`DockingApprovalsBadge` on scan-approvals, `PartialApprovalsBadge` on partial-dispatch) — so the
parent reflects the scan-skip pending count, not a combined total. Clicking through lands on the
queue. Because the hooks share React Query keys with the pages, an approve/reject decrements the
badge on refetch.

### Flow 4 — Admin dashboard (`AdminDashboardPage`, `/admin`)

A simple card grid. **Currently it lists only the "Docking — Scan Skip Requests" card** (there is
no Partial Dispatch card on the dashboard, though the sidebar has both). Cards are filtered by
`hasAnyPermission`; with no admin permissions the page shows "You do not have access to any admin
queues."

---

## Critical business rules & invariants (frontend-observable)

1. **Approve/Reject only shows for pending rows and only if `canApprove`** (`APPROVE_SCAN_SKIP` /
   `APPROVE_PARTIAL_SCAN`). View-only users see status but no action buttons.
2. **Reject note is mandatory** — the dialog blocks submit with "A note is required when rejecting
   a request." (server enforces the same, returning 400).
3. **One approval = whole load.** The UI never scopes an approval to a bill; the `sales_dispatch`
   id is the unit. (The per-bill "short ship + credit note" flow is a *different* feature — see
   boundaries.)
4. **Badges & queues are active-company scoped.** They reflect the currently selected
   `Company-Code`, so switching company changes what an approver sees.
5. **Optimistic-free.** Mutations wait for the server, then invalidate; there is no optimistic
   row update, so a failed approve leaves the row visibly pending.
6. **Expected-box display is server-computed.** `expected_boxes` comes from the backend
   (`resolved_expected_box_count`), so the `scanned / expected` count matches the operator's scan
   page even for old rows saved as `0` (falls back to `?` only when truly unknown).

---

## Integrations & cross-module boundaries

- **Backend `docking_admin`.** All eight endpoints live under `API_ENDPOINTS.DOCKING_ADMIN`
  (`src/config/constants/api.constants.ts`). Types + hooks in `src/modules/admin/api/`.
- **Gate module (`src/modules/gate`).** Raises the requests and consumes the approval via the
  docking scan page and `gatepass_readiness` on the sales-dispatch entry. Shared query key
  `['salesDispatch']` is invalidated on every approve/reject so the operator's lock updates.
- **Permissions config.** `src/config/permissions/admin.permissions.ts` (`ADMIN_PERMISSIONS.DOCKING`)
  maps to the Django `docking_admin.*` codenames.
- **Notifications module.** Push/in-app messages to approvers and back to operators are produced
  server-side (`DOCKING_SCAN_SKIP_REQUESTED` / `…_REVIEWED`); this module doesn't render them, but
  their `click_action_url` deep-links into these pages.
- **NOT this module: per-bill short-ship approvals.** The gate module has a separate "Partial
  Dispatch Approval" concept (`gate_core.PartialDispatchApproval`) that authorises shipping a
  **bill** short with a **credit note**, blocked at gatepass by `ensure_partial_dispatch_cleared`.
  Despite the similar name, it is **per-bill** and unrelated to this module's **load-wide box-scan**
  approvals. Don't wire the two together.
- **SAP:** none directly. SAP doc numbers appear only as read-only row context.

---

## Real-world edge cases

Each: **trigger → current behaviour → what the approver/operator sees → risk/gap**.

1. **Approver has the wrong company active.** → Queue + badges query the active company only, so a
   request raised for another company is missing and approve/reject would 404. → Approver sees an
   empty/"No pending … requests" queue while the operator is blocked. → Gap: no cross-company view;
   approver must switch `Company-Code` (operator-side reads *are* cross-company, so this asymmetry
   surprises people).

2. **Two approvers open the same pending row.** → First decision wins; the second's POST hits the
   server's "already approved/rejected" 400. → Second approver sees the inline dialog error "Unable
   to save this review" (server detail); a refetch shows the resolved status. → Minor: no live
   locking, but no data corruption.

3. **Operator scans a box after a scan-skip was approved.** → The gate switches from "needs
   scan-skip" to "needs partial-scan"; the old skip approval no longer satisfies the gate. → On the
   scan page the operator is re-locked ("request partial dispatch approval to continue"); the
   approver's scan-skip queue still shows the row as **Approved**. → Gap: an approved row that
   silently stopped mattering.

4. **Bill added to the load after a partial approval.** → The scan page's readiness just checks
   "any approved partial-scan"; it doesn't re-open the gate for the new bill. → Operator can
   Continue with the added bill unscanned; nothing new appears in the approver's queue. → Risk:
   real — the extra bill leaves unscanned.

5. **Reject with an empty note.** → Blocked client-side before any request; the dialog shows the
   validation line. → Approver can't submit until they type a reason. → Correct by design.

6. **Fully-scanned load, operator still tries a partial request.** → Create fails server-side
   (400 "All boxes are scanned…"). → Operator sees the toast/error on the scan page; nothing lands
   in the approver queue. → Correct by design.

7. **Stale badge vs. queue.** → Badge has `staleTime 15s`; a decision elsewhere can leave the pill
   briefly ahead of a not-yet-refetched number. → Approver may see a count that lags by seconds. →
   Cosmetic; resolves on next refetch/navigation.

8. **Docking already gatepass-printed/dispatched when the approver opens the row.** → The row is
   still reviewable in the queue (no docking-status guard on review), but the approval is moot. →
   Approver can "approve" something that no longer affects anything. → Minor housekeeping gap.

---

## Failure modes / what can break (operator/approver-visible)

- **Network / server error on approve/reject.** → Dialog stays open, inline red error from
  `getErrorMessage`, no toast. The row stays pending. Retry is safe (server rejects a double-review
  with 400).
- **List fetch fails.** → The page shows its loading spinner then, on empty data, the "No … requests"
  empty state (React Query returns `[]` default); a hard failure surfaces via the app's global error
  handling, not a bespoke panel here. Badges simply render nothing (`count = 0`).
- **Missing permission but reached the URL.** → Routes are permission-gated in `module.config.tsx`;
  a user without `VIEW_*`/`APPROVE_*` can't navigate here. If they can view but not approve, the
  action buttons don't render.
- **Approver on wrong company** (edge case 1) → looks like "the queue is empty / feature broken."
- **No push received** (notifications down server-side) → the sidebar badge is the fallback signal;
  if the approver isn't looking, requests can sit pending.
- **Operator confusion after a stale/irrelevant approval** (edge cases 3, 4) → the scan page lock
  message and the queue status can disagree.

---

## Improvement opportunities & known gaps

- **Cross-company approver view.** Resolve queues + badges across all the approver's companies (as
  the operator-side reads already do) so requests can't hide behind the active company.
- **Dashboard is incomplete.** `AdminDashboardPage` lists only the scan-skip card; add the
  Partial Dispatch card (and any future admin queues) so the dashboard matches the sidebar.
- **Re-validate load-wide approvals** when the load changes (bill added, expected count grows) so a
  stale approval can't wave through new unscanned goods.
- **Live/optimistic queue updates** or websocket refresh would reduce the two-approver race window
  and badge lag.
- **Distinct partial-scan notifications.** Backend reuses the scan-skip notification type; a
  dedicated type would make deep-links/inboxes clearer.

---

## Permissions & roles (nav gating)

Permission constants: `src/config/permissions/admin.permissions.ts` → `ADMIN_PERMISSIONS.DOCKING`.

| Constant | Django codename | Used for |
|---|---|---|
| `REQUEST_SCAN_SKIP` | `docking_admin.can_request_docking_scan_skip` | Operator raises skip (gate module). |
| `VIEW_SCAN_SKIP` | `…can_view_docking_scan_skip` | See scan-skip queue + badge. |
| `APPROVE_SCAN_SKIP` | `…can_approve_docking_scan_skip` | Approve/reject scan-skip. |
| `REQUEST_PARTIAL_SCAN` | `…can_request_docking_partial_scan` | Operator raises partial (gate module). |
| `VIEW_PARTIAL_SCAN` | `…can_view_docking_partial_scan` | See partial queue + badge. |
| `APPROVE_PARTIAL_SCAN` | `…can_approve_docking_partial_scan` | Approve/reject partial. |

**Nav gating (`module.config.tsx`):** the sidebar gates by **permission**, not group.
- `/admin` (parent + dashboard) requires **any** of the four view/approve perms.
- `/admin/docking/scan-approvals` requires `VIEW_SCAN_SKIP` **or** `APPROVE_SCAN_SKIP`.
- `/admin/docking/partial-dispatch-approvals` requires `VIEW_PARTIAL_SCAN` **or** `APPROVE_PARTIAL_SCAN`.
- Within a page, `canApprove = hasPermission(APPROVE_*)` toggles the action buttons; view-only
  users get a read-only queue.

Seeded backend groups: **Docking Approver** (view + approve, both types) and **Docking Scan
Operator** (request, both types).

---

## Developer file map

**Frontend (`src/modules/admin/`)**
- `pages/DockingScanApprovalsPage.tsx` — scan-skip queue, tabs, review dialog, `StatusBadge`.
- `pages/DockingPartialScanApprovalsPage.tsx` — partial queue (adds Scanned column).
- `pages/AdminDashboardPage.tsx` — card grid (scan-skip card only, currently).
- `api/dockingApproval.api.ts` / `.queries.ts` — scan-skip types, `dockingApprovalApi`, hooks
  (`useDockingScanSkipRequests`, `…ByDispatch`, `useCreate/Approve/Reject…`).
- `api/partialScanApproval.api.ts` / `.queries.ts` — partial equivalents.
- `api/index.ts` — barrel export.
- `components/DockingApprovalsBadge.tsx`, `components/PartialApprovalsBadge.tsx` — sidebar pills.
- `module.config.tsx` — routes, sidebar nav, permission gates, badge wiring.
- `__tests__/api/partialScanApproval.api.test.ts` — API client tests.

**Shared / config**
- `src/config/permissions/admin.permissions.ts` — permission constants.
- `src/config/constants/api.constants.ts` — `API_ENDPOINTS.DOCKING_ADMIN`.

**Operator side (gate module)**
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchBarcodeScanPage.tsx` — raises requests,
  `ScanSkipPanel` / `PartialScanPanel`, the Continue lock.
- `src/modules/gate/pages/customerSalesFlow/SalesDispatchGatepassPage.tsx` — consumes readiness.

---

## Related docs

- Paired backend doc: `C:/Users/gurpa/dev/factory_app/docking_admin/docs/README.md`
- `docs/modules/sales-dispatch-docking.md`, `docs/modules/dispatch.md`, `docs/modules/gate.md` —
  operator docking / dispatch journeys.
- `docs/modules/notifications.md` — how approver/operator notifications are delivered.
- Backend lifecycle: `C:/Users/gurpa/dev/factory_app/gate_core/docs/sales_dispatch.md`.
