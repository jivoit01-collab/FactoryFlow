import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Layout Components Barrel — File Content Verification
//
// Re-exports from components that import lucide-react.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/layouts/components/index.ts'),
    'utf-8',
  )
}

describe('Layout Components Index', () => {
  // ─── Re-exports ──────────────────────────────────────────

  it('re-exports Sidebar from ./Sidebar', () => {
    const content = readSource()
    expect(content).toContain("export { Sidebar } from './Sidebar'")
  })

  it('re-exports MobileSidebar from ./MobileSidebar', () => {
    const content = readSource()
    expect(content).toContain("export { MobileSidebar } from './MobileSidebar'")
  })

  it('re-exports Header from ./Header', () => {
    const content = readSource()
    expect(content).toContain("export { Header } from './Header'")
  })

  it('re-exports Breadcrumbs from ./Breadcrumbs', () => {
    const content = readSource()
    expect(content).toContain("export { Breadcrumbs } from './Breadcrumbs'")
  })

  // ─── Structure ───────────────────────────────────────────

  it('has exactly 4 export statements', () => {
    const content = readSource()
    const exportLines = content
      .split('\n')
      .filter((line: string) => line.trim().startsWith('export'))
    expect(exportLines).toHaveLength(4)
  })

  it('does not contain default exports', () => {
    const content = readSource()
    expect(content).not.toMatch(/export\s+default/)
  })
})
