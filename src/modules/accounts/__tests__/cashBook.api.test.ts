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

  it('sends each column filter as f_<column>, pipe separated', async () => {
    await cashBookApi.entries({
      includeCancelled: true,
      sort: '-amount',
      filters: { branch: ['Oil', 'Common'], approval: ['PENDING'] },
      page: 2,
      pageSize: 100,
    });

    expect(get.mock.calls[0][1]).toEqual({
      params: {
        include_cancelled: 'true',
        sort: '-amount',
        f_branch: 'Oil|Common',
        f_approval: 'PENDING',
        page: 2,
        page_size: 100,
      },
    });
  });

  it('leaves a column out entirely when nothing is ticked', async () => {
    // Nothing ticked means "show everything", not "show nothing" -- sending
    // an empty filter would ask the server to match no values at all.
    await cashBookApi.entries({ filters: { branch: [] } });
    expect(get.mock.calls[0][1]).toEqual({ params: {} });
  });

  it('asks for one column values list at a time', async () => {
    await cashBookApi.columnValues('branch', { approval: ['PENDING'] });
    expect(get.mock.calls[0][0]).toBe('/cash-book/entries/columns/');
    expect(get.mock.calls[0][1]).toEqual({
      params: { column: 'branch', f_approval: 'PENDING' },
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

  it('bundles approved vouchers as one list of entry ids', async () => {
    await cashBookApi.createBunch([4, 5, 6], 'June vouchers');
    expect(post.mock.calls[0][0]).toBe('/cash-book/bunches/');
    expect(post.mock.calls[0][1]).toEqual({ entry_ids: [4, 5, 6], remarks: 'June vouchers' });
  });

  it('decides entries, not bunches -- approval belongs to the entry', async () => {
    await cashBookApi.decideEntries([7, 8], false, 'Bill number missing');
    expect(post.mock.calls[0][0]).toBe('/cash-book/entries/decide/');
    expect(post.mock.calls[0][1]).toEqual({ entry_ids: [7, 8], note: 'Bill number missing' });
    expect(post.mock.calls[0][2]).toEqual({ params: { reject: 'true' } });
  });

  it('fetches a batch as a file, so the request carries the auth header', async () => {
    await cashBookApi.exportBunch(3);
    expect(get.mock.calls[0][0]).toBe('/cash-book/bunches/3/export/');
    expect(get.mock.calls[0][1]).toEqual({ responseType: 'blob' });
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

  it('records that a batch has gone, and that it has not', async () => {
    await cashBookApi.markBunchSent(7);
    expect(post.mock.calls[0][0]).toBe('/cash-book/bunches/7/sent/');
    expect(post.mock.calls[0][1]).toEqual({ sent: true });
  });

  it('takes a voucher back out of a batch', async () => {
    await cashBookApi.removeFromBunch(41);
    expect(del.mock.calls[0][0]).toBe('/cash-book/entries/41/bunch/');
  });
});
