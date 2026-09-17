import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { POPrintLine, POPrintPayload } from '../../types';
import { POPurchaseOrderPrint } from '../POPurchaseOrderPrint';

/**
 * The fixture is Beverages PO 826228032 exactly as HANA returns it — the order
 * the layout was measured from, and the sheet the vendor is actually holding.
 * Asserting against it is asserting against SAP's own printout.
 */
function line(over: Partial<POPrintLine> = {}): POPrintLine {
  return {
    sno: 1,
    item_code: 'PM0000676',
    description: 'PREFORM 19.5 GMS',
    details: '',
    hsn_code: '3923.90.90',
    quantity: '630000',
    uom: 'PCS',
    rate: '2.94',
    discount_percent: '0',
    net_rate: '2.94',
    taxable_value: '1852200',
    ...over,
  };
}

function order(over: Partial<POPrintPayload> = {}): POPrintPayload {
  return {
    po_receipt_id: 1,
    company_code: 'JIVO_BEVERAGES',
    doc_entry: 4131,
    doc_num: 826228032,
    doc_date: '2026-08-10',
    ship_date: '2026-08-10',
    payment_due_date: null,
    branch_id: 2,
    unit: 'FACTORY',
    currency: 'INR',
    supplier_ref_no: '',
    payment_terms: '0 Days from the date of GRN',
    shipping_terms: '',
    transportation_mode: '',
    vehicle_no: '',
    packing_slip_no: '',
    remarks: '',
    place_of_supply: 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
    approval: { is_approved: true, approver: 'VISHAL TYAGI' },
    company: {
      location_name: 'Haryana',
      address:
        'Khasra No 20//9/2 & 10/1/2 Khasra No. 12//23/2/2/2 & 20//3/2/2/1 & 3/2/2/2 & 8/1 ' +
        'Bhakharpur Ganaur Sonipat 131101 HR India',
      gst_no: '06AACCJ4223F1Z0',
      pan_no: 'AACCJ4223F',
      fssai_no: '10015064000541',
      state_name: 'HARYANA',
      state_code: '06',
      contact_person: '',
      contact_no: '',
    },
    vendor: {
      code: 'VENDA000758',
      name: 'NATIONAL POLYPLAST INDIA PVT LTD',
      address:
        'HANUMAN TEMPLE  SURVEY NO. 16 HISSA NO.02    ' +
        'VILLAGE KARAD MADHUBAN ROAD  SILVASSA    ALOK CITY - 396240',
      gst_no: '26AAACN1743Q1Z6',
      state_name: 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
      state_code: '26',
      fssai_no: '',
      bank_account: '42605199066',
      bank_ifsc: 'SCBL0036079',
      contact_person: 'BALVINDER SINGH',
      contact_no: '98111145903',
      email: '',
    },
    lines: [line()],
    totals: {
      total_qty: '630000',
      amount_before_freight: '1852200',
      discount: '0',
      taxes: [{ label: 'IGST@18.00 %', amount: '333396' }],
      expenses: null,
      round_off: null,
      grand_total: '2185596',
    },
    hsn_summary: [
      {
        hsn_code: '3923.90.90',
        taxable_value: '1852200',
        tax_rate: '18.00',
        total_tax: '333396',
      },
    ],
    ...over,
  };
}

function markup(payload: POPrintPayload): string {
  return renderToStaticMarkup(<POPurchaseOrderPrint order={payload} />);
}

/** Strip the markup so assertions read against the printed words. */
function text(payload: POPrintPayload): string {
  return markup(payload)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/** How many A4 pages the sheet rendered to. */
function pageCount(payload: POPrintPayload): number {
  return (markup(payload).match(/height:842pt/g) ?? []).length;
}

/**
 * Every row of the frame must account for all 11 columns.
 *
 * This is the one arithmetic the whole sheet rests on: three sets of vertical
 * rules share one column set, and a row that adds up to 10 or 12 silently
 * shifts that row's rules off the item grid's. The result looks like a
 * different document rather than like a bug.
 */
function columnTotals(payload: POPrintPayload): number[] {
  // Drop the innermost tables first — the GST strip is one, and its own four
  // columns would otherwise be counted as a frame row.
  const frame = markup(payload).replace(/<table[^>]*>(?:(?!<table)[\s\S])*?<\/table>/g, '');
  const rows = frame.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? [];
  return rows.map((row) =>
    (row.match(/<td\b[^>]*>/g) ?? []).reduce(
      (sum, cell) => sum + Number(/colspan="(\d+)"/i.exec(cell)?.[1] ?? 1),
      0,
    ),
  );
}

/**
 * The declared height of each frame row, in order, with the one elastic row
 * (the grid's empty space) reported as null.
 */
function rowHeights(payload: POPrintPayload): (number | null)[] {
  const frame = markup(payload).replace(/<table[^>]*>(?:(?!<table)[\s\S])*?<\/table>/g, '');
  const rows = frame.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? [];
  return rows.map((row) => {
    const heights = [...row.matchAll(/height:([\d.]+)pt/g)].map((m) => Number(m[1]));
    return heights.length ? Math.max(...heights) : null;
  });
}

describe('POPurchaseOrderPrint', () => {
  /**
   * SAP pins the totals to the bottom of the frame and lets the empty space
   * collect inside the item grid. Put the elastic row on the wrong side of the
   * totals and a one-item order — which is most of them — prints its totals
   * floating directly under its single line, 65pt above where SAP puts them.
   */
  it('lands the totals where SAP lands them, whatever the line count', () => {
    const heights = rowHeights(order());
    const elastic = heights.indexOf(null);

    // Exactly one row absorbs the slack, and it is inside the grid.
    expect(heights.filter((h) => h === null)).toHaveLength(1);

    // Above it: masthead, its rule band, the header block, the grid head and
    // one item row — putting the elastic row's top at y 389.5.
    const above = heights.slice(0, elastic).reduce((sum, h) => sum + (h ?? 0), 0);
    expect(13.8 + above).toBeCloseTo(389.5, 5);

    // Below it: the totals, the band above the terms, and the page's footer —
    // which puts the grid's total row at y 454.5 and the frame's end at 793.5.
    const below = heights.slice(elastic + 1).reduce((sum, h) => sum + (h ?? 0), 0);
    expect(793.5 - below).toBeCloseTo(454.5, 5);
  });

  it('prints the figures SAP printed on the same order', () => {
    const sheet = text(order());

    expect(sheet).toContain('Purchase Order');
    expect(sheet).toContain('Jivo Wellness Pvt. Ltd.');
    expect(sheet).toContain('FSSAI Lic No.: 10015064000541');
    expect(sheet).toContain('GSTIN Number : 06AACCJ4223F1Z0');
    expect(sheet).toContain('Company PAN : AACCJ4223F');
    expect(sheet).toContain('CIN No. U01100DL2010PTC207768');
    expect(sheet).toContain('VENDA000758 - - ( 4131 )');

    // The right-hand header column.
    expect(sheet).toContain('PO No. : 826228032');
    expect(sheet).toContain('PO Date :10.08.2026');
    expect(sheet).toContain('Unit : FACTORY');
    expect(sheet).toContain('Payment Terms : 0 Days from the date of GRN');
    expect(sheet).toContain('Bank Acct : 42605199066');
    expect(sheet).toContain('Bank IFSC : SCBL0036079');
    expect(sheet).toContain('Ship Date: 10/8/2026');
    expect(sheet).toContain('Contact Person:BALVINDER SINGH');
    expect(sheet).toContain('Mob No:98111145903');

    // Bill From and Ship To.
    expect(sheet).toContain('Bill From:');
    expect(sheet).toContain('NATIONAL POLYPLAST INDIA PVT LTD');
    expect(sheet).toContain('ALOK CITY - 396240');
    expect(sheet).toContain('GSTIN Number : 26AAACN1743Q1Z6');
    expect(sheet).toContain('Ship To:');
    expect(sheet).toContain('Bhakharpur Ganaur Sonipat 131101 HR India');

    // The line and the money column.
    expect(sheet).toContain('PREFORM 19.5 GMS');
    expect(sheet).toContain('3923.90.90');
    expect(sheet).toContain('6,30,000.00');
    expect(sheet).toContain('2.9400');
    expect(sheet).toContain('Total : 630000');
    expect(sheet).toContain('Amount before freight & Disc [INR] 1852200.00');
    expect(sheet).toContain('Discount INR');
    expect(sheet).toContain('IGST@18.00 % 3,33,396.00');
    expect(sheet).toContain('Invoice Total [INR] 2185596.00');

    // The GST summary strip.
    expect(sheet).toContain('HSN Code');
    expect(sheet).toContain('Taxable Value');
    expect(sheet).toContain('18,52,200.00');

    expect(sheet).toContain('For Jivo Wellness Pvt. Ltd.');
    expect(sheet).toContain('Received By');
    expect(sheet).toContain('Authorised Signatory');
    expect(sheet).toContain('Page 1 of 1');
    expect(sheet).toContain('Printed by SAP Business One');
    expect(sheet).toContain('Subject to DELHI Jurisdiction');
  });

  it("reproduces SAP's own oddities rather than tidying them", () => {
    const sheet = text(order());

    // Labels SAP prints with nothing behind them.
    expect(sheet).toContain('Payment Due Date:');
    expect(sheet).toContain('Packing Slip No.:');
    expect(sheet).toContain('Veh.No :');
    expect(sheet).toContain('Contact Person :');
    expect(sheet).toContain('Cust. Contact No:');
    expect(sheet).toContain('Transportation Mode:');
    expect(sheet).toContain('(Apply for Supply of Goods only)');
    // The wide gaps the vendor's address glue leaves are the vendor's copy.
    expect(text(order())).toContain('HISSA NO.02 VILLAGE KARAD');
    // A zero discount leaves the item's Disc. % cell empty; the sheet's own
    // Discount total row still prints 0.00, exactly as the original does.
    expect(sheet).toContain('Discount INR 0.00');
    expect(sheet).not.toContain('5.00');
    expect(text(order({ lines: [line({ discount_percent: '5' })] }))).toContain('5.00');
  });

  it('prints the approval stamp only on an approved order', () => {
    expect(text(order())).toContain('Approved');
    expect(text(order())).toContain('VISHAL TYAGI');

    const pending = text(
      order({ approval: { is_approved: false, approver: '' } }),
    );
    expect(pending).toContain('Digitaly:');
    expect(pending).not.toContain('Approved');
  });

  it('carries the per-company banner only where one has been seen', () => {
    expect(text(order())).toContain('ONLY FOR BEVERAGES');
    // Nothing invented for the companies whose sheet has not been seen.
    expect(text(order({ company_code: 'JIVO_OIL' }))).not.toContain('ONLY FOR');
    expect(text(order({ company_code: 'JIVO_MART' }))).not.toContain('ONLY FOR');
  });

  it('spells the total the way the printed order spells it', () => {
    expect(text(order())).toContain(
      'Amount(Words): Twenty-One Lakhs Eighty-Five Thousand Five Hundred Ninety-Six Only',
    );

    const words = (grand_total: string) =>
      text(order({ totals: { ...order().totals, grand_total } }));
    expect(words('100000')).toContain('One Lakhs Only');
    expect(words('12500000')).toContain('One Crores Twenty-Five Lakhs Only');
    expect(words('1001')).toContain('One Thousand One Only');
    expect(words('0')).toContain('Zero Only');
  });

  it('shows freight and round-off only when the order carries them', () => {
    expect(text(order())).not.toContain('FREIGHT INWARD');
    expect(text(order())).not.toContain('Short & Excess');

    const charged = text(
      order({
        totals: {
          ...order().totals,
          expenses: { label: 'FREIGHT INWARD', amount: '750' },
          round_off: { label: 'Short & Excess', amount: '-0.42' },
        },
      }),
    );
    expect(charged).toContain('FREIGHT INWARD 750.00');
    expect(charged).toContain('Short & Excess -0.42');
  });

  it('prints a CGST and an SGST row on an intra-state order', () => {
    const sheet = text(
      order({
        totals: {
          ...order().totals,
          taxes: [
            { label: 'CGST@9.00 %', amount: '12123' },
            { label: 'SGST@9.00 %', amount: '12123' },
          ],
        },
        // The strip still shows one combined 18% row, as the reader groups it.
        hsn_summary: [
          {
            hsn_code: '3921.90.96',
            taxable_value: '134700',
            tax_rate: '18.00',
            total_tax: '24246',
          },
        ],
      }),
    );
    expect(sheet).toContain('CGST@9.00 % 12,123.00');
    expect(sheet).toContain('SGST@9.00 % 12,123.00');
    expect(sheet).toContain('24,246.00');
  });

  it('keeps every row on all 11 columns', () => {
    for (const payload of [
      order(),
      order({ lines: Array.from({ length: 40 }, (_, i) => line({ sno: i + 1 })) }),
      order({
        totals: {
          ...order().totals,
          expenses: { label: 'PLATE CHARGES', amount: '72420' },
          round_off: { label: 'Short & Excess', amount: '0.4' },
          taxes: [
            { label: 'CGST@9.00 %', amount: '12123' },
            { label: 'SGST@9.00 %', amount: '12123' },
          ],
        },
      }),
    ]) {
      expect(columnTotals(payload).every((total) => total === 11)).toBe(true);
    }
  });

  it('is one page for a short order and paginates a long one', () => {
    const lines = (count: number) =>
      order({ lines: Array.from({ length: count }, (_, i) => line({ sno: i + 1 })) });

    expect(pageCount(order())).toBe(1);
    // Four rows is what SAP's grid holds above the totals, which sit at a
    // fixed distance off the bottom of the frame.
    expect(pageCount(lines(4))).toBe(1);
    expect(pageCount(lines(5))).toBe(2);

    // Every line still prints, and the totals land on the last page only.
    const long = lines(30);
    const sheet = text(long);
    expect(pageCount(long)).toBe(3);
    expect(sheet.match(/Invoice Total \[INR\]/g)).toHaveLength(1);
    expect(sheet).toContain('Page 1 of 3');
    expect(sheet).toContain('Page 3 of 3');
    // No line is lost across a page break.
    for (let sno = 1; sno <= 30; sno += 1) {
      expect(sheet).toContain(` ${sno} PREFORM 19.5 GMS`);
    }
  });

  it('never drops a line whose description is too tall for one page', () => {
    const long = order({
      lines: [line({ sno: 1, description: 'X'.repeat(4000) }), line({ sno: 2 })],
    });
    const sheet = text(long);
    expect(sheet).toContain('Invoice Total [INR]');
    expect(sheet).toContain('PREFORM 19.5 GMS');
  });
});
