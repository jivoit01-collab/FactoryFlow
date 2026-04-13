import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Tests — components/index.ts barrel re-exports
// ═══════════════════════════════════════════════════════════════

describe('GRPO Components Index (barrel re-exports)', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/components/index.ts'),
    'utf-8',
  );

  it('re-exports WarehouseSelect', () => {
    expect(content).toContain('WarehouseSelect');
    expect(content).toContain('./WarehouseSelect');
  });
});
