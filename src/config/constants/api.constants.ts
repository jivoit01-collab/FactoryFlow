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
