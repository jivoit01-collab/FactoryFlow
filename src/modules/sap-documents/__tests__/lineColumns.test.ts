/**
 * A document's lines, one column per field (issue #36): the freight bill from
 * the issue — an A/P invoice whose GRPO was done in service — and an item bill,
 * laid out as SAP Portal's approvals showed them, and copied as plain figures.
 */
import { describe, expect, it } from 'vitest';

import { buildTsv } from '@/shared/utils';

import type { DocumentLine } from '../api';
import { lineColumns, lineLayout, linesToClipboardRows } from '../utils/lineColumns';

function line(overrides: Partial<DocumentLine>): DocumentLine {
  return {
    line_num: 0,
    item_code: '',
    description: '',
    quantity: 0,
    uom: '',
    unit_price: null,
    discount_percent: null,
    line_total: null,
    tax_code: '',
    tax_percent: null,
    tax_amount: null,
    warehouse_code: '',
    warehouse_name: '',
    from_warehouse_code: '',
    from_warehouse_name: '',
    account_code: '',
    account_name: '',
    sac_code: '',
    sac_name: '',
    location_code: '',
    location_name: '',
    dimensions: [],
    project: '',
    base_type: '',
    base_label: '',
    base_entry: null,
    base_ref: '',
    received_qty: null,
    dispatched_qty: null,
    litres: null,
    bilty_no: '',
    wtax_liable: null,
    bilty_date: null,
    ar_no: '',
    sub_account: '',
    udf_card_code: '',
    purpose: '',
    remarks: '',
    ...overrides,
  };
}

const freight = (n: number, litres: number, total: number, arNo: string) =>
  line({
    line_num: n,
    description: 'EDIBLE OIL',
    unit_price: total,
    line_total: total,
    tax_code: 'RIGST@5',
    account_code: '5670001',
    account_name: 'FREIGHT AND CARTAGE OUTWARD-INDIRECT EXP',
    sac_code: '9967',
    location_name: 'HARYANA',
    received_qty: 0,
    dispatched_qty: 0,
    litres,
    bilty_no: 'DLH1000554',
    bilty_date: '2026-09-09',
    wtax_liable: true,
    ar_no: arNo,
    sub_account: 'SALES',
    udf_card_code: 'CUSTA000486',
    remarks: 'BILTY NO DLH1000554',
    dimensions: [
      { code: 'MUSTARD', name: 'MUSTARD' },
      { code: '09-2026', name: '09-2026' },
      { code: 'DBKP', name: 'Delivery Bhakharpur' },
      { code: '', name: '' },
      { code: 'PB', name: 'PUNJAB' },
    ],
  });

const FREIGHT_BILL = [freight(0, 1000, 1260, '626090270'), freight(1, 10000, 12598, '626090278')];

const labels = (lines: DocumentLine[], kind: 'draft' | 'marketing' | 'transfer' = 'draft') =>
  lineColumns(lineLayout(kind, lines), lines).map((column) => column.label);

describe('a freight bill whose GRPO was done in service', () => {
  it('gets the service layout: every field in its own column, in the portal order', () => {
    expect(lineLayout('draft', FREIGHT_BILL)).toBe('service');
    expect(labels(FREIGHT_BILL)).toEqual([
      '#',
      'SAC',
      'G/L Account',
      'G/L Account Name',
      'Description',
      'Tax Code',
      'WTax Liable',
      'Received Qty',
      'Dispatched Qty',
      'Unit Price',
      'Total (LC)',
      'Loc.',
      'Litre',
      'Bilty Number',
      'ARNO',
      'Sub Account',
      'Customer Code',
      'Purpose',
      'Bilty Date',
      'Variety',
      'Effective Month',
      'Budget',
      'Sub Budget',
      'State',
      // Not a portal column, so after them, and only because a line has one.
      'Remarks',
    ]);
  });

  it('copies with the headings, figures as plain numbers, so the litre working can be checked in Excel', () => {
    const columns = lineColumns('service', FREIGHT_BILL);
    const rows = linesToClipboardRows(columns, FREIGHT_BILL);
    const cell = (row: number, label: string) => rows[row][columns.findIndex((c) => c.label === label)];

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(columns.map((c) => c.label));
    expect(cell(2, 'Litre')).toBe(10000);
    expect(cell(2, 'Total (LC)')).toBe(12598);
    expect(cell(2, 'ARNO')).toBe('626090278');
    expect(cell(2, 'Bilty Date')).toBe('09-09-2026');
    expect(cell(2, 'WTax Liable')).toBe('Yes');
    expect(cell(2, 'Variety')).toBe('MUSTARD');
    expect(cell(2, 'Budget')).toBe('Delivery Bhakharpur');
    expect(cell(2, 'Sub Budget')).toBe('');
    expect(cell(2, 'State')).toBe('PUNJAB');
    // No thousands separators: "12,598.00" would paste as text.
    expect(buildTsv(rows).split('\r\n')[2]).toContain('\t10000\t');
  });

  it('shows the screen text formatted, and the standard Qty only when SAP filled it', () => {
    const [litre] = lineColumns('service', FREIGHT_BILL).filter((c) => c.label === 'Litre');
    expect(litre.text(FREIGHT_BILL[1], 1)).toBe('10,000');
    expect(labels(FREIGHT_BILL)).not.toContain('Qty');
    expect(labels([freight(0, 1000, 1260, 'x'), { ...freight(1, 1, 1, 'y'), quantity: 5 }])).toContain('Qty');
  });
});

describe('an item bill', () => {
  const ITEM_BILL = [
    line({
      item_code: 'FG0001',
      description: 'MUSTARD OIL 1 LTR',
      quantity: 120,
      uom: 'PCS',
      unit_price: 150,
      discount_percent: 2.5,
      line_total: 17550,
      tax_code: 'IGST@5',
      tax_percent: 5,
      account_code: '5010001',
      account_name: 'PURCHASE',
      warehouse_code: 'BH-FG',
      warehouse_name: 'Bhakharpur FG',
      litres: 120,
    }),
  ];

  it('gets the portal item columns, the discount among them', () => {
    expect(lineLayout('marketing', ITEM_BILL)).toBe('item');
    expect(labels(ITEM_BILL, 'marketing')).toEqual([
      '#',
      'Item No',
      'Description',
      'Qty',
      'UoM',
      'Unit Price',
      'Disc %',
      'Tax Code',
      'Tax %',
      'Total',
      'G/L Account',
      'G/L Name',
      'Warehouse',
      'Warehouse Name',
      'Loc.',
      'Litre',
      'Bilty Number',
      'ARNO',
      'Sub Account',
      'Customer Code',
      'Variety',
      'Effective Month',
      'Budget',
      'Sub Budget',
      'State',
      'Remarks',
    ]);
    const disc = lineColumns('item', ITEM_BILL).find((c) => c.label === 'Disc %')!;
    expect(disc.text(ITEM_BILL[0], 0)).toBe('2.50');
    expect(disc.value(ITEM_BILL[0], 0)).toBe(2.5);
  });

  it('adds a field the portal never showed at the end, only when a line carries it', () => {
    const copied = [{ ...ITEM_BILL[0], base_label: 'GRPO', base_ref: '4521' }];
    const columns = labels(copied, 'marketing');
    expect(columns.at(-1)).toBe('Copied From');
    expect(lineColumns('item', copied).at(-1)!.value(copied[0], 0)).toBe('GRPO 4521');
    expect(labels(ITEM_BILL, 'marketing')).not.toContain('Copied From');
  });

  it('is an item bill as soon as one line has an item', () => {
    expect(lineLayout('draft', [...FREIGHT_BILL, ITEM_BILL[0]])).toBe('item');
  });
});

it('a transfer keeps its own layout, from and to warehouses apart', () => {
  const transfer = [line({ item_code: 'RM1', from_warehouse_code: 'A', warehouse_code: 'B', quantity: 3 })];
  expect(lineLayout('transfer', transfer)).toBe('transfer');
  expect(labels(transfer, 'transfer')).toEqual([
    '#',
    'Item No',
    'Description',
    'Qty',
    'UoM',
    'From Warehouse',
    'From Warehouse Name',
    'To Warehouse',
    'To Warehouse Name',
    'Unit Price',
    'Total',
  ]);
});
