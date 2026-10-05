import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BillSummary } from '@/modules/warehouse/api';

import SentBillSummariesPage from '../pages/SentBillSummariesPage';

const row = (patch: Partial<BillSummary>): BillSummary =>
  ({
    id: 1,
    source: 'APP',
    key: '1',
    entry_no: 'BS-0001',
    company: 1,
    company_code: 'JIVO_OIL',
    sap_invoice_doc_entry: 5001,
    sap_invoice_doc_num: '626090104',
    customer_name: 'JIVO MART PVT LTD',
    warehouse_codes: 'BH-FG',
    dispatch_date: '2026-09-30',
    vehicle_no: 'DL01CLX0002',
    transporter_name: 'Om Logistics',
    status: 'APPROVED',
    approved_at: '2026-09-30T09:00:00+05:30',
    approved_by_name: 'Warehouse',
    printed_at: null,
    printed_by_name: '',
    submitted_at: '2026-09-30T08:00:00+05:30',
    reject_reason: '',
    ...patch,
  }) as unknown as BillSummary;

const ROWS = [
  row({}),
  row({
    id: 2,
    key: '2',
    entry_no: 'BS-0002',
    company_code: 'JIVO_MART',
    sap_invoice_doc_num: '707260412',
    status: 'PRINTED',
    printed_at: '2026-09-30T10:00:00+05:30',
  }),
  row({
    id: 3,
    key: '3',
    entry_no: 'BS-0003',
    sap_invoice_doc_num: '626090200',
    status: 'REJECTED',
    dispatch_date: null,
    reject_reason: 'Bilty missing',
  }),
  row({
    id: 4,
    key: '4',
    entry_no: 'BS-0004',
    sap_invoice_doc_num: '626090300',
    status: 'PENDING_APPROVAL',
    dispatch_date: null,
  }),
];

const state = vi.hoisted(() => ({ failed: [] as string[] }));
const print = vi.hoisted(() => vi.fn());

vi.mock('@/core/auth', () => ({
  useAuth: () => ({
    companies: [
      { company_code: 'JIVO_OIL', is_active: true },
      { company_code: 'JIVO_MART', is_active: true },
    ],
  }),
}));
vi.mock('@/modules/warehouse/pages/billSummary/useBillSummaryPrinter', () => ({
  PRINTABLE_BILL_SUMMARY_STATUSES: ['APPROVED', 'PRINTED', 'PICKED'],
  useBillSummaryPrinter: () => ({ print, printingId: null, error: '', host: null }),
}));
vi.mock('../api/sentBillSummaries.api', () => ({
  useSentBillSummaries: () => ({
    data: { rows: ROWS, failed: state.failed },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  }),
}));

describe('SentBillSummariesPage', () => {
  beforeEach(() => {
    state.failed = [];
    print.mockReset();
    print.mockResolvedValue({});
  });

  it('offers only pending approval, approved and all, opening on approved', () => {
    render(<SentBillSummariesPage />);

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Pending approval1',
      'Approved2',
      'All4',
    ]);
    // Approved holds the printed sheets too, each with its own status.
    expect(screen.getByText('626090104')).toBeInTheDocument();
    expect(screen.getByText('707260412')).toBeInTheDocument();
    expect(screen.queryByText('626090300')).not.toBeInTheDocument();
  });

  it('lists what is still with the warehouse under pending approval', () => {
    render(<SentBillSummariesPage />);
    fireEvent.click(screen.getByRole('tab', { name: /Pending approval/ }));

    expect(screen.getByText('626090300')).toBeInTheDocument();
    expect(screen.queryByText('626090104')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Print 626090300/ })).not.toBeInTheDocument();
  });

  it('keeps a sent-back sheet, and why, under all', () => {
    render(<SentBillSummariesPage />);
    fireEvent.click(screen.getByRole('tab', { name: /^All/ }));

    expect(screen.getByText('626090200')).toBeInTheDocument();
    expect(screen.getByText('Bilty missing')).toBeInTheDocument();
  });

  it('hands an approved sheet to the printer, with its own company', async () => {
    render(<SentBillSummariesPage />);
    const button = screen.getByRole('button', { name: 'Print 626090104' });
    expect(button).toHaveTextContent('Print');
    fireEvent.click(button);

    await waitFor(() =>
      expect(print).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, company_code: 'JIVO_OIL', status: 'APPROVED' }),
      ),
    );
  });

  it('offers a reprint for a sheet already printed', async () => {
    render(<SentBillSummariesPage />);
    const button = screen.getByRole('button', { name: 'Print 707260412' });
    expect(button).toHaveTextContent('Reprint');
    fireEvent.click(button);

    await waitFor(() =>
      expect(print).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, company_code: 'JIVO_MART', status: 'PRINTED' }),
      ),
    );
  });

  it('says which company could not be read instead of leaving it out quietly', () => {
    state.failed = ['JIVO_MART'];
    render(<SentBillSummariesPage />);
    const note = screen.getByText(/could not be read/);
    expect(within(note).getByText(/JIVO_MART/)).toBeInTheDocument();
  });
});
