import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════

const mockGet = vi.fn()

vi.mock('@/core/api', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}))

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    QUALITY_CONTROL_V2: {
      ARRIVAL_SLIP_BY_ID: (id: number) => `/api/v2/qc/arrival-slips/${id}/`,
    },
  },
}))

import { arrivalSlipApi } from '../../../api/arrivalSlip/arrivalSlip.api'

// ═══════════════════════════════════════════════════════════════
// arrivalSlipApi
// ═══════════════════════════════════════════════════════════════

describe('arrivalSlipApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: { id: 1, status: 'DRAFT' } })
  })

  it('is defined as an object', () => {
    expect(arrivalSlipApi).toBeDefined()
    expect(typeof arrivalSlipApi).toBe('object')
  })

  it('has a getById method', () => {
    expect(typeof arrivalSlipApi.getById).toBe('function')
  })

  it('getById calls apiClient.get with correct endpoint', async () => {
    await arrivalSlipApi.getById(42)
    expect(mockGet).toHaveBeenCalledWith('/api/v2/qc/arrival-slips/42/')
  })

  it('getById returns response.data', async () => {
    mockGet.mockResolvedValue({ data: { id: 42, status: 'SUBMITTED' } })
    const result = await arrivalSlipApi.getById(42)
    expect(result).toEqual({ id: 42, status: 'SUBMITTED' })
  })

  it('getById propagates errors', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    await expect(arrivalSlipApi.getById(1)).rejects.toThrow('Network error')
  })

  it('only exposes getById as a method', () => {
    const keys = Object.keys(arrivalSlipApi)
    expect(keys).toEqual(['getById'])
  })
})
