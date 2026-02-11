import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// AppProviders — File Content Verification
//
// Imports @/core/store, @/core/api, @/shared/contexts, and
// composes the full provider stack.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/providers/AppProviders.tsx'),
    'utf-8',
  )
}

describe('AppProviders', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports AppProviders as named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+AppProviders/)
  })

  it('imports Provider from react-redux', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*Provider[^}]*\}\s*from\s*['"]react-redux['"]/,
    )
  })

  it('imports QueryClientProvider from @tanstack/react-query', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*QueryClientProvider[^}]*\}\s*from\s*['"]@tanstack\/react-query['"]/,
    )
  })

  it('imports BrowserRouter from react-router-dom', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*BrowserRouter[^}]*\}\s*from\s*['"]react-router-dom['"]/,
    )
  })

  it('imports store from @/core/store and queryClient from @/core/api', () => {
    const content = readSource()
    expect(content).toMatch(/import\s*\{[^}]*store[^}]*\}\s*from\s*['"]@\/core\/store['"]/)
    expect(content).toMatch(
      /import\s*\{[^}]*queryClient[^}]*\}\s*from\s*['"]@\/core\/api['"]/,
    )
  })

  // ─── ThemedToaster Internal Component ───────────────────

  it('defines ThemedToaster internal component', () => {
    const content = readSource()
    expect(content).toMatch(/function\s+ThemedToaster/)
  })

  it('ThemedToaster uses useTheme to get resolvedTheme', () => {
    const content = readSource()
    expect(content).toContain('const { resolvedTheme } = useTheme()')
  })

  it('ThemedToaster renders Toaster with theme, position, richColors, closeButton', () => {
    const content = readSource()
    expect(content).toContain('<Toaster theme={resolvedTheme}')
    expect(content).toContain('position="top-right"')
    expect(content).toContain('richColors')
    expect(content).toContain('closeButton')
  })

  // ─── Provider Nesting Order ─────────────────────────────

  it('defines AppProvidersProps with children: React.ReactNode', () => {
    const content = readSource()
    expect(content).toMatch(/interface\s+AppProvidersProps/)
    expect(content).toContain('children: React.ReactNode')
  })

  it('outermost provider is Redux Provider with store={store}', () => {
    const content = readSource()
    expect(content).toContain('<Provider store={store}>')
  })

  it('second level is QueryClientProvider with client={queryClient}', () => {
    const content = readSource()
    expect(content).toContain('<QueryClientProvider client={queryClient}>')
  })

  it('third level is BrowserRouter', () => {
    const content = readSource()
    expect(content).toContain('<BrowserRouter>')
  })

  it('fourth level is ThemeProvider', () => {
    const content = readSource()
    expect(content).toContain('<ThemeProvider>')
    expect(content).toMatch(
      /import\s*\{[^}]*ThemeProvider[^}]*\}\s*from\s*['"]@\/shared\/contexts['"]/,
    )
  })

  it('fifth level is NotificationProvider wrapping children and ThemedToaster', () => {
    const content = readSource()
    expect(content).toContain('<NotificationProvider>')
    expect(content).toContain('{children}')
    expect(content).toContain('<ThemedToaster />')
    expect(content).toContain('</NotificationProvider>')
  })
})
