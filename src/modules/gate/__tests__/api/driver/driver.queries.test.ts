// ═══════════════════════════════════════════════════════════════
// Driver Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for drivers are exported
// as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}))

vi.mock('../../../api/driver/driver.api', () => ({
  driverApi: {
    getNames: vi.fn(),
    getById: vi.fn(),
    getList: vi.fn(),
    create: vi.fn(),
  },
}))

import {
  useDriverNames,
  useDriverById,
  useDrivers,
  useCreateDriver,
} from '../../../api/driver/driver.queries'

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('driver queries', () => {
  it('exports useDriverNames as a function', () => {
    expect(typeof useDriverNames).toBe('function')
  })

  it('exports useDriverById as a function', () => {
    expect(typeof useDriverById).toBe('function')
  })

  it('exports useDrivers as a function', () => {
    expect(typeof useDrivers).toBe('function')
  })

  it('exports useCreateDriver as a function', () => {
    expect(typeof useCreateDriver).toBe('function')
  })
})
