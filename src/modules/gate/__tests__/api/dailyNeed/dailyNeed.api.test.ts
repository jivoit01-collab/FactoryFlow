// ═══════════════════════════════════════════════════════════════
// Daily Need API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that dailyNeedApi exports exist and expose the
// expected method names for managing daily need entries.
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
    DAILY_NEEDS_GATEIN: {
      CATEGORIES: '/daily-needs/categories/',
      GET: vi.fn(),
      CREATE: vi.fn(),
    },
  },
}));

import { dailyNeedApi } from '../../../api/dailyNeed/dailyNeed.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('dailyNeedApi', () => {
  it('is defined as an object', () => {
    expect(dailyNeedApi).toBeDefined();
    expect(typeof dailyNeedApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getCategories method', () => {
    expect(typeof dailyNeedApi.getCategories).toBe('function');
  });

  it('has a get method', () => {
    expect(typeof dailyNeedApi.get).toBe('function');
  });

  it('has a create method', () => {
    expect(typeof dailyNeedApi.create).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(dailyNeedApi).sort();
    expect(methodNames).toEqual(['create', 'get', 'getCategories']);
  });
});
