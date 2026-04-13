import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Tests — constants/index.ts barrel re-exports
// ═══════════════════════════════════════════════════════════════

describe('Gate Constants Index (barrel re-exports)', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/constants/index.ts'),
    'utf-8',
  );

  it('re-exports from wizard.constants', () => {
    expect(content).toContain("'./wizard.constants'");
  });

  it('re-exports from entryFlowConfig', () => {
    expect(content).toContain("'./entryFlowConfig'");
  });
});
