import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// api/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/modules/qc/api/index.ts'), 'utf-8');
}

describe('api/index.ts — Barrel', () => {
  it('re-exports from ./inspection', () => {
    const content = readSource();
    expect(content).toContain("from './inspection'");
  });

  it('re-exports from ./materialType', () => {
    const content = readSource();
    expect(content).toContain("from './materialType'");
  });

  it('re-exports from ./qcParameter', () => {
    const content = readSource();
    expect(content).toContain("from './qcParameter'");
  });

  it('does NOT re-export from ./arrivalSlip', () => {
    const content = readSource();
    expect(content).not.toContain("from './arrivalSlip'");
  });
});
