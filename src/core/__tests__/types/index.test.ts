import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// types/index.ts — Barrel Re-exports (File Content Verification)
//
// Re-exports module types that reference LucideIcon from
// lucide-react. Verify structure via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/types/index.ts'),
    'utf-8',
  )
}

describe('types/index.ts — Barrel Re-exports', () => {
  it('re-exports ModuleConfig type from ./module.types', () => {
    const content = readSource()
    expect(content).toContain('ModuleConfig')
    expect(content).toContain("from './module.types'")
  })

  it('re-exports ModuleNavItem type from ./module.types', () => {
    const content = readSource()
    expect(content).toContain('ModuleNavItem')
  })

  it('re-exports ModuleRoute type from ./module.types', () => {
    const content = readSource()
    expect(content).toContain('ModuleRoute')
  })
})
