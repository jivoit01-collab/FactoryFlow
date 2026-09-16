import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: [] });
const post = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { dockingApprovalApi } from '../../api/dockingApproval.api';

describe('dockingApprovalApi reviews', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
  });

  it('approves without attachments as plain JSON', async () => {
    await dockingApprovalApi.approve(7, { notes: 'ok' });
    expect(post).toHaveBeenCalledWith(
      '/docking-admin/scan-skip-requests/7/approve/',
      { notes: 'ok' },
      undefined,
    );
  });

  it('sends the approver attachments as multipart', async () => {
    // Approving lets goods leave the gate unscanned, so the mail authorising it is
    // filed with the approval itself.
    const mail = new File(['mail'], 'authorisation.pdf', { type: 'application/pdf' });

    await dockingApprovalApi.approve(7, { notes: 'authorised', attachments: [mail] });

    const [url, body, config] = post.mock.calls[0] as [string, FormData, { headers: object }];
    expect(url).toBe('/docking-admin/scan-skip-requests/7/approve/');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('notes')).toBe('authorised');
    expect(body.getAll('attachments')).toHaveLength(1);
    expect(config.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
  });

  it('carries attachments on a rejection too', async () => {
    const slip = new File(['slip'], 'refusal.pdf', { type: 'application/pdf' });

    await dockingApprovalApi.reject(7, { notes: 'scan them', attachments: [slip] });

    const [url, body] = post.mock.calls[0] as [string, FormData];
    expect(url).toBe('/docking-admin/scan-skip-requests/7/reject/');
    expect(body.getAll('attachments')).toHaveLength(1);
  });

  it('never invents an empty file list on the operator create call', async () => {
    // The create endpoint is JSON only -- attachments belong to the REVIEW.
    await dockingApprovalApi.create({ sales_dispatch: 7, reason: 'no barcodes' });
    expect(post).toHaveBeenCalledWith('/docking-admin/scan-skip-requests/', {
      sales_dispatch: 7,
      reason: 'no barcodes',
    });
  });
});
