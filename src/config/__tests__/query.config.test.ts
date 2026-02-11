import { describe, it, expect } from 'vitest'
import { QUERY_CONFIG } from '@/config/query.config'

// ═══════════════════════════════════════════════════════════════
// QUERY_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('QUERY_CONFIG', () => {
  it('exports QUERY_CONFIG object', () => {
    expect(QUERY_CONFIG).toBeDefined()
    expect(typeof QUERY_CONFIG).toBe('object')
  })

  it('has defaultOptions property', () => {
    expect(QUERY_CONFIG).toHaveProperty('defaultOptions')
  })

  // ─── Queries ───
  it('queries.staleTime is 5 minutes (300000ms)', () => {
    expect(QUERY_CONFIG.defaultOptions!.queries!.staleTime).toBe(5 * 60 * 1000)
  })

  it('queries.gcTime is 10 minutes (600000ms)', () => {
    expect(QUERY_CONFIG.defaultOptions!.queries!.gcTime).toBe(10 * 60 * 1000)
  })

  it('queries.retry is 1', () => {
    expect(QUERY_CONFIG.defaultOptions!.queries!.retry).toBe(1)
  })

  it('queries.refetchOnWindowFocus is false', () => {
    expect(QUERY_CONFIG.defaultOptions!.queries!.refetchOnWindowFocus).toBe(false)
  })

  it('queries.refetchOnReconnect is true', () => {
    expect(QUERY_CONFIG.defaultOptions!.queries!.refetchOnReconnect).toBe(true)
  })

  // ─── Mutations ───
  it('mutations.retry is 0', () => {
    expect(QUERY_CONFIG.defaultOptions!.mutations!.retry).toBe(0)
  })

  // ─── Shape validation ───
  it('staleTime is less than gcTime', () => {
    const staleTime = QUERY_CONFIG.defaultOptions!.queries!.staleTime as number
    const gcTime = QUERY_CONFIG.defaultOptions!.queries!.gcTime as number
    expect(staleTime).toBeLessThan(gcTime)
  })

  it('all timing values are positive numbers', () => {
    const staleTime = QUERY_CONFIG.defaultOptions!.queries!.staleTime as number
    const gcTime = QUERY_CONFIG.defaultOptions!.queries!.gcTime as number
    expect(staleTime).toBeGreaterThan(0)
    expect(gcTime).toBeGreaterThan(0)
  })
})
