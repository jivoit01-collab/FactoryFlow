import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — api/index.ts barrel re-exports
// ═══════════════════════════════════════════════════════════════

describe('GRPO API Index (barrel re-exports)', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/api/index.ts'),
    'utf-8',
  )

  it('re-exports grpoApi from grpo.api', () => {
    expect(content).toContain('grpoApi')
    expect(content).toContain('./grpo.api')
  })

  it('re-exports GRPO_QUERY_KEYS from grpo.queries', () => {
    expect(content).toContain('GRPO_QUERY_KEYS')
    expect(content).toContain('./grpo.queries')
  })

  it('re-exports usePendingGRPOEntries', () => {
    expect(content).toContain('usePendingGRPOEntries')
  })

  it('re-exports useGRPOPreview', () => {
    expect(content).toContain('useGRPOPreview')
  })

  it('re-exports usePostGRPO', () => {
    expect(content).toContain('usePostGRPO')
  })

  it('re-exports useGRPOHistory', () => {
    expect(content).toContain('useGRPOHistory')
  })

  it('re-exports useGRPODetail', () => {
    expect(content).toContain('useGRPODetail')
  })

  it('re-exports useWarehouses', () => {
    expect(content).toContain('useWarehouses')
  })
})
