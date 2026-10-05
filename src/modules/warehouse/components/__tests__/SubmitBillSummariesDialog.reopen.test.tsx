import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BillSummary } from '../../api';
import { SubmitBillSummariesDialog } from '../SubmitBillSummariesDialog';

const bulkSubmit = vi.hoisted(() => vi.fn());
const sheetsForBills = vi.hoisted(() => vi.fn());
const print = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));
vi.mock('../../api', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    BILL_SUMMARY_STATUS_LABELS: actual.BILL_SUMMARY_STATUS_LABELS,
    billSummaryApi: { bulkSubmit: (...a: unknown[]) => bulkSubmit(...a) },
  };
});
vi.mock('../../pages/billSummary/useBillSummaryPrinter', () => ({
  PRINTABLE_BILL_SUMMARY_STATUSES: ['APPROVED', 'PRINTED', 'PICKED'],
  sheetsForBills: (...a: unknown[]) => sheetsForBills(...a),
  useBillSummaryPrinter: () => ({ print, printingId: null, error: '', host: null }),
}));

const sheet = (id: number, docNum: string, status: BillSummary['status']) =>
  ({
    id,
    key: String(id),
    entry_no: `BS-20260930-00${id}`,
    company_code: 'JIVO_OIL',
    sap_invoice_doc_num: docNum,
    customer_name: 'HARPREET SINGH CASH SALE',
    status,
  }) as unknown as BillSummary;

const batches = [{ companyCode: 'JIVO_OIL', docEntries: [5001, 5002] }];

describe("the truck's Bill summaries dialog", () => {
  beforeEach(() => {
    bulkSubmit.mockReset();
    // Both bills already have a sheet: nothing to send.
    bulkSubmit.mockResolvedValue({
      eligible: [],
      skipped: [
        { doc_entry: 5001, doc_num: '626090101', reason: 'BS-1 already covers this bill.' },
        { doc_entry: 5002, doc_num: '626090102', reason: 'BS-2 already covers this bill.' },
      ],
    });
    sheetsForBills.mockReset();
    sheetsForBills.mockResolvedValue([
      sheet(1, '626090101', 'APPROVED'),
      sheet(2, '626090102', 'PENDING_APPROVAL'),
    ]);
    print.mockReset();
    print.mockResolvedValue({ ...sheet(1, '626090101', 'PRINTED') });
  });

  it('stays open with the sheets already sent, and prints the approved one', async () => {
    const onClose = vi.fn();
    render(
      <SubmitBillSummariesDialog
        batches={batches}
        vehicleNo="DL01GE0527"
        showSent
        onClose={onClose}
      />,
    );

    expect(await screen.findByText('Bill summaries — DL01GE0527')).toBeInTheDocument();
    expect(sheetsForBills).toHaveBeenCalledWith('JIVO_OIL', ['626090101', '626090102']);
    expect(screen.getByText('With the warehouse')).toBeInTheDocument();
    // Only the approved one prints; nothing is left to send.
    expect(screen.queryByRole('button', { name: 'Print 626090102' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Send/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Print 626090101' }));
    await waitFor(() => expect(print).toHaveBeenCalledWith(expect.objectContaining({ id: 1 })));
    // Printed in place: the row now reads Printed, and offers a reprint.
    expect(await screen.findByText('Printed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print 626090101' })).toHaveTextContent('Reprint');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stays quiet, and closes, when it was only offered after a link', async () => {
    const onClose = vi.fn();
    render(
      <SubmitBillSummariesDialog batches={batches} vehicleNo="DL01GE0527" onClose={onClose} />,
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sheetsForBills).not.toHaveBeenCalled();
  });
});
