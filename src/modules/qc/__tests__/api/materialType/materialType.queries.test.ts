import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════

const mockUseQuery = vi.fn(() => ({ data: undefined, isLoading: false }))
const mockUseMutation = vi.fn(() => ({ mutate: vi.fn(), isPending: false }))
const mockInvalidateQueries = vi.fn()
const mockUseQueryClient = vi.fn(() => ({ invalidateQueries: mockInvalidateQueries }))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('../../../api/materialType/materialType.api', () => ({
  materialTypeApi: {
    getList: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import {
  MATERIAL_TYPE_QUERY_KEYS,
  useMaterialTypes,
  useMaterialType,
  useCreateMaterialType,
  useUpdateMaterialType,
  useDeleteMaterialType,
} from '../../../api/materialType/materialType.queries'

// ═══════════════════════════════════════════════════════════════
// MATERIAL_TYPE_QUERY_KEYS
// ═══════════════════════════════════════════════════════════════

describe('MATERIAL_TYPE_QUERY_KEYS', () => {
  it('has all key as [materialTypes]', () => {
    expect(MATERIAL_TYPE_QUERY_KEYS.all).toEqual(['materialTypes'])
  })

  it('lists key extends all', () => {
    const key = MATERIAL_TYPE_QUERY_KEYS.lists()
    expect(key).toEqual(['materialTypes', 'list'])
  })

  it('list key includes params', () => {
    const key = MATERIAL_TYPE_QUERY_KEYS.list({ search: 'cap' })
    expect(key).toEqual(['materialTypes', 'list', { search: 'cap' }])
  })

  it('detail key includes id', () => {
    const key = MATERIAL_TYPE_QUERY_KEYS.detail(5)
    expect(key).toEqual(['materialTypes', 'detail', 5])
  })
})

// ═══════════════════════════════════════════════════════════════
// Query Hooks
// ═══════════════════════════════════════════════════════════════

describe('useMaterialTypes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls useQuery', () => {
    useMaterialTypes()
    expect(mockUseQuery).toHaveBeenCalled()
  })
})

describe('useMaterialType', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes enabled: false when id is null', () => {
    useMaterialType(null)
    const config = mockUseQuery.mock.calls[0][0] as Record<string, unknown>
    expect(config.enabled).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// Mutation Hooks
// ═══════════════════════════════════════════════════════════════

describe('useCreateMaterialType', () => {
  it('calls useMutation', () => {
    useCreateMaterialType()
    expect(mockUseMutation).toHaveBeenCalled()
  })
})

describe('useUpdateMaterialType', () => {
  it('calls useMutation', () => {
    useUpdateMaterialType()
    expect(mockUseMutation).toHaveBeenCalled()
  })
})

describe('useDeleteMaterialType', () => {
  it('calls useMutation', () => {
    useDeleteMaterialType()
    expect(mockUseMutation).toHaveBeenCalled()
  })
})
