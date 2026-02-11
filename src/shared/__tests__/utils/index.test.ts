import { describe, it, expect, vi } from 'vitest'

vi.mock('@/config/constants', () => ({
  APP_DEFAULTS: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
}))

describe('Utils Index Exports', () => {
  it('exports cn utility', async () => {
    const mod = await import('../../utils/index')
    expect(mod.cn).toBeDefined()
    expect(typeof mod.cn).toBe('function')
  })

  it('exports error utilities', async () => {
    const mod = await import('../../utils/index')
    expect(mod.getErrorMessage).toBeDefined()
    expect(mod.isNotFoundError).toBeDefined()
    expect(mod.isServerError).toBeDefined()
    expect(mod.getSmartErrorMessage).toBeDefined()
  })

  it('exports format utilities', async () => {
    const mod = await import('../../utils/index')
    expect(mod.formatDate).toBeDefined()
    expect(mod.formatTime).toBeDefined()
    expect(mod.formatDateTime).toBeDefined()
    expect(mod.formatNumber).toBeDefined()
    expect(mod.formatCurrency).toBeDefined()
  })

  it('exports storage utilities', async () => {
    const mod = await import('../../utils/index')
    expect(mod.storage).toBeDefined()
    expect(mod.sessionStorage).toBeDefined()
  })

  it('exports formConditions utilities', async () => {
    const mod = await import('../../utils/index')
    expect(mod.isReadOnly).toBeDefined()
    expect(mod.canPerformAction).toBeDefined()
    expect(mod.isEditingAllowed).toBeDefined()
    expect(mod.canModifyItem).toBeDefined()
    expect(mod.isEntryCompleted).toBeDefined()
    expect(mod.canEditEntry).toBeDefined()
  })
})
