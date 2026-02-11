import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Separator — File Content & Structure Verification
// (FCV approach: reads source file with readFileSync and validates
// structure via regex/string matching. No direct import needed.)
// ═══════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs')
  const path = require('node:path')
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/separator.tsx'),
    'utf-8',
  )
}

describe('Separator (FCV)', () => {
  // ─── Imports ──────────────────────────────────────────────────

  it('imports React', () => {
    const content = readSource()
    expect(content).toContain("import * as React from 'react'")
  })

  it('imports SeparatorPrimitive from @radix-ui/react-separator', () => {
    const content = readSource()
    expect(content).toContain('SeparatorPrimitive')
    expect(content).toContain("'@radix-ui/react-separator'")
  })

  it('imports cn from @/shared/utils', () => {
    const content = readSource()
    expect(content).toContain('cn')
    expect(content).toContain("'@/shared/utils'")
  })

  // ─── Exports ──────────────────────────────────────────────────

  it('exports Separator as a named export', () => {
    const content = readSource()
    expect(content).toMatch(/export\s*\{[^}]*Separator[^}]*\}/)
  })

  // ─── Component Structure ──────────────────────────────────────

  it('Separator is defined with React.forwardRef', () => {
    const content = readSource()
    expect(content).toMatch(/const\s+Separator\s*=\s*React\.forwardRef/)
  })

  it('Separator wraps SeparatorPrimitive.Root', () => {
    const content = readSource()
    expect(content).toContain('<SeparatorPrimitive.Root')
  })

  it('Separator passes ref to the primitive', () => {
    const content = readSource()
    expect(content).toContain('ref={ref}')
  })

  it('Separator spreads remaining props onto the primitive', () => {
    const content = readSource()
    expect(content).toContain('{...props}')
  })

  // ─── Default Props ────────────────────────────────────────────

  it('defaults orientation to "horizontal"', () => {
    const content = readSource()
    expect(content).toMatch(/orientation\s*=\s*'horizontal'/)
  })

  it('defaults decorative to true', () => {
    const content = readSource()
    expect(content).toMatch(/decorative\s*=\s*true/)
  })

  it('passes decorative prop to the primitive', () => {
    const content = readSource()
    expect(content).toContain('decorative={decorative}')
  })

  it('passes orientation prop to the primitive', () => {
    const content = readSource()
    expect(content).toContain('orientation={orientation}')
  })

  // ─── Base Styling ─────────────────────────────────────────────

  it('has base class "shrink-0 bg-border"', () => {
    const content = readSource()
    expect(content).toContain('shrink-0 bg-border')
  })

  // ─── Conditional Orientation Classes ──────────────────────────

  it('applies "h-[1px] w-full" when orientation is horizontal', () => {
    const content = readSource()
    expect(content).toContain("'h-[1px] w-full'")
  })

  it('applies "h-full w-[1px]" when orientation is vertical', () => {
    const content = readSource()
    expect(content).toContain("'h-full w-[1px]'")
  })

  it('uses ternary on orientation === "horizontal" for class selection', () => {
    const content = readSource()
    expect(content).toMatch(
      /orientation\s*===\s*'horizontal'\s*\?\s*'h-\[1px\] w-full'\s*:\s*'h-full w-\[1px\]'/,
    )
  })

  it('merges base, orientation, and custom classes via cn()', () => {
    const content = readSource()
    expect(content).toMatch(
      /cn\(\s*\n?\s*'shrink-0 bg-border'\s*,\s*\n?\s*orientation\s*===\s*'horizontal'/,
    )
  })

  // ─── Type Safety ──────────────────────────────────────────────

  it('ref type uses React.ElementRef<typeof SeparatorPrimitive.Root>', () => {
    const content = readSource()
    expect(content).toContain('React.ElementRef<typeof SeparatorPrimitive.Root>')
  })

  it('props type uses React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>', () => {
    const content = readSource()
    expect(content).toContain('React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>')
  })

  // ─── DisplayName ──────────────────────────────────────────────

  it('Separator.displayName is set to SeparatorPrimitive.Root.displayName', () => {
    const content = readSource()
    expect(content).toContain('Separator.displayName = SeparatorPrimitive.Root.displayName')
  })
})
