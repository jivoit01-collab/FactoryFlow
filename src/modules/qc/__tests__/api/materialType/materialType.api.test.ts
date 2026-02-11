import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    QUALITY_CONTROL_V2: {
      MATERIAL_TYPES: '/api/v2/qc/material-types/',
      MATERIAL_TYPE_BY_ID: (id: number) => `/api/v2/qc/material-types/${id}/`,
    },
  },
}))

import { materialTypeApi } from '../../../api/materialType/materialType.api'

// ═══════════════════════════════════════════════════════════════
// materialTypeApi
// ═══════════════════════════════════════════════════════════════

describe('materialTypeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: [{ id: 1, name: 'Cap' }] })
    mockPost.mockResolvedValue({ data: { id: 2, name: 'New' } })
    mockPut.mockResolvedValue({ data: { id: 1, name: 'Updated' } })
    mockDelete.mockResolvedValue({})
  })

  it('is defined as an object', () => {
    expect(materialTypeApi).toBeDefined()
    expect(typeof materialTypeApi).toBe('object')
  })

  // ─── getList ──────────────────────────────────────────────────

  it('getList calls apiClient.get with correct endpoint and params', async () => {
    await materialTypeApi.getList({ search: 'cap' })
    expect(mockGet).toHaveBeenCalledWith('/api/v2/qc/material-types/', { params: { search: 'cap' } })
  })

  it('getList returns response.data', async () => {
    const result = await materialTypeApi.getList()
    expect(result).toEqual([{ id: 1, name: 'Cap' }])
  })

  // ─── getById ──────────────────────────────────────────────────

  it('getById calls apiClient.get with id in endpoint', async () => {
    mockGet.mockResolvedValue({ data: { id: 5, name: 'Cap' } })
    await materialTypeApi.getById(5)
    expect(mockGet).toHaveBeenCalledWith('/api/v2/qc/material-types/5/')
  })

  // ─── create ───────────────────────────────────────────────────

  it('create calls apiClient.post with data', async () => {
    const data = { code: 'CAP', name: 'Cap' }
    await materialTypeApi.create(data)
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/material-types/', data)
  })

  // ─── update ───────────────────────────────────────────────────

  it('update calls apiClient.put with id and data', async () => {
    const data = { code: 'CAP', name: 'Updated Cap' }
    await materialTypeApi.update(1, data)
    expect(mockPut).toHaveBeenCalledWith('/api/v2/qc/material-types/1/', data)
  })

  // ─── delete ───────────────────────────────────────────────────

  it('delete calls apiClient.delete with id endpoint', async () => {
    await materialTypeApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/api/v2/qc/material-types/1/')
  })

  // ─── Error propagation ───────────────────────────────────────

  it('propagates errors from API calls', async () => {
    mockGet.mockRejectedValue(new Error('Server error'))
    await expect(materialTypeApi.getList()).rejects.toThrow('Server error')
  })
})
