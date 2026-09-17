import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ARInvoicePayment,
  SapCashSaleHistory,
  SapCashSaleInvoice,
} from '../../types';
import { SapCashSaleList } from '../SapCashSaleList';

const useSapCashSales = vi.hoisted(() => vi.fn());
// The per-row print button asks SAP for the bill; nothing is fetched until it
// is clicked, so an idle result is all these renders need.
const useSapCashSalePrint = vi.hoisted(() =>
  vi.fn(() => ({ data: undefined, isFetching: false, error: null })),
);

const useMarkArPayment = vi.hoisted(() => vi.fn(() => ({ isPending: false })));
const useClearArPayment = vi.hoisted(() => vi.fn(() => ({ isPending: false })));

vi.mock('../../api/ar-invoice.queries', () => ({
  useSapCashSales,
  useSapCashSalePrint,
  useMarkArPayment,
  useClearArPayment,
}));

// The payment control asks whether this user may mark receipts; the hook reads
// redux, which a static-markup render has no store for.
const hasPermission = vi.hoisted(() => vi.fn(() => true));
vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission }),
}));

function payment(over: Partial<ARInvoicePayment> = {}): ARInvoicePayment {
  return {
    id: 1,
    sap_doc_entry: 80075,
    sap_doc_num: 626090322,
    ar_invoice: null,
    status: 'RECEIVED',
    status_display: 'Payment received',
    received_on: '2026-09-11',
    amount: '850.00',
    mode: 'UPI',
    mode_display: 'UPI',
    reference: 'UTR-77120',
    remarks: '',
    marked_by_name: 'Counter',
    updated_at: '2026-09-11T10:00:00Z',
    ...over,
  };
}

function invoice(over: Partial<SapCashSaleInvoice> = {}): SapCashSaleInvoice {
  return {
    doc_entry: 80075,
    doc_num: 626090322,
    doc_date: '2026-09-10',
    doc_due_date: '2026-09-10',
    tax_date: '2026-09-10',
    created_date: '2026-09-10',
    customer_code: 'CUSTA000025',
    customer_name: 'HARPREET SINGH CASH SALE',
    customer_ref: '',
    comments: 'Akash',
    doc_total: 850,
    tax_total: 40.48,
    paid_to_date: 0,
    doc_status: 'O',
    is_cancelled: false,
    branch_id: 2,
    branch_name: 'FACTORY',
    sap_user: 'HARPREET SINGH',
    draft_entry: 56761,
    lines: [
      {
        line_num: 0,
        item_code: 'FG0000011',
        description: 'MUSTARD KACCHI GHANI 5 LTR 4 PCS',
        quantity: 1,
        price: 809.52,
        line_total: 809.52,
        tax_code: 'CG+SG@5',
        warehouse_code: 'BH-BT',
        uom: 'PCS',
        cost_center: 'MUSTARD',
      },
    ],
    app_posting_id: null,
    payment: null,
    ...over,
  };
}

function history(over: Partial<SapCashSaleHistory> = {}): SapCashSaleHistory {
  const invoices = over.invoices ?? [invoice()];
  return {
    date_from: '2026-06-13',
    date_to: '2026-09-11',
    count: invoices.length,
    truncated: false,
    ...over,
    invoices,
  };
}

function state(over: Partial<{ data: SapCashSaleHistory; isLoading: boolean; isError: boolean }>) {
  useSapCashSales.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...over,
  });
}

describe('SapCashSaleList', () => {
  beforeEach(() => {
    useSapCashSales.mockReset();
    hasPermission.mockReturnValue(true);
  });

  it('lists the cash sales SAP holds, with the window they were read over', () => {
    state({ data: history() });
    const html = renderToStaticMarkup(<SapCashSaleList />);
    expect(html).toContain('626090322');
    expect(html).toContain('HARPREET SINGH CASH SALE');
    // The remark is how the counter records who the bill was for.
    expect(html).toContain('Akash');
    expect(html).toContain('₹850.00');
    // The range is stated: an invisible window reads as "SAP has nothing".
    expect(html).toContain('13/06/2026');
    expect(html).toContain('11/09/2026');
  });

  it('says which side raised each invoice', () => {
    state({
      data: history({
        invoices: [
          invoice({ doc_entry: 80075, app_posting_id: 12 }),
          invoice({ doc_entry: 79996, doc_num: 626090296, app_posting_id: null }),
        ],
      }),
    });
    const html = renderToStaticMarkup(<SapCashSaleList />);
    expect(html).toContain('Raised here');
    // The rest are SAP's own, keyed by whoever took the sale.
    expect(html).toContain('HARPREET SINGH');
  });

  it('flags a cancelled cash sale rather than hiding it', () => {
    state({ data: history({ invoices: [invoice({ is_cancelled: true })] }) });
    expect(renderToStaticMarkup(<SapCashSaleList />)).toContain('Cancelled');
  });

  it('offers the bill for reprint, whichever side raised it', () => {
    state({
      data: history({
        invoices: [
          invoice({ doc_entry: 80075, app_posting_id: 12 }),
          invoice({ doc_entry: 79996, doc_num: 626090296, app_posting_id: null }),
        ],
      }),
    });
    const html = renderToStaticMarkup(<SapCashSaleList />);
    expect(html.match(/Print</g)).toHaveLength(2);
  });

  it('does not offer to reprint a cancelled bill', () => {
    // The TAX INVOICE layout says nothing about a void, so the reprint of one
    // reads as a live bill.
    state({ data: history({ invoices: [invoice({ is_cancelled: true })] }) });
    expect(renderToStaticMarkup(<SapCashSaleList />)).not.toContain('Print<');
  });

  it('warns when the window holds more than was returned', () => {
    state({ data: history({ truncated: true }) });
    expect(renderToStaticMarkup(<SapCashSaleList />)).toContain('narrow the dates');
  });

  it('shows whether each bill has been paid', () => {
    state({
      data: history({
        invoices: [
          invoice({ doc_entry: 80075, payment: payment() }),
          invoice({ doc_entry: 79996, doc_num: 626090296, payment: null }),
        ],
      }),
    });
    const html = renderToStaticMarkup(<SapCashSaleList />);
    expect(html).toContain('Paid');
    // An unmarked bill says so rather than going blank — blank reads as
    // "nothing to worry about", the opposite of an unchecked invoice.
    expect(html).toContain('Not tracked');
  });

  it('counts the window by payment state', () => {
    state({
      data: history({
        invoices: [
          invoice({ doc_entry: 80075, payment: payment() }),
          invoice({ doc_entry: 79996, doc_num: 626090296, payment: null }),
          invoice({
            doc_entry: 79900,
            doc_num: 626090200,
            payment: payment({ status: 'PARTIAL', status_display: 'Partly received' }),
          }),
        ],
      }),
    });
    const html = renderToStaticMarkup(<SapCashSaleList />);
    expect(html).toContain('Part paid');
    expect(html).toContain('Unpaid');
  });

  it('carries the receipt details on the pill without opening the row', () => {
    state({ data: history({ invoices: [invoice({ payment: payment() })] }) });
    const html = renderToStaticMarkup(<SapCashSaleList />);
    // Date, mode, reference and who marked it, on hover — the row itself stays
    // collapsed, and chasing a payment should not need it expanded.
    expect(html).toContain('UTR-77120');
    expect(html).toContain('marked by Counter');
  });

  it('offers no payment mark on a cancelled bill', () => {
    state({ data: history({ invoices: [invoice({ is_cancelled: true })] }) });
    expect(renderToStaticMarkup(<SapCashSaleList />)).not.toContain('Not tracked');
  });

  it('shows the payment state but no control without the permission', () => {
    hasPermission.mockReturnValue(false);
    state({ data: history({ invoices: [invoice({ payment: payment() })] }) });
    const html = renderToStaticMarkup(<SapCashSaleList />);
    expect(html).toContain('Paid');
    expect(html).not.toContain('Record whether this bill was paid');
  });

  it('names the window it found nothing in', () => {
    state({ data: history({ invoices: [], count: 0 }) });
    const html = renderToStaticMarkup(<SapCashSaleList />);
    expect(html).toContain('No cash sales in SAP');
    expect(html).toContain('13/06/2026');
  });
});
