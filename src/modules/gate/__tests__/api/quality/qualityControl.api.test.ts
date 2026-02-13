// ═══════════════════════════════════════════════════════════════
// Quality Control API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that qualityControlApi exports exist and expose the
// expected method names for managing quality control records.
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
    QUALITY_CONTROL: {
      GET: vi.fn(),
      CREATE: vi.fn(),
    },
  },
}));

import { qualityControlApi } from '../../../api/quality/qualityControl.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('qualityControlApi', () => {
  it('is defined as an object', () => {
    expect(qualityControlApi).toBeDefined();
    expect(typeof qualityControlApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a get method', () => {
    expect(typeof qualityControlApi.get).toBe('function');
  });

  it('has a create method', () => {
    expect(typeof qualityControlApi.create).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(qualityControlApi).sort();
    expect(methodNames).toEqual(['create', 'get']);
  });
});
