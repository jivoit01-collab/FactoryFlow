import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post, patch, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/core/api', () => ({ apiClient: { get, post, patch, delete: del } }));

import { ApiAdapter, runWithConcurrency, WRITE_CONCURRENCY } from '../storage/apiAdapter';

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
});

const notFound = { response: { status: 404 } };

describe('ApiAdapter.remove — idempotent delete', () => {
  const adapter = new ApiAdapter();

  it('deletes a record at the right endpoint', async () => {
    del.mockResolvedValueOnce({});
    await adapter.remove('locations', 'L1');
    expect(del).toHaveBeenCalledWith('/wms/locations/L1/');
  });

  it('treats a 404 as success — the record is already gone', async () => {
    del.mockRejectedValueOnce(notFound);
    await expect(adapter.remove('locations', 'gone')).resolves.toBeUndefined();
  });

  it('still surfaces real failures (e.g. 500)', async () => {
    del.mockRejectedValueOnce({ response: { status: 500 } });
    await expect(adapter.remove('locations', 'boom')).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it('a half-finished cascade can be retried: already-deleted records no longer throw', async () => {
    // First pass deleted L1; L2 failed. Retry: L1 → 404, L2 → ok.
    del.mockRejectedValueOnce(notFound).mockResolvedValueOnce({});
    await expect(
      runWithConcurrency([() => adapter.remove('locations', 'L1'), () => adapter.remove('locations', 'L2')]),
    ).resolves.toHaveLength(2);
  });
});

describe('runWithConcurrency', () => {
  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const tasks = Array.from({ length: 50 }, () => async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return 1;
    });
    await runWithConcurrency(tasks, 5);
    expect(peak).toBeLessThanOrEqual(5);
  });

  it('preserves result order regardless of completion order', async () => {
    const tasks = [
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        return 'slow';
      },
      async () => 'fast',
    ];
    expect(await runWithConcurrency(tasks, 2)).toEqual(['slow', 'fast']);
  });

  it('rejects when a task fails', async () => {
    const tasks = [async () => 1, async () => Promise.reject(new Error('nope'))];
    await expect(runWithConcurrency(tasks, 2)).rejects.toThrow('nope');
  });

  it('handles an empty task list', async () => {
    expect(await runWithConcurrency([], WRITE_CONCURRENCY)).toEqual([]);
  });
});
