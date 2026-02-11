import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — hooks/index.ts barrel re-exports
// ═══════════════════════════════════════════════════════════════

describe('Gate Hooks Index (barrel re-exports)', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/hooks/index.ts'),
    'utf-8',
  )

  it('re-exports useEntryId', () => {
    expect(content).toContain('useEntryId')
  })
})
