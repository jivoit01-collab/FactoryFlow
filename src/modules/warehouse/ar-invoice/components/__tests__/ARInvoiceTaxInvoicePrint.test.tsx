import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ARInvoicePrintLine, ARInvoicePrintPayload } from '../../types';
import { ARInvoiceTaxInvoicePrint } from '../ARInvoiceTaxInvoicePrint';

/**
 * The fixture is invoice 626090225 exactly as HANA returns it — the invoice the
 * layout was measured from. Asserting against it is asserting against a bill a
 * customer is actually holding.
 */
function line(over: Partial<ARInvoicePrintLine> = {}): ARInvoicePrintLine {
  return {
    line_num: 0,
    item_code: 'FG0000032',
    description: 'COLD PRESS 1 LTR 20 PCS',
    batch_no: 'L3002361 082630 02',
    hsn: '1514.19.20',
    warehouse_code: 'BH-BT',
    quantity: '5',
    boxes: 0,
    loose_qty: '5',
    loose_uom: 'PCS',
    rate_per_bottle: '176.1905',
    discount_pct: '0',
    net_rate_per_bottle: '176.1905',
    taxable_value: '880.9525',
    category: 'CANOLA',
    litres: '5',
    gross_weight: '4.94455',
    ...over,
  };
}

function invoice(over: Partial<ARInvoicePrintPayload> = {}): ARInvoicePrintPayload {
  return {
    posting_id: 1,
    doc_entry: 79774,
    doc_num: 626090225,
    doc_date: '2026-09-05',
    due_date: '2026-09-05',
    dispatch_date: '2026-09-05',
    customer_code: 'CUSTA000025',
    customer_name: 'HARPREET SINGH CASH SALE',
    customer_ref: '',
    customer_fssai: '',
    comments: 'MERAJ',
    currency: 'INR',
    branch_id: 2,
    trade: 'CASH SALE',
    state_group: 'PAN INDIA',
    payment_terms: 'ADVANCE/CASH/0 DAYS',
    contact_name: 'MUKESH JAGIA',
    contact_mobile: '9255666630',
    contact_email: '',
    vehicle_no: '0',
    way_bill_no: '0',
    reverse_charge: 'No',
    place_of_supply: 'HARYANA',
    company: {
      gstin: '06AACCJ4223F1Z0',
      pan: 'AACCJ4223F',
      address:
        'Khasra No 20//9/2 & 10/1/2 Khasra No. 12//23/2/2/2 & 20//3/2/2/1 & 3/2/2/2 & 8/1 Bhakarpur Ganaur Sonipat - Haryana-India-131101',
      state_name: 'HARYANA',
      state_code: '06',
      fssai_no: '10015064000541',
    },
    bill_to: {
      name: 'HARPREET SINGH CASH SALE',
      address: ', SONIPAT, HR, IN',
      gstin: '',
      state_name: 'HARYANA',
      state_code: '06',
    },
    ship_to: {
      name: 'HARPREET SINGH CASH SALE',
      address: ', SONIPAT, HARYANA, 131028, India',
      gstin: '',
      state_name: 'HARYANA',
      state_code: '06',
    },
    irn: '',
    ack_no: '',
    ack_date: null,
    lines: [line()],
    tax_summary: [
      { label: 'CGST@2.5.00 %', amount: '22.023813' },
      { label: 'SGST@2.5.00 %', amount: '22.023813' },
    ],
    hsn_summary: [
      {
        hsn: '1514.19.20',
        taxable_value: '880.9525',
        tax_rate: '5.0',
        total_tax: '44.047626',
      },
    ],
    category_summary: [{ category: 'CANOLA', litres: '5', gross_weight: '4.94455' }],
    totals: {
      taxable_value: '880.9525',
      discount: '0',
      round_off: '-0.0001',
      total: '925',
      tcs: '0',
      grand_total: '925',
      boxes: 0,
      loose_qty: '5',
      loose_uom: 'PCS',
      quantity: '5',
      litres: '5',
      gross_weight: '4.94455',
    },
    ...over,
  };
}

/** Strip the markup so assertions read against the printed words. */
function text(payload: ARInvoicePrintPayload): string {
  return renderToStaticMarkup(<ARInvoiceTaxInvoicePrint invoice={payload} />)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

describe('ARInvoiceTaxInvoicePrint', () => {
  it('prints the figures SAP printed on the same invoice', () => {
    const sheet = text(invoice());

    expect(sheet).toContain('Invoice Number : 626090225');
    expect(sheet).toContain('Invoice Date : 5/9/2026');
    expect(sheet).toContain('Dispatch Date: 05/09/2026');
    expect(sheet).toContain('GSTIN Number : 06AACCJ4223F1Z0');
    expect(sheet).toContain('FSSAI Lic No. 10015064000541');
    expect(sheet).toContain('Place of Supply : HARYANA');
    expect(sheet).toContain('Payment Terms : ADVANCE/CASH/0 DAYS');
    expect(sheet).toContain('Remarks :- MERAJ');
  });

  it('prints the customer strip that sits above the barcode', () => {
    expect(text(invoice())).toContain('CUSTA000025 - CASH SALE - PAN INDIA');
  });

  it('prints bill-to with state codes and ship-to with state names', () => {
    const sheet = text(invoice());

    // SAP formats the two sides differently; matching that is the point.
    expect(sheet).toContain(', SONIPAT, HR, IN');
    expect(sheet).toContain(', SONIPAT, HARYANA, 131028, India');
  });

  it('shows an unboxed line as loose pieces, not as boxes', () => {
    const sheet = text(invoice());

    expect(sheet).toContain('0 Box');
    expect(sheet).toContain('5 PCS');
  });

  it('carries the batch number under its item', () => {
    expect(text(invoice())).toContain('(Batch No: L3002361 082630 02)');
  });

  it('rounds a hair-width round-off to zero rather than minus zero', () => {
    const sheet = text(invoice());

    expect(sheet).toContain('Round Off [INR] 0.00');
    expect(sheet).not.toContain('-0.00');
  });

  it('spells the grand total the way SAP spells it', () => {
    expect(text(invoice())).toContain('Amount(Words): Nine Hundred Twenty-Five Only');
  });

  it('spells amounts on the Indian scale', () => {
    const words = (grand_total: string) =>
      text(invoice({ totals: { ...invoice().totals, grand_total } }));

    expect(words('100000')).toContain('One Lakh Only');
    expect(words('12500000')).toContain('One Crore Twenty-Five Lakh Only');
    expect(words('1001')).toContain('One Thousand One Only');
    expect(words('0')).toContain('Zero Only');
  });

  it('keeps the summary on its own page, as SAP does', () => {
    const sheet = text(invoice());

    // One item, yet two pages: SAP rules page 1's grid to the bottom whatever
    // it holds, so the totals land overleaf.
    expect(sheet).toContain('Page 2 of 2');
    expect(sheet).not.toContain('Page 1 of 1');
  });

  it('numbers items continuously across pages', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      line({ line_num: i, batch_no: '', description: `ITEM ${i}` }),
    );
    const sheet = text(invoice({ lines: many }));

    // 32 rows fill page 1's grid; the remaining 8 fit above the totals row on
    // page 2, so the overflow does not cost a third page.
    expect(sheet).toContain('1 ITEM 0');
    expect(sheet).toContain('32 ITEM 31');
    expect(sheet).toContain('33 ITEM 32');
    expect(sheet).toContain('40 ITEM 39');
    expect(sheet).toContain('Page 2 of 2');
  });

  it('pushes the summary to a page of its own when the rows fill the last one', () => {
    // 32 fill page 1 and 63 fill page 2, leaving 40 for page 3 — more than the
    // 31 that fit above a totals row, so the summary needs a fourth page.
    const many = Array.from({ length: 135 }, (_, i) =>
      line({ line_num: i, batch_no: '', description: `ITEM ${i}` }),
    );
    const sheet = text(invoice({ lines: many }));

    expect(sheet).toContain('135 ITEM 134');
    expect(sheet).toContain('Page 4 of 4');
  });

  it('prints a bill with no batch and no e-invoice without inventing values', () => {
    const sheet = text(
      invoice({ lines: [line({ batch_no: '' })], irn: '', ack_no: '', ack_date: null }),
    );

    expect(sheet).not.toContain('Batch No');
    expect(sheet).toContain('IRN :');
    expect(sheet).toContain('Ack. No :');
  });
});
