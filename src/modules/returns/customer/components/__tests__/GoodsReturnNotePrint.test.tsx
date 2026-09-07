import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GoodsReturnPrintLine, GoodsReturnPrintPayload } from '../../api';
import { GoodsReturnNotePrint } from '../GoodsReturnNotePrint';

/**
 * The fixture is Return 1609264514 exactly as HANA returns it — the document the
 * layout was measured from. Asserting against it is asserting against a sheet
 * SAP has already printed.
 */
function line(over: Partial<GoodsReturnPrintLine> = {}): GoodsReturnPrintLine {
  return {
    line_no: 1,
    item_code: 'FG0000229',
    description: 'SO OLIVE OIL 5 LTR 4 PCS',
    uom: 'PCS',
    quantity: '12.000000',
    price: '0.000000',
    stock_quantity: '12.000000',
    total: '0.000000',
    warehouse_code: 'BH-GR',
    ...over,
  };
}

function note(over: Partial<GoodsReturnPrintPayload> = {}): GoodsReturnPrintPayload {
  return {
    goods_return_id: 3,
    entry_no: 'GR-20260907-0001',
    doc_entry: 3738,
    doc_num: '1609264514',
    doc_date: '07/09/26',
    doc_time: '11:04',
    due_date: '07/09/26',
    customer_code: 'CUSTA000048',
    customer_name: 'R K WORLDINFOCOM PVT LTD',
    address_lines: ['VILLAGE RAHAKA  ESR SOHNA LOGISTICS PARK', 'GURUGRAM-122103', 'IN'],
    vat_number: '',
    currency: 'INR',
    doc_total: '0.000000',
    sales_employee: '-No Sales Employee / Buyer-',
    payment_terms: 'ADVANCE/CASH/0 DAYS',
    comments: 'Goods return GR-20260907-0001 against invoice(s) 608260238',
    cancelled: false,
    branch_name: 'HARYANA',
    lines: [line()],
    ...over,
  };
}

function markup(over: Partial<GoodsReturnPrintPayload> = {}): string {
  return renderToStaticMarkup(<GoodsReturnNotePrint note={note(over)} />);
}

describe('GoodsReturnNotePrint', () => {
  it('prints the document as SAP titles it', () => {
    const html = markup();
    expect(html).toContain('Return ');
    expect(html).toContain('1609264514');
    expect(html).toContain('Original');
  });

  it('prints the ship-to block SAP resolved, line by line', () => {
    const html = markup();
    expect(html).toContain('R K WORLDINFOCOM PVT LTD');
    expect(html).toContain('VILLAGE RAHAKA  ESR SOHNA LOGISTICS PARK');
    expect(html).toContain('GURUGRAM-122103');
  });

  it('prints the defaults SAP fills in rather than blanking them', () => {
    const html = markup();
    expect(html).toContain('-No Sales Employee / Buyer-');
    expect(html).toContain('ADVANCE/CASH/0 DAYS');
  });

  it('trims a quantity the way SAP does', () => {
    // "12.000000" prints as "12"; "12.5" keeps its half.
    expect(markup()).toContain('>12<');
    expect(markup({ lines: [line({ quantity: '12.500000' })] })).toContain('>12.5<');
  });

  it('leaves zero money blank on a line', () => {
    // A return moves stock without crediting the customer, so SAP's sample
    // sheet has empty Price and Total cells rather than 0.0000. The only
    // 0.0000 on the page is the document total at the foot.
    expect(markup().match(/0\.0000/g)).toHaveLength(1);
  });

  it('still prints the document total, with its currency', () => {
    expect(markup()).toContain('INR');
    expect(markup()).toContain('0.0000');
  });

  it('prints a line price and total once there is money on them', () => {
    const html = markup({ lines: [line({ price: '176.1905', total: '2114.286' })] });
    expect(html).toContain('176.1905');
    expect(html).toContain('2114.2860');
  });

  it('says so when SAP holds a cancelled document', () => {
    const html = markup({ cancelled: true });
    expect(html).toContain('Cancelled');
    expect(html).not.toContain('>Original<');
  });
});
