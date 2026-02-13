// ═══════════════════════════════════════════════════════════════
// Security Check API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that securityCheckApi exports exist and expose the
// expected method names for managing security checks.
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
    SECURITY: {
      GATE_ENTRY_SECURITY_VIEW: vi.fn(),
      GATE_ENTRY_SECURITY: vi.fn(),
      SUBMIT: vi.fn(),
    },
  },
}));

import { securityCheckApi } from '../../../api/securityCheck/securityCheck.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('securityCheckApi', () => {
  it('is defined as an object', () => {
    expect(securityCheckApi).toBeDefined();
    expect(typeof securityCheckApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a get method', () => {
    expect(typeof securityCheckApi.get).toBe('function');
  });

  it('has a submit method', () => {
    expect(typeof securityCheckApi.submit).toBe('function');
  });

  it('has a create method', () => {
    expect(typeof securityCheckApi.create).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(securityCheckApi).sort();
    expect(methodNames).toEqual(['create', 'get', 'submit']);
  });
});
