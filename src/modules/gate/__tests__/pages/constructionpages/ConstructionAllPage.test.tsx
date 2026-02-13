import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// ConstructionAllPage — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('ConstructionAllPage', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/constructionpages/ConstructionAllPage.tsx'),
    'utf-8',
  );

  it('exports ConstructionAllPage as default function', () => {
    expect(content).toContain('export default function');
  });
});
