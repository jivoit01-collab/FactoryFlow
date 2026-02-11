// ═══════════════════════════════════════════════════════════════
// Daily Need Full View Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for the daily need full
// view are exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}))

vi.mock('../../../api/dailyNeed/dailyNeedFullView.api', () => ({
  dailyNeedFullViewApi: {
    get: vi.fn(),
    complete: vi.fn(),
  },
}))

import {
  useDailyNeedFullView,
  useCompleteDailyNeedEntry,
} from '../../../api/dailyNeed/dailyNeedFullView.queries'

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('dailyNeedFullView queries', () => {
  it('exports useDailyNeedFullView as a function', () => {
    expect(typeof useDailyNeedFullView).toBe('function')
  })

  it('exports useCompleteDailyNeedEntry as a function', () => {
    expect(typeof useCompleteDailyNeedEntry).toBe('function')
  })
})
