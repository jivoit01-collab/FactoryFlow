import type { MovementStatus } from '../utils/movementStatus';

// ============================================================================
// Filter Options
// ============================================================================

export const NON_MOVING_AGE_OPTIONS = [
  { value: 0, label: 'All Stock' },
  { value: 15, label: '15 Days' },
  { value: 30, label: '30 Days' },
  { value: 45, label: '45 Days' },
  { value: 90, label: '90 Days' },
  { value: 180, label: '180 Days' },
  { value: 365, label: '365 Days' },
] as const;

export const NON_MOVING_STATUS_FILTER_OPTIONS = [
  { value: 'recent', label: 'Recently Moved' },
  { value: 'slow-moving', label: 'Slow Moving' },
  { value: 'non-moving', label: 'Non Moving' },
] as const;

/**
 * The page opens on stock untouched for more than 45 days — the threshold the
 * factory treats as non-moving, and what this board is opened to look at.
 *
 * It is a hard cut, not a highlight: `age` trims the rows SAP hands back, so at
 * this default the Recently Moved and Slow Moving meta cards read zero, because
 * no row under 45 days is in the answer to count. Both are one click on
 * `All Stock` away, which fetches every age and restores the full split.
 */
export const DEFAULT_NON_MOVING_AGE = 45;
export const DEFAULT_NON_MOVING_STATUS_FILTER: MovementStatus[] = ['slow-moving', 'non-moving'];
export const NON_MOVING_ALL_STATUSES: MovementStatus[] = ['recent', 'slow-moving', 'non-moving'];

export const NON_MOVING_PAGE_SIZE = 50;

// ============================================================================
// Warehouse Scope
// ============================================================================

/**
 * Warehouse-code prefixes that belong to the factory (Bhakharpur, Gupta).
 * Everything else in `warehouse_summary` is a C&F / trading depot (PB-*, DL-*)
 * or the backend's "Unassigned" bucket, and is hidden from this dashboard.
 */
export const FACTORY_WAREHOUSE_PREFIXES = ['BH', 'GP'] as const;

/**
 * The stores the dashboard opens on: the two packaging stores that feed the
 * floor and the two non-moving godowns stock is parked in. Everything else --
 * the consumption store, wastage, finished-goods and the depots -- is one
 * click away in the filter, but is not what this page is opened to look at.
 *
 * Applied against the warehouses the report actually returned, never blind:
 * JIVO_MART has none of these four codes, and presetting them there would open
 * the dashboard on an empty table that reads as a broken page.
 */
export const DEFAULT_NON_MOVING_WAREHOUSES = ['BH-BS', 'BH-NM', 'BH-PM', 'GP-NM'] as const;

// ============================================================================
// Query Config
// ============================================================================

export const NON_MOVING_STALE_TIME = 5 * 60 * 1000; // 5 minutes
