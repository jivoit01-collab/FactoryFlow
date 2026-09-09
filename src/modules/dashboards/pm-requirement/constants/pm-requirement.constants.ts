import type { PmReqFilter, PmReqSort } from '../types';

// ============================================================================
// Query config
// ============================================================================

/**
 * The plan is read live from SAP and so are the movements behind it, and one
 * request costs six HANA reads. Nothing on this board changes minute to
 * minute: a transfer to the floor happens a few times a day and a purchase
 * order less often than that.
 */
export const PM_REQUIREMENT_STALE_TIME = 5 * 60 * 1000; // 5 minutes

/** The plan list changes when a planner authors a month. Rarely, in other words. */
export const PM_PLAN_LIST_STALE_TIME = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// The table
// ============================================================================

/**
 * Worst first, by what the gap COSTS rather than by how many pieces it is.
 *
 * 500,000 caps short and 500 tins short are not the same problem, and a board
 * sorted on pieces puts caps and labels at the top every month regardless.
 * The buyer can still read it down any column.
 */
export const DEFAULT_SORT: PmReqSort = { key: 'short_value', dir: 'desc' };

/**
 * The board opens on the buying list, not on all 196 components.
 *
 * Opening on everything means the first thing on screen is an alphabetical
 * list in which nothing is wrong, and the rows that need action are somewhere
 * below the fold. `short` is what somebody opened this board to see; the
 * filter says how many rows it is hiding.
 */
export const DEFAULT_FILTER: PmReqFilter = 'short';

export const PM_REQ_FILTERS: { value: PmReqFilter; label: string; hint: string }[] = [
  { value: 'short', label: 'Still short', hint: 'Short after open orders are netted off' },
  {
    value: 'at-risk',
    label: 'At risk',
    hint: 'Short, or covered only by an order that is late or lands after the plan',
  },
  { value: 'all', label: 'Everything', hint: 'Every component on the plan' },
  { value: 'surplus', label: 'Covered', hint: 'Stock and orders cover what is left of the plan' },
  { value: 'over-issued', label: 'Over-issued', hint: 'The floor drew more than the plan called for' },
];

/**
 * The nine columns of the buyer's sheet, in the order the sheet reads them,
 * plus the two the sheet works out in its head.
 *
 * `csv` is what the column is called in the export. The export exists because
 * this board replaces a spreadsheet, and the buyer who kept that spreadsheet
 * will want their own columns back to check it against for the first month or
 * two — which is a reasonable thing to want and cheap to give.
 */
export const PM_REQ_COLUMNS = [
  { key: 'item_code', label: 'Item Code', csv: 'Item Code', numeric: false },
  { key: 'item_name', label: 'Item Description', csv: 'Item Description', numeric: false },
  { key: 'planning_qty', label: 'Planning', csv: 'Planning', numeric: true },
  { key: 'issued_pc_qty', label: 'Issue (PC)', csv: 'Issue (PC)', numeric: true },
  { key: 'rest_planning_qty', label: 'Rest Planning', csv: 'Rest Planning', numeric: true },
  { key: 'on_hand_qty', label: 'On hand', csv: 'On hand', numeric: true },
  { key: 'req_qty', label: 'Req', csv: 'Req', numeric: true },
  { key: 'open_po_qty', label: 'PO', csv: 'PO', numeric: true },
  { key: 'req_after_po_qty', label: 'REQ after PO', csv: 'REQ after PO', numeric: true },
] as const;

// ============================================================================
// Wording
// ============================================================================

/**
 * What each column IS, shown on hover.
 *
 * Every one of these is a definition somebody could reasonably get wrong, and
 * three of them are definitions this factory HAS got wrong before — which is
 * why they are in the tooltip rather than only in the backend docstrings.
 */
export const COLUMN_HELP: Record<string, string> = {
  planning_qty:
    'What the month’s production plan needs, from SAP’s own bills of material. Plan quantity × component per unit, added up across every SKU that uses it.',
  issued_pc_qty:
    'What has already reached the production floor since the 1st — transferred up from the stores, or blown and made in-house. Treated as plan already produced.',
  rest_planning_qty:
    'Planning less what the floor has taken. Goes negative where more was drawn than the plan called for, which is shown rather than hidden.',
  on_hand_qty:
    'Stock in the stores that feed the floor. The floor’s own store is deliberately excluded — it is already counted as plan produced.',
  req_qty:
    'On hand less the rest of the plan. Negative means short by that much. Stock committed to production orders is NOT subtracted — that would count this plan’s own demand twice.',
  open_po_qty:
    'Quantity on purchase orders still open, whenever they were raised and wherever they are due.',
  req_after_po_qty:
    'Req plus what is on order. Still negative means the factory is short even after everything already bought arrives.',
};

export const STATUS_LABELS: Record<string, string> = {
  short: 'Short',
  'po-covered': 'On order',
  'po-risk': 'Order at risk',
  'over-issued': 'Over-issued',
  covered: 'Covered',
};

// ============================================================================
// Dates
// ============================================================================

const DAY_LABEL = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const DAY_YEAR_LABEL = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * A date the API sent as `YYYY-MM-DD`, read in UTC.
 *
 * Parsed in UTC throughout. A local-time reading of a bare date shifts it by
 * the offset and can render the 1st of the month as the last day of the month
 * before — which on this board would misstate the period the issue figure
 * covers.
 */
export function formatDay(value: string | null | undefined, withYear = false): string {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return '—';
  return (withYear ? DAY_YEAR_LABEL : DAY_LABEL).format(parsed);
}

/** "1 – 9 Sep 2026", the window the issue column added up. */
export function formatWindow(from: string, to: string): string {
  if (!from || !to) return '—';
  if (from === to) return formatDay(from, true);
  return `${formatDay(from)} – ${formatDay(to, true)}`;
}

/** A plan named for a human: its own name if it has one, else its code. */
export function planLabel(plan: { name?: string; code?: string; abs_id?: number }): string {
  const name = (plan.name || '').trim();
  const code = (plan.code || '').trim();
  if (code && name) return `${code} — ${name}`;
  return code || name || `Plan ${plan.abs_id ?? ''}`.trim();
}

/**
 * The short label for the picker.
 *
 * The full SAP name is "OIL Monthly Production Planning for the Sep Month
 * 2026" on every single row, so a dropdown of full names is a dropdown of
 * identical strings. The code is what distinguishes them.
 */
export function planShortLabel(plan: { code?: string; name?: string; abs_id?: number }): string {
  const code = (plan.code || '').trim();
  return code || planLabel(plan);
}
