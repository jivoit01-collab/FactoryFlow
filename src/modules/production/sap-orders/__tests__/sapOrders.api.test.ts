import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { sapOrdersApi } from '../api/sapOrders.api';

describe('sapOrdersApi', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockClear();
  });

  it('lists orders without the filters left blank', async () => {
    get.mockResolvedValue({ data: { count: 0, results: [] } });
    await sapOrdersApi.list({ status: '', search: 'oil', limit: 50, offset: 0 });
    expect(get).toHaveBeenCalledWith('/production-execution/sap-orders/', {
      params: { search: 'oil', limit: 50, offset: 0 },
    });
  });

  it('posts every SAP write without the global toast, to its own path', async () => {
    await sapOrdersApi.release(77);
    expect(post).toHaveBeenCalledWith('/production-execution/sap-orders/77/release/', {}, { suppressErrorToast: true });
    await sapOrdersApi.issue(77, { lines: [{ line_num: 0, quantity: '1' }] });
    expect(post).toHaveBeenLastCalledWith(
      '/production-execution/sap-orders/77/issue/',
      { lines: [{ line_num: 0, quantity: '1' }] },
      { suppressErrorToast: true },
    );
    await sapOrdersApi.receipt(77, { quantity: '5' });
    expect(post).toHaveBeenLastCalledWith('/production-execution/sap-orders/77/receipt/', { quantity: '5' }, { suppressErrorToast: true });
  });

  it('reads batches from the shared SAP lookups', async () => {
    get.mockResolvedValue({ data: [{ batch_number: 'B1', quantity: '12.5', expiry_date: null }] });
    const batches = await sapOrdersApi.batches('RM-OIL', 'BH-RM');
    expect(get).toHaveBeenCalledWith('/sap-lookups/batches/', { params: { item_code: 'RM-OIL', warehouse: 'BH-RM' } });
    expect(batches).toEqual([{ batch_number: 'B1', quantity: 12.5, expiry_date: null }]);
  });
});
