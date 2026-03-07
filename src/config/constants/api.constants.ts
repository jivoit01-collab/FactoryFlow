export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/accounts/login/',
    LOGOUT: '/accounts/logout/',
    REFRESH: '/accounts/token/refresh/',
    ME: '/accounts/me/',
    CHANGE_PASSWORD: '/accounts/change-password/',
  },
  // Vehicle Management
  VEHICLE: {
    TRANSPORTERS: '/vehicle-management/transporters/',
    TRANSPORTER_NAMES: '/vehicle-management/transporters/names/',
    TRANSPORTER_BY_ID: (id: number) => `/vehicle-management/transporters/${id}/`,
    VEHICLE_TYPES: '/vehicle-management/vehicle-types/',
    VEHICLES: '/vehicle-management/vehicles/',
    VEHICLE_NAMES: '/vehicle-management/vehicles/names/',
    VEHICLE_BY_ID: (id: number) => `/vehicle-management/vehicles/${id}/`,
    VEHICLE_ENTRIES: '/vehicle-management/vehicle-entries/',
    VEHICLE_ENTRY_BY_ID: (id: number) => `/vehicle-management/vehicle-entries/${id}/`,
    VEHICLE_ENTRIES_COUNT: '/vehicle-management/vehicle-entries/count/',
    VEHICLE_ENTRIES_BY_STATUS: '/vehicle-management/vehicle-entries/list-by-status/',
  },
  // Driver Management
  DRIVER: {
    DRIVERS: '/driver-management/drivers/',
    DRIVER_NAMES: '/driver-management/drivers/names/',
    DRIVER_BY_ID: (id: number) => `/driver-management/drivers/${id}/`,
  },
  // Security Checks
  SECURITY: {
    GATE_ENTRY_SECURITY: (entryId: number) => `/security-checks/gate-entries/${entryId}/security/`,
    GATE_ENTRY_SECURITY_VIEW: (entryId: number) =>
      `/security-checks/gate-entries/${entryId}/security/view`,
    SUBMIT: (securityId: number) => `/security-checks/security/${securityId}/submit/`,
  },
  // Purchase Orders
  PO: {
    OPEN_POS: (supplierCode?: string) =>
      supplierCode ? `/po/open-pos/?supplier_code=${supplierCode}` : '/po/open-pos/',
    WAREHOUSES: '/po/warehouses/',
    VENDORS: '/po/vendors/',
  },
  // Raw Material Gate In
  RAW_MATERIAL_GATEIN: {
    PO_RECEIPTS: (entryId: number) => `/raw-material-gatein/gate-entries/${entryId}/po-receipts/`,
    PO_RECEIPTS_VIEW: (entryId: number) =>
      `/raw-material-gatein/gate-entries/${entryId}/po-receipts/view`,
  },
  // Weighment
  WEIGHMENT: {
    CREATE: (entryId: number) => `/weighment/gate-entries/${entryId}/weighment/`,
    GET: (entryId: number) => `/weighment/gate-entries/${entryId}/weighment/view`,
  },
  // Quality Control
  QUALITY_CONTROL: {
    CREATE: (poItemId: number) => `/quality-control/po-items/${poItemId}/qc/`,
    GET: (poItemId: number) => `/quality-control/po-items/${poItemId}/qc/view`,
  },
  // Gate Attachments
  GATE_ATTACHMENTS: {
    BY_ENTRY: (entryId: number) => `/gate-core/gate-attachments/${entryId}/`,
  },
  // Gate Core - Full View
  GATE_CORE: {
    FULL_VIEW: (entryId: number) => `/gate-core/raw-material-gate-entry/${entryId}/`,
    COMPLETE: (entryId: number) => `/raw-material-gatein/gate-entries/${entryId}/complete/`,
  },
  // Daily Needs Gate In
  DAILY_NEEDS_GATEIN: {
    CATEGORIES: '/daily-needs-gatein/gate-entries/daily-need/categories/',
    GET: (entryId: number) => `/daily-needs-gatein/gate-entries/${entryId}/daily-need/`,
    CREATE: (entryId: number) => `/daily-needs-gatein/gate-entries/${entryId}/daily-need/`,
    FULL_VIEW: (entryId: number) => `/gate-core/daily-need-gate-entry/${entryId}/`,
    COMPLETE: (entryId: number) => `/daily-needs-gatein/gate-entries/${entryId}/complete/`,
  },
  // Accounts
  ACCOUNTS: {
    DEPARTMENTS: '/accounts/departments',
    USERS: '/accounts/users/',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications/',
    DETAIL: (id: number) => `/notifications/${id}/`,
    UNREAD_COUNT: '/notifications/unread-count/',
    MARK_READ: '/notifications/mark-read/',
    PREFERENCES: '/notifications/preferences/',
    TEST: '/notifications/test/',
    SEND: '/notifications/send/',
    DEVICES: {
      REGISTER: '/notifications/devices/register/',
      UNREGISTER: '/notifications/devices/unregister/',
    },
  },
  // Quality Control V2 (New QC Module)
  QUALITY_CONTROL_V2: {
    // Arrival Slips
    ARRIVAL_SLIP_LIST: '/quality-control/arrival-slips/',
    ARRIVAL_SLIP_CREATE: (poItemReceiptId: number) =>
      `/quality-control/po-items/${poItemReceiptId}/arrival-slip/`,
    ARRIVAL_SLIP_GET: (poItemReceiptId: number) =>
      `/quality-control/po-items/${poItemReceiptId}/arrival-slip/`,
    ARRIVAL_SLIP_BY_ID: (slipId: number) => `/quality-control/arrival-slips/${slipId}/`,
    ARRIVAL_SLIP_SUBMIT: (slipId: number) => `/quality-control/arrival-slips/${slipId}/submit/`,
    ARRIVAL_SLIP_SEND_BACK: (slipId: number) => `/quality-control/arrival-slips/${slipId}/send-back/`,

    // Material Types
    MATERIAL_TYPES: '/quality-control/material-types/',
    MATERIAL_TYPE_BY_ID: (id: number) => `/quality-control/material-types/${id}/`,
    MATERIAL_TYPE_PARAMETERS: (materialTypeId: number) =>
      `/quality-control/material-types/${materialTypeId}/parameters/`,

    // QC Parameters
    QC_PARAMETER_BY_ID: (id: number) => `/quality-control/parameters/${id}/`,

    // Inspections
    INSPECTIONS_LIST: '/quality-control/inspections/',
    PENDING_INSPECTIONS: '/quality-control/inspections/pending/',
    DRAFT_INSPECTIONS: '/quality-control/inspections/draft/',
    ACTIONABLE_INSPECTIONS: '/quality-control/inspections/actionable/',
    AWAITING_CHEMIST: '/quality-control/inspections/awaiting-chemist/',
    AWAITING_QAM: '/quality-control/inspections/awaiting-qam/',
    COMPLETED_INSPECTIONS: '/quality-control/inspections/completed/',
    REJECTED_INSPECTIONS: '/quality-control/inspections/rejected/',
    INSPECTION_COUNTS: '/quality-control/inspections/counts/',
    INSPECTION_BY_ID: (id: number) => `/quality-control/inspections/${id}/`,
    INSPECTION_FOR_SLIP: (slipId: number) => `/quality-control/arrival-slips/${slipId}/inspection/`,
    INSPECTION_PARAMETERS: (inspectionId: number) =>
      `/quality-control/inspections/${inspectionId}/parameters/`,
    INSPECTION_SUBMIT: (id: number) => `/quality-control/inspections/${id}/submit/`,

    // Approvals
    APPROVE_CHEMIST: (id: number) => `/quality-control/inspections/${id}/approve/chemist/`,
    APPROVE_QAM: (id: number) => `/quality-control/inspections/${id}/approve/qam/`,
    REJECT_INSPECTION: (id: number) => `/quality-control/inspections/${id}/reject/`,
  },
  // GRPO (Goods Receipt Purchase Order)
  GRPO: {
    PENDING: '/grpo/pending/',
    PREVIEW: (vehicleEntryId: number) => `/grpo/preview/${vehicleEntryId}/`,
    POST: '/grpo/post/',
    HISTORY: '/grpo/history/',
    DETAIL: (postingId: number) => `/grpo/${postingId}/`,
    ATTACHMENTS: (postingId: number) => `/grpo/${postingId}/attachments/`,
    ATTACHMENT_DELETE: (postingId: number, attachmentId: number) =>
      `/grpo/${postingId}/attachments/${attachmentId}/`,
    ATTACHMENT_RETRY: (postingId: number, attachmentId: number) =>
      `/grpo/${postingId}/attachments/${attachmentId}/retry/`,
  },
  // Production Planning
  PRODUCTION_PLANNING: {
    LIST: '/production-planning/',
    CREATE: '/production-planning/',
    SUMMARY: '/production-planning/summary/',
    DETAIL: (planId: number) => `/production-planning/${planId}/`,
    POST_TO_SAP: (planId: number) => `/production-planning/${planId}/post-to-sap/`,
    CLOSE: (planId: number) => `/production-planning/${planId}/close/`,
    MATERIALS: (planId: number) => `/production-planning/${planId}/materials/`,
    MATERIAL_DELETE: (planId: number, materialId: number) =>
      `/production-planning/${planId}/materials/${materialId}/`,
    WEEKLY_PLANS: (planId: number) => `/production-planning/${planId}/weekly-plans/`,
    WEEKLY_PLAN_DETAIL: (planId: number, weekId: number) =>
      `/production-planning/${planId}/weekly-plans/${weekId}/`,
    DAILY_ENTRIES: (weekId: number) =>
      `/production-planning/weekly-plans/${weekId}/daily-entries/`,
    DAILY_ENTRY_DETAIL: (weekId: number, entryId: number) =>
      `/production-planning/weekly-plans/${weekId}/daily-entries/${entryId}/`,
    DAILY_ENTRIES_ALL: '/production-planning/daily-entries/',
    DROPDOWN_ITEMS: '/production-planning/dropdown/items/',
    DROPDOWN_UOM: '/production-planning/dropdown/uom/',
    DROPDOWN_WAREHOUSES: '/production-planning/dropdown/warehouses/',
    DROPDOWN_BOM: '/production-planning/dropdown/bom/',
  },
  // Production Execution
  PRODUCTION_EXECUTION: {
    // Dashboard
    DASHBOARD_SUMMARY: '/production-execution/dashboard/summary/',
    // Production Lines
    LINES: '/production-execution/lines/',
    LINE_DETAIL: (lineId: number) => `/production-execution/lines/${lineId}/`,
    // Machines
    MACHINES: '/production-execution/machines/',
    MACHINE_DETAIL: (machineId: number) => `/production-execution/machines/${machineId}/`,
    // Checklist Templates
    CHECKLIST_TEMPLATES: '/production-execution/checklist-templates/',
    CHECKLIST_TEMPLATE_DETAIL: (templateId: number) =>
      `/production-execution/checklist-templates/${templateId}/`,
    // Production Runs
    RUNS: '/production-execution/runs/',
    RUN_DETAIL: (runId: number) => `/production-execution/runs/${runId}/`,
    RUN_COMPLETE: (runId: number) => `/production-execution/runs/${runId}/complete/`,
    // Hourly Logs
    RUN_LOGS: (runId: number) => `/production-execution/runs/${runId}/logs/`,
    RUN_LOG_DETAIL: (runId: number, logId: number) =>
      `/production-execution/runs/${runId}/logs/${logId}/`,
    // Breakdowns
    RUN_BREAKDOWNS: (runId: number) => `/production-execution/runs/${runId}/breakdowns/`,
    RUN_BREAKDOWN_DETAIL: (runId: number, breakdownId: number) =>
      `/production-execution/runs/${runId}/breakdowns/${breakdownId}/`,
    // Materials
    RUN_MATERIALS: (runId: number) => `/production-execution/runs/${runId}/materials/`,
    RUN_MATERIAL_DETAIL: (runId: number, materialId: number) =>
      `/production-execution/runs/${runId}/materials/${materialId}/`,
    // Machine Runtime
    RUN_MACHINE_RUNTIME: (runId: number) =>
      `/production-execution/runs/${runId}/machine-runtime/`,
    RUN_MACHINE_RUNTIME_DETAIL: (runId: number, runtimeId: number) =>
      `/production-execution/runs/${runId}/machine-runtime/${runtimeId}/`,
    // Manpower
    RUN_MANPOWER: (runId: number) => `/production-execution/runs/${runId}/manpower/`,
    RUN_MANPOWER_DETAIL: (runId: number, manpowerId: number) =>
      `/production-execution/runs/${runId}/manpower/${manpowerId}/`,
    // Line Clearance
    LINE_CLEARANCE: '/production-execution/line-clearance/',
    LINE_CLEARANCE_DETAIL: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/`,
    LINE_CLEARANCE_SUBMIT: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/submit/`,
    LINE_CLEARANCE_APPROVE: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/approve/`,
    // Machine Checklists
    MACHINE_CHECKLISTS: '/production-execution/machine-checklists/',
    MACHINE_CHECKLIST_DETAIL: (entryId: number) =>
      `/production-execution/machine-checklists/${entryId}/`,
    MACHINE_CHECKLISTS_BULK: '/production-execution/machine-checklists/bulk/',
    // Waste Management
    WASTE: '/production-execution/waste/',
    WASTE_DETAIL: (wasteId: number) => `/production-execution/waste/${wasteId}/`,
    WASTE_APPROVE_ENGINEER: (wasteId: number) =>
      `/production-execution/waste/${wasteId}/approve/engineer/`,
    WASTE_APPROVE_AM: (wasteId: number) =>
      `/production-execution/waste/${wasteId}/approve/am/`,
    WASTE_APPROVE_STORE: (wasteId: number) =>
      `/production-execution/waste/${wasteId}/approve/store/`,
    WASTE_APPROVE_HOD: (wasteId: number) =>
      `/production-execution/waste/${wasteId}/approve/hod/`,
    // Reports
    REPORTS_DAILY: '/production-execution/reports/daily-production/',
    REPORTS_YIELD: (runId: number) => `/production-execution/reports/yield/${runId}/`,
    REPORTS_ANALYTICS: '/production-execution/reports/analytics/',
    REPORTS_OEE: '/production-execution/reports/oee/',
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
