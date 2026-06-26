import { useCallback, useEffect, useRef, useState } from 'react';

import {
  salesDispatchApi,
  type SalesDispatchBoxScan,
  type SalesDispatchBoxScanFailureReason,
} from '@/modules/gate/api';

import {
  boxScanQueueDb,
  boxScanQueueKey,
  type BoxScanQueueRecord,
} from './boxScanQueueDb';

/** How often the background loop drains the local queue to the server. */
const SYNC_INTERVAL_MS = 1500;
/** Auto-flush as soon as this many boxes are waiting, to keep the server fresh. */
const AUTO_FLUSH_THRESHOLD = 10;
/**
 * How many times a box is auto-retried before we stop and ask the operator to
 * retry or remove it. The box is *sent* on each attempt, so with 2 attempts a
 * box that can't reach the server twice in a row surfaces a Retry/Remove button.
 */
export const MAX_SYNC_ATTEMPTS = 2;

/** Reasons that mean "the box is on the server already" — treat as confirmed. */
const CONFIRMED_FAILURE_REASONS: ReadonlySet<SalesDispatchBoxScanFailureReason> = new Set([
  'DUPLICATE',
]);

export type ScanOutcome = 'accepted' | 'duplicate' | 'empty';

/**
 * A box visible in the live sync queue (anything not yet server-confirmed).
 * 'rejected' = the server refused it (bad/unknown box); 'failed' = it could not
 * be synced after {@link MAX_SYNC_ATTEMPTS} tries. Both need the operator to act.
 */
export type QueuedScanStatus = 'pending' | 'syncing' | 'rejected' | 'failed';

export interface QueuedScan {
  key: string;
  barcode: string;
  status: QueuedScanStatus;
  /** Set only when status is 'rejected' (server-provided reason). */
  reason?: SalesDispatchBoxScanFailureReason;
  detail?: string;
  /** Epoch ms when the box was scanned locally. */
  ts: number;
}

export interface FlushResult {
  /** Boxes saved locally but not yet confirmed by the server. */
  pendingRemaining: number;
  /** Boxes that need the operator to act (server-rejected or sync-failed). */
  failedRemaining: number;
}

// 'confirmed' = the server saved it, but react-query hasn't refetched yet. We keep
// the row in memory (still counted) until server truth catches up, so the headline
// tally never dips between a flush and its refetch. Confirmed rows leave the queue.
// 'failed' = couldn't sync after MAX_SYNC_ATTEMPTS; awaits manual retry/remove.
type LocalStatus = 'pending' | 'syncing' | 'confirmed' | 'rejected' | 'failed';

interface LocalEntry {
  key: string;
  barcode: string;
  status: LocalStatus;
  ts: number;
  /** Number of sync attempts made so far (for the auto-retry budget). */
  attempts: number;
  reason?: SalesDispatchBoxScanFailureReason;
  detail?: string;
}

interface UseBoxScanSyncOptions {
  dispatchId?: number;
  /** Server-confirmed scans for this dispatch (react-query truth). */
  serverScans: SalesDispatchBoxScan[];
  /** Whether scanning + syncing is allowed (false when the entry is read-only). */
  enabled: boolean;
  /** Called after a successful sync so the page can refetch server truth. */
  onServerChanged: () => void;
}

export interface UseBoxScanSyncResult {
  /** Instant, synchronous scan handler — no `await`, no network, no DB read. */
  acceptScan: (rawBarcode: string) => ScanOutcome;
  /** Unique boxes accepted (server-saved + locally queued, never double counted). */
  acceptedCount: number;
  /** Boxes saved locally but not yet confirmed by the server (queued + syncing). */
  pendingCount: number;
  /** Boxes needing the operator to act: server-rejected or sync-failed. */
  failedCount: number;
  /**
   * The live queue: every box not yet server-confirmed, ordered with the ones
   * needing attention (rejected/failed) first, then newest-first. A box leaves
   * this list the moment the server confirms it.
   */
  queue: QueuedScan[];
  /** True while a batch is in flight. */
  isSyncing: boolean;
  /** True when the last sync attempt failed (offline / server error). */
  isOffline: boolean;
  /** Force-flush the queue and report how many boxes are still unconfirmed/rejected. */
  flushNow: () => Promise<FlushResult>;
  /** Re-queue a box for another sync attempt (used on rejected boxes). */
  retryQueued: (key: string) => void;
  /** Remove a box from the queue (a mis-scan or an unresolvable rejection). */
  removeQueued: (key: string) => void;
}

/**
 * Splits dock scanning into two decoupled lanes:
 *
 *  1. **Scan lane** — `acceptScan` runs in microseconds: in-memory dedupe, an
 *     O(1) count bump, and a fire-and-forget IndexedDB write. It never awaits.
 *  2. **Sync lane** — a 1.5s background loop (plus on-reconnect and an N-box
 *     auto-flush) POSTs queued boxes as one idempotent batch. Confirmed rows
 *     leave the queue; rejected rows stay visible for retry/remove. A failed
 *     POST loses nothing — rows stay queued and retry on the next tick.
 */
export function useBoxScanSync({
  dispatchId,
  serverScans,
  enabled,
  onServerChanged,
}: UseBoxScanSyncOptions): UseBoxScanSyncResult {
  // --- Refs hold the live source of truth so the interval never reads stale data.
  const localRef = useRef<Map<string, LocalEntry>>(new Map());
  const serverKeysRef = useRef<Set<string>>(new Set());
  const serverCountRef = useRef(0);
  const flushingRef = useRef(false);
  const dispatchIdRef = useRef<number | undefined>(dispatchId);
  const onServerChangedRef = useRef(onServerChanged);
  dispatchIdRef.current = dispatchId;
  onServerChangedRef.current = onServerChanged;

  // --- React state mirrors the display-facing numbers plus the (small, fast-
  //     draining) queue list. The heavy Saved-Boxes table is memoized separately.
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  /** Rebuild the counts + visible queue from the in-memory map. */
  const recompute = useCallback(() => {
    const serverKeys = serverKeysRef.current;
    let pending = 0;
    let failed = 0;
    let queuedNotOnServer = 0;
    const list: QueuedScan[] = [];
    for (const entry of localRef.current.values()) {
      // Confirmed boxes still count toward the tally (until the refetch lands)
      // but have left the visible queue.
      if (entry.status === 'confirmed') {
        if (!serverKeys.has(entry.key)) queuedNotOnServer += 1;
        continue;
      }
      // Both server-rejected and sync-failed boxes need the operator to act.
      if (entry.status === 'rejected' || entry.status === 'failed') {
        failed += 1;
        list.push({
          key: entry.key,
          barcode: entry.barcode,
          status: entry.status,
          reason: entry.reason,
          detail: entry.detail,
          ts: entry.ts,
        });
        continue;
      }
      // pending | syncing
      if (!serverKeys.has(entry.key)) {
        queuedNotOnServer += 1;
        pending += 1;
      }
      list.push({ key: entry.key, barcode: entry.barcode, status: entry.status, ts: entry.ts });
    }
    // Need-attention boxes first, then most-recently-scanned first.
    list.sort((a, b) => {
      const aAction = a.status === 'rejected' || a.status === 'failed' ? 0 : 1;
      const bAction = b.status === 'rejected' || b.status === 'failed' ? 0 : 1;
      if (aAction !== bAction) return aAction - bAction;
      return b.ts - a.ts;
    });
    setAcceptedCount(serverCountRef.current + queuedNotOnServer);
    setPendingCount(pending);
    setFailedCount(failed);
    setQueue(list);
  }, []);

  // --- Keep the server-key set + count in sync with react-query data, and drop
  //     any local rows the server has now confirmed (e.g. from a prior session).
  useEffect(() => {
    const id = dispatchId;
    const keys = new Set<string>();
    if (id != null) {
      for (const scan of serverScans) {
        if (scan.box_barcode) keys.add(boxScanQueueKey(id, scan.box_barcode));
        if (scan.barcode_raw) keys.add(boxScanQueueKey(id, scan.barcode_raw));
      }
    }
    serverKeysRef.current = keys;
    serverCountRef.current = serverScans.length;

    const confirmed: string[] = [];
    for (const entry of localRef.current.values()) {
      if (entry.status !== 'rejected' && keys.has(entry.key)) {
        localRef.current.delete(entry.key);
        confirmed.push(entry.key);
      }
    }
    if (confirmed.length) void boxScanQueueDb.bulkDelete(confirmed).catch(() => {});
    recompute();
  }, [serverScans, dispatchId, recompute]);

  // --- The batched, idempotent drain. Returns how many rows remain unconfirmed.
  const flush = useCallback(async (): Promise<FlushResult> => {
    const id = dispatchIdRef.current;
    if (id == null || flushingRef.current) {
      return {
        pendingRemaining: countPending(localRef.current),
        failedRemaining: countActionRequired(localRef.current),
      };
    }

    const batch = [...localRef.current.values()].filter((e) => e.status === 'pending');
    if (batch.length === 0) {
      return { pendingRemaining: 0, failedRemaining: countActionRequired(localRef.current) };
    }

    flushingRef.current = true;
    setIsSyncing(true);
    batch.forEach((e) => {
      e.status = 'syncing';
      e.attempts += 1; // this send counts as an attempt
    });
    recompute(); // reflect 'Syncing…' in the queue immediately

    try {
      const result = await salesDispatchApi.batchScanBoxes(id, {
        barcodes: batch.map((e) => e.barcode),
      });

      // Everything the server now holds — freshly saved or already-present.
      const confirmedKeys = new Set<string>();
      for (const scan of result.saved) {
        if (scan.box_barcode) confirmedKeys.add(boxScanQueueKey(id, scan.box_barcode));
        if (scan.barcode_raw) confirmedKeys.add(boxScanQueueKey(id, scan.barcode_raw));
      }
      const failureByKey = new Map<string, { reason: SalesDispatchBoxScanFailureReason; detail: string }>();
      for (const failure of result.failed) {
        const key = boxScanQueueKey(id, failure.barcode_raw);
        if (CONFIRMED_FAILURE_REASONS.has(failure.reason)) {
          confirmedKeys.add(key);
        } else {
          failureByKey.set(key, { reason: failure.reason, detail: failure.detail });
        }
      }

      const toDelete: string[] = [];
      const toPersist: BoxScanQueueRecord[] = [];
      for (const entry of batch) {
        // The operator may have removed this box from the queue mid-flight.
        if (!localRef.current.has(entry.key)) continue;
        if (confirmedKeys.has(entry.key)) {
          // Durable copy removed, but keep it counted in memory until the refetch
          // lands and the serverScans effect drops it — avoids a counter dip.
          entry.status = 'confirmed';
          toDelete.push(entry.key);
        } else if (failureByKey.has(entry.key)) {
          // Server validation rejection — won't change on retry, surface now.
          const failure = failureByKey.get(entry.key)!;
          entry.status = 'rejected';
          entry.reason = failure.reason;
          entry.detail = failure.detail;
          toPersist.push(toRecord(id, entry));
        } else if (entry.attempts >= MAX_SYNC_ATTEMPTS) {
          // Server didn't acknowledge it after the attempt budget — hand to the operator.
          entry.status = 'failed';
          toPersist.push(toRecord(id, entry));
        } else {
          // Not mentioned by the server yet — leave it to retry next tick.
          entry.status = 'pending';
        }
      }

      if (toDelete.length) void boxScanQueueDb.bulkDelete(toDelete).catch(() => {});
      toPersist.forEach((rec) => void boxScanQueueDb.put(rec).catch(() => {}));

      setIsOffline(false);
      onServerChangedRef.current();
    } catch {
      // Network / server unreachable: nothing is lost. Retry up to the budget,
      // then stop and ask the operator to retry or remove the box.
      const id2 = dispatchIdRef.current;
      batch.forEach((e) => {
        if (e.status !== 'syncing') return;
        if (e.attempts >= MAX_SYNC_ATTEMPTS) {
          e.status = 'failed';
          if (id2 != null) void boxScanQueueDb.put(toRecord(id2, e)).catch(() => {});
        } else {
          e.status = 'pending';
        }
      });
      setIsOffline(true);
    } finally {
      flushingRef.current = false;
      setIsSyncing(false);
      recompute();
    }

    return {
      pendingRemaining: countPending(localRef.current),
      failedRemaining: countActionRequired(localRef.current),
    };
  }, [recompute]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  // --- Open the DB once and rehydrate any rows left from a previous session,
  //     then drain whatever was pending.
  useEffect(() => {
    if (dispatchId == null) return;
    let cancelled = false;
    void (async () => {
      try {
        await boxScanQueueDb.open();
        const records = await boxScanQueueDb.getByDispatch(dispatchId);
        if (cancelled) return;
        for (const record of records) {
          localRef.current.set(record.key, {
            key: record.key,
            barcode: record.barcode,
            // 'rejected'/'failed' stay as-is (need action); anything else retries.
            status:
              record.status === 'rejected' || record.status === 'failed'
                ? record.status
                : 'pending',
            ts: record.ts,
            attempts: 0, // a fresh session gets a fresh retry budget
            reason: record.reason,
            detail: record.detail,
          });
        }
        recompute();
        if (enabled) void flushRef.current();
      } catch {
        /* an unavailable queue DB must not break scanning */
      }
    })();
    const local = localRef.current;
    return () => {
      cancelled = true;
      // Drop in-memory state when switching dispatch; IndexedDB keeps the durable copy.
      local.clear();
    };
  }, [dispatchId, enabled, recompute]);

  // --- Background loop + reconnect trigger.
  useEffect(() => {
    if (!enabled || dispatchId == null) return;
    const interval = window.setInterval(() => void flushRef.current(), SYNC_INTERVAL_MS);
    const onOnline = () => void flushRef.current();
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, [enabled, dispatchId]);

  // --- The hot path. Synchronous; the only I/O is a fire-and-forget DB write.
  const acceptScan = useCallback(
    (rawBarcode: string): ScanOutcome => {
      const id = dispatchIdRef.current;
      if (id == null) return 'empty';
      const barcode = rawBarcode.trim();
      if (!barcode) return 'empty';

      const key = boxScanQueueKey(id, barcode);
      if (serverKeysRef.current.has(key)) return 'duplicate';
      const existing = localRef.current.get(key);
      if (existing && existing.status !== 'rejected') return 'duplicate';

      const entry: LocalEntry = { key, barcode, status: 'pending', ts: Date.now(), attempts: 0 };
      localRef.current.set(key, entry);
      void boxScanQueueDb.put(toRecord(id, entry)).catch(() => {});

      recompute();
      if (countPending(localRef.current) >= AUTO_FLUSH_THRESHOLD && !flushingRef.current) {
        void flushRef.current();
      }
      return 'accepted';
    },
    [recompute],
  );

  const flushNow = useCallback(() => flushRef.current(), []);

  const retryQueued = useCallback(
    (key: string) => {
      const id = dispatchIdRef.current;
      const entry = localRef.current.get(key);
      // Don't touch a box that's already in flight.
      if (id == null || !entry || entry.status === 'syncing') return;
      entry.status = 'pending';
      entry.attempts = 0; // manual retry resets the auto-retry budget
      entry.reason = undefined;
      entry.detail = undefined;
      void boxScanQueueDb.put(toRecord(id, entry)).catch(() => {});
      recompute();
      void flushRef.current();
    },
    [recompute],
  );

  const removeQueued = useCallback(
    (key: string) => {
      const entry = localRef.current.get(key);
      // Don't cancel a box mid-flight; let the in-flight POST resolve first.
      if (!entry || entry.status === 'syncing') return;
      localRef.current.delete(key);
      void boxScanQueueDb.delete(key).catch(() => {});
      recompute();
    },
    [recompute],
  );

  return {
    acceptScan,
    acceptedCount,
    pendingCount,
    failedCount,
    queue,
    isSyncing,
    isOffline,
    flushNow,
    retryQueued,
    removeQueued,
  };
}

function countPending(map: Map<string, LocalEntry>): number {
  let n = 0;
  for (const entry of map.values()) {
    if (entry.status === 'pending' || entry.status === 'syncing') n += 1;
  }
  return n;
}

function countActionRequired(map: Map<string, LocalEntry>): number {
  let n = 0;
  for (const entry of map.values()) {
    if (entry.status === 'rejected' || entry.status === 'failed') n += 1;
  }
  return n;
}

function toRecord(dispatchId: number, entry: LocalEntry): BoxScanQueueRecord {
  // 'syncing'/'confirmed' are never persisted as-is — on reload an unfinished
  // row is simply 'pending'; only the action-required states are preserved.
  const status =
    entry.status === 'rejected' ? 'rejected' : entry.status === 'failed' ? 'failed' : 'pending';
  return {
    key: entry.key,
    dispatchId,
    barcode: entry.barcode,
    ts: entry.ts,
    status,
    reason: entry.reason,
    detail: entry.detail,
  };
}
