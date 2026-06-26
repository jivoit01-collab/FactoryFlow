# High-Speed Dock Box Scanning

Instant-local + background-sync box scanning for the Docking (sales dispatch)
flow. Replaces the old "scan into a list → tap **Submit** → batch API" model,
which felt slow and lost scans when the submit failed.

Used by
[`SalesDispatchBarcodeScanPage`](../../pages/customerSalesFlow/SalesDispatchBarcodeScanPage.tsx).

## Two decoupled lanes

1. **Scan lane (`useBoxScanSync.acceptScan`)** — runs on every box in
   microseconds. In-memory dedupe, an O(1) count bump, and a fire-and-forget
   IndexedDB write. **No `await`, no network, no DB read** on this path, so it
   stays single-digit-millisecond whether it's box 4 or box 400.
2. **Sync lane** — a `setInterval(1500ms)` loop (plus a flush on `online` and an
   auto-flush once 10 boxes are queued) POSTs queued boxes to the server as one
   **idempotent** batch. Confirmed rows are removed; rejected rows are surfaced.
   A failed POST loses nothing — a box is auto-retried up to `MAX_SYNC_ATTEMPTS`
   (2) times; after that it's marked **failed** so the operator can retry/remove it.

```
scan ─▶ acceptScan() ─▶ in-memory Map (+ count) ─▶ IndexedDB (durable)
                                                        │
                          1.5s loop / online / 10-box auto-flush
                                                        ▼
                            POST /gate-core/sales-dispatch/{id}/box-scans/batch/
                                                        │
                       saved/duplicate → leave queue   rejected → stays in queue
```

## The live Sync Queue (UI)

The page shows a **Sync Queue** card listing every box not yet confirmed by the
server. Each row carries a status: **Queued** → **Syncing…** → (gone once saved).
A box that the server rejects, or that can't be synced after two attempts, turns
**Failed** and stays pinned to the top with the reason; the operator can **Retry**
them or **Remove** them. A still-queued mis-scan can also be removed; a box that is
mid-flight cannot be cancelled until its POST resolves. The list only ever holds
unsynced boxes (it drains every ~1.5s) and renders at most 50 rows, so it never
grows like the full saved-boxes table.

## Files

- `boxScanQueueDb.ts` — durable IndexedDB queue (`factoryScanQueueDB`), opened
  once and reused. Keyed by `shipmentId + barcode` so the same box can never be
  stored twice (local dedupe). Survives reload / app restart.
- `useBoxScanSync.ts` — the engine: instant accept, the background loop, and
  idempotent reconciliation of the server response.
- `scanFeedback.ts` — Web Audio + haptic accept / duplicate / reject tones.

## Why it's safe

- **Idempotent server contract.** The backend enforces a unique
  `(sales_dispatch, box_barcode)` constraint and `get_or_create`s each scan, so
  re-sending a box is a no-op. A box already saved comes back as a `DUPLICATE`
  failure, which the client treats as **confirmed** — so a network drop *after*
  the server committed never double-counts and never loses the box.
- **Server-authoritative validation.** There is no client-side manifest of valid
  box IDs; the server resolves each barcode → `Box` → invoice. The client does
  instant local dedupe and surfaces server rejections (unknown / not-a-box /
  wrong-status) in the Sync Queue for retry or removal.
- **Scoped to the active shipment.** Everything keys on `dispatchId`, so two
  trucks loading at once stay isolated.
- **Complete = force-flush + confirm.** "Continue to Attachments" force-flushes
  the queue and refuses to advance until every scanned box is confirmed
  server-side. Short-loads still go through the existing admin scan-skip /
  partial-dispatch approval flows.

## Device configuration (Honeywell — ops task, not code)

Set on each unit, not in the app: `Settings → Honeywell Settings → Scanning`
(ScannerEdge), in the scanner profile:

- **Data processing:** enable **Wedge**; Suffix `\x0D` (or `13` in "Wedge as
  keys") so each scan auto-presses Enter into the focused input.
- **Trigger mode:** continuous / presentation / auto (no per-box trigger press).
- **Symbologies:** enable only QR (and DataMatrix if used); disable the rest for
  faster lock-on and fewer mis-reads.
- **Centering window / Center Decode:** ON (decode only the centered label).
- **Notifications:** good-read beep + vibrate, and a distinct bad-read tone.

For richer per-result sounds than a plain wedge, run inside Honeywell Enterprise
Browser and feed its JavaScript scanner API into `acceptScan` instead.
