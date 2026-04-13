import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// api/arrivalSlip/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
      return readFileSync(resolve(process.cwd(), 'src/modules/qc/api/arrivalSlip/index.ts'), 'utf-8');
}

describe('api/arrivalSlip/index.ts — Barrel', () => {
  it('exports arrivalSlipApi', () => {
    const content = readSource();
    expect(content).toContain('arrivalSlipApi');
  });

  it('exports useArrivalSlipById', () => {
    const content = readSource();
    expect(content).toContain('useArrivalSlipById');
  });

  it('exports ARRIVAL_SLIP_QUERY_KEYS', () => {
    const content = readSource();
    expect(content).toContain('ARRIVAL_SLIP_QUERY_KEYS');
  });

  it('exports from both source files', () => {
    const content = readSource();
    expect(content).toContain("from './arrivalSlip.api'");
    expect(content).toContain("from './arrivalSlip.queries'");
  });
});
