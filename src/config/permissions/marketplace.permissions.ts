/**
 * Marketplace (Flipkart/Amazon) Module Permissions
 *
 * Map to the custom Django permissions declared on the `marketplace` app models
 * (see `marketplace/models.py` Meta.permissions) and bundled into the
 * `Marketplace` group by migration `0002_marketplace_group`.
 *
 * Access model:
 *   - Sidebar visibility keys off `modulePrefix: 'marketplace'` (hidden from users
 *     with no `marketplace.*` permission).
 *   - Operator pages (Outward, Inward, Overview) gate on `MARKETPLACE_ACCESS`.
 *   - Masters + Reconciliation gate on `MARKETPLACE_ADMIN_ACCESS`.
 */

export const MARKETPLACE_MODULE_PREFIX = 'marketplace';

export const MARKETPLACE_PERMISSIONS = {
  VIEW_DISPATCH: 'marketplace.view_dispatch',
  ADD_DISPATCH: 'marketplace.add_dispatch',
  SCAN_DISPATCH: 'marketplace.scan_dispatch',
  CONFIRM_DISPATCH: 'marketplace.confirm_dispatch',
  CANCEL_DISPATCH: 'marketplace.cancel_dispatch',
  VIEW_RETURN: 'marketplace.view_return',
  ADD_RETURN: 'marketplace.add_return',
  SUBMIT_RETURN: 'marketplace.submit_return',
  VIEW_MASTER: 'marketplace.view_master',
  CHANGE_MASTER: 'marketplace.change_master',
  VIEW_RECONCILIATION: 'marketplace.view_reconciliation',
} as const;

/** Operator-facing access (Outward/Inward/Overview scanning pages). */
export const MARKETPLACE_ACCESS: readonly string[] = [
  MARKETPLACE_PERMISSIONS.VIEW_DISPATCH,
  MARKETPLACE_PERMISSIONS.ADD_DISPATCH,
  MARKETPLACE_PERMISSIONS.SCAN_DISPATCH,
  MARKETPLACE_PERMISSIONS.CONFIRM_DISPATCH,
  MARKETPLACE_PERMISSIONS.VIEW_RETURN,
  MARKETPLACE_PERMISSIONS.ADD_RETURN,
];

/** Admin access (Masters + Reconciliation). */
export const MARKETPLACE_ADMIN_ACCESS: readonly string[] = [
  MARKETPLACE_PERMISSIONS.VIEW_MASTER,
  MARKETPLACE_PERMISSIONS.CHANGE_MASTER,
  MARKETPLACE_PERMISSIONS.VIEW_RECONCILIATION,
];

export type MarketplacePermission =
  (typeof MARKETPLACE_PERMISSIONS)[keyof typeof MARKETPLACE_PERMISSIONS];
