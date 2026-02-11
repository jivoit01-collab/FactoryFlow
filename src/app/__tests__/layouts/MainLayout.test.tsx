import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// MainLayout — File Content Verification
//
// Imports ./components (which import lucide-react, @/core/auth),
// @/shared/hooks, @/shared/components/ui, @/config/constants.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/layouts/MainLayout.tsx'),
    'utf-8',
  )
}

describe('MainLayout', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports MainLayout as named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+MainLayout/)
  })

  it('imports useState and useEffect from react', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*useState[^}]*useEffect[^}]*\}\s*from\s*['"]react['"]/,
    )
  })

  it('imports Outlet from react-router-dom', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*Outlet[^}]*\}\s*from\s*['"]react-router-dom['"]/,
    )
  })

  it('imports all 4 sub-components from ./components', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*Sidebar[^}]*MobileSidebar[^}]*Header[^}]*Breadcrumbs[^}]*\}\s*from\s*['"]\.\/components['"]/,
    )
  })

  it('imports TooltipProvider from @/shared/components/ui', () => {
    const content = readSource()
    expect(content).toContain('TooltipProvider')
    expect(content).toMatch(/from\s*['"]@\/shared\/components\/ui['"]/)
  })

  // ─── State Management ───────────────────────────────────

  it('uses useState for isMobile', () => {
    const content = readSource()
    expect(content).toMatch(/useState\s*\(\s*false\s*\)/)
    expect(content).toContain('isMobile')
  })

  it('uses useState for isMobileSidebarOpen', () => {
    const content = readSource()
    expect(content).toContain('isMobileSidebarOpen')
    expect(content).toContain('setIsMobileSidebarOpen')
  })

  it('uses useLocalStorage for isCollapsed with sidebar-collapsed key', () => {
    const content = readSource()
    expect(content).toContain("useLocalStorage('sidebar-collapsed', false)")
    expect(content).toContain('isCollapsed')
    expect(content).toContain('setIsCollapsed')
  })

  it('imports SIDEBAR_CONFIG from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain('SIDEBAR_CONFIG')
    expect(content).toMatch(/from\s*['"]@\/config\/constants['"]/)
  })

  // ─── Responsive Behavior ────────────────────────────────

  it('checks window.innerWidth against SIDEBAR_CONFIG.mobileBreakpoint', () => {
    const content = readSource()
    expect(content).toContain('window.innerWidth < SIDEBAR_CONFIG.mobileBreakpoint')
  })

  it('adds resize event listener in useEffect', () => {
    const content = readSource()
    expect(content).toContain("window.addEventListener('resize', checkMobile)")
  })

  it('cleans up resize event listener on unmount', () => {
    const content = readSource()
    expect(content).toContain("window.removeEventListener('resize', checkMobile)")
  })

  it('computes sidebarWidth based on isMobile and isCollapsed', () => {
    const content = readSource()
    expect(content).toMatch(/sidebarWidth\s*=\s*isMobile/)
    expect(content).toContain('SIDEBAR_CONFIG.collapsedWidth')
    expect(content).toContain('SIDEBAR_CONFIG.expandedWidth')
  })

  // ─── Component Composition ──────────────────────────────

  it('wraps everything in TooltipProvider', () => {
    const content = readSource()
    expect(content).toContain('<TooltipProvider>')
    expect(content).toContain('</TooltipProvider>')
  })

  it('renders Sidebar conditionally when not mobile', () => {
    const content = readSource()
    expect(content).toContain('{!isMobile && (')
    expect(content).toContain('<Sidebar isCollapsed={isCollapsed}')
  })

  it('renders MobileSidebar with isOpen and onClose props', () => {
    const content = readSource()
    expect(content).toContain('<MobileSidebar isOpen={isMobileSidebarOpen}')
    expect(content).toContain('onClose={')
  })

  it('renders Header with onMenuClick and sidebarWidth props', () => {
    const content = readSource()
    expect(content).toContain('<Header onMenuClick={')
    expect(content).toContain('sidebarWidth={sidebarWidth}')
  })

  it('renders <main> with Breadcrumbs and Outlet', () => {
    const content = readSource()
    expect(content).toContain('<main')
    expect(content).toContain('<Breadcrumbs />')
    expect(content).toContain('<Outlet />')
    expect(content).toContain('style={{ marginLeft: sidebarWidth }}')
  })
})
