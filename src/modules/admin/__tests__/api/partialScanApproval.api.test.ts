import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: [] });
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

  it("fetches the whole truck's requests for a docking", async () => {
    // One request per short bill, from any docking on the truck — the operator standing on
    // the fully scanned half has to see the ones raised for its neighbour's bills.
    get.mockResolvedValueOnce({
      data: [
        { id: 1, status: 'PENDING', sap_doc_num: '626090324' },
        { id: 2, status: 'PENDING', sap_doc_num: '626090325' },
      ],
    });
    const requests = await partialScanApprovalApi.byDispatch(7);
    expect(get).toHaveBeenCalledWith('/docking-admin/partial-scan-requests/by-sales-dispatch/7/');
    expect(requests.map((request) => request.sap_doc_num)).toEqual(['626090324', '626090325']);
  });

  it('reads a docking with no requests as an empty list, never null', async () => {
    get.mockResolvedValueOnce({ data: null });
    expect(await partialScanApprovalApi.byDispatch(7)).toEqual([]);
  });

  it('creates one request per short bill and returns them all', async () => {
    post.mockResolvedValueOnce({
      data: [
        { id: 1, status: 'PENDING', sap_doc_num: '626090324' },
        { id: 2, status: 'PENDING', sap_doc_num: '626090325' },
      ],
    });
    const raised = await partialScanApprovalApi.create({
      sales_dispatch: 7,
      reason: 'short load',
    });
    expect(post).toHaveBeenCalledWith('/docking-admin/partial-scan-requests/', {
      sales_dispatch: 7,
      reason: 'short load',
    });
    expect(raised).toHaveLength(2);
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
