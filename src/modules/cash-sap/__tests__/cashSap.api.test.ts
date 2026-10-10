import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

import { cashSapApi } from '../api/cashSap.api';
import { CASH_SAP_SEND_TIMEOUT_MS } from '../constants/api';

/**
 * Paths and verbs against `factory_app/cash_sap/urls.py` (mounted at
 * `api/v1/cash-sap/`; the client adds `/api/v1`), and the five-minute
 * timeout on the four calls that may reach SAP.
 */
describe('cashSapApi', () => {
  beforeEach(() => {
    for (const fn of [get, post, patch, del]) {
      fn.mockReset();
      fn.mockResolvedValue({ data: {} });
    }
  });

  it('reads the options', async () => {
    await cashSapApi.options();
    expect(get.mock.calls[0][0]).toBe('/cash-sap/options/');
  });

  it('reads the cash book bunches from the cash book', async () => {
    get.mockResolvedValueOnce({ data: [] });
    await cashSapApi.bunches('UNSENT');
    expect(get.mock.calls[0][0]).toBe('/cash-book/bunches/');
    expect(get.mock.calls[0][1]).toEqual({ params: { state: 'UNSENT' }, suppressErrorToast: true });
  });

  it('asks for the badges as comma separated ids, quietly', async () => {
    get.mockResolvedValueOnce({ data: { results: [{ bunch_id: 1 }] } });
    const rows = await cashSapApi.bunchStatuses([1, 2, 3]);
    expect(get.mock.calls[0][0]).toBe('/cash-sap/bunches/');
    expect(get.mock.calls[0][1]).toEqual({ params: { ids: '1,2,3' }, suppressErrorToast: true });
    expect(rows).toEqual([{ bunch_id: 1 }]);
  });

  it('splits more than 200 bunch ids into several requests', async () => {
    get.mockResolvedValue({ data: { results: [] } });
    await cashSapApi.bunchStatuses(Array.from({ length: 450 }, (_, i) => i + 1));
    expect(get).toHaveBeenCalledTimes(3);
    expect(
      (get.mock.calls[0][1] as { params: { ids: string } }).params.ids.split(','),
    ).toHaveLength(200);
  });

  it('makes no request for no bunches', async () => {
    expect(await cashSapApi.bunchStatuses([])).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('reads the plan without the global error toast (it is polled)', async () => {
    await cashSapApi.plan(17);
    expect(get.mock.calls[0][0]).toBe('/cash-sap/bunches/17/');
    expect(get.mock.calls[0][1]).toEqual({ suppressErrorToast: true });
  });

  it('posts the bunch (or one company of it) with the long timeout', async () => {
    await cashSapApi.post(17);
    expect(post.mock.calls[0][0]).toBe('/cash-sap/bunches/17/post/');
    expect(post.mock.calls[0][1]).toEqual({});
    expect(post.mock.calls[0][2]).toMatchObject({ timeout: CASH_SAP_SEND_TIMEOUT_MS });

    await cashSapApi.post(17, 'JIVO_OIL');
    expect(post.mock.calls[1][1]).toEqual({ sap_company_code: 'JIVO_OIL' });
  });

  it('sends the next document with include_failed and the skip list, with the long timeout', async () => {
    await cashSapApi.sendNext(17, { include_failed: true, skip_posting_ids: [4, 9] });
    expect(post.mock.calls[0][0]).toBe('/cash-sap/bunches/17/send-next/');
    expect(post.mock.calls[0][1]).toEqual({ include_failed: true, skip_posting_ids: [4, 9] });
    expect(post.mock.calls[0][2]).toMatchObject({ timeout: 5 * 60 * 1000 });

    await cashSapApi.sendNext(17);
    expect(post.mock.calls[1][1]).toEqual({ include_failed: false, skip_posting_ids: [] });
  });

  it('closes the PO and re-checks SAP with the long timeout', async () => {
    await cashSapApi.closePO(17, 3);
    expect(post.mock.calls[0][0]).toBe('/cash-sap/bunches/17/batches/3/close-po/');
    expect(post.mock.calls[0][2]).toMatchObject({ timeout: CASH_SAP_SEND_TIMEOUT_MS });

    await cashSapApi.recheck(17);
    expect(post.mock.calls[1][0]).toBe('/cash-sap/bunches/17/recheck/');
    expect(post.mock.calls[1][2]).toMatchObject({ timeout: CASH_SAP_SEND_TIMEOUT_MS });
  });

  it('stops, accepts changes and resets', async () => {
    await cashSapApi.stop(17, 'wrong month');
    expect(post.mock.calls[0][0]).toBe('/cash-sap/bunches/17/stop/');
    expect(post.mock.calls[0][1]).toEqual({ reason: 'wrong month' });

    await cashSapApi.acceptChanges(17, 'voucher moved to bunch 18');
    expect(post.mock.calls[1][0]).toBe('/cash-sap/bunches/17/accept-changes/');
    expect(post.mock.calls[1][1]).toEqual({ note: 'voucher moved to bunch 18' });

    await cashSapApi.reset(17);
    expect(del.mock.calls[0][0]).toBe('/cash-sap/bunches/17/');
  });

  it('overrides a voucher, leaves one out and re-dates a GRPO', async () => {
    await cashSapApi.overrideVoucher(17, 501, { treatment: 'SKIP', bill_date: '2026-10-01' });
    expect(patch.mock.calls[0][0]).toBe('/cash-sap/bunches/17/vouchers/501/');
    expect(patch.mock.calls[0][1]).toEqual({ treatment: 'SKIP', bill_date: '2026-10-01' });

    await cashSapApi.leaveOut(17, 501, 'returned to the shop');
    expect(post.mock.calls[0][0]).toBe('/cash-sap/bunches/17/vouchers/501/leave-out/');
    expect(post.mock.calls[0][1]).toEqual({ reason: 'returned to the shop' });

    await cashSapApi.redateGrpo(17, 77, { posting_date: '2026-10-02' });
    expect(patch.mock.calls[1][0]).toBe('/cash-sap/bunches/17/grpos/77/');
    expect(patch.mock.calls[1][1]).toEqual({ posting_date: '2026-10-02' });
  });

  it('reads and writes the bill facts of a voucher', async () => {
    await cashSapApi.voucherInfo(501);
    expect(get.mock.calls[0][0]).toBe('/cash-sap/vouchers/501/info/');
    await cashSapApi.updateVoucherInfo(501, { gate_entry_no: '773' });
    expect(patch.mock.calls[0][0]).toBe('/cash-sap/vouchers/501/info/');
    expect(patch.mock.calls[0][1]).toEqual({ gate_entry_no: '773' });
  });

  it('uploads a bill as multipart "file" and removes one', async () => {
    const file = new File(['x'], 'bill.jpg', { type: 'image/jpeg' });
    await cashSapApi.attachBill(501, file);
    expect(post.mock.calls[0][0]).toBe('/cash-sap/vouchers/501/bills/');
    const form = post.mock.calls[0][1] as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('file')).toBe(file);

    await cashSapApi.removeBill(9);
    expect(del.mock.calls[0][0]).toBe('/cash-sap/bills/9/');
  });

  it('reads and saves the routing', async () => {
    get.mockResolvedValueOnce({ data: [] });
    await cashSapApi.routing();
    expect(get.mock.calls[0][0]).toBe('/cash-sap/routing/');
    await cashSapApi.saveRouting(3, { enabled: false });
    expect(patch.mock.calls[0][0]).toBe('/cash-sap/routing/3/');
    expect(patch.mock.calls[0][1]).toEqual({ enabled: false });
  });

  it('reads, creates, updates and retires G/L map rows', async () => {
    get.mockResolvedValueOnce({ data: [] });
    await cashSapApi.glMap({ sapCompanyCode: 'JIVO_OIL', includeRetired: true });
    expect(get.mock.calls[0][0]).toBe('/cash-sap/gl-map/');
    expect(get.mock.calls[0][1]).toEqual({
      params: { sap_company_code: 'JIVO_OIL', include_retired: 'true' },
    });

    await cashSapApi.createGlMapRow({ sap_company_code: 'JIVO_OIL', gl_account_code: '5630004' });
    expect(post.mock.calls[0][0]).toBe('/cash-sap/gl-map/');

    await cashSapApi.updateGlMapRow(12, { target_account_code: '5630099' });
    expect(patch.mock.calls[0][0]).toBe('/cash-sap/gl-map/12/');

    await cashSapApi.retireGlMapRow(12);
    expect(del.mock.calls[0][0]).toBe('/cash-sap/gl-map/12/');
  });

  it('searches SAP items in one company', async () => {
    get.mockResolvedValueOnce({ data: { results: [{ item_code: 'CG0001' }] } });
    const items = await cashSapApi.items('JIVO_OIL', 'pipe');
    expect(get.mock.calls[0][0]).toBe('/cash-sap/items/');
    expect(get.mock.calls[0][1]).toEqual({
      params: { sap_company_code: 'JIVO_OIL', search: 'pipe' },
    });
    expect(items).toEqual([{ item_code: 'CG0001' }]);
  });
});
