/**
 * Production Orders Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * A production entry becomes a SAP production order in five steps, each its
 * own right, so the work can be split between people without code changes.
 * Every right implies viewing. Holding a right is not enough to post: the
 * person also needs their SAP user linked (SAP Identities) with its password
 * on the server — the page reads that from `/production-orders/me/`.
 *
 * Not the production execution module's "SAP Orders" screen
 * (`production_execution.*_sap_production_orders`): that one is separate.
 *
 * @see factory_app/production_orders/permissions.py — these strings must match exactly
 */

export const PRODUCTION_ORDERS_PERMISSIONS = {
  /** Read entries and their SAP documents. Every other right implies it. */
  VIEW: 'production_orders.can_view_production_orders',
  /** The Plan step: save an entry, create its planned order in SAP. */
  CREATE: 'production_orders.can_create_production_orders',
  /** Release the order. */
  RELEASE: 'production_orders.can_release_production_orders',
  /** Issue the order's materials. */
  ISSUE: 'production_orders.can_issue_production_orders',
  /** Receive the finished goods under the entry's batch. */
  RECEIVE: 'production_orders.can_receive_production_orders',
  /** Close the order. */
  CLOSE: 'production_orders.can_close_production_orders',
} as const;

export type ProductionOrdersPermission =
  (typeof PRODUCTION_ORDERS_PERMISSIONS)[keyof typeof PRODUCTION_ORDERS_PERMISSIONS];

/** Anything that should reveal the module (every right implies viewing). */
export const PRODUCTION_ORDERS_ACCESS: readonly string[] = Object.values(
  PRODUCTION_ORDERS_PERMISSIONS,
);

/** Who may open the entry form. */
export const PRODUCTION_ORDERS_CREATE_ACCESS: readonly string[] = [
  PRODUCTION_ORDERS_PERMISSIONS.CREATE,
];

/** The Django app label, for the Production sidebar group's prefix check. */
export const PRODUCTION_ORDERS_MODULE_PREFIX = 'production_orders';

/** The companies the module is set up for so far. */
export const PRODUCTION_ORDERS_COMPANIES: readonly string[] = ['JIVO_OIL'];
