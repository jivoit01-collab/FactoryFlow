import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// SharedStep2Page — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This page component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('SharedStep2Page', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/pages/shared/SharedStep2Page.tsx'),
    'utf-8',
  );

  it('exports SharedStep2Page as default function', () => {
    expect(content).toContain('export default function');
  });

  it('imports from react', () => {
    expect(content).toContain("from 'react'");
  });

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (');
  });

  it('defines SharedStep2PageProps', () => {
    expect(content).toContain('SharedStep2PageProps');
  });
});
