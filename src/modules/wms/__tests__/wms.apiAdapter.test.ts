import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post, patch, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/core/api', () => ({ apiClient: { get, post, patch, delete: del } }));

import { ApiAdapter } from '../storage/apiAdapter';

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
});

describe('ApiAdapter (REST contract)', () => {
  const adapter = new ApiAdapter();

  it('lists from a bare array and from a paginated page', async () => {
    get.mockResolvedValueOnce({ data: [{ id: '1' }, { id: '2' }] });
    expect(await adapter.list('warehouses')).toHaveLength(2);
    expect(get).toHaveBeenCalledWith('/wms/warehouses/');

    get.mockResolvedValueOnce({ data: { results: [{ id: '3' }] } });
    expect(await adapter.list('zones')).toEqual([{ id: '3' }]);
  });

  it('returns null on a 404 get', async () => {
    get.mockRejectedValueOnce({ response: { status: 404 } });
    expect(await adapter.get('warehouses', 'missing')).toBeNull();
    expect(get).toHaveBeenCalledWith('/wms/warehouses/missing/');
  });

  it('creates, bulk-creates, updates and removes against the right endpoints', async () => {
    post.mockResolvedValueOnce({ data: { id: 'x' } });
    await adapter.create('locations', { id: 'x' } as never);
    expect(post).toHaveBeenCalledWith('/wms/locations/', { id: 'x' });

    post.mockResolvedValueOnce({ data: [{ id: 'a' }, { id: 'b' }] });
    const bulk = await adapter.bulkCreate('locations', [{ id: 'a' }, { id: 'b' }] as never);
    expect(post).toHaveBeenLastCalledWith('/wms/locations/bulk/', [{ id: 'a' }, { id: 'b' }]);
    expect(bulk).toHaveLength(2);

    patch.mockResolvedValueOnce({ data: { id: 'x', name: 'new' } });
    await adapter.update('warehouses', 'x', { name: 'new' } as never);
    expect(patch).toHaveBeenCalledWith('/wms/warehouses/x/', { name: 'new' });

    del.mockResolvedValueOnce({});
    await adapter.remove('warehouses', 'x');
    expect(del).toHaveBeenCalledWith('/wms/warehouses/x/');
  });
});
