import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: {} });
const post = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { salaryAdvancesApi } from '../api/salaryAdvances.api';

describe('salaryAdvancesApi', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
  });

  it('asks for every advance when nothing is narrowed', async () => {
    await salaryAdvancesApi.list();
    expect(get.mock.calls[0][0]).toBe('/cash-book/salary-advances/');
    expect(get.mock.calls[0][1]).toEqual({ params: {} });
  });

  it('narrows to one state when asked', async () => {
    await salaryAdvancesApi.list({ state: 'NOT_SENT' });
    expect(get.mock.calls[0][1]).toEqual({ params: { state: 'NOT_SENT' } });
  });

  // The server rejects an unknown flag rather than ignoring it, and an
  // `include_cancelled=false` on every read would be a different request from
  // the one the screen means.
  it('sends include_cancelled only when it is asked for', async () => {
    await salaryAdvancesApi.list({ employee: 7 });
    expect(get.mock.calls[0][1]).toEqual({ params: { employee: 7 } });

    await salaryAdvancesApi.list({ employee: 7, include_cancelled: true });
    expect(get.mock.calls[1][1]).toEqual({
      params: { employee: 7, include_cancelled: 'true' },
    });
  });

  it('returns the list body as the server sent it', async () => {
    const body = {
      results: [{ id: null, description: 'Parveen khatun', amount: '1000.00' }],
      summary: { not_sent: { amount: '1000.00', count: 1 } },
      can_record: true,
      can_decide: false,
    };
    get.mockResolvedValueOnce({ data: body });

    await expect(salaryAdvancesApi.list()).resolves.toBe(body);
  });

  it('records an advance against the person who was named', async () => {
    post.mockResolvedValueOnce({ data: { id: 12 } });

    const advance = await salaryAdvancesApi.record({
      employee: 4,
      paid_on: '2026-09-17',
      amount: '1000.00',
      reason: 'Parveen khatun',
      cash_entry: 88,
    });

    expect(post.mock.calls[0][0]).toBe('/cash-book/salary-advances/');
    expect(post.mock.calls[0][1]).toEqual({
      employee: 4,
      paid_on: '2026-09-17',
      amount: '1000.00',
      reason: 'Parveen khatun',
      cash_entry: 88,
    });
    expect(advance.id).toBe(12);
  });

  it('unwraps the results envelope a verdict comes back in', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    post.mockResolvedValueOnce({ data: { results: rows } });

    const decided = await salaryAdvancesApi.decide({
      advance_ids: [1, 2],
      approve: true,
    });

    expect(post.mock.calls[0][0]).toBe('/cash-book/salary-advances/decide/');
    expect(decided).toBe(rows);
  });

  it('asks the payroll for a search only when there is one', async () => {
    get.mockResolvedValue({ data: [] });

    await salaryAdvancesApi.employees();
    expect(get.mock.calls[0][0]).toBe('/cash-book/salary-advances/employees/');
    expect(get.mock.calls[0][1]).toEqual({ params: {} });

    await salaryAdvancesApi.employees('parveen');
    expect(get.mock.calls[1][1]).toEqual({ params: { search: 'parveen' } });
  });
});
