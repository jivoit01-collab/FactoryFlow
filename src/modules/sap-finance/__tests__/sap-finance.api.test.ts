import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn().mockResolvedValue({ data: {} });
const put = vi.fn().mockResolvedValue({ data: {} });
const del = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    put: (...args: unknown[]) => put(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

import { sapFinanceApi } from '../api/sap-finance.api';

describe('sapFinanceApi', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockClear();
    put.mockClear();
    del.mockClear();
  });

  it('asks for journal entries without the filters left blank', async () => {
    get.mockResolvedValue({ data: { results: [{ trans_id: 1 }], count: 1 } });
    const rows = await sapFinanceApi.journalEntries({ reference: 'INV', number: '', date_from: '', limit: 20 });
    expect(get).toHaveBeenCalledWith('/sap-finance/journal-entries/', { params: { reference: 'INV', limit: 20 } });
    expect(rows).toEqual([{ trans_id: 1 }]);
  });

  it('reads one ledger by account', async () => {
    get.mockResolvedValue({ data: { account: '1101001', lines: [] } });
    await sapFinanceApi.generalLedger({ account: '1101001', date_to: '2026-06-30' });
    expect(get).toHaveBeenCalledWith('/sap-finance/general-ledger/', {
      params: { account: '1101001', date_to: '2026-06-30' },
    });
  });

  it('creates, replaces and deletes budgets at their own paths', async () => {
    const payload = { budget: 'B1', sub_budget: '', lines: [] };
    await sapFinanceApi.createBudget(payload);
    expect(post).toHaveBeenCalledWith('/sap-finance/budgets/', payload);
    await sapFinanceApi.updateBudget(12, payload);
    expect(put).toHaveBeenCalledWith('/sap-finance/budgets/12/', payload);
    await sapFinanceApi.deleteBudget(12);
    expect(del).toHaveBeenCalledWith('/sap-finance/budgets/12/');
  });

  it('reads budget heads from the shared SAP lookups', async () => {
    get.mockResolvedValue({ data: [] });
    await sapFinanceApi.costingCodes(3);
    expect(get).toHaveBeenCalledWith('/sap-lookups/costing-codes/', { params: { dimension: 3, limit: 500 } });
  });
});
