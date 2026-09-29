/**
 * The SAP posting log: what is waiting, what SAP refused, and sending one again.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SapPosting, SapPostingDetail } from '@/modules/admin/api';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  counts: vi.fn(),
  detail: vi.fn(),
  retry: vi.fn(),
  cancel: vi.fn(),
}));
const permissions = vi.hoisted(() => ({ canChange: true }));

vi.mock('@/modules/admin/api/sapPostings.api', () => ({ sapPostingsApi: api }));
vi.mock('@/core/auth', () => ({
  usePermission: () => ({
    hasPermission: (p: string) =>
      p === 'sap_postings.view_sapposting' || (permissions.canChange && p === 'sap_postings.change_sapposting'),
  }),
}));

const { default: SapPostingsPage } = await import('../SapPostingsPage');

const waiting: SapPosting = {
  id: 7,
  company_code: 'JIVO_OIL',
  kind: 'goods_return.receive',
  kind_label: 'Goods return (A/R Return)',
  source_id: 40,
  title: 'Goods return GR-20260928-0012 (invoice 626090482)',
  link: '/returns/customer/40',
  status: 'QUEUED',
  status_label: 'Waiting for SAP',
  attempts: 1,
  next_attempt_at: '2026-09-28T10:00:30Z',
  last_error: 'SAP could not be reached (SAP Service Layer connection timeout); nothing was posted',
  result: {},
  posted_at: null,
  created_by_name: 'Return Clerk',
  created_at: '2026-09-28T10:00:00Z',
  updated_at: '2026-09-28T10:00:00Z',
  cancel_reason: '',
};

const detail: SapPostingDetail = {
  ...waiting,
  params: { warehouse_code: 'BH-GR' },
  cancelled_by_name: '',
  attempts_log: [
    {
      number: 1,
      by_worker: false,
      started_at: '2026-09-28T10:00:00Z',
      finished_at: '2026-09-28T10:00:10Z',
      outcome: 'WAITING',
      outcome_label: 'SAP not answering',
      message: 'invoice 626090482: SAP could not be reached',
      detail: {
        documents: [
          {
            reference: 'GR-20260928-0012 INV 626090482',
            invoices: '626090482',
            outcome: 'failed',
            error: 'SAP Service Layer connection timeout',
            payload: { CardCode: 'CUSTA000123' },
          },
        ],
      },
    },
  ],
};

function page(results: SapPosting[], extra: Record<string, unknown> = {}) {
  return {
    results,
    count: results.length,
    page: 1,
    page_size: 25,
    total_pages: 1,
    next: false,
    previous: false,
    ...extra,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SapPostingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SapPostingsPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    permissions.canChange = true;
    api.list.mockResolvedValue(page([waiting]));
    api.counts.mockResolvedValue({
      counts: { QUEUED: 1, REJECTED: 0 },
      kinds: [{ value: 'goods_return.receive', label: 'Goods return (A/R Return)' }],
    });
    api.detail.mockResolvedValue(detail);
  });

  it('opens on what is waiting for SAP, with the count on the tab', async () => {
    renderPage();
    expect(await screen.findByText(waiting.title)).toBeInTheDocument();
    // The to-do tab is not bounded by date: everything in it is something to do.
    expect(api.list).toHaveBeenCalledWith({ status: 'QUEUED', page: 1, page_size: 25 });
    expect(
      await screen.findByRole('button', { name: /Waiting for SAP\s*\(1\)/ }),
    ).toBeInTheDocument();
  });

  it('shows every try and what SAP said about each document', async () => {
    renderPage();
    fireEvent.click(await screen.findByText(waiting.title));
    const sheet = await screen.findByRole('dialog');
    expect(await within(sheet).findByText(/GR-20260928-0012 INV 626090482/)).toBeInTheDocument();
    expect(within(sheet).getByText('SAP Service Layer connection timeout')).toBeInTheDocument();
    expect(within(sheet).getByText('Open the record').closest('a')).toHaveAttribute(
      'href',
      '/returns/customer/40',
    );
  });

  it('sends it again on request', async () => {
    api.retry.mockResolvedValue({ ...detail, status: 'POSTED', status_label: 'Posted to SAP' });
    renderPage();
    fireEvent.click(await screen.findByText(waiting.title));
    fireEvent.click(await screen.findByRole('button', { name: /Send now/ }));
    await waitFor(() => expect(api.retry).toHaveBeenCalledWith(7));
  });

  it('offers nothing to press without the change permission', async () => {
    permissions.canChange = false;
    renderPage();
    fireEvent.click(await screen.findByText(waiting.title));
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: /Send now/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cancel$/ })).not.toBeInTheDocument();
  });

  it('opens the history on the last 7 days, and asks for any time on request', async () => {
    renderPage();
    await screen.findByText(waiting.title);
    fireEvent.click(screen.getByRole('button', { name: 'Posted' }));
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'POSTED', date_from: expect.any(String) }),
      ),
    );
    fireEvent.change(screen.getByLabelText('How far back'), { target: { value: 'all' } });
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith({ status: 'POSTED', page: 1, page_size: 25 }),
    );
  });

  it('searches every date, whatever the period', async () => {
    renderPage();
    await screen.findByText(waiting.title);
    fireEvent.click(screen.getByRole('button', { name: 'Posted' }));
    fireEvent.change(screen.getByLabelText('Search SAP postings'), {
      target: { value: '1626096501' },
    });
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith({
        status: 'POSTED',
        q: '1626096501',
        page: 1,
        page_size: 25,
      }),
    );
  });

  it('pages through the log instead of loading it whole', async () => {
    api.list.mockResolvedValue(page([waiting], { count: 60, total_pages: 3, next: true }));
    renderPage();
    await screen.findByText(waiting.title);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );
  });

  it('says so when nothing is waiting', async () => {
    api.list.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText('Nothing is waiting for SAP.')).toBeInTheDocument();
  });
});
