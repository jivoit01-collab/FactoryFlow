import type { PmReqFilter, PmReqSort } from '../types';

// ============================================================================
// Query config
// ============================================================================

/**
 * The plan is read live from SAP and so are the movements behind it, and one
 * request costs seven HANA reads. Nothing on this board changes minute to
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
 * The buyer can still read it down any column. Every chip opens on this too:
 * each is a subset of the same buying list, so "worst" means the same thing.
 */
export const DEFAULT_SORT: PmReqSort = { key: 'short_after_benchmark_value', dir: 'desc' };

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
  {
    value: 'short',
    label: 'Short',
    hint: 'Short once the rest of the plan and the stock benchmark are both counted',
  },
  {
    value: 'plan-short',
    label: 'Short for the plan',
    hint: 'The stores cannot cover the rest of the plan, benchmark aside',
  },
  {
    value: 'benchmark',
    label: 'Under benchmark',
    hint: 'The plan is covered, but making it would leave the stores under their benchmark',
  },
  { value: 'all', label: 'Everything', hint: 'Every component on the plan' },
  {
    value: 'surplus',
    label: 'Covered',
    hint: 'The stores cover the rest of the plan and still hold their benchmark',
  },
  {
    value: 'over-issued',
    label: 'Over-issued',
    hint: 'The floor drew more than the plan called for',
  },
];

/**
 * The buyer's sheet, in the order the sheet reads it.
 *
 * `PO` and `REQ after PO` were dropped at the buyer's request: the sheet
 * answers what the plan and the benchmark need from stock, and an open order
 * is not stock. The orders are still listed in the row dialog, so nobody
 * raises a second PO against one already placed. `Req` is the benchmark
 * figure, not `req_qty` — see the row type.
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
  { key: 'benchmark_qty', label: 'Benchmark', csv: 'Benchmark', numeric: true },
  { key: 'req_after_benchmark_qty', label: 'Req', csv: 'Req', numeric: true },
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
  benchmark_qty:
    'The minimum SAP holds for this item in the same stores — the Stock Benchmark board’s figure. The stores should still hold this much once the plan is made. A dash means SAP has none set.',
  req_after_benchmark_qty:
    'On hand less the rest of the plan, less the benchmark. Negative means that much has to be bought to make the plan and leave the stores at their benchmark. Open purchase orders are not counted. Stock committed to production orders is NOT subtracted — that would count this plan’s own demand twice.',
};

export const STATUS_LABELS: Record<string, string> = {
  short: 'Short',
  benchmark: 'Under benchmark',
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
