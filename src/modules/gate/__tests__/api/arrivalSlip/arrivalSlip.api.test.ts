// ═══════════════════════════════════════════════════════════════
// Arrival Slip API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that arrivalSlipApi exports exist and expose the
// expected method names for managing arrival slips.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    QUALITY_CONTROL_V2: {
      ARRIVAL_SLIP_GET: vi.fn(),
      ARRIVAL_SLIP_BY_ID: vi.fn(),
      ARRIVAL_SLIP_CREATE: vi.fn(),
      ARRIVAL_SLIP_SUBMIT: vi.fn(),
      ARRIVAL_SLIP_LIST: '/qc-v2/arrival-slips/',
    },
  },
}));

import { arrivalSlipApi } from '../../../api/arrivalSlip/arrivalSlip.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('arrivalSlipApi', () => {
  it('is defined as an object', () => {
    expect(arrivalSlipApi).toBeDefined();
    expect(typeof arrivalSlipApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a get method', () => {
    expect(typeof arrivalSlipApi.get).toBe('function');
  });

  it('has a getById method', () => {
    expect(typeof arrivalSlipApi.getById).toBe('function');
  });

  it('has a create method', () => {
    expect(typeof arrivalSlipApi.create).toBe('function');
  });

  it('has a update method', () => {
    expect(typeof arrivalSlipApi.update).toBe('function');
  });

  it('has a submit method', () => {
    expect(typeof arrivalSlipApi.submit).toBe('function');
  });

  it('has a list method', () => {
    expect(typeof arrivalSlipApi.list).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(arrivalSlipApi).sort();
    expect(methodNames).toEqual(['create', 'get', 'getById', 'list', 'submit', 'update']);
  });
});
