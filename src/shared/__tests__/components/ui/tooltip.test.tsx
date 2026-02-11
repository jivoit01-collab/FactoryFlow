import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// Tooltip — File Content Verification Tests
// Source: src/shared/components/ui/tooltip.tsx
//
// Uses readFileSync to validate component structure without importing
// (avoids Vite module resolution hangs from deep dependency chains)
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs')
  const path = require('node:path')
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/tooltip.tsx'),
    'utf-8'
  )
}

describe('Tooltip — File Content Verification', () => {
  let source: string

  beforeAll(() => {
    source = readSource()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('imports', () => {
    it('imports React', () => {
      expect(source).toContain("import * as React from 'react'")
    })

    it('imports TooltipPrimitive from @radix-ui/react-tooltip', () => {
      expect(source).toContain("import * as TooltipPrimitive from '@radix-ui/react-tooltip'")
    })

    it('imports cn utility from @/shared/utils', () => {
      expect(source).toContain("import { cn } from '@/shared/utils'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    it('exports Tooltip, TooltipTrigger, TooltipContent, and TooltipProvider', () => {
      expect(source).toMatch(/export\s*\{[^}]*Tooltip[^}]*\}/)
      expect(source).toMatch(/export\s*\{[^}]*TooltipTrigger[^}]*\}/)
      expect(source).toMatch(/export\s*\{[^}]*TooltipContent[^}]*\}/)
      expect(source).toMatch(/export\s*\{[^}]*TooltipProvider[^}]*\}/)
    })

    it('does not use default exports', () => {
      expect(source).not.toMatch(/export\s+default/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Direct Primitive Assignments
  // ═══════════════════════════════════════════════════════════════════════════
  describe('primitive assignments', () => {
    // ─── TooltipProvider ───────────────────────────────────────────────
    it('assigns TooltipProvider to TooltipPrimitive.Provider', () => {
      expect(source).toMatch(/const\s+TooltipProvider\s*=\s*TooltipPrimitive\.Provider/)
    })

    // ─── Tooltip ──────────────────────────────────────────────────────
    it('assigns Tooltip to TooltipPrimitive.Root', () => {
      expect(source).toMatch(/const\s+Tooltip\s*=\s*TooltipPrimitive\.Root/)
    })

    // ─── TooltipTrigger ───────────────────────────────────────────────
    it('assigns TooltipTrigger to TooltipPrimitive.Trigger', () => {
      expect(source).toMatch(/const\s+TooltipTrigger\s*=\s*TooltipPrimitive\.Trigger/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // TooltipContent — forwardRef Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('TooltipContent', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+TooltipContent\s*=\s*React\.forwardRef/)
    })

    it('wraps TooltipPrimitive.Content', () => {
      expect(source).toContain('<TooltipPrimitive.Content')
    })

    // ─── Default Props ────────────────────────────────────────────────
    it('has default sideOffset of 4', () => {
      expect(source).toMatch(/sideOffset\s*=\s*4/)
    })

    // ─── Styling ──────────────────────────────────────────────────────
    it('applies z-50 and overflow-hidden base classes', () => {
      expect(source).toContain('z-50 overflow-hidden rounded-md border')
    })

    it('uses cn() to merge className prop', () => {
      expect(source).toMatch(/cn\(\s*['"][^'"]*['"],\s*className\s*\)/)
    })

    // ─── Animations ───────────────────────────────────────────────────
    it('includes animate-in fade-in-0 zoom-in-95 animation classes', () => {
      expect(source).toContain('animate-in fade-in-0 zoom-in-95')
    })

    it('includes animate-out classes for closed state', () => {
      expect(source).toContain('data-[state=closed]:animate-out')
      expect(source).toContain('data-[state=closed]:fade-out-0')
      expect(source).toContain('data-[state=closed]:zoom-out-95')
    })

    it('includes directional slide-in animations for all four sides', () => {
      expect(source).toContain('data-[side=bottom]:slide-in-from-top-2')
      expect(source).toContain('data-[side=left]:slide-in-from-right-2')
      expect(source).toContain('data-[side=right]:slide-in-from-left-2')
      expect(source).toContain('data-[side=top]:slide-in-from-bottom-2')
    })

    // ─── displayName ──────────────────────────────────────────────────
    it('sets displayName to TooltipPrimitive.Content.displayName', () => {
      expect(source).toContain('TooltipContent.displayName = TooltipPrimitive.Content.displayName')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Ref Forwarding
  // ═══════════════════════════════════════════════════════════════════════════
  describe('ref forwarding', () => {
    it('passes ref to the underlying TooltipPrimitive.Content', () => {
      expect(source).toContain('ref={ref}')
    })

    it('spreads remaining props onto the primitive', () => {
      expect(source).toContain('{...props}')
    })
  })
})
