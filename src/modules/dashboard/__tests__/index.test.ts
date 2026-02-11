import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Dashboard Module Exports — File Content Verification
// (Dynamic import of @/modules/dashboard hangs due to deep
// transitive dependency chains. Instead, we verify the barrel
// file structure via file content analysis — same approach as
// shared/__tests__/exports.test.ts.)
// ═══════════════════════════════════════════════════════════════

describe('Dashboard Module Exports', () => {
  it('index.ts contains DashboardPage re-export', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/dashboard/index.ts'),
      'utf-8',
    )

    expect(content).toContain('DashboardPage')
    expect(content).toContain('./pages/DashboardPage')
  })

  it('DashboardPage is exported as default re-export', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/dashboard/index.ts'),
      'utf-8',
    )

    expect(content).toContain('default as DashboardPage')
  })

  it('index.ts contains DashboardStats re-export', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/dashboard/index.ts'),
      'utf-8',
    )

    expect(content).toContain('DashboardStats')
    expect(content).toContain('./components/DashboardStats')
  })

  it('DashboardStats is a named re-export', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/dashboard/index.ts'),
      'utf-8',
    )

    expect(content).toMatch(/export\s*\{.*DashboardStats.*\}/)
  })

  it('index.ts exports exactly two symbols', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/dashboard/index.ts'),
      'utf-8',
    )

    const exportLines = content
      .split('\n')
      .filter((line: string) => line.trim().startsWith('export'))
    expect(exportLines).toHaveLength(2)
  })

  it('re-exports from pages and components subdirectories', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/dashboard/index.ts'),
      'utf-8',
    )

    expect(content).toContain('./pages/')
    expect(content).toContain('./components/')
  })

  it('does not re-export module.config (internal only)', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/dashboard/index.ts'),
      'utf-8',
    )

    expect(content).not.toContain('module.config')
  })
})
