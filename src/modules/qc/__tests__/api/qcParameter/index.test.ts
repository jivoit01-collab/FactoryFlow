import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// api/qcParameter/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
      return readFileSync(resolve(process.cwd(), 'src/modules/qc/api/qcParameter/index.ts'), 'utf-8');
}

describe('api/qcParameter/index.ts — Barrel', () => {
  it('re-exports from qcParameter.api', () => {
    const content = readSource();
    expect(content).toContain("from './qcParameter.api'");
  });

  it('re-exports from qcParameter.queries', () => {
    const content = readSource();
    expect(content).toContain("from './qcParameter.queries'");
  });

  it('uses export * syntax', () => {
    const content = readSource();
    expect(content).toMatch(/export \* from/);
  });

  it('has no imports', () => {
    const content = readSource();
    expect(content).not.toContain('import ');
  });
});
