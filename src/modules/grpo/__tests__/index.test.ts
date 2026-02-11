import { describe, it, expect } from 'vitest'

describe('GRPO Module Index Exports', () => {
  it('index.ts contains expected re-export statements', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/grpo/index.ts'),
      'utf-8',
    )

    // Module config
    expect(content).toContain('./module.config')
    // Types
    expect(content).toContain('./types')
    // Constants
    expect(content).toContain('./constants')
    // Schemas
    expect(content).toContain('./schemas')
    // API
    expect(content).toContain('./api')
    // Components
    expect(content).toContain('./components')
  })
})
