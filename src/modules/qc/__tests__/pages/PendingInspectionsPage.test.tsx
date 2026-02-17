import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// PendingInspectionsPage — File Content Verification
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/pages/PendingInspectionsPage.tsx'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('PendingInspectionsPage — Exports', () => {
  it('default exports PendingInspectionsPage function', () => {
    const content = readSource();
    expect(content).toContain('export default function PendingInspectionsPage()');
  });

  it('imports from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("from 'lucide-react'");
    expect(content).toContain('ArrowLeft');
    expect(content).toContain('RefreshCw');
    expect(content).toContain('ChevronRight');
  });

  it('imports useSearchParams from react-router-dom', () => {
    const content = readSource();
    expect(content).toContain('useSearchParams');
    expect(content).toContain("from 'react-router-dom'");
  });

  it('imports useInspectionsByTab hook', () => {
    const content = readSource();
    expect(content).toContain('useInspectionsByTab');
  });

  it('imports WORKFLOW_STATUS_CONFIG', () => {
    const content = readSource();
    expect(content).toContain('WORKFLOW_STATUS_CONFIG');
  });
});

// ═══════════════════════════════════════════════════════════════
// Tabs
// ═══════════════════════════════════════════════════════════════

describe('PendingInspectionsPage — Tabs', () => {
  it('defines TAB_CONFIG with all tabs', () => {
    const content = readSource();
    expect(content).toContain('TAB_CONFIG');
    expect(content).toContain("label: 'All'");
    expect(content).toContain("label: 'Actionable'");
    expect(content).toContain("label: 'Pending'");
    expect(content).toContain("label: 'Draft'");
    expect(content).toContain("label: 'Approved'");
    expect(content).toContain("label: 'Rejected'");
  });

  it('gets status filter from URL search params', () => {
    const content = readSource();
    expect(content).toContain("searchParams.get('status')");
  });
});

// ═══════════════════════════════════════════════════════════════
// States
// ═══════════════════════════════════════════════════════════════

describe('PendingInspectionsPage — States', () => {
  it('shows loading spinner', () => {
    const content = readSource();
    expect(content).toContain('isLoading');
    expect(content).toContain('animate-spin');
  });

  it('shows empty state', () => {
    const content = readSource();
    expect(content).toContain('items.length === 0');
  });

  it('handles permission error', () => {
    const content = readSource();
    expect(content).toContain('isPermissionError');
    expect(content).toContain('Permission Denied');
  });

  it('has Refresh button', () => {
    const content = readSource();
    expect(content).toContain('Refresh');
    expect(content).toContain('refetch');
  });

  it('uses arrival_slip_id for navigation', () => {
    const content = readSource();
    expect(content).toContain('arrival_slip_id');
    expect(content).toContain('/qc/inspections/');
  });
});
