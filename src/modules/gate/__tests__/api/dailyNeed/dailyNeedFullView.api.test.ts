// ═══════════════════════════════════════════════════════════════
// Daily Need Full View API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that dailyNeedFullViewApi exports exist and expose
// the expected method names for the daily need full view.
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
    DAILY_NEEDS_GATEIN: {
      FULL_VIEW: vi.fn(),
      COMPLETE: vi.fn(),
    },
  },
}))

import { dailyNeedFullViewApi } from '../../../api/dailyNeed/dailyNeedFullView.api'

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('dailyNeedFullViewApi', () => {
  it('is defined as an object', () => {
    expect(dailyNeedFullViewApi).toBeDefined()
    expect(typeof dailyNeedFullViewApi).toBe('object')
  })

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a get method', () => {
    expect(typeof dailyNeedFullViewApi.get).toBe('function')
  })

  it('has a complete method', () => {
    expect(typeof dailyNeedFullViewApi.complete).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(dailyNeedFullViewApi).sort()
    expect(methodNames).toEqual(['complete', 'get'])
  })
})
