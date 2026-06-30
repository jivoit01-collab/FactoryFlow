import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '@/shared/utils';

export interface FailedScan {
  barcode: string;
  reason: string;
}

export interface UseBoxScanQueueOptions {
  /**
   * Send one barcode to the server. Resolve with `{ duplicate: true }` if the
   * box was already recorded, or throw to push it onto the failed-scan queue.
   */
  scanOne: (barcode: string) => Promise<{ duplicate?: boolean } | void>;
  /** Local dedupe — return true if this barcode is already on the list. */
  isAlreadyScanned?: (barcode: string) => boolean;
  /** Called once after the queue fully drains (e.g. to refetch the entry). */
  onDrained?: () => void | Promise<void>;
  /** Called when a scan resolved as a duplicate. */
  onDuplicate?: (barcode: string) => void;
  /** Called when a scan was rejected locally as already-in-list. */
  onAlreadyInList?: (barcode: string) => void;
  /** Green success-flash duration in ms. Default 350. */
  flashMs?: number;
}

export interface UseBoxScanQueueResult {
  /** Accept a barcode instantly: validate, dedupe, enqueue, drain in background. */
  enqueue: (barcode: string) => void;
  /** Number of scans still waiting to sync (drives a "Syncing N" indicator). */
  pendingCount: number;
  /** True briefly after a successful scan (drives the green blink). */
  flashing: boolean;
  /** Scans that failed to sync, newest first, deduped by barcode. */
  failedScans: FailedScan[];
  retryFailed: (barcode: string) => void;
  dismissFailed: (barcode: string) => void;
}

/**
 * Non-blocking box-scan queue shared by the sales-dispatch and BST scan flows.
 *
 * `enqueue` returns immediately so the input field and camera never lock up; a
 * single reentrancy-guarded background worker drains the queue one scan at a
 * time, flashing on success and parking failures in `failedScans` for retry.
 * The queue is document-agnostic — callers wire the open bill/transfer into
 * `scanOne` via closure.
 */
export function useBoxScanQueue(options: UseBoxScanQueueOptions): UseBoxScanQueueResult {
  const { flashMs = 350 } = options;

  const [pendingCount, setPendingCount] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const [failedScans, setFailedScans] = useState<FailedScan[]>([]);

  const queueRef = useRef<string[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());
  const processingRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest callbacks, read by the worker so it never closes over stale values.
  const ctxRef = useRef(options);
  ctxRef.current = options;

  const triggerFlash = useCallback(() => {
    setFlashing(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashing(false), flashMs);
  }, [flashMs]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    [],
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    let didProcess = false;

    while (queueRef.current.length > 0) {
      const barcode = queueRef.current[0];
      const key = barcode.toLowerCase();
      try {
        const result = await ctxRef.current.scanOne(barcode);
        if (result && result.duplicate) {
          ctxRef.current.onDuplicate?.(barcode);
        } else {
          triggerFlash();
        }
        // Synced — drop it from the error queue if a prior try left it there.
        setFailedScans((prev) => prev.filter((f) => f.barcode.toLowerCase() !== key));
      } catch (scanError) {
        const reason = getErrorMessage(scanError, `Couldn't scan ${barcode}`);
        setFailedScans((prev) => [
          { barcode, reason },
          ...prev.filter((f) => f.barcode.toLowerCase() !== key),
        ]);
      } finally {
        queueRef.current.shift();
        inFlightRef.current.delete(key);
        setPendingCount(queueRef.current.length);
        didProcess = true;
      }
    }

    processingRef.current = false;
    if (didProcess) await ctxRef.current.onDrained?.();
    if (queueRef.current.length > 0) void processQueue();
  }, [triggerFlash]);

  const enqueue = useCallback(
    (rawBarcode: string) => {
      const barcode = rawBarcode.trim();
      if (!barcode) return;
      const key = barcode.toLowerCase();
      if (inFlightRef.current.has(key) || ctxRef.current.isAlreadyScanned?.(barcode)) {
        ctxRef.current.onAlreadyInList?.(barcode);
        return;
      }
      inFlightRef.current.add(key);
      queueRef.current.push(barcode);
      setPendingCount(queueRef.current.length);
      void processQueue();
    },
    [processQueue],
  );

  const retryFailed = useCallback(
    (barcode: string) => {
      setFailedScans((prev) => prev.filter((f) => f.barcode.toLowerCase() !== barcode.toLowerCase()));
      enqueue(barcode);
    },
    [enqueue],
  );

  const dismissFailed = useCallback((barcode: string) => {
    setFailedScans((prev) => prev.filter((f) => f.barcode.toLowerCase() !== barcode.toLowerCase()));
  }, []);

  return { enqueue, pendingCount, flashing, failedScans, retryFailed, dismissFailed };
}
