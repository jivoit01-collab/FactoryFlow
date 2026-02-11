import { describe, it, expect, vi } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// queryClient (src/core/api/queryClient.ts) — Direct Import + Mock
//
// Mock @tanstack/react-query and @/config/query.config before import.
// vi.hoisted() ensures the mock fn is available when vi.mock runs.
// ═══════════════════════════════════════════════════════════════

const { MockQueryClient } = vi.hoisted(() => ({
  MockQueryClient: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  QueryClient: MockQueryClient,
}))

vi.mock('@/config/query.config', () => ({
  QUERY_CONFIG: { defaultOptions: { queries: { staleTime: 5000 } } },
}))

import { queryClient } from '@/core/api/queryClient'
import { QUERY_CONFIG } from '@/config/query.config'

describe('queryClient', () => {
  it('exports queryClient', () => {
    expect(queryClient).toBeDefined()
  })

  it('instantiates QueryClient with QUERY_CONFIG', () => {
    expect(MockQueryClient).toHaveBeenCalledWith(QUERY_CONFIG)
  })

  it('QueryClient is called exactly once', () => {
    expect(MockQueryClient).toHaveBeenCalledTimes(1)
  })

  it('QUERY_CONFIG has defaultOptions', () => {
    expect(QUERY_CONFIG).toHaveProperty('defaultOptions')
  })
})
