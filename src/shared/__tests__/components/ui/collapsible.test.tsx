import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Collapsible — File Content & Structure Verification
// (FCV approach: reads source file with readFileSync and validates
// structure via regex/string matching. No direct import needed.)
// ═══════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/collapsible.tsx'),
    'utf-8',
  );
};

describe('Collapsible (FCV)', () => {
  // ─── Imports ──────────────────────────────────────────────────

  it('imports React', () => {
    const content = readSource();
    expect(content).toContain("import * as React from 'react'");
  });

  it('imports CollapsiblePrimitive from @radix-ui/react-collapsible', () => {
    const content = readSource();
    expect(content).toContain('CollapsiblePrimitive');
    expect(content).toContain("'@radix-ui/react-collapsible'");
  });

  it('imports cn from @/shared/utils', () => {
    const content = readSource();
    expect(content).toContain('cn');
    expect(content).toContain("'@/shared/utils'");
  });

  // ─── Exports ──────────────────────────────────────────────────

  it('exports Collapsible, CollapsibleTrigger, and CollapsibleContent', () => {
    const content = readSource();
    expect(content).toMatch(/export\s*\{[^}]*Collapsible[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*CollapsibleTrigger[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*CollapsibleContent[^}]*\}/);
  });

  // ═══════════════════════════════════════════════════════════════
  // Collapsible & CollapsibleTrigger (direct re-exports)
  // ═══════════════════════════════════════════════════════════════

  it('Collapsible is a direct assignment from CollapsiblePrimitive.Root', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+Collapsible\s*=\s*CollapsiblePrimitive\.Root/);
  });

  it('CollapsibleTrigger is a direct assignment from CollapsiblePrimitive.Trigger', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+CollapsibleTrigger\s*=\s*CollapsiblePrimitive\.Trigger/);
  });

  it('Collapsible and CollapsibleTrigger are NOT forwardRef wrappers', () => {
    const content = readSource();
    // forwardRef should only appear once (for CollapsibleContent)
    const forwardRefCount = (content.match(/React\.forwardRef/g) || []).length;
    expect(forwardRefCount).toBe(1);
  });

  // ═══════════════════════════════════════════════════════════════
  // CollapsibleContent Component
  // ═══════════════════════════════════════════════════════════════

  it('CollapsibleContent is defined with React.forwardRef', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+CollapsibleContent\s*=\s*React\.forwardRef/);
  });

  it('CollapsibleContent wraps CollapsiblePrimitive.Content', () => {
    const content = readSource();
    expect(content).toContain('<CollapsiblePrimitive.Content');
  });

  it('CollapsibleContent passes ref to the content primitive', () => {
    const content = readSource();
    expect(content).toContain('ref={ref}');
  });

  it('CollapsibleContent spreads remaining props', () => {
    const content = readSource();
    expect(content).toContain('{...props}');
  });

  // ─── Styling ──────────────────────────────────────────────────

  it('CollapsibleContent has overflow-hidden base class', () => {
    const content = readSource();
    expect(content).toContain('overflow-hidden');
  });

  it('CollapsibleContent uses collapsible-up animation when closed', () => {
    const content = readSource();
    expect(content).toContain('data-[state=closed]:animate-collapsible-up');
  });

  it('CollapsibleContent uses collapsible-down animation when open', () => {
    const content = readSource();
    expect(content).toContain('data-[state=open]:animate-collapsible-down');
  });

  it('CollapsibleContent animation classes match the full expected string', () => {
    const content = readSource();
    expect(content).toContain(
      'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
    );
  });

  it('CollapsibleContent merges className via cn()', () => {
    const content = readSource();
    expect(content).toMatch(
      /cn\(\s*\n?\s*'overflow-hidden data-\[state=closed\]:animate-collapsible-up data-\[state=open\]:animate-collapsible-down'\s*,\s*\n?\s*className/,
    );
  });

  // ─── Type Safety ──────────────────────────────────────────────

  it('ref type uses React.ElementRef<typeof CollapsiblePrimitive.Content>', () => {
    const content = readSource();
    expect(content).toContain('React.ElementRef<typeof CollapsiblePrimitive.Content>');
  });

  it('props type uses React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>', () => {
    const content = readSource();
    expect(content).toContain(
      'React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>',
    );
  });

  // ─── DisplayName ──────────────────────────────────────────────

  it('CollapsibleContent.displayName is set to CollapsiblePrimitive.Content.displayName', () => {
    const content = readSource();
    expect(content).toContain(
      'CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName',
    );
  });

  it('only one displayName assignment exists (CollapsibleContent)', () => {
    const content = readSource();
    const displayNameCount = (content.match(/\.displayName\s*=/g) || []).length;
    expect(displayNameCount).toBe(1);
  });

  // ─── CollapsibleContent destructures className ────────────────

  it('CollapsibleContent destructures className from props', () => {
    const content = readSource();
    // Within the forwardRef callback
    expect(content).toMatch(/\(\s*\{\s*className\s*,\s*\.\.\.props\s*\}/);
  });
});
