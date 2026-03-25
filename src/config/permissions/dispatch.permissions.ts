/**
 * Outbound Dispatch Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 */

export const DISPATCH_PERMISSIONS = {
  /** View shipment orders list and detail */
  VIEW: 'outbound_dispatch.view_shipmentorder',
  /** Sync shipments from SAP */
  SYNC: 'outbound_dispatch.can_sync_shipments',
  /** Assign dock bay to shipment */
  ASSIGN_BAY: 'outbound_dispatch.can_assign_dock_bay',
  /** Execute pick tasks (pick, scan, mark short) */
  PICK: 'outbound_dispatch.can_execute_pick_task',
  /** Inspect trailer before loading */
  INSPECT: 'outbound_dispatch.can_inspect_trailer',
  /** Load truck with goods */
  LOAD: 'outbound_dispatch.can_load_truck',
  /** Supervisor confirm loading */
  CONFIRM: 'outbound_dispatch.can_confirm_load',
  /** Dispatch shipment */
  DISPATCH: 'outbound_dispatch.can_dispatch_shipment',
  /** View outbound dashboard */
  DASHBOARD: 'outbound_dispatch.can_view_outbound_dashboard',
} as const;

/** Module prefix for sidebar filtering */
export const DISPATCH_MODULE_PREFIX = 'outbound_dispatch';

/**
 * Type for Dispatch permission values
 */
export type DispatchPermission = (typeof DISPATCH_PERMISSIONS)[keyof typeof DISPATCH_PERMISSIONS];
