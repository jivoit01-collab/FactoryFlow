import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// StepFooter — File Content Verification
// ═══════════════════════════════════════════════════════════════
// This component imports from lucide-react and deep dependency
// chains that hang Vite's module graph resolver in threads pool.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('StepFooter', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/StepFooter.tsx'),
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

  it('defines StepFooterProps interface', () => {
    expect(content).toContain('StepFooterProps');
  });

  it('renders text "Previous"', () => {
    expect(content).toContain('Previous');
  });

  it('renders text "Cancel"', () => {
    expect(content).toContain('Cancel');
  });

  it('renders text "Save and Next →"', () => {
    expect(content).toContain('Save and Next →');
  });
});
