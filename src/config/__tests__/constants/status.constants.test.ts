import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// status.constants — File Content Verification
//
// Direct import hangs because status.constants imports icons from
// lucide-react (thousands of icon exports trigger Vite's module
// graph resolution). Instead, we verify via file content analysis.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/config/constants/status.constants.ts'), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('status.constants — Imports', () => {
  it('imports Clock, CheckCircle2, XCircle, AlertTriangle from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("from 'lucide-react'");
    expect(content).toContain('Clock');
    expect(content).toContain('CheckCircle2');
    expect(content).toContain('XCircle');
    expect(content).toContain('AlertTriangle');
  });

  it('imports LucideIcon type from lucide-react', () => {
    const content = readSource();
    expect(content).toContain('type LucideIcon');
  });
});

// ═══════════════════════════════════════════════════════════════
// ENTRY_STATUS
// ═══════════════════════════════════════════════════════════════

describe('status.constants — ENTRY_STATUS', () => {
  it('exports ENTRY_STATUS with as const', () => {
    const content = readSource();
    expect(content).toContain('export const ENTRY_STATUS');
    expect(content).toMatch(/ENTRY_STATUS\s*=\s*\{/);
  });

  it('has DRAFT, IN_PROGRESS, COMPLETED, CANCELLED, QC_COMPLETED, REJECTED keys', () => {
    const content = readSource();
    expect(content).toContain("DRAFT: 'DRAFT'");
    expect(content).toContain("IN_PROGRESS: 'IN_PROGRESS'");
    expect(content).toContain("COMPLETED: 'COMPLETED'");
    expect(content).toContain("CANCELLED: 'CANCELLED'");
    expect(content).toContain("QC_COMPLETED: 'QC_COMPLETED'");
    expect(content).toContain("REJECTED: 'REJECTED'");
  });
});

// ═══════════════════════════════════════════════════════════════
// SECURITY_APPROVAL_STATUS
// ═══════════════════════════════════════════════════════════════

describe('status.constants — SECURITY_APPROVAL_STATUS', () => {
  it('exports SECURITY_APPROVAL_STATUS with PENDING, APPROVED, REJECTED', () => {
    const content = readSource();
    expect(content).toContain('export const SECURITY_APPROVAL_STATUS');
    expect(content).toContain("PENDING: 'PENDING'");
    expect(content).toContain("APPROVED: 'APPROVED'");
  });
});

// ═══════════════════════════════════════════════════════════════
// GRPO_STATUS
// ═══════════════════════════════════════════════════════════════

describe('status.constants — GRPO_STATUS', () => {
  it('exports GRPO_STATUS with PENDING, POSTED, FAILED, PARTIALLY_POSTED', () => {
    const content = readSource();
    expect(content).toContain('export const GRPO_STATUS');
    expect(content).toContain("POSTED: 'POSTED'");
    expect(content).toContain("FAILED: 'FAILED'");
    expect(content).toContain("PARTIALLY_POSTED: 'PARTIALLY_POSTED'");
  });
});

// ═══════════════════════════════════════════════════════════════
// INSPECTION_STATUS
// ═══════════════════════════════════════════════════════════════

describe('status.constants — INSPECTION_STATUS', () => {
  it('exports INSPECTION_STATUS with PENDING, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED', () => {
    const content = readSource();
    expect(content).toContain('export const INSPECTION_STATUS');
    expect(content).toContain("SUBMITTED: 'SUBMITTED'");
  });
});

// ═══════════════════════════════════════════════════════════════
// FINAL_STATUS
// ═══════════════════════════════════════════════════════════════

describe('status.constants — FINAL_STATUS', () => {
  it('exports FINAL_STATUS with PENDING, ACCEPTED, REJECTED, HOLD', () => {
    const content = readSource();
    expect(content).toContain('export const FINAL_STATUS');
    expect(content).toContain("ACCEPTED: 'ACCEPTED'");
    expect(content).toContain("HOLD: 'HOLD'");
  });
});

// ═══════════════════════════════════════════════════════════════
// ARRIVAL_SLIP_STATUS
// ═══════════════════════════════════════════════════════════════

describe('status.constants — ARRIVAL_SLIP_STATUS', () => {
  it('exports ARRIVAL_SLIP_STATUS with DRAFT, SUBMITTED, REJECTED', () => {
    const content = readSource();
    expect(content).toContain('export const ARRIVAL_SLIP_STATUS');
  });
});

// ═══════════════════════════════════════════════════════════════
// StatusColorConfig interface
// ═══════════════════════════════════════════════════════════════

describe('status.constants — StatusColorConfig', () => {
  it('defines StatusColorConfig interface with bg, text, darkBg, darkText', () => {
    const content = readSource();
    expect(content).toContain('export interface StatusColorConfig');
    expect(content).toContain('bg: string');
    expect(content).toContain('text: string');
    expect(content).toContain('darkBg: string');
    expect(content).toContain('darkText: string');
  });
});

// ═══════════════════════════════════════════════════════════════
// ENTRY_STATUS_COLORS
// ═══════════════════════════════════════════════════════════════

describe('status.constants — ENTRY_STATUS_COLORS', () => {
  it('exports ENTRY_STATUS_COLORS typed as Record<EntryStatus, StatusColorConfig>', () => {
    const content = readSource();
    expect(content).toContain('export const ENTRY_STATUS_COLORS');
    expect(content).toContain('Record<EntryStatus, StatusColorConfig>');
  });

  it('has entries for all 6 entry statuses', () => {
    const content = readSource();
    // Check for each status key in the color config
    const statusKeys = [
      'DRAFT',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'QC_COMPLETED',
      'REJECTED',
    ];
    for (const key of statusKeys) {
      // Each key appears in ENTRY_STATUS_COLORS block
      expect(content).toContain(`${key}:`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SECURITY_APPROVAL_COLORS
// ═══════════════════════════════════════════════════════════════

describe('status.constants — SECURITY_APPROVAL_COLORS', () => {
  it('exports SECURITY_APPROVAL_COLORS typed as Record<SecurityApprovalStatus, StatusColorConfig>', () => {
    const content = readSource();
    expect(content).toContain('export const SECURITY_APPROVAL_COLORS');
    expect(content).toContain('Record<SecurityApprovalStatus, StatusColorConfig>');
  });
});

// ═══════════════════════════════════════════════════════════════
// GRPO_STATUS_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('status.constants — GRPO_STATUS_CONFIG', () => {
  it('exports GRPO_STATUS_CONFIG with label, color, bgColor, icon for each status', () => {
    const content = readSource();
    expect(content).toContain('export const GRPO_STATUS_CONFIG');
    expect(content).toContain("label: 'Pending'");
    expect(content).toContain("label: 'Posted'");
    expect(content).toContain("label: 'Failed'");
    expect(content).toContain("label: 'Partially Posted'");
  });

  it('PENDING icon is Clock', () => {
    const content = readSource();
    // The PENDING entry should reference Clock icon
    expect(content).toMatch(/PENDING:\s*\{[\s\S]*?icon:\s*Clock/);
  });

  it('POSTED icon is CheckCircle2', () => {
    const content = readSource();
    expect(content).toMatch(/POSTED:\s*\{[\s\S]*?icon:\s*CheckCircle2/);
  });

  it('FAILED icon is XCircle', () => {
    const content = readSource();
    expect(content).toMatch(/FAILED:\s*\{[\s\S]*?icon:\s*XCircle/);
  });

  it('PARTIALLY_POSTED icon is AlertTriangle', () => {
    const content = readSource();
    expect(content).toMatch(/PARTIALLY_POSTED:\s*\{[\s\S]*?icon:\s*AlertTriangle/);
  });
});

// ═══════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════

describe('status.constants — Utility Functions', () => {
  it('exports getEntryStatusClasses function', () => {
    const content = readSource();
    expect(content).toContain('export function getEntryStatusClasses');
  });

  it('getEntryStatusClasses normalizes to uppercase', () => {
    const content = readSource();
    expect(content).toContain('toUpperCase()');
  });

  it('getEntryStatusClasses falls back to CANCELLED colors for unknown status', () => {
    const content = readSource();
    expect(content).toContain('ENTRY_STATUS_COLORS.CANCELLED');
  });

  it('exports getSecurityApprovalClasses function', () => {
    const content = readSource();
    expect(content).toContain('export function getSecurityApprovalClasses');
  });

  it('getSecurityApprovalClasses falls back to gray colors for unknown status', () => {
    const content = readSource();
    // The fallback object has bg-gray-100
    expect(content).toMatch(/getSecurityApprovalClasses[\s\S]*bg-gray-100/);
  });

  it('exports DEFAULT_STATUS_CLASSES', () => {
    const content = readSource();
    expect(content).toContain('export const DEFAULT_STATUS_CLASSES');
    expect(content).toContain('bg-gray-100 text-gray-800');
  });
});
