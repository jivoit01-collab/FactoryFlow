import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Routes Barrel — File Content Verification
//
// Re-exports from AppRoutes which imports @/core/auth,
// @/core/notifications, and @/app/layouts.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/routes/index.ts'),
    'utf-8',
  )
}

describe('Routes Index', () => {
  // ─── Re-exports ──────────────────────────────────────────

  it('re-exports AppRoutes from ./AppRoutes', () => {
    const content = readSource()
    expect(content).toContain("export { AppRoutes } from './AppRoutes'")
  })

  // ─── Structure ───────────────────────────────────────────

  it('has exactly 1 export statement', () => {
    const content = readSource()
    const exportLines = content
      .split('\n')
      .filter((line: string) => line.trim().startsWith('export'))
    expect(exportLines).toHaveLength(1)
  })

  it('does not contain default exports', () => {
    const content = readSource()
    expect(content).not.toMatch(/export\s+default/)
  })
})
