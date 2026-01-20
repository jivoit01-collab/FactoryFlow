export const API_CONFIG = {
  baseUrl: 'http://192.168.1.84:3000/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/accounts/login/',
    LOGOUT: '/accounts/logout/',
    REFRESH: '/accounts/token/refresh/',
    ME: '/accounts/me/',
    CHANGE_PASSWORD: '/accounts/change-password/',
  },
  // Gate In
  GATE_IN: {
    BASE: '/gate-in',
    LIST: '/gate-in',
    DETAIL: (id: string) => `/gate-in/${id}`,
    CREATE: '/gate-in',
    UPDATE: (id: string) => `/gate-in/${id}`,
    DELETE: (id: string) => `/gate-in/${id}`,
  },
  // Quality Check
  QUALITY_CHECK: {
    BASE: '/quality-check',
    LIST: '/quality-check',
    DETAIL: (id: string) => `/quality-check/${id}`,
    CREATE: '/quality-check',
    UPDATE: (id: string) => `/quality-check/${id}`,
    DELETE: (id: string) => `/quality-check/${id}`,
  },
  // Vehicle Management
  VEHICLE: {
    TRANSPORTERS: '/vehicle-management/transporters/',
    VEHICLES: '/vehicle-management/vehicles/',
    VEHICLE_ENTRIES: '/vehicle-management/vehicle-entries/',
    VEHICLE_ENTRY_BY_ID: (id: number) => `/vehicle-management/vehicle-entries/${id}/`,
  },
  // Driver Management
  DRIVER: {
    DRIVERS: '/driver-management/drivers/',
  },
  // Security Checks
  SECURITY: {
    GATE_ENTRY_SECURITY: (entryId: number) =>
      `/security-checks/gate-entries/${entryId}/security/`,
    GATE_ENTRY_SECURITY_VIEW: (entryId: number) =>
      `/security-checks/gate-entries/${entryId}/security/view`,
  },
  // Purchase Orders
  PO: {
    OPEN_POS: (supplierCode?: string) =>
      supplierCode ? `/po/open-pos/?supplier_code=${supplierCode}` : '/po/open-pos/',
  },
  // Raw Material Gate In
  RAW_MATERIAL_GATEIN: {
    PO_RECEIPTS: (entryId: number) =>
      `/raw-material-gatein/gate-entries/${entryId}/po-receipts/`,
    PO_RECEIPTS_VIEW: (entryId: number) =>
      `/raw-material-gatein/gate-entries/${entryId}/po-receipts/view`,
  },
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const
