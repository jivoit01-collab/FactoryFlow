// ═══════════════════════════════════════════════════════════════
// Weighment API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that weighmentApi exports exist and expose the
// expected method names for managing weighment records.
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
    WEIGHMENT: {
      GET: vi.fn(),
      CREATE: vi.fn(),
    },
  },
}))

import { weighmentApi } from '../../../api/weighment/weighment.api'

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('weighmentApi', () => {
  it('is defined as an object', () => {
    expect(weighmentApi).toBeDefined()
    expect(typeof weighmentApi).toBe('object')
  })

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a get method', () => {
    expect(typeof weighmentApi.get).toBe('function')
  })

  it('has a create method', () => {
    expect(typeof weighmentApi.create).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(weighmentApi).sort()
    expect(methodNames).toEqual(['create', 'get'])
  })
})
