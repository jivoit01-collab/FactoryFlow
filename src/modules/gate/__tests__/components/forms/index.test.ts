import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — components/forms/index.ts barrel re-exports (FCV)
// ═══════════════════════════════════════════════════════════════
// Dynamic import of form shell components triggers deep dependency
// chains that hang Vite's module graph resolver. File-content
// verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('forms/index barrel exports', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/forms/index.ts'),
    'utf-8',
  )

  it('exports VehicleDriverFormShell', () => {
    expect(content).toContain("export { VehicleDriverFormShell } from './VehicleDriverFormShell'")
  })

  it('exports SecurityCheckFormShell', () => {
    expect(content).toContain("export { SecurityCheckFormShell } from './SecurityCheckFormShell'")
  })
})
