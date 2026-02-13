import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// pages/masterdata/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/modules/qc/pages/masterdata/index.ts'), 'utf-8');
}

describe('pages/masterdata/index.ts — Barrel', () => {
  it('exports MaterialTypesPage', () => {
    const content = readSource();
    expect(content).toContain('MaterialTypesPage');
  });

  it('exports QCParametersPage', () => {
    const content = readSource();
    expect(content).toContain('QCParametersPage');
  });

  it('uses default export re-export pattern', () => {
    const content = readSource();
    expect(content).toContain('export { default as');
  });
});
