import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { LineDefaults, PastSale } from '../../types';
import { LinePriceGuide } from '../LinePriceGuide';

const CASH = 'CUSTA000025';
const NOW = new Date('2026-10-01T10:00:00+05:30');

function sale(over: Partial<PastSale> = {}): PastSale {
  return {
    doc_entry: 78181,
    doc_num: 626080206,
    doc_date: '2026-08-08',
    customer_code: 'CUSTA000236',
    customer_name: 'AKAL ROZGAR YOJANA A U O JWPL',
    quantity: 120,
    price: 152.381,
    price_incl_tax: 160.0001,
    tax_code: 'IGST@5',
    warehouse_code: 'BH-BT',
    ...over,
  };
}

// The counter's last sale of the pouch: July 2025, at ₹140 incl. tax.
const OLD_COUNTER_BILL = sale({
  doc_entry: 54234,
  doc_num: 625070136,
  doc_date: '2025-07-02',
  customer_code: CASH,
  customer_name: 'HARPREET SINGH CASH SALE',
  quantity: 1,
  price: 133.3333,
  price_incl_tax: 140,
  tax_code: 'CG+SG@5',
});

function render(guide: LineDefaults) {
  return renderToStaticMarkup(
    <LinePriceGuide guide={guide} customerCode={CASH} onUsePrice={() => {}} now={NOW} />,
  );
}

describe('LinePriceGuide', () => {
  it('flags a prefill from an old bill and shows the going rate beside it', () => {
    const html = render({
      price: 133.3333,
      tax_code: 'CG+SG@5',
      source: 'last_sale',
      price_list: null,
      last_sale: OLD_COUNTER_BILL,
      recent: [sale()],
    });
    expect(html).toContain('last bill: ₹140.00 incl. tax on 02-07-2025 (bill 625070136)');
    expect(html).toContain('That bill is 15 months old');
    // The recent bill, with its incl.-tax price and a button to use it.
    expect(html).toContain('AKAL ROZGAR YOJANA');
    expect(html).toContain('₹160.00');
    expect(html).toContain('Use ₹160.00 incl. tax from bill 626080206');
  });

  it('does not flag a recent last bill', () => {
    const html = render({
      source: 'last_sale',
      last_sale: { ...OLD_COUNTER_BILL, doc_date: '2026-09-20' },
      recent: [],
    });
    expect(html).toContain('last bill: ₹140.00 incl. tax on 20-09-2026');
    expect(html).not.toContain('months old');
    expect(html).toContain('No bills for this item yet.');
  });

  it('names the price list when it set the price', () => {
    const html = render({
      price: 152.381,
      source: 'price_list',
      price_list: {
        list_num: 9,
        list_name: 'COUNTER',
        price: 160,
        includes_tax: true,
        net_price: 152.381,
      },
      last_sale: OLD_COUNTER_BILL,
      recent: [sale()],
    });
    expect(html).toContain('COUNTER');
    expect(html).toContain('₹160.00 incl. tax, ₹152.38 before tax');
    expect(html).toContain('Last billed to this customer at ₹140.00 incl. tax on 02-07-2025');
  });

  it('marks the customer’s own bills among the recent ones', () => {
    const html = render({ source: null, recent: [sale(), OLD_COUNTER_BILL] });
    expect(html).toContain('No price list or past bill for this customer');
    expect(html.match(/this customer<\/span>/g)?.length).toBe(1);
  });
});
