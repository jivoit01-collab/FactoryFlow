// ═══════════════════════════════════════════════════════════════
// Vehicle Entry API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that vehicleEntryApi exports exist and expose the
// expected method names for managing vehicle entries.
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
    VEHICLE: {
      VEHICLE_ENTRIES: '/vehicles/entries/',
      VEHICLE_ENTRIES_BY_STATUS: '/vehicles/entries/by-status/',
      VEHICLE_ENTRY_BY_ID: vi.fn(),
      VEHICLE_ENTRIES_COUNT: '/vehicles/entries/count/',
    },
  },
}))

import { vehicleEntryApi } from '../../../api/vehicle/vehicleEntry.api'

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('vehicleEntryApi', () => {
  it('is defined as an object', () => {
    expect(vehicleEntryApi).toBeDefined()
    expect(typeof vehicleEntryApi).toBe('object')
  })

  // ═══════════════════════════════════════════════════════════════
  // Method existence
  // ═══════════════════════════════════════════════════════════════

  it('has a getList method', () => {
    expect(typeof vehicleEntryApi.getList).toBe('function')
  })

  it('has a getById method', () => {
    expect(typeof vehicleEntryApi.getById).toBe('function')
  })

  it('has a create method', () => {
    expect(typeof vehicleEntryApi.create).toBe('function')
  })

  it('has an update method', () => {
    expect(typeof vehicleEntryApi.update).toBe('function')
  })

  it('has a getCount method', () => {
    expect(typeof vehicleEntryApi.getCount).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(vehicleEntryApi).sort()
    expect(methodNames).toEqual(['create', 'getById', 'getCount', 'getList', 'update'])
  })
})
