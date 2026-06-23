# Docking Box-Scanning Speed Plan

Updated: 2026-06-23

Page: [`SalesDispatchBarcodeScanPage.tsx`](../src/modules/gate/pages/customerSalesFlow/SalesDispatchBarcodeScanPage.tsx)
Mutations/queries: [`salesDispatch.queries.ts`](../src/modules/gate/api/salesDispatch/salesDispatch.queries.ts)

## Goal

Box scanning on the Docking step is slow. The real bottleneck is **network round-trips
per box**, not rendering. This doc tracks the work to cut that latency so a hardware
scanner can fire boxes continuously and the operator never waits on the server between
scans.

## Done

- **Mobile camera vs. hardware-scanner auto-focus.** The barcode field only auto-focuses
  on devices with a fine pointer (desktop/laptop, where a USB/Bluetooth scanner is used).
  On phones/tablets it no longer auto-focuses, so the soft keyboard stops popping over the
  camera. Manual typing still works on tap. See `detectFinePointer()` and `autoFocusBarcode`
  in `SalesDispatchBarcodeScanPage.tsx`.

## Remaining work (in recommended order)

### 1. Remove the redundant per-scan entry refetch — low risk

`processBarcode` calls `await refetchEntry()` after every successful save. But the
`useScanSalesDispatchBox` mutation already runs `invalidateSalesDispatch(queryClient)` in
its `onSuccess`, which invalidates **all** `salesDispatch` queries — including
`byVehicleEntry` — so React Query refetches the entry automatically. The explicit
`refetchEntry()` is therefore a **second, redundant fetch of the full entry** (all items +
documents) on every box.

- **Change:** Delete the `await refetchEntry()` call in `processBarcode` (and any now-unused
  `refetchEntry` references). Rely on the mutation's invalidation.
- **Effect:** Roughly halves the network wait per scan.
- **Risk:** Low. Nothing after the call depends on the refetched data; the toast and
  re-focus do not need it.

### 2. Optimistic scan UI — biggest win, medium effort/risk

The barcode input is `disabled` while a scan saves (`isSaving`). A fast hardware-scanner
operator either loses the next box's keystrokes or is forced to wait a full server
round-trip between boxes. This is the single biggest throughput limiter.

- **Change:** Keep the field live during save. The `scanBox` POST already returns the full
  `SalesDispatchBoxScan`, so optimistically append it to the `boxScans` query cache (or via
  `useMutation` `onMutate`) and let the save settle in the background. Roll back the
  optimistic row on error and surface the failure inline.
- **Considerations:**
  - Dedup must also check **in-flight / optimistic** rows, not just `scans`, so a double
    trigger doesn't create two pending entries for the same barcode.
  - Decide whether to allow concurrent in-flight saves or serialize them through a small
    queue. A queue is simpler to reason about and keeps server ordering stable.
  - Error handling: a rejected save must remove its optimistic row and re-show the barcode
    so the operator can retry.
- **Effect:** Operator scans continuously; perceived latency per box drops to ~0.
- **Risk:** Medium. Needs careful dedup + rollback; add/extend tests.

### 3. Scope the per-scan cache invalidation — low risk

`invalidateSalesDispatch` invalidates `['salesDispatch']` (all), `['vehicleEntries']`, and
`['dispatch-plans']`. During a scan loop this refetches heavy list queries that don't change
while scanning, multiplying the work per box.

- **Change:** For the scan/remove-scan mutations specifically, invalidate only what a scan
  actually affects — this entry's `boxScans` and `byVehicleEntry` — instead of the global
  lists. Leave the broad invalidation on the lifecycle mutations (create, print, dispatch,
  etc.) untouched.
- **Effect:** Removes redundant list refetches on every box.
- **Risk:** Low, but verify the dashboard/vehicle-entry counts still update on entering and
  leaving the scan step (they refresh on navigation anyway).

## Sequencing

Do **#1 and #3** together first — both are low-risk and immediately cut round-trips with no
UX change. Then take **#2** as a focused follow-up, since it changes the save lifecycle and
warrants its own testing pass.
