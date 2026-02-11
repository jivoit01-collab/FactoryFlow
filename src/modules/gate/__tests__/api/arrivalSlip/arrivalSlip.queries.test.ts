// ═══════════════════════════════════════════════════════════════
// Arrival Slip Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for arrival slips are
// exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}))

vi.mock('../../../api/arrivalSlip/arrivalSlip.api', () => ({
  arrivalSlipApi: {
    get: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    submit: vi.fn(),
    list: vi.fn(),
  },
}))

import {
  useArrivalSlip,
  useArrivalSlipById,
  useArrivalSlips,
  useCreateArrivalSlip,
  useUpdateArrivalSlip,
  useSubmitArrivalSlip,
} from '../../../api/arrivalSlip/arrivalSlip.queries'

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('arrivalSlip queries', () => {
  it('exports useArrivalSlip as a function', () => {
    expect(typeof useArrivalSlip).toBe('function')
  })

  it('exports useArrivalSlipById as a function', () => {
    expect(typeof useArrivalSlipById).toBe('function')
  })

  it('exports useArrivalSlips as a function', () => {
    expect(typeof useArrivalSlips).toBe('function')
  })

  it('exports useCreateArrivalSlip as a function', () => {
    expect(typeof useCreateArrivalSlip).toBe('function')
  })

  it('exports useUpdateArrivalSlip as a function', () => {
    expect(typeof useUpdateArrivalSlip).toBe('function')
  })

  it('exports useSubmitArrivalSlip as a function', () => {
    expect(typeof useSubmitArrivalSlip).toBe('function')
  })
})
