import { describe, it, expect, vi } from 'vitest'
import { initI18n } from '@/core/i18n'

// ═══════════════════════════════════════════════════════════════
// i18n Index (src/core/i18n/index.ts) — Direct Import
//
// No-op placeholder with zero deps.
// ═══════════════════════════════════════════════════════════════

describe('i18n Index', () => {
  it('initI18n is a function', () => {
    expect(typeof initI18n).toBe('function')
  })

  it('initI18n returns undefined (no-op)', () => {
    const result = initI18n()
    expect(result).toBeUndefined()
  })

  it('initI18n does not throw', () => {
    expect(() => initI18n()).not.toThrow()
  })
})
