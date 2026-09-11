import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { NonMovingItem } from '../types';
import {
  buildNonMovingWorkbook,
  sheetNameFor,
  SUMMARY_SHEET_NAME,
  warehouseSheetRows,
} from './nonMovingExport';
import { groupNonMovingRowsBySku } from './nonMovingGrouping';

function makeItem(overrides: Partial<NonMovingItem>): NonMovingItem {
  return {
    branch: 'OIL',
    item_code: 'PM0000817',
    item_name: 'PREFORM 21/23 GMS',
    item_group_name: 'PACKAGING MATERIAL',
    sub_group: 'PREFORM',
    warehouse: 'BH-BS',
    quantity: 10,
    value: 100,
    last_movement_date: null,
    days_since_last_movement: 187,
    consumption_ratio: 0,
    ...overrides,
  };
}

const items = [
  makeItem({ item_code: 'A', warehouse: 'BH-BS', days_since_last_movement: 60 }),
  makeItem({ item_code: 'A', warehouse: 'BH-PM', days_since_last_movement: 300 }),
  makeItem({ item_code: 'B', warehouse: 'BH-PM', days_since_last_movement: 90 }),
  makeItem({ item_code: 'C', warehouse: 'GP-RM', days_since_last_movement: 120 }),
];

function sheetRows(workbook: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(workbook.Sheets[name]);
}

describe('warehouseSheetRows', () => {
  it('buckets the warehouse rows behind the exported lines, worst idle first', () => {
    const rows = groupNonMovingRowsBySku(items);
    const byWarehouse = warehouseSheetRows(items, rows);

    expect([...byWarehouse.keys()].sort()).toEqual(['BH-BS', 'BH-PM', 'GP-RM']);
    expect(byWarehouse.get('BH-PM')?.map((i) => i.item_code)).toEqual(['A', 'B']);
  });

  it('leaves out items that were filtered off the table', () => {
    const rows = groupNonMovingRowsBySku(items).filter((row) => row.item_code === 'C');
    const byWarehouse = warehouseSheetRows(items, rows);

    expect([...byWarehouse.keys()]).toEqual(['GP-RM']);
  });
});

describe('sheetNameFor', () => {
  it('strips characters Excel refuses and caps the length', () => {
    const used = new Set<string>();
    expect(sheetNameFor('BH/BS?', used)).toBe('BH-BS-');
    expect(sheetNameFor('W'.repeat(40), used)).toHaveLength(31);
  });

  it('keeps names unique', () => {
    const used = new Set<string>();
    expect(sheetNameFor('BH-BS', used)).toBe('BH-BS');
    expect(sheetNameFor('BH-BS', used)).toBe('BH-BS (2)');
  });
});

describe('buildNonMovingWorkbook', () => {
  const rows = groupNonMovingRowsBySku(items);

  it('writes the folded table first, then one sheet per warehouse', () => {
    const workbook = buildNonMovingWorkbook({ rows, items });

    expect(workbook.SheetNames).toEqual([SUMMARY_SHEET_NAME, 'BH-BS', 'BH-PM', 'GP-RM']);
    expect(sheetRows(workbook, SUMMARY_SHEET_NAME)).toHaveLength(3);
    expect(sheetRows(workbook, 'BH-PM')).toHaveLength(2);
  });

  it('folds the multi-warehouse quantity on the summary and splits it per sheet', () => {
    const workbook = buildNonMovingWorkbook({ rows, items });
    const summary = sheetRows(workbook, SUMMARY_SHEET_NAME);
    const itemA = summary.find((row) => row['Item Code'] === 'A');

    expect(itemA?.Quantity).toBe(20);
    expect(itemA?.Warehouse).toBe('BH-BS, BH-PM');
    expect(sheetRows(workbook, 'BH-BS')[0].Quantity).toBe(10);
  });

  it('follows the selection order and skips warehouses holding none of it', () => {
    const workbook = buildNonMovingWorkbook({
      rows,
      items,
      selectedWarehouses: ['GP-RM', 'BH-BS', 'BH-XX'],
    });

    expect(workbook.SheetNames).toEqual([SUMMARY_SHEET_NAME, 'GP-RM', 'BH-BS']);
  });

  it('still writes the summary when nothing has a warehouse', () => {
    const orphan = [makeItem({ item_code: 'Z', warehouse: '' })];
    const workbook = buildNonMovingWorkbook({
      rows: groupNonMovingRowsBySku(orphan),
      items: orphan,
    });

    expect(workbook.SheetNames).toEqual([SUMMARY_SHEET_NAME]);
  });
});

describe('the packing-material aging basis', () => {
  it('says which clock produced Days Idle, on both kinds of sheet', () => {
    const packaging = makeItem({
      item_code: 'PM1',
      warehouse: 'BH-BS',
      movement_basis: 'production',
      last_warehouse_movement_date: '2026-09-06 00:00:00',
      days_since_warehouse_movement: 5,
    });
    const other = makeItem({ item_code: 'RM1', warehouse: 'BH-PM' });

    const workbook = buildNonMovingWorkbook({
      rows: groupNonMovingRowsBySku([packaging, other]),
      items: [packaging, other],
    });

    const summary = sheetRows(workbook, SUMMARY_SHEET_NAME);
    expect(summary.find((row) => row['Item Code'] === 'PM1')?.['Aged On']).toBe('Production');
    expect(summary.find((row) => row['Item Code'] === 'RM1')?.['Aged On']).toBe('Any movement');

    // The godown move the age ignores is still in the workbook.
    expect(sheetRows(workbook, 'BH-BS')[0]?.['Last Godown Movement']).toBe('2026-09-06 00:00:00');
  });
});
