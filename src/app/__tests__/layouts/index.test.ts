import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Layouts Barrel — File Content Verification
//
// Re-exports from layout components that transitively import
// lucide-react and other heavy dependencies.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/layouts/index.ts'),
    'utf-8',
  )
}

describe('Layouts Index', () => {
  // ─── Re-exports ──────────────────────────────────────────

  it('re-exports MainLayout from ./MainLayout', () => {
    const content = readSource()
    expect(content).toContain("export { MainLayout } from './MainLayout'")
  })

  it('re-exports AuthLayout from ./AuthLayout', () => {
    const content = readSource()
    expect(content).toContain("export { AuthLayout } from './AuthLayout'")
  })

  // ─── Structure ───────────────────────────────────────────

  it('has exactly 2 export statements', () => {
    const content = readSource()
    const exportLines = content
      .split('\n')
      .filter((line: string) => line.trim().startsWith('export'))
    expect(exportLines).toHaveLength(2)
  })

  it('does not re-export from ./components directly', () => {
    const content = readSource()
    expect(content).not.toContain("from './components'")
  })
})
