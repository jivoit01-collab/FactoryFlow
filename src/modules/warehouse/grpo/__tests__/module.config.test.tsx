import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// GRPO Submodule Config — File Content Verification
//
// GRPO is a submodule of Warehouse: it contributes `grpoRoutes` and
// `grpoNavChildren` to `warehouseModuleConfig` rather than registering
// as a standalone module. Direct import hangs because module.config.tsx
// lazy-loads pages, so we verify the source text.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/modules/warehouse/grpo/module.config.tsx'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('GRPO Submodule Config — Exports', () => {
  it('exports grpoRoutes and grpoNavChildren (not a standalone module)', () => {
    const content = readSource();
    expect(content).toContain('export const grpoRoutes: ModuleRoute[]');
    expect(content).toContain('export const grpoNavChildren: ModuleNavItem[]');
    expect(content).not.toContain('grpoModuleConfig');
  });

  it('imports the retry-aware lazy for code-split pages', () => {
    const content = readSource();
    expect(content).toContain("import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload'");
  });

  it('imports ModuleRoute and ModuleNavItem types from @/core/types', () => {
    const content = readSource();
    expect(content).toContain("from '@/core/types'");
    expect(content).toContain('ModuleRoute');
    expect(content).toContain('ModuleNavItem');
  });

  it('imports GRPO_PERMISSIONS from @/config/permissions', () => {
    const content = readSource();
    expect(content).toContain("from '@/config/permissions'");
    expect(content).toContain('GRPO_PERMISSIONS');
  });
});

// ═══════════════════════════════════════════════════════════════
// Lazy Page Imports
// ═══════════════════════════════════════════════════════════════

describe('GRPO Submodule Config — Lazy Pages', () => {
  it('lazy loads MaterialGRPOPage', () => {
    const content = readSource();
    expect(content).toContain(
      "const MaterialGRPOPage = lazy(() => import('./pages/MaterialGRPOPage'))",
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
// Route Paths (now nested under /warehouse/grpo)
// ═══════════════════════════════════════════════════════════════

describe('GRPO Submodule Config — Routes', () => {
  it('defines several /warehouse/grpo routes', () => {
    const content = readSource();
    const routePaths = content.match(/path: '\/warehouse\/grpo/g);
    expect(routePaths!.length).toBeGreaterThanOrEqual(5);
  });

  it('includes /warehouse/grpo route', () => {
    const content = readSource();
    expect(content).toContain("path: '/warehouse/grpo'");
  });

  it('includes /warehouse/grpo/pending route', () => {
    const content = readSource();
    expect(content).toContain("path: '/warehouse/grpo/pending'");
  });

  it('includes /warehouse/grpo/preview/:vehicleEntryId route', () => {
    const content = readSource();
    expect(content).toContain("path: '/warehouse/grpo/preview/:vehicleEntryId'");
  });

  it('includes /warehouse/grpo/history route', () => {
    const content = readSource();
    expect(content).toContain("path: '/warehouse/grpo/history'");
  });

  it('includes /warehouse/grpo/history/:postingId route', () => {
    const content = readSource();
    expect(content).toContain("path: '/warehouse/grpo/history/:postingId'");
  });

  it('keeps a legacy /grpo/* redirect for old links', () => {
    const content = readSource();
    expect(content).toContain("path: '/grpo/*'");
    expect(content).toContain('LegacyGrpoRedirect');
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
// Navigation (a child item under the Warehouse sidebar group)
// ═══════════════════════════════════════════════════════════════

describe('GRPO Submodule Config — Navigation', () => {
  it('navigation child has title Material GRPO', () => {
    const content = readSource();
    expect(content).toContain("title: 'Material GRPO'");
  });

  it('navigation child points at the Material GRPO page', () => {
    const content = readSource();
    expect(content).toContain("path: '/warehouse/grpo/material'");
  });

  it('is a nested child, not a top-level sidebar entry', () => {
    const content = readSource();
    // Child items carry no icon / showInSidebar — those belong to the parent group.
    expect(content).not.toContain('showInSidebar');
    expect(content).not.toContain('icon:');
  });
});
