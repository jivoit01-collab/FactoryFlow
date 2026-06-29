import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: {} });
const post = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { partialScanApprovalApi } from '../../api/partialScanApproval.api';

describe('partialScanApprovalApi', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
  });

  it('lists with a status filter', async () => {
    await partialScanApprovalApi.list({ status: 'PENDING' });
    expect(get.mock.calls[0][0]).toContain('/docking-admin/partial-scan-requests/');
    expect(get.mock.calls[0][0]).toContain('status=PENDING');
  });

  it('fetches the request for a docking', async () => {
    await partialScanApprovalApi.byDispatch(7);
    expect(get).toHaveBeenCalledWith(
      '/docking-admin/partial-scan-requests/by-sales-dispatch/7/',
    );
  });

  it('creates a partial-dispatch request', async () => {
    await partialScanApprovalApi.create({ sales_dispatch: 7, reason: 'short load' });
    expect(post).toHaveBeenCalledWith('/docking-admin/partial-scan-requests/', {
      sales_dispatch: 7,
      reason: 'short load',
    });
  });

  it('approves a request', async () => {
    await partialScanApprovalApi.approve(7, { notes: 'ok' });
    expect(post).toHaveBeenCalledWith('/docking-admin/partial-scan-requests/7/approve/', {
      notes: 'ok',
    });
  });

  it('rejects a request', async () => {
    await partialScanApprovalApi.reject(7, { notes: 'not now' });
    expect(post).toHaveBeenCalledWith('/docking-admin/partial-scan-requests/7/reject/', {
      notes: 'not now',
    });
  });
});
