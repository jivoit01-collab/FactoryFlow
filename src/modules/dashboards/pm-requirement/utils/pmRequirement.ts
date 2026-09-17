import { PM_REQ_COLUMNS } from '../constants';
import type { PmReqFilter, PmReqRow, PmReqSort, PmReqSortKey, PmReqStatus } from '../types';

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

/** A quantity with its unit, for a headline where the unit is not obvious. */
export function formatQtyWithUom(value: number, uom?: string): string {
  const formatted = formatQty(value);
  return uom ? `${formatted} ${uom}` : formatted;
}

/**
 * A signed quantity, with the sign kept.
 *
 * `Req` and `REQ after PO` are negative when short, and that minus sign is
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
 * Order matters, and the first test is deliberately the shortfall: a row that
 * is still short after everything on order arrives is short, whatever else is
 * also true of it. `po-risk` sits above `po-covered` for the same reason —
 * an order that is late or lands after the plan closes should never be read
 * as a gap that is closed.
 */
export function rowStatus(row: PmReqRow): PmReqStatus {
  if (row.req_after_po_qty < 0) return 'short';
  if (row.po_covers_shortage && (row.po_overdue || row.po_due_after_plan)) return 'po-risk';
  if (row.po_covers_shortage) return 'po-covered';
  if (row.over_issued) return 'over-issued';
  return 'covered';
}

/**
 * Is this a row somebody should act on today?
 *
 * Wider than "still short": a shortage covered only by an order that is
 * already late, or not due until after the plan is over, is a shortage that
 * needs chasing even though the arithmetic says it is covered.
 */
export function isAtRisk(row: PmReqRow): boolean {
  if (row.req_after_po_qty < 0) return true;
  return row.req_qty < 0 && (row.po_overdue || row.po_due_after_plan);
}

// ============================================================================
// Reading the table
// ============================================================================

export function filterRows(rows: PmReqRow[], filter: PmReqFilter): PmReqRow[] {
  switch (filter) {
    case 'short':
      return rows.filter((row) => row.req_after_po_qty < 0);
    case 'at-risk':
      return rows.filter(isAtRisk);
    case 'surplus':
      return rows.filter((row) => row.req_after_po_qty >= 0 && !row.over_issued);
    case 'over-issued':
      return rows.filter((row) => row.over_issued);
    case 'over-purchased':
      return rows.filter((row) => row.over_purchased);
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
 * Shortfall is summed from `short_qty` — the positive magnitude — so a
 * surplus row can never cancel a short one.
 */
export function visibleTotals(rows: PmReqRow[]) {
  const sum = (pick: (row: PmReqRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);

  return {
    item_count: rows.length,
    planning_qty: sum((row) => row.planning_qty),
    issued_pc_qty: sum((row) => row.issued_pc_qty),
    rest_planning_qty: sum((row) => row.rest_planning_qty),
    on_hand_qty: sum((row) => row.on_hand_qty),
    open_po_qty: sum((row) => row.open_po_qty),
    // The REQ after PO column, added straight down. A NET figure: a surplus
    // on one component does offset a shortage on another in it, which is why
    // `short_qty` is carried beside it rather than replaced by it. The two
    // answer different questions -- "where does the plan land overall" and
    // "how much has to be bought" -- and the footer shows both.
    req_after_po_qty: sum((row) => row.req_after_po_qty),
    short_qty: sum((row) => row.short_qty),
    short_value: sum((row) => row.short_value),
    // How many of the rows on screen the shortfall is spread across, so the
    // footer can say "X short across Y components" rather than leaving a
    // lone figure to be read as a sum of the column above it.
    short_count: rows.filter((row) => row.req_after_po_qty < 0).length,
    // Summed over the FLAGGED rows only, matching what the backend totals do:
    // a row over by a thousandth of a carton is not part of an excess anybody
    // is going to act on, so it must not appear in the figure either.
    over_purchase_qty: sum((row) => (row.over_purchased ? row.over_purchase_qty : 0)),
    over_purchase_value: sum((row) => (row.over_purchased ? row.over_purchase_value : 0)),
    over_purchased_count: rows.filter((row) => row.over_purchased).length,
  };
}

/**
 * Which kind of over-purchase a row is.
 *
 * An excess on an order that lands after the plan closes is usually next
 * month's stock bought early; an excess on an order already past due is money
 * committed to a delivery nobody has chased. Neither is the same as an excess
 * arriving inside the plan, and the row says which rather than lumping all
 * three together as "over-purchased".
 */
export function overPurchaseKind(row: PmReqRow): 'overdue' | 'forward' | 'now' {
  if (row.po_due_after_plan) return 'forward';
  if (row.po_overdue) return 'overdue';
  return 'now';
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
  const extra = [
    'Family',
    'UoM',
    'Status',
    'Shortfall',
    'Shortfall value',
    'To buy',
    'Over-purchased',
    'Over-purchased value',
    'PO due',
  ];

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
        row.req_qty,
        row.open_po_qty,
        row.req_after_po_qty,
        row.sub_group,
        row.uom,
        rowStatus(row),
        row.short_qty,
        row.short_value,
        row.to_buy_qty,
        row.over_purchase_qty,
        row.over_purchase_value,
        row.po_earliest_due ?? '',
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
