import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import {
  buildDecisionPayload,
  buildWithdrawPayload,
  listParams,
  sapApprovalsApi,
} from '../api/sap-approvals.api';
import { pendingCountPollMs } from '../api/sap-approvals.queries';

describe('sapApprovalsApi', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockClear();
  });

  it('asks for the next page by offset, and for the first without one', async () => {
    get.mockResolvedValue({ data: { results: [] } });
    const filters = { scope: 'all', status: 'PENDING', object_type: '', date_from: '', date_to: '', search: '' } as never;
    await sapApprovalsApi.list(filters, 200);
    expect(get.mock.calls[0][1].params.offset).toBe(200);
    await sapApprovalsApi.list(filters);
    expect(get.mock.calls[1][1].params).not.toHaveProperty('offset');
  });

  it('lists requests without the filters left blank', async () => {
    get.mockResolvedValue({ data: { results: [] } });
    await sapApprovalsApi.list({
      scope: 'waiting_on_me',
      status: 'PENDING',
      object_type: '',
      search: '  ilahi ',
      date_from: '',
    });
    expect(get).toHaveBeenCalledWith('/sap-approvals/requests/', {
      params: { scope: 'waiting_on_me', status: 'PENDING', search: 'ilahi' },
    });
  });

  it('opens one request, decides and withdraws at its own paths', async () => {
    get.mockResolvedValue({ data: {} });
    await sapApprovalsApi.detail(75424);
    expect(get).toHaveBeenCalledWith('/sap-approvals/requests/75424/');

    await sapApprovalsApi.decide(75424, { approve: true, remarks: '' });
    expect(post).toHaveBeenCalledWith(
      '/sap-approvals/requests/75424/decision/',
      { approve: true, remarks: '' },
      { suppressErrorToast: true },
    );

    await sapApprovalsApi.withdraw(75424);
    expect(post).toHaveBeenLastCalledWith(
      '/sap-approvals/requests/75424/withdraw/',
      {},
      { suppressErrorToast: true },
    );
  });

  it('polls the badge without a toast on failure', async () => {
    get.mockResolvedValue({ data: { total: 3 } });
    expect(await sapApprovalsApi.pendingCount()).toEqual({ total: 3 });
    expect(get).toHaveBeenCalledWith('/sap-approvals/pending-count/', { suppressErrorToast: true });
  });
});

describe('the decision payload', () => {
  it('never carries a password when none was typed', () => {
    for (const sapPassword of [undefined, '']) {
      const payload = buildDecisionPayload({ approve: true, remarks: 'ok', sapPassword });
      expect(payload).not.toHaveProperty('sap_password');
      expect(JSON.stringify(payload)).not.toContain('password');
    }
    expect(buildWithdrawPayload('')).toEqual({});
    expect(buildWithdrawPayload(undefined)).toEqual({});
  });

  it('sends a typed password exactly as typed', () => {
    expect(
      buildDecisionPayload({ approve: false, remarks: ' wrong rate ', sapPassword: ' p w ' }),
    ).toEqual({
      approve: false,
      remarks: 'wrong rate',
      sap_password: ' p w ',
    });
    expect(buildWithdrawPayload('secret')).toEqual({ sap_password: 'secret' });
  });

  it('sends a category with a rejection and never with an approval', () => {
    expect(
      buildDecisionPayload({ approve: false, remarks: 'GL', category: 'FUEL' }),
    ).toEqual({ approve: false, remarks: 'GL', category: 'FUEL' });
    expect(
      buildDecisionPayload({ approve: true, remarks: '', category: 'FUEL' }),
    ).not.toHaveProperty('category');
  });

  it('reads the rejection history with only the filters that are set', async () => {
    get.mockResolvedValue({ data: { results: [] } });
    await sapApprovalsApi.rejections({ date_from: '2026-10-01', date_to: '', originator: ' ' });
    expect(get).toHaveBeenCalledWith('/sap-approvals/rejections/', {
      params: { date_from: '2026-10-01' },
    });
    await sapApprovalsApi.rejections({ all_companies: true });
    expect(get).toHaveBeenLastCalledWith('/sap-approvals/rejections/', {
      params: { all_companies: 'true' },
    });
    await sapApprovalsApi.rejections({ all_companies: false });
    expect(get).toHaveBeenLastCalledWith('/sap-approvals/rejections/', { params: {} });
  });

  it('confirms a duplicate only when asked to', () => {
    expect(buildDecisionPayload({ approve: true, remarks: '' })).not.toHaveProperty(
      'confirm_duplicate',
    );
    expect(
      buildDecisionPayload({ approve: true, remarks: '', confirmDuplicate: true }),
    ).toMatchObject({
      confirm_duplicate: true,
    });
  });

  it('keeps listParams to what was filled in', () => {
    expect(listParams({ scope: 'all', status: 'ALL', limit: 50, date_to: ' ' })).toEqual({
      scope: 'all',
      status: 'ALL',
      limit: 50,
    });
  });
});

describe('the badge poll', () => {
  it('polls often on the page and rarely everywhere else', () => {
    expect(pendingCountPollMs('/sap-approvals')).toBeLessThan(pendingCountPollMs('/dashboard'));
  });
});
