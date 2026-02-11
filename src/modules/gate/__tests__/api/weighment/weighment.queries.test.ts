// ═══════════════════════════════════════════════════════════════
// Weighment Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for weighment records are
// exported as defined functions.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  queryOptions: vi.fn((opts: any) => opts),
}))

vi.mock('../../../api/weighment/weighment.api', () => ({
  weighmentApi: {
    get: vi.fn(),
    create: vi.fn(),
  },
}))

import {
  useWeighment,
  useCreateWeighment,
} from '../../../api/weighment/weighment.queries'

// ═══════════════════════════════════════════════════════════════
// Hook existence
// ═══════════════════════════════════════════════════════════════

describe('weighment queries', () => {
  it('exports useWeighment as a function', () => {
    expect(typeof useWeighment).toBe('function')
  })

  it('exports useCreateWeighment as a function', () => {
    expect(typeof useCreateWeighment).toBe('function')
  })
})
