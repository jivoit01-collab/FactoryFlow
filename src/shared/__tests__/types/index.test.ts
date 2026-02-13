import { describe, it, expect } from 'vitest';

describe('Types Index Exports', () => {
  it('types/index.ts re-exports from common.types', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const content = readFileSync(resolve(process.cwd(), 'src/shared/types/index.ts'), 'utf-8');

    expect(content).toContain("export * from './common.types'");
  });

  it('types can be imported from the index barrel', async () => {
    // Dynamic import to verify the module resolves
    const mod = await import('../../types/index');
    // Since types are erased at runtime, we just verify the module loads
    expect(mod).toBeDefined();
  });
});
