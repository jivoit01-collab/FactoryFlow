import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// DashboardStats — File Content & Logic Verification
// (Direct import hangs due to deep transitive dependency chains
// through @/core/auth and @/app/modules barrels. Same approach
// as shared/__tests__/exports.test.ts and module.config.test.tsx.)
// ═══════════════════════════════════════════════════════════════

function readDashboardStats(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/modules/dashboard/components/DashboardStats.tsx'),
    'utf-8',
  );
}

describe('DashboardStats', () => {
  // ─── Export & Structure ──────────────────────────────────────

  it('exports DashboardStats as a named export', () => {
    const content = readDashboardStats();
    expect(content).toMatch(/export\s+function\s+DashboardStats/);
  });

  it('is a React function component (returns JSX or null)', () => {
    const content = readDashboardStats();
    expect(content).toContain('return null');
    expect(content).toContain('return (');
  });

  // ─── Dependencies ───────────────────────────────────────────

  it('imports useNavigate from react-router-dom', () => {
    const content = readDashboardStats();
    expect(content).toContain('useNavigate');
    expect(content).toContain("'react-router-dom'");
  });

  it('imports usePermission from @/core/auth', () => {
    const content = readDashboardStats();
    expect(content).toContain('usePermission');
    expect(content).toContain("'@/core/auth'");
  });

  it('imports getAllNavigation from @/app/modules', () => {
    const content = readDashboardStats();
    expect(content).toContain('getAllNavigation');
    expect(content).toContain("'@/app/modules'");
  });

  it('imports Card components from @/shared/components/ui', () => {
    const content = readDashboardStats();
    expect(content).toContain('Card');
    expect(content).toContain('CardHeader');
    expect(content).toContain('CardTitle');
    expect(content).toContain('CardDescription');
    expect(content).toContain("'@/shared/components/ui'");
  });

  it('imports LayoutDashboard icon from lucide-react as fallback', () => {
    const content = readDashboardStats();
    expect(content).toContain('LayoutDashboard');
    expect(content).toContain("'lucide-react'");
  });

  // ─── Permission Logic ──────────────────────────────────────

  it('uses useMemo to filter visible modules', () => {
    const content = readDashboardStats();
    expect(content).toContain('useMemo');
    expect(content).toContain('visibleModules');
  });

  it('early-returns empty array when permissionsLoaded is false', () => {
    const content = readDashboardStats();
    expect(content).toMatch(/if\s*\(\s*!permissionsLoaded\s*\)\s*return\s*\[\]/);
  });

  it('returns null when permissionsLoaded is false or no visible modules', () => {
    const content = readDashboardStats();
    expect(content).toMatch(
      /if\s*\(\s*!permissionsLoaded\s*\|\|\s*visibleModules\.length\s*===\s*0\s*\)\s*return\s+null/,
    );
  });

  it('filters out modules where showInSidebar is false', () => {
    const content = readDashboardStats();
    expect(content).toContain('showInSidebar');
    expect(content).toMatch(/if\s*\(\s*!item\.showInSidebar\s*\)\s*return\s+false/);
  });

  it('checks hasModulePermission when module has modulePrefix', () => {
    const content = readDashboardStats();
    expect(content).toContain('hasModulePermission');
    expect(content).toContain('modulePrefix');
    expect(content).toMatch(/hasModulePermission\(item\.modulePrefix\)/);
  });

  it('checks hasAnyPermission when module has permissions but no modulePrefix', () => {
    const content = readDashboardStats();
    expect(content).toContain('hasAnyPermission');
    expect(content).toMatch(/item\.permissions\s*&&\s*item\.permissions\.length\s*>\s*0/);
  });

  it('defaults to showing modules with no modulePrefix and no permissions', () => {
    const content = readDashboardStats();
    // After both permission checks, the filter function returns true as default
    const filterBlock = content.match(/\.filter\(\(item\)[\s\S]*?\n\s*\}\)/);
    expect(filterBlock).not.toBeNull();
    expect(filterBlock![0]).toContain('return true');
  });

  // ─── Hardcoded Descriptions ─────────────────────────────────

  it('has hardcoded description for /gate path', () => {
    const content = readDashboardStats();
    expect(content).toContain("'/gate'");
    expect(content).toContain(
      'Manage gate entries for raw materials, daily needs, maintenance, construction, and visitors',
    );
  });

  it('has hardcoded description for /qc path', () => {
    const content = readDashboardStats();
    expect(content).toContain("'/qc'");
    expect(content).toContain('Inspections, approvals, and master data management');
  });

  it('has hardcoded description for /grpo path', () => {
    const content = readDashboardStats();
    expect(content).toContain("'/grpo'");
    expect(content).toContain('Goods receipt and purchase order posting');
  });

  it('falls back to module title when path has no hardcoded description', () => {
    const content = readDashboardStats();
    expect(content).toMatch(/descriptions\[mod\.path\]\s*\|\|\s*mod\.title/);
  });

  // ─── Card Rendering ────────────────────────────────────────

  it('renders a grid container with responsive columns', () => {
    const content = readDashboardStats();
    expect(content).toContain('grid');
    expect(content).toContain('md:grid-cols-2');
    expect(content).toContain('lg:grid-cols-3');
  });

  it('maps visibleModules to Card components with key=mod.path', () => {
    const content = readDashboardStats();
    expect(content).toMatch(/visibleModules\.map/);
    expect(content).toContain('key={mod.path}');
  });

  it('makes cards clickable with cursor-pointer class', () => {
    const content = readDashboardStats();
    expect(content).toContain('cursor-pointer');
    expect(content).toContain('onClick');
  });

  // ─── Navigation ─────────────────────────────────────────────

  it('navigates to module path when card is clicked', () => {
    const content = readDashboardStats();
    expect(content).toMatch(/onClick=\{?\(\)\s*=>\s*navigate\(mod\.path\)/);
  });

  // ─── Icon Handling ──────────────────────────────────────────

  it('uses module icon or falls back to LayoutDashboard', () => {
    const content = readDashboardStats();
    expect(content).toMatch(/mod\.icon\s*\|\|\s*LayoutDashboard/);
  });

  // ─── useMemo Dependencies ──────────────────────────────────

  it('useMemo depends on permissionsLoaded, hasModulePermission, and hasAnyPermission', () => {
    const content = readDashboardStats();
    expect(content).toMatch(
      /\[\s*permissionsLoaded\s*,\s*hasModulePermission\s*,\s*hasAnyPermission\s*\]/,
    );
  });
});
