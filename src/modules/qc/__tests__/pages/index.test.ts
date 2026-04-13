import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// pages/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
      return readFileSync(resolve(process.cwd(), 'src/modules/qc/pages/index.ts'), 'utf-8');
}

describe('pages/index.ts — Barrel', () => {
  it('exports QCDashboardPage', () => {
    const content = readSource();
    expect(content).toContain('QCDashboardPage');
  });

  it('exports PendingInspectionsPage', () => {
    const content = readSource();
    expect(content).toContain('PendingInspectionsPage');
  });

  it('exports InspectionDetailPage', () => {
    const content = readSource();
    expect(content).toContain('InspectionDetailPage');
  });

  it('exports ApprovalQueuePage', () => {
    const content = readSource();
    expect(content).toContain('ApprovalQueuePage');
  });

  it('re-exports from masterdata', () => {
    const content = readSource();
    expect(content).toContain("from './masterdata'");
  });

  it('uses default export re-export pattern', () => {
    const content = readSource();
    expect(content).toContain('export { default as');
  });
});
