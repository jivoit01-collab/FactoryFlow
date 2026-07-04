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
  // REJECTED QC RETURN
  // ============================================
  REJECTED_QC_RETURN: {
    /** View rejected QC return cases */
    VIEW: 'raw_material_gatein.view_poreceipt',
    /** Create rejected QC return cases */
    CREATE: 'raw_material_gatein.add_poreceipt',
  },

  // ============================================
  // EMPTY VEHICLE GATE OUT
  // ============================================
  EMPTY_VEHICLE_IN: {
    /** View empty vehicle gate-in entries */
    VIEW: 'person_gatein.can_view_dashboard',
    /** Create empty vehicle gate-in entries */
    CREATE: 'person_gatein.can_view_dashboard',
  },

  EMPTY_VEHICLE_OUT: {
    /** View empty vehicle gate-out entries */
    VIEW: 'person_gatein.can_view_dashboard',
    /** Mark an inward vehicle out empty */
    CREATE: 'person_gatein.can_view_dashboard',
  },

  BST_OUT: {
    /** View BST gate-out entries */
    VIEW: 'person_gatein.can_view_dashboard',
    /** Create BST gate-out entries */
    CREATE: 'person_gatein.can_view_dashboard',
    /** Complete BST gate-out entries */
    COMPLETE: 'person_gatein.can_view_dashboard',
  },

  BST_IN: {
    /** View BST gate-in entries */
    VIEW: 'person_gatein.can_view_dashboard',
    /** Create BST gate-in entries */
    CREATE: 'person_gatein.can_view_dashboard',
    /** Complete BST gate-in entries */
    COMPLETE: 'person_gatein.can_view_dashboard',
  },

  BST_RETURN: {
    /** View BST return entries */
    VIEW: 'person_gatein.can_view_dashboard',
    /** Create BST return entries */
    CREATE: 'person_gatein.can_view_dashboard',
    /** Complete BST return entries */
    COMPLETE: 'person_gatein.can_view_dashboard',
  },

  SALES_DISPATCH: {
    /** View customer dispatch gate-out entries */
    VIEW: 'gate_core.can_view_sales_dispatch_out',
    /** Create customer dispatch gate-out entries */
    CREATE: 'gate_core.can_create_sales_dispatch_out',
    /** Edit customer dispatch gate-out entries */
    EDIT: 'gate_core.can_edit_sales_dispatch_out',
    /** Upload sales dispatch truck photos and documents */
    UPLOAD_PHOTO: 'gate_core.can_upload_sales_dispatch_photo',
    /** Print the original sales dispatch gatepass */
    PRINT_GATEPASS: 'gate_core.can_print_sales_dispatch_gatepass',
    /** Reprint sales dispatch gatepasses through the audited workflow */
    REPRINT_GATEPASS: 'gate_core.can_reprint_sales_dispatch_gatepass',
    /** Commit a recorded gatepass print */
    COMMIT_PRINT: 'gate_core.can_commit_sales_dispatch_print',
    /** Reject sales dispatch gate-out entries */
    REJECT: 'gate_core.can_reject_sales_dispatch_out',
    /** Cancel sales dispatch gate-out entries */
    CANCEL: 'gate_core.can_cancel_sales_dispatch_out',
    /** Mark sales dispatch gate-out entries as dispatched */
    DISPATCH: 'gate_core.can_dispatch_sales_dispatch_out',
    /** View sales dispatch reports */
    VIEW_REPORTS: 'gate_core.can_view_sales_dispatch_reports',
    /** Manage sales dispatch print lock */
    MANAGE_LOCK: 'gate_core.can_manage_sales_dispatch_lock',
  },

  CUSTOMER_RETURN: {
    /** View goods return gate-in entries */
    VIEW: 'person_gatein.can_view_dashboard',
    /** Create goods return gate-in entries */
    CREATE: 'person_gatein.can_view_dashboard',
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
  // REPAIR / RETURNABLE PART MOVEMENT
  // ============================================
  REPAIR_MOVEMENT: {
    /** View repair movements */
    VIEW: 'maintenance_gatein.view_maintenancegateentry',
    /** Create repair movements */
    CREATE: 'maintenance_gatein.add_maintenancegateentry',
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
  // FIXED ASSET GATE-IN PERMISSIONS
  // ============================================
  FIXED_ASSET: {
    /** View fixed asset entries */
    VIEW: 'fixed_asset_gatein.view_fixedassetgateentry',
    /** Create fixed asset entries */
    CREATE: 'fixed_asset_gatein.add_fixedassetgateentry',
    /** Edit fixed asset entries */
    EDIT: 'fixed_asset_gatein.change_fixedassetgateentry',
    /** Delete fixed asset entries */
    DELETE: 'fixed_asset_gatein.delete_fixedassetgateentry',
    /** Complete fixed asset entry */
    COMPLETE: 'fixed_asset_gatein.can_complete_fixed_asset_entry',
  },

  // ============================================
  // LABOUR COUNT (casual daily-labour man-day register)
  // ============================================
  LABOUR_COUNT: {
    /** View labour count sheets */
    VIEW: 'labour_count.view_labourcountsheet',
    /** Department supervisor: enter/submit labour counts */
    SUBMIT: 'labour_count.can_submit_labour_count',
    /** Gate operator: verify (OK) submitted counts */
    VERIFY: 'labour_count.can_verify_labour_count',
  },

  // ============================================
  // LABOUR GATE (simple in/out headcount per contractor)
  // ============================================
  LABOUR_GATE: {
    /** View labour gate in/out entries */
    VIEW: 'labour_gate.view_labourgateentry',
    /** Record how many labourers a contractor brought in (gate person) */
    RECORD_IN: 'labour_gate.can_record_labour_in',
    /** Record labour leaving at the gate (gate person) */
    RECORD_OUT: 'labour_gate.can_record_labour_out',
    /** Split a contractor's gate labour across departments (HOD / Labour module) */
    ALLOCATE: 'labour_gate.can_allocate_labour_department',
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

  // ============================================
  // JOB WORK FORM PAGES
  // ============================================
  JOB_WORK: {
    /** View job-work gate entries */
    VIEW: 'production_execution.view_productionrun',
    /** Create job-work gate entries */
    CREATE: 'production_execution.add_productionrun',
    /** Complete job-work gate entries */
    COMPLETE: 'production_execution.add_productionrun',
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
  'fixed_asset_gatein',
  'labour_count',
  'labour_gate',
] as const;

/**
 * Type for Gate permission values
 */
export type GatePermission =
  | (typeof GATE_PERMISSIONS.DASHBOARD)[keyof typeof GATE_PERMISSIONS.DASHBOARD]
  | (typeof GATE_PERMISSIONS.GATE_ENTRY)[keyof typeof GATE_PERMISSIONS.GATE_ENTRY]
  | (typeof GATE_PERMISSIONS.RAW_MATERIAL)[keyof typeof GATE_PERMISSIONS.RAW_MATERIAL]
  | (typeof GATE_PERMISSIONS.REJECTED_QC_RETURN)[keyof typeof GATE_PERMISSIONS.REJECTED_QC_RETURN]
  | (typeof GATE_PERMISSIONS.EMPTY_VEHICLE_IN)[keyof typeof GATE_PERMISSIONS.EMPTY_VEHICLE_IN]
  | (typeof GATE_PERMISSIONS.EMPTY_VEHICLE_OUT)[keyof typeof GATE_PERMISSIONS.EMPTY_VEHICLE_OUT]
  | (typeof GATE_PERMISSIONS.BST_OUT)[keyof typeof GATE_PERMISSIONS.BST_OUT]
  | (typeof GATE_PERMISSIONS.BST_IN)[keyof typeof GATE_PERMISSIONS.BST_IN]
  | (typeof GATE_PERMISSIONS.BST_RETURN)[keyof typeof GATE_PERMISSIONS.BST_RETURN]
  | (typeof GATE_PERMISSIONS.SALES_DISPATCH)[keyof typeof GATE_PERMISSIONS.SALES_DISPATCH]
  | (typeof GATE_PERMISSIONS.CUSTOMER_RETURN)[keyof typeof GATE_PERMISSIONS.CUSTOMER_RETURN]
  | (typeof GATE_PERMISSIONS.DAILY_NEEDS)[keyof typeof GATE_PERMISSIONS.DAILY_NEEDS]
  | (typeof GATE_PERMISSIONS.MAINTENANCE)[keyof typeof GATE_PERMISSIONS.MAINTENANCE]
  | (typeof GATE_PERMISSIONS.REPAIR_MOVEMENT)[keyof typeof GATE_PERMISSIONS.REPAIR_MOVEMENT]
  | (typeof GATE_PERMISSIONS.CONSTRUCTION)[keyof typeof GATE_PERMISSIONS.CONSTRUCTION]
  | (typeof GATE_PERMISSIONS.FIXED_ASSET)[keyof typeof GATE_PERMISSIONS.FIXED_ASSET]
  | (typeof GATE_PERMISSIONS.LABOUR_COUNT)[keyof typeof GATE_PERMISSIONS.LABOUR_COUNT]
  | (typeof GATE_PERMISSIONS.LABOUR_GATE)[keyof typeof GATE_PERMISSIONS.LABOUR_GATE]
  | (typeof GATE_PERMISSIONS.PERSON_GATE_IN)[keyof typeof GATE_PERMISSIONS.PERSON_GATE_IN]
  | (typeof GATE_PERMISSIONS.JOB_WORK)[keyof typeof GATE_PERMISSIONS.JOB_WORK];
