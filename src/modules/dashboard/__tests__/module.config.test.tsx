import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Module Config — Structure Verification
//
// Direct import of module.config.tsx hangs because it triggers
// Vite's module graph resolution on lucide-react (thousands of
// icon exports) and the lazy-loaded DashboardPage chain.
// Instead, we verify the config structure via file content
// analysis — the same proven pattern from shared/__tests__.
// ═══════════════════════════════════════════════════════════════

function readModuleConfig(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/dashboard/module.config.tsx'),
    'utf-8',
  )
}

describe('dashboardModuleConfig', () => {
  // ─── Top-level Shape ──────────────────────────────────────────

  it('exports dashboardModuleConfig with ModuleConfig type', () => {
    const content = readModuleConfig()
    expect(content).toContain('export const dashboardModuleConfig')
    expect(content).toContain('ModuleConfig')
  })

  it('has name set to "dashboard"', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/name:\s*['"]dashboard['"]/)
  })

  // ─── Routes ───────────────────────────────────────────────────

  it('defines a routes array', () => {
    const content = readModuleConfig()
    expect(content).toContain('routes:')
  })

  it('first route has path "/"', () => {
    const content = readModuleConfig()
    // Match path: '/' inside routes array
    expect(content).toMatch(/routes:\s*\[[\s\S]*?path:\s*['"]\/['"]/)
  })

  it('first route uses "main" layout', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/layout:\s*['"]main['"]/)
  })

  it('route element uses lazy-loaded DashboardPage', () => {
    const content = readModuleConfig()
    expect(content).toContain("lazy(() => import('./pages/DashboardPage'))")
    expect(content).toContain('element: <DashboardPage />')
  })

  // ─── Navigation ───────────────────────────────────────────────

  it('defines a navigation array', () => {
    const content = readModuleConfig()
    expect(content).toContain('navigation:')
  })

  it('navigation item has path "/" and title "Dashboard"', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/navigation:\s*\[[\s\S]*?path:\s*['"]\/['"]/)
    expect(content).toMatch(/title:\s*['"]Dashboard['"]/)
  })

  it('navigation item references LayoutDashboard icon', () => {
    const content = readModuleConfig()
    expect(content).toContain("import { LayoutDashboard } from 'lucide-react'")
    expect(content).toContain('icon: LayoutDashboard')
  })

  it('navigation item has correct permissions', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/permissions:\s*\[['"]gatein\.view_dashboard['"]\]/)
  })

  it('navigation item has modulePrefix "gatein"', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/modulePrefix:\s*['"]gatein['"]/)
  })

  it('navigation item has showInSidebar set to true', () => {
    const content = readModuleConfig()
    expect(content).toMatch(/showInSidebar:\s*true/)
  })
})
