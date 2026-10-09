import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: [] });
const post = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { apInvoiceDraftApi } from '../api/ap-invoice-draft.api';

describe('A/P invoice draft API', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
  });

  it('searches open GRPOs on the server, and asks for all of them with no term', async () => {
    await apInvoiceDraftApi.openGrpos('SSY');
    expect(get).toHaveBeenLastCalledWith('/ap-invoice-drafts/grpos/', {
      params: { search: 'SSY' },
      suppressErrorToast: true,
    });
    await apInvoiceDraftApi.openGrpos();
    expect(get).toHaveBeenLastCalledWith('/ap-invoice-drafts/grpos/', {
      params: undefined,
      suppressErrorToast: true,
    });
  });

  it('asks for one GRPO by its DocEntry', async () => {
    await apInvoiceDraftApi.openGrpos(undefined, 27634);
    expect(get).toHaveBeenLastCalledWith('/ap-invoice-drafts/grpos/', {
      params: { doc_entry: 27634 },
      suppressErrorToast: true,
    });
  });

  it('asks where a page of GRPOs stands, quietly', async () => {
    await apInvoiceDraftApi.grpoStatus([27481, 27634]);
    expect(get).toHaveBeenLastCalledWith('/ap-invoice-drafts/grpo-status/', {
      params: { doc_entries: '27481,27634' },
      suppressErrorToast: true,
    });
  });

  it('sends the GRPO and the bill as multipart, and shows its own refusal', async () => {
    const bill = new File(['%PDF'], 'SSY-1979.pdf', { type: 'application/pdf' });
    await apInvoiceDraftApi.create({ grpo_doc_entry: 27481, invoice_file: bill });

    const [url, form, config] = post.mock.calls[0];
    expect(url).toBe('/ap-invoice-drafts/');
    expect((form as FormData).get('grpo_doc_entry')).toBe('27481');
    expect((form as FormData).get('invoice_file')).toBe(bill);
    expect(config).toMatchObject({ suppressErrorToast: true });
    expect(config.timeout).toBeGreaterThanOrEqual(60_000);
  });

  it('gives reading the bill longer than the default 30 s', async () => {
    await apInvoiceDraftApi.readInvoice(7);
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('/ap-invoice-drafts/7/read-invoice/');
    expect(body).toBeNull();
    expect(config.timeout).toBeGreaterThan(30_000);
  });

  it('posts a decision on one check by its key', async () => {
    await apInvoiceDraftApi.reviewCheck(7, 'rate_check_signature', {
      decision: 'OK',
      remark: 'seen',
    });
    expect(post).toHaveBeenCalledWith('/ap-invoice-drafts/7/checks/rate_check_signature/review/', {
      decision: 'OK',
      remark: 'seen',
    });
  });
});
