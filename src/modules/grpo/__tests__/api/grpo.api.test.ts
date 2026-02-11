// ═══════════════════════════════════════════════════════════════
// GRPO API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that grpoApi exports exist and expose the
// expected method names for managing GRPO operations.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/core/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    GRPO: {
      PENDING: '/grpo/pending/',
      PREVIEW: vi.fn((id: number) => `/grpo/preview/${id}/`),
      POST: '/grpo/post/',
      HISTORY: '/grpo/history/',
      DETAIL: vi.fn((id: number) => `/grpo/history/${id}/`),
    },
    PO: {
      WAREHOUSES: '/po/warehouses/',
    },
  },
}))

import { grpoApi } from '../../api/grpo.api'

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('grpoApi', () => {
  it('is defined as an object', () => {
    expect(grpoApi).toBeDefined()
    expect(typeof grpoApi).toBe('object')
  })

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getPendingEntries method', () => {
    expect(typeof grpoApi.getPendingEntries).toBe('function')
  })

  it('has a getPreview method', () => {
    expect(typeof grpoApi.getPreview).toBe('function')
  })

  it('has a post method', () => {
    expect(typeof grpoApi.post).toBe('function')
  })

  it('has a getHistory method', () => {
    expect(typeof grpoApi.getHistory).toBe('function')
  })

  it('has a getDetail method', () => {
    expect(typeof grpoApi.getDetail).toBe('function')
  })

  it('has a getWarehouses method', () => {
    expect(typeof grpoApi.getWarehouses).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(grpoApi).sort()
    expect(methodNames).toEqual([
      'getDetail',
      'getHistory',
      'getPendingEntries',
      'getPreview',
      'getWarehouses',
      'post',
    ])
  })
})
