import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Avatar — File Content & Structure Verification
// (FCV approach: reads source file with readFileSync and validates
// structure via regex/string matching. No direct import needed.)
// ═══════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/avatar.tsx'),
    'utf-8',
  );
};

describe('Avatar (FCV)', () => {
  // ─── Imports ──────────────────────────────────────────────────

  it('imports React', () => {
    const content = readSource();
    expect(content).toContain("import * as React from 'react'");
  });

  it('imports AvatarPrimitive from @radix-ui/react-avatar', () => {
    const content = readSource();
    expect(content).toContain('AvatarPrimitive');
    expect(content).toContain("'@radix-ui/react-avatar'");
  });

  it('imports cn from @/shared/utils', () => {
    const content = readSource();
    expect(content).toContain('cn');
    expect(content).toContain("'@/shared/utils'");
  });

  // ─── Exports ──────────────────────────────────────────────────

  it('exports Avatar, AvatarImage, and AvatarFallback', () => {
    const content = readSource();
    expect(content).toMatch(/export\s*\{[^}]*Avatar[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*AvatarImage[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*AvatarFallback[^}]*\}/);
  });

  // ═══════════════════════════════════════════════════════════════
  // Avatar Component
  // ═══════════════════════════════════════════════════════════════

  it('Avatar is defined with React.forwardRef', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+Avatar\s*=\s*React\.forwardRef/);
  });

  it('Avatar wraps AvatarPrimitive.Root', () => {
    const content = readSource();
    expect(content).toContain('<AvatarPrimitive.Root');
  });

  it('Avatar passes ref to the primitive', () => {
    const content = readSource();
    // Within the Avatar definition block, ref is passed
    const avatarBlock = content.split('Avatar.displayName')[0];
    expect(avatarBlock).toContain('ref={ref}');
  });

  it('Avatar applies base classes for circular avatar container', () => {
    const content = readSource();
    expect(content).toContain('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full');
  });

  it('Avatar merges className with cn()', () => {
    const content = readSource();
    expect(content).toMatch(
      /cn\(\s*'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full'\s*,\s*className\s*\)/,
    );
  });

  it('Avatar sets displayName from AvatarPrimitive.Root', () => {
    const content = readSource();
    expect(content).toContain('Avatar.displayName = AvatarPrimitive.Root.displayName');
  });

  // ═══════════════════════════════════════════════════════════════
  // AvatarImage Component
  // ═══════════════════════════════════════════════════════════════

  it('AvatarImage is defined with React.forwardRef', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+AvatarImage\s*=\s*React\.forwardRef/);
  });

  it('AvatarImage wraps AvatarPrimitive.Image', () => {
    const content = readSource();
    expect(content).toContain('<AvatarPrimitive.Image');
  });

  it('AvatarImage applies aspect-square sizing classes', () => {
    const content = readSource();
    expect(content).toContain('aspect-square h-full w-full');
  });

  it('AvatarImage merges className with cn()', () => {
    const content = readSource();
    expect(content).toMatch(/cn\(\s*'aspect-square h-full w-full'\s*,\s*className\s*\)/);
  });

  it('AvatarImage sets displayName from AvatarPrimitive.Image', () => {
    const content = readSource();
    expect(content).toContain('AvatarImage.displayName = AvatarPrimitive.Image.displayName');
  });

  // ═══════════════════════════════════════════════════════════════
  // AvatarFallback Component
  // ═══════════════════════════════════════════════════════════════

  it('AvatarFallback is defined with React.forwardRef', () => {
    const content = readSource();
    expect(content).toMatch(/const\s+AvatarFallback\s*=\s*React\.forwardRef/);
  });

  it('AvatarFallback wraps AvatarPrimitive.Fallback', () => {
    const content = readSource();
    expect(content).toContain('<AvatarPrimitive.Fallback');
  });

  it('AvatarFallback applies centered layout with muted background', () => {
    const content = readSource();
    expect(content).toContain(
      'flex h-full w-full items-center justify-center rounded-full bg-muted',
    );
  });

  it('AvatarFallback merges className with cn()', () => {
    const content = readSource();
    expect(content).toMatch(
      /cn\(\s*\n?\s*'flex h-full w-full items-center justify-center rounded-full bg-muted'\s*,\s*\n?\s*className/,
    );
  });

  it('AvatarFallback sets displayName from AvatarPrimitive.Fallback', () => {
    const content = readSource();
    expect(content).toContain('AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName');
  });

  // ─── All components spread remaining props ────────────────────

  it('all three components spread remaining props', () => {
    const content = readSource();
    const propsSpreadCount = (content.match(/\{\.\.\.props\}/g) || []).length;
    expect(propsSpreadCount).toBe(3);
  });

  // ─── All components use forwardRef pattern ────────────────────

  it('all three components use the forwardRef pattern', () => {
    const content = readSource();
    const forwardRefCount = (content.match(/React\.forwardRef/g) || []).length;
    expect(forwardRefCount).toBe(3);
  });

  // ─── All components set displayName ───────────────────────────

  it('all three components have displayName assigned', () => {
    const content = readSource();
    const displayNameCount = (content.match(/\.displayName\s*=/g) || []).length;
    expect(displayNameCount).toBe(3);
  });
});
