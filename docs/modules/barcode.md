# Barcode & Labels — Frontend (`src/modules/barcode`)

> Audience: developers and technical managers. This documents the **React module
> as it is today**. (An earlier version of this file was a 2026-04 requirements
> brief describing bin foreign keys and SAP stock-transfer posting — both have
> since diverged from the code. Trust this file.)
>
> Backend companion: [`factory_app/barcode/docs/README.md`](../../../factory_app/barcode/docs/README.md)

---

## Overview — what it does & who uses it

This module is the operator-facing UI for everything in the backend `barcode`
app: generating and printing box/pallet labels, moving/splitting/clearing
pallets, dismantling and repacking, scanning, **scanner-first dispatch** against
an SAP bill, intercompany transfers, pallet verification, and reports.

It is a standard FactoryFlow feature module: routes and sidebar entries are
declared in `module.config.tsx`, data access goes through `api/barcode.api.ts`
(thin axios wrappers) and `api/barcode.queries.ts` (TanStack Query hooks), and
every route is **permission-gated**.

Who uses which screen:
- **Barcode operators** — Pallet QR Print, Reprint, Print History, Scan.
- **Dispatch/warehouse operators** — Dispatch cockpit, Verify Pallet.
- **Barcode team** (`barcode.view_pallet`) — Verify Pallet resolution, pallet reconcile.
- **Transfer operators** — Intercompany Transfer, Traceability.
- **Managers** — Dispatch Reports, dashboards.

---

## Key concepts & entities (frontend view)

- Types live in `types/barcode.types.ts` (re-exported from `types/index.ts`); runtime validation schemas in `schemas/barcode.schemas.ts`.
- List endpoints return **either** a bare array **or** a `{ results, count, page, … }` page. `api/barcode.api.ts` normalizes both via `unwrapList` / `normalizePage`, and most hooks expose both a plain (`useBoxes`) and paged (`useBoxesPage`) variant.
- A **dispatch session** is the central object on the dispatch screen: it carries `lines`, `scanned_units`, progress totals, `active_line`, and boolean helpers `can_scan` / `can_dispatch` computed by the backend serializer.
- **Scanning** is dual-mode everywhere: a focused text `Input` (handheld/keyboard-wedge scanners type into it) **and** an optional camera scanner (`hooks/useScanner.ts`, html5-qrcode).

---

## End-to-end flows (user journeys)

### 1. Pallet QR Print — `pages/LabelGeneratePage.tsx` (route `/barcode/generate`)
1. Operator selects an **empty pallet** (`SearchableSelect` filtered to `ACTIVE`/`CLEARED` with `box_count === 0`); a `ScanSearchButton` lets them scan the pallet instead of typing.
2. Selects a finished-good **item from SAP** (`useOitmItems`, debounced search of SAP `OITM`), then fills batch, qty-per-label, items-per-pallet (box count), mfg/exp dates, warehouse, production line, and optional gross/net weights.
3. **Generate & print** (`handleGenerateAndPrint`) does three calls in sequence: `generateBoxes` → `addBoxesToPallet` → `printBulk` (2 pallet labels + one per box).
4. Labels render off-screen (`BoxLabel` / `PalletLabel`) and print via `react-to-print` using a 100×40 mm thermal page style. The printer name + mode persist in `localStorage` (`hooks/usePrinterProfile.ts`, default **TSC DA310**).

### 2. Dispatch cockpit — `pages/BarcodeDispatchPage.tsx` (route `/barcode/dispatch`)
This is the highest-traffic, most failure-sensitive screen.
1. **Lookup** a bill number → `useLookupDispatchBill` shows a read-only SAP bill summary (lines, qty, boxes, "Already dispatched" badge).
2. **Start** → `useCreateDispatchSession` creates/resumes the session and selects it. The right rail shows the session, scanner dock, controls, and an Active/Done/Closed queue.
3. **Scan** via the `ScannerDock` (keyboard input or camera). `handleScan` calls `useSubmitDispatchScan` with a fresh `request_id` (`crypto.randomUUID()`) for idempotency. Accepted → success toast with the backend's message; rejected → **warning** toast (not an error), and `BOX_ALREADY_SCANNED` scrolls to and amber-highlights the offending box row.
4. **Active line focus / Line board** — when `require_sequential_item_scanning` is on you must clear the active line before the next (`isLineLocked` greys the rest); when off, the operator can click a line to target it (`selectedLineId`, sent as `line_id`).
5. **Scanned Boxes** — each staged box shows original/available/required/dispatch/remaining qty; the operator can **Edit Qty** (`useUpdateDispatchScannedBoxQty`) or **Remove Box** (`useRemoveDispatchScannedBox`, behind a `window.confirm`).
6. **Confirm Dispatch** (`useDispatchSessionDispatch`) → navigates to the summary (`/barcode/dispatch/summary/:sessionId`). Enabled only when `can_dispatch` and not closed.
7. **Close / Cancel** — require a typed reason; hidden once the session is terminal.
8. **Controls panel** toggles `DispatchSettings` live (partial dispatch, partial pallet, box-from-pallet, sequential scan, manual close, admin override).

### 3. Verify Pallet (label-fell-off recovery) — `pages/PalletVerifyPage.tsx` + `components/verify/*`
- `PalletVerifyPanel` scans a pallet's boxes and shows **matched / missing / foreign** counters against the backend reconcile (`useReconcilePallet`).
- **Missing** boxes (label lost) can be **reprinted** in place (recover), when counts and item/batch/uom line up.
- **Foreign** boxes are labelled by reason (on another pallet, unpalletized, dispatched, void, unknown).
- The barcode team can **Apply** stock-healing (pull foreign on / drop missing off) via `useApplyPalletReconcile`; a non-team operator instead **Submits a ticket** (`useCreateVerifyRequest`, `pages/PalletVerifyNewPage.tsx`) that the team resolves (`/barcode/verify` list, `/barcode/verify/:requestId` detail → `pages/PalletVerifyRequestDetailPage.tsx`). `PalletVerifyDialog` is embedded in the dispatch scanner dock for in-flow recovery.

### 4. Pallet operations — Move / Godown Transfer / Split / Box Transfer / Dismantle / Repack
Dedicated pages under `/barcode/move`, `/transfer`, `/split`, `/box-transfer`, `/dismantle`, `/repack`, `/loose`:
- **Move Pallet** (`PalletMovePage`, `/move`) — single pallet to a new warehouse/bin; `hooks/useDestinationBins.ts` offers app-managed bins when the destination is an own warehouse. Calls `useMovePallet`.
- **Godown Transfer** (`PalletTransferPage`, `/transfer`) — a **bulk pallet warehouse move** (e.g. BH-PF → GP-FG). Despite "Transfer" in the name it calls `useMovePallet` once per selected pallet — it is not a box/ownership transfer.
- **Split** (`PalletSplitPage`) `useSplitPallet`, **Box Transfer** (`BoxTransferPage`) `useTransferBoxes`, **Dismantle** (`DismantlePage`) `useDismantlePallet`/`useDismantleBox`, **Repack** (`RepackPage`) `useRepack`. Loose stock created by dismantle is listed on `/barcode/loose` and consumed by Repack.

### 5. Intercompany Transfer & Traceability — `pages/IntercompanyTransferPage.tsx`, `IntercompanyTransferDetailPage.tsx`, `BarcodeTraceabilityPage.tsx`
- Pick source + destination company and BOX/PALLET mode, scan barcodes (`useScanIntercompanyBarcode` validates each against the source), then confirm (`useCreateIntercompanyTransfer`). Transfers can be reversed (`useReverseIntercompanyTransfer`).
- The Confirm button opens a dialog showing which warehouse the stock will land in and a **destination warehouse** picker (`useIntercompanyWarehouses` — the destination company's active SAP warehouses). The pick is required; it pre-selects the stock's current warehouse code when it exists in the destination. The backend relocates the stock into the chosen warehouse in the same transaction, so no separate godown transfer is needed afterwards.
- **Traceability** searches a barcode across companies (`useBarcodeTrace`) — the one intentionally **global** view, showing manufacturing company, current owner, dispatch status, and full audit history.

---

## Critical business rules & invariants (as enforced/echoed in the UI)

- **Idempotent dispatch scans.** Every scan sends a `request_id`; the camera scanner also debounces identical reads (`useScanner` debounce, **2000 ms** in the dispatch dock — the hook default is 1500 ms) so a lingering QR in frame doesn't double-fire.
- **Scan gating.** `canSubmitDispatchScan` (`utils/dispatchValidation.ts`) blocks scanning when the session is closed/terminal or has no active line; the scanner input shows "Scanner locked".
- **Dispatch enablement.** `canMarkDispatchComplete` requires a non-terminal status and the backend's `can_dispatch`; Close/Cancel require a typed reason.
- **Empty-pallet rule for label print.** The pallet picker only offers `ACTIVE`/`CLEARED` pallets with zero boxes, mirroring the backend "create empty, attach later" rule.
- **Client-side qty guards.** The Scanned-Boxes editor rejects qty `< 1` or `> total_box_qty` before calling the API (the backend re-validates).

---

## Integrations & cross-module boundaries

- **SAP HANA (read only).** The UI reads SAP through the backend for: the dispatch **bill lookup** (`useLookupDispatchBill`), the Pallet-QR **item picker** (`useOitmItems` → `OITM`), and the **production-release** list (`useProductionReleaseOil`). Each surfaces a 503 toast when SAP is unavailable. The UI **never** claims to post to SAP — dispatch completion is app-only (see backend doc).
- **Warehouse Ops (`wms`).** `hooks/useSyncPalletToBarcode.ts` is a **reverse write-bridge**: when a WMS pallet move lands in a warehouse that maps to a SAP code and the license plate matches a barcode `pallet_id`, it mirrors the move by calling `barcodeApi.movePallet` so both datasets agree. It lives in this module (it owns `barcodeApi`) but is imported by WMS pages; the import graph stays acyclic. Server-side, the pallet list/move endpoints also accept WMS operator perms so this bridge works without barcode permissions.
- **Cross-company.** Intercompany Transfer moves ownership between companies; afterwards a box leaves the source company's (single-company) lists. **Traceability** is the deliberate global escape hatch to find it again.
- **Shared platform.** All calls go through the core axios client (`@/core/api`), which injects auth + company context and centrally toasts common HTTP statuses; `utils/errors.ts` de-duplicates against that (below). Routing/permission gating comes from the app shell (`AppRoutes.tsx` → `ProtectedRoute`) reading `module.config.tsx`.
- **Gate / vehicle-arrival boundary.** Barcode dispatch is keyed to an **SAP bill** and is independent of the gate/`VehicleArrival` lifecycle — this screen does not open/close truck arrivals; it only marks boxes/pallets dispatched in the barcode backend.

---

## State, offline & scanning behaviour

- **Server state** is TanStack Query. Most mutations invalidate the whole `BARCODE_QUERY_KEYS.all` tree (simple, slightly broad). Dispatch mutations are surgical: scan/complete/close write the fresh session straight into the cache with `setQueryData` and invalidate the session's scan-log list.
- **No live polling.** The dispatch session is **not** on a `refetchInterval` (confirmed: no `refetchInterval` anywhere in the module); it stays current because each scan/edit mutation returns the updated session and writes it into the cache. Two operators on the same bill will not see each other's scans until a refetch — a real multi-user caveat.
- **No offline queue.** Scans POST directly to the API; there is no local buffering/retry. If the network drops mid-scan the mutation fails and the operator sees an error toast — they must re-scan when back online (idempotency via `request_id` makes an accidental double-submit safe).
- **Read-only reconcile is not cache-invalidating** (`useReconcilePallet`) because the live verify scan loop fires it on every scan; only **applying** a reconcile (`useApplyPalletReconcile`) invalidates.
- **Camera scanner** (`useScanner`) uses the rear camera (`facingMode: environment`), feature-detects torch/flashlight, and debounces duplicate decodes. Camera failures (permission denied, no device) surface as inline red text under the scanner, not a crash.
- **Printer profile** persists in `localStorage` per browser; there is no server-side printer registry.

---

## What the operator sees when something fails

Error surfacing is centralized in `utils/errors.ts`:
- The shared axios client already toasts common HTTP statuses (400/401/403/500/502/503/504). `toastBarcodeError` **avoids double-toasting** those and only shows a fallback message for other failures — so most backend rejections appear exactly once.
- **Dispatch scan rejections** are shown as **warning** toasts using the backend's `reject_message`/`success_message` (`formatDispatchScanMessage`), because a rejected scan is a normal operational outcome, not an app error. (The scan endpoint returns HTTP 400 for a rejection; `submitDispatchScan` treats 400 as a valid response body, not a thrown error.)

| Situation | What the operator sees |
|-----------|------------------------|
| SAP down at bill lookup | "Unable to fetch bill details from SAP" toast (503). Cannot Start until SAP is back. |
| Bill already dispatched | Start is rejected with the backend's `BILL_ALREADY_DISPATCHED` message. |
| Re-scan a staged box | Warning toast "This box is already scanned"; the box row scrolls into view and flashes amber. |
| Box already dispatched elsewhere | Warning toast, with a distinct "…through pallet dispatch" message when relevant. |
| Wrong material / out of sequence | Warning toast ("Complete the current item before scanning the next item" / "does not match current item"). |
| Camera permission denied / no camera | Inline red error under the scanner; keyboard/handheld input still works. |
| Network drop mid-scan | Error toast; nothing staged. Re-scan when back (safe — idempotent). |
| Missing weights on a label | Label just renders blank weight fields; no error. |
| Confirm dispatch with partial scan (partial allowed) | Succeeds; session moves to **Done** even though pending qty remains — only the reports show the shortfall. |

---

## Real-world edge cases

**trigger → current behaviour → operator-visible symptom → risk/gap**

1. **Two operators dispatch the same bill** → no live sync; each sees only their own scans until a manual refresh; the backend still dedupes boxes → one operator's toast says the box was already scanned/dispatched → **gap**: no real-time collaboration; rely on one operator per bill.
2. **Partial pallet already partly dispatched** → pallet scan either rejects (`PALLET_HAS_DISPATCHED_BOXES`) or dispatches only remaining boxes with a warning banner in the recent-scan message → operator must read the warning to notice the short count → risk of under-loading.
3. **Label fell off a box mid-dispatch** → open the embedded `PalletVerifyDialog` from the scanner dock, scan siblings, reprint the recovered label → operator continues without minting a duplicate barcode → works only when unlabeled count matches missing count.
4. **Duplicate QR lingering in camera frame** → `useScanner` debounce swallows the repeat → no duplicate submit → correct.
5. **Cross-company box vanished from a list** → after an intercompany transfer the box leaves the source company's lists (single-company reads) → operator "loses" it → use **Traceability** (global) to locate it; this is by design.
6. **OIL→MART transfer with unmapped item** → transfer fails atomically with "maintain U_Oil_ItemCode in Jivo Mart OITM" → operator sees a precise error, nothing moved → correct; requires SAP master-data fix.
7. **Confirm dispatch shows COMPLETED but SAP unchanged** → SAP write-back is disabled backend-side; the UI never claims an SAP post → manager must reconcile SAP separately → documented gap, not a UI bug.
8. **Printer offline / wrong printer** → `react-to-print` opens the OS print dialog; a wrong/absent printer is an OS-level failure the app can't detect → labels may silently not print → operator should confirm at the printer; reprint via Print History.

---

## Failure modes / what can break

- **SAP HANA unreachable** → bill lookup and the Pallet-QR item picker error out; label generation and dispatch **start** are blocked (dispatch **completion** is not, since it doesn't call SAP).
- **Stale dispatch session view** → because there's no polling, a session left open in a tab can drift from reality; a page refresh or reselecting the session refetches.
- **Broad cache invalidation** → most non-dispatch mutations invalidate `BARCODE_QUERY_KEYS.all`, so unrelated barcode lists refetch after any write — cheap correctness, mild extra traffic.
- **Camera/torch unsupported** → gracefully degrades to keyboard/handheld input; torch button hides itself.
- **`localStorage` printer profile per-device** → a new browser/kiosk defaults to "TSC DA310" and must be reconfigured.

---

## Improvement opportunities & known gaps

- **No offline/queued scanning** — a dock with flaky Wi-Fi loses scans on drop (must re-scan).
- **No real-time multi-user dispatch** — no polling/websocket; concurrent operators can't see each other.
- **Partial dispatch leaves no on-screen residual** — a short bill reads as Done.
- **Print success is unverifiable** — browser/OS print dialog gives no delivery confirmation back to the app.
- **Permission gating is nav-level.** Routes are gated in `module.config.tsx`, but the backend REST endpoints mostly enforce only the coarse `HasAnyBarcodePermission` — so the fine-grained dispatch/intercompany perms are primarily a **frontend** guarantee. Don't rely on the UI alone for authorization-sensitive actions.

---

## Permissions & roles (nav gating)

Permission constants: `src/config/permissions/barcode.permissions.ts`. Routes and
sidebar children in `module.config.tsx` each declare a `permissions` array. Route
guarding (`AppRoutes.tsx` → `ProtectedRoute`) uses **OR** semantics — holding
**any** listed permission grants access (`requireAll` is not set). The sidebar
gates by permission, not by group.

| Screen(s) | Required permission(s) |
|-----------|------------------------|
| Dashboard, Pallets (+detail), Verify (+new/detail) | `barcode.view_pallet` |
| Boxes (+detail), Reprint, Print History, Scan, Loose Stock | `barcode.view_box` |
| Pallet QR Print (generate) | `barcode.add_box` |
| Move / Godown Transfer / Split | `barcode.change_pallet` |
| Box Transfer / Dismantle / Repack | `barcode.change_box` |
| Dispatch, Dispatch Reports, Summary | **any of** `can_view_barcode_dispatch` / `barcode.view_box` (route arrays are OR — a plain box-viewer can open Dispatch) |
| Intercompany Transfer, Traceability | `can_view_intercompany_transfer` (`/intercompany` list also accepts `can_scan_intercompany_transfer`) |

Only the **barcode team** (`barcode.view_pallet`) sees the Apply/resolve controls
in the verify flow; other operators can only submit verify tickets.

---

## Developer file map

**Frontend (`C:/Users/gurpa/dev/FactoryFlow/src/modules/barcode/`)**
- `module.config.tsx` — routes + sidebar nav + permission gates.
- `api/barcode.api.ts` — axios endpoint wrappers; list/page normalization; dispatch-scan 400 handling.
- `api/barcode.queries.ts` — all TanStack Query hooks + `BARCODE_QUERY_KEYS`.
- `types/barcode.types.ts`, `schemas/barcode.schemas.ts` — types + validation.
- `hooks/useScanner.ts` — camera (html5-qrcode) scanner with torch + debounce.
- `hooks/usePrinterProfile.ts` — persisted printer name/mode.
- `hooks/useDestinationBins.ts` — app-managed bin options for an own destination warehouse (Move Pallet).
- `hooks/useSyncPalletToBarcode.ts` — bridge that pushes a **WMS** pallet move into the barcode backend (`movePallet`).
- `utils/dispatchValidation.ts` — active-line, progress, line-locking, `can_scan`/`can_dispatch`, scan-message formatting.
- `utils/errors.ts` — de-duplicated error toasts.
- `pages/BarcodeDispatchPage.tsx` — dispatch cockpit (the core screen); `BarcodeDispatch{Reports,Summary}Page.tsx`.
- `pages/LabelGeneratePage.tsx` — Pallet QR Print.
- `pages/PalletVerifyPage.tsx`, `PalletVerifyNewPage.tsx`, `PalletVerifyRequestDetailPage.tsx` + `components/verify/{PalletVerifyPanel,PalletVerifyDialog,PalletPicker}.tsx` — reconcile/verify + ticket workflow.
- `pages/IntercompanyTransferPage.tsx`, `IntercompanyTransferDetailPage.tsx`, `BarcodeTraceabilityPage.tsx` — cross-company transfer + trace.
- `pages/{PalletMove,PalletTransfer,PalletSplit,BoxTransfer,Dismantle,Repack,LooseStock}Page.tsx` — pallet/box ops.
- `pages/{Pallet,Box}ListPage.tsx`, `{Pallet,Box}DetailPage.tsx`, `ScanPage.tsx`, `ReprintPage.tsx`, `PrintHistoryPage.tsx`, `BarcodeDashboardPage.tsx`.
- `components/{BoxLabel,PalletLabel,PrintableLabel,Barcode1D,labelPrint}.tsx` — label rendering + thermal page style.
- `components/{BarcodeScanner,ScanSearchButton,PrinterProfileControls}.tsx` — scanning + print controls.

**Key backend files** — see the companion doc; entry points are
`factory_app/barcode/urls.py`, `views.py`, and
`services/dispatch_service.py`.

---

## Related docs
- Backend companion: [`factory_app/barcode/docs/README.md`](../../../factory_app/barcode/docs/README.md)
- Older design/background (partly superseded): `docs/modules/barcode-dispatch-design.md`, `barcode-dispatch-sequence-options.md`, `barcode-implementation.md`.
