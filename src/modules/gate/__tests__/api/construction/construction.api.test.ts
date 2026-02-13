// ═══════════════════════════════════════════════════════════════
// Construction API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that constructionApi exports exist and expose the
// expected method names for managing construction entries.
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

import { constructionApi } from '../../../api/construction/construction.api';

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('constructionApi', () => {
  it('is defined as an object', () => {
    expect(constructionApi).toBeDefined();
    expect(typeof constructionApi).toBe('object');
  });

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getCategories method', () => {
    expect(typeof constructionApi.getCategories).toBe('function');
  });

  it('has a getByEntryId method', () => {
    expect(typeof constructionApi.getByEntryId).toBe('function');
  });

  it('has a create method', () => {
    expect(typeof constructionApi.create).toBe('function');
  });

  it('has an update method', () => {
    expect(typeof constructionApi.update).toBe('function');
  });

  it('has a getFullView method', () => {
    expect(typeof constructionApi.getFullView).toBe('function');
  });

  it('has a complete method', () => {
    expect(typeof constructionApi.complete).toBe('function');
  });

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(constructionApi).sort();
    expect(methodNames).toEqual([
      'complete',
      'create',
      'getByEntryId',
      'getCategories',
      'getFullView',
      'update',
    ]);
  });
});
