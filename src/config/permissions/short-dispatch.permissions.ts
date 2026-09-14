/**
 * Short Dispatch Module Permissions
 *
 * These strings map 1:1 to the custom Django permissions declared on the backend
 * `short_dispatch.ShortDispatch` model. The module posts a SAP A/R Return for
 * stock a bill claims went out but which never left the floor; its nav lives
 * under Warehouse.
 *
 * Note that CREATE is not "can fill a form in": submitting the form posts the
 * document into SAP, and nothing in this app can withdraw it afterwards. Grant it
 * to the people who are allowed to move stock in SAP; everyone else who needs to
 * know what came back off a bill gets VIEW.
 */

export const SHORT_DISPATCH_PERMISSIONS = {
  /** View / list short dispatches — gates the page */
  VIEW: 'short_dispatch.can_view_short_dispatch',
  /** Record a short dispatch, which posts the SAP Return Note */
  CREATE: 'short_dispatch.can_create_short_dispatch',
} as const;

export const SHORT_DISPATCH_MODULE_PREFIX = 'short_dispatch';

/** Any permission that should reveal the page. */
export const SHORT_DISPATCH_ACCESS: readonly string[] = [
  SHORT_DISPATCH_PERMISSIONS.VIEW,
  SHORT_DISPATCH_PERMISSIONS.CREATE,
];

export type ShortDispatchPermission =
  (typeof SHORT_DISPATCH_PERMISSIONS)[keyof typeof SHORT_DISPATCH_PERMISSIONS];
