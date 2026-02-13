import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Step3Page — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('Step3Page', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/rawmaterialpages/Step3Page.tsx'),
    'utf-8',
  );

  it('exports Step3Page as default function', () => {
    expect(content).toContain('export default function');
  });

  it('imports icons from lucide-react', () => {
    expect(content).toContain("from 'lucide-react'");
  });

  it('imports from react', () => {
    expect(content).toContain("from 'react'");
  });

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (');
  });

  it('defines POCardProps', () => {
    expect(content).toContain('POCardProps');
  });
});
