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
