// ═══════════════════════════════════════════════════════════════
// Vehicle API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that vehicleApi exports exist and expose the expected
// method names for managing vehicles.
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
    VEHICLE: {
      VEHICLE_TYPES: '/vehicles/vehicle-types/',
      VEHICLE_NAMES: '/vehicles/vehicle-names/',
      VEHICLE_BY_ID: vi.fn(),
      VEHICLES: '/vehicles/',
    },
  },
}));

import { vehicleApi } from '../../../api/vehicle/vehicle.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('vehicleApi', () => {
  it('is defined as an object', () => {
    expect(vehicleApi).toBeDefined();
    expect(typeof vehicleApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getVehicleTypes method', () => {
    expect(typeof vehicleApi.getVehicleTypes).toBe('function');
  });

  it('has a getNames method', () => {
    expect(typeof vehicleApi.getNames).toBe('function');
  });

  it('has a getById method', () => {
    expect(typeof vehicleApi.getById).toBe('function');
  });

  it('has a getList method', () => {
    expect(typeof vehicleApi.getList).toBe('function');
  });

  it('has a create method', () => {
    expect(typeof vehicleApi.create).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(vehicleApi).sort();
    expect(methodNames).toEqual(['create', 'getById', 'getList', 'getNames', 'getVehicleTypes']);
  });
});
