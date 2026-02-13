// ═══════════════════════════════════════════════════════════════
// Driver API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that driverApi exports exist and expose the expected
// method names for managing drivers.
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
    DRIVER: {
      DRIVER_NAMES: '/drivers/names/',
      DRIVER_BY_ID: vi.fn(),
      DRIVERS: '/drivers/',
    },
  },
}));

import { driverApi } from '../../../api/driver/driver.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('driverApi', () => {
  it('is defined as an object', () => {
    expect(driverApi).toBeDefined();
    expect(typeof driverApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getNames method', () => {
    expect(typeof driverApi.getNames).toBe('function');
  });

  it('has a getById method', () => {
    expect(typeof driverApi.getById).toBe('function');
  });

  it('has a getList method', () => {
    expect(typeof driverApi.getList).toBe('function');
  });

  it('has a create method', () => {
    expect(typeof driverApi.create).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(driverApi).sort();
    expect(methodNames).toEqual(['create', 'getById', 'getList', 'getNames']);
  });
});
