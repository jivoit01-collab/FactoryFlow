import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GRPOPrintLine, GRPOPrintPayload } from '../../types';
import { GRPOGoodsReceiptNotePrint } from '../GRPOGoodsReceiptNotePrint';

/**
 * The fixture is Beverages GRPO 2026088346 exactly as HANA returns it — the
 * receipt the layout was measured from. Asserting against it is asserting
 * against a note the vendor is actually holding.
 */
function line(over: Partial<GRPOPrintLine> = {}): GRPOPrintLine {
  return {
    sno: 1,
    item_code: 'PM0000676',
    description: 'PREFORM 19.5 GMS',
    warehouse_code: 'BH-PM',
    quantity: '630000.000000',
    uom: 'PCS',
    po_no: '826228032',
    po_price: '2.940000',
    top3_price: '9',
    price: '2.940000',
    amount: '1852200.000000',
    ...over,
  };
}

function note(over: Partial<GRPOPrintPayload> = {}): GRPOPrintPayload {
  return {
    posting_id: 1,
    doc_entry: 10462,
    doc_num: 2026088346,
    doc_date: '2026-08-17',
    due_date: '2026-08-17',
    created_on: '2026-09-09',
    branch_id: 2,
    currency: 'INR',
    po_ref_no: '826228032',
    po_ref_date: null,
    supplier_ref_no: 'TI0372600573',
    payment_terms: 'ADVANCE/CASH/0 DAYS',
    remarks: 'Based On Purchase Orders 826228032.\nGATE ENTRY NO 163',
    company: {
      name: '(BEVERAGE UNIT) JIVO WELLNESS PVT LTD',
      phone: '',
      fssai_no: '10015064000541',
      tin_no: '',
      cst_no: '06AACCJ4223F1Z0',
      pan_no: 'AACCJ4223F',
    },
    vendor: {
      code: 'VENDA000758',
      name: 'NATIONAL POLYPLAST INDIA PVT LTD',
      address_lines: ['VILLAGE KARAD MADHUBAN ROAD  SILVASSA', 'ALOK CITY-396240'],
      contact_person: 'BALVINDER SINGH',
      contact_no: '98111145903',
      email: '',
      gst_no: '26AAACN1743Q1Z6',
      tin_no: '',
      cst_no: '',
      pan_no: '',
    },
    lines: [line()],
    totals: {
      total_qty: '630000.000000',
      sub_total: '1852200.000000',
      discount: '0.000000',
      taxes: [{ label: 'IGST@18.00 %', amount: '333396.000000' }],
      expenses: { label: '', amount: '0.000000' },
      round_off: null,
      grand_total: '2185596.000000',
    },
    ...over,
  };
}

function markup(payload: GRPOPrintPayload): string {
  return renderToStaticMarkup(<GRPOGoodsReceiptNotePrint note={payload} />);
}

/** Strip the markup so assertions read against the printed words. */
function text(payload: GRPOPrintPayload): string {
  return markup(payload)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Every row must account for all 13 columns — its own cells plus whatever a
 * rowSpan from an earlier row is still occupying.
 *
 * This is the one arithmetic the whole sheet rests on: a row that adds up to 12
 * or 14 silently shifts that row's rules off the item grid's, and the result
 * looks like a different document rather than like a bug.
 */
function rowSpanTotals(payload: GRPOPrintPayload): number[] {
  const rows = markup(payload).match(/<tr>.*?<\/tr>/gs) ?? [];
  // Columns still occupied by earlier cells, indexed by rows from here down.
  let carried: number[] = [];

  return rows.map((row) => {
    const cells = row.match(/<td\b[^>]*>/g) ?? [];
    const spansDown: number[] = [];
    let own = 0;

    for (const cell of cells) {
      const colSpan = Number(/colspan="(\d+)"/i.exec(cell)?.[1] ?? 1);
      const rowSpan = Number(/rowspan="(\d+)"/i.exec(cell)?.[1] ?? 1);
      own += colSpan;
      for (let r = 0; r < rowSpan - 1; r += 1) {
        spansDown[r] = (spansDown[r] ?? 0) + colSpan;
      }
    }

    const total = own + (carried[0] ?? 0);
    carried = carried.slice(1);
    spansDown.forEach((columns, r) => {
      carried[r] = (carried[r] ?? 0) + columns;
    });
    return total;
  });
}

describe('GRPOGoodsReceiptNotePrint', () => {
  it('prints the figures SAP printed on the same receipt', () => {
    const sheet = text(note());

    expect(sheet).toContain('Goods Receipt Note');
    expect(sheet).toContain('FSSAI Lic No. 10015064000541');
    expect(sheet).toContain('(BEVERAGE UNIT) JIVO WELLNESS PVT LTD');
    expect(sheet).toContain('GRPO No.:2026088346');
    expect(sheet).toContain('GRPO Date: 17-Aug-2026');
    expect(sheet).toContain('Reff. Po No.:826228032');
    expect(sheet).toContain('Delivery/Due Date: 17-Aug-2026');
    expect(sheet).toContain('Supplier Reff/Bill No.: TI0372600573');
    expect(sheet).toContain('Supplier GST No: 26AAACN1743Q1Z6');
    expect(sheet).toContain('NATIONAL POLYPLAST INDIA PVT LTD');
    expect(sheet).toContain('ALOK CITY-396240');
    expect(sheet).toContain('Remarks:Based On Purchase Orders 826228032. GATE ENTRY NO 163');

    // The line and the money column.
    expect(sheet).toContain('PM0000676');
    expect(sheet).toContain('PREFORM 19.5 GMS');
    expect(sheet).toContain('BH-PM');
    expect(sheet).toContain('6,30,000.00');
    expect(sheet).toContain('Sub Total 18,52,200.00');
    expect(sheet).toContain('Discount 0.00');
    expect(sheet).toContain('IGST@18.00 % 3,33,396.00');
    expect(sheet).toContain('Grand Total 21,85,596.00');

    // The registrations block, per-location on the company side and empty on
    // the supplier's — both as SAP prints them.
    expect(sheet).toContain(':06AACCJ4223F1Z0');
    expect(sheet).toContain(':AACCJ4223F');

    expect(sheet).toContain('CREATED ON 9/9/2026');
    expect(sheet).toContain('For (BEVERAGE UNIT) JIVO WELLNESS PVT LTD');
    expect(sheet).toContain('Received By Verified By Checked By Authorised Signatory');
    expect(sheet).toContain('Page 1 of 1');
    expect(sheet).toContain('Printed by SAP Business One');
  });

  it("reproduces SAP's own oddities rather than tidying them", () => {
    const sheet = text(note());
    // A stub in the layout, not a price.
    expect(sheet).toContain('Top 3 Price');
    expect(sheet).toContain(' 9 ');
    // Labels SAP prints with nothing behind them.
    expect(sheet).toContain('Reff. Po Date:');
    // SAP's spelling, and its doubled unit on the payment term.
    expect(sheet).toContain('Contact Persion:BALVINDER SINGH');
    expect(sheet).toContain('Payment Terms: ADVANCE/CASH/0 DAYS Days');
  });

  it('spells the total the way the printed note spells it', () => {
    expect(text(note())).toContain(
      // Label and words are separate spans, so the strip leaves one space
      // between them where SAP sets two.
      'Amount in Words: INR TWENTY-ONE LAKHS EIGHTY-FIVE THOUSAND FIVE HUNDRED NINETY-SIX ONLY',
    );

    const words = (grand_total: string) =>
      text(note({ totals: { ...note().totals, grand_total } }));
    expect(words('100000')).toContain('INR ONE LAKHS ONLY');
    expect(words('12500000')).toContain('INR ONE CRORES TWENTY-FIVE LAKHS ONLY');
    expect(words('1001')).toContain('INR ONE THOUSAND ONE ONLY');
    expect(words('0')).toContain('INR ZERO ONLY');
  });

  it('cuts every row from the same 13 columns', () => {
    for (const total of rowSpanTotals(note())) {
      expect(total).toBe(13);
    }
  });

  it('keeps the columns aligned on a receipt with tax components and a round-off', () => {
    const intraState = note({
      totals: {
        ...note().totals,
        taxes: [
          { label: 'CGST@9.00 %', amount: '166698' },
          { label: 'SGST@9.00 %', amount: '166698' },
        ],
        expenses: { label: 'FREIGHT', amount: '1000' },
        round_off: { label: 'Short & Excess', amount: '0.4' },
      },
      lines: [line(), line({ sno: 2, item_code: 'PM0000677' })],
    });

    const sheet = text(intraState);
    expect(sheet).toContain('CGST@9.00 % 1,66,698.00');
    expect(sheet).toContain('SGST@9.00 % 1,66,698.00');
    expect(sheet).toContain('FREIGHT 1,000.00');
    expect(sheet).toContain('Short & Excess 0.40');

    for (const total of rowSpanTotals(intraState)) {
      expect(total).toBe(13);
    }
  });

  it('carries the totals onto the last page of a long receipt', () => {
    const many = note({
      lines: Array.from({ length: 40 }, (_, i) => line({ sno: i + 1 })),
    });
    const sheet = text(many);

    expect(sheet).toContain('Page 1 of 2');
    expect(sheet).toContain('Page 2 of 2');
    // The summary appears exactly once, under the last row.
    expect(sheet.match(/Grand Total/g)).toHaveLength(1);
    // The header block and footer repeat on both pages.
    expect(sheet.match(/GRPO No\.:2026088346/g)).toHaveLength(2);
    expect(sheet.match(/Printed by SAP Business One/g)).toHaveLength(2);

    for (const total of rowSpanTotals(many)) {
      expect(total).toBe(13);
    }
  });
});
