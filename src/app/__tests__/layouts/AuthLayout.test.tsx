import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// AuthLayout — File Content Verification
//
// AuthLayout only imports react-router-dom's Outlet, but we use
// file content verification for consistency across the app suite.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/layouts/AuthLayout.tsx'),
    'utf-8',
  )
}

describe('AuthLayout', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports AuthLayout as named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+AuthLayout/)
  })

  it('imports Outlet from react-router-dom', () => {
    const content = readSource()
    expect(content).toMatch(/import\s*\{[^}]*Outlet[^}]*\}\s*from\s*['"]react-router-dom['"]/)
  })

  // ─── Layout Structure ────────────────────────────────────

  it('renders a full-height container with min-h-screen', () => {
    const content = readSource()
    expect(content).toContain('min-h-screen')
  })

  it('uses flex centering for content', () => {
    const content = readSource()
    expect(content).toContain('flex items-center justify-center')
  })

  it('supports dark mode with gradient classes', () => {
    const content = readSource()
    expect(content).toContain('dark:from-gray-900')
    expect(content).toContain('dark:to-gray-800')
  })

  it('renders Outlet for child route content', () => {
    const content = readSource()
    expect(content).toContain('<Outlet />')
  })

  // ─── Dependency Safety ───────────────────────────────────

  it('does not import from lucide-react or heavy dependencies', () => {
    const content = readSource()
    expect(content).not.toContain('lucide-react')
    expect(content).not.toContain('@/core/auth')
    expect(content).not.toContain('@/core/store')
    expect(content).not.toContain('@/core/notifications')
  })
})
