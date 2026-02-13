import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// module.config — File Content Verification
//
// Direct import hangs because module.config imports FlaskConical
// from lucide-react and uses lazy() which triggers page imports.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/modules/qc/module.config.tsx'), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('module.config — Exports', () => {
  it('exports qcModuleConfig with ModuleConfig type', () => {
    const content = readSource();
    expect(content).toContain('export const qcModuleConfig: ModuleConfig');
  });

  it('imports lazy from react', () => {
    const content = readSource();
    expect(content).toContain("import { lazy } from 'react'");
  });

  it('imports FlaskConical from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("import { FlaskConical } from 'lucide-react'");
  });

  it('imports QC_PERMISSIONS and QC_MODULE_PREFIX from @/config/permissions', () => {
    const content = readSource();
    expect(content).toContain("from '@/config/permissions'");
    expect(content).toContain('QC_PERMISSIONS');
    expect(content).toContain('QC_MODULE_PREFIX');
  });

  it('imports ModuleConfig type from @/core/types', () => {
    const content = readSource();
    expect(content).toContain("import type { ModuleConfig } from '@/core/types'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Config Properties
// ═══════════════════════════════════════════════════════════════

describe('module.config — Config', () => {
  it('has name qc', () => {
    const content = readSource();
    expect(content).toContain("name: 'qc'");
  });

  it('defines routes array', () => {
    const content = readSource();
    expect(content).toContain('routes: [');
  });

  it('defines navigation array', () => {
    const content = readSource();
    expect(content).toContain('navigation: [');
  });
});

// ═══════════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════════

describe('module.config — Routes', () => {
  it('has /qc dashboard route with main layout', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc'");
    expect(content).toContain("layout: 'main'");
  });

  it('has /qc/pending route', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/pending'");
  });

  it('has /qc/inspections/:slipId/new route for creating inspections', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/inspections/:slipId/new'");
  });

  it('has /qc/inspections/:inspectionId route for viewing/editing', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/inspections/:inspectionId'");
  });

  it('has /qc/approvals route', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/approvals'");
  });

  it('has /qc/master/material-types route', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/master/material-types'");
  });

  it('has /qc/master/parameters route', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/master/parameters'");
  });

  it('lazy loads all page components', () => {
    const content = readSource();
    expect(content).toContain('const QCDashboardPage = lazy(');
    expect(content).toContain('const PendingInspectionsPage = lazy(');
    expect(content).toContain('const InspectionDetailPage = lazy(');
    expect(content).toContain('const ApprovalQueuePage = lazy(');
    expect(content).toContain('const MaterialTypesPage = lazy(');
    expect(content).toContain('const QCParametersPage = lazy(');
  });
});

// ═══════════════════════════════════════════════════════════════
// Navigation
// ═══════════════════════════════════════════════════════════════

describe('module.config — Navigation', () => {
  it('uses FlaskConical icon', () => {
    const content = readSource();
    expect(content).toContain('icon: FlaskConical');
  });

  it('has title Quality Control', () => {
    const content = readSource();
    expect(content).toContain("title: 'Quality Control'");
  });

  it('has showInSidebar and hasSubmenu', () => {
    const content = readSource();
    expect(content).toContain('showInSidebar: true');
    expect(content).toContain('hasSubmenu: true');
  });

  it('has modulePrefix for sidebar filtering', () => {
    const content = readSource();
    expect(content).toContain('modulePrefix: QC_MODULE_PREFIX');
  });

  it('has children with submenu items', () => {
    const content = readSource();
    expect(content).toContain("title: 'Dashboard'");
    expect(content).toContain("title: 'Pending Inspections'");
    expect(content).toContain("title: 'Approvals'");
    expect(content).toContain("title: 'Material Types'");
    expect(content).toContain("title: 'QC Parameters'");
  });
});
