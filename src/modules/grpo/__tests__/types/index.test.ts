import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — types/index.ts barrel re-exports
// ═══════════════════════════════════════════════════════════════

describe('GRPO Types Index (barrel re-exports)', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/types/index.ts'),
    'utf-8',
  )

  it('re-exports Warehouse type', () => {
    expect(content).toContain('Warehouse')
  })

  it('re-exports GRPOStatus type', () => {
    expect(content).toContain('GRPOStatus')
  })

  it('re-exports QCStatus type', () => {
    expect(content).toContain('QCStatus')
  })

  it('re-exports PendingGRPOEntry type', () => {
    expect(content).toContain('PendingGRPOEntry')
  })

  it('re-exports PreviewItem type', () => {
    expect(content).toContain('PreviewItem')
  })

  it('re-exports PreviewPOReceipt type', () => {
    expect(content).toContain('PreviewPOReceipt')
  })

  it('re-exports PostGRPORequest type', () => {
    expect(content).toContain('PostGRPORequest')
  })

  it('re-exports PostGRPOResponse type', () => {
    expect(content).toContain('PostGRPOResponse')
  })

  it('re-exports GRPOHistoryLine type', () => {
    expect(content).toContain('GRPOHistoryLine')
  })

  it('re-exports GRPOHistoryEntry type', () => {
    expect(content).toContain('GRPOHistoryEntry')
  })

  it('re-exports from grpo.types', () => {
    expect(content).toContain('./grpo.types')
  })
})
