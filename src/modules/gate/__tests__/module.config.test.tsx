import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Gate Module Config — File Content Verification
// ═══════════════════════════════════════════════════════════════
// module.config.tsx imports lucide-react (Truck) and lazy-loads
// 20+ pages, causing Vite's module graph resolver to hang.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('Gate Module Config', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/module.config.tsx'),
    'utf-8',
  );

  // ═══════════════════════════════════════════════════════════════
  // Config Shape
  // ═══════════════════════════════════════════════════════════════

  it('exports gateModuleConfig as a named export', () => {
    expect(content).toMatch(/export\s+const\s+gateModuleConfig/);
  });

  it('has the correct module name "gate"', () => {
    expect(content).toContain("name: 'gate'");
  });

  it('is typed as ModuleConfig', () => {
    expect(content).toContain(': ModuleConfig');
  });

  it('imports ModuleConfig from @/core/types', () => {
    expect(content).toContain("from '@/core/types'");
  });

  it('imports Truck icon from lucide-react', () => {
    expect(content).toContain("import { Truck } from 'lucide-react'");
  });

  it('imports lazy from react', () => {
    expect(content).toContain("import { lazy } from 'react'");
  });

  // ═══════════════════════════════════════════════════════════════
  // Lazy Page Imports
  // ═══════════════════════════════════════════════════════════════

  it('lazy-loads GateDashboardPage', () => {
    expect(content).toContain("lazy(() => import('./pages/GateDashboardPage'))");
  });

  it('lazy-loads RawMaterialsDashboard', () => {
    expect(content).toContain(
      "lazy(() => import('./pages/rawmaterialpages/RawMaterialsDashboard'))",
    );
  });

  it('lazy-loads RawMaterialsPage', () => {
    expect(content).toContain("lazy(() => import('./pages/RawMaterialsPage'))");
  });

  it('lazy-loads DailyNeedsPage', () => {
    expect(content).toContain("lazy(() => import('./pages/DailyNeedsPage'))");
  });

  it('lazy-loads DailyNeedsAllPage', () => {
    expect(content).toContain("lazy(() => import('./pages/dailyneedspages/DailyNeedsAllPage'))");
  });

  it('lazy-loads MaintenanceDashboard', () => {
    expect(content).toContain(
      "lazy(() => import('./pages/maintenancepages/MaintenanceDashboard'))",
    );
  });

  it('lazy-loads ConstructionDashboard', () => {
    expect(content).toContain(
      "lazy(() => import('./pages/constructionpages/ConstructionDashboard'))",
    );
  });

  it('lazy-loads PersonGateInDashboard', () => {
    expect(content).toContain(
      "lazy(() => import('./pages/persongateinpages/PersonGateInDashboard'))",
    );
  });

  // ═══════════════════════════════════════════════════════════════
  // Key Routes
  // ═══════════════════════════════════════════════════════════════

  it('includes /gate dashboard route', () => {
    expect(content).toContain("path: '/gate'");
  });

  it('includes raw materials routes', () => {
    expect(content).toContain("path: '/gate/raw-materials'");
    expect(content).toContain("path: '/gate/raw-materials/all'");
    expect(content).toContain("path: '/gate/raw-materials/new'");
    expect(content).toContain("path: '/gate/raw-materials/new/step2'");
    expect(content).toContain("path: '/gate/raw-materials/new/step3'");
    expect(content).toContain("path: '/gate/raw-materials/new/step4'");
    expect(content).toContain("path: '/gate/raw-materials/new/step5'");
    expect(content).toContain("path: '/gate/raw-materials/new/review'");
  });

  it('includes raw materials edit routes', () => {
    expect(content).toContain("path: '/gate/raw-materials/edit/:entryId/step1'");
    expect(content).toContain("path: '/gate/raw-materials/edit/:entryId/step2'");
    expect(content).toContain("path: '/gate/raw-materials/edit/:entryId/step3'");
    expect(content).toContain("path: '/gate/raw-materials/edit/:entryId/step4'");
    expect(content).toContain("path: '/gate/raw-materials/edit/:entryId/step5'");
    expect(content).toContain("path: '/gate/raw-materials/edit/:entryId/review'");
  });

  it('includes daily needs routes', () => {
    expect(content).toContain("path: '/gate/daily-needs'");
    expect(content).toContain("path: '/gate/daily-needs/all'");
    expect(content).toContain("path: '/gate/daily-needs/new'");
    expect(content).toContain("path: '/gate/daily-needs/new/step2'");
    expect(content).toContain("path: '/gate/daily-needs/new/step3'");
    expect(content).toContain("path: '/gate/daily-needs/new/review'");
  });

  it('includes daily needs edit routes', () => {
    expect(content).toContain("path: '/gate/daily-needs/edit/:entryId/step1'");
    expect(content).toContain("path: '/gate/daily-needs/edit/:entryId/step2'");
    expect(content).toContain("path: '/gate/daily-needs/edit/:entryId/step3'");
    expect(content).toContain("path: '/gate/daily-needs/edit/:entryId/review'");
  });

  it('includes maintenance routes', () => {
    expect(content).toContain("path: '/gate/maintenance'");
    expect(content).toContain("path: '/gate/maintenance/all'");
    expect(content).toContain("path: '/gate/maintenance/new'");
    expect(content).toContain("path: '/gate/maintenance/new/step2'");
    expect(content).toContain("path: '/gate/maintenance/new/step3'");
    expect(content).toContain("path: '/gate/maintenance/new/review'");
  });

  it('includes maintenance edit routes', () => {
    expect(content).toContain("path: '/gate/maintenance/edit/:entryId/step1'");
    expect(content).toContain("path: '/gate/maintenance/edit/:entryId/step2'");
    expect(content).toContain("path: '/gate/maintenance/edit/:entryId/step3'");
    expect(content).toContain("path: '/gate/maintenance/edit/:entryId/review'");
  });

  it('includes construction routes', () => {
    expect(content).toContain("path: '/gate/construction'");
    expect(content).toContain("path: '/gate/construction/all'");
    expect(content).toContain("path: '/gate/construction/new'");
    expect(content).toContain("path: '/gate/construction/new/step2'");
    expect(content).toContain("path: '/gate/construction/new/step3'");
    expect(content).toContain("path: '/gate/construction/new/review'");
  });

  it('includes construction edit routes', () => {
    expect(content).toContain("path: '/gate/construction/edit/:entryId/step1'");
    expect(content).toContain("path: '/gate/construction/edit/:entryId/step2'");
    expect(content).toContain("path: '/gate/construction/edit/:entryId/step3'");
    expect(content).toContain("path: '/gate/construction/edit/:entryId/review'");
  });

  it('includes visitor/labour routes', () => {
    expect(content).toContain("path: '/gate/visitor-labour'");
    expect(content).toContain("path: '/gate/visitor-labour/all'");
    expect(content).toContain("path: '/gate/visitor-labour/inside'");
    expect(content).toContain("path: '/gate/visitor-labour/new'");
    expect(content).toContain("path: '/gate/visitor-labour/entry/:entryId'");
    expect(content).toContain("path: '/gate/visitor-labour/visitors'");
    expect(content).toContain("path: '/gate/visitor-labour/labours'");
    expect(content).toContain("path: '/gate/visitor-labour/contractors'");
  });

  it('all routes use main layout', () => {
    // Count layout: 'main' occurrences - should match routes count
    const layoutMatches = content.match(/layout:\s*'main'/g);
    expect(layoutMatches).not.toBeNull();
    expect(layoutMatches!.length).toBeGreaterThan(40);
  });

  // ═══════════════════════════════════════════════════════════════
  // Navigation
  // ═══════════════════════════════════════════════════════════════

  it('has a Gate navigation item', () => {
    expect(content).toContain("title: 'Gate'");
  });

  it('uses Truck icon in navigation', () => {
    expect(content).toContain('icon: Truck');
  });

  it('Gate nav item has submenu enabled', () => {
    expect(content).toContain('showInSidebar: true');
    expect(content).toContain('hasSubmenu: true');
  });

  it('children include Raw Materials', () => {
    expect(content).toContain("title: 'Raw Materials (RM/PM/Assets)'");
  });

  it('children include Daily Needs', () => {
    expect(content).toContain("title: 'Daily Needs (Food/Consumables)'");
  });

  it('children include Maintenance', () => {
    expect(content).toContain("title: 'Maintenance (Spare parts/Tools)'");
  });

  it('children include Construction', () => {
    expect(content).toContain("title: 'Construction (Civil/Building Work)'");
  });

  it('children include Visitor/Labour', () => {
    expect(content).toContain("title: 'Visitor/Labour'");
  });
});
