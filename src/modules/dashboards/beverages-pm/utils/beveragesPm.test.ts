import { describe, expect, it } from 'vitest';

import type { PiecesItem } from '../types';
import {
  DEFAULT_FILTERS,
  describeConversion,
  filterPiecesRows,
  sumPiecesRows,
  toggleIn,
} from './beveragesPm';

const CAP: PiecesItem = {
  item_code: 'CAP',
  item_name: 'CAP 28MM',
  sub_group: 'CAPS',
  uom: 'PCS',
  conversion: 'pieces',
  pieces_per_uom: 1,
  stock_qty: 6000,
  pcs_qty: 6000,
  stock_value: 3000,
  warehouses: [
    { code: 'BH-PM', stock_qty: 5000, pcs_qty: 5000, stock_value: 2500 },
    { code: 'BH-PP', stock_qty: 1000, pcs_qty: 1000, stock_value: 500 },
  ],
};

const PREFORM: PiecesItem = {
  item_code: 'PRE',
  item_name: 'PREFORM 20G',
  sub_group: 'PREFORM',
  uom: 'BOX',
  conversion: 'uom_group',
  pieces_per_uom: 100,
  stock_qty: 20,
  pcs_qty: 2000,
  stock_value: 3000,
  warehouses: [{ code: 'BH-PM', stock_qty: 20, pcs_qty: 2000, stock_value: 3000 }],
};

const FILM: PiecesItem = {
  item_code: 'FILM',
  item_name: 'SHRINK FILM',
  sub_group: 'SHRINK',
  uom: 'KG',
  conversion: 'none',
  pieces_per_uom: null,
  stock_qty: 50,
  pcs_qty: null,
  stock_value: 7000,
  warehouses: [{ code: 'BH-PM', stock_qty: 50, pcs_qty: null, stock_value: 7000 }],
};

const ITEMS = [CAP, PREFORM, FILM];

describe('filterPiecesRows', () => {
  it('sorts by pieces with the unconverted items last', () => {
    const rows = filterPiecesRows(ITEMS, DEFAULT_FILTERS);
    expect(rows.map((row) => row.item.item_code)).toEqual(['CAP', 'PRE', 'FILM']);
  });

  it('reads an item through the selected store only', () => {
    const rows = filterPiecesRows(ITEMS, { ...DEFAULT_FILTERS, warehouses: ['BH-PP'] });
    expect(rows).toHaveLength(1);
    expect(rows[0].pcs).toBe(1000);
    expect(rows[0].value).toBe(500);
  });

  it('keeps kilos out of the pieces total', () => {
    const totals = sumPiecesRows(filterPiecesRows(ITEMS, DEFAULT_FILTERS));
    expect(totals).toEqual({
      items: 3,
      unconverted: 1,
      pcs: 8000,
      value: 13000,
      unconvertedValue: 7000,
    });
  });

  it('filters by unit, family and search', () => {
    const only = (patch: Partial<typeof DEFAULT_FILTERS>) =>
      filterPiecesRows(ITEMS, { ...DEFAULT_FILTERS, ...patch }).map((row) => row.item.item_code);
    expect(only({ unit: 'unconverted' })).toEqual(['FILM']);
    expect(only({ unit: 'converted' })).toEqual(['CAP', 'PRE']);
    expect(only({ families: ['PREFORM'] })).toEqual(['PRE']);
    expect(only({ search: 'kg' })).toEqual(['FILM']);
  });

  it('sorts by value', () => {
    const rows = filterPiecesRows(ITEMS, { ...DEFAULT_FILTERS, sort: 'value' });
    expect(rows[0].item.item_code).toBe('FILM');
  });
});

describe('helpers', () => {
  it('toggles a value in and out of a list', () => {
    expect(toggleIn(['A'], 'B')).toEqual(['A', 'B']);
    expect(toggleIn(['A', 'B'], 'A')).toEqual(['B']);
  });

  it('says how an item reached pieces', () => {
    expect(describeConversion(CAP)).toBe('Stocked in pieces');
    expect(describeConversion(PREFORM)).toBe('1 BOX = 100 pcs (SAP UoM group)');
    expect(describeConversion(FILM)).toContain('counted in KG');
  });
});
