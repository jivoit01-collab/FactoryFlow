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
  it('has a /qc route that opens the first page the user may see', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc'");
    expect(content).toContain('<QCSectionRedirect candidates={QC_HOME_CANDIDATES} />');
    expect(content).toContain("layout: 'main'");
  });

  it('has a /qc/master route that opens the first master tab the user may see', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/master'");
    expect(content).toContain('<QCSectionRedirect candidates={MASTER_TABS} />');
  });

  it('redirects the legacy list routes to their pages', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/pending'");
    expect(content).toContain('<Navigate to="/qc/arrival-slips" replace />');
    expect(content).toContain('<Navigate to="/qc/arrival-slips/approvals" replace />');
    expect(content).toContain('<Navigate to="/qc/qa-procedures" replace />');
  });

  it('keeps the arrival-slip pages on their own routes', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/arrival-slips'");
    expect(content).toContain("path: '/qc/arrival-slips/approvals'");
    expect(content).toContain("path: '/qc/arrival-slips/decision-changed'");
    expect(content).toContain("path: '/qc/arrival-slips/inspections/:inspectionId'");
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

  it('puts material types and QC parameters under arrival slips', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/arrival-slips/material-types'");
    expect(content).toContain("path: '/qc/arrival-slips/parameters'");
  });

  it('redirects the old master addresses there, keeping the query', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/master/material-types'");
    expect(content).toContain('<RedirectWithSearch to="/qc/arrival-slips/material-types" />');
    expect(content).toContain("path: '/qc/master/parameters'");
    expect(content).toContain('<RedirectWithSearch to="/qc/arrival-slips/parameters" />');
  });

  it('has /qc/master/print-documents route', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/master/print-documents'");
  });

  it('has the Documents pages on their own routes', () => {
    const content = readSource();
    expect(content).toContain("path: '/qc/documents'");
    expect(content).toContain("path: '/qc/documents/new'");
    expect(content).toContain("path: '/qc/documents/entries/:entryId'");
    expect(content).toContain("path: '/qc/documents/entries/:entryId/edit'");
    expect(content).toContain("path: '/qc/documents/types'");
    expect(content).toContain("path: '/qc/documents/types/:typeId'");
  });

  it('sends the old Production QC addresses to Documents', () => {
    const content = readSource();
    expect(content).toContain('<RedirectPathPrefix from="/qc/production" to="/qc/documents" />');
    expect(content).toContain(
      '<RedirectPathPrefix from="/qc/production/parameter-types" to="/qc/documents/types" />',
    );
  });

  it('gates making and correcting an entry on FILL, the masters on MANAGE_PARAMETERS', () => {
    const route = (path: string) => {
      const content = readSource();
      const start = content.indexOf(`path: '${path}'`);
      return content.slice(start, content.indexOf('}', start));
    };
    expect(route('/qc/documents/new')).toContain('QC_PERMISSIONS.PRODUCTION_QC.FILL');
    expect(route('/qc/documents/entries/:entryId/edit')).toContain(
      'QC_PERMISSIONS.PRODUCTION_QC.FILL',
    );
    expect(route('/qc/documents/types')).toContain(
      'QC_PERMISSIONS.PRODUCTION_QC.MANAGE_PARAMETERS',
    );
    expect(route('/qc/documents/entries/:entryId')).toContain('PRODUCTION_QC_ENTRY_PERMISSIONS');
  });

  it('lazy loads all page components', () => {
    const content = readSource();
    expect(content).toContain('const ProductionQCDashboardPage = lazy(');
    expect(content).toContain('const ProductionQCEntryPage = lazy(');
    expect(content).toContain('const ProductionQCEntryDetailPage = lazy(');
    expect(content).toContain('const ProductionParameterTypesPage = lazy(');
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

  it('has one sidebar item per area, in order', () => {
    const navigation = readSource().split('navigation: [')[1];
    const titles = [...navigation.matchAll(/title: '([^']+)'/g)].map((m) => m[1]);
    expect(titles).toEqual([
      'Quality Control',
      'Arrival Slips',
      'Documents',
      'Line Clearance',
      'QA Procedures',
      'Master Data',
    ]);
  });

  it('shows pending counts on the areas with a queue', () => {
    const content = readSource();
    expect(content).toContain('badge: PendingApprovalsBadge');
    expect(content).toContain('badge: ProductionQCBadge');
    expect(content).toContain('badge: LineClearanceQABadge');
  });

  it('has no dashboard', () => {
    const content = readSource();
    // The whole word: the Documents list page is ProductionQCDashboardPage.
    expect(content).not.toMatch(/\bQCDashboardPage\b/);
    expect(content).not.toContain("title: 'Dashboard'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Removed sub-modules
//
// Online Quality Monitoring, Customer Return QC and the old Documents (record
// sheet) sub-module were removed; their backend is gone, so no route, sidebar
// item or permission gate may point at them. Production QC was removed too and
// rebuilt from scratch — it is the new Documents, at /qc/documents — and nothing
// of the old session-based one or the old record sheets may come back with it.
// ═══════════════════════════════════════════════════════════════

describe('module.config — Removed sub-modules', () => {
  it.each(['/qc/online-monitoring', '/qc/customer-returns'])(
    'has no %s route or sidebar item',
    (path) => {
      expect(readSource()).not.toContain(`'${path}`);
    },
  );

  it.each([
    "'/qc/production/runs/",
    "'/qc/production/sessions/",
    "'/qc/production/approvals'",
    'ProductionQCRunPage',
    'ProductionQCSessionPage',
    'ProductionQCApprovalPage',
    "'./pages/production/",
    "'./pages/documents/",
    'QCDocumentsPage',
    'QCRecordDetailPage',
    'RecordSheetFormatPage',
  ])('keeps nothing of the old session-based Production QC: %s', (fragment) => {
    expect(readSource()).not.toContain(fragment);
  });

  it('no longer gates on the removed permission groups', () => {
    const content = readSource();
    expect(content).not.toContain('PRODUCTION_QC.CREATE');
    expect(content).not.toContain('PRODUCTION_QC.SUBMIT');
    expect(content).not.toContain('ONLINE_MONITORING');
    expect(content).not.toContain('QC_RECORD');
  });
});
