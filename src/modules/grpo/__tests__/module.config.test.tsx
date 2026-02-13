import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// GRPO Module Config — File Content Verification
//
// Direct import hangs because module.config.tsx imports
// PackageCheck from lucide-react and lazy-loads pages.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/modules/grpo/module.config.tsx'), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('GRPO Module Config — Exports', () => {
  it('exports grpoModuleConfig', () => {
    const content = readSource();
    expect(content).toContain('export const grpoModuleConfig: ModuleConfig');
  });

  it('imports PackageCheck from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("from 'lucide-react'");
    expect(content).toContain('PackageCheck');
  });

  it('imports lazy from react', () => {
    const content = readSource();
    expect(content).toContain("import { lazy } from 'react'");
  });

  it('imports ModuleConfig type from @/core/types', () => {
    const content = readSource();
    expect(content).toContain("from '@/core/types'");
    expect(content).toContain('ModuleConfig');
  });

  it('imports GRPO_PERMISSIONS and GRPO_MODULE_PREFIX from @/config/permissions', () => {
    const content = readSource();
    expect(content).toContain("from '@/config/permissions'");
    expect(content).toContain('GRPO_PERMISSIONS');
    expect(content).toContain('GRPO_MODULE_PREFIX');
  });
});

// ═══════════════════════════════════════════════════════════════
// Lazy Page Imports
// ═══════════════════════════════════════════════════════════════

describe('GRPO Module Config — Lazy Pages', () => {
  it('lazy loads GRPODashboardPage', () => {
    const content = readSource();
    expect(content).toContain(
      "const GRPODashboardPage = lazy(() => import('./pages/GRPODashboardPage'))",
    );
  });

  it('lazy loads PendingEntriesPage', () => {
    const content = readSource();
    expect(content).toContain(
      "const PendingEntriesPage = lazy(() => import('./pages/PendingEntriesPage'))",
    );
  });

  it('lazy loads GRPOPreviewPage', () => {
    const content = readSource();
    expect(content).toContain(
      "const GRPOPreviewPage = lazy(() => import('./pages/GRPOPreviewPage'))",
    );
  });

  it('lazy loads GRPOHistoryPage', () => {
    const content = readSource();
    expect(content).toContain(
      "const GRPOHistoryPage = lazy(() => import('./pages/GRPOHistoryPage'))",
    );
  });

  it('lazy loads GRPOHistoryDetailPage', () => {
    const content = readSource();
    expect(content).toContain(
      "const GRPOHistoryDetailPage = lazy(() => import('./pages/GRPOHistoryDetailPage'))",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// Config Shape
// ═══════════════════════════════════════════════════════════════

describe('GRPO Module Config — Config Shape', () => {
  it('has module name "grpo"', () => {
    const content = readSource();
    expect(content).toContain("name: 'grpo'");
  });

  it('defines route and navigation paths', () => {
    const content = readSource();
    const routePaths = content.match(/path: '\/grpo/g);
    expect(routePaths!.length).toBeGreaterThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════════════════════════
// Route Paths
// ═══════════════════════════════════════════════════════════════

describe('GRPO Module Config — Routes', () => {
  it('includes /grpo route', () => {
    const content = readSource();
    expect(content).toContain("path: '/grpo'");
  });

  it('includes /grpo/pending route', () => {
    const content = readSource();
    expect(content).toContain("path: '/grpo/pending'");
  });

  it('includes /grpo/preview/:vehicleEntryId route', () => {
    const content = readSource();
    expect(content).toContain("path: '/grpo/preview/:vehicleEntryId'");
  });

  it('includes /grpo/history route', () => {
    const content = readSource();
    expect(content).toContain("path: '/grpo/history'");
  });

  it('includes /grpo/history/:postingId route', () => {
    const content = readSource();
    expect(content).toContain("path: '/grpo/history/:postingId'");
  });

  it('all routes use main layout', () => {
    const content = readSource();
    const layoutMatches = content.match(/layout: 'main'/g);
    expect(layoutMatches!.length).toBeGreaterThanOrEqual(5);
  });

  it('routes reference GRPO_PERMISSIONS', () => {
    const content = readSource();
    expect(content).toContain('GRPO_PERMISSIONS.VIEW_PENDING');
    expect(content).toContain('GRPO_PERMISSIONS.PREVIEW');
    expect(content).toContain('GRPO_PERMISSIONS.VIEW_HISTORY');
    expect(content).toContain('GRPO_PERMISSIONS.VIEW_POSTING');
  });
});

// ═══════════════════════════════════════════════════════════════
// Navigation
// ═══════════════════════════════════════════════════════════════

describe('GRPO Module Config — Navigation', () => {
  it('navigation item has title GRPO', () => {
    const content = readSource();
    expect(content).toContain("title: 'GRPO'");
  });

  it('navigation item uses PackageCheck icon', () => {
    const content = readSource();
    expect(content).toContain('icon: PackageCheck');
  });

  it('navigation item shows in sidebar', () => {
    const content = readSource();
    expect(content).toContain('showInSidebar: true');
  });

  it('navigation item has submenu enabled', () => {
    const content = readSource();
    expect(content).toContain('hasSubmenu: true');
  });

  it('navigation item uses GRPO_MODULE_PREFIX', () => {
    const content = readSource();
    expect(content).toContain('modulePrefix: GRPO_MODULE_PREFIX');
  });

  it('navigation children include Dashboard', () => {
    const content = readSource();
    expect(content).toContain("title: 'Dashboard'");
  });

  it('navigation children include Pending Entries', () => {
    const content = readSource();
    expect(content).toContain("title: 'Pending Entries'");
  });

  it('navigation children include Posting History', () => {
    const content = readSource();
    expect(content).toContain("title: 'Posting History'");
  });
});
