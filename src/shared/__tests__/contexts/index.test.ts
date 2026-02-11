import { describe, it, expect, vi } from 'vitest'

vi.mock('@/config/constants/app.constants', () => ({
  THEME_OPTIONS: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  },
}))

vi.mock('../../utils/storage', () => ({
  storage: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}))

describe('Contexts Index Exports', () => {
  it('exports ThemeProvider', async () => {
    const mod = await import('../../contexts/index')
    expect(mod.ThemeProvider).toBeDefined()
  })

  it('exports useTheme', async () => {
    const mod = await import('../../contexts/index')
    expect(mod.useTheme).toBeDefined()
    expect(typeof mod.useTheme).toBe('function')
  })
})
