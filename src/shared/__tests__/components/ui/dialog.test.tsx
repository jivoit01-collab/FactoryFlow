import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// Dialog — File Content Verification Tests
// Source: src/shared/components/ui/dialog.tsx
//
// Uses readFileSync to validate component structure without importing
// (avoids Vite module resolution hangs from lucide-react dependency chain)
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs')
  const path = require('node:path')
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/dialog.tsx'),
    'utf-8'
  )
}

describe('Dialog — File Content Verification', () => {
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

    it('imports DialogPrimitive from @radix-ui/react-dialog', () => {
      expect(source).toContain("import * as DialogPrimitive from '@radix-ui/react-dialog'")
    })

    it('imports X icon from lucide-react', () => {
      expect(source).toMatch(/import\s*\{[^}]*X[^}]*\}\s*from\s*['"]lucide-react['"]/)
    })

    it('imports cn utility from @/shared/utils', () => {
      expect(source).toContain("import { cn } from '@/shared/utils'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports (10 components)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    const expectedExports = [
      'Dialog',
      'DialogPortal',
      'DialogOverlay',
      'DialogClose',
      'DialogTrigger',
      'DialogContent',
      'DialogHeader',
      'DialogFooter',
      'DialogTitle',
      'DialogDescription',
    ]

    expectedExports.forEach((exportName) => {
      it(`exports ${exportName}`, () => {
        expect(source).toMatch(new RegExp(`export\\s*\\{[^}]*\\b${exportName}\\b[^}]*\\}`))
      })
    })

    it('exports exactly 10 components in the export block', () => {
      const exportMatch = source.match(/export\s*\{([^}]+)\}/)
      expect(exportMatch).not.toBeNull()
      const exportedNames = exportMatch![1].split(',').map((s) => s.trim()).filter(Boolean)
      expect(exportedNames).toHaveLength(10)
    })

    it('does not use default exports', () => {
      expect(source).not.toMatch(/export\s+default/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Direct Primitive Assignments
  // ═══════════════════════════════════════════════════════════════════════════
  describe('primitive assignments', () => {
    // ─── Dialog ───────────────────────────────────────────────────────
    it('assigns Dialog to DialogPrimitive.Root', () => {
      expect(source).toMatch(/const\s+Dialog\s*=\s*DialogPrimitive\.Root/)
    })

    // ─── DialogTrigger ────────────────────────────────────────────────
    it('assigns DialogTrigger to DialogPrimitive.Trigger', () => {
      expect(source).toMatch(/const\s+DialogTrigger\s*=\s*DialogPrimitive\.Trigger/)
    })

    // ─── DialogPortal ─────────────────────────────────────────────────
    it('assigns DialogPortal to DialogPrimitive.Portal', () => {
      expect(source).toMatch(/const\s+DialogPortal\s*=\s*DialogPrimitive\.Portal/)
    })

    // ─── DialogClose ──────────────────────────────────────────────────
    it('assigns DialogClose to DialogPrimitive.Close', () => {
      expect(source).toMatch(/const\s+DialogClose\s*=\s*DialogPrimitive\.Close/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // DialogOverlay — forwardRef Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DialogOverlay', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DialogOverlay\s*=\s*React\.forwardRef/)
    })

    it('wraps DialogPrimitive.Overlay', () => {
      expect(source).toContain('<DialogPrimitive.Overlay')
    })

    it('applies fixed inset-0 z-50 bg-black/80 base classes', () => {
      expect(source).toContain('fixed inset-0 z-50 bg-black/80')
    })

    it('includes open/close animation classes', () => {
      expect(source).toContain('data-[state=open]:animate-in')
      expect(source).toContain('data-[state=closed]:animate-out')
      expect(source).toContain('data-[state=closed]:fade-out-0')
      expect(source).toContain('data-[state=open]:fade-in-0')
    })

    it('sets displayName to DialogPrimitive.Overlay.displayName', () => {
      expect(source).toContain('DialogOverlay.displayName = DialogPrimitive.Overlay.displayName')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // DialogContent — forwardRef Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DialogContent', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DialogContent\s*=\s*React\.forwardRef/)
    })

    it('wraps content inside DialogPortal', () => {
      expect(source).toContain('<DialogPortal>')
    })

    it('includes DialogOverlay inside the portal', () => {
      expect(source).toContain('<DialogOverlay />')
    })

    it('wraps DialogPrimitive.Content', () => {
      expect(source).toContain('<DialogPrimitive.Content')
    })

    // ─── Positioning ──────────────────────────────────────────────────
    it('applies fixed centering with left-[50%] top-[50%] and translate transforms', () => {
      expect(source).toContain('fixed left-[50%] top-[50%]')
      expect(source).toContain('translate-x-[-50%] translate-y-[-50%]')
    })

    // ─── Animations ───────────────────────────────────────────────────
    it('includes zoom and fade animations for open/close states', () => {
      expect(source).toContain('data-[state=open]:zoom-in-95')
      expect(source).toContain('data-[state=closed]:zoom-out-95')
      expect(source).toContain('data-[state=open]:fade-in-0')
      expect(source).toContain('data-[state=closed]:fade-out-0')
    })

    // ─── Close Button ─────────────────────────────────────────────────
    it('includes a DialogPrimitive.Close button with X icon', () => {
      expect(source).toContain('<DialogPrimitive.Close')
      expect(source).toContain('<X className="h-4 w-4"')
    })

    it('includes sr-only "Close" text for accessibility', () => {
      expect(source).toContain('<span className="sr-only">Close</span>')
    })

    it('positions the close button at absolute right-4 top-4', () => {
      expect(source).toContain('absolute right-4 top-4')
    })

    it('sets displayName to DialogPrimitive.Content.displayName', () => {
      expect(source).toContain('DialogContent.displayName = DialogPrimitive.Content.displayName')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // DialogHeader — Plain Function Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DialogHeader', () => {
    it('is a plain function component (not forwardRef)', () => {
      expect(source).toMatch(/const\s+DialogHeader\s*=\s*\(/)
      expect(source).not.toMatch(/const\s+DialogHeader\s*=\s*React\.forwardRef/)
    })

    it('applies flex column layout with spacing and text alignment', () => {
      expect(source).toContain('flex flex-col space-y-1.5 text-center sm:text-left')
    })

    it('accepts HTMLAttributes<HTMLDivElement>', () => {
      expect(source).toContain('React.HTMLAttributes<HTMLDivElement>')
    })

    it('sets displayName to "DialogHeader"', () => {
      expect(source).toContain("DialogHeader.displayName = 'DialogHeader'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // DialogFooter — Plain Function Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DialogFooter', () => {
    it('is a plain function component (not forwardRef)', () => {
      expect(source).toMatch(/const\s+DialogFooter\s*=\s*\(/)
      expect(source).not.toMatch(/const\s+DialogFooter\s*=\s*React\.forwardRef/)
    })

    it('applies flex column-reverse with responsive row layout', () => {
      expect(source).toContain('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2')
    })

    it('sets displayName to "DialogFooter"', () => {
      expect(source).toContain("DialogFooter.displayName = 'DialogFooter'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // DialogTitle — forwardRef Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DialogTitle', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DialogTitle\s*=\s*React\.forwardRef/)
    })

    it('wraps DialogPrimitive.Title', () => {
      expect(source).toContain('<DialogPrimitive.Title')
    })

    it('applies text-lg font-semibold leading-none tracking-tight classes', () => {
      expect(source).toContain('text-lg font-semibold leading-none tracking-tight')
    })

    it('sets displayName to DialogPrimitive.Title.displayName', () => {
      expect(source).toContain('DialogTitle.displayName = DialogPrimitive.Title.displayName')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // DialogDescription — forwardRef Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DialogDescription', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+DialogDescription\s*=\s*React\.forwardRef/)
    })

    it('wraps DialogPrimitive.Description', () => {
      expect(source).toContain('<DialogPrimitive.Description')
    })

    it('applies text-sm text-muted-foreground classes', () => {
      expect(source).toContain('text-sm text-muted-foreground')
    })

    it('sets displayName to DialogPrimitive.Description.displayName', () => {
      expect(source).toContain('DialogDescription.displayName = DialogPrimitive.Description.displayName')
    })
  })
})
