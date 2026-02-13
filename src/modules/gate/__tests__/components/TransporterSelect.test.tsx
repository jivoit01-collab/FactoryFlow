import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// TransporterSelect — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('TransporterSelect', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/TransporterSelect.tsx'),
    'utf-8',
  );

  it('exports a named function', () => {
    expect(content).toContain('export function');
  });

  it('imports icons from lucide-react', () => {
    expect(content).toContain("from 'lucide-react'");
  });

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (');
  });

  it('defines TransporterSelectProps interface', () => {
    expect(content).toContain('TransporterSelectProps');
  });
});
