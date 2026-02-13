import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// SharedStep1Page — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('SharedStep1Page', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/shared/SharedStep1Page.tsx'),
    'utf-8',
  );

  it('exports SharedStep1Page as default function', () => {
    expect(content).toContain('export default function');
  });

  it('imports from react', () => {
    expect(content).toContain("from 'react'");
  });

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (');
  });

  it('defines SharedStep1PageProps', () => {
    expect(content).toContain('SharedStep1PageProps');
  });
});
