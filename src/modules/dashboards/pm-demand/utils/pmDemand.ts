import type { CoverStatus, PmDemandItem, PmDemandUpstreamItem } from '../types';

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
 * A quantity with its unit, because a bare number on this board is ambiguous:
 * tape is metres, caps are pieces, film is kilos. Sub-unit quantities keep
 * their decimals -- 0.05 kg of ink per bottle rounds to nothing otherwise.
 */
export function formatQty(value: number, uom?: string): string {
  const magnitude = Math.abs(value);
  const formatted =
    magnitude > 0 && magnitude < 100
      ? preciseQtyFormatter.format(value)
      : qtyFormatter.format(value);
  return uom ? `${formatted} ${uom}` : formatted;
}

/** Full rupees, for a table cell that has room for them. */
export function formatInr(value: number): string {
  return rupeeFormatter.format(value);
}

/**
 * Rupees in the units this factory speaks -- crore and lakh -- for headline
 * tiles where a nine-digit figure would not fit and could not be read at a
 * glance anyway. The sign is preserved: a negative variance is money saved.
 */
export function formatInrCompact(value: number): string {
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);

  if (magnitude >= 10_000_000) {
    return `${sign}₹${(magnitude / 10_000_000).toFixed(2)} Cr`;
  }
  if (magnitude >= 100_000) {
    return `${sign}₹${(magnitude / 100_000).toFixed(2)} L`;
  }
  return rupeeFormatter.format(value);
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

// ============================================================================
// Variance reading
// ============================================================================

export type VarianceTone = 'over' | 'under' | 'match' | 'unknown';

/**
 * Below this, actual and recipe are treated as agreeing.
 *
 * SAP backflushes most issues straight off the BOM, so the great majority of
 * items match to the unit and a 0% threshold would paint the whole table as a
 * finding. One percent is the band in which a rounding on a batch quantity
 * lives; above it somebody made a decision.
 */
export const VARIANCE_MATCH_THRESHOLD_PCT = 1;

export function varianceTone(item: Pick<PmDemandItem, 'variance_pct'>): VarianceTone {
  const pct = item.variance_pct;
  if (pct === null || pct === undefined) return 'unknown';
  if (Math.abs(pct) < VARIANCE_MATCH_THRESHOLD_PCT) return 'match';
  return pct > 0 ? 'over' : 'under';
}

// ============================================================================
// Cover
// ============================================================================

/**
 * Cover as a buyer reads it.
 *
 * Working days, not calendar days -- Sunday consumes nothing, so quoting
 * calendar days would flatter every figure by about a fifth. The unit is
 * spelled out for exactly that reason: "13 days" invites the reader to count
 * on a calendar and be wrong by a weekend.
 */
export function formatCover(days: number | null | undefined): string {
  if (days === null || days === undefined || Number.isNaN(days)) return '--';
  if (days < 1) return '<1 working day';
  if (days >= 400) return '400+ working days';
  return `${days.toFixed(days < 10 ? 1 : 0)} working days`;
}

export const COVER_STYLES: Record<CoverStatus, string> = {
  critical: 'text-red-600 dark:text-red-500',
  low: 'text-amber-600 dark:text-amber-500',
  ok: 'text-muted-foreground',
  unknown: 'text-muted-foreground',
};

export const COVER_LABELS: Record<CoverStatus, string> = {
  critical: 'Order now',
  low: 'Watch',
  ok: 'Covered',
  // Nothing consumed in the period, so there is no run-out date to give.
  unknown: 'Not consumed',
};

/**
 * Cover is judged on stock PLUS open purchase orders, so the labels have to
 * say which figure a reader is looking at. Without this, an item showing
 * "0.3 working days" next to a green "Covered" badge looks like a bug rather
 * than an item that is thin on the shelf and heavily on order.
 */
export function describeCover(item: {
  days_cover: number | null;
  days_cover_incl_po: number | null;
  open_po_qty: number;
}): string {
  if (item.days_cover_incl_po === null) return 'Nothing consumed this period';
  if (item.open_po_qty <= 0) return `${formatCover(item.days_cover)} on hand, nothing on order`;
  return `${formatCover(item.days_cover)} on hand, ${formatCover(
    item.days_cover_incl_po,
  )} with open orders`;
}

// ============================================================================
// Client-side narrowing
// ============================================================================

export interface PmItemNarrowing {
  search?: string;
  subGroup?: string[];
}

/**
 * Narrows the rows already on screen. Shares and totals are deliberately NOT
 * recomputed against the narrowed set -- a share is of the period, so filtering
 * to CAPS must not report CAPS as 100% of the packaging spend.
 */
export function filterPmItems<T extends { item_code: string; item_name: string; sub_group: string }>(
  items: T[],
  { search, subGroup }: PmItemNarrowing,
): T[] {
  let result = items;

  if (subGroup?.length) {
    const wanted = new Set(subGroup);
    result = result.filter((item) => wanted.has(item.sub_group || 'UNGROUPED'));
  }

  if (search?.trim()) {
    const term = search.trim().toLowerCase();
    result = result.filter(
      (item) =>
        item.item_code.toLowerCase().includes(term) ||
        item.item_name.toLowerCase().includes(term) ||
        (item.sub_group || '').toLowerCase().includes(term),
    );
  }

  return result;
}

/** Every packaging family present in any list, for the filter dropdown. */
export function collectSubGroups(
  ...lists: (PmDemandItem[] | PmDemandUpstreamItem[] | undefined)[]
): string[] {
  const families = new Set<string>();
  for (const list of lists) {
    for (const item of list ?? []) {
      families.add(item.sub_group || 'UNGROUPED');
    }
  }
  return [...families].sort();
}

// ============================================================================
// The funnel
// ============================================================================

export interface PmFunnelStage {
  key: 'consumed' | 'dispatched' | 'retained';
  label: string;
  qty: number;
  value: number;
  /** Share of the consumed stage, so the bars can be drawn to scale. */
  pctOfConsumed: number;
}

/**
 * One item's "made 400, shipped 200" split, as three stages.
 *
 * `retained` can be negative -- the period shipped more of this packaging than
 * it consumed, drawing down finished-goods stock made earlier. That is a real
 * reading and not an error, so the bar is drawn from its magnitude while the
 * figure keeps its sign.
 */
export function buildFunnel(item: PmDemandItem): PmFunnelStage[] {
  const base = Math.abs(item.consumed_qty) || Math.abs(item.dispatched_qty) || 0;
  const share = (qty: number) => (base ? Math.round((Math.abs(qty) / base) * 1000) / 10 : 0);

  return [
    {
      key: 'consumed',
      label: 'Consumed in production',
      qty: item.consumed_qty,
      value: item.consumed_value,
      pctOfConsumed: share(item.consumed_qty),
    },
    {
      key: 'dispatched',
      label: 'Shipped inside finished goods',
      qty: item.dispatched_qty,
      value: item.dispatched_value,
      pctOfConsumed: share(item.dispatched_qty),
    },
    {
      key: 'retained',
      label: item.retained_qty < 0 ? 'Drawn from finished-goods stock' : 'Still in finished goods',
      qty: item.retained_qty,
      value: item.retained_value,
      pctOfConsumed: share(item.retained_qty),
    },
  ];
}
