import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// index.ts — Root Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
      return readFileSync(resolve(process.cwd(), 'src/modules/qc/index.ts'), 'utf-8');
}

describe('qc/index.ts — Root Barrel', () => {
  it('re-exports from ./module.config', () => {
    const content = readSource();
    expect(content).toContain("from './module.config'");
  });

  it('re-exports from ./types', () => {
    const content = readSource();
    expect(content).toContain("from './types'");
  });

  it('re-exports from ./constants', () => {
    const content = readSource();
    expect(content).toContain("from './constants'");
  });

  it('re-exports from ./api', () => {
    const content = readSource();
    expect(content).toContain("from './api'");
  });

  it('re-exports from ./pages', () => {
    const content = readSource();
    expect(content).toContain("from './pages'");
  });
});
