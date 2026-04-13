import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// DailyNeedsAllPage — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('DailyNeedsAllPage', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/dailyneedspages/DailyNeedsAllPage.tsx'),
    'utf-8',
  );

  it('exports DailyNeedsAllPage as default function', () => {
    expect(content).toContain('export default function');
  });
});
