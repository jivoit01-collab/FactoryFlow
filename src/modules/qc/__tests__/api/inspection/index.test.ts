import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// api/inspection/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
      return readFileSync(resolve(process.cwd(), 'src/modules/qc/api/inspection/index.ts'), 'utf-8');
}

describe('api/inspection/index.ts — Barrel', () => {
  it('re-exports from inspection.api', () => {
    const content = readSource();
    expect(content).toContain("from './inspection.api'");
  });

  it('re-exports from inspection.queries', () => {
    const content = readSource();
    expect(content).toContain("from './inspection.queries'");
  });

  it('uses export * syntax', () => {
    const content = readSource();
    expect(content).toMatch(/export \* from/);
  });
});
