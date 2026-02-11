// ═══════════════════════════════════════════════════════════════
// Construction Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for construction entries
// are exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}))

vi.mock('../../../api/construction/construction.api', () => ({
  constructionApi: {
    getCategories: vi.fn(),
    getByEntryId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getFullView: vi.fn(),
    complete: vi.fn(),
  },
}))

import {
  useConstructionCategories,
  useConstructionEntry,
  useCreateConstructionEntry,
  useUpdateConstructionEntry,
  useConstructionFullView,
  useCompleteConstructionEntry,
} from '../../../api/construction/construction.queries'

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('construction queries', () => {
  it('exports useConstructionCategories as a function', () => {
    expect(typeof useConstructionCategories).toBe('function')
  })

  it('exports useConstructionEntry as a function', () => {
    expect(typeof useConstructionEntry).toBe('function')
  })

  it('exports useCreateConstructionEntry as a function', () => {
    expect(typeof useCreateConstructionEntry).toBe('function')
  })

  it('exports useUpdateConstructionEntry as a function', () => {
    expect(typeof useUpdateConstructionEntry).toBe('function')
  })

  it('exports useConstructionFullView as a function', () => {
    expect(typeof useConstructionFullView).toBe('function')
  })

  it('exports useCompleteConstructionEntry as a function', () => {
    expect(typeof useCompleteConstructionEntry).toBe('function')
  })
})
