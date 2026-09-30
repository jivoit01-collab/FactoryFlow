/**
 * Warehouse Ops (WMS) Module Permissions
 *
 * These constants map to the auto-generated Django model permissions on the
 * `wms` app (see `wms/models.py` and the `WMS Admin` / `WMS Operator` groups in
 * migration `0003_wms_access_groups`).
 *
 * Access model (mirrors `wms/permissions.py`):
 *   - Reads are open backend-side, but the sidebar/route gating below hides the
 *     module from users who hold no `wms.*` permission at all.
 *   - `WMS Admin`    → holds every `wms.*` permission (structural + operational).
 *   - `WMS Operator` → holds ONLY the operational write perms below
 *     (add/change/delete pallet & inventory, add movement). It has NO `view_*`
 *     perms, so route gating for operator-facing pages must key off these.
 */

export const WMS_MODULE_PREFIX = 'wms';

export const WMS_PERMISSIONS = {
  // ── Structural collections (WMS Admin only) ──────────────────────────────
  VIEW_WAREHOUSE: 'wms.view_warehouse',
  ADD_WAREHOUSE: 'wms.add_warehouse',
  CHANGE_WAREHOUSE: 'wms.change_warehouse',
  DELETE_WAREHOUSE: 'wms.delete_warehouse',

  VIEW_ZONE: 'wms.view_zone',
  ADD_ZONE: 'wms.add_zone',
  CHANGE_ZONE: 'wms.change_zone',
  DELETE_ZONE: 'wms.delete_zone',

  VIEW_CELL_PURPOSE: 'wms.view_cellpurpose',
  CHANGE_CELL_PURPOSE: 'wms.change_cellpurpose',

  VIEW_LOCATION: 'wms.view_location',
  ADD_LOCATION: 'wms.add_location',
  CHANGE_LOCATION: 'wms.change_location',
  DELETE_LOCATION: 'wms.delete_location',

  VIEW_MATERIAL: 'wms.view_material',
  ADD_MATERIAL: 'wms.add_material',
  CHANGE_MATERIAL: 'wms.change_material',
  DELETE_MATERIAL: 'wms.delete_material',

  VIEW_TEMPLATE: 'wms.view_template',
  ADD_TEMPLATE: 'wms.add_template',
  CHANGE_TEMPLATE: 'wms.change_template',
  DELETE_TEMPLATE: 'wms.delete_template',

  VIEW_SETTINGS: 'wms.view_settings',
  ADD_SETTINGS: 'wms.add_settings',
  CHANGE_SETTINGS: 'wms.change_settings',

  // ── Operational collections (WMS Operator + WMS Admin) ───────────────────
  VIEW_PALLET: 'wms.view_pallet',
  ADD_PALLET: 'wms.add_pallet',
  CHANGE_PALLET: 'wms.change_pallet',
  DELETE_PALLET: 'wms.delete_pallet',

  VIEW_INVENTORY: 'wms.view_inventory',
  ADD_INVENTORY: 'wms.add_inventory',
  CHANGE_INVENTORY: 'wms.change_inventory',
  DELETE_INVENTORY: 'wms.delete_inventory',

  VIEW_MOVEMENT: 'wms.view_movement',
  ADD_MOVEMENT: 'wms.add_movement',
} as const;

/**
 * Any WMS access — satisfied by both `WMS Admin` (via `view_warehouse` etc.) and
 * `WMS Operator` (via the operational write perms). Used to gate the operator-
 * facing pages (overview, map, receive, transfer, pick, outbound, count,
 * reports, labels) so operators are not locked out despite having no `view_*`.
 */
export const WMS_ACCESS: readonly string[] = [
  WMS_PERMISSIONS.ADD_PALLET,
  WMS_PERMISSIONS.CHANGE_PALLET,
  WMS_PERMISSIONS.DELETE_PALLET,
  WMS_PERMISSIONS.ADD_INVENTORY,
  WMS_PERMISSIONS.CHANGE_INVENTORY,
  WMS_PERMISSIONS.DELETE_INVENTORY,
  WMS_PERMISSIONS.ADD_MOVEMENT,
  WMS_PERMISSIONS.VIEW_WAREHOUSE,
  WMS_PERMISSIONS.VIEW_PALLET,
  WMS_PERMISSIONS.VIEW_INVENTORY,
  WMS_PERMISSIONS.VIEW_MOVEMENT,
];

/**
 * Admin-only WMS access — structural/config perms that only `WMS Admin` holds.
 * Used to gate the warehouse designer, warehouses editor, admin, and settings
 * pages. `WMS Operator` fails these.
 */
export const WMS_ADMIN_ACCESS: readonly string[] = [
  WMS_PERMISSIONS.CHANGE_WAREHOUSE,
  WMS_PERMISSIONS.ADD_WAREHOUSE,
  WMS_PERMISSIONS.CHANGE_TEMPLATE,
  WMS_PERMISSIONS.CHANGE_SETTINGS,
  WMS_PERMISSIONS.ADD_SETTINGS,
];

export type WmsPermission = (typeof WMS_PERMISSIONS)[keyof typeof WMS_PERMISSIONS];
