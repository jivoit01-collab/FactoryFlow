// ═══════════════════════════════════════════════════════════════
// Vehicle Entry Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for vehicle entries are
// exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}))

vi.mock('../../../api/vehicle/vehicleEntry.api', () => ({
  vehicleEntryApi: {
    getList: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getCount: vi.fn(),
  },
}))

import {
  useVehicleEntries,
  useVehicleEntriesCount,
  useVehicleEntry,
  useCreateVehicleEntry,
  useUpdateVehicleEntry,
} from '../../../api/vehicle/vehicleEntry.queries'

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('vehicleEntry queries', () => {
  it('exports useVehicleEntries as a function', () => {
    expect(typeof useVehicleEntries).toBe('function')
  })

  it('exports useVehicleEntriesCount as a function', () => {
    expect(typeof useVehicleEntriesCount).toBe('function')
  })

  it('exports useVehicleEntry as a function', () => {
    expect(typeof useVehicleEntry).toBe('function')
  })

  it('exports useCreateVehicleEntry as a function', () => {
    expect(typeof useCreateVehicleEntry).toBe('function')
  })

  it('exports useUpdateVehicleEntry as a function', () => {
    expect(typeof useUpdateVehicleEntry).toBe('function')
  })
})
