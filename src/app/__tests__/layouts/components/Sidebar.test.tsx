import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Sidebar — File Content Verification
//
// Imports lucide-react and @/core/auth (usePermission), so
// direct import would hang Vite's module graph.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/app/layouts/components/Sidebar.tsx'), 'utf-8');
}

describe('Sidebar', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports Sidebar as named function', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+function\s+Sidebar/);
  });

  it('imports useState, useEffect, useMemo from react', () => {
    const content = readSource();
    expect(content).toMatch(
      /import\s*\{[^}]*useState[^}]*useEffect[^}]*useMemo[^}]*\}\s*from\s*['"]react['"]/,
    );
  });

  it('imports NavLink and useLocation from react-router-dom', () => {
    const content = readSource();
    expect(content).toMatch(
      /import\s*\{[^}]*NavLink[^}]*useLocation[^}]*\}\s*from\s*['"]react-router-dom['"]/,
    );
  });

  it('imports icons from lucide-react', () => {
    const content = readSource();
    expect(content).toContain('ChevronLeft');
    expect(content).toContain('ChevronRight');
    expect(content).toContain('ChevronDown');
    expect(content).toContain('ChevronUp');
    expect(content).toContain('LayoutDashboard');
    expect(content).toMatch(/from\s*['"]lucide-react['"]/);
  });

  it('imports usePermission from @/core/auth', () => {
    const content = readSource();
    expect(content).toMatch(/import\s*\{[^}]*usePermission[^}]*\}\s*from\s*['"]@\/core\/auth['"]/);
  });

  // ─── Props & Interface ───────────────────────────────────

  it('defines SidebarProps interface with isCollapsed', () => {
    const content = readSource();
    expect(content).toMatch(/interface\s+SidebarProps/);
    expect(content).toContain('isCollapsed: boolean');
  });

  it('defines SidebarProps interface with onToggle callback', () => {
    const content = readSource();
    expect(content).toContain('onToggle: () => void');
  });

  // ─── Permission Filtering ───────────────────────────────

  it('destructures hasModulePermission, hasAnyPermission, permissionsLoaded from usePermission', () => {
    const content = readSource();
    expect(content).toContain('hasModulePermission');
    expect(content).toContain('hasAnyPermission');
    expect(content).toContain('permissionsLoaded');
    expect(content).toContain('usePermission()');
  });

  it('calls getAllNavigation() from @/app/modules', () => {
    const content = readSource();
    expect(content).toContain('getAllNavigation()');
    expect(content).toMatch(/from\s*['"]@\/app\/modules['"]/);
  });

  it('filters nav items by showInSidebar flag', () => {
    const content = readSource();
    expect(content).toContain('item.showInSidebar');
    expect(content).toMatch(/if\s*\(\s*!item\.showInSidebar\s*\)\s*return\s+false/);
  });

  it('checks hasModulePermission when item has modulePrefix', () => {
    const content = readSource();
    expect(content).toContain('hasModulePermission(item.modulePrefix)');
  });

  it('falls back to hasAnyPermission for explicit permissions', () => {
    const content = readSource();
    expect(content).toContain('hasAnyPermission([...item.permissions])');
  });

  it('filters children by permission', () => {
    const content = readSource();
    expect(content).toContain('hasAnyPermission([...child.permissions])');
  });

  // ─── Sidebar Structure ──────────────────────────────────

  it('renders <aside> with fixed positioning', () => {
    const content = readSource();
    expect(content).toContain('<aside');
    expect(content).toContain('fixed left-0 top-0 z-40 h-screen');
  });

  it('references SIDEBAR_CONFIG width values', () => {
    const content = readSource();
    expect(content).toContain('SIDEBAR_CONFIG.collapsedWidth');
    expect(content).toContain('SIDEBAR_CONFIG.expandedWidth');
    expect(content).toMatch(/from\s*['"]@\/config\/constants['"]/);
  });

  it('renders Jivo Wellness logo', () => {
    const content = readSource();
    expect(content).toContain('src="/JivoWellnessLogo.png"');
    expect(content).toContain('alt="Jivo Wellness Logo"');
  });

  it('contains <nav> element for navigation items', () => {
    const content = readSource();
    expect(content).toContain('<nav');
    expect(content).toContain('navItems.map');
  });

  it('renders toggle Button with onClick={onToggle}', () => {
    const content = readSource();
    expect(content).toContain('onClick={onToggle}');
  });

  // ─── Submenu Behavior ───────────────────────────────────

  it('manages submenu state with Set<string>', () => {
    const content = readSource();
    expect(content).toContain('useState<Set<string>>(new Set())');
    expect(content).toContain('toggleSubmenu');
  });

  it('defines isRouteActive checking location.pathname', () => {
    const content = readSource();
    expect(content).toContain('isRouteActive');
    expect(content).toContain('location.pathname === item.path');
  });

  it('auto-opens submenu when current route is a child', () => {
    const content = readSource();
    expect(content).toContain('item.hasSubmenu');
    expect(content).toContain('isRouteActive(item)');
    expect(content).toContain('setOpenSubmenus');
  });

  it('renders Tooltip for collapsed sidebar items', () => {
    const content = readSource();
    expect(content).toContain('<Tooltip');
    expect(content).toContain('<TooltipTrigger');
    expect(content).toContain('<TooltipContent');
  });

  it('renders Collapsible for expanded sidebar submenus', () => {
    const content = readSource();
    expect(content).toContain('<Collapsible');
    expect(content).toContain('<CollapsibleContent');
  });
});
