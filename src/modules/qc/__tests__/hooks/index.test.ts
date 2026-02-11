import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// hooks/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/hooks/index.ts'),
    'utf-8',
  )
}

describe('hooks/index.ts — Barrel', () => {
  it('re-exports useInspectionPermissions', () => {
    const content = readSource()
    expect(content).toContain('useInspectionPermissions')
  })

  it('re-exports useArrivalSlipPermissions', () => {
    const content = readSource()
    expect(content).toContain('useArrivalSlipPermissions')
  })

  it('re-exports useMasterDataPermissions', () => {
    const content = readSource()
    expect(content).toContain('useMasterDataPermissions')
  })

  it('exports from useInspectionPermissions file', () => {
    const content = readSource()
    expect(content).toContain("from './useInspectionPermissions'")
  })
})
