import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: {} });
const post = vi.fn().mockResolvedValue({ data: {} });
const patch = vi.fn().mockResolvedValue({ data: {} });
const del = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

import { salaryAdvancesApi } from '../api/salaryAdvances.api';

describe('salaryAdvancesApi', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
    patch.mockClear();
    del.mockClear();
  });

  it('asks for every advance when no tab is chosen', async () => {
    await salaryAdvancesApi.list();
    expect(get.mock.calls[0][0]).toBe('/cash-book/salary-advances/');
    expect(get.mock.calls[0][1]).toEqual({ params: {} });
  });

  it('narrows to one state for a tab', async () => {
    await salaryAdvancesApi.list({ state: 'PENDING' });
    expect(get.mock.calls[0][1]).toEqual({ params: { state: 'PENDING' } });
  });

  it('sends include_cancelled only when it is asked for', async () => {
    await salaryAdvancesApi.list({ employee: 7, include_cancelled: true });
    expect(get.mock.calls[0][1]).toEqual({
      params: { employee: 7, include_cancelled: 'true' },
    });
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

  it('carries the reason when HR reject', async () => {
    post.mockResolvedValueOnce({ data: { results: [] } });
    await salaryAdvancesApi.decide({
      advance_ids: [3],
      approve: false,
      note: 'Recovering it in cash instead',
    });
    expect(post.mock.calls[0][1]).toEqual({
      advance_ids: [3],
      approve: false,
      note: 'Recovering it in cash instead',
    });
  });

  it('posts an empty body when the deduction day is left to the server', async () => {
    await salaryAdvancesApi.markDeducted(9);
    expect(post.mock.calls[0][0]).toBe('/cash-book/salary-advances/9/deducted/');
    expect(post.mock.calls[0][1]).toEqual({});
  });

  it('sends the day when one is named', async () => {
    await salaryAdvancesApi.markDeducted(9, '2026-10-31');
    expect(post.mock.calls[0][1]).toEqual({ deducted_on: '2026-10-31' });
  });

  it('undoes a deduction on the same address it was recorded at', async () => {
    await salaryAdvancesApi.undoDeduction(9);
    expect(del.mock.calls[0][0]).toBe('/cash-book/salary-advances/9/deducted/');
  });

  it('asks the payroll picker for nothing until it is typed into', async () => {
    await salaryAdvancesApi.employees();
    expect(get.mock.calls[0][0]).toBe('/cash-book/salary-advances/employees/');
    expect(get.mock.calls[0][1]).toEqual({ params: {} });

    await salaryAdvancesApi.employees('parveen');
    expect(get.mock.calls[1][1]).toEqual({ params: { search: 'parveen' } });
  });
});
