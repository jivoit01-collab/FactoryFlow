/**
 * Dismantle Module Permissions
 *
 * These strings map 1:1 to the custom Django permissions declared on the
 * `dismantle.Dismantle` model (`dismantle.can_*`).
 *
 * POST is deliberately separate from CREATE/EDIT. Posting writes three documents
 * into SAP — the disassembly order, the receipt that brings the components back
 * and the issue that consumes the finished good — and the app can withdraw none
 * of them. The storeman prepares the dismantle and says what actually came back
 * off the floor; whoever holds POST is the one who commits it.
 */

export const DISMANTLE_PERMISSIONS = {
  /** View / list dismantles — gates the module */
  VIEW: 'dismantle.can_view_dismantle',
  /** Start a dismantle from a returned line or from warehouse stock */
  CREATE: 'dismantle.can_create_dismantle',
  /** Edit a draft: quantity, recovered components, their quantities */
  EDIT: 'dismantle.can_edit_dismantle',
  /** Post the three SAP documents — irreversible from here */
  POST: 'dismantle.can_post_dismantle',
} as const;

export const DISMANTLE_MODULE_PREFIX = 'dismantle';

/** Any permission that should reveal the module. */
export const DISMANTLE_ACCESS: readonly string[] = [
  DISMANTLE_PERMISSIONS.VIEW,
  DISMANTLE_PERMISSIONS.CREATE,
];

export type DismantlePermission =
  (typeof DISMANTLE_PERMISSIONS)[keyof typeof DISMANTLE_PERMISSIONS];
