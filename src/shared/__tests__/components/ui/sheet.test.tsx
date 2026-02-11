import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// Sheet — File Content Verification Tests
// Source: src/shared/components/ui/sheet.tsx
//
// Uses readFileSync to validate component structure without importing
// (avoids Vite module resolution hangs from lucide-react dependency chain)
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs')
  const path = require('node:path')
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/sheet.tsx'),
    'utf-8'
  )
}

describe('Sheet — File Content Verification', () => {
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

    it('imports SheetPrimitive from @radix-ui/react-dialog', () => {
      expect(source).toContain("import * as SheetPrimitive from '@radix-ui/react-dialog'")
    })

    it('imports cva and VariantProps from class-variance-authority', () => {
      expect(source).toMatch(/import\s*\{[^}]*cva[^}]*VariantProps[^}]*\}\s*from\s*['"]class-variance-authority['"]/)
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
      'Sheet',
      'SheetPortal',
      'SheetOverlay',
      'SheetTrigger',
      'SheetClose',
      'SheetContent',
      'SheetHeader',
      'SheetFooter',
      'SheetTitle',
      'SheetDescription',
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
    it('assigns Sheet to SheetPrimitive.Root', () => {
      expect(source).toMatch(/const\s+Sheet\s*=\s*SheetPrimitive\.Root/)
    })

    it('assigns SheetTrigger to SheetPrimitive.Trigger', () => {
      expect(source).toMatch(/const\s+SheetTrigger\s*=\s*SheetPrimitive\.Trigger/)
    })

    it('assigns SheetClose to SheetPrimitive.Close', () => {
      expect(source).toMatch(/const\s+SheetClose\s*=\s*SheetPrimitive\.Close/)
    })

    it('assigns SheetPortal to SheetPrimitive.Portal', () => {
      expect(source).toMatch(/const\s+SheetPortal\s*=\s*SheetPrimitive\.Portal/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // sheetVariants — CVA Configuration
  // ═══════════════════════════════════════════════════════════════════════════
  describe('sheetVariants', () => {
    it('defines sheetVariants using cva()', () => {
      expect(source).toMatch(/const\s+sheetVariants\s*=\s*cva\(/)
    })

    it('applies base classes including fixed z-50 and transition', () => {
      expect(source).toContain('fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out')
    })

    it('includes open/close animation duration classes', () => {
      expect(source).toContain('data-[state=closed]:duration-300')
      expect(source).toContain('data-[state=open]:duration-500')
    })

    // ─── Side Variants ────────────────────────────────────────────────
    it('defines a "top" side variant with slide-out-to-top and slide-in-from-top', () => {
      expect(source).toContain('data-[state=closed]:slide-out-to-top')
      expect(source).toContain('data-[state=open]:slide-in-from-top')
    })

    it('defines a "bottom" side variant with slide-out-to-bottom and slide-in-from-bottom', () => {
      expect(source).toContain('data-[state=closed]:slide-out-to-bottom')
      expect(source).toContain('data-[state=open]:slide-in-from-bottom')
    })

    it('defines a "left" side variant with slide-out-to-left and slide-in-from-left', () => {
      expect(source).toContain('data-[state=closed]:slide-out-to-left')
      expect(source).toContain('data-[state=open]:slide-in-from-left')
    })

    it('defines a "right" side variant with slide-out-to-right and slide-in-from-right', () => {
      expect(source).toContain('data-[state=closed]:slide-out-to-right')
      expect(source).toContain('data-[state=open]:slide-in-from-right')
    })

    it('sets default side variant to "right"', () => {
      expect(source).toMatch(/defaultVariants\s*:\s*\{[^}]*side\s*:\s*['"]right['"]/)
    })

    // ─── Structural Variant Details ───────────────────────────────────
    it('top variant applies inset-x-0 top-0 border-b', () => {
      expect(source).toContain('inset-x-0 top-0 border-b')
    })

    it('bottom variant applies inset-x-0 bottom-0 border-t', () => {
      expect(source).toContain('inset-x-0 bottom-0 border-t')
    })

    it('left variant applies inset-y-0 left-0 with h-full w-3/4 and sm:max-w-sm', () => {
      expect(source).toContain('inset-y-0 left-0 h-full w-3/4 border-r')
      expect(source).toContain('sm:max-w-sm')
    })

    it('right variant applies inset-y-0 right-0 with h-full w-3/4 and sm:max-w-sm', () => {
      expect(source).toContain('inset-y-0 right-0 h-full w-3/4 border-l')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SheetOverlay — forwardRef Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SheetOverlay', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+SheetOverlay\s*=\s*React\.forwardRef/)
    })

    it('wraps SheetPrimitive.Overlay', () => {
      expect(source).toContain('<SheetPrimitive.Overlay')
    })

    it('applies fixed inset-0 z-50 bg-black/80 base classes', () => {
      expect(source).toContain('fixed inset-0 z-50 bg-black/80')
    })

    it('includes fade animations for open/close states', () => {
      expect(source).toContain('data-[state=open]:animate-in')
      expect(source).toContain('data-[state=closed]:animate-out')
      expect(source).toContain('data-[state=closed]:fade-out-0')
      expect(source).toContain('data-[state=open]:fade-in-0')
    })

    it('sets displayName to SheetPrimitive.Overlay.displayName', () => {
      expect(source).toContain('SheetOverlay.displayName = SheetPrimitive.Overlay.displayName')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SheetContent — forwardRef Component with Variants
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SheetContent', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+SheetContent\s*=\s*React\.forwardRef/)
    })

    it('wraps content inside SheetPortal', () => {
      expect(source).toContain('<SheetPortal>')
    })

    it('includes SheetOverlay inside the portal', () => {
      expect(source).toContain('<SheetOverlay />')
    })

    it('wraps SheetPrimitive.Content', () => {
      expect(source).toContain('<SheetPrimitive.Content')
    })

    it('defaults side prop to "right"', () => {
      expect(source).toMatch(/side\s*=\s*['"]right['"]/)
    })

    it('applies sheetVariants with the side prop via cn()', () => {
      expect(source).toContain('cn(sheetVariants({ side }), className)')
    })

    // ─── Close Button ─────────────────────────────────────────────────
    it('includes a SheetPrimitive.Close button with X icon', () => {
      expect(source).toContain('<SheetPrimitive.Close')
      expect(source).toContain('<X className="h-4 w-4"')
    })

    it('includes sr-only "Close" text for accessibility', () => {
      expect(source).toContain('<span className="sr-only">Close</span>')
    })

    it('positions the close button at absolute right-4 top-4', () => {
      expect(source).toContain('absolute right-4 top-4')
    })

    it('sets displayName to SheetPrimitive.Content.displayName', () => {
      expect(source).toContain('SheetContent.displayName = SheetPrimitive.Content.displayName')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SheetContentProps Interface
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SheetContentProps', () => {
    it('defines SheetContentProps interface', () => {
      expect(source).toMatch(/interface\s+SheetContentProps/)
    })

    it('extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>', () => {
      expect(source).toContain('React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>')
    })

    it('extends VariantProps<typeof sheetVariants>', () => {
      expect(source).toContain('VariantProps<typeof sheetVariants>')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SheetHeader — Plain Function Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SheetHeader', () => {
    it('is a plain function component (not forwardRef)', () => {
      expect(source).toMatch(/const\s+SheetHeader\s*=\s*\(/)
      expect(source).not.toMatch(/const\s+SheetHeader\s*=\s*React\.forwardRef/)
    })

    it('applies flex flex-col space-y-2 text-center sm:text-left classes', () => {
      expect(source).toContain('flex flex-col space-y-2 text-center sm:text-left')
    })

    it('sets displayName to "SheetHeader"', () => {
      expect(source).toContain("SheetHeader.displayName = 'SheetHeader'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SheetFooter — Plain Function Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SheetFooter', () => {
    it('is a plain function component (not forwardRef)', () => {
      expect(source).toMatch(/const\s+SheetFooter\s*=\s*\(/)
      expect(source).not.toMatch(/const\s+SheetFooter\s*=\s*React\.forwardRef/)
    })

    it('applies flex column-reverse with responsive row layout', () => {
      expect(source).toContain('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2')
    })

    it('sets displayName to "SheetFooter"', () => {
      expect(source).toContain("SheetFooter.displayName = 'SheetFooter'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SheetTitle — forwardRef Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SheetTitle', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+SheetTitle\s*=\s*React\.forwardRef/)
    })

    it('wraps SheetPrimitive.Title', () => {
      expect(source).toContain('<SheetPrimitive.Title')
    })

    it('applies text-lg font-semibold text-foreground classes', () => {
      expect(source).toContain('text-lg font-semibold text-foreground')
    })

    it('sets displayName to SheetPrimitive.Title.displayName', () => {
      expect(source).toContain('SheetTitle.displayName = SheetPrimitive.Title.displayName')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SheetDescription — forwardRef Component
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SheetDescription', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+SheetDescription\s*=\s*React\.forwardRef/)
    })

    it('wraps SheetPrimitive.Description', () => {
      expect(source).toContain('<SheetPrimitive.Description')
    })

    it('applies text-sm text-muted-foreground classes', () => {
      expect(source).toContain('text-sm text-muted-foreground')
    })

    it('sets displayName to SheetPrimitive.Description.displayName', () => {
      expect(source).toContain('SheetDescription.displayName = SheetPrimitive.Description.displayName')
    })
  })
})
