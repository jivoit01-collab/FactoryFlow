import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BillSummary } from '../../../api';
import BillSummaryApprovalPage from '../BillSummaryApprovalPage';

const sheet = (id: number, docNum: string, bilty: string): BillSummary =>
  ({
    id,
    key: String(id),
    entry_no: `BS-000${id}`,
    sap_invoice_doc_num: docNum,
    customer_name: 'A R TRADERS',
    customer_code: 'C1',
    vehicle_no: 'DL01LAT6156',
    transporter_name: 'Bhargave Road Carrier',
    driver_name: '',
    bilty_no: bilty,
    warehouse_codes: 'BH-FG',
    submitted_at: '2026-09-30T09:00:00+05:30',
    totals: { lines: 1, boxes: 10, litres: 100 },
  }) as unknown as BillSummary;

const confirmSapPost = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('sonner')>()),
  toast,
}));
const approve = vi.hoisted(() => vi.fn());
const listed = vi.hoisted(() => ({ rows: [] as unknown[], params: [] as unknown[] }));
const scope = vi.hoisted(() => ({
  unrestricted: false,
  managesNothing: false,
  codes: new Set<string>(['BH-FG']),
}));

vi.mock('@/shared/components', () => ({ confirmSapPost: (o: unknown) => confirmSapPost(o) }));
vi.mock('../../../api', () => ({
  useBillSummaries: (params: unknown) => {
    listed.params.push(params);
    return { data: listed.rows, isLoading: false };
  },
  useApproveBillSummaries: () => ({ mutateAsync: approve, isPending: false }),
  useRejectBillSummary: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWarehouseScope: () => scope,
}));

function renderPage() {
  render(
    <MemoryRouter>
      <BillSummaryApprovalPage />
    </MemoryRouter>,
  );
}

describe('approving a truck asks before it stamps SAP', () => {
  beforeEach(() => {
    listed.rows = [sheet(1, '626098260', 'NCR-4494'), sheet(2, '626098261', '')];
    confirmSapPost.mockReset();
    approve.mockReset();
    Object.values(toast).forEach((fn) => fn.mockReset());
    approve.mockResolvedValue({ approved: [1, 2], refused: [] });
  });

  it('posts nothing when the confirmation is declined', async () => {
    confirmSapPost.mockResolvedValue(false);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Approve 2 sheet/ }));

    await waitFor(() => expect(confirmSapPost).toHaveBeenCalledTimes(1));
    expect(approve).not.toHaveBeenCalled();
  });

  it('names the invoices and the missing bilty, then posts once confirmed', async () => {
    confirmSapPost.mockResolvedValue(true);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Approve 2 sheet/ }));

    await waitFor(() => expect(approve).toHaveBeenCalledTimes(1));
    const { title, details } = confirmSapPost.mock.calls[0][0];
    expect(title).toBe('Approve 2 sheets and stamp SAP?');
    const rows = Object.fromEntries(
      details.filter(Boolean).map((d: { label: string; value: string }) => [d.label, d.value]),
    );
    expect(rows['SAP invoices (2)']).toBe('626098260, 626098261');
    expect(rows['No bilty']).toMatch(/1 of these/);
    expect(approve.mock.calls[0][0].ids).toEqual([1, 2]);
  });

  it('says the stamp waits for SAP rather than failing when SAP is not answering', async () => {
    confirmSapPost.mockResolvedValue(true);
    approve.mockResolvedValue({
      approved: [
        { id: 1, sap_status: 'WAITING' },
        { id: 2, sap_status: 'POSTED' },
      ],
      refused: [],
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Approve 2 sheet/ }));

    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        'SAP is not answering, so 1 sheet(s) will be stamped on the SAP invoice by itself once SAP is back.',
      ),
    );
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('the queue is the godowns the user manages', () => {
  beforeEach(() => {
    listed.rows = [];
    listed.params = [];
    Object.assign(scope, {
      unrestricted: false,
      managesNothing: false,
      codes: new Set(['BH-FG', 'BH-PF']),
    });
  });

  it('asks the server for the managed sheets only', () => {
    renderPage();
    expect(listed.params[0]).toEqual({ status: 'PENDING_APPROVAL', managed: true });
  });

  it('names the godowns when nothing is waiting for them', () => {
    renderPage();
    expect(screen.getByText(/Nothing waiting for BH-FG, BH-PF\./)).toBeInTheDocument();
  });

  it('tells a user who manages no godown where the assignment is made', () => {
    Object.assign(scope, { managesNothing: true, codes: new Set() });
    renderPage();
    expect(screen.getByText(/not set as the manager of any godown/)).toBeInTheDocument();
    expect(screen.getByText(/Admin → Warehouse Managers/)).toBeInTheDocument();
  });
});
