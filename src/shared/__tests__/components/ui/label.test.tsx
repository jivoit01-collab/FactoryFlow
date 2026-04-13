import fs from 'node:fs';
import path from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Label — File Content & Structure Verification
// (FCV approach: reads source file with readFileSync and validates
// structure via regex/string matching. No direct import needed.)
// ═══════════════════════════════════════════════════════════════

const readSource = () => {
      return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/label.tsx'),
    'utf-8',
  );
};

describe('Label (FCV)', () => {
  // ─── Imports ──────────────────────────────────────────────────

  it('imports React', () => {
    const content = readSource();
    expect(content).toContain("import * as React from 'react'");
  });

  it('imports LabelPrimitive from @radix-ui/react-label', () => {
    const content = readSource();
    expect(content).toContain('LabelPrimitive');
    expect(content).toContain("'@radix-ui/react-label'");
  });

  it('imports cva and VariantProps from class-variance-authority', () => {
    const content = readSource();
    expect(content).toContain('cva');
    expect(content).toContain('VariantProps');
    expect(content).toContain("'class-variance-authority'");
  });

  it('imports cn from @/shared/utils', () => {
    const content = readSource();
    expect(content).toContain('cn');
    expect(content).toContain("'@/shared/utils'");
  });

  // ─── Exports ──────────────────────────────────────────────────

  it('exports Label as a named export', () => {
    const content = readSource();
    expect(content).toMatch(/export\s*\{[^}]*Label[^}]*\}/);
  });

  // ─── labelVariants Definition ─────────────────────────────────

  it('defines labelVariants with cva()', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+labelVariants\s*=\s*cva\(/);
  });

  it('labelVariants has base style for text-sm font-medium', () => {
    const content = readSource();
    expect(content).toContain('text-sm');
    expect(content).toContain('font-medium');
    expect(content).toContain('leading-none');
  });

  it('labelVariants includes peer-disabled styles', () => {
    const content = readSource();
    expect(content).toContain('peer-disabled:cursor-not-allowed');
    expect(content).toContain('peer-disabled:opacity-70');
  });

  it('labelVariants base string matches expected full value', () => {
    const content = readSource();
    expect(content).toContain(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    );
  });

  // ─── Label Component Structure ────────────────────────────────

  it('Label is defined with React.forwardRef', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+Label\s*=\s*React\.forwardRef/);
  });

  it('Label wraps LabelPrimitive.Root', () => {
    const content = readSource();
    expect(content).toContain('<LabelPrimitive.Root');
  });

  it('Label passes ref to the primitive', () => {
    const content = readSource();
    expect(content).toContain('ref={ref}');
  });

  it('Label applies cn(labelVariants(), className)', () => {
    const content = readSource();
    expect(content).toContain('cn(labelVariants(), className)');
  });

  it('Label spreads remaining props onto the primitive', () => {
    const content = readSource();
    expect(content).toContain('{...props}');
  });

  it('Label destructures className from props', () => {
    const content = readSource();
    expect(content).toMatch(/\(\s*\{\s*className\s*,\s*\.\.\.props\s*\}/);
  });

  // ─── Type Safety ──────────────────────────────────────────────

  it('Label ref type uses React.ElementRef<typeof LabelPrimitive.Root>', () => {
    const content = readSource();
    expect(content).toContain('React.ElementRef<typeof LabelPrimitive.Root>');
  });

  it('Label props type combines ComponentPropsWithoutRef and VariantProps', () => {
    const content = readSource();
    expect(content).toContain('React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>');
    expect(content).toContain('VariantProps<typeof labelVariants>');
  });

  // ─── DisplayName ──────────────────────────────────────────────

  it('Label.displayName is set to LabelPrimitive.Root.displayName', () => {
    const content = readSource();
    expect(content).toContain('Label.displayName = LabelPrimitive.Root.displayName');
  });
});
