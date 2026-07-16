import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// module.config — File Content Verification
//
// Direct import hangs because module.config imports FlaskConical
// from lucide-react and uses lazy() which triggers page imports.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
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

  it('imports the retry-aware lazy for code-split pages', () => {
    const content = readSource();
    expect(content).toContain("import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload'");
  });

  it('imports FlaskConical from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("import { FlaskConical } from 'lucide-react'");
  });

  it('imports QC permissions from @/config/permissions', () => {
    const content = readSource();
    expect(content).toContain("from '@/config/permissions'");
    expect(content).toContain('QC_PERMISSIONS');
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

  it('has /qc/master/print-documents route', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/master/print-documents'");
  });

  it('lazy loads all page components', () => {
    const content = readSource();
    expect(content).toContain('const QCDashboardPage = lazy(');
    expect(content).toContain('const PendingInspectionsPage = lazy(');
    expect(content).toContain('const InspectionDetailPage = lazy(');
    expect(content).toContain('const ApprovalQueuePage = lazy(');
    expect(content).toContain('const MaterialTypesPage = lazy(');
    expect(content).toContain('const QCParametersPage = lazy(');
    expect(content).toContain('const PrintDocumentsPage = lazy(');
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

  it('has children with submenu items', () => {
    const content = readSource();
    expect(content).toContain("title: 'Dashboard'");
    expect(content).toContain("title: 'Arrival Slips'");
    expect(content).toContain("title: 'Arrival Slip Approvals'");
    expect(content).toContain("title: 'Production QC'");
    expect(content).toContain("title: 'Line Clearance QA'");
    expect(content).toContain("title: 'Customer Return QC'");
    expect(content).toContain("title: 'Material Types'");
    expect(content).toContain("title: 'QC Parameters'");
    expect(content).toContain("title: 'Print Documents'");
  });
});
