// ═══════════════════════════════════════════════════════════════
// Daily Need Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for daily need entries
// are exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}))

vi.mock('../../../api/dailyNeed/dailyNeed.api', () => ({
  dailyNeedApi: {
    getCategories: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
}))

import {
  useDailyNeedCategories,
  useDailyNeed,
  useCreateDailyNeed,
} from '../../../api/dailyNeed/dailyNeed.queries'

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('dailyNeed queries', () => {
  it('exports useDailyNeedCategories as a function', () => {
    expect(typeof useDailyNeedCategories).toBe('function')
  })

  it('exports useDailyNeed as a function', () => {
    expect(typeof useDailyNeed).toBe('function')
  })

  it('exports useCreateDailyNeed as a function', () => {
    expect(typeof useCreateDailyNeed).toBe('function')
  })
})
