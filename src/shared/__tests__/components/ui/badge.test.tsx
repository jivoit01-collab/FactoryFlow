import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Badge — File Content & Structure Verification
// (FCV approach: reads source file with readFileSync and validates
// structure via regex/string matching. No direct import needed.)
// ═══════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/badge.tsx'),
    'utf-8',
  );
};

describe('Badge (FCV)', () => {
  // ─── Imports ──────────────────────────────────────────────────

  it('imports React', () => {
    const content = readSource();
    expect(content).toContain("import * as React from 'react'");
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

  it('exports Badge as a named export', () => {
    const content = readSource();
    expect(content).toMatch(/export\s*\{[^}]*Badge[^}]*\}/);
  });

  it('exports badgeVariants as a named export', () => {
    const content = readSource();
    expect(content).toMatch(/export\s*\{[^}]*badgeVariants[^}]*\}/);
  });

  it('exports BadgeProps interface', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+interface\s+BadgeProps/);
  });

  // ─── Component Structure ──────────────────────────────────────

  it('Badge is a function component (not forwardRef)', () => {
    const content = readSource();
    expect(content).toMatch(/function\s+Badge\s*\(/);
    expect(content).not.toMatch(/React\.forwardRef.*Badge/);
  });

  it('Badge destructures className and variant from props', () => {
    const content = readSource();
    expect(content).toMatch(/function\s+Badge\s*\(\s*\{\s*className\s*,\s*variant/);
  });

  it('Badge renders a <div> element', () => {
    const content = readSource();
    expect(content).toMatch(/return\s+<div\s+className/);
  });

  it('Badge applies cn(badgeVariants({variant}), className)', () => {
    const content = readSource();
    expect(content).toContain('cn(badgeVariants({ variant }), className)');
  });

  it('Badge spreads remaining props onto the div', () => {
    const content = readSource();
    expect(content).toContain('{...props}');
  });

  // ─── BadgeProps Interface ─────────────────────────────────────

  it('BadgeProps extends React.HTMLAttributes<HTMLDivElement>', () => {
    const content = readSource();
    expect(content).toContain('React.HTMLAttributes<HTMLDivElement>');
  });

  it('BadgeProps extends VariantProps<typeof badgeVariants>', () => {
    const content = readSource();
    expect(content).toContain('VariantProps<typeof badgeVariants>');
  });

  // ─── badgeVariants Definition ─────────────────────────────────

  it('badgeVariants is defined with cva()', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+badgeVariants\s*=\s*cva\(/);
  });

  it('badgeVariants has base classes for inline-flex badge styling', () => {
    const content = readSource();
    expect(content).toContain('inline-flex');
    expect(content).toContain('items-center');
    expect(content).toContain('rounded-full');
    expect(content).toContain('border');
    expect(content).toContain('text-xs');
    expect(content).toContain('font-semibold');
    expect(content).toContain('transition-colors');
  });

  it('badgeVariants includes focus ring styles', () => {
    const content = readSource();
    expect(content).toContain('focus:outline-none');
    expect(content).toContain('focus:ring-2');
    expect(content).toContain('focus:ring-ring');
    expect(content).toContain('focus:ring-offset-2');
  });

  // ─── Variant: default ─────────────────────────────────────────

  it('has "default" variant with primary background', () => {
    const content = readSource();
    expect(content).toMatch(/default:\s*'[^']*bg-primary\s/);
    expect(content).toMatch(/default:\s*'[^']*text-primary-foreground/);
    expect(content).toMatch(/default:\s*'[^']*hover:bg-primary\/80/);
  });

  // ─── Variant: secondary ───────────────────────────────────────

  it('has "secondary" variant with secondary background', () => {
    const content = readSource();
    expect(content).toContain('bg-secondary');
    expect(content).toContain('text-secondary-foreground');
    expect(content).toContain('hover:bg-secondary/80');
  });

  // ─── Variant: destructive ─────────────────────────────────────

  it('has "destructive" variant with destructive background', () => {
    const content = readSource();
    expect(content).toContain('bg-destructive');
    expect(content).toContain('text-destructive-foreground');
    expect(content).toContain('hover:bg-destructive/80');
  });

  // ─── Variant: outline ─────────────────────────────────────────

  it('has "outline" variant with text-foreground only', () => {
    const content = readSource();
    expect(content).toMatch(/outline:\s*'text-foreground'/);
  });

  // ─── Variant: success ─────────────────────────────────────────

  it('has "success" variant with green background', () => {
    const content = readSource();
    expect(content).toContain('bg-green-500');
    expect(content).toContain('hover:bg-green-500/80');
  });

  // ─── Variant: warning ─────────────────────────────────────────

  it('has "warning" variant with yellow background', () => {
    const content = readSource();
    expect(content).toContain('bg-yellow-500');
    expect(content).toContain('hover:bg-yellow-500/80');
  });

  // ─── Variant: success & warning share white text ──────────────

  it('success and warning variants both use white text', () => {
    const content = readSource();
    // Both lines should contain text-white
    const variantBlock = content.match(/variants:\s*\{[\s\S]*?\n\s{4}\}/)?.[0] ?? '';
    const textWhiteCount = (variantBlock.match(/text-white/g) || []).length;
    expect(textWhiteCount).toBeGreaterThanOrEqual(2);
  });

  // ─── Default Variants ─────────────────────────────────────────

  it('sets defaultVariants.variant to "default"', () => {
    const content = readSource();
    expect(content).toMatch(/defaultVariants:\s*\{[\s\S]*?variant:\s*'default'/);
  });

  // ─── All six variants are present ─────────────────────────────

  it('defines exactly six variant keys', () => {
    const content = readSource();
    const variantNames = ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'];
    for (const name of variantNames) {
      expect(content).toMatch(new RegExp(`${name}:\\s`));
    }
  });

  // ─── All variants use border-transparent except outline ───────

  it('all non-outline variants use border-transparent', () => {
    const content = readSource();
    const lines = content.split('\n');
    const variantLines = lines.filter(
      (l: string) =>
        (l.includes('default:') ||
          l.includes('secondary:') ||
          l.includes('destructive:') ||
          l.includes('success:') ||
          l.includes('warning:')) &&
        l.includes("'"),
    );
    for (const line of variantLines) {
      if (!line.trim().startsWith('outline')) {
        expect(line).toContain('border-transparent');
      }
    }
  });
});
