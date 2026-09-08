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
 * Movement age the board opens on. The full Non-Moving dashboard lets the user
 * choose; this board is a glance, so it fixes the same default that page uses.
 */
export const WAREHOUSE_CONTROL_NON_MOVING_AGE_DAYS = 45;

/**
 * Row cap on the shared linking feed. Matches the Vehicle Linking page so both
 * screens see the same set of bills.
 */
export const WAREHOUSE_CONTROL_LINKING_FETCH_LIMIT = 2000;

/** Row cap on today's SAP bills read. */
export const WAREHOUSE_CONTROL_BILLS_FETCH_LIMIT = 500;

/** How many rows each panel shows before "view all" takes over. */
export const WAREHOUSE_CONTROL_PREVIEW_ROWS = 8;

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
