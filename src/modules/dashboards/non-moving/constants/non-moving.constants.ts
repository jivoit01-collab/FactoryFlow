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
 * The report is fetched with no minimum idle age so the status split on the
 * meta cards is real; the dashboard then hides the recently moved rows, which
 * are one card click away. HANA computes the movement age either way — `age`
 * only trims the rows it hands back — so asking for all of them costs the same
 * query, just a longer answer.
 */
export const DEFAULT_NON_MOVING_AGE = 0;
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

// ============================================================================
// Query Config
// ============================================================================

export const NON_MOVING_STALE_TIME = 5 * 60 * 1000; // 5 minutes
