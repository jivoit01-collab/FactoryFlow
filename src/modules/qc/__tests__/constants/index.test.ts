import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// constants/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
      return readFileSync(resolve(process.cwd(), 'src/modules/qc/constants/index.ts'), 'utf-8');
}

describe('constants/index.ts — Barrel', () => {
  it('re-exports from ./qc.constants', () => {
    const content = readSource();
    expect(content).toContain("export * from './qc.constants'");
  });

  it('uses export * syntax', () => {
    const content = readSource();
    expect(content).toMatch(/^export \*/m);
  });

  it('has no imports', () => {
    const content = readSource();
    expect(content).not.toContain('import ');
  });
});
