import {
  DASHBOARDS_PERMISSIONS,
  VEHICLE_MANAGEMENT_PERMISSIONS,
  WMS_ACCESS,
} from '@/config/permissions';

// ============================================================================
// Section permissions
// ============================================================================

/**
 * Each panel is gated on its own right, so the board degrades one section at a
 * time instead of being all-or-nothing: a planner with only dispatch rights sees
 * the bills and linking panels, a warehouse operator sees pallet space.
 */
export const WAREHOUSE_CONTROL_NON_MOVING_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
];

export const WAREHOUSE_CONTROL_PALLET_SPACE_PERMISSIONS: readonly string[] = WMS_ACCESS;

export const WAREHOUSE_CONTROL_BILLS_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
];

export const WAREHOUSE_CONTROL_LINKING_PERMISSIONS: readonly string[] = [
  VEHICLE_MANAGEMENT_PERMISSIONS.VIEW_DISPATCH_LINKING,
  DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
];

/** Route/nav gate — holding any one section's right opens the board. */
export const WAREHOUSE_CONTROL_VIEW_PERMISSIONS: readonly string[] = [
  ...new Set([
    ...WAREHOUSE_CONTROL_NON_MOVING_PERMISSIONS,
    ...WAREHOUSE_CONTROL_BILLS_PERMISSIONS,
    ...WAREHOUSE_CONTROL_LINKING_PERMISSIONS,
    ...WAREHOUSE_CONTROL_PALLET_SPACE_PERMISSIONS,
  ]),
];

// ============================================================================
// Data windows
// ============================================================================

/**
 * Warehouses the Non-Moving panel reports on.
 *
 * The full Non-Moving dashboard covers every factory warehouse; this board is
 * scoped to the one the floor actually asks about, so the panel is a single
 * meaningful row rather than a league table nobody reads. The summary above it
 * is recomputed over the same scope — a header counting warehouses the list does
 * not show would be worse than no header.
 *
 * Leave the list empty to fall back to every factory warehouse.
 */
export const WAREHOUSE_CONTROL_NON_MOVING_WAREHOUSES: readonly string[] = ['BH-BT'];

/**
 * Movement age the board opens on. The full Non-Moving dashboard lets the user
 * choose; this board is a glance, so it fixes the same default that page uses.
 */
export const WAREHOUSE_CONTROL_NON_MOVING_AGE_DAYS = 45;

/**
 * Row cap on the shared linking feed. Matches the Vehicle Linking page so both
 * screens see the same set of bills.
 */
export const WAREHOUSE_CONTROL_LINKING_FETCH_LIMIT = 2000;

/**
 * How far the Dispatch Plans read reaches ahead of today.
 *
 * The board also needs what is scheduled forward — a bill dated next week has
 * not been dispatched either — which the Plans page's own window (a month back
 * through today) does not cover.
 *
 * There is deliberately no matching lookback constant: the backward edge is one
 * calendar month, taken with `subMonths` exactly as the Plans page does. Thirty
 * days is NOT the same edge — across a 31-day month it lands a day late and
 * silently drops any bill dated on that first day, which is precisely how the
 * board came to show 71 pending against the Plans page's 72.
 */
export const WAREHOUSE_CONTROL_PLANS_LOOKAHEAD_DAYS = 30;

/**
 * Safety ceiling on rendered rows.
 *
 * Panels list their whole set and scroll — a header that says "91 bills" has to
 * mean 91 reachable rows. This is only a guard against a pathological day: the
 * feeds are already capped server-side, and a normal one is well under this. If
 * it ever bites, the panel says so rather than truncating in silence.
 */
export const WAREHOUSE_CONTROL_MAX_RENDERED_ROWS = 500;

/** Dispatch data moves through the day; re-read it more eagerly than SAP stock. */
export const WAREHOUSE_CONTROL_STALE_TIME = 60 * 1000;

// ============================================================================
// Pallet space
// ============================================================================

/**
 * Pallet slots assumed for a storage cell that carries no configured
 * `maxPallets`. One cell = one pallet is the convention the warehouse designer
 * builds to; the panel reports how many cells were counted this way so the
 * number is never silently invented.
 */
export const DEFAULT_PALLET_SLOTS_PER_LOCATION = 1;

/** Pallet states that no longer occupy a rack slot. */
export const NON_OCCUPYING_PALLET_STATUSES: readonly string[] = ['SHIPPED', 'REMOVED'];

/** Location states whose space cannot be filled right now. */
export const UNAVAILABLE_LOCATION_STATUSES: readonly string[] = [
  'BLOCKED',
  'DAMAGED',
  'MAINTENANCE',
];
