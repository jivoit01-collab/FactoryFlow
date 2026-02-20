/**
 * Gate Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * Backend splits gate into multiple Django apps:
 *   gate_core, person_gatein, raw_material_gatein,
 *   daily_needs_gatein, maintenance_gatein, construction_gatein
 *
 * @see API Documentation for permission requirements per endpoint
 */

export const GATE_PERMISSIONS = {
  // ============================================
  // DASHBOARD
  // ============================================
  DASHBOARD: {
    /** View gate dashboard */
    VIEW: 'person_gatein.can_view_dashboard',
  },

  // ============================================
  // GATE CORE PERMISSIONS (General gate entry)
  // ============================================
  GATE_ENTRY: {
    /** View gate entries */
    VIEW: 'gate_core.can_view_gate_entry',
    /** Create gate entries */
    CREATE: 'gate_core.can_create_gate_entry',
  },

  // ============================================
  // RAW MATERIAL GATE-IN PERMISSIONS
  // ============================================
  RAW_MATERIAL: {
    /** View raw material entries */
    VIEW: 'raw_material_gatein.view_poreceipt',
    /** View full raw material entry details */
    VIEW_FULL: 'gate_core.can_view_raw_material_full_entry',
    /** Create raw material entries */
    CREATE: 'raw_material_gatein.add_poreceipt',
    /** Edit raw material entries */
    EDIT: 'raw_material_gatein.change_poreceipt',
    /** Delete raw material entries */
    DELETE: 'raw_material_gatein.delete_poreceipt',
    /** Complete raw material entry */
    COMPLETE: 'raw_material_gatein.can_complete_raw_material_entry',
    /** Receive PO */
    RECEIVE_PO: 'raw_material_gatein.can_receive_po',
  },

  // ============================================
  // DAILY NEEDS GATE-IN PERMISSIONS
  // ============================================
  DAILY_NEEDS: {
    /** View daily needs entries */
    VIEW: 'daily_needs_gatein.view_dailyneedgateentry',
    /** View full daily needs entry details */
    VIEW_FULL: 'gate_core.can_view_daily_need_full_entry',
    /** Create daily needs entries */
    CREATE: 'daily_needs_gatein.add_dailyneedgateentry',
    /** Edit daily needs entries */
    EDIT: 'daily_needs_gatein.change_dailyneedgateentry',
    /** Delete daily needs entries */
    DELETE: 'daily_needs_gatein.delete_dailyneedgateentry',
    /** Complete daily needs entry */
    COMPLETE: 'daily_needs_gatein.can_complete_daily_need_entry',
  },

  // ============================================
  // MAINTENANCE GATE-IN PERMISSIONS
  // ============================================
  MAINTENANCE: {
    /** View maintenance entries */
    VIEW: 'maintenance_gatein.view_maintenancegateentry',
    /** View full maintenance entry details */
    VIEW_FULL: 'gate_core.can_view_maintenance_full_entry',
    /** Create maintenance entries */
    CREATE: 'maintenance_gatein.add_maintenancegateentry',
    /** Edit maintenance entries */
    EDIT: 'maintenance_gatein.change_maintenancegateentry',
    /** Delete maintenance entries */
    DELETE: 'maintenance_gatein.delete_maintenancegateentry',
    /** Complete maintenance entry */
    COMPLETE: 'maintenance_gatein.can_complete_maintenance_entry',
  },

  // ============================================
  // CONSTRUCTION GATE-IN PERMISSIONS
  // ============================================
  CONSTRUCTION: {
    /** View construction entries */
    VIEW: 'construction_gatein.view_constructiongateentry',
    /** View full construction entry details */
    VIEW_FULL: 'gate_core.can_view_construction_full_entry',
    /** Create construction entries */
    CREATE: 'construction_gatein.add_constructiongateentry',
    /** Edit construction entries */
    EDIT: 'construction_gatein.change_constructiongateentry',
    /** Delete construction entries */
    DELETE: 'construction_gatein.delete_constructiongateentry',
    /** Complete construction entry */
    COMPLETE: 'construction_gatein.can_complete_construction_entry',
  },

  // ============================================
  // PERSON GATE-IN PERMISSIONS (Visitor/Labour)
  // ============================================
  PERSON_GATE_IN: {
    /** View person gate-in entries */
    VIEW: 'person_gatein.view_entrylog',
    /** Create new person gate-in entries */
    CREATE: 'person_gatein.add_entrylog',
    /** Edit existing person gate-in entries */
    EDIT: 'person_gatein.change_entrylog',
    /** Delete person gate-in entries */
    DELETE: 'person_gatein.delete_entrylog',
    /** Cancel entry */
    CANCEL: 'person_gatein.can_cancel_entry',
    /** Exit entry */
    EXIT: 'person_gatein.can_exit_entry',
    /** Search entries */
    SEARCH: 'person_gatein.can_search_entry',
  },
} as const;

/**
 * Module prefixes for sidebar filtering.
 * Gate module spans multiple Django apps, so we check all of them.
 */
export const GATE_MODULE_PREFIX = [
  'gate_core',
  'person_gatein',
  'raw_material_gatein',
  'daily_needs_gatein',
  'maintenance_gatein',
  'construction_gatein',
] as const;

/**
 * Type for Gate permission values
 */
export type GatePermission =
  | (typeof GATE_PERMISSIONS.DASHBOARD)[keyof typeof GATE_PERMISSIONS.DASHBOARD]
  | (typeof GATE_PERMISSIONS.GATE_ENTRY)[keyof typeof GATE_PERMISSIONS.GATE_ENTRY]
  | (typeof GATE_PERMISSIONS.RAW_MATERIAL)[keyof typeof GATE_PERMISSIONS.RAW_MATERIAL]
  | (typeof GATE_PERMISSIONS.DAILY_NEEDS)[keyof typeof GATE_PERMISSIONS.DAILY_NEEDS]
  | (typeof GATE_PERMISSIONS.MAINTENANCE)[keyof typeof GATE_PERMISSIONS.MAINTENANCE]
  | (typeof GATE_PERMISSIONS.CONSTRUCTION)[keyof typeof GATE_PERMISSIONS.CONSTRUCTION]
  | (typeof GATE_PERMISSIONS.PERSON_GATE_IN)[keyof typeof GATE_PERMISSIONS.PERSON_GATE_IN];
