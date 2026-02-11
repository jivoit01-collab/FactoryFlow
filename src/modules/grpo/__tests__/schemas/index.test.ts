import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — schemas/index.ts barrel re-exports
// ═══════════════════════════════════════════════════════════════

describe('GRPO Schemas Index (barrel re-exports)', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/schemas/index.ts'),
    'utf-8',
  )

  it('re-exports grpoPostSchema', () => {
    expect(content).toContain('grpoPostSchema')
  })

  it('re-exports grpoPostItemSchema', () => {
    expect(content).toContain('grpoPostItemSchema')
  })

  it('re-exports GRPOPostFormData type', () => {
    expect(content).toContain('GRPOPostFormData')
  })

  it('re-exports from grpo.schema', () => {
    expect(content).toContain('./grpo.schema')
  })
})
