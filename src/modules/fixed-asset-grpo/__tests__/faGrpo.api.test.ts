// ═══════════════════════════════════════════════════════════════
// Fixed Asset GRPO API
// ═══════════════════════════════════════════════════════════════
// Every call goes to the new backend app (api/v1/fixed-asset-grpo/,
// relative to the client's /api/v1 base), with the verb, params and body
// fixed_asset_grpo/urls.py + views.py expect. The post is multipart with a
// five-minute timeout, and a 202 is read as "waiting for SAP".
// ═══════════════════════════════════════════════════════════════

import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
const del = vi.fn();

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    put: (...args: unknown[]) => put(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

import { faGrpoApi, normalizePage } from '../api/faGrpo.api';
import { FA_GRPO_POST_TIMEOUT_MS } from '../constants/api';

const page = (results: unknown[] = []) => ({
  results,
  count: results.length,
  page: 1,
  page_size: 25,
  total_pages: 1,
  next: null,
  previous: null,
});

describe('faGrpoApi — lists', () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: page() });
    post.mockReset().mockResolvedValue({ status: 201, data: {} });
    put.mockReset().mockResolvedValue({ data: {} });
    del.mockReset().mockResolvedValue({ status: 204, data: undefined });
  });

  it('reads the summary', async () => {
    await faGrpoApi.getSummary();
    expect(get).toHaveBeenCalledWith('/fixed-asset-grpo/summary/');
  });

  it('reads Needs PO with its params', async () => {
    await faGrpoApi.getNeedsPO({ year: 2026, month: 10, search: 'abc', page: 2, page_size: 50 });
    expect(get).toHaveBeenCalledWith('/fixed-asset-grpo/needs-po/', {
      params: { year: 2026, month: 10, search: 'abc', page: 2, page_size: 50 },
    });
  });

  it('reads Ready to post from pending/', async () => {
    await faGrpoApi.getPendingEntries();
    expect(get.mock.calls[0][0]).toBe('/fixed-asset-grpo/pending/');
  });

  it('normalises a bare-array pending answer to a page', async () => {
    get.mockResolvedValueOnce({ data: [{ vehicle_entry_id: 1 }, { vehicle_entry_id: 2 }] });
    const result = await faGrpoApi.getPendingEntries({ page: 1, page_size: 25 });
    expect(result.results).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(result.total_pages).toBe(1);
  });

  it('asks all-entries for closed entries and keeps the server counts', async () => {
    get.mockResolvedValueOnce({ data: { ...page([]), counts: { ALL: 4, CLOSED: 1 } } });
    const result = await faGrpoApi.getAllEntries({ state: 'CLOSED', include_closed: 1 });
    expect(get).toHaveBeenCalledWith('/fixed-asset-grpo/all-entries/', {
      params: { state: 'CLOSED', include_closed: 1 },
    });
    expect(result.counts).toEqual({ ALL: 4, CLOSED: 1 });
  });

  it('reads history with the simulated filter', async () => {
    await faGrpoApi.getHistory({ simulated: 'true', status: 'POSTED' });
    expect(get).toHaveBeenCalledWith('/fixed-asset-grpo/history/', {
      params: { simulated: 'true', status: 'POSTED' },
    });
  });

  it('reads one posting, its print, and discards a simulated one', async () => {
    get.mockResolvedValue({ data: {} });
    await faGrpoApi.getDetail(7);
    await faGrpoApi.getPrint(7);
    await faGrpoApi.discardSimulated(7);
    expect(get.mock.calls[0][0]).toBe('/fixed-asset-grpo/history/7/');
    expect(get.mock.calls[1][0]).toBe('/fixed-asset-grpo/history/7/print/');
    expect(post.mock.calls[0][0]).toBe('/fixed-asset-grpo/history/7/discard-simulated/');
  });
});

describe('faGrpoApi — one entry', () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: {} });
    post.mockReset().mockResolvedValue({ status: 201, data: {} });
    put.mockReset().mockResolvedValue({ data: {} });
    del.mockReset().mockResolvedValue({ status: 204, data: undefined });
  });

  it('reads the entry detail', async () => {
    await faGrpoApi.getEntry(42);
    expect(get).toHaveBeenCalledWith('/fixed-asset-grpo/entries/42/');
  });

  it('asks open POs of a supplier for that entry', async () => {
    await faGrpoApi.getOpenFAPOs(42, 'VENDA001768');
    expect(get).toHaveBeenCalledWith('/fixed-asset-grpo/entries/42/open-pos/', {
      params: { supplier_code: 'VENDA001768' },
    });
  });

  it('links, changes and unlinks the PO', async () => {
    const body = {
      po_number: '221026008',
      supplier_code: 'VENDA001768',
      supplier_name: 'Vendor',
      invoice_no: 'ABD/26-27/814',
      items: [
        { line_num: 0, po_item_code: 'CG0000073', item_name: 'Tank', received_qty: 1, uom: 'NOS' },
      ],
    };
    await faGrpoApi.linkPO(42, body);
    await faGrpoApi.updatePOLink(42, 9, body);
    await faGrpoApi.unlinkPO(42, 9);
    expect(post).toHaveBeenCalledWith('/fixed-asset-grpo/entries/42/po-receipts/', body);
    expect(put).toHaveBeenCalledWith('/fixed-asset-grpo/entries/42/po-receipts/9/', body);
    expect(del).toHaveBeenCalledWith('/fixed-asset-grpo/entries/42/po-receipts/9/');
  });

  it('reads the preview, narrowed to PO receipts when asked', async () => {
    get.mockResolvedValue({ data: [] });
    await faGrpoApi.getPreview(42);
    await faGrpoApi.getPreview(42, [3, 4]);
    expect(get.mock.calls[0]).toEqual(['/fixed-asset-grpo/entries/42/preview/', undefined]);
    expect(get.mock.calls[1]).toEqual([
      '/fixed-asset-grpo/entries/42/preview/',
      { params: { po_receipt_ids: '3,4' } },
    ]);
  });

  it('closes (POST) and reopens (DELETE) the entry', async () => {
    await faGrpoApi.closeEntry(42, { sap_doc_num: '2026012345', note: '' });
    await faGrpoApi.reopenEntry(42);
    expect(post).toHaveBeenCalledWith('/fixed-asset-grpo/entries/42/close/', {
      sap_doc_num: '2026012345',
      note: '',
    });
    expect(del).toHaveBeenCalledWith('/fixed-asset-grpo/entries/42/close/');
  });

  it('discards an unsent draft', async () => {
    await faGrpoApi.discardDraft(11);
    expect(del).toHaveBeenCalledWith('/fixed-asset-grpo/drafts/11/');
  });
});

describe('faGrpoApi.post', () => {
  const request = {
    vehicle_entry_id: 42,
    po_receipt_ids: [9],
    items: [{ po_item_receipt_id: 5, accepted_qty: 1 }],
    branch_id: 2,
    doc_date: '2026-10-09',
    grpo_posting_id: 77,
  };

  beforeEach(() => {
    post.mockReset();
  });

  it('is multipart: JSON in "data" (with grpo_posting_id) and files in "attachments"', async () => {
    post.mockResolvedValue({ status: 201, data: { success: true, grpo_posting_id: 77 } });
    const file = new File(['x'], 'invoice.pdf', { type: 'application/pdf' });

    await faGrpoApi.post({ ...request, attachments: [file] });

    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('/fixed-asset-grpo/post/');
    expect(body).toBeInstanceOf(FormData);
    const data = JSON.parse((body as FormData).get('data') as string);
    expect(data.grpo_posting_id).toBe(77);
    expect(data.vehicle_entry_id).toBe(42);
    expect(data.attachments).toBeUndefined();
    expect((body as FormData).getAll('attachments')).toHaveLength(1);
    expect(config.timeout).toBe(5 * 60 * 1000);
    expect(config.timeout).toBe(FA_GRPO_POST_TIMEOUT_MS);
    expect(config.suppressErrorToast).toBe(true);
  });

  it('sends no attachment part when no file is chosen (the gate photo is used)', async () => {
    post.mockResolvedValue({ status: 201, data: { success: true } });
    await faGrpoApi.post(request);
    const body = post.mock.calls[0][1] as FormData;
    expect(body.getAll('attachments')).toHaveLength(0);
    expect(post.mock.calls[0][2].timeout).toBe(FA_GRPO_POST_TIMEOUT_MS);
  });

  it('reads a 202 as waiting for SAP', async () => {
    post.mockResolvedValue({
      status: 202,
      data: { success: true, code: 'SAP_QUEUED', grpo_posting_id: 77 },
    });
    const result = await faGrpoApi.post(request);
    expect(result.queued).toBe(true);
    expect(result.grpo_posting_id).toBe(77);
  });

  it('passes a simulated 201 through', async () => {
    post.mockResolvedValue({ status: 201, data: { success: true, simulated: true } });
    const result = await faGrpoApi.post(request);
    expect(result.simulated).toBe(true);
    expect(result.queued).toBeUndefined();
  });

  it('lets a 409 reach the page as a rejection', async () => {
    const conflict = {
      status: 409,
      message: 'already on its way',
      response: { status: 409, data: { code: 'SAP_QUEUED', grpo_posting_id: 77 } },
    };
    post.mockRejectedValue(conflict);
    await expect(faGrpoApi.post(request)).rejects.toBe(conflict);
  });
});

describe('normalizePage', () => {
  it('keeps an envelope as is', () => {
    const envelope = page([{ id: 1 }]);
    expect(normalizePage(envelope)).toBe(envelope);
  });

  it('treats a missing body as an empty page', () => {
    expect(normalizePage(undefined).results).toEqual([]);
  });
});
