import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillInvoicePrintButton } from '../BillInvoicePrintButton';

// Nothing is asked of SAP until the button is clicked, so the hook is driven
// from the test rather than by a query client.
const useBillSummaryInvoicePrint = vi.hoisted(() =>
  vi.fn(() => ({ data: undefined, isFetching: false, error: null })),
);
vi.mock('../../../api', () => ({ useBillSummaryInvoicePrint }));

// The print itself is the browser's; what matters here is that it is handed a
// bill only once one has been read.
const handlePrint = vi.hoisted(() => vi.fn());
vi.mock('react-to-print', () => ({ useReactToPrint: () => handlePrint }));

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError } }));

describe('BillInvoicePrintButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBillSummaryInvoicePrint.mockReturnValue({
      data: undefined,
      isFetching: false,
      error: null,
    });
  });

  it('asks for nothing until somebody wants the bill', () => {
    render(<BillInvoicePrintButton docEntry={5101} docNum="626080596" />);
    expect(useBillSummaryInvoicePrint).toHaveBeenCalledWith(null);
    expect(screen.getByRole('button', { name: /print bill/i })).toBeTruthy();
  });

  it('asks by the invoice, not by the sheet', () => {
    // A dispatch stamped straight into SAP has no sheet id at all, which is why
    // the bill is keyed by DocEntry.
    render(<BillInvoicePrintButton docEntry={5101} docNum="626080596" />);
    fireEvent.click(screen.getByRole('button', { name: /print bill/i }));
    expect(useBillSummaryInvoicePrint).toHaveBeenLastCalledWith(5101);
  });

  it('says what went wrong rather than printing an empty sheet', () => {
    useBillSummaryInvoicePrint.mockReturnValue({
      data: undefined,
      isFetching: false,
      error: new Error('cancelled in SAP'),
    });
    render(<BillInvoicePrintButton docEntry={5101} />);
    expect(toastError).toHaveBeenCalled();
    expect(handlePrint).not.toHaveBeenCalled();
  });
});
