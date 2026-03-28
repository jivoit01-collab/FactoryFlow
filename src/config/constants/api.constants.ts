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

    // Production QC
    PRODUCTION_QC_LIST: '/quality-control/production-qc/',
    PRODUCTION_QC_PENDING: '/quality-control/production-qc/pending/',
    PRODUCTION_QC_COUNTS: '/quality-control/production-qc/counts/',
    PRODUCTION_QC_RUN_SESSIONS: (runId: number) =>
      `/quality-control/production-qc/runs/${runId}/sessions/`,
    PRODUCTION_QC_SESSION_DETAIL: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/`,
    PRODUCTION_QC_SESSION_RESULTS: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/results/`,
    PRODUCTION_QC_SESSION_SUBMIT: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/submit/`,
    PRODUCTION_QC_SESSION_APPROVE: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/approve/`,
    PRODUCTION_QC_SESSION_REJECT: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/reject/`,
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
  // SAP Plan Dashboard
  SAP_PLAN_DASHBOARD: {
    SUMMARY: '/sap/plan-dashboard/summary/',
    DETAILS: '/sap/plan-dashboard/details/',
    PROCUREMENT: '/sap/plan-dashboard/procurement/',
    SKU_DETAIL: (docEntry: number) => `/sap/plan-dashboard/sku/${docEntry}/`,
  },
  // Stock Dashboard
  STOCK_DASHBOARD: {
    LIST: '/dashboards/stock/',
  },
  // Production Execution
  PRODUCTION_EXECUTION: {
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
    // Breakdown Categories
    BREAKDOWN_CATEGORIES: '/production-execution/breakdown-categories/',
    BREAKDOWN_CATEGORY_DETAIL: (categoryId: number) =>
      `/production-execution/breakdown-categories/${categoryId}/`,
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
    // Resources
    RUN_ELECTRICITY: (runId: number) =>
      `/production-execution/runs/${runId}/resources/electricity/`,
    RUN_ELECTRICITY_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/electricity/${entryId}/`,
    RUN_WATER: (runId: number) =>
      `/production-execution/runs/${runId}/resources/water/`,
    RUN_WATER_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/water/${entryId}/`,
    RUN_GAS: (runId: number) =>
      `/production-execution/runs/${runId}/resources/gas/`,
    RUN_GAS_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/gas/${entryId}/`,
    RUN_COMPRESSED_AIR: (runId: number) =>
      `/production-execution/runs/${runId}/resources/compressed-air/`,
    RUN_COMPRESSED_AIR_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/compressed-air/${entryId}/`,
    RUN_LABOUR: (runId: number) =>
      `/production-execution/runs/${runId}/resources/labour/`,
    RUN_LABOUR_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/labour/${entryId}/`,
    RUN_MACHINE_COSTS: (runId: number) =>
      `/production-execution/runs/${runId}/resources/machine-costs/`,
    RUN_MACHINE_COSTS_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/machine-costs/${entryId}/`,
    RUN_OVERHEAD: (runId: number) =>
      `/production-execution/runs/${runId}/resources/overhead/`,
    RUN_OVERHEAD_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/overhead/${entryId}/`,
    // Cost
    RUN_COST: (runId: number) => `/production-execution/runs/${runId}/cost/`,
    COST_ANALYTICS: '/production-execution/costs/analytics/',
    // QC
    RUN_QC_INPROCESS: (runId: number) =>
      `/production-execution/runs/${runId}/qc/inprocess/`,
    RUN_QC_INPROCESS_DETAIL: (runId: number, checkId: number) =>
      `/production-execution/runs/${runId}/qc/inprocess/${checkId}/`,
    RUN_QC_FINAL: (runId: number) =>
      `/production-execution/runs/${runId}/qc/final/`,
    // SAP Orders & BOM
    SAP_ORDERS: '/production-execution/sap/orders/',
    SAP_ORDER_DETAIL: (docEntry: number) =>
      `/production-execution/sap/orders/${docEntry}/`,
    SAP_ITEMS: '/production-execution/sap/items/',
    SAP_BOM: '/production-execution/sap/bom/',
    // Reports
    REPORTS_DAILY: '/production-execution/reports/daily-production/',
    REPORTS_YIELD: (runId: number) => `/production-execution/reports/yield/${runId}/`,
    REPORTS_LINE_CLEARANCE: '/production-execution/reports/line-clearance/',
    REPORTS_ANALYTICS: '/production-execution/reports/analytics/',
    REPORTS_OEE: '/production-execution/reports/analytics/oee/',
    REPORTS_DOWNTIME: '/production-execution/reports/analytics/downtime/',
    REPORTS_WASTE_ANALYTICS: '/production-execution/reports/analytics/waste/',
    REPORTS_RESOURCE_CONSUMPTION: '/production-execution/reports/analytics/resource-consumption/',
    REPORTS_MONTHLY_SUMMARY: '/production-execution/reports/analytics/monthly-summary/',
    REPORTS_PLAN_VS_PRODUCTION: '/production-execution/reports/analytics/plan-vs-production/',
    REPORTS_PROCUREMENT_VS_PLANNED: '/production-execution/reports/analytics/procurement-vs-planned/',
    REPORTS_OEE_TREND: '/production-execution/reports/analytics/oee-trend/',
    REPORTS_DOWNTIME_PARETO: '/production-execution/reports/analytics/downtime-pareto/',
    REPORTS_COST_ANALYSIS: '/production-execution/reports/analytics/cost-analysis/',
    REPORTS_WASTE_TREND: '/production-execution/reports/analytics/waste-trend/',
    // Timeline Actions
    START_PRODUCTION: (runId: number) =>
      `/production-execution/runs/${runId}/start-production/`,
    STOP_PRODUCTION: (runId: number) =>
      `/production-execution/runs/${runId}/stop-production/`,
    ADD_BREAKDOWN: (runId: number) =>
      `/production-execution/runs/${runId}/add-breakdown/`,
    RESOLVE_BREAKDOWN: (runId: number, breakdownId: number) =>
      `/production-execution/runs/${runId}/breakdowns/${breakdownId}/resolve/`,
    SEGMENT_UPDATE: (runId: number, segmentId: number) =>
      `/production-execution/runs/${runId}/segments/${segmentId}/`,
    BREAKDOWN_UPDATE: (runId: number, breakdownId: number) =>
      `/production-execution/runs/${runId}/breakdowns/${breakdownId}/update/`,
    // Delete run
    RUN_DELETE: (runId: number) => `/production-execution/runs/${runId}/`,
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
