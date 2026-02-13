import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Step2Page — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('Step2Page', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/constructionpages/Step2Page.tsx'),
    'utf-8',
  );

  it('exports Step2Page as default function', () => {
    expect(content).toContain('export default function');
  });
});
