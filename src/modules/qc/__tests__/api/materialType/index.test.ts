import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// api/materialType/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/api/materialType/index.ts'),
    'utf-8',
  )
}

describe('api/materialType/index.ts — Barrel', () => {
  it('re-exports from materialType.api', () => {
    const content = readSource()
    expect(content).toContain("from './materialType.api'")
  })

  it('re-exports from materialType.queries', () => {
    const content = readSource()
    expect(content).toContain("from './materialType.queries'")
  })

  it('uses export * syntax', () => {
    const content = readSource()
    expect(content).toMatch(/export \* from/)
  })

  it('has no imports', () => {
    const content = readSource()
    expect(content).not.toContain('import ')
  })
})
