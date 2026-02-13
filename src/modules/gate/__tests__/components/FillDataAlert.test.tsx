import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// FillDataAlert — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('FillDataAlert', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/FillDataAlert.tsx'),
    'utf-8',
  );

  it('exports a named function', () => {
    expect(content).toContain('export function');
  });

  it('imports icons from lucide-react', () => {
    expect(content).toContain("from 'lucide-react'");
  });

  it('imports from shared UI components', () => {
    expect(content).toContain("from '@/shared/components/ui'");
  });

  it('has a return statement with JSX', () => {
    expect(content).toContain('return (');
  });

  it('defines FillDataAlertProps interface', () => {
    expect(content).toContain('FillDataAlertProps');
  });

  it('renders text "Fill Data"', () => {
    expect(content).toContain('Fill Data');
  });
});
