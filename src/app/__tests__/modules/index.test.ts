import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Module Registry (src/app/modules/index.ts) — File Content Verification
//
// Imports all 6 module configs (each imports lucide-react icons,
// lazy-loaded pages, etc.), so direct import would hang.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/modules/index.ts'),
    'utf-8',
  )
}

describe('Module Registry', () => {
  // ─── Type Imports ───────────────────────────────────────

  it('imports type Reducer from @reduxjs/toolkit', () => {
    const content = readSource()
    expect(content).toMatch(/import\s+type\s*\{[^}]*Reducer[^}]*\}\s*from\s*['"]@reduxjs\/toolkit['"]/)
  })

  it('imports types ModuleConfig, ModuleNavItem, ModuleRoute from @/core/types', () => {
    const content = readSource()
    expect(content).toContain('ModuleConfig')
    expect(content).toContain('ModuleNavItem')
    expect(content).toContain('ModuleRoute')
    expect(content).toMatch(/from\s*['"]@\/core\/types['"]/)
  })

  // ─── Module Config Imports ──────────────────────────────

  it('imports authModuleConfig from @/modules/auth/module.config', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*authModuleConfig[^}]*\}\s*from\s*['"]@\/modules\/auth\/module\.config['"]/,
    )
  })

  it('imports dashboardModuleConfig from @/modules/dashboard/module.config', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*dashboardModuleConfig[^}]*\}\s*from\s*['"]@\/modules\/dashboard\/module\.config['"]/,
    )
  })

  it('imports gateModuleConfig from @/modules/gate/module.config', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*gateModuleConfig[^}]*\}\s*from\s*['"]@\/modules\/gate\/module\.config['"]/,
    )
  })

  it('imports qcModuleConfig from @/modules/qc/module.config', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*qcModuleConfig[^}]*\}\s*from\s*['"]@\/modules\/qc\/module\.config['"]/,
    )
  })

  it('imports grpoModuleConfig from @/modules/grpo/module.config', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*grpoModuleConfig[^}]*\}\s*from\s*['"]@\/modules\/grpo\/module\.config['"]/,
    )
  })

  it('imports notificationsModuleConfig from @/modules/notifications/module.config', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*notificationsModuleConfig[^}]*\}\s*from\s*['"]@\/modules\/notifications\/module\.config['"]/,
    )
  })

  // ─── Module Registry ───────────────────────────────────

  it('exports moduleRegistry as ModuleConfig[]', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+const\s+moduleRegistry:\s*ModuleConfig\[\]/)
  })

  it('registry contains all 6 modules in correct order', () => {
    const content = readSource()
    const registryMatch = content.match(
      /moduleRegistry:\s*ModuleConfig\[\]\s*=\s*\[([\s\S]*?)\]/,
    )
    expect(registryMatch).not.toBeNull()
    const registryContent = registryMatch![1]

    // Verify order
    const authIdx = registryContent.indexOf('authModuleConfig')
    const dashIdx = registryContent.indexOf('dashboardModuleConfig')
    const gateIdx = registryContent.indexOf('gateModuleConfig')
    const qcIdx = registryContent.indexOf('qcModuleConfig')
    const grpoIdx = registryContent.indexOf('grpoModuleConfig')
    const notiIdx = registryContent.indexOf('notificationsModuleConfig')

    expect(authIdx).toBeGreaterThan(-1)
    expect(dashIdx).toBeGreaterThan(authIdx)
    expect(gateIdx).toBeGreaterThan(dashIdx)
    expect(qcIdx).toBeGreaterThan(gateIdx)
    expect(grpoIdx).toBeGreaterThan(qcIdx)
    expect(notiIdx).toBeGreaterThan(grpoIdx)
  })

  // ─── getAllRoutes ───────────────────────────────────────

  it('exports getAllRoutes function returning ModuleRoute[]', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+getAllRoutes\(\):\s*ModuleRoute\[\]/)
  })

  it('getAllRoutes uses flatMap on m.routes', () => {
    const content = readSource()
    expect(content).toContain('moduleRegistry.flatMap((m) => m.routes)')
  })

  // ─── getRoutesByLayout ─────────────────────────────────

  it("exports getRoutesByLayout accepting layout: 'auth' | 'main'", () => {
    const content = readSource()
    expect(content).toMatch(
      /export\s+function\s+getRoutesByLayout\(layout:\s*['"]auth['"]\s*\|\s*['"]main['"]\)/,
    )
  })

  it("filters auth routes by route.layout === 'auth'", () => {
    const content = readSource()
    expect(content).toContain("route.layout === 'auth'")
  })

  it("defaults non-auth routes to main layout via route.layout !== 'auth'", () => {
    const content = readSource()
    expect(content).toContain("route.layout !== 'auth'")
  })

  // ─── getAllNavigation ──────────────────────────────────

  it('exports getAllNavigation function returning ModuleNavItem[]', () => {
    const content = readSource()
    expect(content).toMatch(
      /export\s+function\s+getAllNavigation\(\):\s*ModuleNavItem\[\]/,
    )
  })

  it('getAllNavigation uses nullish coalescing for m.navigation', () => {
    const content = readSource()
    expect(content).toContain('m.navigation ?? []')
  })

  // ─── getAllReducers ────────────────────────────────────

  it('exports getAllReducers function returning Record<string, Reducer>', () => {
    const content = readSource()
    expect(content).toMatch(
      /export\s+function\s+getAllReducers\(\):\s*Record<string,\s*Reducer>/,
    )
  })

  it('getAllReducers uses reduce with spread pattern', () => {
    const content = readSource()
    expect(content).toContain('moduleRegistry.reduce')
    expect(content).toContain('...acc')
    expect(content).toContain('...m.reducer')
  })
})
