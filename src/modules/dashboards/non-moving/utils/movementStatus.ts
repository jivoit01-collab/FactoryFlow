export type MovementStatus = 'recent' | 'slow-moving' | 'non-moving';

export function getMovementStatus(days: number): MovementStatus {
  if (days > 45) return 'non-moving';
  if (days >= 30) return 'slow-moving';
  return 'recent';
}

export function rowAgeClasses(days: number): string {
  switch (getMovementStatus(days)) {
    case 'non-moving':
      return 'bg-red-50 hover:bg-red-100 dark:bg-red-500/15 dark:hover:bg-red-500/25';
    case 'slow-moving':
      return 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/25';
    case 'recent':
    default:
      return 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/25';
  }
}

/**
 * True when the row's age was measured against production rather than against
 * any movement — packing material, which the backend flags per row.
 */
export function isProductionAged(item: { movement_basis?: string }): boolean {
  return item.movement_basis === 'production';
}

/**
 * True when the row was aged on a purchase, because the production rule is
 * switched off — either a real Goods Receipt PO (`grpo`) or the admission that
 * there has never been one (`none`).
 */
export function isPurchaseAged(item: { movement_basis?: string }): boolean {
  return item.movement_basis === 'grpo' || item.movement_basis === 'none';
}

/**
 * True when the row was aged on a purchase that does not exist. The date shown
 * is the item's creation date in SAP, not a movement, so it must not be read
 * as "bought a very long time ago".
 */
export function isNeverPurchased(item: { movement_basis?: string }): boolean {
  return item.movement_basis === 'none';
}

/** What the Days Idle column counted from, in the words the row earned. */
export function agedOnLabel(item: { movement_basis?: string }): string {
  switch (item.movement_basis) {
    case 'production':
      return 'Production';
    case 'grpo':
      return 'Last GRPO';
    case 'none':
      return 'Never purchased';
    default:
      return 'Any movement';
  }
}

/**
 * True when this row sat still by the headline clock but was physically moved
 * more recently — the godown restack the age deliberately ignores.
 *
 * Asked of the purchase clocks too, and it matters more there: with the
 * production rule off, a row aged 272 days may well have been issued to the
 * line last week, and that gap is the whole reason somebody switched the rule.
 */
export function wasRestacked(item: {
  movement_basis?: string;
  days_since_last_movement: number;
  days_since_warehouse_movement?: number;
}): boolean {
  if (!isProductionAged(item) && !isPurchaseAged(item)) return false;
  const inStore = item.days_since_warehouse_movement;
  return inStore !== undefined && inStore < item.days_since_last_movement;
}

/**
 * The warehouse a row's age was actually earned in, when that is somewhere
 * else — the production floor a godown feeds, for packing material aged on
 * production. Empty when the movement happened in a warehouse the line already
 * covers, or when SAP never moved the stock at all.
 *
 * Without this the date cannot be checked: SAP's own SKU WISE DETAILS report
 * is asked for one warehouse at a time and answers "no rows" for the godown
 * the date is printed against.
 */
export function movementWarehouseElsewhere(item: {
  warehouse: string;
  warehouses?: string[];
  last_movement_warehouse?: string;
}): string {
  const source = item.last_movement_warehouse;
  if (!source) return '';
  const covered = item.warehouses?.length ? item.warehouses : [item.warehouse];
  return covered.includes(source) ? '' : source;
}

export const MOVEMENT_ELSEWHERE_HINT =
  'The warehouse this movement happened in. The item-level clocks — production, ' +
  'and the last GRPO when the production rule is off — land in whichever store ' +
  'did the work or took delivery, not necessarily this row’s. Look the date up ' +
  'against this warehouse, not the one on the row.';

export const PRODUCTION_AGE_HINT =
  'Packing material is aged on production alone: only an issue to a production order, ' +
  'or a receipt from one, resets the clock. Moving it between godowns does not.';

export const GRPO_AGE_HINT =
  'The production rule is off, so this row is aged on the item’s last Goods Receipt PO. ' +
  'Nothing internal resets the clock — not production, not a transfer, not an issue. ' +
  'Days Idle here means “days since we last bought any”.';

export const NEVER_PURCHASED_HINT =
  'This item has never been bought in this company, so there is no Goods Receipt PO to ' +
  'age it from and the date shown is when it was created in SAP. Normal for bottles the ' +
  'factory blows itself and for stock that only ever arrived by transfer — read it as ' +
  '“never purchased”, not as “purchased long ago”.';

/** The tooltip that explains whichever clock produced this row's age. */
export function ageHintFor(item: { movement_basis?: string }): string {
  if (isNeverPurchased(item)) return NEVER_PURCHASED_HINT;
  if (isPurchaseAged(item)) return GRPO_AGE_HINT;
  return PRODUCTION_AGE_HINT;
}

export const INACTIVE_WAREHOUSE_HINT =
  'SAP has this warehouse decommissioned, but it is still holding stock. ' +
  'The quantity and value here are real and are counted in the totals.';
