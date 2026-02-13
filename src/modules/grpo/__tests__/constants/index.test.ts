import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Tests — constants/index.ts barrel re-exports
// ═══════════════════════════════════════════════════════════════

describe('GRPO Constants Index (barrel re-exports)', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/constants/index.ts'),
    'utf-8',
  );

  it('re-exports GRPO_STATUS_CONFIG', () => {
    expect(content).toContain('GRPO_STATUS_CONFIG');
  });

  it('re-exports GRPO_STATUS', () => {
    expect(content).toContain('GRPO_STATUS');
  });

  it('re-exports DEFAULT_BRANCH_ID', () => {
    expect(content).toContain('DEFAULT_BRANCH_ID');
  });

  it('re-exports from grpo.constants', () => {
    expect(content).toContain('./grpo.constants');
  });
});
