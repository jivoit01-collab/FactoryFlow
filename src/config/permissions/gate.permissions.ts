/**
 * Gate Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * @see API Documentation for permission requirements per endpoint
 */

export const GATE_PERMISSIONS = {
  // ============================================
  // DASHBOARD
  // ============================================
  DASHBOARD: {
    /** View gate dashboard */
    VIEW: 'gatein.view_dashboard',
  },

  // ============================================
  // VEHICLE ENTRY PERMISSIONS (Raw Materials, Daily Needs, Maintenance, Construction)
  // ============================================
  VEHICLE_ENTRY: {
    /** View vehicle/gate entries */
    VIEW: 'gatein.view_vehicleentry',
    /** Create new vehicle/gate entries */
    CREATE: 'gatein.add_vehicleentry',
    /** Edit existing vehicle/gate entries */
    EDIT: 'gatein.change_vehicleentry',
    /** Delete vehicle/gate entries */
    DELETE: 'gatein.delete_vehicleentry',
  },

  // ============================================
  // PERSON GATE-IN PERMISSIONS (Visitor/Labour)
  // ============================================
  PERSON_GATE_IN: {
    /** View person gate-in entries */
    VIEW: 'gatein.view_entrylog',
    /** Create new person gate-in entries */
    CREATE: 'gatein.add_entrylog',
    /** Edit existing person gate-in entries */
    EDIT: 'gatein.change_entrylog',
    /** Delete person gate-in entries */
    DELETE: 'gatein.delete_entrylog',
  },
} as const;

/** Module prefix for sidebar filtering */
export const GATE_MODULE_PREFIX = 'gatein';

/**
 * Type for Gate permission values
 */
export type GatePermission =
  | (typeof GATE_PERMISSIONS.DASHBOARD)[keyof typeof GATE_PERMISSIONS.DASHBOARD]
  | (typeof GATE_PERMISSIONS.VEHICLE_ENTRY)[keyof typeof GATE_PERMISSIONS.VEHICLE_ENTRY]
  | (typeof GATE_PERMISSIONS.PERSON_GATE_IN)[keyof typeof GATE_PERMISSIONS.PERSON_GATE_IN];
