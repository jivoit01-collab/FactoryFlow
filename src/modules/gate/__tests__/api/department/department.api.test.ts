// ═══════════════════════════════════════════════════════════════
// Department API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that departmentApi exports exist and expose the
// expected method names for fetching departments.
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
    ACCOUNTS: {
      DEPARTMENTS: '/accounts/departments/',
    },
  },
}));

import { departmentApi } from '../../../api/department/department.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('departmentApi', () => {
  it('is defined as an object', () => {
    expect(departmentApi).toBeDefined();
    expect(typeof departmentApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getDepartments method', () => {
    expect(typeof departmentApi.getDepartments).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(departmentApi).sort();
    expect(methodNames).toEqual(['getDepartments']);
  });
});
