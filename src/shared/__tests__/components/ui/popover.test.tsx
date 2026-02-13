import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Popover — File Content & Structure Verification
// (FCV approach: reads source file with readFileSync and validates
// structure via regex/string matching. No direct import needed.)
// ═══════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/popover.tsx'),
    'utf-8',
  );
};

describe('Popover (FCV)', () => {
  // ─── Imports ──────────────────────────────────────────────────

  it('imports React', () => {
    const content = readSource();
    expect(content).toContain("import * as React from 'react'");
  });

  it('imports PopoverPrimitive from @radix-ui/react-popover', () => {
    const content = readSource();
    expect(content).toContain('PopoverPrimitive');
    expect(content).toContain("'@radix-ui/react-popover'");
  });

  it('imports cn from @/shared/utils', () => {
    const content = readSource();
    expect(content).toContain('cn');
    expect(content).toContain("'@/shared/utils'");
  });

  // ─── Exports ──────────────────────────────────────────────────

  it('exports Popover, PopoverTrigger, and PopoverContent', () => {
    const content = readSource();
    expect(content).toMatch(/export\s*\{[^}]*Popover[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*PopoverTrigger[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*PopoverContent[^}]*\}/);
  });

  // ═══════════════════════════════════════════════════════════════
  // Popover & PopoverTrigger (direct re-exports)
  // ═══════════════════════════════════════════════════════════════

  it('Popover is a direct assignment from PopoverPrimitive.Root', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+Popover\s*=\s*PopoverPrimitive\.Root/);
  });

  it('PopoverTrigger is a direct assignment from PopoverPrimitive.Trigger', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+PopoverTrigger\s*=\s*PopoverPrimitive\.Trigger/);
  });

  it('Popover and PopoverTrigger are NOT forwardRef wrappers', () => {
    const content = readSource();
    // forwardRef should only appear once (for PopoverContent)
    const forwardRefCount = (content.match(/React\.forwardRef/g) || []).length;
    expect(forwardRefCount).toBe(1);
  });

  // ═══════════════════════════════════════════════════════════════
  // PopoverContent Component
  // ═══════════════════════════════════════════════════════════════

  it('PopoverContent is defined with React.forwardRef', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+PopoverContent\s*=\s*React\.forwardRef/);
  });

  it('PopoverContent wraps PopoverPrimitive.Content', () => {
    const content = readSource();
    expect(content).toContain('<PopoverPrimitive.Content');
  });

  it('PopoverContent passes ref to the content primitive', () => {
    const content = readSource();
    expect(content).toContain('ref={ref}');
  });

  // ─── Default Props ────────────────────────────────────────────

  it('PopoverContent defaults align to "center"', () => {
    const content = readSource();
    expect(content).toMatch(/align\s*=\s*'center'/);
  });

  it('PopoverContent defaults sideOffset to 4', () => {
    const content = readSource();
    expect(content).toMatch(/sideOffset\s*=\s*4/);
  });

  it('PopoverContent passes align and sideOffset to the primitive', () => {
    const content = readSource();
    expect(content).toContain('align={align}');
    expect(content).toContain('sideOffset={sideOffset}');
  });

  // ─── Portal Wrapper ───────────────────────────────────────────

  it('PopoverContent is wrapped in PopoverPrimitive.Portal', () => {
    const content = readSource();
    expect(content).toContain('<PopoverPrimitive.Portal>');
    expect(content).toContain('</PopoverPrimitive.Portal>');
  });

  it('Portal wraps the Content (Portal appears before Content in JSX)', () => {
    const content = readSource();
    const portalIdx = content.indexOf('<PopoverPrimitive.Portal>');
    const contentIdx = content.indexOf('<PopoverPrimitive.Content');
    expect(portalIdx).toBeLessThan(contentIdx);
  });

  // ─── Styling ──────────────────────────────────────────────────

  it('PopoverContent has z-50 and fixed width w-72', () => {
    const content = readSource();
    expect(content).toContain('z-50');
    expect(content).toContain('w-72');
  });

  it('PopoverContent has rounded-md border and padding', () => {
    const content = readSource();
    expect(content).toContain('rounded-md');
    expect(content).toContain('border');
    expect(content).toContain('p-4');
  });

  it('PopoverContent uses popover background and foreground colors', () => {
    const content = readSource();
    expect(content).toContain('bg-popover');
    expect(content).toContain('text-popover-foreground');
  });

  it('PopoverContent has shadow-md and outline-none', () => {
    const content = readSource();
    expect(content).toContain('shadow-md');
    expect(content).toContain('outline-none');
  });

  it('PopoverContent has open/close animation classes', () => {
    const content = readSource();
    expect(content).toContain('data-[state=open]:animate-in');
    expect(content).toContain('data-[state=closed]:animate-out');
    expect(content).toContain('data-[state=closed]:fade-out-0');
    expect(content).toContain('data-[state=open]:fade-in-0');
    expect(content).toContain('data-[state=closed]:zoom-out-95');
    expect(content).toContain('data-[state=open]:zoom-in-95');
  });

  it('PopoverContent has directional slide-in animations for all four sides', () => {
    const content = readSource();
    expect(content).toContain('data-[side=bottom]:slide-in-from-top-2');
    expect(content).toContain('data-[side=left]:slide-in-from-right-2');
    expect(content).toContain('data-[side=right]:slide-in-from-left-2');
    expect(content).toContain('data-[side=top]:slide-in-from-bottom-2');
  });

  it('PopoverContent merges className via cn()', () => {
    const content = readSource();
    expect(content).toMatch(/cn\(\s*\n?\s*'z-50/);
    expect(content).toContain('className');
  });

  it('PopoverContent spreads remaining props', () => {
    const content = readSource();
    expect(content).toContain('{...props}');
  });

  // ─── DisplayName ──────────────────────────────────────────────

  it('PopoverContent.displayName is set to PopoverPrimitive.Content.displayName', () => {
    const content = readSource();
    expect(content).toContain('PopoverContent.displayName = PopoverPrimitive.Content.displayName');
  });

  // ─── Only PopoverContent has displayName ──────────────────────

  it('only one displayName assignment exists (PopoverContent)', () => {
    const content = readSource();
    const displayNameCount = (content.match(/\.displayName\s*=/g) || []).length;
    expect(displayNameCount).toBe(1);
  });
});
