export type MovementStatus = 'recent' | 'slow-moving' | 'non-moving';

export function getMovementStatus(days: number): MovementStatus {
  if (days > 45) return 'non-moving';
  if (days >= 30) return 'slow-moving';
  return 'recent';
}

export function rowAgeClasses(days: number): string {
  switch (getMovementStatus(days)) {
    case 'non-moving':
      return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50';
    case 'slow-moving':
      return 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/40';
    case 'recent':
    default:
      return 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40';
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
 * True when this row sat still by the production clock but was physically
 * moved more recently — the godown restack the age deliberately ignores.
 */
export function wasRestacked(item: {
  movement_basis?: string;
  days_since_last_movement: number;
  days_since_warehouse_movement?: number;
}): boolean {
  if (!isProductionAged(item)) return false;
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
  'The warehouse this movement happened in. Packing material is aged on the ' +
  'item’s last production, which happens on the floor the godown feeds — ' +
  'so look the date up against this warehouse, not the one on the row.';

export const PRODUCTION_AGE_HINT =
  'Packing material is aged on production alone: only an issue to a production order, ' +
  'or a receipt from one, resets the clock. Moving it between godowns does not.';

export const INACTIVE_WAREHOUSE_HINT =
  'SAP has this warehouse decommissioned, but it is still holding stock. ' +
  'The quantity and value here are real and are counted in the totals.';
