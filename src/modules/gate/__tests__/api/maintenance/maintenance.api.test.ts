// ═══════════════════════════════════════════════════════════════
// Maintenance API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that maintenanceApi exports exist and expose the
// expected method names for managing maintenance entries.
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

import { maintenanceApi } from '../../../api/maintenance/maintenance.api'

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('maintenanceApi', () => {
  it('is defined as an object', () => {
    expect(maintenanceApi).toBeDefined()
    expect(typeof maintenanceApi).toBe('object')
  })

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getTypes method', () => {
    expect(typeof maintenanceApi.getTypes).toBe('function')
  })

  it('has a getByEntryId method', () => {
    expect(typeof maintenanceApi.getByEntryId).toBe('function')
  })

  it('has a create method', () => {
    expect(typeof maintenanceApi.create).toBe('function')
  })

  it('has an update method', () => {
    expect(typeof maintenanceApi.update).toBe('function')
  })

  it('has a getFullView method', () => {
    expect(typeof maintenanceApi.getFullView).toBe('function')
  })

  it('has a complete method', () => {
    expect(typeof maintenanceApi.complete).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(maintenanceApi).sort()
    expect(methodNames).toEqual(['complete', 'create', 'getByEntryId', 'getFullView', 'getTypes', 'update'])
  })
})
