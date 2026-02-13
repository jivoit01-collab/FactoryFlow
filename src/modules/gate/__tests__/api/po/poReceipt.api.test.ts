// ═══════════════════════════════════════════════════════════════
// PO Receipt API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that poReceiptApi exports exist and expose the
// expected method names for managing PO receipts.
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
    RAW_MATERIAL_GATEIN: {
      PO_RECEIPTS_VIEW: vi.fn(),
      PO_RECEIPTS: vi.fn(),
    },
  },
}));

import { poReceiptApi } from '../../../api/po/poReceipt.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('poReceiptApi', () => {
  it('is defined as an object', () => {
    expect(poReceiptApi).toBeDefined();
    expect(typeof poReceiptApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a get method', () => {
    expect(typeof poReceiptApi.get).toBe('function');
  });

  it('has a create method', () => {
    expect(typeof poReceiptApi.create).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(poReceiptApi).sort();
    expect(methodNames).toEqual(['create', 'get']);
  });
});
