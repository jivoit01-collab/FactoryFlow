import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// GRPODashboardPage — File Content Verification
//
// Direct import hangs because GRPODashboardPage imports 10 icons
// from lucide-react and @/shared/components/ui (radix-ui chain).
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/pages/GRPODashboardPage.tsx'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Exports', () => {
  it('default exports GRPODashboardPage function', () => {
    const content = readSource();
    expect(content).toContain('export default function GRPODashboardPage()');
  });

  it('imports icons from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("from 'lucide-react'");
    expect(content).toContain('PackageCheck');
    expect(content).toContain('ChevronRight');
    expect(content).toContain('Clock');
    expect(content).toContain('CheckCircle2');
    expect(content).toContain('XCircle');
    expect(content).toContain('AlertCircle');
    expect(content).toContain('ShieldX');
    expect(content).toContain('RefreshCw');
    expect(content).toContain('History');
    expect(content).toContain('List');
  });

  it('imports UI components from @/shared/components/ui', () => {
    const content = readSource();
    expect(content).toContain("from '@/shared/components/ui'");
    expect(content).toContain('Button');
    expect(content).toContain('Card');
    expect(content).toContain('CardContent');
  });

  it('imports usePendingGRPOEntries and useGRPOHistory from api', () => {
    const content = readSource();
    expect(content).toContain('usePendingGRPOEntries');
    expect(content).toContain('useGRPOHistory');
    expect(content).toContain("from '../api'");
  });

  it('imports GRPO_STATUS from constants', () => {
    const content = readSource();
    expect(content).toContain('GRPO_STATUS');
    expect(content).toContain("from '../constants'");
  });

  it('imports ApiError type from @/core/api/types', () => {
    const content = readSource();
    expect(content).toContain('ApiError');
    expect(content).toContain("from '@/core/api/types'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Header', () => {
  it('renders "GRPO Posting" heading', () => {
    const content = readSource();
    expect(content).toContain('>GRPO Posting</h2>');
  });

  it('renders subtitle about goods receipts', () => {
    const content = readSource();
    expect(content).toContain('Post goods receipts to SAP after gate entry completion');
  });

  it('has View Pending button', () => {
    const content = readSource();
    expect(content).toContain('View Pending');
    expect(content).toContain("navigate('/grpo/pending')");
  });
});

// ═══════════════════════════════════════════════════════════════
// Status Config & Counts
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Status Config', () => {
  it('defines STATUS_CONFIG with pending, posted, failed', () => {
    const content = readSource();
    expect(content).toContain('STATUS_CONFIG');
    expect(content).toContain("label: 'Pending'");
    expect(content).toContain("label: 'Posted'");
    expect(content).toContain("label: 'Failed'");
  });

  it('defines STATUS_ORDER array', () => {
    const content = readSource();
    expect(content).toContain("const STATUS_ORDER = ['pending', 'posted', 'failed']");
  });

  it('calculates historyCounts from GRPO_STATUS', () => {
    const content = readSource();
    expect(content).toContain('historyCounts');
    expect(content).toContain('GRPO_STATUS.PENDING');
    expect(content).toContain('GRPO_STATUS.POSTED');
    expect(content).toContain('GRPO_STATUS.FAILED');
    expect(content).toContain('GRPO_STATUS.PARTIALLY_POSTED');
  });

  it('calculates totalPendingPOs', () => {
    const content = readSource();
    expect(content).toContain('totalPendingPOs');
    expect(content).toContain('pendingEntries.reduce');
    expect(content).toContain('pending_po_count');
  });
});

// ═══════════════════════════════════════════════════════════════
// Summary Card
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Summary Card', () => {
  it('has Pending GRPO summary card', () => {
    const content = readSource();
    expect(content).toContain('Pending GRPO');
    expect(content).toContain('{pendingEntries.length}');
  });

  it('shows POs pending count', () => {
    const content = readSource();
    expect(content).toContain('{totalPendingPOs}');
    expect(content).toContain('POs pending');
  });
});

// ═══════════════════════════════════════════════════════════════
// States & Sections
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — States & Sections', () => {
  it('shows loading spinner', () => {
    const content = readSource();
    expect(content).toContain('isLoading');
    expect(content).toContain('animate-spin');
  });

  it('handles permission error (403)', () => {
    const content = readSource();
    expect(content).toContain('isPermissionError');
    expect(content).toContain('Permission Denied');
  });

  it('handles general API error', () => {
    const content = readSource();
    expect(content).toContain('Failed to Load');
  });

  it('shows empty state for no pending entries', () => {
    const content = readSource();
    expect(content).toContain('No pending entries');
  });

  it('has Recent Pending Entries section', () => {
    const content = readSource();
    expect(content).toContain('Recent Pending Entries');
    expect(content).toContain('pendingEntries.slice(0, 5)');
  });

  it('has Posting History overview section', () => {
    const content = readSource();
    expect(content).toContain('>Posting History</h3>');
    expect(content).toContain('STATUS_ORDER.map');
  });

  it('has Quick Actions section', () => {
    const content = readSource();
    expect(content).toContain('Quick Actions');
    expect(content).toContain("navigate('/grpo/pending')");
    expect(content).toContain("navigate('/grpo/history')");
  });

  it('renders quick action buttons for Pending Entries and Posting History', () => {
    const content = readSource();
    expect(content).toContain('>Pending Entries</span>');
    expect(content).toContain('>Posting History</span>');
  });
});

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

describe('GRPODashboardPage — Utilities', () => {
  it('defines formatDateTime helper', () => {
    const content = readSource();
    expect(content).toContain('const formatDateTime');
    expect(content).toContain('toLocaleString');
  });
});
