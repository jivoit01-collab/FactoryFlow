// ═══════════════════════════════════════════════════════════════
// Purchase Order API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that poApi exports exist and expose the expected
// method names for fetching purchase orders and vendors.
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
    PO: {
      OPEN_POS: vi.fn(),
      VENDORS: '/po/vendors/',
    },
  },
}));

import { poApi } from '../../../api/po/po.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('poApi', () => {
  it('is defined as an object', () => {
    expect(poApi).toBeDefined();
    expect(typeof poApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getOpenPOs method', () => {
    expect(typeof poApi.getOpenPOs).toBe('function');
  });

  it('has a getVendors method', () => {
    expect(typeof poApi.getVendors).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(poApi).sort();
    expect(methodNames).toEqual(['getOpenPOs', 'getVendors']);
  });
});
