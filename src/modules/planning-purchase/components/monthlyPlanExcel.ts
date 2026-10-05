/**
 * A version of the monthly plan as a spreadsheet: the roll-up on screen, then
 * every SKU the filters leave with its weeks. Litres throughout, as the sheet
 * was uploaded. Plain: this app ships the unstyled spreadsheet library.
 */
import * as XLSX from 'xlsx';

import type { MonthlyPlanRow, MonthlyPlanUpload } from '../types';
import {
  figuresOf,
  GROUP_LABEL,
  type PlanFigures,
  type PlanGroup,
  type PlanGroupBy,
  versionLabel,
} from './monthlyPlan';

function figureColumns(f: PlanFigures) {
  return {
    'Commodity (L)': f.commodity,
    'Commodity W1': f.commodityWeeks[0],
    'Commodity W2': f.commodityWeeks[1],
    'Commodity W3': f.commodityWeeks[2],
    'Commodity W4': f.commodityWeeks[3],
    'Premium (L)': f.premium,
    'Premium W1': f.premiumWeeks[0],
    'Premium W2': f.premiumWeeks[1],
    'Premium W3': f.premiumWeeks[2],
    'Premium W4': f.premiumWeeks[3],
    'E-com (L)': f.ecom,
    'Total (L)': f.total,
    'Total (KL)': Math.round(f.total) / 1000,
  };
}

function sheetOf(data: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(data);
  const keys = Object.keys(data[0]);
  sheet['!cols'] = keys.map((key) => ({
    wch: Math.min(
      40,
      Math.max(key.length, ...data.map((row) => String(row[key] ?? '').length)) + 2,
    ),
  }));
  return sheet;
}

export function exportMonthlyPlan(
  upload: MonthlyPlanUpload,
  by: PlanGroupBy,
  groups: PlanGroup[],
  total: PlanFigures,
  rows: MonthlyPlanRow[],
) {
  const label = GROUP_LABEL[by];
  const summary: Record<string, unknown>[] = groups.length
    ? [
        ...groups.map((g) => ({
          [label]: g.label,
          ...(g.code ? { Code: g.code } : { SKUs: g.skus }),
          ...figureColumns(g),
        })),
        {
          [label]: 'Total',
          ...(by === 'sku' ? { Code: '' } : { SKUs: rows.length }),
          ...figureColumns(total),
        },
      ]
    : [{ Message: 'No SKU matches' }];

  const skus: Record<string, unknown>[] = rows.length
    ? rows.map((row) => ({
        Code: row.code,
        SKU: row.sku,
        Brand: row.brand,
        Head: row.head,
        Category: row.category,
        'Sub-category': row.sub_category,
        'Per litres': row.per_ltrs === null ? '' : Number(row.per_ltrs),
        'Litres a box': row.ltrs_per_box === null ? '' : Number(row.ltrs_per_box),
        'Case pack': row.case_pack === null ? '' : Number(row.case_pack),
        ...figureColumns(figuresOf(row)),
        'Sheet row': row.source_row ?? '',
      }))
    : [{ Message: 'No SKU matches' }];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheetOf(summary), `By ${label}`.slice(0, 31));
  XLSX.utils.book_append_sheet(book, sheetOf(skus), 'SKUs');
  const name = versionLabel(upload).toLowerCase().replace(/\s+/g, '-');
  XLSX.writeFile(book, `monthly-plan-${name}.xlsx`);
}
