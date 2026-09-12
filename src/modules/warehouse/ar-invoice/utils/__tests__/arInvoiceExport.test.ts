import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { buildTsv } from '@/shared/utils';

import type { ARInvoicePayment, ARInvoicePosting } from '../../types';
import {
  AR_INVOICE_COLUMNS,
  buildArInvoiceWorkbook,
  invoiceAmount,
  paymentLabel,
  sapReference,
  toClipboardRows,
} from '../arInvoiceExport';

function makePosting(overrides: Partial<ARInvoicePosting> = {}): ARInvoicePosting {
  return {
    id: 1,
    customer_code: 'CUSTA000101',
    customer_name: 'HARPREET SINGH CASH SALE',
    customer_ref: '',
    doc_date: '2026-09-12',
    doc_due_date: null,
    tax_date: null,
    selected_total: null,
    branch_id: 1,
    comments: '',
    status: 'POSTED',
    status_display: 'Posted',
    error_message: null,
    sap_draft_entry: null,
    sap_approval_code: null,
    approval_remarks: '',
    sap_doc_entry: 4011,
    sap_doc_num: 626090350,
    sap_doc_total: '1100.00',
    posted_at: '2026-09-12T10:30:00Z',
    created_at: '2026-09-12T10:28:00Z',
    created_by_name: 'Gurpreet',
    posted_by_name: 'Gurpreet',
    lines: [],
    attachments: [],
    payment: null,
    ...overrides,
  };
}

const paid = (overrides: Partial<ARInvoicePayment> = {}): ARInvoicePayment => ({
  id: 9,
  sap_doc_entry: 4011,
  sap_doc_num: 626090350,
  ar_invoice: 1,
  status: 'RECEIVED',
  status_display: 'Received',
  received_on: '2026-09-12',
  amount: '1100.00',
  mode: 'CASH',
  mode_display: 'Cash',
  reference: '',
  remarks: '',
  marked_by_name: 'Gurpreet',
  updated_at: '2026-09-12T11:00:00Z',
  ...overrides,
});

describe('invoiceAmount', () => {
  it("takes SAP's total once posted, the picked total before that", () => {
    expect(invoiceAmount(makePosting())).toBe(1100);
    expect(
      invoiceAmount(makePosting({ sap_doc_total: null, selected_total: '950.50' })),
    ).toBe(950.5);
  });

  it('is null when neither side has a value', () => {
    expect(invoiceAmount(makePosting({ sap_doc_total: null, selected_total: null }))).toBeNull();
  });
});

describe('sapReference', () => {
  it('names the posted invoice, or the draft it is still held as', () => {
    expect(sapReference(makePosting())).toBe('626090350');
    expect(sapReference(makePosting({ sap_doc_num: null, sap_draft_entry: 77 }))).toBe('Draft 77');
    expect(sapReference(makePosting({ sap_doc_num: null, sap_draft_entry: null }))).toBe('');
  });
});

describe('paymentLabel', () => {
  it('separates a bill checked and found unpaid from one nobody looked at', () => {
    expect(paymentLabel(makePosting())).toBe('Not tracked');
    expect(paymentLabel(makePosting({ payment: paid({ status: 'PENDING' }) }))).toBe('Unpaid');
    expect(paymentLabel(makePosting({ payment: paid({ status: 'PARTIAL' }) }))).toBe('Part paid');
    expect(paymentLabel(makePosting({ payment: paid() }))).toBe('Paid');
  });
});

describe('toClipboardRows', () => {
  it('copies one tab-separated line per row and no headings', () => {
    const text = buildTsv(
      toClipboardRows([
        makePosting(),
        makePosting({ id: 2, sap_doc_num: 626090339, customer_ref: 'AVNEESH JI', sap_doc_total: '700.00' }),
      ]),
    );

    const lines = text.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      '12/09/2026\tHARPREET SINGH CASH SALE\t\t626090350\t1100\tPosted\tNot tracked',
    );
    expect(lines[1]).toContain('AVNEESH JI');
  });

  it('leaves the amount unformatted so the sheet reads it as a number', () => {
    const cells = toClipboardRows([makePosting({ sap_doc_total: '1234567.89' })])[0];
    expect(cells[AR_INVOICE_COLUMNS.findIndex((c) => c.label === 'Amount')]).toBe(1234567.89);
  });
});

describe('buildArInvoiceWorkbook', () => {
  it('carries the screen columns plus the ones only a sheet has room for', () => {
    const workbook = buildArInvoiceWorkbook([makePosting({ payment: paid() })]);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets['AR Invoices'],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      Date: '12/09/2026',
      Customer: 'HARPREET SINGH CASH SALE',
      'SAP invoice': '626090350',
      Amount: 1100,
      Status: 'Posted',
      Payment: 'Paid',
      'Customer code': 'CUSTA000101',
      'Payment mode': 'Cash',
      'Raised by': 'Gurpreet',
      'SAP doc entry': 4011,
    });
  });

  it('keeps a blank cell rather than shifting the column across', () => {
    const workbook = buildArInvoiceWorkbook([
      makePosting({ sap_doc_total: null, selected_total: null, payment: null }),
    ]);
    const header = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets['AR Invoices'], {
      header: 1,
    })[0];

    expect(header).toContain('Amount');
    expect(header.indexOf('Status')).toBe(header.indexOf('Amount') + 1);
  });
});
