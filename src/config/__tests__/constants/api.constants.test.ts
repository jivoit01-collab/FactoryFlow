import { describe, it, expect } from 'vitest';
import { API_CONFIG, API_ENDPOINTS, HTTP_STATUS } from '@/config/constants/api.constants';

// ═══════════════════════════════════════════════════════════════
// API_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('API_CONFIG', () => {
  it('has baseUrl, timeout, retryAttempts, retryDelay keys', () => {
    expect(API_CONFIG).toHaveProperty('baseUrl');
    expect(API_CONFIG).toHaveProperty('timeout');
    expect(API_CONFIG).toHaveProperty('retryAttempts');
    expect(API_CONFIG).toHaveProperty('retryDelay');
  });

  it('baseUrl is a string', () => {
    expect(typeof API_CONFIG.baseUrl).toBe('string');
  });

  it('timeout is 30000', () => {
    expect(API_CONFIG.timeout).toBe(30000);
  });

  it('retryAttempts is 3', () => {
    expect(API_CONFIG.retryAttempts).toBe(3);
  });

  it('retryDelay is 1000', () => {
    expect(API_CONFIG.retryDelay).toBe(1000);
  });
});

// ═══════════════════════════════════════════════════════════════
// API_ENDPOINTS — AUTH
// ═══════════════════════════════════════════════════════════════

describe('API_ENDPOINTS.AUTH', () => {
  it('has LOGIN, LOGOUT, REFRESH, ME, CHANGE_PASSWORD', () => {
    expect(API_ENDPOINTS.AUTH).toHaveProperty('LOGIN');
    expect(API_ENDPOINTS.AUTH).toHaveProperty('LOGOUT');
    expect(API_ENDPOINTS.AUTH).toHaveProperty('REFRESH');
    expect(API_ENDPOINTS.AUTH).toHaveProperty('ME');
    expect(API_ENDPOINTS.AUTH).toHaveProperty('CHANGE_PASSWORD');
  });

  it('LOGIN is "/accounts/login/"', () => {
    expect(API_ENDPOINTS.AUTH.LOGIN).toBe('/accounts/login/');
  });

  it('all AUTH endpoints are strings starting with "/"', () => {
    for (const value of Object.values(API_ENDPOINTS.AUTH)) {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\//);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// API_ENDPOINTS — VEHICLE
// ═══════════════════════════════════════════════════════════════

describe('API_ENDPOINTS.VEHICLE', () => {
  it('has all expected endpoint keys', () => {
    expect(API_ENDPOINTS.VEHICLE).toHaveProperty('TRANSPORTERS');
    expect(API_ENDPOINTS.VEHICLE).toHaveProperty('VEHICLE_TYPES');
    expect(API_ENDPOINTS.VEHICLE).toHaveProperty('VEHICLES');
    expect(API_ENDPOINTS.VEHICLE).toHaveProperty('VEHICLE_ENTRIES');
    expect(API_ENDPOINTS.VEHICLE).toHaveProperty('VEHICLE_ENTRIES_COUNT');
  });

  it('TRANSPORTER_BY_ID returns correct parameterized path', () => {
    expect(API_ENDPOINTS.VEHICLE.TRANSPORTER_BY_ID(5)).toBe('/vehicle-management/transporters/5/');
  });

  it('VEHICLE_BY_ID returns correct parameterized path', () => {
    expect(API_ENDPOINTS.VEHICLE.VEHICLE_BY_ID(10)).toBe('/vehicle-management/vehicles/10/');
  });

  it('VEHICLE_ENTRY_BY_ID returns correct parameterized path', () => {
    expect(API_ENDPOINTS.VEHICLE.VEHICLE_ENTRY_BY_ID(3)).toBe(
      '/vehicle-management/vehicle-entries/3/',
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// API_ENDPOINTS — DRIVER
// ═══════════════════════════════════════════════════════════════

describe('API_ENDPOINTS.DRIVER', () => {
  it('has DRIVERS, DRIVER_NAMES, DRIVER_BY_ID keys', () => {
    expect(API_ENDPOINTS.DRIVER).toHaveProperty('DRIVERS');
    expect(API_ENDPOINTS.DRIVER).toHaveProperty('DRIVER_NAMES');
    expect(API_ENDPOINTS.DRIVER).toHaveProperty('DRIVER_BY_ID');
  });

  it('DRIVER_BY_ID returns correct parameterized path', () => {
    expect(API_ENDPOINTS.DRIVER.DRIVER_BY_ID(7)).toBe('/driver-management/drivers/7/');
  });
});

// ═══════════════════════════════════════════════════════════════
// API_ENDPOINTS — SECURITY
// ═══════════════════════════════════════════════════════════════

describe('API_ENDPOINTS.SECURITY', () => {
  it('GATE_ENTRY_SECURITY returns correct parameterized path', () => {
    expect(API_ENDPOINTS.SECURITY.GATE_ENTRY_SECURITY(1)).toBe(
      '/security-checks/gate-entries/1/security/',
    );
  });

  it('SUBMIT returns correct parameterized path', () => {
    expect(API_ENDPOINTS.SECURITY.SUBMIT(2)).toBe('/security-checks/security/2/submit/');
  });
});

// ═══════════════════════════════════════════════════════════════
// API_ENDPOINTS — PO
// ═══════════════════════════════════════════════════════════════

describe('API_ENDPOINTS.PO', () => {
  it('OPEN_POS returns base path without supplier code', () => {
    expect(API_ENDPOINTS.PO.OPEN_POS()).toBe('/po/open-pos/');
  });

  it('OPEN_POS returns path with supplier code query param', () => {
    expect(API_ENDPOINTS.PO.OPEN_POS('SUP001')).toBe('/po/open-pos/?supplier_code=SUP001');
  });
});

// ═══════════════════════════════════════════════════════════════
// API_ENDPOINTS — WEIGHMENT & QUALITY_CONTROL
// ═══════════════════════════════════════════════════════════════

describe('API_ENDPOINTS.WEIGHMENT', () => {
  it('CREATE and GET return correct paths', () => {
    expect(API_ENDPOINTS.WEIGHMENT.CREATE(1)).toContain('/weighment/');
    expect(API_ENDPOINTS.WEIGHMENT.GET(1)).toContain('/weighment/');
  });
});

describe('API_ENDPOINTS.QUALITY_CONTROL', () => {
  it('CREATE and GET return correct paths', () => {
    expect(API_ENDPOINTS.QUALITY_CONTROL.CREATE(1)).toContain('/quality-control/');
    expect(API_ENDPOINTS.QUALITY_CONTROL.GET(1)).toContain('/quality-control/');
  });
});

// ═══════════════════════════════════════════════════════════════
// API_ENDPOINTS — NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

describe('API_ENDPOINTS.NOTIFICATIONS', () => {
  it('has LIST, DETAIL, UNREAD_COUNT, MARK_READ, PREFERENCES keys', () => {
    expect(API_ENDPOINTS.NOTIFICATIONS).toHaveProperty('LIST');
    expect(API_ENDPOINTS.NOTIFICATIONS).toHaveProperty('DETAIL');
    expect(API_ENDPOINTS.NOTIFICATIONS).toHaveProperty('UNREAD_COUNT');
    expect(API_ENDPOINTS.NOTIFICATIONS).toHaveProperty('MARK_READ');
    expect(API_ENDPOINTS.NOTIFICATIONS).toHaveProperty('PREFERENCES');
  });

  it('DETAIL returns correct parameterized path', () => {
    expect(API_ENDPOINTS.NOTIFICATIONS.DETAIL(5)).toBe('/notifications/5/');
  });

  it('DEVICES has REGISTER and UNREGISTER', () => {
    expect(API_ENDPOINTS.NOTIFICATIONS.DEVICES).toHaveProperty('REGISTER');
    expect(API_ENDPOINTS.NOTIFICATIONS.DEVICES).toHaveProperty('UNREGISTER');
  });
});

// ═══════════════════════════════════════════════════════════════
// API_ENDPOINTS — QUALITY_CONTROL_V2
// ═══════════════════════════════════════════════════════════════

describe('API_ENDPOINTS.QUALITY_CONTROL_V2', () => {
  it('has all arrival slip endpoints', () => {
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('ARRIVAL_SLIP_LIST');
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('ARRIVAL_SLIP_CREATE');
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('ARRIVAL_SLIP_BY_ID');
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('ARRIVAL_SLIP_SUBMIT');
  });

  it('has all inspection endpoints', () => {
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('PENDING_INSPECTIONS');
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('INSPECTION_BY_ID');
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('INSPECTION_FOR_SLIP');
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('INSPECTION_SUBMIT');
  });

  it('has all approval endpoints', () => {
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('APPROVE_CHEMIST');
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('APPROVE_QAM');
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2).toHaveProperty('REJECT_INSPECTION');
  });

  it('function endpoints return correct parameterized paths', () => {
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2.ARRIVAL_SLIP_BY_ID(1)).toBe(
      '/quality-control/arrival-slips/1/',
    );
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2.INSPECTION_BY_ID(2)).toBe(
      '/quality-control/inspections/2/',
    );
    expect(API_ENDPOINTS.QUALITY_CONTROL_V2.APPROVE_CHEMIST(3)).toBe(
      '/quality-control/inspections/3/approve/chemist/',
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// API_ENDPOINTS — GRPO
// ═══════════════════════════════════════════════════════════════

describe('API_ENDPOINTS.GRPO', () => {
  it('has PENDING, PREVIEW, POST, HISTORY, DETAIL', () => {
    expect(API_ENDPOINTS.GRPO).toHaveProperty('PENDING');
    expect(API_ENDPOINTS.GRPO).toHaveProperty('PREVIEW');
    expect(API_ENDPOINTS.GRPO).toHaveProperty('POST');
    expect(API_ENDPOINTS.GRPO).toHaveProperty('HISTORY');
    expect(API_ENDPOINTS.GRPO).toHaveProperty('DETAIL');
  });

  it('PREVIEW returns correct parameterized path', () => {
    expect(API_ENDPOINTS.GRPO.PREVIEW(10)).toBe('/grpo/preview/10/');
  });

  it('DETAIL returns correct parameterized path', () => {
    expect(API_ENDPOINTS.GRPO.DETAIL(5)).toBe('/grpo/5/');
  });
});

// ═══════════════════════════════════════════════════════════════
// HTTP_STATUS
// ═══════════════════════════════════════════════════════════════

describe('HTTP_STATUS', () => {
  it('has all standard HTTP status codes', () => {
    expect(HTTP_STATUS).toHaveProperty('OK');
    expect(HTTP_STATUS).toHaveProperty('CREATED');
    expect(HTTP_STATUS).toHaveProperty('NO_CONTENT');
    expect(HTTP_STATUS).toHaveProperty('BAD_REQUEST');
    expect(HTTP_STATUS).toHaveProperty('UNAUTHORIZED');
    expect(HTTP_STATUS).toHaveProperty('FORBIDDEN');
    expect(HTTP_STATUS).toHaveProperty('NOT_FOUND');
    expect(HTTP_STATUS).toHaveProperty('INTERNAL_SERVER_ERROR');
  });

  it('OK is 200', () => {
    expect(HTTP_STATUS.OK).toBe(200);
  });

  it('UNAUTHORIZED is 401', () => {
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
  });

  it('INTERNAL_SERVER_ERROR is 500', () => {
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
  });

  it('all values are positive integers', () => {
    for (const [, value] of Object.entries(HTTP_STATUS)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});
