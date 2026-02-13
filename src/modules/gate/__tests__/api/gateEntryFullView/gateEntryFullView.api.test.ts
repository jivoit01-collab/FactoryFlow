// ═══════════════════════════════════════════════════════════════
// Gate Entry Full View API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that gateEntryFullViewApi exports exist and expose
// the expected method names for the PO gate entry full view.
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
    GATE_CORE: {
      FULL_VIEW: vi.fn(),
      COMPLETE: vi.fn(),
    },
  },
}));

import { gateEntryFullViewApi } from '../../../api/gateEntryFullView/gateEntryFullView.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('gateEntryFullViewApi', () => {
  it('is defined as an object', () => {
    expect(gateEntryFullViewApi).toBeDefined();
    expect(typeof gateEntryFullViewApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a get method', () => {
    expect(typeof gateEntryFullViewApi.get).toBe('function');
  });

  it('has a complete method', () => {
    expect(typeof gateEntryFullViewApi.complete).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(gateEntryFullViewApi).sort();
    expect(methodNames).toEqual(['complete', 'get']);
  });
});
