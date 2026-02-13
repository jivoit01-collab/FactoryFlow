import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// components/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/modules/qc/components/index.ts'), 'utf-8');
}

describe('components/index.ts — Barrel', () => {
  it('exports MaterialTypeSelect', () => {
    const content = readSource();
    expect(content).toContain('MaterialTypeSelect');
  });

  it('exports from ./MaterialTypeSelect', () => {
    const content = readSource();
    expect(content).toContain("from './MaterialTypeSelect'");
  });
});
