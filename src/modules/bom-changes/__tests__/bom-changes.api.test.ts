import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn().mockResolvedValue({ data: { id: 7 } });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { bomChangesApi, SAP_PUSH_TIMEOUT_MS } from '../api/bom-changes.api';

const PAYLOAD = {
  kind: 'CREATE' as const,
  item_code: 'FG1',
  item_name: 'Parent',
  quantity: '1',
  bom_type: 'Production' as const,
  warehouse: '',
  distribution_rule: '',
  project: '',
  lines: [],
};

describe('bomChangesApi', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockClear();
  });

  it('lists requests without the filters left blank', async () => {
    get.mockResolvedValue({ data: { results: [], count: 0, counts: {}, levels: 3 } });
    await bomChangesApi.requests({
      status: 'PENDING,L1_APPROVED',
      search: '',
      mine: false,
      actionable: true,
    });
    expect(get).toHaveBeenCalledWith('/bom-changes/requests/', {
      params: { status: 'PENDING,L1_APPROVED', actionable: true },
    });
  });

  it('reads SAP BOMs from its own viewer endpoints, never the warehouse ones', async () => {
    get.mockResolvedValue({ data: [] });
    await bomChangesApi.sapBoms('canola');
    expect(get).toHaveBeenCalledWith('/bom-changes/sap-boms/', {
      params: { search: 'canola', limit: 100 },
    });
    await bomChangesApi.sapBom('FG/01 A');
    expect(get).toHaveBeenLastCalledWith('/bom-changes/sap-boms/FG%2F01%20A/');
  });

  it('raises a request, and pushes directly with a long timeout', async () => {
    await bomChangesApi.create(PAYLOAD);
    expect(post).toHaveBeenCalledWith('/bom-changes/requests/', PAYLOAD);
    await bomChangesApi.directPush(PAYLOAD);
    expect(post).toHaveBeenLastCalledWith('/bom-changes/requests/direct-push/', PAYLOAD, {
      timeout: SAP_PUSH_TIMEOUT_MS,
    });
  });

  it('approves with the long timeout (the last approval writes SAP); rejects and cancels by id', async () => {
    await bomChangesApi.approve(7, 'ok');
    expect(post).toHaveBeenLastCalledWith(
      '/bom-changes/requests/7/approve/',
      { remarks: 'ok' },
      {
        timeout: SAP_PUSH_TIMEOUT_MS,
      },
    );
    await bomChangesApi.reject(7, 'no');
    expect(post).toHaveBeenLastCalledWith('/bom-changes/requests/7/reject/', { remarks: 'no' });
    await bomChangesApi.cancel(7);
    expect(post).toHaveBeenLastCalledWith('/bom-changes/requests/7/cancel/');
  });

  it('takes its pickers from the shared SAP lookups', async () => {
    get.mockResolvedValue({ data: [] });
    await bomChangesApi.items('rm');
    expect(get).toHaveBeenLastCalledWith('/sap-lookups/items/', {
      params: { search: 'rm', limit: 30 },
    });
    await bomChangesApi.resources('fill');
    expect(get).toHaveBeenLastCalledWith('/sap-lookups/resources/', {
      params: { search: 'fill', limit: 30 },
    });
    await bomChangesApi.warehouses();
    expect(get).toHaveBeenLastCalledWith('/sap-lookups/warehouses/');
  });
});
