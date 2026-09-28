import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: {} });
const post = vi.fn().mockResolvedValue({ data: {} });
const patch = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
  },
}));

import { creditNoteApprovalApi } from '../api/creditNoteApproval.api';

describe('credit-note extras from SAP Portal', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
    patch.mockClear();
  });

  it('reads one request’s actions quietly, beside its status route', async () => {
    await creditNoteApprovalApi.actions(75424);
    expect(get).toHaveBeenCalledWith('/warehouse/credit-note-approvals/75424/actions/', {
      suppressErrorToast: true,
    });
  });

  it('withdraws with an empty body — the server signs with the stored password', async () => {
    await creditNoteApprovalApi.withdraw(75424);
    expect(post).toHaveBeenCalledWith('/warehouse/credit-note-approvals/75424/withdraw/', {});
  });

  it('sends a typed password with a withdraw, and nothing when none was typed', async () => {
    await creditNoteApprovalApi.withdraw(75424, 's3cret');
    expect(post).toHaveBeenLastCalledWith('/warehouse/credit-note-approvals/75424/withdraw/', {
      sap_password: 's3cret',
    });
    await creditNoteApprovalApi.withdraw(75424, '');
    expect(post).toHaveBeenLastCalledWith('/warehouse/credit-note-approvals/75424/withdraw/', {});
  });

  it('searches SAP with only the filters that are set, a page at a time', async () => {
    get.mockResolvedValueOnce({ data: [] });
    await creditNoteApprovalApi.list('APPROVED', 'AR', { party: ' ilahi ', doc_num: '', date_from: '2026-09-01' }, 100);
    expect(get).toHaveBeenCalledWith('/warehouse/credit-note-approvals/', {
      params: { status: 'APPROVED', family: 'AR', limit: 100, offset: 100, party: 'ilahi', date_from: '2026-09-01' },
    });
  });

  it('lists and downloads attachments through the queue, quietly', async () => {
    get.mockResolvedValueOnce({ data: { sources: [] } });
    await creditNoteApprovalApi.attachments(75424);
    expect(get).toHaveBeenLastCalledWith('/warehouse/credit-note-approvals/75424/attachments/', {
      suppressErrorToast: true,
    });
    await creditNoteApprovalApi.downloadAttachment(75424, 9002, 1);
    expect(get).toHaveBeenLastCalledWith('/warehouse/credit-note-approvals/75424/attachments/9002/1/download/', {
      responseType: 'blob',
      suppressErrorToast: true,
    });
  });

  it('sends Without Qty Posting only when chosen', async () => {
    await creditNoteApprovalApi.decide(75424, { status: 'APPROVED' });
    expect(patch).toHaveBeenLastCalledWith('/warehouse/credit-note-approvals/75424/status/', {
      status: 'APPROVED',
    });
    await creditNoteApprovalApi.decide(75424, { status: 'APPROVED', without_qty_posting: true });
    expect(patch).toHaveBeenLastCalledWith('/warehouse/credit-note-approvals/75424/status/', {
      status: 'APPROVED',
      without_qty_posting: true,
    });
  });
});
