import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// constants/index.ts — File Content Verification
//
// Direct import hangs because the barrel re-exports status.constants
// which imports lucide-react. We verify via file content analysis.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/config/constants/index.ts'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

describe('constants/index.ts — Barrel Re-exports', () => {
  it('re-exports from ./app.constants', () => {
    const content = readSource()
    expect(content).toContain("from './app.constants'")
  })

  it('re-exports from ./api.constants', () => {
    const content = readSource()
    expect(content).toContain("from './api.constants'")
  })

  it('re-exports from ./auth.constants', () => {
    const content = readSource()
    expect(content).toContain("from './auth.constants'")
  })

  it('re-exports from ./ui.constants', () => {
    const content = readSource()
    expect(content).toContain("from './ui.constants'")
  })

  it('re-exports from ./validation.constants', () => {
    const content = readSource()
    expect(content).toContain("from './validation.constants'")
  })

  it('re-exports from ./status.constants', () => {
    const content = readSource()
    expect(content).toContain("from './status.constants'")
  })

  it('re-exports from ./vehicle.constants', () => {
    const content = readSource()
    expect(content).toContain("from './vehicle.constants'")
  })

  it('re-exports from ./idProof.constants', () => {
    const content = readSource()
    expect(content).toContain("from './idProof.constants'")
  })

  it('uses export * syntax for all re-exports', () => {
    const content = readSource()
    const lines = content.split('\n').filter((l: string) => l.trim().length > 0)
    for (const line of lines) {
      expect(line.trim()).toMatch(/^export \* from/)
    }
  })

  it('re-exports exactly 8 modules', () => {
    const content = readSource()
    const exportLines = content.split('\n').filter((l: string) => l.trim().startsWith('export *'))
    expect(exportLines).toHaveLength(8)
  })
})
