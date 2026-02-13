// ═══════════════════════════════════════════════════════════════
// Transporter API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that transporterApi exports exist and expose the
// expected method names for managing transporters.
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
      TRANSPORTER_NAMES: '/vehicles/transporter-names/',
      TRANSPORTER_BY_ID: vi.fn(),
      TRANSPORTERS: '/vehicles/transporters/',
    },
  },
}));

import { transporterApi } from '../../../api/transporter/transporter.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('transporterApi', () => {
  it('is defined as an object', () => {
    expect(transporterApi).toBeDefined();
    expect(typeof transporterApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getNames method', () => {
    expect(typeof transporterApi.getNames).toBe('function');
  });

  it('has a getById method', () => {
    expect(typeof transporterApi.getById).toBe('function');
  });

  it('has a getList method', () => {
    expect(typeof transporterApi.getList).toBe('function');
  });

  it('has a create method', () => {
    expect(typeof transporterApi.create).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(transporterApi).sort();
    expect(methodNames).toEqual(['create', 'getById', 'getList', 'getNames']);
  });
});
