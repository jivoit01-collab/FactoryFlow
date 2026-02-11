import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// Button Component — File Content Verification
// ═══════════════════════════════════════════════════════════════════════════════
// Validates structure, variants, accessibility, and exports of the Button
// component without importing it (Radix Slot + CVA deps hang Vite resolution).
// ═══════════════════════════════════════════════════════════════════════════════

const readSource = () => {
  const fs = require('node:fs')
  const path = require('node:path')
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/shared/components/ui/button.tsx'),
    'utf-8',
  )
}

describe('shared/components/ui/button.tsx — file content verification', () => {
  const source = readSource()

  // ═══════════════════════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('imports', () => {
    it('imports React', () => {
      expect(source).toMatch(/import\s+\*\s+as\s+React\s+from\s+['"]react['"]/)
    })

    it('imports Slot from @radix-ui/react-slot', () => {
      expect(source).toContain("import { Slot } from '@radix-ui/react-slot'")
    })

    it('imports cva and VariantProps from class-variance-authority', () => {
      expect(source).toMatch(/import\s*\{[^}]*cva[^}]*VariantProps[^}]*\}/)
      expect(source).toContain("from 'class-variance-authority'")
    })

    it('imports cn utility from @/shared/utils', () => {
      expect(source).toMatch(/import\s*\{\s*cn\s*\}\s*from\s*['"]@\/shared\/utils['"]/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // buttonVariants (CVA definition)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('buttonVariants', () => {
    it('defines buttonVariants with cva()', () => {
      expect(source).toMatch(/const\s+buttonVariants\s*=\s*cva\(/)
    })

    // ─────────────────────────────────────────────────────────────────────────
    // variant options
    // ─────────────────────────────────────────────────────────────────────────
    describe('variant options', () => {
      it('includes default variant with bg-primary', () => {
        expect(source).toMatch(/default:\s*['"]bg-primary\s+text-primary-foreground/)
      })

      it('includes destructive variant with bg-destructive', () => {
        expect(source).toMatch(/destructive:\s*['"]bg-destructive\s+text-destructive-foreground/)
      })

      it('includes outline variant with border', () => {
        expect(source).toMatch(/outline:\s*['"]border\s+border-input\s+bg-background/)
      })

      it('includes secondary variant with bg-secondary', () => {
        expect(source).toMatch(/secondary:\s*['"]bg-secondary\s+text-secondary-foreground/)
      })

      it('includes ghost variant with hover:bg-accent', () => {
        expect(source).toMatch(/ghost:\s*['"]hover:bg-accent/)
      })

      it('includes link variant with underline-offset', () => {
        expect(source).toMatch(/link:\s*['"]text-primary\s+underline-offset-4/)
      })
    })

    // ─────────────────────────────────────────────────────────────────────────
    // size options
    // ─────────────────────────────────────────────────────────────────────────
    describe('size options', () => {
      it('includes default size h-10', () => {
        expect(source).toMatch(/default:\s*['"]h-10\s+px-4\s+py-2['"]/)
      })

      it('includes sm size h-9', () => {
        expect(source).toMatch(/sm:\s*['"]h-9\s+rounded-md\s+px-3['"]/)
      })

      it('includes lg size h-11', () => {
        expect(source).toMatch(/lg:\s*['"]h-11\s+rounded-md\s+px-8['"]/)
      })

      it('includes icon size h-10 w-10', () => {
        expect(source).toMatch(/icon:\s*['"]h-10\s+w-10['"]/)
      })
    })

    // ─────────────────────────────────────────────────────────────────────────
    // default variants
    // ─────────────────────────────────────────────────────────────────────────
    describe('defaultVariants', () => {
      it('sets default variant to "default"', () => {
        expect(source).toMatch(/variant:\s*['"]default['"]/)
      })

      it('sets default size to "default"', () => {
        expect(source).toMatch(/size:\s*['"]default['"]/)
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // ButtonProps interface
  // ═══════════════════════════════════════════════════════════════════════════
  describe('ButtonProps interface', () => {
    it('extends React.ButtonHTMLAttributes<HTMLButtonElement>', () => {
      expect(source).toContain('React.ButtonHTMLAttributes<HTMLButtonElement>')
    })

    it('extends VariantProps<typeof buttonVariants>', () => {
      expect(source).toContain('VariantProps<typeof buttonVariants>')
    })

    it('declares optional asChild prop', () => {
      expect(source).toMatch(/asChild\?:\s*boolean/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Component definition
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Button component', () => {
    it('is created with React.forwardRef', () => {
      expect(source).toMatch(/const\s+Button\s*=\s*React\.forwardRef/)
    })

    it('forwards ref to HTMLButtonElement', () => {
      expect(source).toContain('React.forwardRef<HTMLButtonElement, ButtonProps>')
    })

    it('uses Slot when asChild is true, otherwise renders button', () => {
      expect(source).toMatch(/const\s+Comp\s*=\s*asChild\s*\?\s*Slot\s*:\s*['"]button['"]/)
    })

    it('applies buttonVariants with variant, size, and className', () => {
      expect(source).toContain('cn(buttonVariants({ variant, size, className }))')
    })

    it('sets displayName to "Button"', () => {
      expect(source).toContain("Button.displayName = 'Button'")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════════════
  describe('exports', () => {
    it('exports Button and buttonVariants', () => {
      expect(source).toMatch(/export\s*\{\s*Button\s*,\s*buttonVariants\s*\}/)
    })

    it('exports ButtonProps interface', () => {
      expect(source).toMatch(/export\s+interface\s+ButtonProps/)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility & base styles
  // ═══════════════════════════════════════════════════════════════════════════
  describe('accessibility & base styles', () => {
    it('includes focus-visible ring styles', () => {
      expect(source).toContain('focus-visible:outline-none')
      expect(source).toContain('focus-visible:ring-2')
      expect(source).toContain('focus-visible:ring-ring')
    })

    it('disables pointer events and reduces opacity when disabled', () => {
      expect(source).toContain('disabled:pointer-events-none')
      expect(source).toContain('disabled:opacity-50')
    })

    it('constrains embedded SVG size', () => {
      expect(source).toContain('[&_svg]:size-4')
      expect(source).toContain('[&_svg]:shrink-0')
    })
  })
})
