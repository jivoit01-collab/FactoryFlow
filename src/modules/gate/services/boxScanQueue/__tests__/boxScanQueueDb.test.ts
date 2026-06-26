import 'fake-indexeddb/auto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  boxScanQueueDb,
  boxScanQueueKey,
  type BoxScanQueueRecord,
} from '../boxScanQueueDb';

function record(dispatchId: number, barcode: string): BoxScanQueueRecord {
  return {
    key: boxScanQueueKey(dispatchId, barcode),
    dispatchId,
    barcode,
    ts: 1_700_000_000_000,
    status: 'pending',
  };
}

describe('boxScanQueueKey', () => {
  it('is case-insensitive and trims whitespace', () => {
    expect(boxScanQueueKey(7, '  Box-AB12 ')).toBe('7:box-ab12');
    expect(boxScanQueueKey(7, 'BOX-AB12')).toBe(boxScanQueueKey(7, 'box-ab12'));
  });

  it('scopes the key by dispatch id', () => {
    expect(boxScanQueueKey(1, 'b')).not.toBe(boxScanQueueKey(2, 'b'));
  });
});

describe('boxScanQueueDb', () => {
  beforeAll(async () => {
    await boxScanQueueDb.open();
  });

  it('persists and reads back a row by dispatch', async () => {
    const id = 1001;
    await boxScanQueueDb.put(record(id, 'BOX-1'));
    const rows = await boxScanQueueDb.getByDispatch(id);
    expect(rows).toHaveLength(1);
    expect(rows[0].barcode).toBe('BOX-1');
    expect(rows[0].status).toBe('pending');
  });

  it('dedupes locally — the same box can never be stored twice', async () => {
    const id = 1002;
    await boxScanQueueDb.put(record(id, 'DUP'));
    await boxScanQueueDb.put(record(id, ' dup ')); // same key (trim + lowercase)
    const rows = await boxScanQueueDb.getByDispatch(id);
    expect(rows).toHaveLength(1);
  });

  it('isolates rows across dispatches (two trucks at once)', async () => {
    await boxScanQueueDb.put(record(2001, 'A'));
    await boxScanQueueDb.put(record(2002, 'B'));
    expect(await boxScanQueueDb.getByDispatch(2001)).toHaveLength(1);
    expect(await boxScanQueueDb.getByDispatch(2002)).toHaveLength(1);
  });

  it('deletes a single row', async () => {
    const id = 3001;
    const row = record(id, 'X');
    await boxScanQueueDb.put(row);
    await boxScanQueueDb.delete(row.key);
    expect(await boxScanQueueDb.getByDispatch(id)).toHaveLength(0);
  });

  it('bulk-deletes many rows', async () => {
    const id = 4001;
    const rows = ['A', 'B', 'C'].map((b) => record(id, b));
    await Promise.all(rows.map((r) => boxScanQueueDb.put(r)));
    await boxScanQueueDb.bulkDelete(rows.map((r) => r.key));
    expect(await boxScanQueueDb.getByDispatch(id)).toHaveLength(0);
  });

  it('survives a simulated reload (data is durable, read after re-open)', async () => {
    const id = 5001;
    await boxScanQueueDb.put(record(id, 'PERSISTED'));
    // A fresh open() call must see the previously written row.
    await boxScanQueueDb.open();
    const rows = await boxScanQueueDb.getByDispatch(id);
    expect(rows.map((r) => r.barcode)).toContain('PERSISTED');
  });
});
