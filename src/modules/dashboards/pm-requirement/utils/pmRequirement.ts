import { PM_REQ_COLUMNS } from '../constants';
import type {
  PmReqFilter,
  PmReqResponse,
  PmReqRow,
  PmReqSort,
  PmReqSortKey,
  PmReqStatus,
} from '../types';

// ============================================================================
// Formatting
// ============================================================================

const qtyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const preciseQtyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });
const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * A quantity for a table cell.
 *
 * Sub-unit figures keep their decimals: a BOM writes 16 cartons per case as
 * 0.0625 per bottle, and a requirement of 812.5 cartons rounds to 813 on
 * screen while the arithmetic behind `Req` keeps the half. Rounding the
 * display only is why a row can read 813 − 0 = 1,064 against 1,876 on hand
 * and still be right.
 */
export function formatQty(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude > 0 && magnitude < 100) return preciseQtyFormatter.format(value);
  return qtyFormatter.format(value);
}

/**
 * SAP's inventory unit as the short label the board prints after a figure.
 *
 * This board is NOT all pieces, which is the whole reason the label exists.
 * Of Oil's 881 packing-material items 851 are PCS, but 13 are kilograms, 9
 * metres, 7 "nos" and 1 grams — and they are not obscure ones: TAPE LOGO
 * PRINTED is in METRES and is called for by 61 of the SKUs on the September
 * 2026 plan, with 2,03,902 of it on hand. A metre figure sitting unlabelled
 * in the same column as a count of caps is a number somebody will read as
 * pieces, and act on.
 *
 * Mapped rather than printed raw so the sheet reads in the units people say
 * out loud — `KGS` is written kg, `MTR` is m. Anything SAP holds that is not
 * in the map is lower-cased and printed as it stands: an unknown unit shown
 * as itself is honest, and inventing a translation for it would not be.
 */
const UNIT_LABELS: Record<string, string> = {
  PCS: 'pcs',
  PC: 'pcs',
  NOS: 'nos',
  NO: 'nos',
  KGS: 'kg',
  KG: 'kg',
  GMS: 'g',
  GM: 'g',
  MTR: 'm',
  MTS: 'm',
  MTRS: 'm',
  LTR: 'L',
  LTRS: 'L',
};

/** The unit to print after a quantity, or '' where SAP holds none. */
export function unitLabel(uom?: string | null): string {
  const code = (uom ?? '').trim();
  if (!code) return '';
  return UNIT_LABELS[code.toUpperCase()] ?? code.toLowerCase();
}

/** A quantity with its unit, for a headline where the unit is not obvious. */
export function formatQtyWithUom(value: number, uom?: string | null): string {
  const unit = unitLabel(uom);
  const formatted = formatQty(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

/** The same, keeping the minus sign that says a row is short. */
export function formatSignedWithUom(value: number, uom?: string | null): string {
  const unit = unitLabel(uom);
  const formatted = formatSigned(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * The unit every row on screen shares, or null where they do not.
 *
 * What the footer needs before it adds a column down. Six of the 197
 * components on the September 2026 plan are in metres or kilograms, so an
 * unfiltered total of `On hand` adds 2,03,902 metres of tape to a count of
 * caps. The sum is not a smaller truth than the rows above it, it is not a
 * quantity at all, and the footer says so instead of printing it.
 */
export function sharedUnit(rows: PmReqRow[]): string | null {
  const units = distinctUnits(rows);
  if (units.length !== 1) return null;
  return units[0] || null;
}

/**
 * Every unit present in a set of rows, commonest first.
 *
 * So the footer can name what it declined to add rather than leaving a dash
 * somebody reads as a figure that failed to calculate.
 */
export function distinctUnits(rows: PmReqRow[]): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const unit = unitLabel(row.uom);
    counts.set(unit, (counts.get(unit) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([unit]) => unit);
}

/**
 * A signed quantity, with the sign kept.
 *
 * `Req` is negative when short, and that minus sign is
 * the single most important character on the board. `Intl` renders it, but a
 * value that rounds to zero from below would print "-0", so a magnitude under
 * half a unit is shown as a plain zero.
 */
export function formatSigned(value: number): string {
  if (Math.abs(value) < 0.5 && Math.abs(value) > 0) return formatQty(value);
  if (Object.is(value, -0) || (value < 0 && Math.round(value) === 0)) return '0';
  return formatQty(value);
}

/** Rupees in the units this factory speaks — crore and lakh. Sign preserved. */
export function formatInrCompact(value: number): string {
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);

  if (magnitude >= 10_000_000) return `${sign}₹${(magnitude / 10_000_000).toFixed(2)} Cr`;
  if (magnitude >= 100_000) return `${sign}₹${(magnitude / 100_000).toFixed(2)} L`;
  return rupeeFormatter.format(value);
}

export function formatInr(value: number): string {
  return rupeeFormatter.format(value);
}

/** A piece count for a card headline: 1.18 Cr rather than 11,774,803. */
export function formatQtyCompact(value: number): string {
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);

  if (magnitude >= 10_000_000) return `${sign}${(magnitude / 10_000_000).toFixed(2)} Cr`;
  if (magnitude >= 100_000) return `${sign}${(magnitude / 100_000).toFixed(2)} L`;
  return qtyFormatter.format(value);
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

// ============================================================================
// What a row is
// ============================================================================

/**
 * One row in a word.
 *
 * Order matters. Short for the plan comes first because it is the one that
 * stops production; under benchmark is a restock, still worth buying but not
 * this month's emergency. Both outrank over-issued: a row that is short of
 * something is short, whatever else is also true of it.
 */
export function rowStatus(row: PmReqRow): PmReqStatus {
  if (row.req_qty < 0) return 'short';
  if (row.req_after_benchmark_qty < 0) return 'benchmark';
  if (row.over_issued) return 'over-issued';
  return 'covered';
}

/**
 * The response with the benchmark figures filled in where they are missing.
 *
 * The two repos deploy separately, and a backend one release behind sends no
 * benchmark. Read that as "no benchmark" — `Req` falls back to the plan alone,
 * which is exactly what that backend computed — rather than letting every
 * figure on the board read `NaN` until the other deploy lands.
 */
export function withBenchmarkDefaults(response: PmReqResponse): PmReqResponse {
  const rows = response.data.map((row) => {
    if (typeof row.req_after_benchmark_qty === 'number') return row;
    const short = Math.max(0, -row.req_qty);
    return {
      ...row,
      benchmark_qty: 0,
      req_after_benchmark_qty: row.req_qty,
      short_after_benchmark_qty: short,
      short_after_benchmark_value: short * (row.unit_price || 0),
    };
  });
  const totals = response.totals;
  if (typeof totals.short_after_benchmark_count === 'number') {
    return { ...response, data: rows };
  }
  // With no benchmark, short for the plan and short overall are one set.
  const shortValue = rows.reduce((sum, row) => sum + row.short_after_benchmark_value, 0);
  return {
    ...response,
    data: rows,
    totals: {
      ...totals,
      short_before_po_value: shortValue,
      short_after_benchmark_count: totals.short_before_po_count,
      short_after_benchmark_qty: totals.short_before_po_qty,
      short_after_benchmark_value: shortValue,
      benchmark_gap_count: 0,
      benchmark_count: 0,
      benchmark_qty: 0,
    },
  };
}

// ============================================================================
// Reading the table
// ============================================================================

export function filterRows(rows: PmReqRow[], filter: PmReqFilter): PmReqRow[] {
  switch (filter) {
    case 'short':
      return rows.filter((row) => row.req_after_benchmark_qty < 0);
    case 'plan-short':
      return rows.filter((row) => row.req_qty < 0);
    case 'benchmark':
      return rows.filter((row) => row.req_qty >= 0 && row.req_after_benchmark_qty < 0);
    case 'surplus':
      return rows.filter((row) => row.req_after_benchmark_qty >= 0 && !row.over_issued);
    case 'over-issued':
      return rows.filter((row) => row.over_issued);
    case 'all':
    default:
      return rows;
  }
}

/**
 * Rows matching a search, on code or description.
 *
 * Every term must match somewhere, so "carton 1 ltr" narrows rather than
 * widening the way an OR would. The buyer searches for "PM0000079" and for
 * "full green" and should not have to know which field they are in, so both
 * are searched.
 *
 * SHORT TERMS ARE NOT MATCHED AGAINST THE ITEM CODE, and that rule is
 * load-bearing rather than fussy. Every code here is `PM` followed by seven
 * digits, so a bare "5" is a substring of a third of the item master:
 * searching "caps 5" for the 5 litre caps would otherwise also return
 * PM0000235 — CAPS 1 LTR — because its CODE contains a 5. Sizes live in the
 * description, part numbers in the code, and three characters is the length
 * at which a term stops being a digit fragment and starts being a code the
 * buyer actually typed.
 */
const MIN_CODE_TERM_LENGTH = 3;

export function searchRows(rows: PmReqRow[], query: string): PmReqRow[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return rows;

  return rows.filter((row) => {
    const code = row.item_code.toLowerCase();
    const description = `${row.item_name} ${row.sub_group}`.toLowerCase();

    return terms.every(
      (term) =>
        description.includes(term) || (term.length >= MIN_CODE_TERM_LENGTH && code.includes(term)),
    );
  });
}

/** Rows in one packaging family, or all of them. */
export function filterByFamily(rows: PmReqRow[], family: string): PmReqRow[] {
  if (!family) return rows;
  return rows.filter((row) => row.sub_group === family);
}

/** The packaging families present, alphabetically, for the family picker. */
export function familiesOf(rows: PmReqRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.sub_group) seen.add(row.sub_group);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/**
 * The same rows read down a different column.
 *
 * Never re-requests: the API returns every component on the plan, so sorting
 * and filtering are both readings of the one answer already on the client.
 * Item code breaks every tie, so the order is stable and a row does not jump
 * about between renders of identical data.
 */
export function sortRows(rows: PmReqRow[], sort: PmReqSort): PmReqRow[] {
  const factor = sort.dir === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = a[sort.key as PmReqSortKey];
    const right = b[sort.key as PmReqSortKey];

    let comparison: number;
    if (typeof left === 'string' || typeof right === 'string') {
      comparison = String(left ?? '').localeCompare(String(right ?? ''));
    } else {
      comparison = Number(left ?? 0) - Number(right ?? 0);
    }

    if (comparison !== 0) return comparison * factor;
    return a.item_code.localeCompare(b.item_code);
  });
}

/**
 * The next sort state when a column header is clicked.
 *
 * A new column starts descending for a number and ascending for text, which
 * is what somebody means both times: the biggest shortage first, and the item
 * list from A.
 */
export function nextSort(current: PmReqSort, key: PmReqSortKey): PmReqSort {
  if (current.key === key) {
    return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  const isText = key === 'item_code' || key === 'item_name';
  return { key, dir: isText ? 'asc' : 'desc' };
}

// ============================================================================
// The totals of what is on screen
// ============================================================================

/**
 * Column sums for the rows currently shown.
 *
 * Separate from the API's own totals on purpose: those describe the whole
 * plan, these describe the filtered view, and a footer that showed the whole
 * plan under a filtered table would not add up to the column above it.
 * Shortfall is summed from `short_after_benchmark_qty` — the positive
 * magnitude — so a surplus row can never cancel a short one.
 */
export function visibleTotals(rows: PmReqRow[]) {
  const sum = (pick: (row: PmReqRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);

  return {
    item_count: rows.length,
    // The unit the columns below are in -- null where the rows on screen do
    // not agree, which is the footer's cue not to print a sum at all.
    uom: sharedUnit(rows),
    units: distinctUnits(rows),
    planning_qty: sum((row) => row.planning_qty),
    issued_pc_qty: sum((row) => row.issued_pc_qty),
    rest_planning_qty: sum((row) => row.rest_planning_qty),
    on_hand_qty: sum((row) => row.on_hand_qty),
    benchmark_qty: sum((row) => row.benchmark_qty),
    // The Req column, added straight down. A NET figure: a surplus on one
    // component does offset a shortage on another in it, which is why
    // `short_qty` is carried beside it rather than replaced by it. The two
    // answer different questions -- "where does the plan land overall" and
    // "how much has to be bought" -- and the footer shows both.
    req_qty: sum((row) => row.req_after_benchmark_qty),
    short_qty: sum((row) => row.short_after_benchmark_qty),
    short_value: sum((row) => row.short_after_benchmark_value),
    // How many of the rows on screen the shortfall is spread across, so the
    // footer can say "X short across Y components" rather than leaving a
    // lone figure to be read as a sum of the column above it.
    short_count: rows.filter((row) => row.req_after_benchmark_qty < 0).length,
  };
}

// ============================================================================
// Export
// ============================================================================

function csvCell(value: string | number): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * The rows on screen as CSV, in the buyer's own column order.
 *
 * Exports what is FILTERED AND SORTED, not the whole plan: somebody who has
 * narrowed the table to cartons still short is exporting that list, and
 * handing them all 196 components instead would be answering a question they
 * did not ask.
 *
 * Quantities are written unrounded. The screen rounds for readability; a
 * spreadsheet the buyer is going to total in Excel must carry the same
 * fractions the arithmetic used, or their total will disagree with ours by a
 * few units and the whole board becomes suspect.
 */
export function toCsv(rows: PmReqRow[]): string {
  const header = PM_REQ_COLUMNS.map((column) => column.csv);
  // `Req (plan only)` is the old Req, before the benchmark: the buyer's
  // spreadsheet has that column, and without it the export cannot be checked
  // against it.
  const extra = ['Family', 'UoM', 'Status', 'Req (plan only)', 'Shortfall', 'Shortfall value'];

  const lines = [
    [...header, ...extra].map(csvCell).join(','),
    ...rows.map((row) =>
      [
        row.item_code,
        row.item_name,
        row.planning_qty,
        row.issued_pc_qty,
        row.rest_planning_qty,
        row.on_hand_qty,
        row.benchmark_qty,
        row.req_after_benchmark_qty,
        row.sub_group,
        row.uom,
        rowStatus(row),
        row.req_qty,
        row.short_after_benchmark_qty,
        row.short_after_benchmark_value,
      ]
        .map(csvCell)
        .join(','),
    ),
  ];

  return lines.join('\r\n');
}

/** A filename that says which plan and which day the figures came from. */
export function csvFilename(planCode: string, asOf: string): string {
  const slug = (planCode || 'plan').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
  return `pm-requirement-${slug}-${asOf}.csv`;
}
