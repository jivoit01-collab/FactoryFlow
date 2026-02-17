import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// QCDashboardPage — File Content Verification
//
// Direct import hangs because QCDashboardPage imports 10+ icons
// from lucide-react and @/shared/components/ui (radix-ui chain).
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/modules/qc/pages/QCDashboardPage.tsx'), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('QCDashboardPage — Exports', () => {
  it('default exports QCDashboardPage function', () => {
    const content = readSource();
    expect(content).toContain('export default function QCDashboardPage()');
  });

  it('imports icons from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("from 'lucide-react'");
    expect(content).toContain('FlaskConical');
    expect(content).toContain('Plus');
    expect(content).toContain('ChevronRight');
    expect(content).toContain('CheckCircle2');
    expect(content).toContain('XCircle');
    expect(content).toContain('Clock');
  });

  it('imports UI components from @/shared/components/ui', () => {
    const content = readSource();
    expect(content).toContain("from '@/shared/components/ui'");
    expect(content).toContain('Button');
    expect(content).toContain('Card');
    expect(content).toContain('CardContent');
  });

  it('imports useInspectionCounts and useActionableInspections', () => {
    const content = readSource();
    expect(content).toContain('useInspectionCounts');
    expect(content).toContain('useActionableInspections');
    expect(content).toContain("from '../api/inspection/inspection.queries'");
  });

  it('imports WORKFLOW_STATUS_CONFIG from constants', () => {
    const content = readSource();
    expect(content).toContain('WORKFLOW_STATUS_CONFIG');
    expect(content).toContain("from '../constants'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════

describe('QCDashboardPage — Header', () => {
  it('renders "Quality Control" heading', () => {
    const content = readSource();
    expect(content).toContain('>Quality Control</h2>');
  });

  it('renders subtitle about inspections', () => {
    const content = readSource();
    expect(content).toContain('Manage raw material inspections and quality approvals');
  });

  it('has Start Inspection button', () => {
    const content = readSource();
    expect(content).toContain('Start Inspection');
  });
});

// ═══════════════════════════════════════════════════════════════
// Stats & Counts
// ═══════════════════════════════════════════════════════════════

describe('QCDashboardPage — Stats', () => {
  it('uses counts from useInspectionCounts', () => {
    const content = readSource();
    expect(content).toContain('countsData');
    expect(content).toContain('counts.pending');
    expect(content).toContain('counts.draft');
    expect(content).toContain('counts.awaiting_approval');
  });

  it('has Pending Actions summary card', () => {
    const content = readSource();
    expect(content).toContain('Pending Actions');
    expect(content).toContain('{totalPending}');
  });

  it('has Status Overview section with grid layout', () => {
    const content = readSource();
    expect(content).toContain('Status Overview');
    expect(content).toContain('STATUS_ORDER.map');
  });
});

// ═══════════════════════════════════════════════════════════════
// States & Navigation
// ═══════════════════════════════════════════════════════════════

describe('QCDashboardPage — States', () => {
  it('shows loading spinner', () => {
    const content = readSource();
    expect(content).toContain('isLoading');
    expect(content).toContain('animate-spin');
  });

  it('shows empty state for no arrival slips', () => {
    const content = readSource();
    expect(content).toContain('No arrival slips yet');
  });

  it('handles permission error (403)', () => {
    const content = readSource();
    expect(content).toContain('isPermissionError');
    expect(content).toContain('Permission Denied');
  });

  it('has Quick Actions section', () => {
    const content = readSource();
    expect(content).toContain('Quick Actions');
    expect(content).toContain("navigate('/qc/master/material-types')");
    expect(content).toContain("navigate('/qc/master/parameters')");
  });

  it('has Recent Arrival Slips section', () => {
    const content = readSource();
    expect(content).toContain('Recent Arrival Slips');
    expect(content).toContain('recentItems.slice(0, 3)');
  });
});
