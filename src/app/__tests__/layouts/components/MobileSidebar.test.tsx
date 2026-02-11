import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// MobileSidebar — File Content Verification
//
// Imports lucide-react and @/core/auth (usePermission), so
// direct import would hang Vite's module graph.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/layouts/components/MobileSidebar.tsx'),
    'utf-8',
  )
}

describe('MobileSidebar', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports MobileSidebar via export statement at bottom', () => {
    const content = readSource()
    expect(content).toContain('export { MobileSidebar }')
  })

  it('imports ChevronDown, ChevronUp, LayoutDashboard from lucide-react', () => {
    const content = readSource()
    const iconImport = content.match(
      /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/,
    )
    expect(iconImport).not.toBeNull()
    const icons = iconImport![1]
    expect(icons).toContain('ChevronDown')
    expect(icons).toContain('ChevronUp')
    expect(icons).toContain('LayoutDashboard')
  })

  it('imports Sheet components from @/shared/components/ui', () => {
    const content = readSource()
    expect(content).toContain('Sheet')
    expect(content).toContain('SheetContent')
    expect(content).toContain('SheetHeader')
    expect(content).toContain('SheetTitle')
  })

  it('imports usePermission from @/core/auth', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*usePermission[^}]*\}\s*from\s*['"]@\/core\/auth['"]/,
    )
  })

  it('imports getAllNavigation from @/app/modules', () => {
    const content = readSource()
    expect(content).toContain('getAllNavigation')
    expect(content).toMatch(/from\s*['"]@\/app\/modules['"]/)
  })

  // ─── Props & Interface ───────────────────────────────────

  it('defines MobileSidebarProps with isOpen boolean', () => {
    const content = readSource()
    expect(content).toMatch(/interface\s+MobileSidebarProps/)
    expect(content).toContain('isOpen: boolean')
  })

  it('defines MobileSidebarProps with onClose callback', () => {
    const content = readSource()
    expect(content).toContain('onClose: () => void')
  })

  // ─── Permission Filtering ───────────────────────────────

  it('calls usePermission() for permission checks', () => {
    const content = readSource()
    expect(content).toContain('usePermission()')
    expect(content).toContain('hasModulePermission')
    expect(content).toContain('hasAnyPermission')
    expect(content).toContain('permissionsLoaded')
  })

  it('filters nav items by showInSidebar and permissionsLoaded', () => {
    const content = readSource()
    expect(content).toContain('!item.showInSidebar')
    expect(content).toContain('!permissionsLoaded')
  })

  it('checks hasModulePermission for module-level filtering', () => {
    const content = readSource()
    expect(content).toContain('hasModulePermission(item.modulePrefix)')
  })

  it('falls back to hasAnyPermission for explicit permissions', () => {
    const content = readSource()
    expect(content).toContain('hasAnyPermission([...item.permissions])')
  })

  // ─── Sheet Layout ───────────────────────────────────────

  it('renders Sheet with open={isOpen} and onOpenChange={onClose}', () => {
    const content = readSource()
    expect(content).toContain('<Sheet open={isOpen} onOpenChange={onClose}>')
  })

  it('renders SheetContent with side="left" and w-64 class', () => {
    const content = readSource()
    expect(content).toContain('side="left"')
    expect(content).toContain('w-64')
  })

  it('renders logo in SheetHeader', () => {
    const content = readSource()
    expect(content).toContain('src="/JivoWellnessLogo.png"')
    expect(content).toContain('<SheetHeader')
  })

  it('NavLink items call onClose on click to close sidebar', () => {
    const content = readSource()
    expect(content).toContain('onClick={onClose}')
  })

  it('renders Collapsible for submenu items', () => {
    const content = readSource()
    expect(content).toContain('<Collapsible')
    expect(content).toContain('<CollapsibleContent')
    expect(content).toContain('toggleSubmenu')
  })
})
