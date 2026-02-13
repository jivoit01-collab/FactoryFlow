import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Tests — utils/index.ts migration notice
// ═══════════════════════════════════════════════════════════════

describe('Gate Utils Index', () => {
  it('utils/index.ts exists and documents migration', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const content = readFileSync(
      resolve(process.cwd(), 'src/modules/gate/utils/index.ts'),
      'utf-8',
    );
    expect(content).toContain('migrated');
  });
});
