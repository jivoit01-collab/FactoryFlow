/**
 * A range of prices or rates as a spreadsheet: every figure held, a row each;
 * the figure the chart draws as a day-by-series grid (EXIM's Compare view);
 * and each series' first, last, highest and lowest. Plain: this app ships the
 * unstyled spreadsheet library. Numbers go in as numbers, so the sheet adds up.
 */
import * as XLSX from 'xlsx';

import type { PriceRangeRow, PriceSource, RateRange } from '../../types';
import type { FigureDef, SeriesStats } from './priceFormat';

type Cell = string | number;

const SOURCE_LABEL: Record<PriceSource, string> = {
  SHEET: 'The price sheet',
  EXIM: "EXIM's history",
};

/** `2026-09-30` → `30-09-2026`. */
function dmy(iso: string): string {
  return iso.slice(0, 10).split('-').reverse().join('-');
}

/** Where a name stands in the sheet's order; one it does not know goes last. */
function rank(order: string[], name: string): number {
  const at = order.indexOf(name);
  return at === -1 ? order.length : at;
}

/** A tab's name: at most 31 characters, none of the ones Excel refuses. */
function tabName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
}

function sheetOf(rows: Cell[][], numberFrom: { row: number; col: number }): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const columns = Math.max(...rows.map((row) => row.length));
  sheet['!cols'] = Array.from({ length: columns }, (_, c) => ({
    wch: Math.min(36, Math.max(8, ...rows.slice(1).map((row) => String(row[c] ?? '').length)) + 2),
  }));
  for (let r = numberFrom.row; r < rows.length; r += 1) {
    for (let c = numberFrom.col; c < columns; c += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') cell.z = '#,##0.00';
    }
  }
  return sheet;
}

/** Days down, series across; blank where a series was not quoted. */
function gridSheet(
  title: string,
  dates: string[],
  order: string[],
  valueAt: (date: string, key: string) => number | undefined,
): XLSX.WorkSheet {
  const rows: Cell[][] = [[title], ['Day', ...order]];
  for (const date of dates) {
    rows.push([dmy(date), ...order.map((key) => valueAt(date, key) ?? '')]);
  }
  return sheetOf(rows, { row: 2, col: 1 });
}

function summarySheet(
  title: string,
  heading: string,
  order: string[],
  stats: Map<string, SeriesStats>,
): XLSX.WorkSheet {
  const rows: Cell[][] = [
    [title],
    [
      heading,
      'First day',
      'First (₹)',
      'Last day',
      'Last (₹)',
      'Change (₹)',
      'Change (%)',
      'Highest (₹)',
      'Highest on',
      'Lowest (₹)',
      'Lowest on',
      'Days quoted',
    ],
  ];
  for (const key of order) {
    const s = stats.get(key);
    if (!s) {
      rows.push([key, 'Not quoted in the range']);
      continue;
    }
    rows.push([
      key,
      dmy(s.first.date),
      s.first.value,
      dmy(s.last.date),
      s.last.value,
      s.change ? Number(s.change.amount.toFixed(2)) : '',
      s.change?.pct != null ? Number(s.change.pct.toFixed(2)) : '',
      s.high.value,
      dmy(s.high.date),
      s.low.value,
      dmy(s.low.date),
      s.days,
    ]);
  }
  return sheetOf(rows, { row: 2, col: 1 });
}

export function exportPriceRange({
  rows,
  from,
  to,
  figure,
  commodities,
  stats,
}: {
  rows: PriceRangeRow[];
  from: string;
  to: string;
  /** The figure the chart draws, for the grid and the summary. */
  figure: FigureDef;
  commodities: string[];
  stats: Map<string, SeriesStats>;
}) {
  const span = `${dmy(from)} to ${dmy(to)}`;
  const sorted = [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.commodity.localeCompare(b.commodity),
  );

  const all: Cell[][] = [
    [
      'Day',
      'Commodity',
      'Factory (₹/kg)',
      'With packing (₹/kg)',
      'With GST (₹/kg)',
      'With GST (₹/L)',
      'Read from',
    ],
    ...sorted.map((r) => [
      dmy(r.date),
      r.commodity,
      r.factory_price_kg,
      r.packed_price_kg,
      r.with_gst_kg,
      r.with_gst_litre,
      SOURCE_LABEL[r.source] ?? r.source,
    ]),
  ];

  const byDay = new Map(sorted.map((r) => [`${r.date}|${r.commodity}`, r]));
  const dates = [...new Set(sorted.map((r) => r.date))];
  const title = `${figure.label} (${figure.unit}), ${span}`;

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheetOf(all, { row: 1, col: 2 }), 'Prices');
  XLSX.utils.book_append_sheet(
    book,
    gridSheet(title, dates, commodities, (date, key) => byDay.get(`${date}|${key}`)?.[figure.key]),
    tabName(`${figure.label} by day`),
  );
  XLSX.utils.book_append_sheet(
    book,
    summarySheet(title, 'Commodity', commodities, stats),
    'Highest and lowest',
  );
  XLSX.writeFile(book, `oil-prices-${from}-to-${to}.xlsx`);
}

export function exportRateRange({
  rows,
  from,
  to,
  pack,
  packs,
  commodities,
  stats,
}: {
  rows: RateRange['rows'];
  from: string;
  to: string;
  /** The pack the chart draws, for the grid and the summary. */
  pack: string;
  /** Every pack and commodity, in the sheet's order. */
  packs: string[];
  commodities: string[];
  stats: Map<string, SeriesStats>;
}) {
  const span = `${dmy(from)} to ${dmy(to)}`;
  const sorted = [...rows].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      rank(packs, a.pack_type) - rank(packs, b.pack_type) ||
      rank(commodities, a.commodity) - rank(commodities, b.commodity),
  );

  const all: Cell[][] = [
    ['Day', 'Pack', 'Commodity', 'Rate (₹ a pack)'],
    ...sorted.map((r) => [dmy(r.date), r.pack_type, r.commodity, r.rate]),
  ];

  const ofPack = sorted.filter((r) => r.pack_type === pack);
  const byDay = new Map(ofPack.map((r) => [`${r.date}|${r.commodity}`, r.rate]));
  const dates = [...new Set(ofPack.map((r) => r.date))];
  const title = `${pack}, ₹ a pack, ${span}`;

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheetOf(all, { row: 1, col: 3 }), 'Rates');
  XLSX.utils.book_append_sheet(
    book,
    gridSheet(title, dates, commodities, (date, key) => byDay.get(`${date}|${key}`)),
    tabName(`${pack} by day`),
  );
  XLSX.utils.book_append_sheet(
    book,
    summarySheet(title, 'Commodity', commodities, stats),
    'Highest and lowest',
  );
  XLSX.writeFile(book, `jivo-rates-${from}-to-${to}.xlsx`);
}
