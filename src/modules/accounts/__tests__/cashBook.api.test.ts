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

import { cashBookApi } from '../api/cashBook.api';

describe('cashBookApi', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
    patch.mockClear();
    del.mockClear();
  });

  it('asks for the whole register when nothing is filtered', async () => {
    await cashBookApi.entries();
    expect(get.mock.calls[0][0]).toBe('/cash-book/entries/');
    expect(get.mock.calls[0][1]).toEqual({ params: {} });
  });

  it('translates every screen control into its query parameter', async () => {
    await cashBookApi.entries({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      direction: 'OUT',
      branch: 3,
      glAccountCode: '5630004',
      approvalStatus: 'UNSENT',
      search: 'refreshment',
      includeCancelled: true,
      page: 2,
      pageSize: 100,
    });

    expect(get.mock.calls[0][1]).toEqual({
      params: {
        date_from: '2026-06-01',
        date_to: '2026-06-30',
        direction: 'OUT',
        branch: 3,
        gl_account_code: '5630004',
        approval_status: 'UNSENT',
        search: 'refreshment',
        include_cancelled: 'true',
        page: 2,
        page_size: 100,
      },
    });
  });

  it('leaves a blank G/L search out rather than sending an empty term', async () => {
    await cashBookApi.glAccounts('');
    expect(get.mock.calls[0][0]).toBe('/cash-book/gl-accounts/');
    expect(get.mock.calls[0][1]).toEqual({ params: {} });
  });

  it('records a payment against a branch and a SAP G/L head', async () => {
    await cashBookApi.record({
      entry_date: '2026-06-04',
      direction: 'OUT',
      amount: '6000.00',
      branch: 3,
      gl_account_code: '5630004',
      gl_account_name: 'REFRESHMENT',
      item: 'Refreshment',
      detail: 'Cash paid to Ravi kumar for refreshment exp',
    });

    expect(post.mock.calls[0][0]).toBe('/cash-book/entries/');
    expect(post.mock.calls[0][1]).toMatchObject({
      direction: 'OUT',
      amount: '6000.00',
      gl_account_code: '5630004',
    });
  });

  it('cancels an entry rather than deleting the line', async () => {
    await cashBookApi.cancel(12);
    expect(del.mock.calls[0][0]).toBe('/cash-book/entries/12/');
  });

  it('sends a bunch as one list of entry ids', async () => {
    await cashBookApi.sendForApproval({ entry_ids: [4, 5, 6], remarks: 'June vouchers' });
    expect(post.mock.calls[0][0]).toBe('/cash-book/bunches/');
    expect(post.mock.calls[0][1]).toEqual({ entry_ids: [4, 5, 6], remarks: 'June vouchers' });
  });

  it('carries the reason on a rejection', async () => {
    await cashBookApi.reject(7, 'Bill number missing');
    expect(post.mock.calls[0][0]).toBe('/cash-book/bunches/7/reject/');
    expect(post.mock.calls[0][1]).toEqual({ note: 'Bill number missing' });
  });

  it('asks only for the branches in use unless retired ones are wanted', async () => {
    await cashBookApi.branches();
    expect(get.mock.calls[0][0]).toBe('/cash-book/branches/');
    expect(get.mock.calls[0][1]).toEqual({ params: {} });

    await cashBookApi.branches(true);
    expect(get.mock.calls[1][1]).toEqual({ params: { include_retired: 'true' } });
  });

  it('retires a branch rather than deleting it', async () => {
    await cashBookApi.retireBranch(4);
    expect(del.mock.calls[0][0]).toBe('/cash-book/branches/4/');
  });

  it('renames a branch in place', async () => {
    await cashBookApi.updateBranch(4, { name: 'Beverage' });
    expect(patch.mock.calls[0][0]).toBe('/cash-book/branches/4/');
    expect(patch.mock.calls[0][1]).toEqual({ name: 'Beverage' });
  });

  it('records a receipt against the card it was drawn off', async () => {
    await cashBookApi.record({
      entry_date: '2026-06-04',
      direction: 'IN',
      amount: '50000.00',
      atm_account: 2,
      detail: 'Cash receive by ATM card',
    });
    expect(post.mock.calls[0][1]).toMatchObject({ direction: 'IN', atm_account: 2 });
  });

  it('records a payment against the advance it clears', async () => {
    await cashBookApi.record({
      entry_date: '2026-06-06',
      direction: 'OUT',
      amount: '3400.00',
      branch: 1,
      advance_holder: 7,
      gl_account_code: '5670002',
      detail: 'Unloading charge',
    });
    expect(post.mock.calls[0][1]).toMatchObject({ direction: 'OUT', advance_holder: 7 });
  });

  it('asks only for the cards in use unless closed ones are wanted', async () => {
    await cashBookApi.atmAccounts();
    expect(get.mock.calls[0][0]).toBe('/cash-book/atm/');
    expect(get.mock.calls[0][1]).toEqual({ params: {} });

    await cashBookApi.atmAccounts(true);
    expect(get.mock.calls[1][1]).toEqual({ params: { include_closed: 'true' } });
  });

  it('adds cash onto a named card', async () => {
    await cashBookApi.addAtmCash(2, { received_on: '2026-06-04', amount: '100000.00' });
    expect(post.mock.calls[0][0]).toBe('/cash-book/atm/2/receipts/');
    expect(post.mock.calls[0][1]).toEqual({
      received_on: '2026-06-04',
      amount: '100000.00',
    });
  });

  it('hands an advance over against a person', async () => {
    await cashBookApi.recordAdvance({
      person: 7,
      entry_date: '2026-06-04',
      direction: 'GIVEN',
      amount: '15000.00',
      detail: 'Bunty ji ko deye',
    });
    expect(post.mock.calls[0][0]).toBe('/cash-book/advances/');
    expect(post.mock.calls[0][1]).toMatchObject({ person: 7, direction: 'GIVEN' });
  });

  it('reads one person ledger by their id', async () => {
    await cashBookApi.advanceStatement(7);
    expect(get.mock.calls[0][0]).toBe('/cash-book/advances/holders/7/');
  });

  it('omits remarks on a resend so the bunch keeps the ones it has', async () => {
    await cashBookApi.resend(7);
    expect(post.mock.calls[0][0]).toBe('/cash-book/bunches/7/resend/');
    expect(post.mock.calls[0][1]).toEqual({});
  });
});
