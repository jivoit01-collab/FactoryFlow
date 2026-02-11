import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// api/inspection/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/api/inspection/index.ts'),
    'utf-8',
  )
}

describe('api/inspection/index.ts — Barrel', () => {
  it('re-exports from inspection.api', () => {
    const content = readSource()
    expect(content).toContain("from './inspection.api'")
  })

  it('re-exports from inspection.queries', () => {
    const content = readSource()
    expect(content).toContain("from './inspection.queries'")
  })

  it('uses export * syntax', () => {
    const content = readSource()
    expect(content).toMatch(/export \* from/)
  })
})
