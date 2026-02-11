import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════

const mockUseQuery = vi.fn(() => ({ data: undefined, isLoading: false }))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

const mockGetById = vi.fn()
vi.mock('../../../api/arrivalSlip/arrivalSlip.api', () => ({
  arrivalSlipApi: { getById: (...args: unknown[]) => mockGetById(...args) },
}))

import {
  ARRIVAL_SLIP_QUERY_KEYS,
  useArrivalSlipById,
} from '../../../api/arrivalSlip/arrivalSlip.queries'

// ═══════════════════════════════════════════════════════════════
// ARRIVAL_SLIP_QUERY_KEYS
// ═══════════════════════════════════════════════════════════════

describe('ARRIVAL_SLIP_QUERY_KEYS', () => {
  it('is defined', () => {
    expect(ARRIVAL_SLIP_QUERY_KEYS).toBeDefined()
  })

  it('has all key as [qc-arrivalSlips]', () => {
    expect(ARRIVAL_SLIP_QUERY_KEYS.all).toEqual(['qc-arrivalSlips'])
  })

  it('detail key includes id', () => {
    const key = ARRIVAL_SLIP_QUERY_KEYS.detail(42)
    expect(key).toEqual(['qc-arrivalSlips', 'detail', 42])
  })
})

// ═══════════════════════════════════════════════════════════════
// useArrivalSlipById
// ═══════════════════════════════════════════════════════════════

describe('useArrivalSlipById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false })
  })

  it('is a function', () => {
    expect(typeof useArrivalSlipById).toBe('function')
  })

  it('calls useQuery', () => {
    useArrivalSlipById(1)
    expect(mockUseQuery).toHaveBeenCalled()
  })

  it('passes enabled: false when slipId is null', () => {
    useArrivalSlipById(null)
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>
    expect(config.enabled).toBe(false)
  })

  it('passes enabled: true when slipId is truthy', () => {
    useArrivalSlipById(5)
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>
    expect(config.enabled).toBe(true)
  })
})
