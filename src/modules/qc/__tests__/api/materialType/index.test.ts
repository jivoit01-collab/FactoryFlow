import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// api/materialType/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
      return readFileSync(resolve(process.cwd(), 'src/modules/qc/api/materialType/index.ts'), 'utf-8');
}

describe('api/materialType/index.ts — Barrel', () => {
  it('re-exports from materialType.api', () => {
    const content = readSource();
    expect(content).toContain("from './materialType.api'");
  });

  it('re-exports from materialType.queries', () => {
    const content = readSource();
    expect(content).toContain("from './materialType.queries'");
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
