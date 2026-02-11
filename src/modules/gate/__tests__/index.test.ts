import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — gate/index.ts barrel re-exports
// ═══════════════════════════════════════════════════════════════

describe('Gate Module Index (barrel re-exports)', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/index.ts'),
    'utf-8',
  )

  // ═══════════════════════════════════════════════════════════════
  // Internal module re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports module.config', () => {
    expect(content).toContain("'./module.config'")
  })

  it('re-exports constants', () => {
    expect(content).toContain("'./constants'")
  })

  it('re-exports api', () => {
    expect(content).toContain("'./api'")
  })

  it('re-exports components', () => {
    expect(content).toContain("'./components'")
  })

  it('re-exports hooks', () => {
    expect(content).toContain("'./hooks'")
  })

  it('re-exports utils', () => {
    expect(content).toContain("'./utils'")
  })

  // ═══════════════════════════════════════════════════════════════
  // Page re-exports
  // ═══════════════════════════════════════════════════════════════

  it('re-exports GateDashboardPage', () => {
    expect(content).toContain('GateDashboardPage')
  })

  it('re-exports RawMaterialsPage', () => {
    expect(content).toContain('RawMaterialsPage')
  })

  it('re-exports DailyNeedsPage', () => {
    expect(content).toContain('DailyNeedsPage')
  })

  it('re-exports MaintenanceDashboard', () => {
    expect(content).toContain('MaintenanceDashboard')
  })

  it('re-exports ConstructionPage', () => {
    expect(content).toContain('ConstructionPage')
  })

  it('re-exports ContractorLaborPage', () => {
    expect(content).toContain('ContractorLaborPage')
  })
})
