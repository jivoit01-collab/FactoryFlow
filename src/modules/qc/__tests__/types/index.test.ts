import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// types/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  return readFileSync(resolve(process.cwd(), 'src/modules/qc/types/index.ts'), 'utf-8');
}

describe('types/index.ts — Barrel', () => {
  it('re-exports from ./qc.types', () => {
    const content = readSource();
    expect(content).toContain("export * from './qc.types'");
  });

  it('re-exports the Production QC types', () => {
    const content = readSource();
    expect(content).toContain("export * from './productionQC.types'");
  });

  it('uses export * syntax', () => {
    const content = readSource();
    expect(content).toMatch(/^export \*/m);
  });

  it('has no other imports', () => {
    const content = readSource();
    expect(content).not.toContain('import ');
  });

  it('no longer re-exports the removed online-monitoring and record types', () => {
    const content = readSource();
    expect(content).not.toContain('onlineMonitoring.types');
    expect(content).not.toContain('qcRecord.types');
  });
});
