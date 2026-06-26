import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { salesDispatchApi } from '@/modules/gate/api';

import { boxScanQueueDb, boxScanQueueKey } from '../boxScanQueueDb';
import { useBoxScanSync } from '../useBoxScanSync';

// Replace the heavy API barrel with a single stubbed endpoint. vitest hoists this
// vi.mock() above the import statements, so `salesDispatchApi` is the stub.
vi.mock('@/modules/gate/api', () => ({
  salesDispatchApi: { batchScanBoxes: vi.fn() },
}));

const batchMock = vi.mocked(salesDispatchApi.batchScanBoxes);

/** Build a server batch response. `saved`/`failed` are arrays of barcodes. */
function batchResult(
  saved: string[],
  failed: Array<{ barcode: string; reason: string; detail?: string }> = [],
) {
  return {
    saved: saved.map((b, i) => ({
      id: i + 1,
      sales_dispatch: 1,
      box_barcode: b,
      barcode_raw: b,
    })) as never,
    saved_count: saved.length,
    failed: failed.map((f) => ({
      barcode_raw: f.barcode,
      reason: f.reason,
      detail: f.detail ?? '',
    })) as never,
    failed_count: failed.length,
    total: saved.length + failed.length,
  };
}

let nextId = 100;
function freshDispatchId() {
  nextId += 1;
  return nextId;
}

/** Let the async IndexedDB mount effect (open → rehydrate → recompute) settle. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderEngine(dispatchId: number, serverScans: unknown[] = [], enabled = true) {
  const rendered = renderHook(
    (props: { serverScans: unknown[] }) =>
      useBoxScanSync({
        dispatchId,
        serverScans: props.serverScans as never,
        enabled,
        onServerChanged: () => {},
      }),
    { initialProps: { serverScans } },
  );
  await settle();
  return rendered;
}

afterEach(() => {
  batchMock.mockReset();
});

describe('useBoxScanSync — scan lane (instant, in-memory)', () => {
  it('accepts a new box: increments the tally and marks it pending', async () => {
    const { result } = await renderEngine(freshDispatchId());
    let outcome: string | undefined;
    act(() => {
      outcome = result.current.acceptScan('BOX-1');
    });
    expect(outcome).toBe('accepted');
    expect(result.current.acceptedCount).toBe(1);
    expect(result.current.pendingCount).toBe(1);
  });

  it('rejects a duplicate scan without double-counting', async () => {
    const { result } = await renderEngine(freshDispatchId());
    act(() => {
      result.current.acceptScan('BOX-1');
    });
    let outcome: string | undefined;
    act(() => {
      outcome = result.current.acceptScan(' box-1 '); // same box, trimmed + lowercased
    });
    expect(outcome).toBe('duplicate');
    expect(result.current.acceptedCount).toBe(1);
  });

  it('treats a box already saved on the server as a duplicate', async () => {
    const id = freshDispatchId();
    const server = [{ box_barcode: 'SAVED-1', barcode_raw: 'SAVED-1' }];
    const { result } = await renderEngine(id, server);
    let outcome: string | undefined;
    act(() => {
      outcome = result.current.acceptScan('SAVED-1');
    });
    expect(outcome).toBe('duplicate');
    // The server already counts it; nothing queued locally.
    expect(result.current.acceptedCount).toBe(1);
    expect(result.current.pendingCount).toBe(0);
  });

  it('ignores empty scans', async () => {
    const { result } = await renderEngine(freshDispatchId());
    let outcome: string | undefined;
    act(() => {
      outcome = result.current.acceptScan('   ');
    });
    expect(outcome).toBe('empty');
    expect(result.current.acceptedCount).toBe(0);
  });
});

describe('useBoxScanSync — sync lane (background, batched, idempotent)', () => {
  it('flushes queued boxes and confirms them without a counter dip', async () => {
    const id = freshDispatchId();
    batchMock.mockResolvedValueOnce(batchResult(['BOX-1', 'BOX-2']));
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('BOX-1');
      result.current.acceptScan('BOX-2');
    });
    expect(result.current.pendingCount).toBe(2);

    await act(async () => {
      await result.current.flushNow();
    });

    expect(batchMock).toHaveBeenCalledWith(id, { barcodes: ['BOX-1', 'BOX-2'] });
    expect(result.current.acceptedCount).toBe(2); // never dips
    expect(result.current.pendingCount).toBe(0);
    // Durable rows removed once confirmed.
    expect(await boxScanQueueDb.getByDispatch(id)).toHaveLength(0);
  });

  it('treats a DUPLICATE server response as confirmed (idempotent re-send)', async () => {
    // Simulates a network drop *after* the server committed: the retry re-sends
    // the same box and the server replies DUPLICATE — which must not be an error.
    const id = freshDispatchId();
    batchMock.mockResolvedValueOnce(
      batchResult([], [{ barcode: 'BOX-9', reason: 'DUPLICATE', detail: 'already scanned' }]),
    );
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('BOX-9');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    expect(result.current.acceptedCount).toBe(1); // confirmed, still counted
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
    expect(result.current.queue).toHaveLength(0); // left the queue once confirmed
  });

  it('surfaces a genuine rejection and stops counting it', async () => {
    const id = freshDispatchId();
    batchMock.mockResolvedValueOnce(
      batchResult([], [{ barcode: 'BAD', reason: 'UNKNOWN_BARCODE', detail: 'not found' }]),
    );
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('BAD');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    expect(result.current.failedCount).toBe(1);
    const rejectedRow = result.current.queue.find((q) => q.status === 'rejected');
    expect(rejectedRow?.reason).toBe('UNKNOWN_BARCODE');
    expect(rejectedRow?.barcode).toBe('BAD');
    expect(result.current.acceptedCount).toBe(0);
    expect(result.current.pendingCount).toBe(0);
  });

  it('loses nothing on a failed POST — rows stay queued and go offline', async () => {
    const id = freshDispatchId();
    batchMock.mockRejectedValueOnce(new Error('network down'));
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('KEEP-1');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    expect(result.current.isOffline).toBe(true);
    expect(result.current.acceptedCount).toBe(1);
    expect(result.current.pendingCount).toBe(1); // still queued for retry
    expect(await boxScanQueueDb.getByDispatch(id)).toHaveLength(1);

    // Reconnect: a retry now succeeds and clears the queue.
    batchMock.mockResolvedValueOnce(batchResult(['KEEP-1']));
    await act(async () => {
      await result.current.flushNow();
    });
    expect(result.current.isOffline).toBe(false);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.acceptedCount).toBe(1);
  });

  it('gives up after two failed syncs and asks for manual retry/remove', async () => {
    const id = freshDispatchId();
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('DROP-1');
    });

    // Attempt 1 fails → still pending (auto-retry).
    batchMock.mockRejectedValueOnce(new Error('down'));
    await act(async () => {
      await result.current.flushNow();
    });
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.failedCount).toBe(0);

    // Attempt 2 fails → now 'failed', awaiting a manual decision.
    batchMock.mockRejectedValueOnce(new Error('down'));
    await act(async () => {
      await result.current.flushNow();
    });
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.failedCount).toBe(1);
    expect(result.current.queue[0]).toMatchObject({ barcode: 'DROP-1', status: 'failed' });
    // Durably stored as 'failed' so a reload doesn't silently retry it.
    const rows = await boxScanQueueDb.getByDispatch(id);
    expect(rows[0]?.status).toBe('failed');

    // A failed box is no longer auto-sent.
    batchMock.mockClear();
    await act(async () => {
      await result.current.flushNow();
    });
    expect(batchMock).not.toHaveBeenCalled();

    // Manual retry resets the budget; a success then clears it.
    batchMock.mockResolvedValueOnce(batchResult(['DROP-1']));
    act(() => {
      result.current.retryQueued(boxScanQueueKey(id, 'DROP-1'));
    });
    await waitFor(() => expect(result.current.failedCount).toBe(0));
    expect(result.current.acceptedCount).toBe(1);
  });

  it('flushNow reports remaining pending and rejected counts', async () => {
    const id = freshDispatchId();
    batchMock.mockResolvedValueOnce(
      batchResult(['OK'], [{ barcode: 'NOPE', reason: 'NOT_A_BOX' }]),
    );
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('OK');
      result.current.acceptScan('NOPE');
    });

    let report: { pendingRemaining: number; failedRemaining: number } | undefined;
    await act(async () => {
      report = await result.current.flushNow();
    });
    expect(report).toEqual({ pendingRemaining: 0, failedRemaining: 1 });
  });
});

describe('useBoxScanSync — rejected handling', () => {
  it('retryQueued re-queues a rejected box and a subsequent flush confirms it', async () => {
    const id = freshDispatchId();
    batchMock.mockResolvedValueOnce(
      batchResult([], [{ barcode: 'RETRY-1', reason: 'INVALID_STATUS' }]),
    );
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('RETRY-1');
    });
    await act(async () => {
      await result.current.flushNow();
    });
    expect(result.current.failedCount).toBe(1);

    batchMock.mockResolvedValueOnce(batchResult(['RETRY-1']));
    act(() => {
      result.current.retryQueued(boxScanQueueKey(id, 'RETRY-1'));
    });
    await waitFor(() => expect(result.current.failedCount).toBe(0));
    expect(result.current.acceptedCount).toBe(1);
  });

  it('removeQueued drops a rejected box from the queue', async () => {
    const id = freshDispatchId();
    batchMock.mockResolvedValueOnce(
      batchResult([], [{ barcode: 'GONE', reason: 'UNKNOWN_BARCODE' }]),
    );
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('GONE');
    });
    await act(async () => {
      await result.current.flushNow();
    });
    expect(result.current.failedCount).toBe(1);

    act(() => {
      result.current.removeQueued(boxScanQueueKey(id, 'GONE'));
    });
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.acceptedCount).toBe(0);
  });
});

describe('useBoxScanSync — live queue', () => {
  it('lists a freshly scanned box as queued', async () => {
    const id = freshDispatchId();
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('Q-1');
    });
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0]).toMatchObject({ barcode: 'Q-1', status: 'pending' });
  });

  it('flips a box to "syncing" in flight, then drops it once saved', async () => {
    const id = freshDispatchId();
    let resolveBatch!: (value: unknown) => void;
    batchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveBatch = resolve;
      }) as never,
    );
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('FLY-1');
    });
    expect(result.current.queue[0].status).toBe('pending');

    let flushPromise: Promise<unknown> | undefined;
    act(() => {
      flushPromise = result.current.flushNow();
    });
    await waitFor(() => expect(result.current.queue[0]?.status).toBe('syncing'));

    await act(async () => {
      resolveBatch(batchResult(['FLY-1']));
      await flushPromise;
    });
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.acceptedCount).toBe(1);
  });

  it('removeQueued cancels a still-queued (un-synced) box', async () => {
    const id = freshDispatchId();
    const { result } = await renderEngine(id);
    act(() => {
      result.current.acceptScan('CANCEL-1');
    });
    expect(result.current.acceptedCount).toBe(1);

    act(() => {
      result.current.removeQueued(boxScanQueueKey(id, 'CANCEL-1'));
    });
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.acceptedCount).toBe(0);
    expect(await boxScanQueueDb.getByDispatch(id)).toHaveLength(0);
  });
});

describe('useBoxScanSync — durability', () => {
  it('rehydrates queued boxes from IndexedDB after a reload', async () => {
    const id = freshDispatchId();
    // Pre-seed a durable row as if it were written before a reload.
    await boxScanQueueDb.put({
      key: boxScanQueueKey(id, 'PERSISTED-1'),
      dispatchId: id,
      barcode: 'PERSISTED-1',
      ts: 1_700_000_000_000,
      status: 'pending',
    });

    // Mount with sync disabled so the row is loaded but not flushed away.
    const { result } = await renderEngine(id, [], false);
    await waitFor(() => expect(result.current.acceptedCount).toBe(1));
    expect(result.current.pendingCount).toBe(1);
  });
});
