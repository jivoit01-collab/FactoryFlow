import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// types/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/types/index.ts'),
    'utf-8',
  )
}

describe('types/index.ts — Barrel', () => {
  it('re-exports from ./qc.types', () => {
    const content = readSource()
    expect(content).toContain("export * from './qc.types'")
  })

  it('uses export * syntax', () => {
    const content = readSource()
    expect(content).toMatch(/^export \*/m)
  })

  it('has no other imports', () => {
    const content = readSource()
    expect(content).not.toContain('import ')
  })
})
